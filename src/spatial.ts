import {
  StateEffect,
  Prec,
  StateField,
  Transaction,
  Extension,
} from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import {
  Component,
  MarkdownRenderer,
  editorInfoField,
  editorLivePreviewField,
  App,
} from "obsidian";
import {
  Pin,
  SavedPin,
  InlineStore,
  blockAt,
  blocks,
  capture,
  restore,
  limit,
} from "./model";

export interface SpatialHost {
  app: App;
  store: InlineStore;
  views: Set<EditorView>;
  scheduleSave(): void;
  notify(message: string): void;
}
interface SpatialState {
  path: string;
  enabled: boolean;
  live: boolean;
  pins: Pin[];
  detached: SavedPin[];
  decorations: DecorationSet;
}
type Action =
  | { type: "add"; pin: Pin }
  | { type: "remove"; id: string }
  | {
      type: "place";
      id: string;
      placement: Partial<Pick<Pin, "x" | "y" | "width" | "height">>;
    }
  | { type: "toggle" };
const action = StateEffect.define<Action>();
// Each host owns its field; a WeakMap keeps public test/command helpers independent of private Obsidian APIs.
const fields = new WeakMap<EditorView, StateField<SpatialState>>();
const live = (state: any) =>
  state.field(editorLivePreviewField, false) === true;
const pathOf = (state: any) =>
  state.field(editorInfoField, false)?.file?.path ?? "";
class Hidden extends WidgetType {
  toDOM() {
    const el = document.createElement("span");
    el.className = "cv-source-placeholder";
    el.setAttribute("aria-hidden", "true");
    return el;
  }
  get estimatedHeight() {
    return 0;
  }
  ignoreEvent() {
    return true;
  }
}
class Space extends WidgetType {
  constructor(private height: number) {
    super();
  }
  eq(other: Space) {
    return this.height === other.height;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "cv-space";
    el.style.height = this.height + "px";
    el.setAttribute("aria-hidden", "true");
    return el;
  }
  get estimatedHeight() {
    return this.height;
  }
  ignoreEvent() {
    return true;
  }
}
function decorate(value: SpatialState, length: number) {
  if (!value.enabled || !value.live || !value.pins.length)
    return Decoration.none;
  const ranges = value.pins.map((p) =>
    Decoration.replace({ block: true, widget: new Hidden() }).range(
      p.from,
      p.to,
    ),
  );
  const reserve = Math.max(800, ...value.pins.map((p) => p.y + p.height + 120));
  ranges.push(
    Decoration.widget({
      block: true,
      side: 1,
      widget: new Space(reserve),
    }).range(length),
  );
  return Decoration.set(ranges, true);
}
export function createSpatialExtension(host: SpatialHost): Extension {
  const field = StateField.define<SpatialState>({
    create(state) {
      const path = pathOf(state);
      const saved = host.store.notes[path];
      const restored = restore(saved?.pins ?? [], state.doc.toString());
      const value: SpatialState = {
        path,
        enabled: saved?.enabled ?? true,
        live: live(state),
        ...restored,
        decorations: Decoration.none,
      };
      value.decorations = decorate(value, state.doc.length);
      return value;
    },
    update(old, tr) {
      let value: SpatialState = {
        ...old,
        pins: old.pins,
        live: live(tr.state),
      };
      const path = pathOf(tr.state);
      if (path !== old.path) {
        const saved = host.store.notes[path];
        value = {
          ...value,
          path,
          enabled: saved?.enabled ?? true,
          ...restore(saved?.pins ?? [], tr.state.doc.toString()),
        };
      } else if (tr.docChanged) {
        const next: Pin[] = [];
        const uncertain: SavedPin[] = [];
        for (const p of old.pins) {
          let crossesBoundary = false;
          tr.changes.iterChangedRanges((a, b) => {
            if (a < p.to && b > p.from && (a < p.from || b > p.to))
              crossesBoundary = true;
          });
          if (crossesBoundary) {
            uncertain.push(capture(p, tr.startState.doc.toString()));
            continue;
          }
          const from = tr.changes.mapPos(p.from, -1);
          const to = tr.changes.mapPos(p.to, 1);
          if (to > from)
            next.push({
              ...p,
              from,
              to,
              text: tr.state.doc.sliceString(from, to),
            });
        }
        const resolved = restore(uncertain, tr.state.doc.toString());
        for (const p of resolved.pins) {
          if (!next.some((n) => p.from < n.to && p.to > n.from)) next.push(p);
          else resolved.detached.push(capture(p, tr.state.doc.toString()));
        }
        value.pins = next;
        value.detached = [...old.detached, ...resolved.detached];
      }
      for (const effect of tr.effects) {
        if (!effect.is(action)) continue;
        const a = effect.value;
        if (
          a.type === "add" &&
          !value.pins.some((p) => a.pin.from < p.to && a.pin.to > p.from)
        )
          value = { ...value, enabled: true, pins: [...value.pins, a.pin] };
        if (a.type === "remove")
          value = { ...value, pins: value.pins.filter((p) => p.id !== a.id) };
        if (a.type === "place")
          value = {
            ...value,
            pins: value.pins.map((p) =>
              p.id === a.id ? { ...p, ...a.placement } : p,
            ),
          };
        if (a.type === "toggle") value = { ...value, enabled: !value.enabled };
      }
      if (
        tr.docChanged ||
        tr.effects.some((e) => e.is(action)) ||
        path !== old.path ||
        value.live !== old.live
      )
        value.decorations = decorate(value, tr.state.doc.length);
      return value;
    },
    provide: (f) => [
      EditorView.decorations.from(f, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => {
        const v = view.state.field(f);
        if (!v.enabled || !v.live) return Decoration.none;
        return Decoration.set(
          v.pins.map((p) => Decoration.replace({}).range(p.from, p.to)),
          true,
        );
      }),
    ],
  });
  const plugin = ViewPlugin.fromClass(
    class {
      layer: HTMLElement;
      handle: HTMLButtonElement;
      cards = new Map<string, FloatingBlock>();
      hoverPos: number | null = null;
      destroyed = false;
      private parsedDoc: unknown = null;
      private parsedBlocks: ReturnType<typeof blocks> = [];
      constructor(public view: EditorView) {
        fields.set(view, field);
        host.views.add(view);
        view.scrollDOM.classList.add("cv-spatial-scroller");
        this.layer = document.createElement("div");
        this.layer.className = "cv-spatial-layer";
        this.layer.contentEditable = "false";
        view.scrollDOM.append(this.layer);
        this.handle = document.createElement("button");
        this.handle.className = "cv-float-handle";
        this.handle.textContent = "::";
        this.handle.title = "Drag this block out of the text flow";
        this.handle.setAttribute("aria-label", "Float block under pointer");
        this.layer.append(this.handle);
        this.handle.hidden = true;
        this.handle.onpointerdown = (e) => {
          if (e.button !== 0 || this.hoverPos === null) return;
          e.preventDefault();
          e.stopPropagation();
          const pin = floatAt(view, host, this.hoverPos);
          if (pin) {
            const card = this.cards.get(pin.id);
            card?.beginDrag(e, true);
          }
        };
        this.handle.onclick = () => {
          if (this.hoverPos !== null) floatAt(view, host, this.hoverPos);
        };
        this.sync(true);
      }
      update(update: ViewUpdate) {
        const before = update.startState.field(field);
        const next = update.state.field(field);
        if (before !== next) {
          this.sync(false);
          if (
            update.docChanged ||
            before.pins !== next.pins ||
            before.enabled !== next.enabled ||
            before.path !== next.path
          )
            this.persist();
        }
        if (update.docChanged || update.viewportChanged)
          this.handle.hidden = true;
      }
      sync(initial: boolean) {
        const state = this.view.state.field(field);
        const shown = state.enabled && state.live && !!state.path;
        this.layer.hidden = !shown;
        for (const [id, card] of this.cards)
          if (!shown || !state.pins.some((p) => p.id === id)) {
            card.destroy();
            this.cards.delete(id);
          }
        if (shown)
          for (const pin of state.pins) {
            let card = this.cards.get(pin.id);
            if (!card) {
              card = new FloatingBlock(this.view, host, pin, this.layer, () =>
                this.persist(),
              );
              this.cards.set(pin.id, card);
            }
            card.update(pin);
          }
        if (initial && state.detached.length)
          host.notify(
            `${state.detached.length} Canvesidian placement(s) could not be matched safely. Their text remains visible; saved placement has been retained.`,
          );
      }
      persist() {
        const state = this.view.state.field(field);
        if (!state.path) return;
        const source = this.view.state.doc.toString();
        host.store.notes[state.path] = {
          enabled: state.enabled,
          pins: [
            ...state.pins.map((p) => capture(p, source)),
            ...state.detached,
          ],
        };
        host.scheduleSave();
      }
      hover(event: MouseEvent) {
        const state = this.view.state.field(field);
        if (!state.enabled || !state.live) return;
        if (
          !(event.target instanceof HTMLElement) ||
          !event.target.closest(".cm-content") ||
          event.target.closest(".cv-spatial-layer")
        )
          return;
        const pos = this.view.posAtCoords({
          x: event.clientX,
          y: event.clientY,
        });
        if (pos === null) return;
        if (this.parsedDoc !== this.view.state.doc) {
          this.parsedDoc = this.view.state.doc;
          this.parsedBlocks = blocks(this.view.state.doc.toString());
        }
        const block = this.parsedBlocks.find(
          (b) => b.from <= pos && pos <= b.to,
        );
        if (
          !block ||
          state.pins.some((p) => block.from < p.to && block.to > p.from)
        ) {
          this.handle.hidden = true;
          return;
        }
        const coords = this.view.coordsAtPos(block.from);
        if (!coords) return;
        const rect = this.view.scrollDOM.getBoundingClientRect();
        this.hoverPos = pos;
        this.handle.style.left =
          Math.max(
            4,
            coords.left - rect.left + this.view.scrollDOM.scrollLeft - 36,
          ) + "px";
        this.handle.style.top =
          coords.top - rect.top + this.view.scrollDOM.scrollTop + "px";
        this.handle.hidden = false;
      }
      destroy() {
        this.destroyed = true;
        this.persist();
        this.cards.forEach((c) => c.destroy());
        this.cards.clear();
        this.layer.remove();
        this.view.scrollDOM.classList.remove("cv-spatial-scroller");
        host.views.delete(this.view);
        fields.delete(this.view);
      }
    },
    {
      eventHandlers: {
        mousemove(event) {
          this.hover(event);
        },
      },
    },
  );
  return [Prec.high(field), plugin];
}
export function toggleSpatial(view: EditorView) {
  if (fields.has(view))
    view.dispatch({ effects: action.of({ type: "toggle" }) });
}
export function floatAtCursor(view: EditorView, host: SpatialHost) {
  return floatAt(view, host, view.state.selection.main.head);
}
export function floatAt(
  view: EditorView,
  host: SpatialHost,
  pos: number,
): Pin | undefined {
  const field = fields.get(view);
  if (!field) return;
  const state = view.state.field(field);
  if (!state.live) {
    host.notify(
      "Switch this note to Live Preview to place blocks. Source mode always shows the original Markdown.",
    );
    return;
  }
  if (!state.path) {
    host.notify("Save this note before placing blocks.");
    return;
  }
  const block = blockAt(view.state.doc.toString(), pos);
  if (!block) return;
  if (state.pins.some((p) => block.from < p.to && block.to > p.from)) {
    host.notify("This block is already floating.");
    return;
  }
  // Frontmatter and complete top-level blocks only; no partial table/list capture.
  const rect = view.scrollDOM.getBoundingClientRect();
  const at = view.coordsAtPos(block.from);
  const content = view.contentDOM.getBoundingClientRect();
  const width = limit(Math.min(content.width - 32, 420), 200, 1200);
  const rightMargin =
    content.right - rect.left + view.scrollDOM.scrollLeft + 32;
  const hasMargin =
    rightMargin + width <= view.scrollDOM.scrollLeft + rect.width - 16;
  const bottom =
    view.coordsAtPos(view.state.doc.length)?.bottom ?? at?.bottom ?? rect.top;
  const pin: Pin = {
    ...block,
    id: crypto.randomUUID(),
    x: limit(
      hasMargin
        ? rightMargin
        : Math.max(16, content.left - rect.left + view.scrollDOM.scrollLeft),
      8,
      50000,
    ),
    y: limit(
      (hasMargin ? (at?.top ?? rect.top) : bottom + 32) -
        rect.top +
        view.scrollDOM.scrollTop,
      8,
      50000,
    ),
    width,
    height: 180,
  };
  // Command-created blocks start in a free margin, or below the ordinary text.
  // Dragging from the native hover grip immediately aligns the block to the pointer instead.
  for (let pass = 0; pass < state.pins.length + 1; pass++) {
    const overlap = state.pins.find(
      (p) =>
        pin.x < p.x + p.width + 16 &&
        pin.x + pin.width + 16 > p.x &&
        pin.y < p.y + p.height + 24 &&
        pin.y + pin.height + 24 > p.y,
    );
    if (!overlap) break;
    pin.y = limit(overlap.y + overlap.height + 24, 8, 50000);
  }
  view.dispatch({ effects: action.of({ type: "add", pin }) });
  return pin;
}
class FloatingBlock {
  root: HTMLElement;
  body: HTMLElement;
  grip: HTMLButtonElement;
  resize: HTMLButtonElement;
  textarea: HTMLTextAreaElement | null = null;
  pin: Pin;
  private life: Component | null = null;
  private generation = 0;
  private lastText: string | null = null;
  private composing = false;
  private draftBase = "";
  private path = "";
  private conflictWarned = false;
  private cleanupDrag: (() => void) | null = null;
  private observer: ResizeObserver;
  private sizeFrame = 0;
  constructor(
    private view: EditorView,
    private host: SpatialHost,
    pin: Pin,
    parent: HTMLElement,
    private persist: () => void,
  ) {
    this.pin = pin;
    this.path = this.view.state.field(fields.get(this.view)!).path;
    this.root = document.createElement("article");
    this.root.className = "cv-floating-block";
    this.root.setAttribute("aria-label", "Floating block in this note");
    this.root.contentEditable = "false";
    parent.append(this.root);
    const toolbar = document.createElement("div");
    toolbar.className = "cv-floating-toolbar";
    this.root.append(toolbar);
    this.grip = this.button(toolbar, "::", "Move this block", () => {});
    this.grip.className = "cv-block-grip";
    this.grip.onpointerdown = (e) => this.beginDrag(e);
    this.grip.onkeydown = (e) => this.nudge(e, false);
    this.button(toolbar, "Edit", "Edit text in place", () => this.edit());
    this.button(toolbar, "Return", "Return block to normal text flow", () => {
      const from = this.pin.from;
      this.dispatch({ type: "remove", id: this.pin.id });
      this.view.dispatch({
        selection: { anchor: Math.min(from, this.view.state.doc.length) },
        scrollIntoView: true,
      });
      this.view.focus();
    });
    this.body = document.createElement("div");
    this.body.className = "cv-floating-body markdown-rendered";
    this.body.dir = "auto";
    this.body.ondblclick = () => this.edit();
    this.root.append(this.body);
    this.resize = this.button(this.root, "↔", "Resize block", () => {});
    this.resize.className = "cv-block-resize";
    this.resize.onpointerdown = (e) => this.drag(e, true);
    this.resize.onkeydown = (e) => this.nudge(e, true);
    this.root.addEventListener("keydown", (e) => e.stopPropagation());
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.root.addEventListener("mousedown", (e) => e.stopPropagation());
    this.root.addEventListener("input", (e) => e.stopPropagation());
    this.observer = new ResizeObserver(() => {
      const height = Math.ceil(this.root.getBoundingClientRect().height);
      if (Math.abs(height - this.pin.height) > 2 && height > 0) {
        cancelAnimationFrame(this.sizeFrame);
        this.sizeFrame = requestAnimationFrame(() => {
          if (this.root.isConnected)
            this.dispatch({
              type: "place",
              id: this.pin.id,
              placement: { height },
            });
        });
      }
    });
    this.observer.observe(this.root);
  }
  private button(
    parent: HTMLElement,
    text: string,
    label: string,
    fn: () => void,
  ) {
    const button = document.createElement("button");
    button.textContent = text;
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.onclick = fn;
    parent.append(button);
    return button;
  }
  private dispatch(a: Action) {
    this.view.dispatch({ effects: action.of(a) });
  }
  update(pin: Pin) {
    this.pin = pin;
    this.root.style.left = pin.x + "px";
    this.root.style.top = pin.y + "px";
    this.root.style.width = pin.width + "px";
    const source = this.view.state.doc.sliceString(pin.from, pin.to);
    if (this.textarea) {
      if (source !== this.draftBase) {
        if (
          this.textarea.value === this.draftBase ||
          this.textarea.value === source
        ) {
          const at = this.textarea.selectionStart;
          this.textarea.value = source;
          this.draftBase = source;
          this.textarea.setSelectionRange(
            Math.min(at, source.length),
            Math.min(at, source.length),
          );
        } else if (!this.conflictWarned) {
          this.conflictWarned = true;
          this.showConflict();
          this.host.notify(
            "This block changed elsewhere. Your draft is still in the text box; copy it before returning to the source. It was not overwritten.",
          );
        }
      }
      this.sizeInput();
      return;
    }
    if (this.lastText !== source) {
      this.lastText = source;
      void this.render(source);
    }
  }
  private async render(text: string) {
    const generation = ++this.generation;
    this.life?.unload();
    this.life = new Component();
    this.life.load();
    const staging = document.createElement("div");
    this.body.replaceChildren(staging);
    try {
      await MarkdownRenderer.render(
        this.host.app,
        text,
        staging,
        this.view.state.field(fields.get(this.view)!).path,
        this.life,
      );
      // Keep the connected render container in place so embedded components retain their DOM.
      if (generation !== this.generation || this.textarea) return;
    } catch (e) {
      if (generation === this.generation) this.body.textContent = text;
      console.error("Canvesidian block renderer", e);
    }
  }
  private edit() {
    if (this.textarea) {
      this.textarea.focus();
      return;
    }
    this.generation++;
    this.life?.unload();
    this.life = null;
    this.body.replaceChildren();
    const input = document.createElement("textarea");
    this.textarea = input;
    input.className = "cv-inline-input";
    input.dir = "auto";
    input.setAttribute("aria-label", "Edit floating block Markdown");
    input.value = this.view.state.doc.sliceString(this.pin.from, this.pin.to);
    this.draftBase = input.value;
    this.conflictWarned = false;
    this.body.append(input);
    const commit = () => {
      if (this.composing) return false;
      const before = this.view.state.doc.sliceString(
        this.pin.from,
        this.pin.to,
      );
      if (before === input.value) {
        this.draftBase = before;
        return true;
      }
      if (before !== this.draftBase) {
        this.showConflict();
        this.host.notify(
          "The source changed while you were editing. Your draft has been kept; copy it before continuing.",
        );
        return false;
      }
      this.view.dispatch({
        changes: { from: this.pin.from, to: this.pin.to, insert: input.value },
        annotations: Transaction.userEvent.of("input.type"),
      });
      this.draftBase = input.value;
      return true;
    };
    input.addEventListener("compositionstart", () => (this.composing = true));
    input.addEventListener("compositionend", () => {
      this.composing = false;
      commit();
    });
    input.oninput = () => {
      commit();
      this.sizeInput();
    };
    input.onkeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (this.composing) return;
        e.preventDefault();
        (e.shiftKey ? redo : undo)(this.view);
      }
      if (e.key === "Escape" && !this.composing) {
        e.preventDefault();
        if (commit()) this.finishEdit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !this.composing) {
        e.preventDefault();
        if (commit()) this.finishEdit();
      }
    };
    const done = this.button(
      this.body,
      "Done",
      "Finish editing this block",
      () => {
        if (commit()) this.finishEdit();
      },
    );
    done.className = "cv-done";
    this.sizeInput();
    input.focus();
  }
  private showConflict() {
    if (!this.body.querySelector(".cv-draft-warning")) {
      const warning = document.createElement("p");
      warning.className = "cv-draft-warning";
      warning.textContent =
        "Source changed elsewhere. Your draft has not been applied. Copy it before returning this block.";
      warning.setAttribute("role", "alert");
      this.body.append(warning);
    }
  }
  private sizeInput() {
    if (this.textarea) {
      this.textarea.style.height = "auto";
      this.textarea.style.height =
        Math.max(88, this.textarea.scrollHeight) + "px";
    }
  }
  private finishEdit() {
    this.composing = false;
    this.textarea = null;
    this.body.replaceChildren();
    this.lastText = null;
    this.update(this.pin);
    this.grip.focus({ preventScroll: true });
  }
  beginDrag(event: PointerEvent, alignToPointer = false) {
    if (alignToPointer) {
      const rect = this.view.scrollDOM.getBoundingClientRect();
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: {
          x: limit(
            event.clientX - rect.left + this.view.scrollDOM.scrollLeft + 24,
            0,
            50000,
          ),
          y: limit(
            event.clientY - rect.top + this.view.scrollDOM.scrollTop - 12,
            0,
            50000,
          ),
        },
      });
    }
    this.drag(event, false);
  }
  private nudge(e: KeyboardEvent, resize: boolean) {
    const d: Record<string, number[]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!d[e.key]) return;
    e.preventDefault();
    const [dx, dy] = d[e.key].map((n) => n * (e.shiftKey ? 10 : 1));
    this.dispatch({
      type: "place",
      id: this.pin.id,
      placement: resize
        ? { width: limit(this.pin.width + dx, 200, 1200) }
        : {
            x: limit(this.pin.x + dx, 0, 50000),
            y: limit(this.pin.y + dy, 0, 50000),
          },
    });
  }
  private drag(e: PointerEvent, resize: boolean) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.cleanupDrag?.();
    const start = {
      x: e.clientX,
      y: e.clientY,
      left: this.pin.x,
      top: this.pin.y,
      width: this.pin.width,
      sx: this.view.scrollDOM.scrollLeft,
      sy: this.view.scrollDOM.scrollTop,
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== e.pointerId) return;
      const dx =
        event.clientX - start.x + this.view.scrollDOM.scrollLeft - start.sx;
      const dy =
        event.clientY - start.y + this.view.scrollDOM.scrollTop - start.sy;
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: resize
          ? { width: limit(start.width + dx, 200, 1200) }
          : {
              x: limit(start.left + dx, 0, 50000),
              y: limit(start.top + dy, 0, 50000),
            },
      });
    };
    const end = (event?: PointerEvent) => {
      if (event && event.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", blur);
      this.cleanupDrag = null;
      this.persist();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    const blur = () => end();
    window.addEventListener("blur", blur, { once: true });
    this.cleanupDrag = () => {
      window.removeEventListener("blur", blur);
      end();
    };
    this.grip.focus({ preventScroll: true });
  }
  destroy() {
    if (this.textarea && this.textarea.value !== this.draftBase) {
      const path = this.path;
      const drafts = (this.host.store.recoveryDrafts ??= []);
      const text = this.textarea.value;
      if (!drafts.some((d) => d.path === path && d.text === text)) {
        drafts.push({
          id: crypto.randomUUID(),
          path,
          text,
          savedAt: new Date().toISOString(),
        });
        this.host.scheduleSave();
        this.host.notify(
          "An interrupted block draft was saved. Use Canvesidian: Recover interrupted block drafts to copy it.",
        );
      }
    }
    this.generation++;
    cancelAnimationFrame(this.sizeFrame);
    this.cleanupDrag?.();
    this.observer.disconnect();
    this.life?.unload();
    this.root.remove();
  }
}
