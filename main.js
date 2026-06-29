"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/tasks.js
var require_tasks = __commonJS({
  "src/tasks.js"(exports2, module2) {
    "use strict";
    var TASK_RE = /^(\s*)([-*+])\s+\[( |x|X)\]/;
    function isTaskLine2(line) {
      return TASK_RE.test(line);
    }
    function isCompleted(line) {
      const m = line.match(TASK_RE);
      return !!m && (m[3] === "x" || m[3] === "X");
    }
    function isIndented(line) {
      const m = line.match(TASK_RE);
      return !!m && m[1].length > 0;
    }
    function itemText(line) {
      return line.replace(TASK_RE, "").trim().toLowerCase();
    }
    function arraysEqual(a, b) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    function reorderBlock(lines) {
      const incomplete = [], complete = [];
      for (let i = 0; i < lines.length; i++) (isCompleted(lines[i]) ? complete : incomplete).push(lines[i]);
      incomplete.sort((a, b) => {
        const ta = itemText(a), tb = itemText(b);
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
      return incomplete.concat(complete);
    }
    function findBlock(getLine, lineCount, line) {
      if (line < 0 || line >= lineCount || !isTaskLine2(getLine(line))) return null;
      let start = line, end = line;
      while (start - 1 >= 0 && isTaskLine2(getLine(start - 1))) start--;
      while (end + 1 < lineCount && isTaskLine2(getLine(end + 1))) end++;
      return { start, end };
    }
    function findAllBlocks(getLine, lineCount) {
      const blocks = [];
      let i = 0;
      while (i < lineCount) {
        if (isTaskLine2(getLine(i))) {
          let end = i;
          while (end + 1 < lineCount && isTaskLine2(getLine(end + 1))) end++;
          blocks.push({ start: i, end });
          i = end + 1;
        } else i++;
      }
      return blocks;
    }
    function sinkBlock(editor, start, end) {
      const lines = [];
      for (let i = start; i <= end; i++) lines.push(editor.getLine(i));
      if (lines.some(isIndented)) return false;
      const reordered = reorderBlock(lines);
      if (arraysEqual(lines, reordered)) return false;
      editor.replaceRange(reordered.join("\n"), { line: start, ch: 0 }, { line: end, ch: editor.getLine(end).length });
      return true;
    }
    function sinkAtLine2(editor, line) {
      const b = findBlock((i) => editor.getLine(i), editor.lineCount(), line);
      return b ? sinkBlock(editor, b.start, b.end) : false;
    }
    function sinkAllBlocks2(editor) {
      const blocks = findAllBlocks((i) => editor.getLine(i), editor.lineCount());
      let changed = false;
      for (let b = blocks.length - 1; b >= 0; b--) if (sinkBlock(editor, blocks[b].start, blocks[b].end)) changed = true;
      return changed;
    }
    module2.exports = { TASK_RE, isTaskLine: isTaskLine2, isCompleted, isIndented, itemText, arraysEqual, reorderBlock, findBlock, findAllBlocks, sinkBlock, sinkAtLine: sinkAtLine2, sinkAllBlocks: sinkAllBlocks2 };
  }
});

// src/ingredient-db.js
var require_ingredient_db = __commonJS({
  "src/ingredient-db.js"(exports2, module2) {
    "use strict";
    var SECTIONS = ["Produce", "Dairy", "Meat/Protein", "Bakery", "Pantry/Dry", "Spices", "Frozen", "Canned", "Other"];
    var PHRASE_RULES = [
      ["Frozen", ["frozen", "ice cream", "ice cube", "popsicle", "frozen peas", "frozen corn"]],
      ["Canned", ["canned", "diced tomato", "crushed tomato", "tomato paste", "tomato sauce", "tomato puree", "passata", "baked bean", "refried bean", "pinto bean", "kidney bean", "black bean", "cannellini", "chickpea", "chick pea", "garbanzo", "in adobo", "coconut milk", "condensed milk", "evaporated milk", "green chili in", "tuna", "olives", "pickle", "capers"]],
      ["Bakery", ["whole wheat", "sandwich bread", "burger bun", "hot dog bun", "pita bread", "dinner roll"]],
      ["Spices", ["bay leaf", "bay leaves", "taco seasoning", "kasoori methi", "curry powder", "black pepper", "red pepper flake", "chili powder", "chilli powder", "star anise", "baking powder", "baking soda", "vanilla extract"]]
    ];
    var TOKEN_DB = {
      Produce: ["onion", "scallion", "shallot", "garlic", "ginger", "tomato", "potato", "sweetpotato", "carrot", "celery", "cucumber", "lettuce", "spinach", "kale", "arugula", "cabbage", "cauliflower", "broccoli", "zucchini", "eggplant", "okra", "mushroom", "pea", "greenbean", "corn", "pepper", "jalapeno", "serrano", "habanero", "poblano", "chili", "chilli", "chile", "cilantro", "parsley", "mint", "basil", "dill", "rosemary", "thyme", "sage", "curryleaf", "lemon", "lime", "orange", "apple", "banana", "mango", "grape", "berry", "strawberry", "blueberry", "raspberry", "avocado", "pineapple", "melon", "watermelon", "peach", "plum", "pear", "pomegranate", "beet", "radish", "turnip", "squash", "pumpkin", "leek", "fennel", "asparagus", "artichoke", "herb", "green", "sprout", "grapefruit"],
      Dairy: ["milk", "butter", "cream", "heavycream", "sourcream", "yogurt", "yoghurt", "curd", "cheese", "paneer", "ghee", "mozzarella", "cheddar", "parmesan", "feta", "ricotta", "buttermilk", "margarine", "cottagecheese", "creamcheese", "custard"],
      "Meat/Protein": ["chicken", "beef", "pork", "lamb", "mutton", "turkey", "bacon", "sausage", "ham", "egg", "fish", "salmon", "shrimp", "prawn", "crab", "tofu", "tempeh", "seitan"],
      Bakery: ["bread", "bun", "naan", "roti", "paratha", "tortilla", "pita", "bagel", "baguette", "croissant", "muffin", "pav", "cracker"],
      "Pantry/Dry": ["rice", "flour", "maida", "sooji", "semolina", "besan", "cornstarch", "cornflour", "lentil", "dal", "sugar", "jaggery", "honey", "syrup", "oil", "vinegar", "pasta", "noodle", "spaghetti", "macaroni", "broth", "stock", "salt", "tea", "coffee", "quinoa", "oat", "cereal", "peanut", "peanutbutter", "almond", "cashew", "walnut", "raisin", "nut", "breadcrumb", "cocoa", "chocolate", "vanilla", "cornmeal", "tamarind", "soysauce", "ketchup", "mustard", "mayo", "mayonnaise", "water"],
      Spices: ["cumin", "coriander", "turmeric", "garam", "masala", "cardamom", "peppercorn", "clove", "cinnamon", "anise", "nutmeg", "mace", "saffron", "paprika", "cayenne", "chaat", "asafoetida", "hing", "fenugreek", "methi", "oregano", "sesame", "spice", "seasoning", "allspice"]
    };
    var STOP = "chopped diced minced grated finely fresh small large medium ground powder powdered seed seeds dried optional garnish garnishes ripe peeled sliced cubed whole boneless skinless raw cooked extra virgin toasted roasted can cans piece bark leaf leaves or and to taste of a the".split(" ");
    var UNITS = "cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons oz ounce ounces lb lbs pound pounds g kg gram grams ml l liter litre pinch clove cloves bunch handful inch".split(" ");
    module2.exports = { SECTIONS, PHRASE_RULES, TOKEN_DB, STOP, UNITS };
  }
});

// src/sections.js
var require_sections = __commonJS({
  "src/sections.js"(exports2, module2) {
    "use strict";
    var { isTaskLine: isTaskLine2, isIndented, arraysEqual, reorderBlock } = require_tasks();
    var { SECTIONS, PHRASE_RULES, TOKEN_DB, STOP, UNITS } = require_ingredient_db();
    var STOP_SET = {};
    STOP.forEach((w) => {
      STOP_SET[w] = 1;
    });
    var UNIT_SET = {};
    UNITS.forEach((w) => {
      UNIT_SET[w] = 1;
    });
    function lev1(a, b) {
      if (a === b) return true;
      const la = a.length, lb = b.length;
      if (Math.abs(la - lb) > 1) return false;
      let i = 0, j = 0, edits = 0;
      while (i < la && j < lb) {
        if (a[i] === b[j]) {
          i++;
          j++;
          continue;
        }
        if (++edits > 1) return false;
        if (la > lb) i++;
        else if (lb > la) j++;
        else {
          i++;
          j++;
        }
      }
      return true;
    }
    function normalizeName(s) {
      const t = (s || "").toLowerCase().replace(/[^a-z\s/]/g, " ").replace(/\s+/g, " ").trim();
      const toks = [];
      t.split(" ").forEach((w) => {
        if (!w || STOP_SET[w] || UNIT_SET[w]) return;
        if (w.length > 4 && w.charAt(w.length - 1) === "s") w = w.slice(0, -1);
        toks.push(w);
      });
      return toks;
    }
    function textOf(line) {
      return line.replace(/^\s*[-*+]\s*\[.\]\s*/, "").trim().toLowerCase();
    }
    function classify(line) {
      const t = textOf(line);
      for (let i = 0; i < PHRASE_RULES.length; i++) {
        const ph = PHRASE_RULES[i][1];
        for (let k = 0; k < ph.length; k++) if (t.indexOf(ph[k]) !== -1) return PHRASE_RULES[i][0];
      }
      const toks = normalizeName(t);
      for (let s = 0; s < SECTIONS.length; s++) {
        const db = TOKEN_DB[SECTIONS[s]];
        if (!db) continue;
        for (let j = 0; j < toks.length; j++) for (let d = 0; d < db.length; d++) {
          if (toks[j] === db[d] || toks[j].length > 4 && lev1(toks[j], db[d])) return SECTIONS[s];
        }
      }
      return "Other";
    }
    function isManagedHeading2(line) {
      return line.slice(0, 3) === "## " && SECTIONS.indexOf(line.slice(3).trim()) !== -1;
    }
    function buildSections(taskLines) {
      const groups = {};
      taskLines.forEach((l) => {
        const sec = classify(l);
        (groups[sec] || (groups[sec] = [])).push(l);
      });
      const out = [];
      for (let s = 0; s < SECTIONS.length; s++) {
        const g = groups[SECTIONS[s]];
        if (!g || !g.length) continue;
        if (out.length) out.push("");
        out.push("## " + SECTIONS[s]);
        reorderBlock(g).forEach((x) => out.push(x));
      }
      return out;
    }
    function organizeBySections2(editor) {
      const n = editor.lineCount();
      let first = -1, last = -1;
      for (let i = 0; i < n; i++) {
        const l = editor.getLine(i);
        if (isTaskLine2(l) || isManagedHeading2(l)) {
          if (first < 0) first = i;
          last = i;
        }
      }
      if (first < 0) return false;
      const tasks = [], oldText = [];
      for (let i = first; i <= last; i++) {
        const l = editor.getLine(i);
        oldText.push(l);
        if (isTaskLine2(l)) tasks.push(l);
      }
      if (tasks.some(isIndented)) return false;
      const newLines = buildSections(tasks);
      if (arraysEqual(oldText, newLines)) return false;
      editor.replaceRange(newLines.join("\n"), { line: first, ch: 0 }, { line: last, ch: editor.getLine(last).length });
      return true;
    }
    module2.exports = { SECTIONS, lev1, normalizeName, classify, isManagedHeading: isManagedHeading2, buildSections, organizeBySections: organizeBySections2 };
  }
});

// src/recipe.js
var require_recipe = __commonJS({
  "src/recipe.js"(exports2, module2) {
    "use strict";
    var { TASK_RE, isTaskLine: isTaskLine2, isCompleted } = require_tasks();
    var { normalizeName } = require_sections();
    var { UNITS } = require_ingredient_db();
    var UNIT_SET = {};
    UNITS.forEach((w) => {
      UNIT_SET[w] = 1;
    });
    function fracToNum(s) {
      return s.indexOf("/") !== -1 ? parseFloat(s.split("/")[0]) / parseFloat(s.split("/")[1]) : parseFloat(s);
    }
    function fmtNum(n) {
      if (!isFinite(n)) return "";
      const r = Math.round(n * 100) / 100;
      return r % 1 === 0 ? String(r) : String(r);
    }
    function parseIngredient(line) {
      let s = line.replace(/^\s*[-*+]\s+\[.\]\s*/, "").replace(/^\s*[-*+]\s+/, "").trim();
      let qty = "";
      const qm = s.match(/^(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*/);
      if (qm) {
        qty = qm[1].replace(/\s+/g, "");
        s = s.slice(qm[0].length);
      }
      let unit = "";
      const um = s.match(/^([a-zA-Z]+)\b/);
      if (um && UNIT_SET[um[1].toLowerCase()]) {
        unit = um[1].toLowerCase();
        s = s.slice(um[0].length).trim();
      }
      return { qty, unit, name: s.split(",")[0].trim() };
    }
    function scaleQty(qty, factor) {
      if (!qty) return "";
      if (qty.indexOf("-") !== -1) {
        const p = qty.split("-");
        return fmtNum(fracToNum(p[0]) * factor) + "-" + fmtNum(fracToNum(p[1]) * factor);
      }
      return fmtNum(fracToNum(qty) * factor);
    }
    function ingredientToTask(ing) {
      return "- [ ] " + [ing.qty, ing.unit, ing.name].filter(Boolean).join(" ").trim();
    }
    function recipeIngredients2(text, factor) {
      const lines = text.split(/\r?\n/);
      let inSec = false;
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (/^#\s+ingredients\b/i.test(l)) {
          inSec = true;
          continue;
        }
        if (inSec && /^#\s+/.test(l)) break;
        if (!inSec || !/^\s*[-*+]\s+/.test(l)) continue;
        const ing = parseIngredient(l);
        if (!ing.name) continue;
        ing.qty = scaleQty(ing.qty, factor);
        out.push(ingredientToTask(ing));
      }
      return out;
    }
    function mergeShoppingItems2(existing, additions) {
      const map = {}, order = [];
      existing.forEach((line) => {
        const ing = parseIngredient(line);
        const key = ing.unit + "|" + normalizeName(ing.name).join(" ");
        const num = ing.qty && ing.qty.indexOf("-") === -1 ? fracToNum(ing.qty) : NaN;
        if (!map[key]) {
          map[key] = { num, unit: ing.unit, name: ing.name, checked: isCompleted(line), added: false };
          order.push(key);
        }
      });
      additions.forEach((line) => {
        const ing = parseIngredient(line);
        const key = ing.unit + "|" + normalizeName(ing.name).join(" ");
        const num = ing.qty && ing.qty.indexOf("-") === -1 ? fracToNum(ing.qty) : NaN;
        if (map[key]) {
          const base = map[key].checked ? 0 : map[key].num;
          map[key].num = !isNaN(num) && !isNaN(base) ? base + num : NaN;
          map[key].checked = false;
          map[key].added = true;
        } else {
          map[key] = { num, unit: ing.unit, name: ing.name, checked: false, added: true };
          order.push(key);
        }
      });
      return order.map((k) => {
        const m = map[k];
        const box = m.checked && !m.added ? "- [x] " : "- [ ] ";
        return box + [isNaN(m.num) ? "" : fmtNum(m.num), m.unit, m.name].filter(Boolean).join(" ").trim();
      });
    }
    module2.exports = { fracToNum, fmtNum, parseIngredient, scaleQty, ingredientToTask, recipeIngredients: recipeIngredients2, mergeShoppingItems: mergeShoppingItems2 };
  }
});

// src/main.js
var obsidian = require("obsidian");
var { isTaskLine, sinkAllBlocks, sinkAtLine } = require_tasks();
var { isManagedHeading, organizeBySections } = require_sections();
var { recipeIngredients, mergeShoppingItems } = require_recipe();
var SCALE_OPTIONS = [0.5, 1, 1.5, 2, 3, 4];
var ScaleModal = class extends obsidian.Modal {
  constructor(app, onPick) {
    super(app);
    this.onPick = onPick;
  }
  onOpen() {
    this.titleEl.setText("Scale recipe by\u2026");
    const row = this.contentEl.createDiv({ cls: "scs-scale-row" });
    SCALE_OPTIONS.forEach((f) => {
      const b = row.createEl("button", { text: "x" + f });
      b.style.margin = "4px";
      b.onclick = () => {
        this.close();
        this.onPick(f);
      };
    });
    const custom = this.contentEl.createEl("input", { type: "number", placeholder: "custom" });
    custom.min = "0.1";
    custom.step = "0.1";
    const go = this.contentEl.createEl("button", { text: "Add" });
    go.style.margin = "4px";
    go.onclick = () => {
      const v = parseFloat(custom.value);
      if (v > 0) {
        this.close();
        this.onPick(v);
      }
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SinkCompletedTasksPlugin = class extends obsidian.Plugin {
  async onload() {
    this.registerDomEvent(document, "click", this.handleCheckboxClick.bind(this));
    this.addCommand({ id: "sink-completed-tasks-current-note", name: "Sink completed tasks to bottom (current note)", editorCallback: (e) => sinkAllBlocks(e) });
    this.addCommand({ id: "organize-shopping-list-by-section", name: "Organize shopping list by store section", editorCallback: (e) => organizeBySections(e) });
    this.addCommand({
      id: "add-recipe-to-shopping-list",
      name: "Add this recipe to Shopping List (scaled)",
      checkCallback: (checking) => {
        const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const ok = v && v.file && /^#\s+ingredients\b/im.test(v.editor.getValue());
        if (checking) return !!ok;
        if (ok) new ScaleModal(this.app, (f) => this.addRecipeToList(v.editor.getValue(), f)).open();
        return true;
      }
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", this.maybeAutoOrganize.bind(this)));
  }
  maybeAutoOrganize() {
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v || !v.file || v.file.basename.toLowerCase() !== "shopping list") return;
      const e = v.editor;
      let hasTask = false;
      for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) {
        hasTask = true;
        break;
      }
      if (hasTask) {
        try {
          organizeBySections(e);
        } catch (err) {
        }
      }
    }, 50);
  }
  async addRecipeToList(recipeText, factor) {
    const additions = recipeIngredients(recipeText, factor);
    if (!additions.length) {
      new obsidian.Notice('No ingredients found under "# Ingredients".');
      return;
    }
    const file = this.app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === "shopping list")[0];
    if (!file) {
      new obsidian.Notice('No "Shopping List" note found.');
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(file);
    const e = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView).editor;
    const n = e.lineCount();
    const existing = [];
    for (let i = 0; i < n; i++) if (isTaskLine(e.getLine(i))) existing.push(e.getLine(i));
    const merged = mergeShoppingItems(existing, additions);
    if (existing.length) {
      let first = -1, last = -1;
      for (let i = 0; i < n; i++) {
        const l = e.getLine(i);
        if (isTaskLine(l) || isManagedHeading(l)) {
          if (first < 0) first = i;
          last = i;
        }
      }
      e.replaceRange(merged.join("\n"), { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
    } else {
      e.replaceRange((e.getValue().trim() ? "\n" : "") + merged.join("\n"), { line: n, ch: 0 });
    }
    organizeBySections(e);
    new obsidian.Notice("Added " + additions.length + " ingredients (x" + factor + ").");
  }
  handleCheckboxClick(evt) {
    const t = evt.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("task-list-item-checkbox")) return;
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v) return;
      const line = this.lineFromCheckbox(v.editor, t);
      if (line != null) {
        try {
          sinkAtLine(v.editor, line);
        } catch (e) {
        }
      }
    }, 0);
  }
  lineFromCheckbox(editor, target) {
    try {
      const cm = editor.cm;
      if (cm && typeof cm.posAtDOM === "function") {
        const off = cm.posAtDOM(target);
        if (typeof off === "number" && off >= 0) {
          const p = editor.offsetToPos(off);
          if (p) return p.line;
        }
      }
    } catch (e) {
    }
    const dl = target.getAttribute("data-line");
    if (dl != null) {
      const n = parseInt(dl, 10);
      if (!isNaN(n)) return n;
    }
    return null;
  }
};
module.exports = SinkCompletedTasksPlugin;
