'use strict';

const TASK_RE = /^(\s*)([-*+])\s+\[( |x|X)\]/;

function isTaskLine(line) { return TASK_RE.test(line); }
function isCompleted(line) { const m = line.match(TASK_RE); return !!m && (m[3] === 'x' || m[3] === 'X'); }
function isIndented(line) { const m = line.match(TASK_RE); return !!m && m[1].length > 0; }
function itemText(line) { return line.replace(TASK_RE, '').trim().toLowerCase(); }

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Incomplete first, alphabetised (so unchecking returns an item to its slot);
// completed sunk to the bottom in encounter order.
function reorderBlock(lines) {
  const incomplete = [], complete = [];
  for (let i = 0; i < lines.length; i++) (isCompleted(lines[i]) ? complete : incomplete).push(lines[i]);
  incomplete.sort((a, b) => { const ta = itemText(a), tb = itemText(b); return ta < tb ? -1 : ta > tb ? 1 : 0; });
  return incomplete.concat(complete);
}

function findBlock(getLine, lineCount, line) {
  if (line < 0 || line >= lineCount || !isTaskLine(getLine(line))) return null;
  let start = line, end = line;
  while (start - 1 >= 0 && isTaskLine(getLine(start - 1))) start--;
  while (end + 1 < lineCount && isTaskLine(getLine(end + 1))) end++;
  return { start, end };
}

function findAllBlocks(getLine, lineCount) {
  const blocks = []; let i = 0;
  while (i < lineCount) {
    if (isTaskLine(getLine(i))) { let end = i; while (end + 1 < lineCount && isTaskLine(getLine(end + 1))) end++; blocks.push({ start: i, end }); i = end + 1; }
    else i++;
  }
  return blocks;
}

function sinkBlock(editor, start, end) {
  const lines = [];
  for (let i = start; i <= end; i++) lines.push(editor.getLine(i));
  if (lines.some(isIndented)) return false; // never reorder nested task hierarchies
  const reordered = reorderBlock(lines);
  if (arraysEqual(lines, reordered)) return false;
  editor.replaceRange(reordered.join('\n'), { line: start, ch: 0 }, { line: end, ch: editor.getLine(end).length });
  return true;
}

function sinkAtLine(editor, line) {
  const b = findBlock((i) => editor.getLine(i), editor.lineCount(), line);
  return b ? sinkBlock(editor, b.start, b.end) : false;
}

function sinkAllBlocks(editor) {
  const blocks = findAllBlocks((i) => editor.getLine(i), editor.lineCount());
  let changed = false;
  for (let b = blocks.length - 1; b >= 0; b--) if (sinkBlock(editor, blocks[b].start, blocks[b].end)) changed = true;
  return changed;
}

module.exports = { TASK_RE, isTaskLine, isCompleted, isIndented, itemText, arraysEqual, reorderBlock, findBlock, findAllBlocks, sinkBlock, sinkAtLine, sinkAllBlocks };
