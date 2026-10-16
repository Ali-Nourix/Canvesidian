/* Canvesidian — generated from src/. Run npm run build. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => Canvesidian
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/model.ts
var uid = () => globalThis.crypto.randomUUID();
function sections(source) {
  const cuts = [];
  const frontmatter = source.match(
    /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/
  )?.[0].length ?? 0;
  const seen = /* @__PURE__ */ new Map();
  let offset = 0;
  let fence = "";
  let fenceLength = 0;
  for (const line of source.split(/(?<=\n)/)) {
    if (offset < frontmatter) {
      offset += line.length;
      continue;
    }
    const f = line.match(/^ {0,3}(`{3,}|~{3,})(.*)/);
    if (f) {
      if (!fence) {
        fence = f[1][0];
        fenceLength = f[1].length;
      } else if (f[1][0] === fence && f[1].length >= fenceLength && !f[2].trim()) {
        fence = "";
      }
      offset += line.length;
      continue;
    }
    const h = !fence && line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*\r?\n?$/);
    if (h) {
      const title = h[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
      const key = `${h[1].length}:${title}`;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      cuts.push({ from: offset, title, key: `heading:${key}:${n}` });
    }
    offset += line.length;
  }
  if (!cuts.length || cuts[0].from > 0)
    cuts.unshift({ from: 0, title: "Opening", key: "preamble" });
  return cuts.map((cut, i) => ({
    id: cut.key,
    title: cut.title,
    from: cut.from,
    to: cuts[i + 1]?.from ?? source.length,
    markdown: source.slice(cut.from, cuts[i + 1]?.from ?? source.length)
  }));
}
function replaceSection(current, expected, section, replacement) {
  if (current !== expected)
    throw new Error(
      "This note changed. Reopen the section before saving. Your draft is still here."
    );
  const text = section.to < current.length && replacement && !replacement.endsWith("\n") ? replacement + "\n" : replacement;
  return current.slice(0, section.from) + text + current.slice(section.to);
}
function ensureTiles(board, parts) {
  parts.forEach((s, i) => {
    board.tiles[s.id] ??= {
      x: 48 + i * 400,
      y: 48,
      width: 360,
      annotations: []
    };
  });
}
var bounded = (n, min, max) => Math.min(max, Math.max(min, n));
function normalizeStore(raw) {
  const store = { version: 1, boards: {} };
  if (!raw || typeof raw !== "object") return store;
  const candidate = raw;
  if (candidate.version !== 1 || !candidate.boards || typeof candidate.boards !== "object")
    return store;
  for (const [path, board] of Object.entries(candidate.boards)) {
    if (!board?.tiles || typeof board.tiles !== "object") continue;
    const tiles = {};
    for (const [id, t] of Object.entries(board.tiles)) {
      if (!t || ![t.x, t.y, t.width].every(Number.isFinite)) continue;
      tiles[id] = {
        x: bounded(t.x, 0, 5e4),
        y: bounded(t.y, 0, 5e4),
        width: bounded(t.width, 240, 1200),
        annotations: Array.isArray(t.annotations) ? t.annotations.filter(
          (a) => a && typeof a.id === "string" && ["note", "sticker"].includes(a.kind) && typeof a.text === "string" && Number.isFinite(a.x) && Number.isFinite(a.y)
        ).map((a) => ({
          ...a,
          x: bounded(a.x, 0, 1200),
          y: bounded(a.y, 0, 5e3)
        })) : []
      };
    }
    store.boards[path] = { tiles };
  }
  return store;
}

// src/main.ts
var VIEW = "canvesidian-board";
var Canvesidian = class extends import_obsidian.Plugin {
  store = { version: 1, boards: {} };
  writeChain = Promise.resolve();
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
      }
    });
    this.addRibbonIcon("layout-dashboard", "Open Canvesidian board", () => {
      const f = this.app.workspace.getActiveFile();
      if (f?.extension === "md") void this.open(f);
      else new import_obsidian.Notice("Open a Markdown note first.");
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian.TFile && file.extension === "md")
          menu.addItem(
            (item) => item.setTitle("Open as Canvesidian board").setIcon("layout-dashboard").onClick(() => void this.open(file))
          );
      })
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
      })
    );
    this.registerEvent(
      this.app.vault.on(
        "modify",
        (file) => this.views().filter((v) => v.path === file.path).forEach((v) => void v.refresh())
      )
    );
    this.registerEvent(
      this.app.vault.on(
        "delete",
        (file) => this.views().filter((v) => v.path === file.path).forEach((v) => v.showMissing())
      )
    );
  }
  views() {
    return this.app.workspace.getLeavesOfType(VIEW).map((l) => l.view);
  }
  persist() {
    const snapshot = JSON.parse(JSON.stringify(this.store));
    this.writeChain = this.writeChain.catch(() => {
    }).then(() => this.saveData(snapshot));
    return this.writeChain.catch((e) => {
      console.error("Canvesidian save failed", e);
      new import_obsidian.Notice("Canvesidian could not save the layout. Check vault storage.");
    });
  }
  async open(file) {
    const existing = this.views().find((v) => v.path === file.path);
    if (existing) {
      await this.app.workspace.revealLeaf(existing.leaf);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW,
      state: { path: file.path },
      active: true
    });
    await this.app.workspace.revealLeaf(leaf);
  }
};
var TextDialog = class extends import_obsidian.Modal {
  constructor(owner, titleText, value, commit) {
    super(owner.app);
    this.owner = owner;
    this.titleText = titleText;
    this.value = value;
    this.commit = commit;
  }
  onOpen() {
    this.titleEl.setText(this.titleText);
    const field = this.contentEl.createEl("textarea", {
      cls: "cv-dialog-input"
    });
    field.value = this.value;
    field.dir = "auto";
    field.setAttribute("aria-label", this.titleText);
    const error = this.contentEl.createEl("p", { cls: "cv-error" });
    const save = this.contentEl.createEl("button", {
      text: "Save",
      cls: "mod-cta"
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
    this.contentEl.createEl("button", { text: "Cancel" }).onclick = () => this.close();
    field.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BoardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  path = "";
  source = "";
  parts = [];
  renderLife = null;
  generation = 0;
  cleanups = [];
  history = [];
  board;
  surface;
  world;
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return this.path ? `Canvesidian \xB7 ${this.path.split("/").pop()}` : "Canvesidian";
  }
  getIcon() {
    return "layout-dashboard";
  }
  getState() {
    return { path: this.path };
  }
  async setState(state, result) {
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
  release() {
    this.cleanups.splice(0).forEach((f) => f());
    this.renderLife?.unload();
    this.renderLife = null;
  }
  showMissing() {
    this.generation++;
    this.release();
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      text: "This note is no longer available. Layout data has been retained."
    });
  }
  checkpoint() {
    this.history.push(JSON.stringify(this.board));
    if (this.history.length > 40) this.history.shift();
  }
  save() {
    void this.plugin.persist();
  }
  button(parent, text, label, fn) {
    const b = parent.createEl("button", {
      text,
      attr: { "aria-label": label, title: label }
    });
    b.onclick = fn;
    return b;
  }
  async refresh() {
    const ticket = ++this.generation;
    const file = this.app.vault.getAbstractFileByPath(this.path);
    if (!(file instanceof import_obsidian.TFile)) {
      this.showMissing();
      return;
    }
    const source = await this.app.vault.read(file);
    if (ticket !== this.generation) return;
    const scroll = this.surface ? { x: this.surface.scrollLeft, y: this.surface.scrollTop } : { x: 0, y: 0 };
    this.release();
    this.source = source;
    this.parts = sections(source);
    this.board = this.plugin.store.boards[this.path] ??= { tiles: {} };
    ensureTiles(this.board, this.parts);
    this.contentEl.empty();
    this.renderLife = new import_obsidian.Component();
    this.renderLife.load();
    const life = this.renderLife;
    const toolbar = this.contentEl.createDiv("cv-toolbar");
    toolbar.createEl("strong", { text: file.basename });
    toolbar.createSpan({ text: "Freeform / Markdown intact", cls: "cv-muted" });
    this.button(
      toolbar,
      "Open source",
      "Open original Markdown",
      () => void this.app.workspace.getLeaf("tab").openFile(file)
    );
    this.button(
      toolbar,
      "Undo layout",
      "Undo last layout or annotation change",
      () => {
        const snapshot = this.history.pop();
        if (snapshot) {
          this.board = this.plugin.store.boards[this.path] = JSON.parse(snapshot);
          this.save();
          void this.refresh();
        }
      }
    );
    this.button(toolbar, "Tidy", "Arrange sections in a grid", () => {
      this.checkpoint();
      let y = 48;
      let rowHeight = 0;
      const cards = Array.from(
        this.world.querySelectorAll(".cv-card")
      );
      this.parts.forEach((s, i) => {
        if (i > 0 && i % 3 === 0) {
          y += rowHeight + 64;
          rowHeight = 0;
        }
        const tile = this.board.tiles[s.id];
        Object.assign(tile, { x: 48 + i % 3 * 400, y, width: 360 });
        rowHeight = Math.max(
          rowHeight,
          cards[i]?.offsetHeight ?? 360,
          ...Array.from(
            cards[i]?.querySelectorAll(".cv-attachment") ?? []
          ).map((a) => a.offsetTop + a.offsetHeight)
        );
      });
      this.save();
      void this.refresh();
    });
    this.button(
      toolbar,
      "Home",
      "Scroll to top left",
      () => this.surface.scrollTo({ left: 0, top: 0 })
    );
    const orphaned = Object.keys(this.board.tiles).filter(
      (k) => !this.parts.some((s) => s.id === k)
    );
    if (orphaned.length) {
      const message = this.contentEl.createDiv("cv-warning");
      message.createSpan({
        text: `${orphaned.length} detached layout(s): a heading may have been renamed. `
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
        }
      );
    }
    const hint = this.contentEl.createDiv({
      cls: "cv-hint",
      text: "Drag a section handle to place it. Drag attachments by their grip. Arrow keys move a focused grip (Shift = 10px). Layout is saved automatically."
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
        () => {
        }
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
            await this.app.vault.process(
              file,
              (current) => replaceSection(current, expected, part, text)
            );
            await this.refresh();
          }
        ).open();
      });
      this.button(
        bar,
        "\uFF0B",
        "Attach a note or emoji",
        () => new TextDialog(
          this.plugin,
          "Attachment (emoji or note)",
          "\u2B50",
          (text) => {
            if (!text.trim()) throw new Error("Enter an emoji or some text.");
            this.checkpoint();
            tile.annotations.push({
              id: uid(),
              kind: text.trim().length <= 8 ? "sticker" : "note",
              text: text.trim(),
              x: 24,
              y: card.offsetHeight + 16
            });
            this.save();
            void this.refresh();
          }
        ).open()
      );
      const body = card.createDiv("cv-markdown markdown-rendered");
      body.dir = "auto";
      await import_obsidian.MarkdownRenderer.render(
        this.app,
        part.markdown,
        body,
        file.path,
        life
      );
      if (ticket !== this.generation) return;
      for (const a of tile.annotations) this.attachment(card, a);
      const resize = this.button(
        card,
        "\u2194",
        "Resize section (arrow keys supported)",
        () => {
        }
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
  attachment(card, a) {
    const item = card.createDiv(`cv-attachment cv-${a.kind}`);
    item.style.left = `${a.x}px`;
    item.style.top = `${a.y}px`;
    const bar = item.createDiv("cv-attachment-bar");
    const grip = this.button(bar, "::", "Move attachment", () => {
    });
    grip.addClass("cv-grip");
    this.bindMove(grip, item, a);
    this.button(
      bar,
      "Edit",
      "Edit attachment",
      () => new TextDialog(this.plugin, "Edit attachment", a.text, (text) => {
        if (!text.trim()) throw new Error("Attachment cannot be empty.");
        this.checkpoint();
        a.text = text.trim();
        this.save();
        void this.refresh();
      }).open()
    );
    this.button(bar, "\xD7", "Remove attachment", () => {
      this.checkpoint();
      for (const tile of Object.values(this.board.tiles))
        tile.annotations = tile.annotations.filter((n) => n.id !== a.id);
      this.save();
      void this.refresh();
    });
    item.createDiv({ cls: "cv-attachment-text", text: a.text }).dir = "auto";
  }
  extent() {
    if (!this.world) return;
    let w = 1200, h = 800;
    for (const el of Array.from(
      this.world.querySelectorAll(".cv-card,.cv-attachment")
    )) {
      const parent = el.classList.contains("cv-attachment") ? el.parentElement : null;
      w = Math.max(
        w,
        el.offsetLeft + (parent?.offsetLeft ?? 0) + el.offsetWidth + 100
      );
      h = Math.max(
        h,
        el.offsetTop + (parent?.offsetTop ?? 0) + el.offsetHeight + 100
      );
    }
    this.world.style.width = `${w}px`;
    this.world.style.height = `${h}px`;
  }
  bindMove(handle, el, position) {
    this.bindGesture(
      handle,
      (dx, dy, initial) => {
        position.x = bounded(initial[0] + dx, 0, 5e4);
        position.y = bounded(initial[1] + dy, 0, 5e4);
        el.style.left = position.x + "px";
        el.style.top = position.y + "px";
        this.extent();
      },
      () => [position.x, position.y],
      (dx, dy) => {
        position.x = bounded(position.x + dx, 0, 5e4);
        position.y = bounded(position.y + dy, 0, 5e4);
        el.style.left = position.x + "px";
        el.style.top = position.y + "px";
        this.extent();
      }
    );
  }
  bindResize(handle, el, tile) {
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
      }
    );
  }
  bindGesture(handle, move, initial, key) {
    let active = null;
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
        scrollY: this.surface.scrollTop
      };
      handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove = (e) => {
      if (active?.id !== e.pointerId) return;
      move(
        e.clientX - active.x + this.surface.scrollLeft - active.scrollX,
        e.clientY - active.y + this.surface.scrollTop - active.scrollY,
        active.initial
      );
    };
    handle.onpointerup = finish;
    handle.onpointercancel = finish;
    handle.onlostpointercapture = finish;
    handle.onkeydown = (e) => {
      const d = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
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
};
