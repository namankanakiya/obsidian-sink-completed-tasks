'use strict';

const { nameKey, parseIngredient } = require('./recipe');

const PANTRY_BASENAME = 'pantry';

// Find the Pantry note (creates path under the Meal Planning folder when missing).
function findPantryFile(app) {
  return app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === PANTRY_BASENAME)[0] || null;
}

// Build a Set of pantry name-keys from the Pantry note's bullet/task lines.
async function pantrySet(app) {
  const f = findPantryFile(app);
  const set = new Set();
  if (!f) return set;
  const text = await app.vault.cachedRead(f);
  text.split(/\r?\n/).forEach((l) => {
    if (/^\s*[-*+]\s+/.test(l)) { const k = nameKey(parseIngredient(l).name); if (k) set.add(k); }
  });
  return set;
}

// Toggle one ingredient name in the Pantry note. Returns 'added' | 'removed'.
// Edits via the editor (granular, Relay-safe) when the file is already open, else vault.
async function togglePantry(app, name) {
  const key = nameKey(name); if (!key) return null;
  let f = findPantryFile(app);
  if (!f) f = await app.vault.create('Family/Meal Planning/Pantry.md', '# Pantry\n\nItems here are skipped when adding recipes.\n\n');
  const text = await app.vault.read(f);
  const lines = text.split(/\r?\n/);
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if (/^\s*[-*+]\s+/.test(lines[i]) && nameKey(parseIngredient(lines[i]).name) === key) { idx = i; break; }
  if (idx >= 0) { lines.splice(idx, 1); await app.vault.modify(f, lines.join('\n')); return 'removed'; }
  lines.push('- ' + key); await app.vault.modify(f, lines.join('\n')); return 'added';
}

module.exports = { PANTRY_BASENAME, findPantryFile, pantrySet, togglePantry };
