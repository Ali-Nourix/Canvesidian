// Only Obsidian's host API is mocked. CodeMirror itself is real in this harness.
import { StateField, StateEffect } from "@codemirror/state";
export const changeMode = StateEffect.define<boolean>();
export const editorLivePreviewField = StateField.define<boolean>({
  create: () => true,
  update: (value, tr) => {
    for (const effect of tr.effects)
      if (effect.is(changeMode)) value = effect.value;
    return value;
  },
});
export const editorInfoField = StateField.define<any>({
  create: () => ({ file: { path: "Vision.md" }, editor: {} }),
  update: (value) => value,
});
export class Component {
  load() {}
  unload() {}
}
export class Notice {
  constructor(message: string) {
    (window as any).notices.push(message);
  }
}
export class Plugin {
  app: any;
  async loadData() {
    return (window as any).saved ?? null;
  }
  async saveData(data: any) {
    (window as any).saved = JSON.parse(JSON.stringify(data));
  }
  registerEditorExtension(extension: any) {
    (window as any).extension = extension;
  }
  addCommand(command: any) {
    (window as any).commands.push(command);
  }
  registerEvent() {}
}
export class TFile {}
export class Editor {}
export type MarkdownFileInfo = any;
export type App = any;
export class MarkdownRenderer {
  static async render(_app: any, text: string, el: HTMLElement) {
    if (/^```/.test(text)) {
      const p = document.createElement("pre");
      p.textContent = text.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "");
      el.append(p);
      return;
    }
    if (/^!\[.*?\]\(/.test(text)) {
      const p = document.createElement("p");
      p.textContent = "[ image block ]";
      el.append(p);
      return;
    }
    for (const block of text.split(/\n\n+/)) {
      const h = block.match(/^(#{1,6}) (.*)$/);
      const p = document.createElement(h ? "h" + h[1].length : "p");
      p.textContent = h ? h[2] : block;
      el.append(p);
    }
  }
}

export class Modal {
  titleEl = document.createElement("h2");
  contentEl = document.createElement("div");
  constructor(_app: any) {}
  open() {}
}
