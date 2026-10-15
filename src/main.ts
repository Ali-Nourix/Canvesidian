import {
  Plugin,
  ItemView,
  WorkspaceLeaf,
  TFile,
  MarkdownRenderer,
  Modal,
  Notice,
  Component,
} from "obsidian";
import {
  sections,
  replaceSection,
  ensureTiles,
  normalizeStore,
  bounded,
  uid,
  Board,
  Section,
  Tile,
  Annotation,
  Store,
} from "./model";
const VIEW = "canvesidian-board";

export default class Canvesidian extends Plugin {
  store: Store = { version: 1, boards: {} };
  private writeChain: Promise<void> = Promise.resolve();
  async onload() {
    this.store = normalizeStore(await this.loadData());
    this.registerView(VIEW, (leaf) => new BoardView(leaf, this));
    this.addCommand({
      id: "open-note-board",
      name: "Open current note as a freeform board",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) void this.open(file);
        return true;
      },
    });
    this.addRibbonIcon("layout-dashboard", "Open Canvesidian board", () => {
      const f = this.app.workspace.getActiveFile();
      if (f?.extension === "md") void this.open(f);
      else new Notice("Open a Markdown note first.");
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile && file.extension === "md")
          menu.addItem((item) =>
            item
              .setTitle("Open as Canvesidian board")
              .setIcon("layout-dashboard")
              .onClick(() => void this.open(file)),
          );
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, old) => {
        if (this.store.boards[old]) {
          this.store.boards[file.path] = this.store.boards[old];
          delete this.store.boards[old];
          void this.persist();
        }
        this.views().forEach((v) => {
          if (v.path === old) {
            v.path = file.path;
            void v.refresh();
          }
        });
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) =>
        this.views()
          .filter((v) => v.path === file.path)
          .forEach((v) => void v.refresh()),
      ),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) =>
        this.views()
          .filter((v) => v.path === file.path)
          .forEach((v) => v.showMissing()),
      ),
    );
  }
  views() {
    return this.app.workspace
      .getLeavesOfType(VIEW)
      .map((l) => l.view as BoardView);
  }
  persist() {
    const snapshot = JSON.parse(JSON.stringify(this.store));
    this.writeChain = this.writeChain
      .catch(() => {})
      .then(() => this.saveData(snapshot));
    return this.writeChain.catch((e) => {
      console.error("Canvesidian save failed", e);
      new Notice("Canvesidian could not save the layout. Check vault storage.");
    });
  }
  async open(file: TFile) {
    const existing = this.views().find((v) => v.path === file.path);
    if (existing) {
      await this.app.workspace.revealLeaf(existing.leaf);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW,
      state: { path: file.path },
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);
  }
}

class TextDialog extends Modal {
  constructor(
    private owner: Canvesidian,
    private titleText: string,
    private value: string,
    private commit: (value: string) => Promise<void> | void,
  ) {
    super(owner.app);
  }
  onOpen() {
    this.titleEl.setText(this.titleText);
    const field = this.contentEl.createEl("textarea", {
      cls: "cv-dialog-input",
    });
    field.value = this.value;
    field.dir = "auto";
    field.setAttribute("aria-label", this.titleText);
    const error = this.contentEl.createEl("p", { cls: "cv-error" });
    const save = this.contentEl.createEl("button", {
      text: "Save",
      cls: "mod-cta",
    });
    save.onclick = async () => {
      save.disabled = true;
      try {
        await this.commit(field.value);
        this.close();
      } catch (e) {
        error.setText(e instanceof Error ? e.message : String(e));
        save.disabled = false;
      }
    };
    this.contentEl.createEl("button", { text: "Cancel" }).onclick = () =>
      this.close();
    field.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
}

class BoardView extends ItemView {
  path = "";
  private source = "";
  private parts: Section[] = [];
  private renderLife: Component | null = null;
  private generation = 0;
  private cleanups: (() => void)[] = [];
  private history: string[] = [];
  private board!: Board;
  private surface!: HTMLElement;
  private world!: HTMLElement;
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: Canvesidian,
  ) {
    super(leaf);
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return this.path
      ? `Canvesidian · ${this.path.split("/").pop()}`
      : "Canvesidian";
  }
  getIcon() {
    return "layout-dashboard";
  }
  getState() {
    return { path: this.path };
  }
  async setState(state: { path?: string }, result: any) {
    if (this.path !== state.path) this.history = [];
    this.path = state.path ?? "";
    await this.refresh();
    await super.setState(state, result);
  }
  async onOpen() {
    this.contentEl.addClass("cv-view");
  }
  async onClose() {
    this.generation++;
    this.release();
    await this.plugin.persist();
  }
  private release() {
    this.cleanups.splice(0).forEach((f) => f());
    this.renderLife?.unload();
    this.renderLife = null;
  }
  showMissing() {
    this.generation++;
    this.release();
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      text: "This note is no longer available. Layout data has been retained.",
    });
  }
  private checkpoint() {
    this.history.push(JSON.stringify(this.board));
    if (this.history.length > 40) this.history.shift();
  }
  private save() {
    void this.plugin.persist();
  }
  private button(
    parent: HTMLElement,
    text: string,
    label: string,
    fn: () => void,
  ) {
    const b = parent.createEl("button", {
      text,
      attr: { "aria-label": label, title: label },
    });
    b.onclick = fn;
    return b;
  }
  async refresh() {
    const ticket = ++this.generation;
    const file = this.app.vault.getAbstractFileByPath(this.path);
    if (!(file instanceof TFile)) {
      this.showMissing();
      return;
    }
    const source = await this.app.vault.read(file);
    if (ticket !== this.generation) return;
    const scroll = this.surface
      ? { x: this.surface.scrollLeft, y: this.surface.scrollTop }
      : { x: 0, y: 0 };
    this.release();
    this.source = source;
    this.parts = sections(source);
    this.board = this.plugin.store.boards[this.path] ??= { tiles: {} };
    ensureTiles(this.board, this.parts);
    this.contentEl.empty();
    this.renderLife = new Component();
    this.renderLife.load();
    const life = this.renderLife;
    const toolbar = this.contentEl.createDiv("cv-toolbar");
    toolbar.createEl("strong", { text: file.basename });
    toolbar.createSpan({ text: "Freeform / Markdown intact", cls: "cv-muted" });
    this.button(
      toolbar,
      "Open source",
      "Open original Markdown",
      () => void this.app.workspace.getLeaf("tab").openFile(file),
    );
    this.button(
      toolbar,
      "Undo layout",
      "Undo last layout or annotation change",
      () => {
        const snapshot = this.history.pop();
        if (snapshot) {
          this.board = this.plugin.store.boards[this.path] =
            JSON.parse(snapshot);
          this.save();
          void this.refresh();
        }
      },
    );
    this.button(toolbar, "Tidy", "Arrange sections in a grid", () => {
      this.checkpoint();
      let y = 48;
      let rowHeight = 0;
      const cards = Array.from(
        this.world.querySelectorAll<HTMLElement>(".cv-card"),
      );
      this.parts.forEach((s, i) => {
        if (i > 0 && i % 3 === 0) {
          y += rowHeight + 64;
          rowHeight = 0;
        }
        const tile = this.board.tiles[s.id];
        Object.assign(tile, { x: 48 + (i % 3) * 400, y, width: 360 });
        rowHeight = Math.max(
          rowHeight,
          cards[i]?.offsetHeight ?? 360,
          ...Array.from(
            cards[i]?.querySelectorAll<HTMLElement>(".cv-attachment") ?? [],
          ).map((a) => a.offsetTop + a.offsetHeight),
        );
      });
      this.save();
      void this.refresh();
    });
    this.button(toolbar, "Home", "Scroll to top left", () =>
      this.surface.scrollTo({ left: 0, top: 0 }),
    );
    const orphaned = Object.keys(this.board.tiles).filter(
      (k) => !this.parts.some((s) => s.id === k),
    );
    if (orphaned.length) {
      const message = this.contentEl.createDiv("cv-warning");
      message.createSpan({
        text: `${orphaned.length} detached layout(s): a heading may have been renamed. `,
      });
      this.button(
        message,
        "Recover attachments",
        "Move detached attachments to the first section",
        () => {
          this.checkpoint();
          const first = this.board.tiles[this.parts[0].id];
          for (const id of orphaned) {
            first.annotations.push(...this.board.tiles[id].annotations);
            delete this.board.tiles[id];
          }
          this.save();
          void this.refresh();
        },
      );
    }
    const hint = this.contentEl.createDiv({
      cls: "cv-hint",
      text: "Drag a section handle to place it. Drag attachments by their grip. Arrow keys move a focused grip (Shift = 10px). Layout is saved automatically.",
    });
    hint.dir = "auto";
    this.surface = this.contentEl.createDiv("cv-surface");
    this.surface.tabIndex = 0;
    this.surface.setAttribute("aria-label", "Scrollable freeform note board");
    this.world = this.surface.createDiv("cv-world");
    for (const part of this.parts) {
      if (ticket !== this.generation) return;
      const tile = this.board.tiles[part.id];
      const card = this.world.createDiv("cv-card");
      card.style.left = `${tile.x}px`;
      card.style.top = `${tile.y}px`;
      card.style.width = `${tile.width}px`;
      const bar = card.createDiv("cv-card-bar");
      const grip = this.button(
        bar,
        "::",
        "Move section: " + part.title,
        () => {},
      );
      grip.addClass("cv-grip");
      bar.createSpan({ text: part.title, cls: "cv-card-title" });
      this.bindMove(grip, card, tile);
      this.button(bar, "Edit", "Edit section Markdown", () => {
        const expected = this.source;
        new TextDialog(
          this.plugin,
          "Edit section Markdown",
          part.markdown,
          async (text) => {
            await this.app.vault.process(file, (current) =>
              replaceSection(current, expected, part, text),
            );
            await this.refresh();
          },
        ).open();
      });
      this.button(bar, "＋", "Attach a note or emoji", () =>
        new TextDialog(
          this.plugin,
          "Attachment (emoji or note)",
          "⭐",
          (text) => {
            if (!text.trim()) throw new Error("Enter an emoji or some text.");
            this.checkpoint();
            tile.annotations.push({
              id: uid(),
              kind: text.trim().length <= 8 ? "sticker" : "note",
              text: text.trim(),
              x: 24,
              y: card.offsetHeight + 16,
            });
            this.save();
            void this.refresh();
          },
        ).open(),
      );
      const body = card.createDiv("cv-markdown markdown-rendered");
      body.dir = "auto";
      await MarkdownRenderer.render(
        this.app,
        part.markdown,
        body,
        file.path,
        life,
      );
      if (ticket !== this.generation) return;
      for (const a of tile.annotations) this.attachment(card, a);
      const resize = this.button(
        card,
        "↔",
        "Resize section (arrow keys supported)",
        () => {},
      );
      resize.addClass("cv-resize");
      this.bindResize(resize, card, tile);
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => this.extent());
        observer.observe(card);
        this.cleanups.push(() => observer.disconnect());
      }
    }
    this.extent();
    this.surface.scrollTo({ left: scroll.x, top: scroll.y });
    this.save();
  }
  private attachment(card: HTMLElement, a: Annotation) {
    const item = card.createDiv(`cv-attachment cv-${a.kind}`);
    item.style.left = `${a.x}px`;
    item.style.top = `${a.y}px`;
    const bar = item.createDiv("cv-attachment-bar");
    const grip = this.button(bar, "::", "Move attachment", () => {});
    grip.addClass("cv-grip");
    this.bindMove(grip, item, a);
    this.button(bar, "Edit", "Edit attachment", () =>
      new TextDialog(this.plugin, "Edit attachment", a.text, (text) => {
        if (!text.trim()) throw new Error("Attachment cannot be empty.");
        this.checkpoint();
        a.text = text.trim();
        this.save();
        void this.refresh();
      }).open(),
    );
    this.button(bar, "×", "Remove attachment", () => {
      this.checkpoint();
      for (const tile of Object.values(this.board.tiles))
        tile.annotations = tile.annotations.filter((n) => n.id !== a.id);
      this.save();
      void this.refresh();
    });
    item.createDiv({ cls: "cv-attachment-text", text: a.text }).dir = "auto";
  }
  private extent() {
    if (!this.world) return;
    let w = 1200,
      h = 800;
    for (const el of Array.from(
      this.world.querySelectorAll<HTMLElement>(".cv-card,.cv-attachment"),
    )) {
      const parent = el.classList.contains("cv-attachment")
        ? el.parentElement
        : null;
      w = Math.max(
        w,
        el.offsetLeft + (parent?.offsetLeft ?? 0) + el.offsetWidth + 100,
      );
      h = Math.max(
        h,
        el.offsetTop + (parent?.offsetTop ?? 0) + el.offsetHeight + 100,
      );
    }
    this.world.style.width = `${w}px`;
    this.world.style.height = `${h}px`;
  }
  private bindMove(
    handle: HTMLElement,
    el: HTMLElement,
    position: { x: number; y: number },
  ) {
    this.bindGesture(
      handle,
      (dx, dy, initial) => {
        position.x = bounded(initial[0] + dx, 0, 50000);
        position.y = bounded(initial[1] + dy, 0, 50000);
        el.style.left = position.x + "px";
        el.style.top = position.y + "px";
        this.extent();
      },
      () => [position.x, position.y],
      (dx, dy) => {
        position.x = bounded(position.x + dx, 0, 50000);
        position.y = bounded(position.y + dy, 0, 50000);
        el.style.left = position.x + "px";
        el.style.top = position.y + "px";
        this.extent();
      },
    );
  }
  private bindResize(handle: HTMLElement, el: HTMLElement, tile: Tile) {
    this.bindGesture(
      handle,
      (dx, _dy, initial) => {
        tile.width = bounded(initial[0] + dx, 240, 1200);
        el.style.width = tile.width + "px";
        this.extent();
      },
      () => [tile.width, 0],
      (dx) => {
        tile.width = bounded(tile.width + dx, 240, 1200);
        el.style.width = tile.width + "px";
        this.extent();
      },
    );
  }
  private bindGesture(
    handle: HTMLElement,
    move: (dx: number, dy: number, initial: number[]) => void,
    initial: () => number[],
    key: (dx: number, dy: number) => void,
  ) {
    let active: {
      id: number;
      x: number;
      y: number;
      initial: number[];
      scrollX: number;
      scrollY: number;
    } | null = null;
    const finish = () => {
      if (!active) return;
      active = null;
      this.save();
    };
    handle.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.checkpoint();
      handle.focus();
      active = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        initial: initial(),
        scrollX: this.surface.scrollLeft,
        scrollY: this.surface.scrollTop,
      };
      handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove = (e) => {
      if (active?.id !== e.pointerId) return;
      move(
        e.clientX - active.x + this.surface.scrollLeft - active.scrollX,
        e.clientY - active.y + this.surface.scrollTop - active.scrollY,
        active.initial,
      );
    };
    handle.onpointerup = finish;
    handle.onpointercancel = finish;
    handle.onlostpointercapture = finish;
    handle.onkeydown = (e) => {
      const d: Record<string, number[]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (!d[e.key]) return;
      e.preventDefault();
      this.checkpoint();
      const n = e.shiftKey ? 10 : 1;
      key(d[e.key][0] * n, d[e.key][1] * n);
      this.save();
    };
    this.cleanups.push(finish);
  }
}
