import { ObjectCamera, objectCameraX, revealObject } from "./object-camera";
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
  setIcon,
} from "obsidian";
import {
  Pin,
  Drawing,
  SavedPin,
  InlineStore,
  blockAt,
  blocks,
  capture,
  restore,
  limit,
  rotatedBounds,
  rotatedResize,
  normalizePreferences,
  PluginPreferences,
} from "./model";

import {
  Selection,
  Selectable,
  iconButton,
  addHandles,
  Handle,
  resized,
  previewGesture,
  leftGrip,
  rotationField,
  rotationHandle,
  rightGutter,
  gripInteraction,
  actionMenu,
  alignmentActions,
  copyText,
  layerActions,
} from "./interaction";
import { DesignTools, confirmAction } from "./design-tools";

export interface SpatialHost {
  app: App;
  store: InlineStore;
  views: Set<EditorView>;
  scheduleSave(): void;
  notify(message: string): void;
  openPreferences(): void;
  importImage(
    file: File,
    path: string,
  ): Promise<{ assetPath: string; width: number; height: number }>;
  imageURL(path: string): string;
}
interface SpatialState {
  path: string;
  enabled: boolean;
  live: boolean;
  pins: Pin[];
  detached: SavedPin[];
  drawings: Drawing[];
  decorations: DecorationSet;
}
type Action =
  | { type: "refresh" }
  | { type: "add"; pin: Pin }
  | { type: "remove"; id: string }
  | {
      type: "place";
      id: string;
      placement: Partial<
        Pick<
          Pin,
          | "x"
          | "y"
          | "width"
          | "height"
          | "rotation"
          | "fontSize"
          | "color"
          | "background"
          | "layer"
        >
      >;
    }
  | { type: "toggle" }
  | { type: "drawings"; drawings: Drawing[] }
  | { type: "reset" }
  | { type: "layers"; layers: Record<string, number> };
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
function reserve(value: SpatialState) {
  return (
    Math.ceil(
      Math.max(
        800,
        ...value.pins.map((p) => {
          const b = rotatedBounds(p);
          return b.y + b.height + 160;
        }),
        ...value.drawings.map((d) => {
          const b = rotatedBounds(d);
          return b.y + b.height + 160;
        }),
      ) / 512,
    ) * 512
  );
}
function decorate(value: SpatialState, length: number) {
  if (
    !value.enabled ||
    !value.live ||
    (!value.pins.length && !value.drawings.length)
  )
    return Decoration.none;
  const ranges = value.pins.map((p) =>
    Decoration.replace({ block: true, widget: new Hidden() }).range(
      p.from,
      p.to,
    ),
  );
  const height = reserve(value);
  ranges.push(
    Decoration.widget({
      block: true,
      side: 1,
      widget: new Space(height),
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
        drawings: saved?.drawings ?? [],
        ...restored,
        decorations: Decoration.none,
      };
      value.decorations = decorate(value, state.doc.length);
      return value;
    },
    update(old, tr) {
      const path = pathOf(tr.state);
      const isLive = live(tr.state);
      const effects = tr.effects.filter((e) => e.is(action));
      if (
        !tr.docChanged &&
        !effects.length &&
        path === old.path &&
        isLive === old.live
      )
        return old;
      let value: SpatialState = {
        ...old,
        pins: old.pins,
        live: live(tr.state),
      };
      if (path !== old.path) {
        const saved = host.store.notes[path];
        value = {
          ...value,
          path,
          enabled: saved?.enabled ?? true,
          drawings: saved?.drawings ?? [],
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
          value = {
            ...value,
            enabled: true,
            pins: [
              ...value.pins,
              {
                ...a.pin,
                layer:
                  Math.max(
                    0,
                    ...value.pins.map((p) => p.layer ?? 0),
                    ...value.drawings.map((d) => d.layer ?? 0),
                  ) + 1,
              },
            ],
          };
        if (a.type === "remove")
          value = {
            ...value,
            pins: value.pins.filter((p) => p.id !== a.id),
            drawings: value.drawings.filter(
              (d) => d.sourceId !== a.id && d.targetId !== a.id,
            ),
          };
        if (a.type === "place")
          value = {
            ...value,
            pins: value.pins.map((p) =>
              p.id === a.id ? { ...p, ...a.placement } : p,
            ),
          };
        if (a.type === "layers")
          value = {
            ...value,
            pins: value.pins.map((p) => ({
              ...p,
              layer: a.layers[p.id] ?? p.layer,
            })),
            drawings: value.drawings.map((d) => ({
              ...d,
              layer: a.layers[d.id] ?? d.layer,
            })),
          };
        if (a.type === "toggle") value = { ...value, enabled: !value.enabled };
        if (a.type === "drawings")
          value = {
            ...value,
            drawings: a.drawings,
            enabled: true,
          };
        if (a.type === "reset")
          value = {
            ...value,
            pins: [],
            detached: [],
            drawings: [],
            enabled: true,
          };
      }
      if (tr.docChanged) {
        const removed = new Set(
          old.pins
            .filter((p) => !value.pins.some((n) => n.id === p.id))
            .map((p) => p.id),
        );
        if (removed.size)
          value.drawings = value.drawings.filter(
            (d) =>
              !removed.has(d.sourceId ?? "") && !removed.has(d.targetId ?? ""),
          );
      }
      const sourceRangesChanged =
        tr.docChanged ||
        path !== old.path ||
        effects.some(
          (e) =>
            e.is(action) &&
            ["add", "remove", "reset", "toggle"].includes(e.value.type),
        );
      if (
        sourceRangesChanged ||
        value.live !== old.live ||
        reserve(value) !== reserve(old) ||
        !old.drawings.length !== !value.drawings.length
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
      selection: Selection;
      tools: DesignTools;
      private cachedDoc: unknown = null;
      private cachedSource = "";
      private savedPins = new Map<string, SavedPin>();
      hoverPos: number | null = null;
      private cancelGrip: () => void;
      private controls: HTMLElement;
      private camera: ObjectCamera;
      private cameraPath = "";
      private wheel = (event: WheelEvent) => {
        const state = this.view.state.field(field);
        if (
          !event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          !state.enabled ||
          !state.live ||
          (!state.pins.length && !state.drawings.length)
        )
          return;
        event.preventDefault();
        const unit =
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? this.view.scrollDOM.clientWidth
              : 1;
        this.camera.set(this.camera.x - (event.deltaX || event.deltaY) * unit);
      };
      destroyed = false;
      private hoverFrame = 0;
      private hoverEvent: MouseEvent | null = null;
      private onGutterMove = (event: MouseEvent) => this.queueHover(event);
      private onGutterLeave = (event: MouseEvent) => {
        if (!this.handle.contains(event.relatedTarget as Node | null))
          this.hideHover();
      };
      private parsedDoc: unknown = null;
      private parsedBlocks: ReturnType<typeof blocks> = [];
      constructor(public view: EditorView) {
        fields.set(view, field);
        host.views.add(view);
        view.scrollDOM.classList.add("cv-spatial-scroller");
        this.layer = document.createElement("div");
        this.layer.className = "cv-spatial-layer";
        this.layer.contentEditable = "false";
        this.camera = new ObjectCamera(
          view.dom,
          view.scrollDOM,
          this.layer,
          (x) => {
            this.selection?.position();
            const path = view.state.field(field).path,
              note = host.store.notes[path];
            if (note) {
              note.viewX = x;
              host.scheduleSave();
            }
          },
        );
        view.dom.addEventListener("wheel", this.wheel, { passive: false });
        this.controls = document.createElement("div");
        this.controls.className = "cv-source-controls";
        this.controls.contentEditable = "false";
        view.dom.append(this.controls);
        this.selection = new Selection(view.scrollDOM, (layers) =>
          view.dispatch({ effects: action.of({ type: "layers", layers }) }),
        );
        this.tools = new DesignTools(
          view,
          this.layer,
          this.selection,
          host.app,
          {
            read: () => view.state.field(field),
            getPreferences: () => normalizePreferences(host.store.settings),
            openPreferences: () => host.openPreferences(),
            toggle: () =>
              view.dispatch({ effects: action.of({ type: "toggle" }) }),
            importImage: (file, path) => host.importImage(file, path),
            imageURL: (path) => host.imageURL(path),
            notify: (message) => host.notify(message),
            getDefaults: () => host.store.toolDefaults ?? {},
            saveDefault: (mode, style) => {
              host.store.toolDefaults = {
                ...host.store.toolDefaults,
                [mode]: style,
              };
              host.scheduleSave();
            },
            recover: (path, text) => {
              host.store.recoveryDrafts ??= [];
              host.store.recoveryDrafts.push({
                id: crypto.randomUUID(),
                path,
                text,
                savedAt: new Date().toISOString(),
              });
              host.scheduleSave();
              host.notify(
                "An unfinished annotation draft was saved. Use Canvsidian: Recover interrupted block drafts.",
              );
            },
            setDrawings: (drawings) =>
              view.dispatch({
                effects: action.of({ type: "drawings", drawings }),
              }),
            reset: () =>
              view.dispatch({ effects: action.of({ type: "reset" }) }),
          },
        );
        this.handle = document.createElement("button");
        this.handle.className = "cv-float-handle";
        setIcon(this.handle, "grip-vertical");
        this.handle.title = "Drag this block out of the text flow";
        this.handle.setAttribute("aria-label", "Float block under pointer");
        this.controls.append(this.handle);
        this.handle.hidden = true;
        this.handle.onpointerleave = (event) => {
          if (!view.scrollDOM.contains(event.relatedTarget as Node | null))
            this.hideHover();
        };
        this.cancelGrip = gripInteraction(
          this.handle,
          (e) => {
            if (this.hoverPos === null) return;
            const pin = floatAt(view, host, this.hoverPos);
            if (pin) this.cards.get(pin.id)?.beginDrag(e, true);
            this.hideHover();
          },
          () => this.sourceMenu(),
        );
        view.scrollDOM.addEventListener("mousemove", this.onGutterMove);
        view.scrollDOM.addEventListener("mouseleave", this.onGutterLeave);
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
            before.drawings !== next.drawings ||
            before.enabled !== next.enabled ||
            before.path !== next.path
          )
            this.persist();
        }
        if (update.docChanged || update.viewportChanged) this.hideHover();
      }
      sync(initial: boolean) {
        const state = this.view.state.field(field);
        const shown = state.enabled && state.live && !!state.path;
        if (state.path !== this.cameraPath) {
          this.cameraPath = state.path;
          this.camera.set(host.store.notes[state.path]?.viewX ?? 0, false);
        }
        if (!state.pins.length && !state.drawings.length)
          this.camera.set(0, false);
        this.camera.viewport.hidden = !shown;
        this.layer.hidden = !shown;
        this.camera.layout();
        if (!shown) this.hideHover();
        for (const [id, card] of this.cards)
          if (!shown || !state.pins.some((p) => p.id === id)) {
            card.destroy();
            this.cards.delete(id);
          }
        if (shown)
          for (const pin of state.pins) {
            let card = this.cards.get(pin.id);
            if (!card) {
              card = new FloatingBlock(
                this.view,
                host,
                pin,
                this.layer,
                () => this.persist(),
                this.selection,
                (p) => this.tools.previewTarget(pin.id, p),
              );
              this.cards.set(pin.id, card);
              this.selection.select(card);
            }
            if (card.pin !== pin || !card.root.style.width) card.update(pin);
          }
        this.tools.sync();
        this.selection.refreshLayers();
        this.selection.position();
        if (initial && state.detached.length)
          host.notify(
            `${state.detached.length} Canvsidian placement(s) could not be matched safely. Their text remains visible; saved placement has been retained.`,
          );
      }
      persist() {
        const state = this.view.state.field(field);
        if (!state.path) return;
        const changed = this.cachedDoc !== this.view.state.doc;
        if (changed) {
          this.cachedDoc = this.view.state.doc;
          this.cachedSource = this.view.state.doc.toString();
          this.savedPins.clear();
        }
        const currentIds = new Set(state.pins.map((p) => p.id));
        for (const id of this.savedPins.keys())
          if (!currentIds.has(id)) this.savedPins.delete(id);
        const saved = state.pins.map((p) => {
          const previous = this.savedPins.get(p.id);
          const value = previous
            ? { ...previous, ...p }
            : capture(p, this.cachedSource);
          this.savedPins.set(p.id, value);
          return value;
        });
        host.store.notes[state.path] = {
          enabled: state.enabled,
          viewX: this.camera.x,
          pins: [...saved, ...state.detached],
          drawings: state.drawings,
        };
        host.scheduleSave();
      }
      hideHover() {
        cancelAnimationFrame(this.hoverFrame);
        this.hoverFrame = 0;
        this.hoverEvent = null;
        this.handle.hidden = true;
      }
      sourceMenu() {
        if (this.hoverPos === null) return;
        const block = blockAt(this.view.state.doc.toString(), this.hoverPos);
        if (!block) return;
        const originalDoc = this.view.state.doc;
        const valid = () => {
          if (this.view.state.doc === originalDoc) return true;
          host.notify(
            "This block changed while its menu was open. Reopen the block menu before editing it.",
          );
          return false;
        };
        const float = () => {
          const p = floatAt(this.view, host, block.from);
          return p ? this.cards.get(p.id) : undefined;
        };
        actionMenu(
          this.handle,
          [
            {
              label: "Edit block",
              icon: "pencil",
              run: () => {
                this.view.dispatch({
                  selection: { anchor: block.from },
                  scrollIntoView: true,
                });
                this.view.focus();
              },
            },
            {
              label: "Copy Markdown",
              icon: "clipboard-copy",
              run: () =>
                copyText(
                  this.view.state.doc.sliceString(block.from, block.to),
                  (m) => host.notify(m),
                ),
            },
            {
              label: "Select block text",
              icon: "text-select",
              run: () => {
                this.view.dispatch({
                  selection: { anchor: block.from, head: block.to },
                  scrollIntoView: true,
                });
                this.view.focus();
              },
            },
            {
              label: "Float and move",
              icon: "move",
              run: () => {
                float();
                this.hideHover();
              },
            },
            {
              label: "Text size and color",
              icon: "palette",
              run: () => {
                float()?.openSettings();
                this.hideHover();
              },
            },
            {
              label: "Duplicate",
              icon: "copy",
              run: () =>
                this.view.dispatch({
                  changes: { from: block.to, insert: "\n\n" + block.text },
                }),
            },
            {
              label: "Delete",
              icon: "trash-2",
              run: () =>
                confirmAction(
                  host.app,
                  "Delete this block?",
                  "Remove this block's Markdown from this note. Use text undo to restore it.",
                  "Delete block",
                  () => {
                    if (valid())
                      this.view.dispatch({
                        changes: { from: block.from, to: block.to },
                      });
                  },
                ),
            },
          ].map((item) => ({
            ...item,
            run: () => {
              if (valid()) item.run();
            },
          })),
        );
      }
      hover(event: MouseEvent) {
        const state = this.view.state.field(field);
        if (
          !state.enabled ||
          !state.live ||
          this.view.scrollDOM.classList.contains("cv-has-gesture")
        ) {
          this.hideHover();
          return;
        }
        if ((event.target as Element)?.closest(".cv-float-handle,.menu"))
          return;
        if (
          (event.target as Element)?.closest(
            ".cv-floating-block,.cv-drawing-object,.cv-tool-dock",
          )
        ) {
          this.hideHover();
          return;
        }
        const content = this.view.contentDOM.getBoundingClientRect();
        // Only the dedicated right gutter reveals the grip, never ordinary typing/content hover.
        const size = matchMedia("(pointer:coarse)").matches ? 44 : 28;
        const gutter =
          rightGutter(this.view.scrollDOM) +
          this.view.scrollDOM.getBoundingClientRect().left -
          this.view.scrollDOM.scrollLeft;
        if (event.clientX < gutter - 4 || event.clientX > gutter + size + 4) {
          this.hideHover();
          return;
        }
        const pos = this.view.posAtCoords({
          x: Math.min(
            content.right - 4,
            Math.max(content.left + 4, event.clientX),
          ),
          y: event.clientY,
        });
        if (pos === null) {
          this.hideHover();
          return;
        }
        if (this.parsedDoc !== this.view.state.doc) {
          this.parsedDoc = this.view.state.doc;
          this.parsedBlocks = blocks(this.view.state.doc.toString());
        }
        const lineBounds = (pos: number) => {
          const dom = this.view.domAtPos(pos).node;
          const el = dom instanceof Element ? dom : dom.parentElement;
          return el?.closest(".cm-line")?.getBoundingClientRect();
        };
        let lo = 0,
          hi = this.parsedBlocks.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (this.parsedBlocks[mid].from <= pos) lo = mid + 1;
          else hi = mid;
        }
        const block = [this.parsedBlocks[lo - 1], this.parsedBlocks[lo]].find(
          (b) => {
            if (!b) return false;
            const a = lineBounds(b.from) ?? this.view.coordsAtPos(b.from),
              z = lineBounds(b.to) ?? this.view.coordsAtPos(b.to);
            return (
              a &&
              z &&
              event.clientY >= a.top &&
              event.clientY <= Math.max(a.bottom, z.bottom)
            );
          },
        );
        if (
          !block ||
          state.pins.some((p) => block.from < p.to && block.to > p.from)
        ) {
          this.hideHover();
          return;
        }
        const first =
            lineBounds(block.from) ?? this.view.coordsAtPos(block.from),
          last = lineBounds(block.to) ?? this.view.coordsAtPos(block.to);
        if (
          !first ||
          !last ||
          event.clientY < first.top ||
          event.clientY > Math.max(first.bottom, last.bottom)
        ) {
          this.hideHover();
          return;
        }
        const controls = this.controls.getBoundingClientRect();
        this.hoverPos = block.from;
        this.handle.style.left = gutter - controls.left + "px";
        this.handle.style.top =
          (first.top + Math.max(first.bottom, last.bottom)) / 2 -
          controls.top -
          size / 2 +
          "px";
        this.handle.hidden = false;
      }
      queueHover(event: MouseEvent) {
        this.hoverEvent = event;
        if (!this.hoverFrame)
          this.hoverFrame = requestAnimationFrame(() => {
            this.hoverFrame = 0;
            if (this.hoverEvent && !this.destroyed) this.hover(this.hoverEvent);
          });
      }
      destroy() {
        cancelAnimationFrame(this.hoverFrame);
        this.destroyed = true;
        this.persist();
        this.cards.forEach((c) => c.destroy());
        this.cards.clear();
        this.view.scrollDOM.removeEventListener("mousemove", this.onGutterMove);
        this.view.scrollDOM.removeEventListener(
          "mouseleave",
          this.onGutterLeave,
        );
        this.layer.dispatchEvent(new Event("cv-destroy"));
        this.controls.dispatchEvent(new Event("cv-destroy"));
        this.controls.remove();
        this.cancelGrip();
        this.tools.destroy();
        this.selection.destroy();
        this.view.dom.removeEventListener("wheel", this.wheel);
        this.camera.destroy();
        this.view.scrollDOM.classList.remove("cv-spatial-scroller");
        host.views.delete(this.view);
        fields.delete(this.view);
      }
    },
    {
      eventHandlers: {
        keydown() {
          this.hideHover();
        },

        scroll() {
          this.hideHover();
        },
        mousemove(event) {
          this.queueHover(event);
        },
      },
    },
  );
  return [
    EditorView.editorAttributes.of({ class: "cv-design-editor" }),
    Prec.high(field),
    plugin,
  ];
}
export function refreshSpatial(view: EditorView) {
  if (fields.has(view))
    view.dispatch({ effects: action.of({ type: "refresh" }) });
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
  const camera = objectCameraX(view.scrollDOM);
  const rightMargin =
    content.right -
    rect.left -
    view.scrollDOM.clientLeft +
    view.scrollDOM.scrollLeft -
    camera +
    32;
  const hasMargin =
    rightMargin + width <=
    view.scrollDOM.scrollLeft - camera + view.scrollDOM.clientWidth - 16;
  const bottom =
    view.coordsAtPos(view.state.doc.length)?.bottom ?? at?.bottom ?? rect.top;
  const pin: Pin = {
    ...block,
    id: crypto.randomUUID(),
    x: limit(
      hasMargin
        ? rightMargin
        : Math.max(
            16 - camera,
            content.left -
              rect.left -
              view.scrollDOM.clientLeft +
              view.scrollDOM.scrollLeft -
              camera,
          ),
      -50000,
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
        pin.y < p.y + p.height + 72 &&
        pin.y + pin.height + 72 > p.y,
    );
    if (!overlap) break;
    pin.y = limit(overlap.y + overlap.height + 72, 8, 50000);
  }
  view.dispatch({ effects: action.of({ type: "add", pin }) });
  return pin;
}
class FloatingBlock implements Selectable {
  id: string;
  toolbar: HTMLElement;
  private editButton: HTMLButtonElement;
  private frame: HTMLElement;
  private updateGrip: () => void;
  alignGrip = () => this.updateGrip();
  private cancelRotate: () => void;
  private commitDraft: (() => boolean) | null = null;
  private dragging = false;
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
    private selection: Selection,
    private previewConnections: (p: import("./model").Placement | null) => void,
  ) {
    this.pin = pin;
    this.id = pin.id;
    this.selection.register(this);
    this.path = this.view.state.field(fields.get(this.view)!).path;
    this.root = document.createElement("article");
    this.root.className = "cv-floating-block";
    this.root.dataset.id = pin.id;
    this.root.setAttribute("aria-label", "Floating block in this note");
    this.root.contentEditable = "false";
    this.root.tabIndex = 0;
    this.root.onfocus = () => this.selection.select(this);
    this.root.addEventListener("focusin", () => this.selection.select(this));
    parent.append(this.root);
    const toolbar = document.createElement("div");
    this.toolbar = toolbar;
    toolbar.className = "cv-context-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Selected text tools");
    this.root.append(toolbar);
    this.grip = iconButton(toolbar, "move", "Move this block", () =>
      this.select(),
    );
    this.grip.classList.add("cv-block-grip");
    this.grip.onpointerdown = (e) => this.beginDrag(e);
    this.grip.onkeydown = (e) => this.nudge(e, false);
    this.editButton = iconButton(
      toolbar,
      "pencil",
      "Edit text in place",
      () => {
        this.select();
        if (this.textarea) {
          if (this.commitDraft?.()) this.finishEdit();
        } else this.edit();
      },
    );
    iconButton(
      toolbar,
      "corner-up-left",
      "Return block to normal text flow",
      () => {
        const from = this.pin.from;
        this.dispatch({ type: "remove", id: this.pin.id });
        this.view.dispatch({
          selection: { anchor: Math.min(from, this.view.state.doc.length) },
          scrollIntoView: true,
        });
        this.view.focus();
      },
    );
    const del = iconButton(
      toolbar,
      "trash-2",
      "Delete this block from note",
      () => this.remove(),
    );
    del.classList.add("cv-danger");
    iconButton(toolbar, "settings-2", "Text block settings", () =>
      this.openSettings(),
    );
    this.frame = document.createElement("div");
    this.frame.className = "cv-rotated-frame cv-text-frame";
    this.root.append(this.frame);
    this.body = document.createElement("div");
    this.body.className = "cv-floating-body markdown-rendered";
    this.body.dir = "auto";
    this.body.ondblclick = () => this.edit();
    this.frame.append(this.body);
    addHandles(
      this.frame,
      (e, h) => this.drag(e, h),
      (e) => this.nudge(e, true),
    );
    this.updateGrip = leftGrip(
      this.root,
      () => this.pin,
      (e) => this.beginDrag(e),
      (e) => this.nudge(e, false),
      () => this.menu(),
    );
    this.cancelRotate = rotationHandle(
      this.root,
      this.frame,
      () => this.pin,
      (n) => {
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: { rotation: n },
        });
        this.selection.position();
      },
      (p) => this.previewConnections(p),
    );
    this.resize = this.root.querySelector(".cv-handle-se") as HTMLButtonElement;
    this.root.onpointerdown = (e) => {
      if ((e.target as Element).closest("button,textarea,input,a")) return;
      this.beginDrag(e);
    };
    this.root.onkeydown = (e) => {
      if ((e.target as Element).closest("textarea,input,button")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        this.remove();
      } else if (e.key === "Escape") this.selection.select(null);
      else this.nudge(e, false);
    };
    this.root.addEventListener("keydown", (e) => e.stopPropagation());
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.root.addEventListener("mousedown", (e) => e.stopPropagation());
    this.root.addEventListener("input", (e) => e.stopPropagation());
    this.observer = new ResizeObserver((entries) => {
      if (this.dragging) return;
      const height = Math.ceil(
        entries[0].borderBoxSize?.[0]?.blockSize ??
          entries[0].contentRect.height,
      );
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
  private dispatch(a: Action) {
    this.view.dispatch({ effects: action.of(a) });
  }
  update(pin: Pin) {
    this.pin = pin;
    this.frame.style.rotate = (pin.rotation ?? 0) + "deg";
    this.root.style.left = pin.x + "px";
    this.root.style.top = pin.y + "px";
    this.root.style.width = pin.width + "px";
    this.root.style.minHeight = pin.height + "px";
    this.body.style.fontSize = pin.fontSize ? pin.fontSize + "px" : "";
    this.body.style.color = pin.color ?? "";
    this.body.style.background = pin.background ?? "";
    if (this.textarea)
      this.textarea.style.fontSize = pin.fontSize ? pin.fontSize + "px" : "";
    this.updateGrip();
    this.selection.refreshLayers();
    const source = pin.text;
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
      if (source !== this.draftBase) this.sizeInput();
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
      console.error("Canvsidian block renderer", e);
    }
  }
  setLayer = (layer: number) =>
    this.dispatch({ type: "place", id: this.pin.id, placement: { layer } });
  menu = () => {
    this.select();
    actionMenu(this.root.querySelector<HTMLElement>(".cv-object-grip")!, [
      { label: "Edit text", icon: "pencil", run: () => this.edit() },
      {
        label: "Text size and color",
        icon: "palette",
        run: () => this.openSettings(),
      },
      {
        label: "Copy Markdown",
        icon: "clipboard-copy",
        run: () => copyText(this.pin.text, (m) => this.host.notify(m)),
      },
      ...alignmentActions(this.view.scrollDOM, this.position, (p) =>
        this.dispatch({ type: "place", id: this.pin.id, placement: p }),
      ),
      {
        label: "Reset rotation",
        icon: "rotate-ccw",
        run: () =>
          this.dispatch({
            type: "place",
            id: this.pin.id,
            placement: { rotation: 0 },
          }),
      },
      ...layerActions(this.selection, this),
      {
        label: "Duplicate",
        icon: "copy",
        run: () =>
          this.view.dispatch({
            changes: { from: this.pin.to, insert: "\n\n" + this.pin.text },
          }),
      },
      {
        label: "Return to text flow",
        icon: "corner-up-left",
        run: () => this.dispatch({ type: "remove", id: this.pin.id }),
      },
      {
        label: "Return and edit source",
        icon: "file-text",
        run: () => {
          const from = this.pin.from;
          this.dispatch({ type: "remove", id: this.pin.id });
          this.view.dispatch({
            selection: { anchor: from },
            scrollIntoView: true,
          });
          this.view.focus();
        },
      },
      { label: "Delete", icon: "trash-2", run: () => this.remove() },
    ]);
  };
  position = () => this.pin;
  bounds = () => rotatedBounds(this.pin);
  openSettings = () => {
    this.selection.select(this);
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    const menu = document.createElement("div");
    menu.className = "cv-property-popover cv-text-properties";
    this.toolbar.append(menu);
    const label = document.createElement("label");
    label.textContent = "Width";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "120";
    input.max = "4000";
    input.value = String(Math.round(this.pin.width));
    input.setAttribute("aria-label", "Text block width");
    input.onchange = () =>
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: { width: limit(Number(input.value) || 200, 120, 4000) },
      });
    label.append(input);
    menu.append(label);
    const number = (
      name: string,
      value: number,
      min: number,
      max: number,
      key: "fontSize" | "height",
    ) => {
      const label = document.createElement("label");
      label.textContent = name;
      const input = document.createElement("input");
      input.type = "number";
      input.min = String(min);
      input.max = String(max);
      input.value = String(value);
      input.setAttribute("aria-label", name);
      input.onchange = () =>
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: { [key]: limit(Number(input.value) || min, min, max) },
        });
      label.append(input);
      menu.append(label);
    };
    number("Text font size", this.pin.fontSize ?? 16, 12, 144, "fontSize");
    number("Text block height", this.pin.height, 28, 10000, "height");
    for (const key of ["color", "background"] as const) {
      const label = document.createElement("label");
      label.textContent = key === "color" ? "Text color" : "Background color";
      const input = document.createElement("input");
      input.type = "color";
      input.value = this.pin[key]?.startsWith("#")
        ? this.pin[key]!
        : key === "color"
          ? "#2783DE"
          : "#FFF0AD";
      input.setAttribute("aria-label", label.textContent);
      input.onchange = () =>
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: { [key]: input.value },
        });
      label.append(input);
      menu.append(label);
    }
    iconButton(menu, "rotate-ccw", "Reset text appearance", () =>
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: {
          fontSize: undefined,
          color: undefined,
          background: undefined,
        },
      }),
    );
    rotationField(menu, this.pin.rotation ?? 0, (n) => {
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: { rotation: n },
      });
      this.selection.position();
    });
    this.selection.position();
  };
  private select() {
    this.selection.select(this);
    this.root.focus({ preventScroll: true });
  }
  remove = () => {
    confirmAction(
      this.host.app,
      "Delete this block?",
      "This removes the block’s Markdown from this note. Text undo can restore it. Returning a block to normal flow is a separate action.",
      "Delete block",
      () => {
        if (!this.root.isConnected) return;
        this.view.dispatch({
          changes: { from: this.pin.from, to: this.pin.to, insert: "" },
          effects: action.of({ type: "remove", id: this.pin.id }),
          annotations: Transaction.userEvent.of("delete.selection"),
        });
        this.view.focus();
      },
    );
  };
  private edit() {
    this.selection.select(this);
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
    this.commitDraft = commit;
    setIcon(this.editButton, "check");
    this.editButton.setAttribute("aria-label", "Finish editing this block");
    this.editButton.title = "Finish editing this block";
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
    this.commitDraft = null;
    setIcon(this.editButton, "pencil");
    this.editButton.setAttribute("aria-label", "Edit text in place");
    this.editButton.title = "Edit text in place";
    this.textarea = null;
    this.body.replaceChildren();
    this.lastText = null;
    this.update(this.pin);
    this.grip.focus({ preventScroll: true });
  }
  beginDrag(event: PointerEvent, alignToPointer = false) {
    this.select();
    if (alignToPointer) {
      const rect = this.view.scrollDOM.getBoundingClientRect();
      this.dispatch({
        type: "place",
        id: this.pin.id,
        placement: {
          x: limit(
            event.clientX -
              rect.left -
              this.view.scrollDOM.clientLeft +
              this.view.scrollDOM.scrollLeft -
              objectCameraX(this.view.scrollDOM) +
              24,
            -50000,
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
    this.drag(event);
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
        ? { width: limit(this.pin.width + dx, 120, 4000) }
        : {
            x: limit(this.pin.x + dx, -50000, 50000),
            y: limit(this.pin.y + dy, 0, 50000),
          },
    });
    revealObject(this.view.scrollDOM, this.bounds());
  }
  private drag(e: PointerEvent, handle?: Handle) {
    if (e.button !== 0) return;
    this.select();
    this.cleanupDrag?.();
    this.dragging = true;
    const start = { ...this.pin };
    this.cleanupDrag = previewGesture(e, {
      scroller: this.view.scrollDOM,
      root: this.root,
      start,
      explicitHeight: true,
      autoPan: !handle,
      preview: (p) => this.previewConnections(p),
      finishPreview: () => this.previewConnections(null),
      project: (dx, dy) => {
        if (!handle)
          return {
            ...start,
            x: limit(start.x + dx, -50000, 50000),
            y: limit(start.y + dy, 0, 50000),
          };
        return rotatedResize(start, dx, dy, handle, 120, 28);
      },
      commit: (p) => {
        this.dispatch({
          type: "place",
          id: this.pin.id,
          placement: {
            x: p.x,
            y: p.y,
            width: p.width,
            rotation: p.rotation,
            height: p.height,
          },
        });
        this.selection.position();
      },
      end: () => {
        this.dragging = false;
        this.cleanupDrag = null;
      },
    });
  }
  destroy() {
    this.root.dispatchEvent(new Event("cv-destroy"));
    this.cancelRotate();
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
          "An interrupted block draft was saved. Use Canvsidian: Recover interrupted block drafts to copy it.",
        );
      }
    }
    this.generation++;
    cancelAnimationFrame(this.sizeFrame);
    this.cleanupDrag?.();
    this.observer.disconnect();
    this.life?.unload();
    this.selection.remove(this);
    this.root.remove();
  }
}
