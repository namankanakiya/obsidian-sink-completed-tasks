'use strict';
const assert = require('assert');
const tasks = require('../src/tasks');
const sections = require('../src/sections');
const recipe = require('../src/recipe');

// Whole-line replaceRange fake editor (from.ch=0, to.ch=len of to.line).
function makeEditor(text) {
  let lines = text.split('\n');
  return {
    getLine: (i) => lines[i], lineCount: () => lines.length, getValue: () => lines.join('\n'),
    replaceRange: (t, from, to) => {
      assert.strictEqual(from.ch, 0); assert.strictEqual(to.ch, lines[to.line].length);
      lines = lines.slice(0, from.line).concat(t.split('\n')).concat(lines.slice(to.line + 1));
    }
  };
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok - ' + name); }

test('reorder sinks completed, alphabetises unchecked', () => {
  assert.deepStrictEqual(tasks.reorderBlock(['- [ ] mango', '- [ ] apple', '- [x] cherry']),
    ['- [ ] apple', '- [ ] mango', '- [x] cherry']);
});

test('sinkAllBlocks moves checked to bottom', () => {
  const e = makeEditor('- [x] butter\n- [ ] mango\n- [ ] apple');
  assert.strictEqual(tasks.sinkAllBlocks(e), true);
  assert.strictEqual(e.getValue(), '- [ ] apple\n- [ ] mango\n- [x] butter');
});

test('nested blocks untouched', () => {
  const src = '- [x] parent\n    - [ ] child\n- [ ] sib';
  const e = makeEditor(src); assert.strictEqual(tasks.sinkAllBlocks(e), false); assert.strictEqual(e.getValue(), src);
});

test('classify maps + fuzzy + spellings coalesce', () => {
  assert.strictEqual(sections.classify('- [ ] paneer 200 g'), 'Dairy');
  assert.strictEqual(sections.classify('- [ ] yoghurt 1 cup'), 'Dairy');
  assert.strictEqual(sections.classify('- [ ] tomatos 2'), 'Produce');
  assert.strictEqual(sections.classify('- [ ] finely chopped onions'), 'Produce');
  assert.strictEqual(sections.classify('- [ ] garam masala'), 'Spices');
  assert.strictEqual(sections.classify('- [x] canned pinto beans'), 'Canned');
  assert.strictEqual(sections.classify('- [ ] tomato sauce 2 cups'), 'Canned');
  assert.strictEqual(sections.classify('- [ ] zorblax 1'), 'Other');
});

test('organize groups + idempotent', () => {
  const e = makeEditor('- [ ] tomato 2\n- [ ] butter 8 tbsp\n- [x] paneer\n- [ ] onion 1');
  assert.strictEqual(sections.organizeBySections(e), true);
  assert.strictEqual(e.getValue(), '## Produce\n- [ ] onion 1\n- [ ] tomato 2\n\n## Dairy\n- [ ] butter 8 tbsp\n- [x] paneer');
  assert.strictEqual(sections.organizeBySections(e), false);
});

test('parseIngredient handles qty-first, qty-last, ranges, no-qty', () => {
  assert.deepStrictEqual(recipe.parseIngredient('- 1/3 cup yogurt'), { qty: '1/3', unit: 'cup', name: 'yogurt' });
  assert.deepStrictEqual(recipe.parseIngredient('- [ ] onion 2.5 cups'), { qty: '2.5', unit: 'cups', name: 'onion' });
  assert.deepStrictEqual(recipe.parseIngredient('- 3-4 black peppercorns'), { qty: '3-4', unit: '', name: 'black peppercorn' });
  assert.deepStrictEqual(recipe.parseIngredient('- salt'), { qty: '', unit: '', name: 'salt' });
});

test('scaleQty multiplies decimals, fractions, ranges', () => {
  assert.strictEqual(recipe.scaleQty('2.5', 2), '5');
  assert.strictEqual(recipe.scaleQty('1/2', 3), '1.5');
  assert.strictEqual(recipe.scaleQty('3-4', 2), '6-8');
});

test('recipeIngredients scales, keeps multiword names, no longer drops staples', () => {
  const r = '# Ingredients\n- 2 bay leaves\n- 2.5 cups onions\n- 1 tsp salt\n- 2 tbsp oil\n# Directions\n1. cook';
  assert.deepStrictEqual(recipe.recipeIngredients(r, 2), ['- [ ] bay leaf 4', '- [ ] onion 5 cups', '- [ ] salt 2 tsp', '- [ ] oil 4 tbsp']);
  assert.strictEqual(sections.classify('- [ ] bay leaf 4'), 'Spices');
});

test('merge dedupes onion variants, sums, scales onto existing', () => {
  // duplicate onion entries + recipe adds 7.5 cups -> one onion line; checked salt stays
  assert.deepStrictEqual(
    recipe.mergeShoppingItems(['- [ ] finely chopped onion 2.5 cups', '- [ ] onion 2.5 cups', '- [x] salt 1 tsp'],
                              ['- [ ] onion 7.5 cups']),
    ['- [ ] onion 12.5 cups', '- [x] salt 1 tsp']);
});

test('merge combines compatible units (tbsp + tsp, oz + oz)', () => {
  assert.deepStrictEqual(recipe.mergeShoppingItems(['- [ ] cumin 2 tbsp'], ['- [ ] cumin 2 tsp']), ['- [ ] cumin 2.67 tbsp']);
  assert.deepStrictEqual(recipe.mergeShoppingItems(['- [ ] paneer 14 oz'], ['- [ ] paneer 2 oz']), ['- [ ] paneer 1 lb']);
});

test('recipe add keeps all items; pantry hidden via CSS not dropped', () => {
  const r = '# Ingredients\n- 2 cups onions\n- 1 tbsp ginger\n# Directions';
  assert.deepStrictEqual(recipe.recipeIngredients(r, 1, new Set(['ginger'])), ['- [ ] onion 2 cups', '- [ ] ginger 1 tbsp']);
});

test('parseRecipe extracts ingredients/steps/tags from JSON-LD', () => {
  const imp = require('../src/import');
  const html = '<script type="application/ld+json">' + JSON.stringify({ '@graph': [
    { '@type': 'Recipe', name: 'Test Soup', recipeYield: '4', totalTime: 'PT1H',
      recipeIngredient: ['2.5 cups onions', '1 tsp salt'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Chop onions.' }, { text: 'Cook.' }],
      keywords: ['Vegetarian', 'Indian Soup'], image: { url: 'https://x/y.jpg' } }
  ] }) + '</script>';
  const r = imp.parseRecipe(html);
  assert.strictEqual(r.title, 'Test Soup');
  assert.deepStrictEqual(r.ingredients, ['2.5 cups onions', '1 tsp salt']);
  assert.deepStrictEqual(r.directions, ['Chop onions.', 'Cook.']);
  assert.deepStrictEqual(r.tags, ['vegetarian', 'indian-soup']);
  assert.ok(imp.recipeToNote(r, 'http://u').includes('# Ingredients') && imp.recipeToNote(r, 'http://u').includes('time: 60 min'));
});

console.log('\nAll ' + passed + ' tests passed.');
