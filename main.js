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
      ["Pantry/Dry", ["apple cider vinegar", "cider vinegar", "rice vinegar", "white vinegar", "vinegar", "olive oil", "soy sauce", "peanut butter", "maple syrup"]],
      ["Spices", ["bay leaf", "bay leaves", "taco seasoning", "kasoori methi", "curry powder", "black pepper", "red pepper flake", "chili powder", "chilli powder", "cayenne", "star anise", "baking powder", "baking soda", "vanilla extract"]]
    ];
    var TOKEN_DB = {
      Produce: ["onion", "scallion", "shallot", "garlic", "ginger", "tomato", "potato", "sweetpotato", "carrot", "celery", "cucumber", "lettuce", "spinach", "kale", "arugula", "cabbage", "cauliflower", "broccoli", "zucchini", "eggplant", "okra", "mushroom", "pea", "greenbean", "corn", "pepper", "jalapeno", "serrano", "habanero", "poblano", "chili", "chilli", "chile", "cilantro", "parsley", "mint", "basil", "dill", "rosemary", "thyme", "sage", "curryleaf", "lemon", "lime", "orange", "apple", "banana", "mango", "grape", "berry", "strawberry", "blueberry", "raspberry", "avocado", "pineapple", "melon", "watermelon", "peach", "plum", "pear", "pomegranate", "beet", "radish", "turnip", "squash", "pumpkin", "leek", "fennel", "asparagus", "artichoke", "herb", "green", "sprout", "grapefruit"],
      Dairy: ["milk", "butter", "cream", "heavycream", "sourcream", "yogurt", "yoghurt", "curd", "cheese", "paneer", "ghee", "mozzarella", "cheddar", "parmesan", "feta", "ricotta", "buttermilk", "margarine", "cottagecheese", "creamcheese", "custard"],
      "Meat/Protein": ["chicken", "beef", "pork", "lamb", "mutton", "turkey", "bacon", "sausage", "ham", "egg", "fish", "salmon", "shrimp", "prawn", "crab", "tofu", "tempeh", "seitan"],
      Bakery: ["bread", "bun", "naan", "roti", "paratha", "tortilla", "pita", "bagel", "baguette", "croissant", "muffin", "pav", "cracker"],
      "Pantry/Dry": ["rice", "flour", "maida", "sooji", "semolina", "besan", "cornstarch", "cornflour", "lentil", "dal", "sugar", "jaggery", "honey", "syrup", "oil", "vinegar", "pasta", "noodle", "spaghetti", "macaroni", "broth", "stock", "salt", "tea", "coffee", "quinoa", "oat", "cereal", "peanut", "peanutbutter", "almond", "cashew", "walnut", "raisin", "nut", "breadcrumb", "cocoa", "chocolate", "vanilla", "cornmeal", "tamarind", "soysauce", "ketchup", "mustard", "mayo", "mayonnaise", "water"],
      Spices: ["cumin", "coriander", "turmeric", "garam", "masala", "cardamom", "peppercorn", "clove", "cinnamon", "anise", "nutmeg", "mace", "saffron", "paprika", "cayenne", "chaat", "asafoetida", "hing", "fenugreek", "methi", "oregano", "sesame", "spice", "seasoning", "allspice"]
    };
    var STOP = "chopped diced minced grated shredded crushed mashed beaten cut cubed sliced finely fresh small large medium ground powder powdered seed seeds dried optional garnish garnishes garnishing ripe peeled halved boneless skinless raw cooked seeded cored pitted trimmed deveined extra virgin toasted roasted can cans or and to taste more plus needed room temperature softened melted packed divided thawed rinsed drained coarse coarsely freshly plain unsalted salted neutral pure style preferably such about approximately package packages bag bags stick sticks head jar box container packet block brick loaf slices slice pieces piece bark whole of a the".split(" ");
    var UNITS = "cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons oz ounce ounces lb lbs pound pounds g kg gram grams ml l liter litre pinch clove cloves bunch handful inch".split(" ");
    var STAPLES = ["salt", "water", "oil", "sugar", "black pepper", "pepper"];
    module2.exports = { SECTIONS, PHRASE_RULES, TOKEN_DB, STOP, UNITS, STAPLES };
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
        if (w.length > 4 && w.slice(-3) === "ves") w = w.slice(0, -3) + "f";
        else if (w.length > 4 && w.charAt(w.length - 1) === "s") w = w.slice(0, -1);
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
      return line.slice(0, 3) === "## " && (SECTIONS.indexOf(line.slice(3).trim()) !== -1 || line.slice(3).trim() === PANTRY_SECTION);
    }
    var PANTRY_SECTION = "\u2713 Have (pantry)";
    function buildSections(taskLines, pantry) {
      const groups = {};
      taskLines.forEach((l) => {
        const key = normalizeName(l.replace(/^\s*[-*+]\s*\[.\]\s*/, "").split(",")[0]).join(" ");
        const sec = pantry && pantry.has && pantry.has(key) ? PANTRY_SECTION : classify(l);
        (groups[sec] || (groups[sec] = [])).push(l);
      });
      const out = [];
      const order = SECTIONS.concat([PANTRY_SECTION]);
      for (let s = 0; s < order.length; s++) {
        const g = groups[order[s]];
        if (!g || !g.length) continue;
        if (out.length) out.push("");
        out.push("## " + order[s]);
        reorderBlock(g).forEach((x) => out.push(x));
      }
      return out;
    }
    function organizeBySections2(editor, pantry) {
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
      const newLines = buildSections(tasks, pantry);
      if (arraysEqual(oldText, newLines)) return false;
      editor.replaceRange(newLines.join("\n"), { line: first, ch: 0 }, { line: last, ch: editor.getLine(last).length });
      return true;
    }
    module2.exports = { SECTIONS, PANTRY_SECTION, lev1, normalizeName, classify, isManagedHeading: isManagedHeading2, buildSections, organizeBySections: organizeBySections2 };
  }
});

// src/recipe.js
var require_recipe = __commonJS({
  "src/recipe.js"(exports2, module2) {
    "use strict";
    var { TASK_RE, isTaskLine: isTaskLine2, isCompleted } = require_tasks();
    var { normalizeName } = require_sections();
    var { UNITS, STAPLES } = require_ingredient_db();
    var UNIT_SET = {};
    UNITS.forEach((w) => {
      UNIT_SET[w] = 1;
    });
    var STAPLE_SET = {};
    STAPLES.forEach((w) => {
      STAPLE_SET[normalizeName(w).join(" ")] = 1;
    });
    function fracToNum(s) {
      return s.indexOf("/") !== -1 ? parseFloat(s.split("/")[0]) / parseFloat(s.split("/")[1]) : parseFloat(s);
    }
    function fmtNum(n) {
      if (!isFinite(n)) return "";
      const r = Math.round(n * 100) / 100;
      return r % 1 === 0 ? String(r) : String(r);
    }
    function nameKey2(name) {
      return normalizeName(name).join(" ");
    }
    function isStaple2(name, pantry) {
      const k = nameKey2(name);
      if (!k) return false;
      if (pantry && pantry.has && pantry.has(k)) return true;
      return !!STAPLE_SET[k] || k.split(" ").some((t) => STAPLE_SET[t]);
    }
    function cleanIngredientText(s) {
      return s.replace(/\([^)]*\)/g, " ").split(/,|;|&| or | plus | for /i)[0].replace(/\s+/g, " ").trim();
    }
    function parseIngredient2(line) {
      let s = cleanIngredientText(line.replace(/^\s*[-*+]\s+\[.\]\s*/, "").replace(/^\s*[-*+]\s+/, "")).toLowerCase().replace(/½/g, "1/2").replace(/⅓/g, "1/3").replace(/⅔/g, "2/3").replace(/¼/g, "1/4").replace(/¾/g, "3/4").replace(/⅛/g, "1/8").replace(/(\d+)\s+(\d+)\/(\d+)/g, (m2, w, a, b) => String(parseInt(w, 10) + parseInt(a, 10) / parseInt(b, 10)));
      const m = s.match(/(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*([a-z]+)?/);
      let qty = "", unit = "";
      if (m) {
        qty = m[1].replace(/\s+/g, "");
        if (m[2] && UNIT_SET[m[2]]) {
          unit = m[2];
          s = s.slice(0, m.index) + s.slice(m.index + m[0].length);
        } else s = s.slice(0, m.index) + s.slice(m.index + m[1].length);
      }
      return { qty, unit, name: normalizeName(s).join(" ") };
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
      return "- [ ] " + [ing.name, ing.qty, ing.unit].filter(Boolean).join(" ").trim();
    }
    function recipeIngredients2(text, factor, pantry) {
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
        const ing = parseIngredient2(l);
        if (!ing.name) continue;
        ing.qty = scaleQty(ing.qty, factor);
        out.push(ingredientToTask(ing));
      }
      return out;
    }
    var VOL = { tsp: 1, teaspoon: 1, teaspoons: 1, tbsp: 3, tablespoon: 3, tablespoons: 3, cup: 48, cups: 48 };
    var WT = { g: 1, gram: 1, grams: 1, kg: 1e3, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6 };
    function unitFamily(u) {
      if (VOL[u]) return { fam: "vol", f: VOL[u] };
      if (WT[u]) return { fam: "wt", f: WT[u] };
      return { fam: u || "", f: 1 };
    }
    function displayQtyUnit(base, fam) {
      if (fam === "vol") return base >= 48 ? [base / 48, "cups"] : base >= 3 ? [base / 3, "tbsp"] : [base, "tsp"];
      if (fam === "wt") return base >= 1e3 ? [base / 1e3, "kg"] : base >= 453.6 ? [base / 453.6, "lb"] : base >= 28.35 ? [base / 28.35, "oz"] : [base, "g"];
      return [base, fam];
    }
    function mergeShoppingItems2(existing, additions) {
      const map = {}, order = [];
      const add = (line, isAdd) => {
        const ing = parseIngredient2(line);
        const fu = unitFamily(ing.unit);
        const nm = normalizeName(ing.name).join(" ");
        const key = nm + "|" + fu.fam;
        const num = ing.qty && ing.qty.indexOf("-") === -1 ? fracToNum(ing.qty) * fu.f : NaN;
        if (!map[key]) {
          map[key] = { base: num, fam: fu.fam, name: ing.name, checked: isCompleted(line), added: isAdd };
          order.push(key);
          return;
        }
        const m = map[key];
        const base = isAdd && m.checked ? 0 : m.base;
        m.base = !isNaN(num) && !isNaN(base) ? base + num : NaN;
        if (isCompleted(line)) m.checked = true;
        if (isAdd) m.checked = false, m.added = true;
      };
      existing.forEach((l) => add(l, false));
      additions.forEach((l) => add(l, true));
      return order.map((k) => {
        const m = map[k];
        const box = m.checked && !m.added ? "- [x] " : "- [ ] ";
        const [q, u] = isNaN(m.base) ? ["", ""] : displayQtyUnit(m.base, m.fam);
        return box + [m.name, q === "" ? "" : fmtNum(q), u].filter(Boolean).join(" ").trim();
      });
    }
    module2.exports = { fracToNum, fmtNum, parseIngredient: parseIngredient2, scaleQty, ingredientToTask, recipeIngredients: recipeIngredients2, mergeShoppingItems: mergeShoppingItems2, isStaple: isStaple2, nameKey: nameKey2 };
  }
});

// src/pantry.js
var require_pantry = __commonJS({
  "src/pantry.js"(exports2, module2) {
    "use strict";
    var { nameKey: nameKey2, parseIngredient: parseIngredient2 } = require_recipe();
    var PANTRY_BASENAME2 = "pantry";
    function findPantryFile(app) {
      return app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === PANTRY_BASENAME2)[0] || null;
    }
    async function pantrySet2(app) {
      const f = findPantryFile(app);
      const set = /* @__PURE__ */ new Set();
      if (!f) return set;
      const text = await app.vault.cachedRead(f);
      text.split(/\r?\n/).forEach((l) => {
        if (/^\s*[-*+]\s+/.test(l)) {
          const k = nameKey2(parseIngredient2(l).name);
          if (k) set.add(k);
        }
      });
      return set;
    }
    async function togglePantry2(app, name) {
      const key = nameKey2(name);
      if (!key) return null;
      let f = findPantryFile(app);
      if (!f) f = await app.vault.create("Family/Meal Planning/Pantry.md", "# Pantry\n\nItems here are skipped when adding recipes.\n\n");
      const text = await app.vault.read(f);
      const lines = text.split(/\r?\n/);
      let idx = -1;
      for (let i = 0; i < lines.length; i++) if (/^\s*[-*+]\s+/.test(lines[i]) && nameKey2(parseIngredient2(lines[i]).name) === key) {
        idx = i;
        break;
      }
      if (idx >= 0) {
        lines.splice(idx, 1);
        await app.vault.modify(f, lines.join("\n"));
        return "removed";
      }
      lines.push("- " + key);
      await app.vault.modify(f, lines.join("\n"));
      return "added";
    }
    module2.exports = { PANTRY_BASENAME: PANTRY_BASENAME2, findPantryFile, pantrySet: pantrySet2, togglePantry: togglePantry2 };
  }
});

// src/import.js
var require_import = __commonJS({
  "src/import.js"(exports2, module2) {
    "use strict";
    function parseRecipe2(html) {
      const blocks = [];
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while (m = re.exec(html)) blocks.push(m[1]);
      let recipe = null;
      for (const b of blocks) {
        let data;
        try {
          data = JSON.parse(b.trim());
        } catch (e) {
          continue;
        }
        const items = Array.isArray(data) ? data : data["@graph"] || [data];
        for (const it of items) {
          const t = it && it["@type"];
          if (t === "Recipe" || Array.isArray(t) && t.indexOf("Recipe") !== -1) {
            recipe = it;
            break;
          }
        }
        if (recipe) break;
      }
      const clean = (x) => (x == null ? "" : String(x)).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
      if (!recipe) return parseMicrodata(html, clean);
      const text = (x) => (x == null ? "" : String(x)).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
      const ingredients = (recipe.recipeIngredient || recipe.ingredients || []).map(text).filter(Boolean);
      const flat = [];
      (function walk(ins) {
        (Array.isArray(ins) ? ins : [ins]).forEach((s) => {
          if (!s) return;
          if (typeof s === "string") flat.push(text(s));
          else if (s.itemListElement) walk(s.itemListElement);
          else if (s.text) flat.push(text(s.text));
        });
      })(recipe.recipeInstructions || []);
      const img = recipe.image && (recipe.image.url || (Array.isArray(recipe.image) ? recipe.image[0].url || recipe.image[0] : recipe.image));
      const isoMin = (d) => {
        const r = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(d || "");
        if (!r) return "";
        return parseInt(r[1] || 0) * 60 + parseInt(r[2] || 0) + " min";
      };
      return {
        title: text(recipe.name),
        image: typeof img === "string" ? img : "",
        servings: text(Array.isArray(recipe.recipeYield) ? recipe.recipeYield[recipe.recipeYield.length - 1] : recipe.recipeYield) || "",
        time: isoMin(recipe.totalTime) || "",
        ingredients,
        directions: flat.filter(Boolean),
        tags: (Array.isArray(recipe.keywords) ? recipe.keywords : String(recipe.keywords || "").split(",")).map((k) => text(k).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean)
      };
    }
    function sanitizeFilename2(s) {
      return (s || "Recipe").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 80);
    }
    function parseMicrodata(html, clean) {
      const collect = (re) => {
        const out = [];
        let m;
        while (m = re.exec(html)) out.push(clean(m[1]));
        return out.filter(Boolean);
      };
      const ingredients = collect(/<li[^>]*class="[^"]*p-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/gi);
      let directions = [];
      const insBlock = /e-instructions[\s\S]*?>([\s\S]*?)<\/ol>/i.exec(html) || /recipeInstructions[\s\S]*?>([\s\S]*?)<\/(?:ol|ul)>/i.exec(html);
      if (insBlock) {
        let m;
        const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        while (m = re.exec(insBlock[1])) {
          const t = clean(m[1]);
          if (t) directions.push(t);
        }
      }
      if (!ingredients.length) return null;
      const meta = (p) => {
        const m = new RegExp('<meta[^>]*property="' + p + '"[^>]*content="([^"]+)"', "i").exec(html) || new RegExp('content="([^"]+)"[^>]*property="' + p + '"', "i").exec(html);
        return m ? clean(m[1]) : "";
      };
      const ip = (p) => {
        const m = new RegExp('itemprop="[^"]*' + p + '[^"]*"[^>]*>([^<]+)', "i").exec(html);
        return m ? clean(m[1]) : "";
      };
      return {
        title: meta("og:title").replace(/\s*[-|]\s*The Chutney Life.*$/i, "").trim(),
        image: meta("og:image"),
        servings: ip("recipeYield"),
        time: ip("totalTime") || "",
        ingredients,
        directions,
        tags: []
      };
    }
    function decodeEntities(s) {
      return (s || "").replace(/&#(\d+);/g, (m, n) => n === "8217" || n === "8216" || n === "39" || n === "8242" ? "'" : n === "8211" || n === "8212" ? "-" : n === "176" ? "\xB0" : n === "189" ? "1/2" : " ").replace(/&#x27;|&rsquo;|&lsquo;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&deg;/g, "\xB0").replace(/&frac12;/g, "1/2").replace(/&frac14;/g, "1/4").replace(/&frac34;/g, "3/4").replace(/&[a-z]+;/g, " ");
    }
    function htmlToLines(frag) {
      return decodeEntities(frag.replace(/<(script|style|noscript|nav|header|footer|form)[\s\S]*?<\/\1>/gi, " ").replace(/<\/(p|li|h[1-6]|div|ol|ul|br|tr|section)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    }
    var QTY_RE = /^\s*([\d½⅓⅔¼¾⅛]|an?\s)/i;
    var UNIT_WORD = /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|kg|grams?|ml|l|liters?|litres?|pinch|cloves?|bunch|handful|inch|can|cans|package|stick|sticks|slices?|dash|large|small|medium)\b/i;
    var JUNK_RE = /comment|response|repl(y|ies)|rating|star|share this|print recipe|save recipe|read more|©|subscribe|related|newsletter|advertisement/i;
    function looksLikeIngredient(l) {
      if (JUNK_RE.test(l)) return false;
      if (/^\s*\d+\s*[.)]\s/.test(l)) return false;
      const words = l.split(/\s+/).length;
      if (QTY_RE.test(l) && (UNIT_WORD.test(l) || words >= 2 && words <= 9) && words <= 16) return true;
      if (words <= 10 && (/^(pinch|dash|juice|zest|splash|handful|sprinkle)\b/i.test(l) || /\bfor (garnish|serving|topping|dusting|drizzling)\b/i.test(l) || /,?\s*to taste\s*,?[^.]*$/i.test(l))) return true;
      return false;
    }
    function articleToRecipe2(html, title) {
      let region = html;
      const start = html.search(/class="[^"]*(entry-content|post-content|article-body|articleBody|recipe)[^"]*"/i);
      if (start >= 0) {
        const after = html.slice(start);
        const endRel = after.search(/class="[^"]*(entry-footer|comments|post-navigation|related|sharedaddy)[^"]*"|<\/article>/i);
        region = endRel > 0 ? after.slice(0, endRel) : after;
      }
      const lines = htmlToLines(region);
      const ingIdx = [];
      for (let i = 0; i < lines.length; i++) if (looksLikeIngredient(lines[i])) ingIdx.push(i);
      if (ingIdx.length < 3) return null;
      const first = ingIdx[0], last = ingIdx[ingIdx.length - 1];
      const ingredients = [];
      for (let i = first; i <= last; i++) if (looksLikeIngredient(lines[i])) ingredients.push(lines[i]);
      const directions = [];
      for (let i = first; i < lines.length && directions.length < 40; i++) {
        const l = lines[i];
        if (/^(related|you might|comments?|leave a|share this|filed under|posted|tags:|print|pin it|save|nutrition)\b/i.test(l)) break;
        if (JUNK_RE.test(l) || looksLikeIngredient(l)) continue;
        if (l.split(/\s+/).length >= 4) directions.push(l.replace(/^\s*\d+\s*[.)]\s*/, "").replace(/^step\s*\d+\s*:?\s*/i, ""));
      }
      let servings = "";
      for (let i = 0; i <= first; i++) {
        const m = /^(?:makes|serves|yield|servings?)\b\s*:?\s*(.+)$/i.exec(lines[i]);
        if (m) {
          servings = m[1].trim();
          break;
        }
      }
      return { title: title || "Recipe", image: "", servings, time: "", ingredients, directions, tags: [] };
    }
    function recipeToNote2(r, url) {
      const tags = ["recipe"].concat(r.tags || []).filter((v, i, a) => a.indexOf(v) === i);
      const fm = ["---", "type: recipe", "area: meals", "tags:", ...tags.map((t) => "  - " + t)];
      if (r.servings) fm.push("servings: " + r.servings);
      if (r.time) fm.push("time: " + r.time);
      if (url) fm.push('source: "' + url + '"');
      fm.push('moc: "[[Meal Planning]]"', "---");
      const body = [];
      if (r.image) body.push("![" + (r.title || "Recipe") + "](" + r.image + ")", "");
      body.push("# Ingredients", "", ...r.ingredients.map((i) => "- " + i), "");
      body.push("# Directions", "", ...r.directions.map((d, n) => n + 1 + ". " + d));
      return fm.join("\n") + "\n" + body.join("\n") + "\n";
    }
    module2.exports = { parseRecipe: parseRecipe2, articleToRecipe: articleToRecipe2, sanitizeFilename: sanitizeFilename2, recipeToNote: recipeToNote2 };
  }
});

// src/paste.js
var require_paste = __commonJS({
  "src/paste.js"(exports2, module2) {
    "use strict";
    var UNITS_RE = /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|kg|grams?|ml|l|liters?|litres?|pinch|cloves?|bunch|handful|inch|can|cans|package|stick|sticks|slices?|dash)\b/i;
    function stripStep(l) {
      return l.replace(/^\s*\d+\s*[.)]\s*/, "").replace(/^step\s*\d+\s*:?\s*/i, "").trim();
    }
    function captureServings(l) {
      const m = /^(?:makes|serves|yield|servings?)\b\s*:?\s*(.+)$/i.exec(l);
      return m ? m[1].trim() : "";
    }
    function isHeader(l, kind) {
      const h = l.replace(/[#*:]/g, "").trim().toLowerCase();
      if (kind === "ing") return /^ingredients?$/.test(h);
      return /^(directions?|instructions?|method|steps?|preparation)$/.test(h);
    }
    function isIngredientLine(l) {
      if (/^\s*\d+\s*[.)]\s/.test(l)) return false;
      const startsQty = /^\s*([\d½⅓⅔¼¾⅛]|an?\s)/i.test(l);
      const words = l.split(/\s+/).length;
      const sentence = /[.!?]$/.test(l) && words > 8;
      return (startsQty || UNITS_RE.test(l)) && words <= 14 && !sentence;
    }
    function parsePastedRecipe2(text) {
      const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*[-*+]\s+/, "").trim()).filter(Boolean);
      let title = "", servings = "", ingredients = [], directions = [];
      const hasHeaders = lines.some((l) => isHeader(l, "ing") || isHeader(l, "dir"));
      if (hasHeaders) {
        let mode = "pre";
        for (const line of lines) {
          if (isHeader(line, "ing")) {
            mode = "ing";
            continue;
          }
          if (isHeader(line, "dir")) {
            mode = "dir";
            continue;
          }
          const sv = captureServings(line);
          if (sv) {
            servings = servings || sv;
            continue;
          }
          if (mode === "ing") ingredients.push(line);
          else if (mode === "dir") directions.push(stripStep(line));
          else if (!title) title = line;
        }
      } else {
        for (const line of lines) {
          const sv = captureServings(line);
          if (sv) {
            servings = servings || sv;
            continue;
          }
          if (!title && !isIngredientLine(line) && !/^\s*\d+\s*[.)]/.test(line)) {
            title = line;
            continue;
          }
          if (isIngredientLine(line)) ingredients.push(line);
          else directions.push(stripStep(line));
        }
      }
      return { title: title || "Pasted Recipe", servings, ingredients, directions, tags: [], image: "", time: "" };
    }
    module2.exports = { parsePastedRecipe: parsePastedRecipe2, isIngredientLine, stripStep, captureServings };
  }
});

// src/main.js
var obsidian = require("obsidian");
var { isTaskLine, sinkAllBlocks, sinkAtLine } = require_tasks();
var { isManagedHeading, organizeBySections } = require_sections();
var { recipeIngredients, mergeShoppingItems, nameKey, parseIngredient, isStaple } = require_recipe();
var { pantrySet, togglePantry, PANTRY_BASENAME } = require_pantry();
var { parseRecipe, articleToRecipe, sanitizeFilename, recipeToNote } = require_import();
var { parsePastedRecipe } = require_paste();
var SCALE_OPTIONS = [2, 4, 6, 8, 12];
var PasteModal = class extends obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.titleEl.setText("Paste recipe text");
    this.contentEl.createEl("p", { text: 'Paste the title, ingredients, then directions. Works with "Ingredients"/"Directions" headers or plain text.' });
    const ta = this.contentEl.createEl("textarea", { cls: "scs-paste" });
    ta.rows = 16;
    ta.style.width = "100%";
    const go = this.contentEl.createEl("button", { text: "Create recipe", cls: "mod-cta" });
    go.style.marginTop = "8px";
    go.onclick = () => {
      const v = ta.value.trim();
      if (v) {
        this.close();
        this.onSubmit(v);
      }
    };
    setTimeout(() => ta.focus(), 0);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var PromptModal = class extends obsidian.Modal {
  constructor(app, title, placeholder, onPick) {
    super(app);
    this.t = title;
    this.ph = placeholder;
    this.onPick = onPick;
  }
  onOpen() {
    this.titleEl.setText(this.t);
    const input = this.contentEl.createEl("input", { type: "text", placeholder: this.ph });
    input.style.width = "100%";
    const go = this.contentEl.createEl("button", { text: "Import" });
    go.style.marginTop = "8px";
    const submit = () => {
      const v = input.value.trim();
      if (v) {
        this.close();
        this.onPick(v);
      }
    };
    go.onclick = submit;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ScaleModal = class extends obsidian.Modal {
  constructor(app, servings, onPick) {
    super(app);
    this.servings = servings || 4;
    this.onPick = onPick;
  }
  onOpen() {
    this.titleEl.setText("Add for how many people? (recipe serves " + this.servings + ")");
    const row = this.contentEl.createDiv({ cls: "scs-scale-row" });
    SCALE_OPTIONS.forEach((p) => {
      const b = row.createEl("button", { text: p === 4 ? "4 (default)" : String(p) });
      if (p === 4) b.classList.add("mod-cta");
      b.style.margin = "4px";
      b.onclick = () => {
        this.close();
        this.onPick(p / this.servings);
      };
    });
    const custom = this.contentEl.createEl("input", { type: "number", placeholder: "people" });
    custom.min = "1";
    custom.step = "1";
    custom.value = "4";
    const go = this.contentEl.createEl("button", { text: "Add" });
    go.style.margin = "4px";
    const submit = () => {
      const v = parseFloat(custom.value);
      if (v > 0) {
        this.close();
        this.onPick(v / this.servings);
      }
    };
    go.onclick = submit;
    custom.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    custom.focus();
    custom.select();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SinkCompletedTasksPlugin = class extends obsidian.Plugin {
  async onload() {
    this.pantry = /* @__PURE__ */ new Set();
    this.app.workspace.onLayoutReady(() => this.refreshPantry());
    this.registerEvent(this.app.vault.on("modify", (f) => {
      if (f.basename && f.basename.toLowerCase() === PANTRY_BASENAME) this.refreshPantry();
    }));
    this.registerDomEvent(document, "click", this.handleCheckboxClick.bind(this));
    this.addCommand({ id: "sink-completed-tasks-current-note", name: "Sink completed tasks to bottom (current note)", editorCallback: (e) => sinkAllBlocks(e) });
    this.addCommand({ id: "organize-shopping-list-by-section", name: "Organize shopping list by store section", editorCallback: (e) => organizeBySections(e, this.pantry) });
    this.addCommand({
      id: "clear-shopping-list",
      name: "Clear shopping list",
      editorCallback: (e) => {
        let first = -1, last = -1;
        for (let i = 0, n = e.lineCount(); i < n; i++) {
          const l = e.getLine(i);
          if (isTaskLine(l) || isManagedHeading(l)) {
            if (first < 0) first = i;
            last = i;
          }
        }
        if (first < 0) {
          new obsidian.Notice("Nothing to clear.");
          return;
        }
        e.replaceRange("", { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
        new obsidian.Notice("Shopping list cleared.");
      }
    });
    this.addCommand({
      id: "add-recipe-to-shopping-list",
      name: "Add this recipe to Shopping List (scaled)",
      checkCallback: (checking) => {
        const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const ok = v && v.file && /^#\s+ingredients\b/im.test(v.editor.getValue());
        if (checking) return !!ok;
        const text = v.editor.getValue();
        const sm = /^servings:\s*"?([^"\n]+)"?/im.exec(text);
        let servings = 4;
        if (sm && /^\d+(\.\d+)?\s*(servings?|serving|people|persons?)?\s*$/i.test(sm[1].trim())) servings = parseFloat(sm[1]);
        new ScaleModal(this.app, servings, (f) => this.addRecipeToList(text, f)).open();
        return true;
      }
    });
    this.addCommand({
      id: "toggle-pantry-ingredient",
      name: "Toggle pantry staple (current line)",
      editorCallback: async (e) => {
        const name = parseIngredient(e.getLine(e.getCursor().line)).name;
        if (!name) {
          new obsidian.Notice("No ingredient on this line.");
          return;
        }
        const res = await togglePantry(this.app, name);
        await this.refreshPantry();
        new obsidian.Notice(res === "added" ? "\u{1F96B} " + name + " is now a pantry staple" : "\u{1F6D2} " + name + " removed from pantry");
      }
    });
    this.registerMarkdownPostProcessor((el, ctx) => {
      const onList = ctx && ctx.sourcePath && /shopping list\.md$/i.test(ctx.sourcePath);
      el.querySelectorAll("li").forEach((li) => {
        const k = nameKey(parseIngredient("- " + (li.textContent || "")).name);
        if (k && this.pantry.has(k)) li.addClass(onList ? "scs-pantry-hide" : "scs-pantry");
      });
    });
    this.addCommand({
      id: "import-recipe-from-url",
      name: "Import recipe from URL",
      callback: () => new PromptModal(this.app, "Import recipe from URL", "https://\u2026/recipe", (url) => this.importRecipe(url)).open()
    });
    this.addCommand({
      id: "create-recipe-from-text",
      name: "Create recipe from pasted text",
      callback: () => new PasteModal(this.app, (txt) => this.createRecipeFromText(txt)).open()
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", this.maybeAutoOrganize.bind(this)));
  }
  maybeAutoOrganize() {
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v || !v.file || v.file.basename.toLowerCase() !== "shopping list") return;
      this.pruneAndOrganize(v.editor);
    }, 50);
  }
  async importRecipe(url) {
    new obsidian.Notice("Fetching recipe\u2026");
    let html;
    try {
      const res = await obsidian.requestUrl({
        url,
        method: "GET",
        throw: true,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": url
        }
      });
      html = res.text;
    } catch (e) {
      new obsidian.Notice("Fetch failed: " + (e.message || e));
      return;
    }
    let r = parseRecipe(html);
    let approx = false;
    if (!r || !r.ingredients.length) {
      const tm = /<title>([^<]*)/i.exec(html);
      const title = tm ? tm[1].replace(/&#8211;.*$/, "").replace(/\s*[-|].*$/, "").trim() : "Recipe";
      r = articleToRecipe(html, title);
      approx = true;
    }
    if (!r || !r.ingredients.length) {
      new obsidian.Notice('No recipe found on that page. Try the "Create recipe from pasted text" command.');
      return;
    }
    const dir = "Family/Meal Planning/Recipes";
    if (!this.app.vault.getAbstractFileByPath(dir)) {
      try {
        await this.app.vault.createFolder(dir);
      } catch (e) {
      }
    }
    let path = dir + "/" + sanitizeFilename(r.title) + ".md";
    if (this.app.vault.getAbstractFileByPath(path)) path = dir + "/" + sanitizeFilename(r.title) + " " + Date.now() + ".md";
    const file = await this.app.vault.create(path, recipeToNote(r, url));
    await this.app.workspace.getLeaf(false).openFile(file);
    new obsidian.Notice('Imported "' + r.title + '" (' + r.ingredients.length + " ingredients)." + (approx ? " Parsed from article text \u2014 please double-check." : ""));
  }
  async createRecipeFromText(text) {
    const r = parsePastedRecipe(text);
    if (!r.ingredients.length) {
      new obsidian.Notice("Could not find ingredients in the pasted text.");
      return;
    }
    const dir = "Family/Meal Planning/Recipes";
    if (!this.app.vault.getAbstractFileByPath(dir)) {
      try {
        await this.app.vault.createFolder(dir);
      } catch (e) {
      }
    }
    let path = dir + "/" + sanitizeFilename(r.title) + ".md";
    if (this.app.vault.getAbstractFileByPath(path)) path = dir + "/" + sanitizeFilename(r.title) + " " + Date.now() + ".md";
    const file = await this.app.vault.create(path, recipeToNote(r, ""));
    await this.app.workspace.getLeaf(false).openFile(file);
    new obsidian.Notice('Created "' + r.title + '" (' + r.ingredients.length + " ingredients, " + r.directions.length + " steps).");
  }
  async refreshPantry() {
    try {
      this.pantry = await pantrySet(this.app);
    } catch (e) {
      this.pantry = /* @__PURE__ */ new Set();
    }
    this.app.workspace.trigger("layout-change");
    const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (v && v.file && v.file.basename.toLowerCase() === "shopping list") this.pruneAndOrganize(v.editor);
  }
  pruneAndOrganize(e) {
    const tasks = [];
    for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) tasks.push(e.getLine(i));
    if (!tasks.length) return;
    const deduped = mergeShoppingItems(tasks, []);
    if (deduped.length !== tasks.length) this.replaceTaskRegion(e, deduped);
    try {
      organizeBySections(e, this.pantry);
    } catch (err) {
    }
  }
  replaceTaskRegion(e, lines) {
    const n = e.lineCount();
    let first = -1, last = -1;
    for (let i = 0; i < n; i++) {
      const l = e.getLine(i);
      if (isTaskLine(l) || isManagedHeading(l)) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0) {
      e.replaceRange((e.getValue().trim() ? "\n" : "") + lines.join("\n"), { line: n, ch: 0 });
    } else e.replaceRange(lines.join("\n"), { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
  }
  async addRecipeToList(recipeText, factor) {
    await this.refreshPantry();
    const additions = recipeIngredients(recipeText, factor, this.pantry);
    if (!additions.length) {
      new obsidian.Notice("No ingredients found (or all are pantry staples).");
      return;
    }
    const file = this.app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === "shopping list")[0];
    if (!file) {
      new obsidian.Notice('No "Shopping List" note found.');
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    await new Promise((r) => setTimeout(r, 200));
    const view = leaf.view instanceof obsidian.MarkdownView ? leaf.view : this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view || !view.editor) {
      new obsidian.Notice("Could not open Shopping List editor.");
      return;
    }
    const e = view.editor;
    const existing = [];
    for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) existing.push(e.getLine(i));
    this.replaceTaskRegion(e, mergeShoppingItems(existing, additions));
    this.pruneAndOrganize(e);
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
