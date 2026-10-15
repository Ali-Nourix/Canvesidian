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
  containerEl = document.createElement("div");
  constructor(_app: any) {
    this.containerEl.className = "test-modal-backdrop";
    this.containerEl.append(this.titleEl, this.contentEl);
  }
  open() {
    document.body.append(this.containerEl);
    (this as any).onOpen?.();
  }
  close() {
    (this as any).onClose?.();
    this.containerEl.remove();
  }
}
export function setIcon(el: HTMLElement, name: string) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const paths: Record<string, string> = {
    "mouse-pointer-2": "m4 3 7 18 2-8 8-2Z",
    pencil: "m16 3 5 5-13 13H3v-5Z M14 5l5 5",
    highlighter: "m15 3 6 6-9 9-6-6Z M6 12l-3 6 3 3 6-3 M2 22h8",
    square:
      "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z",
    circle: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0",
    minus: "M5 12h14",
    "undo-2": "m3 7 4-4 M3 7l4 4 M3 7h10a7 7 0 0 1 0 14",
    "redo-2": "m21 7-4-4 M21 7l-4 4 M21 7H11a7 7 0 0 0 0 14",
    "rotate-ccw": "M3 4v6h6 M3 10a9 9 0 1 1 2 8",
    move: "M12 3v18 M3 12h18 m-12-6 3-3 3 3 m-9 3-3 3 3 3 m3 3 3 3 3-3 m3-9 3 3-3 3",
    "corner-up-left": "m9 4-6 6 6 6 M3 10h12a6 6 0 0 1 6 6v4",
    "trash-2": "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
    check: "m4 12 5 5L20 6",
    palette:
      "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h2a4 4 0 0 0 4-4c0-4-4-6-9-6",
    "sliders-horizontal": "M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M8 15v6",
    "grip-vertical":
      "M9 4h.01 M9 12h.01 M9 20h.01 M15 4h.01 M15 12h.01 M15 20h.01",
  };
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", paths[name] ?? "M5 12h14");
  svg.append(path);
  el.replaceChildren(svg);
}
