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
  addSettingTab(tab: any) {
    (window as any).settingTab = tab;
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
    (window as any).currentModal = this;
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
  svg.dataset.icon = name;
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const paths: Record<string, string> = {
    "mouse-pointer-2": "m4 3 7 18 2-8 8-2Z",
    "toggle-right":
      "M7 5h10a7 7 0 0 1 0 14H7A7 7 0 0 1 7 5Z M20 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
    "toggle-left":
      "M7 5h10a7 7 0 0 1 0 14H7A7 7 0 0 1 7 5Z M10 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
    plus: "M12 5v14 M5 12h14",
    workflow: "M3 3h6v6H3Z M15 15h6v6h-6Z M6 9v9h9 M9 6h9v9",
    ticket: "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z M15 5v3m0 3v2m0 3v3",
    "pen-tool": "m12 3 9 9-9 9-9-9Z M12 3v8 M14 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0",
    smile: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M8 14q4 5 8 0 M8 8v1 M16 8v1",
    pencil: "m16 3 5 5-13 13H3v-5Z M14 5l5 5",
    highlighter: "m15 3 6 6-9 9-6-6Z M6 12l-3 6 3 3 6-3 M2 22h8",
    square:
      "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z",
    circle: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0",
    minus: "M5 12h14",
    shapes: "M3 3h7v7H3Z M21 17a4 4 0 1 1-8 0 4 4 0 1 1 8 0 M15 3l6 7H9Z",
    tape: "M3 6l2-1-1 3 2 3-2 3 1 4 16-1-2-3 2-4-1-3Z",
    triangle: "m12 3 10 18H2Z",
    type: "M4 4h16 M12 4v16 M8 20h8",
    group: "M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5",
    table: "M3 3h18v18H3Z M3 9h18 M3 15h18 M9 3v18 M15 3v18",
    code: "m8 6-6 6 6 6 M16 6l6 6-6 6",
    copy: "M9 9h12v12H9Z M15 5V3H3v12h2",
    settings:
      "M12 8a4 4 0 1 1 0 8 4 4 0 1 1 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2",
    "image-plus": "M21 11V3H3v18h12 M3 17l6-6 7 7 M17 18h6 M20 15v6 M7 7h.01",
    "wand-sparkles": "m3 21 13-13 3 3L6 24Z M13 3v4 M11 5h4 M21 1v4 M19 3h4",
    "rotate-cw": "M21 4v6h-6 M21 10a9 9 0 1 0-2 8",
    search: "M10 3a7 7 0 1 1 0 14 7 7 0 1 1 0-14 M15 15l6 6",

    diamond: "m12 3 9 9-9 9-9-9Z",
    "arrow-up-right": "M7 17 17 7 M7 7h10v10",
    "sticky-note":
      "M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2Z M16 21v-5h5",
    tag: "M3 3h8l10 10-8 8L3 11Z M7 7h.01",
    stamp: "M5 21h14 M5 17v-2h4v-4a4 4 0 1 1 6 0v4h4v2Z",
    "settings-2": "M4 6h16 M4 18h16 M8 3v6 M16 15v6",
    x: "M6 6l12 12 M6 18 18 6",
    star: "m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.5l6.2-.9Z",
    heart:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    "thumbs-up": "M7 10v11H3V10Z M7 10l5-7h2v7h6l1 2-2 9H7",
    "circle-check": "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M8 12l3 3 5-6",
    lightbulb: "M9 18h6 M9 21h6 M9 15a7 7 0 1 1 6 0v3H9Z",
    "circle-help":
      "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 2 M12 17h.01",
    flame:
      "M12 3c1 5 6 5 6 10 0 4-3 8-7 8-5 0-8-4-6-9 1 2 3 2 3 2-1-5 3-7 4-11Z",
    sparkles: "m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z M20 2v4 M18 4h4",

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

export function getIconIds() {
  return [
    "star",
    "heart",
    "search",
    "circle",
    "square",
    "flame",
    "lightbulb",
    "thumbs-up",
    "sparkles",
    "arrow-up-right",
    "settings",
  ];
}
export class PluginSettingTab {
  containerEl = document.createElement("div");
  constructor(_app: any, _plugin: any) {}
}
export class Setting {
  settingEl: HTMLElement;
  private controls: HTMLElement;
  constructor(parent: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.settingEl.className = "setting-item";
    this.controls = document.createElement("div");
    parent.append(this.settingEl);
    this.settingEl.append(this.controls);
  }
  setName(name: string) {
    this.settingEl.setAttribute("data-name", name);
    const label = document.createElement("label");
    label.textContent = name;
    this.settingEl.prepend(label);
    return this;
  }
  setDesc(text: string) {
    const p = document.createElement("p");
    p.textContent = text;
    this.settingEl.append(p);
    return this;
  }
  addToggle(cb: any) {
    const el = document.createElement("input");
    el.type = "checkbox";
    el.setAttribute("aria-label", this.settingEl.dataset.name!);
    this.controls.append(el);
    const component = {
      setValue: (v: boolean) => {
        el.checked = v;
        return component;
      },
      onChange: (fn: any) => {
        el.onchange = () => fn(el.checked);
        return component;
      },
    };
    cb(component);
    return this;
  }
  addSlider(cb: any) {
    const el = document.createElement("input");
    el.type = "range";
    el.setAttribute("aria-label", this.settingEl.dataset.name!);
    this.controls.append(el);
    const c = {
      setLimits: (a: number, b: number, step: number) => {
        el.min = String(a);
        el.max = String(b);
        el.step = String(step);
        return c;
      },
      setValue: (v: number) => {
        el.value = String(v);
        return c;
      },
      setDynamicTooltip: () => c,
      onChange: (fn: any) => {
        el.onchange = () => fn(Number(el.value));
        return c;
      },
    };
    cb(c);
    return this;
  }
}

// Test stand-in for Obsidian Menu. Production imports the actual host API.
export class Menu {
  el = document.createElement("div");
  private callback = () => {};
  private controller = new AbortController();
  constructor() {
    this.el.className = "menu";
    this.el.setAttribute("role", "menu");
    (window as any).nativeMenuCalls =
      ((window as any).nativeMenuCalls ?? 0) + 1;
  }
  addItem(cb: (item: MenuItem) => void) {
    const item = new MenuItem(this);
    cb(item);
    this.el.append(item.el);
    return this;
  }
  addSeparator() {
    const e = document.createElement("div");
    e.className = "menu-separator";
    this.el.append(e);
    return this;
  }
  onHide(cb: () => void) {
    this.callback = cb;
  }
  showAtPosition(p: { x: number; y: number; left?: boolean }, doc = document) {
    doc.body.append(this.el);
    Object.assign(this.el.style, {
      position: "fixed",
      zIndex: "10000",
      width: "248px",
      maxHeight: "80vh",
      overflowY: "auto",
      background: "var(--background-primary)",
      color: "var(--text-normal)",
      border: "1px solid var(--background-modifier-border)",
      borderRadius: "6px",
      padding: "4px",
    });
    this.el.style.left =
      Math.max(0, Math.min(innerWidth - 248, p.left ? p.x - 248 : p.x)) + "px";
    this.el.style.top =
      Math.max(0, Math.min(innerHeight - this.el.offsetHeight, p.y)) + "px";
    doc.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.el.contains(e.target as Node)) this.hide();
      },
      { capture: true, signal: this.controller.signal },
    );
    this.el.onkeydown = (e) => {
      const items = [...this.el.querySelectorAll<HTMLButtonElement>("button")];
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      }
      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        items[
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? items.length - 1
              : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                items.length
        ]?.focus();
      }
    };
    this.el
      .querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    return this;
  }
  hide() {
    if (!this.el.isConnected) return this;
    this.el.remove();
    this.controller.abort();
    this.callback();
    return this;
  }
}
export class MenuItem {
  el = document.createElement("button");
  constructor(private menu: Menu) {
    this.el.className = "menu-item";
    this.el.setAttribute("role", "menuitem");
    Object.assign(this.el.style, {
      display: "flex",
      width: "100%",
      gap: "8px",
      padding: "6px",
      textAlign: "left",
      fontSize: "13px",
    });
  }
  setTitle(title: string) {
    this.el.textContent = title;
    return this;
  }
  setIcon(icon: string | null) {
    if (icon) {
      const e = document.createElement("span");
      setIcon(e, icon);
      e.style.cssText = "width:16px;height:16px;flex-shrink:0";
      this.el.prepend(e);
    }
    return this;
  }
  setWarning(value: boolean) {
    this.el.classList.toggle("is-warning", value);
    return this;
  }
  onClick(cb: () => void) {
    this.el.onclick = () => {
      this.menu.hide();
      cb();
    };
    return this;
  }
}
