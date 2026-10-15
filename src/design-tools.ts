import { App, Modal, setIcon } from "obsidian";
import { EditorView } from "@codemirror/view";
import {
  Drawing,
  DrawingKind,
  drawingFromPoints,
  Placement,
  limit,
  STICKERS,
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

import {
  defaultStyle,
  stylePanel,
  drawingStyle,
  ToolStyle,
} from "./tool-options";

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
  getDefaults: () => Record<string, ToolStyle>;
  saveDefault: (mode: string, style: ToolStyle) => void;
  recover: (path: string, text: string) => void;
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
  } else if (d.kind === "diamond") {
    shape = document.createElementNS(NS, "polygon");
    shape.setAttribute(
      "points",
      `${d.width / 2},1 ${d.width - 1},${d.height / 2} ${d.width / 2},${d.height - 1} 1,${d.height / 2}`,
    );
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
  shape.setAttribute(
    "fill",
    ["rect", "ellipse", "diamond"].includes(d.kind)
      ? (d.fill ?? "none")
      : "none",
  );
  shape.setAttribute("stroke", d.stroke);
  shape.setAttribute("stroke-width", String(d.strokeWidth));
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  shape.setAttribute("vector-effect", "non-scaling-stroke");
  shape.setAttribute("opacity", String(d.opacity));
  svg.append(shape);
  if (d.kind === "arrow") {
    const pts = d.points ?? [
      [0, 0],
      [1, 1],
    ];
    const a = pts[0],
      b = pts[pts.length - 1];
    const angle = Math.atan2((b[1] - a[1]) * d.height, (b[0] - a[0]) * d.width);
    const size = Math.max(12, d.strokeWidth * 3);
    const head = document.createElementNS(NS, "path");
    const x = b[0] * d.width,
      y = b[1] * d.height;
    head.setAttribute(
      "d",
      `M${x - size * Math.cos(angle - 0.5)},${y - size * Math.sin(angle - 0.5)} L${x},${y} L${x - size * Math.cos(angle + 0.5)},${y - size * Math.sin(angle + 0.5)}`,
    );
    head.setAttribute("stroke", d.stroke);
    head.setAttribute("stroke-width", String(d.strokeWidth));
    head.setAttribute("fill", "none");
    head.setAttribute("opacity", String(d.opacity));
    head.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(head);
  }
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
  private options = new Map<string, ToolStyle>();
  private tray: HTMLElement;
  private outside: (e: PointerEvent) => void;
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
    this.dock.dir = "ltr";
    view.dom.append(this.dock);
    this.tray = document.createElement("div");
    this.tray.className = "cv-tool-tray";
    this.tray.hidden = true;
    this.dock.append(this.tray);
    this.outside = (e) => {
      if (!(e.target as Element)?.closest(".cv-tool-dock"))
        this.tray.hidden = true;
    };
    view.dom.addEventListener("pointerdown", this.outside);
    this.cleanups.push(() =>
      view.dom.removeEventListener("pointerdown", this.outside),
    );
    const tools = [
      ["select", "mouse-pointer-2", "Select objects"],
      ["pen", "pencil", "Draw with pen"],
      ["highlighter", "highlighter", "Draw with highlighter"],
      ["rect", "square", "Draw rectangle"],
      ["ellipse", "circle", "Draw ellipse"],
      ["line", "minus", "Draw line"],
      ["diamond", "diamond", "Draw diamond"],
      ["arrow", "arrow-up-right", "Draw arrow"],
      ["sticky", "sticky-note", "Add sticky note"],
      ["label", "tag", "Add label"],
      ["sticker", "stamp", "Add sticker"],
    ];
    for (const [mode, icon, label] of tools) {
      const b = iconButton(this.dock, icon, label, () => {
        const close = this.mode === mode && !this.tray.hidden;
        this.setMode(mode);
        if (mode !== "select" && !close) this.openOptions();
      });
      b.dataset.tool = mode;
      b.setAttribute("aria-pressed", mode === "select" ? "true" : "false");
    }
    iconButton(this.dock, "sliders-horizontal", "Tool settings", () =>
      this.openOptions(),
    );
    this.dock.append(this.divider());
    iconButton(this.dock, "undo-2", "Undo drawing", () => this.undo());
    iconButton(this.dock, "redo-2", "Redo drawing", () => this.redo());
    this.dock.append(this.divider());
    iconButton(this.dock, "rotate-ccw", "Reset entire note layout", () =>
      confirmAction(
        this.app,
        "Reset this note’s layout?",
        "Return floating blocks to normal text flow and remove drawings, sticky notes, labels and stickers from this note. Original Markdown will not be deleted. Annotation text is stored in plugin data, not in Markdown.",
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
      if (target.closest("textarea,input,select,.cm-content")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.disposeDrawing?.();
        this.setMode("select");
        this.tray.hidden = true;
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
  private settings() {
    if (!this.options.has(this.mode))
      this.options.set(
        this.mode,
        this.cb.getDefaults()[this.mode] ?? defaultStyle(this.mode),
      );
    return this.options.get(this.mode)!;
  }
  private openOptions() {
    if (this.mode === "select") {
      this.tray.hidden = true;
      return;
    }
    this.tray.replaceChildren();
    const title = document.createElement("div");
    title.className = "cv-tray-title";
    title.textContent =
      (
        {
          pen: "Pen",
          highlighter: "Highlighter",
          sticky: "Sticky note",
          label: "Label",
          sticker: "Stickers",
        } as Record<string, string>
      )[this.mode] ?? "Shape";
    this.tray.append(title);
    stylePanel(this.tray, this.mode, this.settings(), (patch) => {
      this.options.set(this.mode, { ...this.settings(), ...patch });
      this.cb.saveDefault(this.mode, this.settings());
    });
    this.tray.hidden = false;
  }
  setMode(mode: string) {
    if (mode !== this.mode) this.disposeDrawing?.();
    this.mode = mode;
    this.tray.hidden = true;
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
            (text) => this.cb.recover(state.path, text),
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
    this.tray.hidden = true;
    const mode = this.mode;
    const settings = { ...this.settings() };
    if (["sticky", "label", "sticker"].includes(mode)) {
      const [x, y] = this.point(event);
      const value: Drawing = {
        id: crypto.randomUUID(),
        kind: mode as DrawingKind,
        x,
        y,
        width: mode === "sticker" ? 80 : mode === "label" ? 180 : 240,
        height: mode === "sticker" ? 80 : mode === "label" ? 64 : 200,
        ...settings,
        text:
          mode === "sticky" ? "Your idea…" : mode === "label" ? "Label" : "",
      };
      this.commit([...this.cb.read().drawings, value]);
      this.setMode("select");
      const object = this.shapes.get(value.id);
      this.selection.select(object ?? null);
      if (mode !== "sticker") object?.editText();
      return;
    }
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
        settings.stroke,
        settings.strokeWidth,
        settings.opacity,
      );
      if (!value || !this.draft) return;
      value.fill = settings.fill;
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
  private editing = false;
  private input: HTMLTextAreaElement | null = null;
  private cancelGesture: (() => void) | null = null;
  constructor(
    public value: Drawing,
    private view: EditorView,
    parent: HTMLElement,
    private selection: Selection,
    private change: (d: Drawing) => void,
    public remove: () => void,
    private recover: (text: string) => void,
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
    grip.onkeydown = (e) => this.key(e);
    if (!["sticky", "label", "sticker"].includes(value.kind)) {
      iconButton(this.toolbar, "palette", "Drawing color", () =>
        this.properties("color"),
      );
      iconButton(this.toolbar, "sliders-horizontal", "Brush thickness", () =>
        this.properties("width"),
      );
    }
    if (["sticky", "label"].includes(value.kind))
      iconButton(this.toolbar, "pencil", "Edit annotation text", () =>
        this.editText(),
      );
    iconButton(this.toolbar, "settings-2", "Object appearance", () =>
      this.properties("all"),
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
      if (
        (e.target as Element).closest(
          "button,input,textarea,.cv-property-popover",
        )
      )
        return;
      this.gesture(e);
    };
    this.root.ondblclick = () => this.editText();
    this.root.onkeydown = (e) => {
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
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
    // Changes to geometry do not replace an in-progress text editor.
    if (!this.editing && (!this.visual.firstChild || old !== value))
      this.render();
  }
  private render() {
    const d = this.value;
    this.root.dataset.kind = d.kind;
    if (d.kind === "sticky" || d.kind === "label") {
      const text = document.createElement("div");
      text.className = "cv-annotation-text";
      text.dir = "auto";
      text.textContent = d.text ?? "";
      Object.assign(text.style, {
        background: d.fill && d.fill !== "none" ? d.fill : "#FFF0AD",
        color: d.stroke === "currentColor" ? "#2C2C2B" : d.stroke,
        fontSize: (d.fontSize ?? 18) + "px",
        opacity: String(d.opacity),
      });
      this.visual.replaceChildren(text);
    } else if (d.kind === "sticker") {
      const stamp = STICKERS.find((s) => s.id === d.sticker) ?? STICKERS[0];
      const el = document.createElement("div");
      el.className = "cv-stamp-art";
      el.style.color = stamp.color;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", stamp.label);
      setIcon(el, stamp.icon);
      this.visual.replaceChildren(el);
    } else this.visual.replaceChildren(drawingSVG(d));
  }
  editText() {
    if (this.editing || !["sticky", "label"].includes(this.value.kind)) return;
    this.select();
    this.editing = true;
    this.root.classList.add("is-editing");
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "cv-annotation-edit";
    const input = document.createElement("textarea");
    this.input = input;
    input.dir = "auto";
    input.value = this.value.text ?? "";
    input.maxLength = 10000;
    input.setAttribute("aria-label", "Annotation text");
    input.style.fontSize = (this.value.fontSize ?? 18) + "px";
    const row = document.createElement("div");
    row.className = "cv-annotation-actions";
    const editButton = this.toolbar.querySelector<HTMLButtonElement>(
      '[aria-label="Edit annotation text"]',
    );
    if (editButton) editButton.hidden = true;
    this.toolbar.append(row);
    const finish = (save: boolean) => {
      const text = input.value;
      this.editing = false;
      this.input = null;
      this.root.classList.remove("is-editing");
      row.remove();
      if (editButton) editButton.hidden = false;
      if (save && text !== this.value.text)
        this.change({ ...this.value, text });
      this.render();
      this.root.focus({ preventScroll: true });
    };
    iconButton(row, "check", "Save annotation", () => finish(true));
    iconButton(row, "x", "Cancel annotation edit", () => finish(false));
    input.onkeydown = (e) => {
      if (e.isComposing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      }
    };
    wrap.append(input);
    this.visual.replaceChildren(wrap);
    input.focus({ preventScroll: true });
    input.select();
    this.selection.position();
  }
  private properties(type: string) {
    this.root.querySelector(".cv-property-popover")?.remove();
    const menu = document.createElement("div");
    menu.className = "cv-property-popover";
    menu.setAttribute("role", "group");
    menu.setAttribute(
      "aria-label",
      type === "all"
        ? "Object appearance settings"
        : type === "color"
          ? "Stroke colors"
          : "Brush weights",
    );
    this.toolbar.append(menu);
    if (type === "all") {
      menu.classList.add("cv-full-properties");
      stylePanel(menu, this.value.kind, drawingStyle(this.value), (patch) =>
        this.change({ ...this.value, ...patch }),
      );
    } else if (type === "color") {
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
      limit(
        0,
        rect.left + 8 - bar.left,
        rect.right - 8 - bar.left - menu.offsetWidth,
      ) + "px";
    menu.style.top =
      limit(
        bar.height + 6,
        rect.top + 8 - bar.top,
        rect.bottom - 8 - bar.top - menu.offsetHeight,
      ) + "px";
  }
  private gesture(e: PointerEvent, h?: Handle) {
    if (e.button !== 0) return;
    this.toolbar.querySelector(".cv-property-popover")?.remove();
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
    if ((e.target as Element).closest("input,textarea,select")) return;
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
    if (this.editing && this.input && this.input.value !== this.value.text)
      this.recover(this.input.value);
    this.cancelGesture?.();
    this.selection.remove(this);
    this.root.remove();
  }
}
