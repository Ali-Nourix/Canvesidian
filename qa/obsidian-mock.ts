// Local test double, NOT an Obsidian runtime or a shipping dependency.
function create(parent: HTMLElement, tag: string, options: any = {}) {
  if (typeof options === "string") options = { cls: options };
  const el = document.createElement(tag);
  if (options.cls) el.className = options.cls;
  if (options.text) el.textContent = options.text;
  for (const [k, v] of Object.entries(options.attr ?? {}))
    el.setAttribute(k, String(v));
  parent.append(el);
  return el;
}
Object.assign(HTMLElement.prototype, {
  createEl(this: HTMLElement, tag: string, o: any) {
    return create(this, tag, o);
  },
  createDiv(this: HTMLElement, o: any) {
    return create(this, "div", o);
  },
  createSpan(this: HTMLElement, o: any) {
    return create(this, "span", o);
  },
  empty(this: HTMLElement) {
    this.replaceChildren();
  },
  setText(this: HTMLElement, s: string) {
    this.textContent = s;
  },
  addClass(this: HTMLElement, s: string) {
    this.classList.add(s);
  },
});
export class Component {
  load() {}
  unload() {}
}
export class TFile {
  path = "Vision.md";
  extension = "md";
  basename = "Vision";
}
export class Notice {
  constructor(message: string) {
    console.log(message);
  }
}
export class ItemView {
  contentEl = document.querySelector("#app") as HTMLElement;
  app: any;
  constructor(public leaf: any) {
    this.app = leaf.app;
  }
  async setState() {}
}
export class WorkspaceLeaf {}
export class Plugin {
  app: any;
  async loadData() {
    return (window as any).saved ?? null;
  }
  async saveData(data: any) {
    (window as any).saved = data;
  }
  registerView(type: string, f: any) {
    this.app.factory = f;
  }
  addCommand() {}
  addRibbonIcon() {}
  registerEvent() {}
}
export class Modal {
  titleEl = document.createElement("h2");
  contentEl = document.createElement("div");
  el = document.createElement("dialog");
  constructor(public app: any) {
    this.el.append(this.titleEl, this.contentEl);
  }
  open() {
    document.body.append(this.el);
    (this as any).onOpen();
    this.el.showModal();
  }
  close() {
    this.el.close();
    this.el.remove();
    (this as any).onClose();
  }
}
export class MarkdownView {}
export class MarkdownRenderer {
  static async render(_app: any, text: string, el: HTMLElement) {
    for (const line of text.trim().split("\n")) {
      const h = line.match(/^(#{1,6}) (.*)$/);
      const item = document.createElement(h ? "h" + h[1].length : "p");
      item.textContent = h ? h[2] : line;
      el.append(item);
    }
  }
}
