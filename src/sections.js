'use strict';

const { isTaskLine, isIndented, arraysEqual, reorderBlock } = require('./tasks');
const { SECTIONS, PHRASE_RULES, TOKEN_DB, STOP, UNITS } = require('./ingredient-db');

const STOP_SET = {}; STOP.forEach((w) => { STOP_SET[w] = 1; });
const UNIT_SET = {}; UNITS.forEach((w) => { UNIT_SET[w] = 1; });

// True if a and b differ by at most one insert/delete/substitution.
function lev1(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return true;
}

// Lowercase, strip punctuation/units/descriptors, singularise long words -> tokens.
function normalizeName(s) {
  const t = (s || '').toLowerCase().replace(/[^a-z\s/]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = [];
  t.split(' ').forEach((w) => {
    if (!w || STOP_SET[w] || UNIT_SET[w]) return;
    if (w.length > 4 && w.charAt(w.length - 1) === 's') w = w.slice(0, -1);
    toks.push(w);
  });
  return toks;
}

function textOf(line) { return line.replace(/^\s*[-*+]\s*\[.\]\s*/, '').trim().toLowerCase(); }

function classify(line) {
  const t = textOf(line);
  for (let i = 0; i < PHRASE_RULES.length; i++) {
    const ph = PHRASE_RULES[i][1];
    for (let k = 0; k < ph.length; k++) if (t.indexOf(ph[k]) !== -1) return PHRASE_RULES[i][0];
  }
  const toks = normalizeName(t);
  for (let s = 0; s < SECTIONS.length; s++) {
    const db = TOKEN_DB[SECTIONS[s]]; if (!db) continue;
    for (let j = 0; j < toks.length; j++) for (let d = 0; d < db.length; d++) {
      if (toks[j] === db[d] || (toks[j].length > 4 && lev1(toks[j], db[d]))) return SECTIONS[s];
    }
  }
  return 'Other';
}

function isManagedHeading(line) { return line.slice(0, 3) === '## ' && SECTIONS.indexOf(line.slice(3).trim()) !== -1; }

function buildSections(taskLines) {
  const groups = {};
  taskLines.forEach((l) => { const sec = classify(l); (groups[sec] || (groups[sec] = [])).push(l); });
  const out = [];
  for (let s = 0; s < SECTIONS.length; s++) {
    const g = groups[SECTIONS[s]]; if (!g || !g.length) continue;
    if (out.length) out.push('');
    out.push('## ' + SECTIONS[s]);
    reorderBlock(g).forEach((x) => out.push(x));
  }
  return out;
}

// Regroup the managed region (tasks + our headings) into sections. One editor edit.
function organizeBySections(editor) {
  const n = editor.lineCount(); let first = -1, last = -1;
  for (let i = 0; i < n; i++) { const l = editor.getLine(i); if (isTaskLine(l) || isManagedHeading(l)) { if (first < 0) first = i; last = i; } }
  if (first < 0) return false;
  const tasks = [], oldText = [];
  for (let i = first; i <= last; i++) { const l = editor.getLine(i); oldText.push(l); if (isTaskLine(l)) tasks.push(l); }
  if (tasks.some(isIndented)) return false;
  const newLines = buildSections(tasks);
  if (arraysEqual(oldText, newLines)) return false;
  editor.replaceRange(newLines.join('\n'), { line: first, ch: 0 }, { line: last, ch: editor.getLine(last).length });
  return true;
}

module.exports = { SECTIONS, lev1, normalizeName, classify, isManagedHeading, buildSections, organizeBySections };
