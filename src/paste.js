'use strict';

const UNITS_RE = /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|kg|grams?|ml|l|liters?|litres?|pinch|cloves?|bunch|handful|inch|can|cans|package|stick|sticks|slices?|dash)\b/i;

function stripStep(l) { return l.replace(/^\s*\d+\s*[.)]\s*/, '').replace(/^step\s*\d+\s*:?\s*/i, '').trim(); }

function captureServings(l) {
  const m = /^(?:makes|serves|yield|servings?)\b\s*:?\s*(.+)$/i.exec(l);
  return m ? m[1].trim() : '';
}

function isHeader(l, kind) {
  const h = l.replace(/[#*:]/g, '').trim().toLowerCase();
  if (kind === 'ing') return /^ingredients?$/.test(h);
  return /^(directions?|instructions?|method|steps?|preparation)$/.test(h);
}

// A short, quantity- or unit-leading line that isn't a numbered step or full sentence.
function isIngredientLine(l) {
  if (/^\s*\d+\s*[.)]\s/.test(l)) return false;           // "1. Preheat…" is a step
  const startsQty = /^\s*([\d½⅓⅔¼¾⅛]|an?\s)/i.test(l);
  const words = l.split(/\s+/).length;
  const sentence = /[.!?]$/.test(l) && words > 8;
  return (startsQty || UNITS_RE.test(l)) && words <= 14 && !sentence;
}

// Heuristically split pasted recipe text into {title, servings, ingredients, directions}.
// Handles both header-delimited pastes ("Ingredients"/"Directions") and freeform prose.
function parsePastedRecipe(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*[-*+]\s+/, '').trim()).filter(Boolean);
  let title = '', servings = '', ingredients = [], directions = [];
  const hasHeaders = lines.some((l) => isHeader(l, 'ing') || isHeader(l, 'dir'));

  if (hasHeaders) {
    let mode = 'pre';
    for (const line of lines) {
      if (isHeader(line, 'ing')) { mode = 'ing'; continue; }
      if (isHeader(line, 'dir')) { mode = 'dir'; continue; }
      const sv = captureServings(line); if (sv) { servings = servings || sv; continue; }
      if (mode === 'ing') ingredients.push(line);
      else if (mode === 'dir') directions.push(stripStep(line));
      else if (!title) title = line; // a line before the first header = title
    }
  } else {
    for (const line of lines) {
      const sv = captureServings(line); if (sv) { servings = servings || sv; continue; }
      if (!title && !isIngredientLine(line) && !/^\s*\d+\s*[.)]/.test(line)) { title = line; continue; }
      if (isIngredientLine(line)) ingredients.push(line);
      else directions.push(stripStep(line));
    }
  }
  return { title: title || 'Pasted Recipe', servings: servings, ingredients: ingredients, directions: directions, tags: [], image: '', time: '' };
}

module.exports = { parsePastedRecipe, isIngredientLine, stripStep, captureServings };
