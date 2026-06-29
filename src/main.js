'use strict';

const obsidian = require('obsidian');
const { isTaskLine, sinkAllBlocks, sinkAtLine } = require('./tasks');
const { isManagedHeading, organizeBySections } = require('./sections');
const { recipeIngredients, mergeShoppingItems, nameKey, parseIngredient, isStaple } = require('./recipe');
const { pantrySet, togglePantry, PANTRY_BASENAME } = require('./pantry');
const { parseRecipe, sanitizeFilename, recipeToNote } = require('./import');

const SCALE_OPTIONS = [2, 4, 6, 8, 12];

class PromptModal extends obsidian.Modal {
  constructor(app, title, placeholder, onPick) { super(app); this.t = title; this.ph = placeholder; this.onPick = onPick; }
  onOpen() {
    this.titleEl.setText(this.t);
    const input = this.contentEl.createEl('input', { type: 'text', placeholder: this.ph });
    input.style.width = '100%';
    const go = this.contentEl.createEl('button', { text: 'Import' });
    go.style.marginTop = '8px';
    const submit = () => { const v = input.value.trim(); if (v) { this.close(); this.onPick(v); } };
    go.onclick = submit;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    input.focus();
  }
  onClose() { this.contentEl.empty(); }
}

class ScaleModal extends obsidian.Modal {
  constructor(app, servings, onPick) { super(app); this.servings = servings || 4; this.onPick = onPick; }
  onOpen() {
    this.titleEl.setText('Add for how many people? (recipe serves ' + this.servings + ')');
    const row = this.contentEl.createDiv({ cls: 'scs-scale-row' });
    SCALE_OPTIONS.forEach((p) => {
      const b = row.createEl('button', { text: p === 4 ? '4 (default)' : String(p) });
      if (p === 4) b.classList.add('mod-cta');
      b.style.margin = '4px';
      b.onclick = () => { this.close(); this.onPick(p / this.servings); };
    });
    const custom = this.contentEl.createEl('input', { type: 'number', placeholder: 'people' });
    custom.min = '1'; custom.step = '1'; custom.value = '4';
    const go = this.contentEl.createEl('button', { text: 'Add' });
    go.style.margin = '4px';
    const submit = () => { const v = parseFloat(custom.value); if (v > 0) { this.close(); this.onPick(v / this.servings); } };
    go.onclick = submit;
    custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    custom.focus(); custom.select();
  }
  onClose() { this.contentEl.empty(); }
}

class SinkCompletedTasksPlugin extends obsidian.Plugin {
  async onload() {
    this.pantry = new Set();
    this.app.workspace.onLayoutReady(() => this.refreshPantry());
    this.registerEvent(this.app.vault.on('modify', (f) => { if (f.basename && f.basename.toLowerCase() === PANTRY_BASENAME) this.refreshPantry(); }));
    this.registerDomEvent(document, 'click', this.handleCheckboxClick.bind(this));
    this.addCommand({ id: 'sink-completed-tasks-current-note', name: 'Sink completed tasks to bottom (current note)', editorCallback: (e) => sinkAllBlocks(e) });
    this.addCommand({ id: 'organize-shopping-list-by-section', name: 'Organize shopping list by store section', editorCallback: (e) => organizeBySections(e, this.pantry) });
    this.addCommand({
      id: 'clear-shopping-list', name: 'Clear shopping list',
      editorCallback: (e) => {
        let first = -1, last = -1;
        for (let i = 0, n = e.lineCount(); i < n; i++) { const l = e.getLine(i); if (isTaskLine(l) || isManagedHeading(l)) { if (first < 0) first = i; last = i; } }
        if (first < 0) { new obsidian.Notice('Nothing to clear.'); return; }
        e.replaceRange('', { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
        new obsidian.Notice('Shopping list cleared.');
      }
    });
    this.addCommand({
      id: 'add-recipe-to-shopping-list', name: 'Add this recipe to Shopping List (scaled)',
      checkCallback: (checking) => {
        const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const ok = v && v.file && /^#\s+ingredients\b/im.test(v.editor.getValue());
        if (checking) return !!ok;
        const text = v.editor.getValue();
        const sm = /servings:\s*"?(\d+(?:\.\d+)?)/i.exec(text);
        const servings = sm ? parseFloat(sm[1]) : 4;
        new ScaleModal(this.app, servings, (f) => this.addRecipeToList(text, f)).open();
        return true;
      }
    });
    this.addCommand({
      id: 'toggle-pantry-ingredient', name: 'Toggle pantry staple (current line)',
      editorCallback: async (e) => {
        const name = parseIngredient(e.getLine(e.getCursor().line)).name;
        if (!name) { new obsidian.Notice('No ingredient on this line.'); return; }
        const res = await togglePantry(this.app, name);
        await this.refreshPantry();
        new obsidian.Notice(res === 'added' ? '🥫 ' + name + ' is now a pantry staple' : '🛒 ' + name + ' removed from pantry');
      }
    });
    this.registerMarkdownPostProcessor((el, ctx) => {
      const onList = ctx && ctx.sourcePath && /shopping list\.md$/i.test(ctx.sourcePath);
      el.querySelectorAll('li').forEach((li) => {
        const k = nameKey(parseIngredient('- ' + (li.textContent || '')).name);
        if (k && this.pantry.has(k)) li.addClass(onList ? 'scs-pantry-hide' : 'scs-pantry');
      });
    });
    this.addCommand({
      id: 'import-recipe-from-url', name: 'Import recipe from URL',
      callback: () => new PromptModal(this.app, 'Import recipe from URL', 'https://…/recipe', (url) => this.importRecipe(url)).open()
    });
    this.registerEvent(this.app.workspace.on('active-leaf-change', this.maybeAutoOrganize.bind(this)));
  }

  maybeAutoOrganize() {
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v || !v.file || v.file.basename.toLowerCase() !== 'shopping list') return;
      this.pruneAndOrganize(v.editor);
    }, 50);
  }

  async importRecipe(url) {
    new obsidian.Notice('Fetching recipe…');
    let html;
    try {
      const res = await obsidian.requestUrl({
        url, method: 'GET', throw: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': url
        }
      });
      html = res.text;
    } catch (e) { new obsidian.Notice('Fetch failed: ' + (e.message || e)); return; }
    const r = parseRecipe(html);
    if (!r || !r.ingredients.length) { new obsidian.Notice('No recipe (JSON-LD) found on that page.'); return; }
    const dir = 'Family/Meal Planning/Recipes';
    if (!this.app.vault.getAbstractFileByPath(dir)) { try { await this.app.vault.createFolder(dir); } catch (e) { /* exists */ } }
    let path = dir + '/' + sanitizeFilename(r.title) + '.md';
    if (this.app.vault.getAbstractFileByPath(path)) path = dir + '/' + sanitizeFilename(r.title) + ' ' + Date.now() + '.md';
    const file = await this.app.vault.create(path, recipeToNote(r, url));
    await this.app.workspace.getLeaf(false).openFile(file);
    new obsidian.Notice('Imported "' + r.title + '" (' + r.ingredients.length + ' ingredients).');
  }

  async refreshPantry() {
    try { this.pantry = await pantrySet(this.app); } catch (e) { this.pantry = new Set(); }
    this.app.workspace.trigger('layout-change'); // re-run reading-view dim
    const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView); // prune list live
    if (v && v.file && v.file.basename.toLowerCase() === 'shopping list') this.pruneAndOrganize(v.editor);
  }

  pruneAndOrganize(e) {
    const tasks = [];
    for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) tasks.push(e.getLine(i));
    if (!tasks.length) return;
    const deduped = mergeShoppingItems(tasks, []); // dedupe variants; pantry items stay (sunk + hidden)
    if (deduped.length !== tasks.length) this.replaceTaskRegion(e, deduped);
    try { organizeBySections(e, this.pantry); } catch (err) { /* noop */ }
  }

  replaceTaskRegion(e, lines) {
    const n = e.lineCount(); let first = -1, last = -1;
    for (let i = 0; i < n; i++) { const l = e.getLine(i); if (isTaskLine(l) || isManagedHeading(l)) { if (first < 0) first = i; last = i; } }
    if (first < 0) { e.replaceRange((e.getValue().trim() ? '\n' : '') + lines.join('\n'), { line: n, ch: 0 }); }
    else e.replaceRange(lines.join('\n'), { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
  }

  async addRecipeToList(recipeText, factor) {
    await this.refreshPantry();
    const additions = recipeIngredients(recipeText, factor, this.pantry);
    if (!additions.length) { new obsidian.Notice('No ingredients found (or all are pantry staples).'); return; }
    const file = this.app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === 'shopping list')[0];
    if (!file) { new obsidian.Notice('No "Shopping List" note found.'); return; }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    await new Promise((r) => setTimeout(r, 200));
    const view = leaf.view instanceof obsidian.MarkdownView ? leaf.view : this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view || !view.editor) { new obsidian.Notice('Could not open Shopping List editor.'); return; }
    const e = view.editor; const existing = [];
    for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) existing.push(e.getLine(i));
    this.replaceTaskRegion(e, mergeShoppingItems(existing, additions));
    this.pruneAndOrganize(e); // recombine all blocks + sections, dedupe, sink pantry
    new obsidian.Notice('Added ' + additions.length + ' ingredients (x' + factor + ').');
  }

  handleCheckboxClick(evt) {
    const t = evt.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains('task-list-item-checkbox')) return;
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v) return;
      const line = this.lineFromCheckbox(v.editor, t);
      if (line != null) { try { sinkAtLine(v.editor, line); } catch (e) { /* noop */ } }
    }, 0);
  }

  lineFromCheckbox(editor, target) {
    try {
      const cm = editor.cm;
      if (cm && typeof cm.posAtDOM === 'function') {
        const off = cm.posAtDOM(target);
        if (typeof off === 'number' && off >= 0) { const p = editor.offsetToPos(off); if (p) return p.line; }
      }
    } catch (e) { /* fall through */ }
    const dl = target.getAttribute('data-line');
    if (dl != null) { const n = parseInt(dl, 10); if (!isNaN(n)) return n; }
    return null;
  }
}

module.exports = SinkCompletedTasksPlugin;
