'use strict';

// Parse recipe data from a page's JSON-LD (schema.org/Recipe). Returns null if none.
function parseRecipe(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  let recipe = null;
  for (const b of blocks) {
    let data; try { data = JSON.parse(b.trim()); } catch (e) { continue; }
    const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const it of items) {
      const t = it && it['@type'];
      if (t === 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') !== -1)) { recipe = it; break; }
    }
    if (recipe) break;
  }
  const clean = (x) => (x == null ? '' : String(x)).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!recipe) return parseMicrodata(html, clean);
  const text = (x) => (x == null ? '' : String(x)).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const ingredients = (recipe.recipeIngredient || recipe.ingredients || []).map(text).filter(Boolean);
  const flat = [];
  (function walk(ins) {
    (Array.isArray(ins) ? ins : [ins]).forEach((s) => {
      if (!s) return;
      if (typeof s === 'string') flat.push(text(s));
      else if (s.itemListElement) walk(s.itemListElement);
      else if (s.text) flat.push(text(s.text));
    });
  })(recipe.recipeInstructions || []);
  const img = recipe.image && (recipe.image.url || (Array.isArray(recipe.image) ? (recipe.image[0].url || recipe.image[0]) : recipe.image));
  const isoMin = (d) => { const r = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(d || ''); if (!r) return ''; return (parseInt(r[1] || 0) * 60 + parseInt(r[2] || 0)) + ' min'; };
  return {
    title: text(recipe.name),
    image: typeof img === 'string' ? img : '',
    servings: text(Array.isArray(recipe.recipeYield) ? recipe.recipeYield[recipe.recipeYield.length - 1] : recipe.recipeYield) || '',
    time: isoMin(recipe.totalTime) || '',
    ingredients,
    directions: flat.filter(Boolean),
    tags: (Array.isArray(recipe.keywords) ? recipe.keywords : String(recipe.keywords || '').split(',')).map((k) => text(k).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean)
  };
}

function sanitizeFilename(s) { return (s || 'Recipe').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80); }

// Fallback for sites using HTML microdata (itemprop/p-ingredient) instead of JSON-LD.
function parseMicrodata(html, clean) {
  const collect = (re) => { const out = []; let m; while ((m = re.exec(html))) out.push(clean(m[1])); return out.filter(Boolean); };
  const ingredients = collect(/<li[^>]*class="[^"]*p-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/gi);
  let directions = [];
  const insBlock = /e-instructions[\s\S]*?>([\s\S]*?)<\/ol>/i.exec(html) || /recipeInstructions[\s\S]*?>([\s\S]*?)<\/(?:ol|ul)>/i.exec(html);
  if (insBlock) { let m; const re = /<li[^>]*>([\s\S]*?)<\/li>/gi; while ((m = re.exec(insBlock[1]))) { const t = clean(m[1]); if (t) directions.push(t); } }
  if (!ingredients.length) return null;
  const meta = (p) => { const m = new RegExp('<meta[^>]*property="' + p + '"[^>]*content="([^"]+)"', 'i').exec(html) || new RegExp('content="([^"]+)"[^>]*property="' + p + '"', 'i').exec(html); return m ? clean(m[1]) : ''; };
  const ip = (p) => { const m = new RegExp('itemprop="[^"]*' + p + '[^"]*"[^>]*>([^<]+)', 'i').exec(html); return m ? clean(m[1]) : ''; };
  return {
    title: meta('og:title').replace(/\s*[-|]\s*The Chutney Life.*$/i, '').trim(),
    image: meta('og:image'), servings: ip('recipeYield'), time: ip('totalTime') || '',
    ingredients, directions, tags: []
  };
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&#(\d+);/g, (m, n) => (n === '8217' || n === '8216' || n === '39' || n === '8242') ? "'" : (n === '8211' || n === '8212') ? '-' : (n === '176') ? '°' : (n === '189') ? '1/2' : ' ')
    .replace(/&#x27;|&rsquo;|&lsquo;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&deg;/g, '°').replace(/&frac12;/g, '1/2').replace(/&frac14;/g, '1/4').replace(/&frac34;/g, '3/4')
    .replace(/&[a-z]+;/g, ' ');
}

// Turn an HTML fragment into trimmed text lines (block tags -> newlines, tags stripped).
function htmlToLines(frag) {
  return decodeEntities(frag
    .replace(/<(script|style|noscript|nav|header|footer|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|div|ol|ul|br|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .split(/\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const QTY_RE = /^\s*([\d½⅓⅔¼¾⅛]|an?\s)/i;
const UNIT_WORD = /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|kg|grams?|ml|l|liters?|litres?|pinch|cloves?|bunch|handful|inch|can|cans|package|stick|sticks|slices?|dash|large|small|medium)\b/i;
const JUNK_RE = /comment|response|repl(y|ies)|rating|star|share this|print recipe|save recipe|read more|©|subscribe|related|newsletter|advertisement/i;

function looksLikeIngredient(l) {
  if (JUNK_RE.test(l)) return false;
  if (/^\s*\d+\s*[.)]\s/.test(l)) return false;
  const words = l.split(/\s+/).length;
  if (QTY_RE.test(l) && (UNIT_WORD.test(l) || (words >= 2 && words <= 9)) && words <= 16) return true;
  // Non-quantity ingredient lines: "Pinch of…", "Juice of…", "…for garnish", "…to taste".
  if (words <= 10 && (/^(pinch|dash|juice|zest|splash|handful|sprinkle)\b/i.test(l) || /\bfor (garnish|serving|topping|dusting|drizzling)\b/i.test(l) || /,?\s*to taste\s*,?[^.]*$/i.test(l))) return true;
  return false;
}

// Fallback for pages with no JSON-LD/microdata: pull the article's ingredient list
// (a run of quantity lines) and the directions that follow it out of the body text.
function articleToRecipe(html, title) {
  let region = html;
  const start = html.search(/class="[^"]*(entry-content|post-content|article-body|articleBody|recipe)[^"]*"/i);
  if (start >= 0) {
    const after = html.slice(start);
    const endRel = after.search(/class="[^"]*(entry-footer|comments|post-navigation|related|sharedaddy)[^"]*"|<\/article>/i);
    region = endRel > 0 ? after.slice(0, endRel) : after;
  }
  const lines = htmlToLines(region);
  const ingIdx = [];
  for (let i = 0; i < lines.length; i++) if (looksLikeIngredient(lines[i])) ingIdx.push(i);
  if (ingIdx.length < 3) return null;
  const first = ingIdx[0], last = ingIdx[ingIdx.length - 1];
  const ingredients = [];
  for (let i = first; i <= last; i++) if (looksLikeIngredient(lines[i])) ingredients.push(lines[i]);
  const directions = [];
  for (let i = first; i < lines.length && directions.length < 40; i++) {
    const l = lines[i];
    if (/^(related|you might|comments?|leave a|share this|filed under|posted|tags:|print|pin it|save|nutrition)\b/i.test(l)) break;
    if (JUNK_RE.test(l) || looksLikeIngredient(l)) continue;
    if (l.split(/\s+/).length >= 4) directions.push(l.replace(/^\s*\d+\s*[.)]\s*/, '').replace(/^step\s*\d+\s*:?\s*/i, ''));
  }
  let servings = '';
  for (let i = 0; i <= first; i++) { const m = /^(?:makes|serves|yield|servings?)\b\s*:?\s*(.+)$/i.exec(lines[i]); if (m) { servings = m[1].trim(); break; } }
  return { title: title || 'Recipe', image: '', servings: servings, time: '', ingredients: ingredients, directions: directions, tags: [] };
}

function recipeToNote(r, url) {
  const tags = ['recipe'].concat(r.tags || []).filter((v, i, a) => a.indexOf(v) === i);
  const fm = ['---', 'type: recipe', 'area: meals', 'tags:', ...tags.map((t) => '  - ' + t)];
  if (r.servings) fm.push('servings: ' + r.servings);
  if (r.time) fm.push('time: ' + r.time);
  if (url) fm.push('source: "' + url + '"');
  fm.push('moc: "[[Meal Planning]]"', '---');
  const body = [];
  if (r.image) body.push('![' + (r.title || 'Recipe') + '](' + r.image + ')', '');
  body.push('# Ingredients', '', ...r.ingredients.map((i) => '- ' + i), '');
  body.push('# Directions', '', ...r.directions.map((d, n) => (n + 1) + '. ' + d));
  return fm.join('\n') + '\n' + body.join('\n') + '\n';
}

module.exports = { parseRecipe, articleToRecipe, sanitizeFilename, recipeToNote };
