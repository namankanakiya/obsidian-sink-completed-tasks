'use strict';

const { TASK_RE, isTaskLine, isCompleted } = require('./tasks');
const { normalizeName } = require('./sections');
const { UNITS, STAPLES } = require('./ingredient-db');
const UNIT_SET = {}; UNITS.forEach((w) => { UNIT_SET[w] = 1; });
const STAPLE_SET = {}; STAPLES.forEach((w) => { STAPLE_SET[normalizeName(w).join(' ')] = 1; });

function fracToNum(s) { return s.indexOf('/') !== -1 ? (parseFloat(s.split('/')[0]) / parseFloat(s.split('/')[1])) : parseFloat(s); }
function fmtNum(n) { if (!isFinite(n)) return ''; const r = Math.round(n * 100) / 100; return r % 1 === 0 ? String(r) : String(r); }
function nameKey(name) { return normalizeName(name).join(' '); }
function isStaple(name, pantry) {
  const k = nameKey(name); if (!k) return false;
  if (pantry && pantry.has && pantry.has(k)) return true;
  return !!STAPLE_SET[k] || k.split(' ').some((t) => STAPLE_SET[t]);
}

// Remove parenthetical notes and cut off trailing alternatives/notes so the name is
// just the core ingredient: "sriracha or more to taste" -> "sriracha".
function cleanIngredientText(s) {
  return s.replace(/\([^)]*\)/g, ' ').split(/,|;|&| or | plus | for /i)[0].replace(/\s+/g, ' ').trim();
}

// Parse an ingredient from a recipe (qty-first: "2.5 cups onions") OR a shopping-list
// item (qty-last: "onion 2.5 cups"). Keeps the display name raw; normalize only for keys.
function parseIngredient(line) {
  let s = cleanIngredientText(line.replace(/^\s*[-*+]\s+\[.\]\s*/, '').replace(/^\s*[-*+]\s+/, '')).toLowerCase()
    .replace(/½/g, '1/2').replace(/⅓/g, '1/3').replace(/⅔/g, '2/3').replace(/¼/g, '1/4').replace(/¾/g, '3/4').replace(/⅛/g, '1/8')
    .replace(/(\d+)\s+(\d+)\/(\d+)/g, (m, w, a, b) => String(parseInt(w, 10) + parseInt(a, 10) / parseInt(b, 10))); // mixed number "1 1/4" -> 1.25
  const m = s.match(/(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*([a-z]+)?/);
  let qty = '', unit = '';
  if (m) {
    qty = m[1].replace(/\s+/g, '');
    if (m[2] && UNIT_SET[m[2]]) { unit = m[2]; s = s.slice(0, m.index) + s.slice(m.index + m[0].length); }
    else s = s.slice(0, m.index) + s.slice(m.index + m[1].length);
  }
  return { qty, unit, name: normalizeName(s).join(' ') };
}

function scaleQty(qty, factor) {
  if (!qty) return '';
  if (qty.indexOf('-') !== -1) { const p = qty.split('-'); return fmtNum(fracToNum(p[0]) * factor) + '-' + fmtNum(fracToNum(p[1]) * factor); }
  return fmtNum(fracToNum(qty) * factor);
}

// Output in shopping-list format: "name qty unit" (qty-last), matching Meal Plan.
function ingredientToTask(ing) {
  return '- [ ] ' + [ing.name, ing.qty, ing.unit].filter(Boolean).join(' ').trim();
}

// Scaled ingredient task lines from a recipe note's text (# Ingredients .. next # ).
// pantry (a Set of name-keys) is excluded.
function recipeIngredients(text, factor, pantry) {
  const lines = text.split(/\r?\n/); let inSec = false; const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^#\s+ingredients\b/i.test(l)) { inSec = true; continue; }
    if (inSec && /^#\s+/.test(l)) break;
    if (!inSec || !/^\s*[-*+]\s+/.test(l)) continue;
    const ing = parseIngredient(l); if (!ing.name) continue;
    ing.qty = scaleQty(ing.qty, factor); out.push(ingredientToTask(ing));
  }
  return out;
}

// Convertible units -> base amount. Same-name items in the same family merge.
const VOL = { tsp: 1, teaspoon: 1, teaspoons: 1, tbsp: 3, tablespoon: 3, tablespoons: 3, cup: 48, cups: 48 };
const WT = { g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6 };
function unitFamily(u) {
  if (VOL[u]) return { fam: 'vol', f: VOL[u] };
  if (WT[u]) return { fam: 'wt', f: WT[u] };
  return { fam: u || '', f: 1 };
}
function displayQtyUnit(base, fam) {
  if (fam === 'vol') return base >= 48 ? [base / 48, 'cups'] : base >= 3 ? [base / 3, 'tbsp'] : [base, 'tsp'];
  if (fam === 'wt') return base >= 1000 ? [base / 1000, 'kg'] : base >= 453.6 ? [base / 453.6, 'lb'] : base >= 28.35 ? [base / 28.35, 'oz'] : [base, 'g'];
  return [base, fam];
}

// Merge additions into existing: same name + compatible unit family sums (converting
// tsp/tbsp/cup and g/oz/lb/kg). A checked existing item counts as already bought (qty
// 0): if re-added, only the new amount remains, unchecked; untouched checked stay.
function mergeShoppingItems(existing, additions) {
  const map = {}, order = [];
  const add = (line, isAdd) => {
    const ing = parseIngredient(line);
    const fu = unitFamily(ing.unit);
    const nm = normalizeName(ing.name).join(' ');
    const key = nm + '|' + fu.fam;
    const num = (ing.qty && ing.qty.indexOf('-') === -1) ? fracToNum(ing.qty) * fu.f : NaN;
    if (!map[key]) { map[key] = { base: num, fam: fu.fam, name: ing.name, checked: isCompleted(line), added: isAdd }; order.push(key); return; }
    const m = map[key];
    const base = (isAdd && m.checked) ? 0 : m.base;            // bought -> previous qty is nothing
    m.base = (!isNaN(num) && !isNaN(base)) ? base + num : NaN;
    if (isCompleted(line)) m.checked = true;
    if (isAdd) m.checked = false, m.added = true;
  };
  existing.forEach((l) => add(l, false));
  additions.forEach((l) => add(l, true));
  return order.map((k) => {
    const m = map[k];
    const box = (m.checked && !m.added) ? '- [x] ' : '- [ ] ';
    const [q, u] = isNaN(m.base) ? ['', ''] : displayQtyUnit(m.base, m.fam);
    return box + [m.name, q === '' ? '' : fmtNum(q), u].filter(Boolean).join(' ').trim();
  });
}

module.exports = { fracToNum, fmtNum, parseIngredient, scaleQty, ingredientToTask, recipeIngredients, mergeShoppingItems, isStaple, nameKey };
