'use strict';

/*
 * Sink Completed Tasks
 * --------------------
 * When you check a flat checklist item, this plugin moves the completed line to
 * the bottom of its list so the top of the list is always your "what's left".
 * Unchecked items are kept in canonical alphabetical order, so unchecking an item
 * returns it to the same slot it came from.
 *
 * Crucially, it does this with a *granular editor transaction* (editor.replaceRange),
 * NOT a whole-file write (vault.modify). That keeps it compatible with CRDT live-sync
 * plugins such as Relay: the same mechanism Obsidian's own Live Preview checkbox uses,
 * which syncs cleanly. Reading-View checkbox toggles and Dataview TASK toggles do
 * full-file writes and therefore conflict under Relay -- this plugin avoids that.
 *
 * Safety: it only reorders *flat* (non-indented) checklist blocks. Any list block that
 * contains an indented (nested) task line is left untouched, to avoid mangling nested
 * task hierarchies.
 */

// Allow this file to be require()'d under plain Node for unit testing, where the
// 'obsidian' module does not exist.
let obsidian = null;
try { obsidian = require('obsidian'); } catch (e) { obsidian = null; }
const PluginBase = obsidian && obsidian.Plugin ? obsidian.Plugin : class {};

const TASK_RE = /^(\s*)([-*+])\s+\[( |x|X)\]/;

function isTaskLine(line) {
  return TASK_RE.test(line);
}

function isCompleted(line) {
  const m = line.match(TASK_RE);
  return !!m && (m[3] === 'x' || m[3] === 'X');
}

function isIndented(line) {
  const m = line.match(TASK_RE);
  return !!m && m[1].length > 0;
}

function itemText(line) {
  return line.replace(TASK_RE, '').trim().toLowerCase();
}

// Incomplete tasks first, sorted by their canonical (alphabetical) text so an item
// always returns to the same slot when unchecked; completed tasks sink to the bottom
// in the order they were checked.
function reorderBlock(lines) {
  const incomplete = [];
  const complete = [];
  for (let i = 0; i < lines.length; i++) {
    if (isCompleted(lines[i])) complete.push(lines[i]);
    else incomplete.push(lines[i]);
  }
  incomplete.sort(function (a, b) {
    const ta = itemText(a), tb = itemText(b);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  return incomplete.concat(complete);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Find the contiguous run of task lines that contains `line`. Returns {start, end} or null.
function findBlock(getLine, lineCount, line) {
  if (line < 0 || line >= lineCount) return null;
  if (!isTaskLine(getLine(line))) return null;
  let start = line;
  let end = line;
  while (start - 1 >= 0 && isTaskLine(getLine(start - 1))) start--;
  while (end + 1 < lineCount && isTaskLine(getLine(end + 1))) end++;
  return { start: start, end: end };
}

// Compute every contiguous task block in the document.
function findAllBlocks(getLine, lineCount) {
  const blocks = [];
  let i = 0;
  while (i < lineCount) {
    if (isTaskLine(getLine(i))) {
      let start = i;
      let end = i;
      while (end + 1 < lineCount && isTaskLine(getLine(end + 1))) end++;
      blocks.push({ start: start, end: end });
      i = end + 1;
    } else {
      i++;
    }
  }
  return blocks;
}

// Reorder a single block in the editor. Returns true if a change was applied.
function sinkBlock(editor, start, end) {
  const lines = [];
  for (let i = start; i <= end; i++) lines.push(editor.getLine(i));
  // Bail on nested/indented blocks to avoid breaking task hierarchies.
  for (let i = 0; i < lines.length; i++) {
    if (isIndented(lines[i])) return false;
  }
  const reordered = reorderBlock(lines);
  if (arraysEqual(lines, reordered)) return false;
  const from = { line: start, ch: 0 };
  const to = { line: end, ch: editor.getLine(end).length };
  // Single granular editor transaction -> Relay/CRDT clean.
  editor.replaceRange(reordered.join('\n'), from, to);
  return true;
}

function sinkAtLine(editor, line) {
  const block = findBlock(function (i) { return editor.getLine(i); }, editor.lineCount(), line);
  if (!block) return false;
  return sinkBlock(editor, block.start, block.end);
}

function sinkAllBlocks(editor) {
  const blocks = findAllBlocks(function (i) { return editor.getLine(i); }, editor.lineCount());
  // Process bottom-to-top so earlier edits don't shift later block indices.
  let changed = false;
  for (let b = blocks.length - 1; b >= 0; b--) {
    if (sinkBlock(editor, blocks[b].start, blocks[b].end)) changed = true;
  }
  return changed;
}

class SinkCompletedTasksPlugin extends PluginBase {
  async onload() {
    // Auto-sink when a checklist checkbox is tapped/clicked. Obsidian's own
    // checkbox handling is delegated on 'click' (works on desktop and iOS), so a
    // document-level 'click' listener reliably catches the same taps.
    this.registerDomEvent(document, 'click', this.handleCheckboxClick.bind(this));

    this.addCommand({
      id: 'sink-completed-tasks-current-note',
      name: 'Sink completed tasks to bottom (current note)',
      editorCallback: function (editor) { sinkAllBlocks(editor); }
    });
  }

  handleCheckboxClick(evt) {
    const target = evt.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains('task-list-item-checkbox')) return;
    const self = this;
    // Run after Obsidian applies its own toggle transaction in this same click.
    setTimeout(function () {
      const view = self.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) return;
      const editor = view.editor;
      const line = self.lineFromCheckbox(editor, target);
      if (line == null) return;
      try { sinkAtLine(editor, line); } catch (e) { /* ignore: not an in-editor checkbox */ }
    }, 0);
  }

  // Resolve the editor line of a clicked checkbox. Primary: CodeMirror posAtDOM
  // (Live Preview). Fallback: the input's data-line attribute.
  lineFromCheckbox(editor, target) {
    try {
      const cm = editor.cm;
      if (cm && typeof cm.posAtDOM === 'function') {
        const offset = cm.posAtDOM(target);
        if (typeof offset === 'number' && offset >= 0) {
          const pos = editor.offsetToPos(offset);
          if (pos && typeof pos.line === 'number') return pos.line;
        }
      }
    } catch (e) { /* fall through to data-line */ }
    const dl = target.getAttribute('data-line');
    if (dl != null) {
      const n = parseInt(dl, 10);
      if (!isNaN(n)) return n;
    }
    return null;
  }
}

module.exports = SinkCompletedTasksPlugin;
// Exposed for unit tests run under Node.
module.exports._internal = {
  TASK_RE: TASK_RE,
  isTaskLine: isTaskLine,
  isCompleted: isCompleted,
  isIndented: isIndented,
  itemText: itemText,
  reorderBlock: reorderBlock,
  arraysEqual: arraysEqual,
  findBlock: findBlock,
  findAllBlocks: findAllBlocks,
  sinkBlock: sinkBlock,
  sinkAtLine: sinkAtLine,
  sinkAllBlocks: sinkAllBlocks
};
