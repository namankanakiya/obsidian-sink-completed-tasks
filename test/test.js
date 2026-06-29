'use strict';
const assert = require('assert');
const plugin = require('../main.js');
const I = plugin._internal;

// Minimal line-based fake editor supporting whole-line replaceRange (from.ch=0,
// to.ch = length of to.line), which is exactly how the plugin calls it.
function makeEditor(text) {
  let lines = text.split('\n');
  return {
    getLine: function (i) { return lines[i]; },
    lineCount: function () { return lines.length; },
    replaceRange: function (newText, from, to) {
      assert.strictEqual(from.ch, 0, 'from.ch must be 0');
      assert.strictEqual(to.ch, lines[to.line].length, 'to.ch must be full line length');
      const before = lines.slice(0, from.line);
      const after = lines.slice(to.line + 1);
      lines = before.concat(newText.split('\n')).concat(after);
    },
    getText: function () { return lines.join('\n'); }
  };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

// 1. reorderBlock: stable partition
test('reorderBlock keeps stable order, sinks completed', function () {
  const input = ['- [ ] a', '- [x] b', '- [ ] c', '- [x] d', '- [ ] e'];
  const out = I.reorderBlock(input);
  assert.deepStrictEqual(out, ['- [ ] a', '- [ ] c', '- [ ] e', '- [x] b', '- [x] d']);
});

// 2. sinkAllBlocks on a flat shopping list
test('sinkAllBlocks moves checked items to bottom', function () {
  const ed = makeEditor('- [x] butter 8 tbsp\n- [ ] garam masala 1.5 tbsp\n- [x] cumin seed 3 tsp\n- [ ] ginger 1 tbsp');
  const changed = I.sinkAllBlocks(ed);
  assert.strictEqual(changed, true);
  assert.strictEqual(ed.getText(),
    '- [ ] garam masala 1.5 tbsp\n- [ ] ginger 1 tbsp\n- [x] butter 8 tbsp\n- [x] cumin seed 3 tsp');
});

// 3. Idempotent: already sorted -> no change
test('sinkAllBlocks is a no-op when already sorted', function () {
  const sorted = '- [ ] a\n- [ ] b\n- [x] c\n- [x] d';
  const ed = makeEditor(sorted);
  const changed = I.sinkAllBlocks(ed);
  assert.strictEqual(changed, false);
  assert.strictEqual(ed.getText(), sorted);
});

// 4. sinkAtLine sorts only the block containing the line
test('sinkAtLine sorts the block containing the toggled line', function () {
  const ed = makeEditor('# Heading\n- [x] one\n- [ ] two\n\nplain text');
  const changed = I.sinkAtLine(ed, 1); // line 1 is "- [x] one"
  assert.strictEqual(changed, true);
  assert.strictEqual(ed.getText(), '# Heading\n- [ ] two\n- [x] one\n\nplain text');
});

// 5. Nested/indented block is left untouched
test('nested (indented) blocks are not reordered', function () {
  const nested = '- [x] parent\n    - [ ] child\n- [ ] sibling';
  const ed = makeEditor(nested);
  const changed = I.sinkAllBlocks(ed);
  assert.strictEqual(changed, false, 'must bail on indented block');
  assert.strictEqual(ed.getText(), nested);
});

// 6. Multiple independent blocks separated by non-task lines
test('multiple blocks are sorted independently, separators preserved', function () {
  const ed = makeEditor('- [x] a1\n- [ ] a2\n\n## Section\n- [ ] b1\n- [x] b2');
  const changed = I.sinkAllBlocks(ed);
  assert.strictEqual(changed, true);
  assert.strictEqual(ed.getText(), '- [ ] a2\n- [x] a1\n\n## Section\n- [ ] b1\n- [x] b2');
});

// 7. Uppercase [X] and * bullets recognised as completed
test('uppercase [X] and other bullet markers handled', function () {
  assert.strictEqual(I.isCompleted('* [X] thing'), true);
  assert.strictEqual(I.isCompleted('+ [ ] thing'), false);
  assert.strictEqual(I.isTaskLine('* [X] thing'), true);
});

// 7b. Unchecked items are alphabetised so unchecking returns an item to its slot
test('unchecked items kept alphabetical; completed sink', function () {
  const ed = makeEditor('- [ ] mango\n- [ ] apple\n- [x] cherry');
  I.sinkAllBlocks(ed);
  assert.strictEqual(ed.getText(), '- [ ] apple\n- [ ] mango\n- [x] cherry');
  // Uncheck cherry -> it returns to its alphabetical slot (between apple and mango)
  const ed2 = makeEditor('- [ ] apple\n- [ ] mango\n- [ ] cherry');
  I.sinkAllBlocks(ed2);
  assert.strictEqual(ed2.getText(), '- [ ] apple\n- [ ] cherry\n- [ ] mango');
});

// 8. classify maps ingredients to store sections
test('classify maps ingredients to sections', function () {
  assert.strictEqual(I.classify('- [ ] paneer 200 g'), 'Dairy');
  assert.strictEqual(I.classify('- [ ] heavy cream 0.75 cup'), 'Dairy');
  assert.strictEqual(I.classify('- [ ] finely chopped onion 2.5 cups'), 'Produce');
  assert.strictEqual(I.classify('- [ ] garam masala 1.5 tbsp'), 'Spices');
  assert.strictEqual(I.classify('- [x] can pinto bean 14.5 oz'), 'Canned');
  assert.strictEqual(I.classify('- [ ] sooji 1 cup'), 'Pantry/Dry');
  assert.strictEqual(I.classify('- [ ] bread 8 slices'), 'Bakery');
  assert.strictEqual(I.classify('- [ ] zorblax 1'), 'Other');
});

// 9. organizeBySections groups flat list under headings, sinks completed per section
test('organizeBySections groups + sinks per section', function () {
  const ed = makeEditor('- [ ] tomato 2\n- [ ] butter 8 tbsp\n- [x] paneer 200 g\n- [ ] onion 1');
  const changed = I.organizeBySections(ed);
  assert.strictEqual(changed, true);
  assert.strictEqual(ed.getText(),
    '## Produce\n- [ ] onion 1\n- [ ] tomato 2\n\n## Dairy\n- [ ] butter 8 tbsp\n- [x] paneer 200 g');
});

// 9b. organize is idempotent
test('organizeBySections is idempotent', function () {
  const ed = makeEditor('## Produce\n- [ ] onion 1\n- [ ] tomato 2\n\n## Dairy\n- [ ] butter 8 tbsp\n- [x] paneer 200 g');
  assert.strictEqual(I.organizeBySections(ed), false);
});

// 9c. organize re-sorts a newly merged item into its correct section
test('organize re-slots a newly added item', function () {
  const ed = makeEditor('## Produce\n- [ ] onion 1\n- [ ] milk 1\n\n## Dairy\n- [ ] butter 8 tbsp');
  I.organizeBySections(ed);
  assert.strictEqual(ed.getText(),
    '## Produce\n- [ ] onion 1\n\n## Dairy\n- [ ] butter 8 tbsp\n- [ ] milk 1');
});
test('findBlock returns contiguous run', function () {
  const lines = ['intro', '- [ ] a', '- [x] b', '- [ ] c', 'outro'];
  const blk = I.findBlock(function (i) { return lines[i]; }, lines.length, 2);
  assert.deepStrictEqual(blk, { start: 1, end: 3 });
  const none = I.findBlock(function (i) { return lines[i]; }, lines.length, 0);
  assert.strictEqual(none, null);
});

console.log('\nAll ' + passed + ' tests passed.');
