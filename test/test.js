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

test('parseIngredient handles fractions/ranges/units/no-qty', () => {
  assert.deepStrictEqual(recipe.parseIngredient('- 1/3 cup yogurt'), { qty: '1/3', unit: 'cup', name: 'yogurt' });
  assert.deepStrictEqual(recipe.parseIngredient('- 14 oz paneer, diced'), { qty: '14', unit: 'oz', name: 'paneer' });
  assert.deepStrictEqual(recipe.parseIngredient('- 3-4 black peppercorns'), { qty: '3-4', unit: '', name: 'black peppercorns' });
  assert.deepStrictEqual(recipe.parseIngredient('- salt'), { qty: '', unit: '', name: 'salt' });
});

test('scaleQty multiplies decimals, fractions, ranges', () => {
  assert.strictEqual(recipe.scaleQty('2.5', 2), '5');
  assert.strictEqual(recipe.scaleQty('1/2', 3), '1.5');
  assert.strictEqual(recipe.scaleQty('3-4', 2), '6-8');
});

test('recipeIngredients scales and skips subheaders/directions', () => {
  const r = '# Ingredients\n**Gravy**\n- 2 tbsp butter\n- 0.5 cup cream\n# Directions\n1. cook';
  assert.deepStrictEqual(recipe.recipeIngredients(r, 2), ['- [ ] 4 tbsp butter', '- [ ] 1 cup cream']);
});

test('merge: unchecked sums, checked resets to recipe amount, untouched checked kept', () => {
  // 2 tbsp oil CHECKED + recipe adds 3 tbsp oil -> old qty ignored -> 3, unchecked.
  // 1 onion unchecked + 1 onion -> 2. checked salt with no addition stays checked. milk new.
  assert.deepStrictEqual(
    recipe.mergeShoppingItems(['- [x] 2 tbsp oil', '- [ ] 1 onion', '- [x] 1 tsp salt'],
                              ['- [ ] 3 tbsp oil', '- [ ] 1 onion', '- [ ] 1 cup milk']),
    ['- [ ] 3 tbsp oil', '- [ ] 2 onion', '- [x] 1 tsp salt', '- [ ] 1 cup milk']);
});

console.log('\nAll ' + passed + ' tests passed.');
