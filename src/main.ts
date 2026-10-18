import {
  Plugin,
  Notice,
  Modal,
  editorInfoField,
  MarkdownFileInfo,
  Editor,
} from "obsidian";
import { EditorView } from "@codemirror/view";
import { InlineStore, normalize } from "./model";
import {
  createSpatialExtension,
  floatAtCursor,
  toggleSpatial,
  SpatialHost,
  refreshSpatial,
} from "./spatial";

import { CanvsidianSettings, openPreferences } from "./plugin-settings";
import { importRaster, imageURL } from "./assets";

export default class Canvsidian extends Plugin implements SpatialHost {
  store: InlineStore = { version: 5, notes: {} };
  views = new Set<EditorView>();
  private dataReady = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  async onload() {
    try {
      this.store = normalize(await this.loadData());
    } catch (e) {
      new Notice(String(e));
      return;
    }
    this.dataReady = true;
    this.addSettingTab(new CanvsidianSettings(this.app, this, this));
    this.registerEditorExtension(createSpatialExtension(this));
    this.addCommand({
      id: "recover-interrupted-drafts",
      name: "Recover interrupted block drafts",
      callback: () => {
        const modal = new Modal(this.app);
        modal.titleEl.setText("Interrupted block drafts");
        const drafts = this.store.recoveryDrafts ?? [];
        if (!drafts.length)
          modal.contentEl.createEl("p", {
            text: "No interrupted drafts have been saved.",
          });
        for (const draft of drafts) {
          modal.contentEl.createEl("p", {
            text: draft.path + " · " + draft.savedAt,
          });
          const input = modal.contentEl.createEl("textarea");
          input.value = draft.text;
          input.dir = "auto";
          input.readOnly = true;
          input.style.width = "100%";
          input.style.minHeight = "120px";
          input.setAttribute("aria-label", "Recovered draft for " + draft.path);
        }
        modal.open();
      },
    });
    this.addCommand({
      id: "float-current-block",
      name: "Float this block in the current note",
      editorCheckCallback: (checking, editor, info) => {
        const view = this.findView(editor, info);
        if (!view) return false;
        if (!checking) floatAtCursor(view, this);
        return true;
      },
    });
    this.addCommand({
      id: "toggle-spatial-layout",
      name: "Show / hide spatial layout in this note",
      editorCheckCallback: (checking, editor, info) => {
        const view = this.findView(editor, info);
        if (!view) return false;
        if (!checking) toggleSpatial(view);
        return true;
      },
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        const view = this.findView(editor, info);
        if (view)
          menu.addItem((item) =>
            item
              .setTitle("Float this block here")
              .setIcon("move")
              .onClick(() => floatAtCursor(view, this)),
          );
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.store.notes[oldPath]) {
          this.store.notes[file.path] = this.store.notes[oldPath];
          delete this.store.notes[oldPath];
          this.scheduleSave();
        }
      }),
    );
  }
  refreshDesign() {
    for (const view of this.views) refreshSpatial(view);
  }
  openPreferences() {
    openPreferences(this.app, this);
  }
  importImage(file: File, path: string) {
    return importRaster(this.app, file, path);
  }
  imageURL(path: string) {
    return imageURL(this.app, path);
  }
  private findView(editor: Editor, _info: MarkdownFileInfo) {
    return [...this.views].find(
      (v) => v.state.field(editorInfoField, false)?.editor === editor,
    );
  }
  scheduleSave() {
    if (!this.dataReady) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, 350);
  }
  async flush() {
    if (!this.dataReady) return;
    const snapshot = JSON.parse(JSON.stringify(this.store));
    this.writes = this.writes
      .catch(() => {})
      .then(() => this.saveData(snapshot));
    try {
      await this.writes;
    } catch (e) {
      console.error(e);
      new Notice("Canvsidian could not save placement. Check vault storage.");
    }
  }
  onunload() {
    if (this.timer) clearTimeout(this.timer);
    void this.flush();
  }
  notify(message: string) {
    new Notice(message);
  }
}
