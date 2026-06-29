'use strict';

const { TASK_RE, isTaskLine, isCompleted } = require('./tasks');
const { normalizeName } = require('./sections');
const { UNITS } = require('./ingredient-db');
const UNIT_SET = {}; UNITS.forEach((w) => { UNIT_SET[w] = 1; });

function fracToNum(s) { return s.indexOf('/') !== -1 ? (parseFloat(s.split('/')[0]) / parseFloat(s.split('/')[1])) : parseFloat(s); }
function fmtNum(n) { if (!isFinite(n)) return ''; const r = Math.round(n * 100) / 100; return r % 1 === 0 ? String(r) : String(r); }

// Recipe line -> {qty, unit, name}. qty keeps raw token (range/fraction/decimal) or ''.
function parseIngredient(line) {
  let s = line.replace(/^\s*[-*+]\s+\[.\]\s*/, '').replace(/^\s*[-*+]\s+/, '').trim();
  let qty = '';
  const qm = s.match(/^(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*/);
  if (qm) { qty = qm[1].replace(/\s+/g, ''); s = s.slice(qm[0].length); }
  let unit = '';
  const um = s.match(/^([a-zA-Z]+)\b/);
  if (um && UNIT_SET[um[1].toLowerCase()]) { unit = um[1].toLowerCase(); s = s.slice(um[0].length).trim(); }
  return { qty, unit, name: s.split(',')[0].trim() };
}

function scaleQty(qty, factor) {
  if (!qty) return '';
  if (qty.indexOf('-') !== -1) { const p = qty.split('-'); return fmtNum(fracToNum(p[0]) * factor) + '-' + fmtNum(fracToNum(p[1]) * factor); }
  return fmtNum(fracToNum(qty) * factor);
}

function ingredientToTask(ing) {
  return '- [ ] ' + [ing.qty, ing.unit, ing.name].filter(Boolean).join(' ').trim();
}

// Scaled ingredient task lines from a recipe note's text (# Ingredients .. next # ).
function recipeIngredients(text, factor) {
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

// Merge additions into existing: same unit + same normalized name sums numeric qty.
// A checked existing item counts as already bought (qty treated as 0): if a recipe
// re-adds it, only the new amount remains and it returns to unchecked; if nothing is
// added to it, it stays checked as-is.
function mergeShoppingItems(existing, additions) {
  const map = {}, order = [];
  existing.forEach((line) => {
    const ing = parseIngredient(line);
    const key = ing.unit + '|' + normalizeName(ing.name).join(' ');
    const num = (ing.qty && ing.qty.indexOf('-') === -1) ? fracToNum(ing.qty) : NaN;
    if (!map[key]) { map[key] = { num, unit: ing.unit, name: ing.name, checked: isCompleted(line), added: false }; order.push(key); }
  });
  additions.forEach((line) => {
    const ing = parseIngredient(line);
    const key = ing.unit + '|' + normalizeName(ing.name).join(' ');
    const num = (ing.qty && ing.qty.indexOf('-') === -1) ? fracToNum(ing.qty) : NaN;
    if (map[key]) {
      const base = map[key].checked ? 0 : map[key].num; // bought already -> previous qty is nothing
      map[key].num = (!isNaN(num) && !isNaN(base)) ? base + num : NaN;
      map[key].checked = false; map[key].added = true;
    } else { map[key] = { num, unit: ing.unit, name: ing.name, checked: false, added: true }; order.push(key); }
  });
  return order.map((k) => {
    const m = map[k];
    const box = (m.checked && !m.added) ? '- [x] ' : '- [ ] ';
    return box + [isNaN(m.num) ? '' : fmtNum(m.num), m.unit, m.name].filter(Boolean).join(' ').trim();
  });
}

module.exports = { fracToNum, fmtNum, parseIngredient, scaleQty, ingredientToTask, recipeIngredients, mergeShoppingItems };
