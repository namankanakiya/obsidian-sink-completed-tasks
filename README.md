# Sink Completed Tasks

An Obsidian plugin that **moves completed checklist items to the bottom of their list automatically** when you check them — so the top of the list is always "what's left."

## Why this exists

It does the move with a **granular editor transaction** (`editor.replaceRange`), not a whole-file rewrite (`vault.modify`). That's the same mechanism Obsidian's own Live Preview checkbox uses, and it syncs cleanly through CRDT/live-sync plugins such as **[Relay](https://github.com/No-Instructions/Relay)**.

By contrast, ticking a checkbox in **Reading View** or in a **Dataview `TASK` query** triggers a full-file write, which causes merge conflicts under Relay. This plugin gives you "sink completed items" behaviour without those conflicts, and it works on **mobile (iOS/Android)** as well as desktop.

## What it does

- **Auto-sink on check:** tap/click a checkbox and the completed line drops to the bottom of its list.
- **Returns to its slot on uncheck:** unchecked items are kept in alphabetical order, so unchecking an item snaps it back to where it was.
- **Store sections:** the command *Organize shopping list by store section* groups items under `## Produce / Dairy / Meat-Protein / Bakery / Pantry-Dry / Spices / Frozen / Canned / Other`, and a flat note named **Shopping List** is auto-grouped when opened. Checking sinks within each section.
- **Add a recipe (scaled):** on a recipe note, run *Add this recipe to Shopping List (scaled)*, pick a multiplier (x0.5–x4 or custom), and its ingredients are scaled, merged (same unit+name sums), and filed into sections.

## Code layout

- `src/tasks.js` — checklist primitives (parse, sink, reorder)
- `src/ingredient-db.js` — editable section keyword database
- `src/sections.js` — normalize + fuzzy classify + grouping
- `src/recipe.js` — ingredient parse / scale / merge
- `src/main.js` — plugin glue + scale modal
- bundled to `main.js` via `npm run build` (esbuild); tests: `npm test`
- **Command:** `Sink completed tasks to bottom (current note)` — bulk-sort every flat checklist in the active note (handy as a manual fallback or to add to the mobile toolbar).

## Safety

Only **flat** (non-indented) checklists are reordered. Any list block that contains a nested/indented task line is left completely untouched, so task hierarchies are never mangled.

## Install (via BRAT)

1. Install the **BRAT** community plugin.
2. BRAT → *Add beta plugin* → paste this repo's URL.
3. Enable **Sink Completed Tasks** in Community Plugins.

Works the same way on iPhone/iPad — BRAT runs on mobile.

## License

MIT
