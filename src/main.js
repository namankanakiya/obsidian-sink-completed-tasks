'use strict';

const obsidian = require('obsidian');
const { isTaskLine, sinkAllBlocks, sinkAtLine } = require('./tasks');
const { isManagedHeading, organizeBySections } = require('./sections');
const { recipeIngredients, mergeShoppingItems } = require('./recipe');

const SCALE_OPTIONS = [0.5, 1, 1.5, 2, 3, 4];

class ScaleModal extends obsidian.Modal {
  constructor(app, onPick) { super(app); this.onPick = onPick; }
  onOpen() {
    this.titleEl.setText('Scale recipe by…');
    const row = this.contentEl.createDiv({ cls: 'scs-scale-row' });
    SCALE_OPTIONS.forEach((f) => {
      const b = row.createEl('button', { text: 'x' + f });
      b.style.margin = '4px';
      b.onclick = () => { this.close(); this.onPick(f); };
    });
    const custom = this.contentEl.createEl('input', { type: 'number', placeholder: 'custom' });
    custom.min = '0.1'; custom.step = '0.1';
    const go = this.contentEl.createEl('button', { text: 'Add' });
    go.style.margin = '4px';
    go.onclick = () => { const v = parseFloat(custom.value); if (v > 0) { this.close(); this.onPick(v); } };
  }
  onClose() { this.contentEl.empty(); }
}

class SinkCompletedTasksPlugin extends obsidian.Plugin {
  async onload() {
    this.registerDomEvent(document, 'click', this.handleCheckboxClick.bind(this));
    this.addCommand({ id: 'sink-completed-tasks-current-note', name: 'Sink completed tasks to bottom (current note)', editorCallback: (e) => sinkAllBlocks(e) });
    this.addCommand({ id: 'organize-shopping-list-by-section', name: 'Organize shopping list by store section', editorCallback: (e) => organizeBySections(e) });
    this.addCommand({
      id: 'add-recipe-to-shopping-list', name: 'Add this recipe to Shopping List (scaled)',
      checkCallback: (checking) => {
        const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const ok = v && v.file && /^#\s+ingredients\b/im.test(v.editor.getValue());
        if (checking) return !!ok;
        if (ok) new ScaleModal(this.app, (f) => this.addRecipeToList(v.editor.getValue(), f)).open();
        return true;
      }
    });
    this.registerEvent(this.app.workspace.on('active-leaf-change', this.maybeAutoOrganize.bind(this)));
  }

  maybeAutoOrganize() {
    setTimeout(() => {
      const v = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!v || !v.file || v.file.basename.toLowerCase() !== 'shopping list') return;
      const e = v.editor; let hasTask = false;
      for (let i = 0, n = e.lineCount(); i < n; i++) if (isTaskLine(e.getLine(i))) { hasTask = true; break; }
      if (hasTask) { try { organizeBySections(e); } catch (err) { /* noop */ } }
    }, 50);
  }

  async addRecipeToList(recipeText, factor) {
    const additions = recipeIngredients(recipeText, factor);
    if (!additions.length) { new obsidian.Notice('No ingredients found under "# Ingredients".'); return; }
    const file = this.app.vault.getMarkdownFiles().filter((f) => f.basename.toLowerCase() === 'shopping list')[0];
    if (!file) { new obsidian.Notice('No "Shopping List" note found.'); return; }
    await this.app.workspace.getLeaf(false).openFile(file);
    const e = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView).editor;
    const n = e.lineCount(); const existing = [];
    for (let i = 0; i < n; i++) if (isTaskLine(e.getLine(i))) existing.push(e.getLine(i));
    const merged = mergeShoppingItems(existing, additions);
    if (existing.length) {
      let first = -1, last = -1;
      for (let i = 0; i < n; i++) { const l = e.getLine(i); if (isTaskLine(l) || isManagedHeading(l)) { if (first < 0) first = i; last = i; } }
      e.replaceRange(merged.join('\n'), { line: first, ch: 0 }, { line: last, ch: e.getLine(last).length });
    } else {
      e.replaceRange((e.getValue().trim() ? '\n' : '') + merged.join('\n'), { line: n, ch: 0 });
    }
    organizeBySections(e);
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
