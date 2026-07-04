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

module.exports = { parseRecipe, sanitizeFilename, recipeToNote };
