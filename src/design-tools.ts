import { App, Modal } from "obsidian";
import { EditorView } from "@codemirror/view";
import {
  Drawing,
  DrawingKind,
  drawingFromPoints,
  Placement,
  limit,
} from "./model";
import {
  Selection,
  Selectable,
  iconButton,
  addHandles,
  Handle,
  previewGesture,
  resized,
} from "./interaction";

export function confirmAction(
  app: App,
  title: string,
  message: string,
  label: string,
  confirm: () => void,
) {
  class Confirm extends Modal {
    onOpen() {
      this.titleEl.textContent = title;
      const p = document.createElement("p");
      p.textContent = message;
      this.contentEl.append(p);
      const row = document.createElement("div");
      row.className = "cv-confirm-actions";
      this.contentEl.append(row);
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.onclick = () => this.close();
      const apply = document.createElement("button");
      apply.className = "mod-warning";
      apply.textContent = label;
      apply.onclick = () => {
        this.close();
        confirm();
      };
      row.append(cancel, apply);
      cancel.focus();
    }
    onClose() {
      this.contentEl.replaceChildren();
    }
  }
  new Confirm(app).open();
}
export interface DesignCallbacks {
  read: () => {
    path: string;
    enabled: boolean;
    live: boolean;
    drawings: Drawing[];
  };
  setDrawings: (next: Drawing[]) => void;
  reset: () => void;
}
const NS = "http://www.w3.org/2000/svg";
export function drawingSVG(d: Drawing) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${d.width} ${d.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("cv-vector");
  let shape: SVGElement;
  if (d.kind === "rect") {
    shape = document.createElementNS(NS, "rect");
    shape.setAttribute("x", "1");
    shape.setAttribute("y", "1");
    shape.setAttribute("width", String(Math.max(1, d.width - 2)));
    shape.setAttribute("height", String(Math.max(1, d.height - 2)));
    shape.setAttribute("rx", "4");
  } else if (d.kind === "ellipse") {
    shape = document.createElementNS(NS, "ellipse");
    shape.setAttribute("cx", String(d.width / 2));
    shape.setAttribute("cy", String(d.height / 2));
    shape.setAttribute("rx", String(Math.max(1, d.width / 2 - 1)));
    shape.setAttribute("ry", String(Math.max(1, d.height / 2 - 1)));
  } else {
    shape = document.createElementNS(NS, "path");
    const pts = d.points ?? [
      [0, 0],
      [1, 1],
    ];
    shape.setAttribute(
      "d",
      pts
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${(p[0] * d.width).toFixed(2)},${(p[1] * d.height).toFixed(2)}`,
        )
        .join(" "),
    );
  }
  shape.setAttribute("fill", "none");
  shape.setAttribute("stroke", d.stroke);
  shape.setAttribute("stroke-width", String(d.strokeWidth));
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  shape.setAttribute("vector-effect", "non-scaling-stroke");
  shape.setAttribute("opacity", String(d.opacity));
  svg.append(shape);
  return svg;
}
export class DesignTools {
  dock: HTMLElement;
  mode = "select";
  private catcher: HTMLElement;
  private shapes = new Map<string, DrawingObject>();
  private draft: HTMLElement | null = null;
  private disposeDrawing: (() => void) | null = null;
  private history: Drawing[][] = [];
  private future: Drawing[][] = [];
  private path = "";
  private scrollFrame = 0;
  private cleanups: (() => void)[] = [];
  constructor(
    private view: EditorView,
    private layer: HTMLElement,
    private selection: Selection,
    private app: App,
    private cb: DesignCallbacks,
  ) {
    view.dom.classList.add("cv-design-editor");
    this.dock = document.createElement("div");
    this.dock.className = "cv-tool-dock";
    this.dock.setAttribute("role", "toolbar");
    this.dock.setAttribute("aria-label", "Note design tools");
    view.dom.append(this.dock);
    const tools = [
      ["select", "mouse-pointer-2", "Select objects"],
      ["pen", "pencil", "Draw with pen"],
      ["highlighter", "highlighter", "Draw with highlighter"],
      ["rect", "square", "Draw rectangle"],
      ["ellipse", "circle", "Draw ellipse"],
      ["line", "minus", "Draw line"],
    ];
    for (const [mode, icon, label] of tools) {
      const b = iconButton(this.dock, icon, label, () => this.setMode(mode));
      b.dataset.tool = mode;
      b.setAttribute("aria-pressed", mode === "select" ? "true" : "false");
    }
    this.dock.append(this.divider());
    iconButton(this.dock, "undo-2", "Undo drawing", () => this.undo());
    iconButton(this.dock, "redo-2", "Redo drawing", () => this.redo());
    this.dock.append(this.divider());
    iconButton(this.dock, "rotate-ccw", "Reset entire note layout", () =>
      confirmAction(
        this.app,
        "Reset this note’s layout?",
        "Return all floating blocks to normal text flow and remove all drawings in this note. Original Markdown text will not be deleted.",
        "Reset layout",
        () => {
          this.setMode("select");
          this.selection.select(null);
          this.history.push(this.cb.read().drawings);
          this.future = [];
          this.cb.reset();
        },
      ),
    );
    this.catcher = document.createElement("div");
    this.catcher.className = "cv-drawing-catcher";
    this.catcher.hidden = true;
    this.catcher.setAttribute("aria-label", "Draw inside this note");
    view.scrollDOM.append(this.catcher);
    this.catcher.onpointerdown = (e) => this.beginDrawing(e);
    const scroll = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        this.positionCatcher();
        this.selection.position();
      });
    };
    view.scrollDOM.addEventListener("scroll", scroll, { passive: true });
    this.cleanups.push(() =>
      view.scrollDOM.removeEventListener("scroll", scroll),
    );
    const deselect = (e: PointerEvent) => {
      if (!(e.target instanceof Element)) return;
      if (
        !e.target.closest(
          ".cv-floating-block,.cv-drawing-object,.cv-tool-dock,.cv-context-toolbar",
        )
      )
        this.selection.select(null);
    };
    view.dom.addEventListener("pointerdown", deselect);
    this.cleanups.push(() =>
      view.dom.removeEventListener("pointerdown", deselect),
    );
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea,input,.cm-content")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.disposeDrawing?.();
        this.setMode("select");
        this.selection.select(null);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        (target.closest(".cv-tool-dock,.cv-drawing-object") ||
          this.selection.current?.root.classList.contains("cv-drawing-object"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        (e.shiftKey ? this.redo : this.undo).call(this);
      }
    };
    view.dom.addEventListener("keydown", key, true);
    this.cleanups.push(() =>
      view.dom.removeEventListener("keydown", key, true),
    );
  }
  private divider() {
    const d = document.createElement("span");
    d.className = "cv-tool-divider";
    d.setAttribute("aria-hidden", "true");
    return d;
  }
  setMode(mode: string) {
    if (mode !== this.mode) this.disposeDrawing?.();
    this.mode = mode;
    this.layer.classList.toggle("is-drawing-mode", mode !== "select");
    if (mode !== "select") this.selection.select(null);
    for (const b of Array.from(
      this.dock.querySelectorAll<HTMLButtonElement>("[data-tool]"),
    ))
      b.setAttribute("aria-pressed", String(b.dataset.tool === mode));
    this.catcher.hidden =
      mode === "select" || !this.cb.read().enabled || !this.cb.read().live;
    if (!this.catcher.hidden) this.positionCatcher();
  }
  private positionCatcher() {
    if (this.catcher.hidden) return;
    const s = this.view.scrollDOM;
    Object.assign(this.catcher.style, {
      left: s.scrollLeft + "px",
      top: s.scrollTop + "px",
      width: s.clientWidth + "px",
      height: s.clientHeight + "px",
    });
  }
  sync() {
    const state = this.cb.read();
    if (state.path !== this.path) {
      this.path = state.path;
      this.history = [];
      this.future = [];
      this.selection.select(null);
      this.setMode("select");
    }
    const show = state.enabled && state.live && !!state.path;
    this.dock.hidden = !show;
    if (!show) this.setMode("select");
    for (const [id, obj] of this.shapes)
      if (!show || !state.drawings.some((d) => d.id === id)) {
        obj.destroy();
        this.shapes.delete(id);
      }
    if (show)
      for (const d of state.drawings) {
        let object = this.shapes.get(d.id);
        if (!object) {
          object = new DrawingObject(
            d,
            this.view,
            this.layer,
            this.selection,
            (next) => this.change(next),
            () => this.remove(d.id),
          );
          this.shapes.set(d.id, object);
        }
        if (object.value !== d) object.update(d);
      }
    for (const label of ["Undo drawing", "Redo drawing"]) {
      const button = this.dock.querySelector<HTMLButtonElement>(
        `[aria-label="${label}"]`,
      );
      if (button)
        button.disabled =
          label === "Undo drawing" ? !this.history.length : !this.future.length;
    }
    this.selection.position();
  }
  change(value: Drawing) {
    this.commit(
      this.cb.read().drawings.map((d) => (d.id === value.id ? value : d)),
    );
  }
  remove(id: string) {
    this.commit(this.cb.read().drawings.filter((d) => d.id !== id));
    this.dock
      .querySelector<HTMLButtonElement>("[data-tool=select]")
      ?.focus({ preventScroll: true });
  }
  private commit(next: Drawing[]) {
    this.history.push(this.cb.read().drawings);
    if (this.history.length > 40) this.history.shift();
    this.future = [];
    this.cb.setDrawings(next);
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.push(this.cb.read().drawings);
    this.cb.setDrawings(previous);
  }
  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.cb.read().drawings);
    this.cb.setDrawings(next);
  }
  private point(e: PointerEvent): [number, number] {
    const rect = this.view.scrollDOM.getBoundingClientRect();
    return [
      limit(e.clientX - rect.left + this.view.scrollDOM.scrollLeft, 0, 50000),
      limit(e.clientY - rect.top + this.view.scrollDOM.scrollTop, 0, 50000),
    ];
  }
  private beginDrawing(event: PointerEvent) {
    if (event.button !== 0 || this.mode === "select") return;
    event.preventDefault();
    event.stopPropagation();
    this.disposeDrawing?.();
    const mode = this.mode;
    const kind: DrawingKind =
      mode === "highlighter" ? "pen" : (mode as DrawingKind);
    const points: [number, number][] = [this.point(event)];
    let frame = 0;
    let ended = false;
    let value: Drawing | null = null;
    this.draft = document.createElement("div");
    this.draft.className = "cv-drawing-preview";
    this.layer.append(this.draft);
    const paint = () => {
      frame = 0;
      value = drawingFromPoints(
        kind,
        points,
        mode === "highlighter" ? "#EAC26B" : "currentColor",
        mode === "highlighter" ? 16 : 2,
        mode === "highlighter" ? 0.35 : 1,
      );
      if (!value || !this.draft) return;
      Object.assign(this.draft.style, {
        left: value.x + "px",
        top: value.y + "px",
        width: value.width + "px",
        height: value.height + "px",
      });
      this.draft.replaceChildren(drawingSVG(value));
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      const p = this.point(e);
      if (kind === "pen") {
        const last = points[points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
        if (points.length < 5000) points.push(p);
        else points[points.length - 1] = p;
      } else points[1] = p;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const finish = (cancel: boolean) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancelEvent);
      window.removeEventListener("blur", blur);
      if (!cancel) paint();
      this.draft?.remove();
      this.draft = null;
      this.disposeDrawing = null;
      if (!cancel && value) {
        const id = value.id;
        this.commit([...this.cb.read().drawings, value]);
        this.selection.select(this.shapes.get(id) ?? null);
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === event.pointerId) {
        move(e);
        finish(false);
      }
    };
    const cancelEvent = (e: PointerEvent) => {
      if (e.pointerId === event.pointerId) finish(true);
    };
    const blur = () => finish(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancelEvent);
    window.addEventListener("blur", blur);
    this.disposeDrawing = () => finish(true);
  }
  destroy() {
    this.disposeDrawing?.();
    cancelAnimationFrame(this.scrollFrame);
    this.cleanups.forEach((f) => f());
    this.shapes.forEach((o) => o.destroy());
    this.shapes.clear();
    this.catcher.remove();
    this.dock.remove();
    this.view.dom.classList.remove("cv-design-editor");
  }
}
class DrawingObject implements Selectable {
  root: HTMLElement;
  toolbar: HTMLElement;
  id: string;
  private visual: HTMLElement;
  private cancelGesture: (() => void) | null = null;
  constructor(
    public value: Drawing,
    private view: EditorView,
    parent: HTMLElement,
    private selection: Selection,
    private change: (d: Drawing) => void,
    public remove: () => void,
  ) {
    this.id = value.id;
    this.root = document.createElement("div");
    this.root.className = "cv-drawing-object";
    this.root.tabIndex = 0;
    this.root.onfocus = () => this.selection.select(this);
    this.root.addEventListener("focusin", () => this.selection.select(this));
    this.root.setAttribute("aria-label", value.kind + " drawing");
    parent.append(this.root);
    this.toolbar = document.createElement("div");
    this.toolbar.className = "cv-context-toolbar";
    this.toolbar.setAttribute("role", "toolbar");
    this.toolbar.setAttribute("aria-label", "Selected drawing tools");
    this.root.append(this.toolbar);
    const grip = iconButton(this.toolbar, "move", "Move drawing", () =>
      this.select(),
    );
    grip.onpointerdown = (e) => this.gesture(e);
    iconButton(this.toolbar, "palette", "Drawing color", () =>
      this.properties("color"),
    );
    iconButton(this.toolbar, "sliders-horizontal", "Brush thickness", () =>
      this.properties("width"),
    );
    const del = iconButton(this.toolbar, "trash-2", "Delete this drawing", () =>
      this.remove(),
    );
    del.classList.add("cv-danger");
    this.visual = document.createElement("div");
    this.visual.className = "cv-drawing-visual";
    this.root.append(this.visual);
    addHandles(
      this.root,
      (e, h) => this.gesture(e, h),
      (e, h) => this.key(e, h),
    );
    this.root.onpointerdown = (e) => {
      if ((e.target as Element).closest("button,.cv-property-popover")) return;
      this.gesture(e);
    };
    this.root.onkeydown = (e) => {
      if (e.target instanceof HTMLButtonElement) return;
      this.key(e);
    };
    this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.update(value);
  }
  position = () => this.value;
  private select() {
    this.selection.select(this);
    this.root.focus({ preventScroll: true });
  }
  update(value: Drawing) {
    const old = this.value;
    this.value = value;
    Object.assign(this.root.style, {
      left: value.x + "px",
      top: value.y + "px",
      width: value.width + "px",
      height: value.height + "px",
    });
    if (
      !this.visual.firstChild ||
      old.kind !== value.kind ||
      old.width !== value.width ||
      old.height !== value.height ||
      old.points !== value.points ||
      old.stroke !== value.stroke ||
      old.strokeWidth !== value.strokeWidth ||
      old.opacity !== value.opacity
    )
      this.visual.replaceChildren(drawingSVG(value));
  }
  private properties(type: string) {
    this.root.querySelector(".cv-property-popover")?.remove();
    const menu = document.createElement("div");
    menu.className = "cv-property-popover";
    menu.setAttribute("role", "group");
    menu.setAttribute(
      "aria-label",
      type === "color" ? "Stroke colors" : "Brush weights",
    );
    this.toolbar.append(menu);
    if (type === "color") {
      for (const color of [
        "currentColor",
        "#2783DE",
        "#46A171",
        "#D5803B",
        "#E56458",
      ]) {
        const b = document.createElement("button");
        b.className = "cv-color-swatch";
        b.style.setProperty(
          "--swatch",
          color === "currentColor" ? "var(--text-normal)" : color,
        );
        b.setAttribute("aria-label", "Stroke " + color);
        b.setAttribute("aria-pressed", String(this.value.stroke === color));
        b.onclick = () => {
          this.change({ ...this.value, stroke: color });
          menu.remove();
        };
        menu.append(b);
      }
    } else
      for (const width of [2, 4, 8, 16]) {
        const b = document.createElement("button");
        b.textContent = String(width);
        b.setAttribute("aria-label", "Stroke width " + width);
        b.setAttribute(
          "aria-pressed",
          String(this.value.strokeWidth === width),
        );
        b.onclick = () => {
          this.change({ ...this.value, strokeWidth: width });
          menu.remove();
        };
        menu.append(b);
      }
    this.selection.position();
    const rect = this.view.scrollDOM.getBoundingClientRect();
    const bar = this.toolbar.getBoundingClientRect();
    menu.style.left =
      Math.min(0, rect.right - 8 - bar.left - menu.offsetWidth) + "px";
  }
  private gesture(e: PointerEvent, h?: Handle) {
    if (e.button !== 0) return;
    this.select();
    this.cancelGesture?.();
    const start = { ...this.value };
    this.cancelGesture = previewGesture(e, {
      scroller: this.view.scrollDOM,
      root: this.root,
      start,
      explicitHeight: true,
      project: (dx, dy) =>
        h
          ? resized(start, dx, dy, h)
          : {
              ...start,
              x: limit(start.x + dx, 0, 50000),
              y: limit(start.y + dy, 0, 50000),
            },
      commit: (p) => {
        this.change({ ...this.value, ...p });
        this.selection.position();
      },
      end: () => (this.cancelGesture = null),
    });
  }
  private key(e: KeyboardEvent, h?: Handle) {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      this.remove();
      return;
    }
    if (e.key === "Escape") {
      this.selection.select(null);
      return;
    }
    const d: Record<string, number[]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!d[e.key]) return;
    e.preventDefault();
    e.stopPropagation();
    this.select();
    const [dx, dy] = d[e.key].map((n) => n * (e.shiftKey ? 10 : 1));
    this.change({
      ...this.value,
      ...(h
        ? resized(this.value, dx, dy, h)
        : {
            x: limit(this.value.x + dx, 0, 50000),
            y: limit(this.value.y + dy, 0, 50000),
          }),
    });
    this.selection.position();
  }
  destroy() {
    this.cancelGesture?.();
    this.selection.remove(this);
    this.root.remove();
  }
}
