import { objectCameraX, setObjectCamera, revealObject } from "./object-camera";
import { routeConnector, targetAt, Target } from "./connectors";
import { App, Modal, Notice, setIcon } from "obsidian";
import { EditorView } from "@codemirror/view";
import {
  Drawing,
  DrawingKind,
  drawingFromPoints,
  Placement,
  limit,
  STICKERS,
  rotatedBounds,
  rotatedResize,
  PluginPreferences,
  tapeOnSticky,
} from "./model";
import {
  Selection,
  Selectable,
  iconButton,
  addHandles,
  Handle,
  previewGesture,
  resized,
  leftGrip,
  rotationField,
  rotationHandle,
  actionMenu,
  alignmentActions,
  copyText,
  layerActions,
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
    pins: (Placement & { id: string })[];
  };
  setDrawings: (next: Drawing[]) => void;
  reset: () => void;
  toggle: () => void;
  getPreferences: () => PluginPreferences;
  openPreferences: () => void;
  importImage: (
    file: File,
    path: string,
  ) => Promise<{ assetPath: string; width: number; height: number }>;
  imageURL: (path: string) => string;
  notify: (message: string) => void;
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
  } else if (d.kind === "triangle") {
    shape = document.createElementNS(NS, "polygon");
    shape.setAttribute(
      "points",
      `${d.width / 2},1 ${d.width - 1},${d.height - 1} 1,${d.height - 1}`,
    );
  } else if (d.kind === "tape") {
    shape = document.createElementNS(NS, "polygon");
    const w = d.width,
      h = d.height;
    shape.setAttribute(
      "points",
      `0,0 ${w},2 ${w - 5},${h * 0.25} ${w},${h * 0.5} ${w - 6},${h * 0.75} ${w},${h} 2,${h - 1} 7,${h * 0.75} 1,${h * 0.5} 6,${h * 0.25}`,
    );
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
    ["rect", "ellipse", "diamond", "triangle", "tape"].includes(d.kind)
      ? (d.fill ?? "none")
      : "none",
  );
  shape.setAttribute("stroke", d.kind === "tape" ? "none" : d.stroke);
  shape.setAttribute("stroke-width", String(d.strokeWidth));
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  shape.setAttribute("vector-effect", "non-scaling-stroke");
  shape.setAttribute("opacity", String(d.opacity));
  svg.append(shape);
  if (d.kind === "arrow" || d.kind === "connector") {
    const pts = d.points ?? [
      [0, 0],
      [1, 1],
    ];
    const a = pts[pts.length - 2],
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
  private connectorStart: string | null = null;
  private routePins: Target[] | null = null;
  private routeDrawings: Drawing[] | null = null;
  private routed = new Map<string, Drawing>();
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
    this.dock.contentEditable = "false";
    this.dock.addEventListener("mousedown", (e) => e.stopPropagation());
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
    const select = iconButton(
      this.dock,
      "mouse-pointer-2",
      "Select objects",
      () => this.setMode("select"),
    );
    select.dataset.tool = "select";
    const objectView = iconButton(this.dock, "hand", "Object view", () =>
      actionMenu(objectView, [
        {
          label: "View space to the left",
          icon: "arrow-left",
          run: () =>
            setObjectCamera(
              view.scrollDOM,
              objectCameraX(view.scrollDOM) + view.scrollDOM.clientWidth / 2,
            ),
        },
        {
          label: "Show selected object",
          icon: "focus",
          run: () => {
            const item = this.selection.current;
            if (item)
              revealObject(view.scrollDOM, item.bounds?.() ?? item.position());
            else this.cb.notify("Select an object first.");
          },
        },
        {
          label: "Reset object view",
          icon: "focus",
          run: () => setObjectCamera(view.scrollDOM, 0),
        },
        {
          label: "View space to the right",
          icon: "arrow-right",
          run: () =>
            setObjectCamera(
              view.scrollDOM,
              objectCameraX(view.scrollDOM) - view.scrollDOM.clientWidth / 2,
            ),
        },
      ]),
    );
    objectView.title =
      "Object view · Alt+wheel to pan objects without moving the note";
    const groups = [
      ["Draw tools", "pen-tool", ["pen", "highlighter"]],
      [
        "Shapes and lines",
        "shapes",
        [
          "rect",
          "ellipse",
          "diamond",
          "triangle",
          "line",
          "arrow",
          "connector",
          "tape",
        ],
      ],
      [
        "Notes and labels",
        "sticky-note",
        ["sticky", "label", "text", "section", "table", "code"],
      ],
      ["Stickers", "smile", ["sticker"]],
      ["Images and icons", "image-plus", ["image", "icon"]],
    ] as const;
    for (const [label, icon, modes] of groups) {
      const b = iconButton(this.dock, icon, label, () =>
        this.openGroup(label, [...modes]),
      );
      b.dataset.group = label;
      b.setAttribute("aria-expanded", "false");
    }
    iconButton(this.dock, "settings", "Plugin settings", () =>
      this.cb.openPreferences(),
    );
    const toggle = iconButton(
      this.dock,
      "toggle-right",
      "Toggle note effects",
      () => this.cb.toggle(),
    );
    toggle.dataset.persistent = "true";
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
          ".cv-floating-block,.cv-drawing-object,.cv-tool-dock,.cv-context-toolbar,.menu",
        )
      )
        this.selection.select(null);
    };
    view.dom.addEventListener("pointerdown", deselect);
    this.cleanups.push(() =>
      view.dom.removeEventListener("pointerdown", deselect),
    );
    const outsideEditor = (e: PointerEvent) => {
      if (
        (e.target as Element)?.closest(
          ".modal-container,.modal,.test-modal-backdrop,.menu",
        )
      )
        return;
      if (!view.dom.contains(e.target as Node)) this.selection.select(null);
    };
    view.dom.ownerDocument.addEventListener("pointerdown", outsideEditor, true);
    this.cleanups.push(() =>
      view.dom.ownerDocument.removeEventListener(
        "pointerdown",
        outsideEditor,
        true,
      ),
    );
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea,input,select,.cm-content")) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        ["BracketLeft", "BracketRight"].includes(e.code) &&
        this.selection.current
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.selection.reorder(
          e.code === "BracketRight"
            ? e.shiftKey
              ? "front"
              : "forward"
            : e.shiftKey
              ? "back"
              : "backward",
        );
        return;
      }
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
  private names: Record<string, string> = {
    pen: "Draw with pen",
    highlighter: "Draw with highlighter",
    tape: "Add decorative tape",
    rect: "Draw rectangle",
    ellipse: "Draw ellipse",
    diamond: "Draw diamond",
    triangle: "Draw triangle",
    line: "Draw line",
    arrow: "Draw arrow",
    connector: "Connect objects",
    sticky: "Add sticky note",
    label: "Add label",
    text: "Add text annotation",
    section: "Add section",
    table: "Add table annotation",
    code: "Add code annotation",
    sticker: "Add sticker",
    image: "Import image from computer",
    icon: "Add Obsidian icon",
  };
  private openGroup(label: string, modes: readonly string[]) {
    this.tray.replaceChildren();
    this.tray.hidden = false;
    const title = document.createElement("div");
    title.className = "cv-tray-title";
    title.textContent = label;
    this.tray.append(title);
    const grid = document.createElement("div");
    grid.className = "cv-tool-choices";
    this.tray.append(grid);
    const icons: Record<string, string> = {
      pen: "pencil",
      highlighter: "highlighter",
      tape: "ticket",
      rect: "square",
      ellipse: "circle",
      diamond: "diamond",
      triangle: "triangle",
      line: "minus",
      arrow: "arrow-up-right",
      connector: "workflow",
      sticky: "sticky-note",
      label: "tag",
      text: "type",
      section: "group",
      table: "table",
      code: "code",
      sticker: "stamp",
      image: "image-plus",
      icon: "search",
    };
    for (const mode of modes) {
      const b = iconButton(grid, icons[mode], this.names[mode], () => {
        if (mode === "image") {
          this.pickImage();
          return;
        }
        const close =
          this.mode === mode && b.getAttribute("aria-pressed") === "true";
        this.setMode(mode);
        if (!close) this.openOptions();
      });
      b.dataset.tool = mode;
      b.setAttribute("aria-pressed", String(this.mode === mode));
      const text = document.createElement("span");
      text.textContent = this.names[mode];
      b.append(text);
    }
  }
  private pickImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.setAttribute("aria-label", "Choose local image");
    input.className = "cv-file-input";
    this.dock.append(input);
    input.oncancel = () => input.remove();
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const path = this.cb.read().path;
      try {
        const asset = await this.cb.importImage(file, path);
        const state = this.cb.read();
        if (state.path !== path || !state.enabled || !this.dock.isConnected) {
          this.cb.notify(
            "Image copied to vault; note changed before placement. The file was kept.",
          );
          return;
        }
        const s = this.view.scrollDOM;
        const value: Drawing = {
          ...defaultStyle("image"),
          ...asset,
          id: crypto.randomUUID(),
          kind: "image",
          x:
            s.scrollLeft -
            objectCameraX(s) +
            Math.max(40, (s.clientWidth - asset.width) / 2),
          y: s.scrollTop + 100,
        };
        this.commit([...state.drawings, value]);
        this.setMode("select");
        this.selection.select(this.shapes.get(value.id) ?? null);
      } catch (e) {
        this.cb.notify(String(e));
      }
    };
    input.click();
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
      this.cb.openPreferences();
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
    const close = iconButton(this.tray, "x", "Close tool settings", () => {
      this.tray.hidden = true;
    });
    close.classList.add("cv-tray-close");
    stylePanel(this.tray, this.mode, this.settings(), (patch) => {
      this.options.set(this.mode, { ...this.settings(), ...patch });
      this.cb.saveDefault(this.mode, this.settings());
    });
    this.tray.hidden = false;
  }
  setMode(mode: string) {
    if (mode !== this.mode) this.disposeDrawing?.();
    this.mode = mode;
    this.connectorStart = null;
    this.layer
      .querySelectorAll(".is-connector-source,.is-connector-target")
      .forEach((e) =>
        e.classList.remove("is-connector-source", "is-connector-target"),
      );
    const groupFor: Record<string, string> = {
      pen: "Draw tools",
      highlighter: "Draw tools",
      tape: "Shapes and lines",
      connector: "Shapes and lines",
      rect: "Shapes and lines",
      ellipse: "Shapes and lines",
      diamond: "Shapes and lines",
      triangle: "Shapes and lines",
      line: "Shapes and lines",
      arrow: "Shapes and lines",
      sticky: "Notes and labels",
      label: "Notes and labels",
      text: "Notes and labels",
      section: "Notes and labels",
      table: "Notes and labels",
      code: "Notes and labels",
      sticker: "Stickers",
      icon: "Images and icons",
    };
    this.dock
      .querySelectorAll<HTMLButtonElement>("[data-group]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.group === groupFor[mode]),
        ),
      );
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
    this.dock.hidden = !state.live || !state.path;
    this.dock.classList.toggle("cv-effects-off", !state.enabled);
    const toggle = this.dock.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle note effects"]',
    );
    toggle?.setAttribute("aria-pressed", String(state.enabled));
    toggle?.setAttribute(
      "title",
      state.enabled ? "Disable note effects" : "Enable note effects",
    );
    if (toggle) setIcon(toggle, state.enabled ? "toggle-right" : "toggle-left");
    const prefs = this.cb.getPreferences();
    this.view.scrollDOM.classList.toggle("cv-dot-grid", show && prefs.dotGrid);
    this.view.scrollDOM.style.setProperty(
      "--cv-grid-spacing",
      prefs.gridSpacing + "px",
    );
    this.view.scrollDOM.style.setProperty(
      "--cv-grid-opacity",
      String(prefs.gridOpacity),
    );
    if (!show) this.setMode("select");
    for (const [id, obj] of this.shapes)
      if (!show || !state.drawings.some((d) => d.id === id)) {
        obj.destroy();
        this.shapes.delete(id);
      }
    if (
      state.pins !== this.routePins ||
      state.drawings !== this.routeDrawings
    ) {
      this.routePins = state.pins;
      this.routeDrawings = state.drawings;
      this.routed.clear();
      const targets = this.targets();
      for (const d of state.drawings)
        if (d.kind === "connector" || d.sourceId || d.targetId)
          this.routed.set(d.id, routeConnector(d, targets));
    }
    if (show)
      for (const saved of state.drawings) {
        const d = this.routed.get(saved.id) ?? saved;
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
            (path) => this.cb.imageURL(path),
            () => this.duplicate(d.id),
            () => this.tapeSticky(d.id),
            (p) => this.previewChildren(d.id, p),
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
    this.selection.refreshLayers();
    this.selection.position();
  }
  change(value: Drawing) {
    const all = this.cb.read().drawings,
      old = all.find((d) => d.id === value.id);
    if (value.parentId) {
      const parent = all.find((d) => d.id === value.parentId);
      if (old && (old.x !== value.x || old.y !== value.y))
        value = { ...value, parentId: undefined };
      else if (parent)
        value = {
          ...value,
          rotationOffset: (value.rotation ?? 0) - (parent.rotation ?? 0),
        };
    }
    this.commit(
      all.map((d) =>
        d.id === value.id
          ? value
          : d.parentId === value.id
            ? tapeOnSticky(d, value)
            : d,
      ),
    );
  }
  previewTarget(id: string, placement: Placement | null) {
    const targets = this.targets().map((t) =>
      t.id === id && placement ? { ...t, ...placement } : t,
    );
    for (const obj of this.shapes.values())
      if (
        obj.value.kind === "connector" ||
        obj.value.sourceId ||
        obj.value.targetId
      )
        obj.update(routeConnector(obj.value, targets));
  }
  private previewChildren(id: string, placement: Placement | null) {
    this.previewTarget(id, placement);
    const parent = this.shapes.get(id);
    if (!parent) return;
    for (const child of this.shapes.values())
      if (child.value.parentId === id) {
        if (placement)
          child.previewPlacement(
            tapeOnSticky(child.value, { ...parent.value, ...placement }),
          );
        else child.update(child.value);
      }
  }
  private tapeSticky(id: string) {
    const parent = this.cb.read().drawings.find((d) => d.id === id);
    if (!parent) return;
    const tape = tapeOnSticky(
      {
        ...(this.options.get("tape") ??
          this.cb.getDefaults().tape ??
          defaultStyle("tape")),
        id: crypto.randomUUID(),
        kind: "tape",
        x: 0,
        y: 0,
        width: Math.min(140, parent.width * 0.65),
        height: 32,
        rotationOffset: -8,
      },
      parent,
    );
    this.commit([...this.cb.read().drawings, tape]);
    this.selection.select(this.shapes.get(tape.id) ?? null);
  }
  private duplicate(id: string) {
    const old = this.cb.read().drawings.find((d) => d.id === id);
    if (!old) return;
    const next = {
      ...old,
      id: crypto.randomUUID(),
      x: limit(old.x + 32, -50000, 50000),
      y: limit(old.y + 32, 0, 50000),
      parentId: undefined,
    };
    this.commit([...this.cb.read().drawings, next]);
    this.selection.select(this.shapes.get(next.id) ?? null);
  }
  remove(id: string) {
    this.commit(
      this.cb
        .read()
        .drawings.filter(
          (d) =>
            d.id !== id &&
            d.parentId !== id &&
            d.sourceId !== id &&
            d.targetId !== id,
        ),
    );
    this.dock
      .querySelector<HTMLButtonElement>("[data-tool=select]")
      ?.focus({ preventScroll: true });
  }
  private commit(next: Drawing[]) {
    const state = this.cb.read(),
      ids = new Set(state.drawings.map((d) => d.id));
    let top = Math.max(
      0,
      ...state.pins.map((p) => p.layer ?? 0),
      ...state.drawings.map((d) => d.layer ?? 0),
    );
    next = next.map((d) => (ids.has(d.id) ? d : { ...d, layer: ++top }));
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
      limit(
        e.clientX -
          rect.left -
          this.view.scrollDOM.clientLeft +
          this.view.scrollDOM.scrollLeft -
          objectCameraX(this.view.scrollDOM),
        -50000,
        50000,
      ),
      limit(e.clientY - rect.top + this.view.scrollDOM.scrollTop, 0, 50000),
    ];
  }
  private targets(): Target[] {
    const state = this.cb.read();
    return [
      ...state.pins,
      ...state.drawings.filter(
        (d) => !["connector", "line", "arrow", "pen", "tape"].includes(d.kind),
      ),
    ];
  }
  private connectAt(event: PointerEvent) {
    const target = targetAt(this.point(event), this.targets());
    if (!target) {
      this.cb.notify("Click a shape or text block to connect it.");
      return;
    }
    if (!this.connectorStart) {
      this.connectorStart = target.id;
      this.layer
        .querySelectorAll<HTMLElement>(".cv-drawing-object,.cv-floating-block")
        .forEach((el) =>
          el.classList.toggle(
            "is-connector-source",
            el.dataset.id === target.id,
          ),
        );
      this.cb.notify("Now click the destination object.");
      return;
    }
    if (this.connectorStart === target.id) return;
    const sourceId = this.connectorStart;
    const value = routeConnector(
      {
        ...this.settings(),
        id: crypto.randomUUID(),
        kind: "connector",
        sourceId,
        targetId: target.id,
        x: 0,
        y: 0,
        width: 2,
        height: 2,
      },
      this.targets(),
    );
    this.commit([...this.cb.read().drawings, value]);
    this.setMode("select");
    this.selection.select(this.shapes.get(value.id) ?? null);
  }
  private beginDrawing(event: PointerEvent) {
    if (event.button !== 0 || this.mode === "select") return;
    event.preventDefault();
    event.stopPropagation();
    this.disposeDrawing?.();
    this.tray.hidden = true;
    const mode = this.mode;
    if (mode === "connector") {
      this.connectAt(event);
      return;
    }
    const settings = { ...this.settings() };
    if (
      [
        "sticky",
        "label",
        "sticker",
        "tape",
        "icon",
        "text",
        "section",
        "table",
        "code",
      ].includes(mode)
    ) {
      const [x, y] = this.point(event);
      const value: Drawing = {
        id: crypto.randomUUID(),
        kind: mode as DrawingKind,
        x,
        y,
        width: ["sticker", "icon"].includes(mode)
          ? 80
          : mode === "tape"
            ? 160
            : ["section", "table", "code"].includes(mode)
              ? 400
              : mode === "label"
                ? 180
                : 240,
        height: ["sticker", "icon"].includes(mode)
          ? 80
          : mode === "tape"
            ? 36
            : mode === "label" || mode === "text"
              ? 64
              : 200,
        ...settings,
        text:
          mode === "sticky"
            ? "Your idea…"
            : mode === "label"
              ? "Label"
              : mode === "text"
                ? "Text"
                : mode === "section"
                  ? "Section"
                  : mode === "table"
                    ? "First cell\tSecond cell\nThird cell\tFourth cell"
                    : mode === "code"
                      ? 'const idea = "space to think";'
                      : "",
      };
      this.commit([...this.cb.read().drawings, value]);
      this.setMode("select");
      const object = this.shapes.get(value.id);
      this.selection.select(object ?? null);
      if (
        ["sticky", "label", "text", "section", "table", "code"].includes(mode)
      )
        object?.editText();
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
    this.view.scrollDOM.classList.remove("cv-dot-grid");
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
  private frame: HTMLElement;
  private updateGrip: () => void;
  alignGrip = () => this.updateGrip();
  private cancelRotate: () => void;
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
    private imageURL: (path: string) => string,
    private duplicate: () => void,
    private addTape: () => void,
    private children: (p: Placement | null) => void,
  ) {
    this.id = value.id;
    this.selection.register(this);
    this.root = document.createElement("div");
    this.root.className = "cv-drawing-object";
    this.root.dataset.id = value.id;
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
    if (
      ![
        "sticky",
        "label",
        "sticker",
        "image",
        "icon",
        "text",
        "section",
        "tape",
        "table",
        "code",
      ].includes(value.kind)
    ) {
      iconButton(this.toolbar, "palette", "Drawing color", () =>
        this.properties("color"),
      );
      iconButton(this.toolbar, "sliders-horizontal", "Brush thickness", () =>
        this.properties("width"),
      );
    }
    if (
      ["sticky", "label", "text", "section", "table", "code"].includes(
        value.kind,
      )
    )
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
    if (value.kind === "sticky")
      iconButton(this.toolbar, "tape", "Add tape to sticky", () =>
        this.addTape(),
      );
    iconButton(this.toolbar, "copy", "Duplicate object", () =>
      this.duplicate(),
    );
    this.frame = document.createElement("div");
    this.frame.className = "cv-rotated-frame";
    this.root.append(this.frame);
    this.updateGrip = leftGrip(
      this.root,
      () => this.value,
      (e) => this.gesture(e),
      (e) => this.key(e),
      () => this.menu(),
    );
    this.cancelRotate = rotationHandle(
      this.root,
      this.frame,
      () => this.value,
      (n) => {
        this.change({ ...this.value, rotation: n });
        this.selection.position();
      },
      (p) => this.children(p),
    );
    this.visual = document.createElement("div");
    this.visual.className = "cv-drawing-visual";
    this.frame.append(this.visual);
    addHandles(
      this.frame,
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
  previewPlacement(p: Placement) {
    Object.assign(this.root.style, {
      left: p.x + "px",
      top: p.y + "px",
      width: p.width + "px",
      height: p.height + "px",
    });
    this.frame.style.rotate = (p.rotation ?? 0) + "deg";
  }
  setLayer = (layer: number) => this.change({ ...this.value, layer });
  menu = () => {
    this.select();
    const actions = [
      {
        label: "Appearance and text size",
        icon: "palette",
        run: () => this.openSettings(),
      },
      ...layerActions(this.selection, this),
      { label: "Duplicate", icon: "copy", run: () => this.duplicate() },
      { label: "Delete", icon: "trash-2", run: () => this.remove() },
    ];
    if (
      ["sticky", "label", "text", "section", "table", "code"].includes(
        this.value.kind,
      )
    )
      actions.unshift({
        label: "Edit text",
        icon: "pencil",
        run: () => this.editText(),
      });
    if (
      this.value.kind !== "connector" &&
      !this.value.sourceId &&
      !this.value.targetId
    ) {
      actions.splice(
        1,
        0,
        ...alignmentActions(this.view.scrollDOM, this.position, (p) =>
          this.change({ ...this.value, ...p }),
        ),
        {
          label: "Reset rotation",
          icon: "rotate-ccw",
          run: () => this.change({ ...this.value, rotation: 0 }),
        },
      );
    }
    if (this.value.text)
      actions.unshift({
        label: "Copy text",
        icon: "clipboard-copy",
        run: () => copyText(this.value.text!, (m) => new Notice(m)),
      });
    actionMenu(
      this.root.querySelector<HTMLElement>(".cv-object-grip")!,
      actions,
    );
  };
  position = () => this.value;
  bounds = () => rotatedBounds(this.value);
  openSettings = () => this.properties("all");
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
    this.selection.refreshLayers();
    this.frame.style.rotate = (value.rotation ?? 0) + "deg";
    this.root.classList.toggle(
      "is-attached-connector",
      value.kind === "connector" || !!value.sourceId || !!value.targetId,
    );
    this.updateGrip();
    if (this.input) this.input.style.fontSize = (value.fontSize ?? 18) + "px";
    // Changes to geometry do not replace an in-progress text editor.
    if (!this.editing && (!this.visual.firstChild || old !== value))
      this.render();
  }
  private render() {
    const d = this.value;
    this.root.dataset.kind = d.kind;
    if (d.kind === "table") {
      const table = document.createElement("table");
      table.className = "cv-annotation-table";
      for (const line of (d.text ?? "").split("\n").slice(0, 16)) {
        const row = table.insertRow();
        for (const cell of line.split("\t").slice(0, 16)) {
          const td = row.insertCell();
          td.textContent = cell;
          td.dir = "auto";
        }
      }
      Object.assign(table.style, {
        fontSize: (d.fontSize ?? 18) + "px",
        color: d.stroke,
        background:
          d.fill && d.fill !== "none" ? d.fill : "var(--background-primary)",
        opacity: String(d.opacity),
      });
      this.visual.replaceChildren(table);
    } else if (d.kind === "code") {
      const pre = document.createElement("pre");
      pre.className = "cv-code-annotation";
      pre.textContent = d.text ?? "";
      Object.assign(pre.style, {
        fontSize: (d.fontSize ?? 16) + "px",
        color: d.stroke,
        background:
          d.fill && d.fill !== "none" ? d.fill : "var(--background-secondary)",
        opacity: String(d.opacity),
      });
      this.visual.replaceChildren(pre);
    } else if (["sticky", "label", "text", "section"].includes(d.kind)) {
      const text = document.createElement("div");
      text.className = "cv-annotation-text";
      text.dir = "auto";
      text.textContent = d.text ?? "";
      Object.assign(text.style, {
        background:
          d.fill && d.fill !== "none"
            ? d.fill
            : ["text", "section"].includes(d.kind)
              ? "transparent"
              : "#FFF0AD",
        color:
          d.stroke === "currentColor"
            ? ["text", "section"].includes(d.kind)
              ? "var(--text-normal)"
              : "#2C2C2B"
            : d.stroke,
        fontSize: (d.fontSize ?? 18) + "px",
        opacity: String(d.opacity),
      });
      this.visual.replaceChildren(text);
    } else if (d.kind === "image") {
      const img = document.createElement("img");
      img.alt = d.text || "Imported image";
      img.draggable = false;
      const url = d.assetPath ? this.imageURL(d.assetPath) : "";
      if (url) img.src = url;
      else img.alt = "Image file missing from vault";
      img.style.opacity = String(d.opacity);
      this.visual.replaceChildren(img);
    } else if (d.kind === "icon") {
      const el = document.createElement("div");
      el.className = "cv-placed-icon";
      el.style.color = d.stroke;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", d.iconId ?? "star");
      setIcon(el, d.iconId ?? "star");
      this.visual.replaceChildren(el);
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
    if (
      this.editing ||
      !["sticky", "label", "text", "section", "table", "code"].includes(
        this.value.kind,
      )
    )
      return;
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
      if (
        this.value.kind !== "connector" &&
        !this.value.sourceId &&
        !this.value.targetId
      )
        rotationField(menu, this.value.rotation ?? 0, (n) => {
          this.change({ ...this.value, rotation: n });
          this.selection.position();
        });
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
    if (this.value.kind === "connector") {
      this.select();
      return;
    }
    this.toolbar.querySelector(".cv-property-popover")?.remove();
    this.select();
    this.cancelGesture?.();
    const start = { ...this.value };
    this.cancelGesture = previewGesture(e, {
      scroller: this.view.scrollDOM,
      root: this.root,
      start,
      explicitHeight: true,
      autoPan: !h,
      preview: (p) => this.children(p),
      finishPreview: () => this.children(null),
      project: (dx, dy) =>
        h
          ? rotatedResize(start, dx, dy, h)
          : {
              ...start,
              x: limit(start.x + dx, -50000, 50000),
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
    if (!d[e.key] || this.value.kind === "connector") return;
    e.preventDefault();
    e.stopPropagation();
    this.select();
    const [dx, dy] = d[e.key].map((n) => n * (e.shiftKey ? 10 : 1));
    this.change({
      ...this.value,
      ...(h
        ? rotatedResize(this.value, dx, dy, h)
        : {
            x: limit(this.value.x + dx, -50000, 50000),
            y: limit(this.value.y + dy, 0, 50000),
          }),
    });
    revealObject(this.view.scrollDOM, this.bounds());
    this.selection.position();
  }
  destroy() {
    this.root.dispatchEvent(new Event("cv-destroy"));
    this.cancelRotate();
    if (this.editing && this.input && this.input.value !== this.value.text)
      this.recover(this.input.value);
    this.cancelGesture?.();
    this.selection.remove(this);
    this.root.remove();
  }
}
