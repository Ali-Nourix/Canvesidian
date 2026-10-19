import { objectCameraX, setObjectCamera, edgePanSpeed } from "./object-camera";
import { Menu, setIcon } from "obsidian";
import { limit, Placement, rotatedBounds, normalizeAngle } from "./model";
export function iconButton(
  parent: HTMLElement,
  icon: string,
  label: string,
  callback: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-icon-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  setIcon(button, icon);
  button.onclick = callback;
  parent.append(button);
  return button;
}
export { resized } from "./model";
export type { Handle } from "./model";
import type { Handle } from "./model";
/** One animation-frame preview; no CodeMirror dispatch or storage in pointermove. */
export function previewGesture(
  event: PointerEvent,
  options: {
    scroller: HTMLElement;
    root: HTMLElement;
    start: Placement;
    project: (dx: number, dy: number) => Placement;
    commit: (placement: Placement) => void;
    end?: () => void;
    explicitHeight?: boolean;
    autoPan?: boolean;
    preview?: (p: Placement) => void;
    finishPreview?: () => void;
  },
) {
  event.preventDefault();
  event.stopPropagation();
  const { scroller, root, start } = options;
  const origin = {
    x: event.clientX,
    y: event.clientY,
    sx: scroller.scrollLeft,
    sy: scroller.scrollTop,
    camera: objectCameraX(scroller),
  };
  let current = { ...start },
    clientX = event.clientX,
    clientY = event.clientY,
    frame = 0,
    done = false,
    moved = false;
  root.classList.add("is-transforming");
  scroller.classList.add("cv-has-gesture");
  const project = () => {
    current = options.project(
      clientX -
        origin.x +
        scroller.scrollLeft -
        origin.sx -
        objectCameraX(scroller) +
        origin.camera,
      clientY - origin.y + scroller.scrollTop - origin.sy,
    );
  };
  const paint = () => {
    frame = 0;
    if (moved && options.autoPan !== false) {
      const r = scroller.getBoundingClientRect();
      const speed = edgePanSpeed(
        clientX,
        r.left + scroller.clientLeft,
        r.left + scroller.clientLeft + scroller.clientWidth,
      );
      if (speed) {
        setObjectCamera(scroller, objectCameraX(scroller) + speed);
        project();
        frame = requestAnimationFrame(paint);
      }
    }
    root.style.transform = `translate3d(${current.x - start.x}px,${current.y - start.y}px,0)`;
    if (current.width !== start.width) root.style.width = current.width + "px";
    if (options.explicitHeight && current.height !== start.height)
      root.style.height = current.height + "px";
    options.preview?.(current);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== event.pointerId || done) return;
    moved ||= Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 1;
    clientX = e.clientX;
    clientY = e.clientY;
    project();
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const finish = (cancel: boolean) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancelEvent);
    window.removeEventListener("blur", blur);
    window.removeEventListener("keydown", key, true);
    if (cancel) setObjectCamera(scroller, origin.camera);
    const value = cancel ? start : current;
    root.style.transform = "";
    root.style.left = value.x + "px";
    root.style.top = value.y + "px";
    root.style.width = value.width + "px";
    if (options.explicitHeight) root.style.height = value.height + "px";
    root.classList.remove("is-transforming");
    scroller.classList.remove("cv-has-gesture");
    options.end?.();
    if (
      !cancel &&
      (value.x !== start.x ||
        value.y !== start.y ||
        value.width !== start.width ||
        value.height !== start.height)
    )
      options.commit(value);
    options.finishPreview?.();
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
  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancelEvent);
  window.addEventListener("blur", blur);
  window.addEventListener("keydown", key, true);
  return () => finish(true);
}
export interface Selectable {
  id: string;
  root: HTMLElement;
  toolbar: HTMLElement;
  position: () => Placement;
  remove: () => void;
  openSettings?: () => void;
  bounds?: () => Placement;
  setLayer?: (layer: number) => void;
  menu?: () => void;
  alignGrip?: () => void;
}
export class Selection {
  private observer: ResizeObserver;
  align() {
    for (const item of this.items) item.alignGrip?.();
  }
  destroy() {
    this.observer.disconnect();
    this.items.clear();
  }

  constructor(
    private scroller: HTMLElement,
    private applyLayers?: (layers: Record<string, number>) => void,
  ) {
    this.observer = new ResizeObserver(() => this.align());
    this.observer.observe(scroller);
  }
  current: Selectable | null = null;
  private items = new Set<Selectable>();
  register(item: Selectable) {
    this.items.add(item);
  }
  refreshLayers() {
    [...this.items]
      .sort((a, b) => (a.position().layer ?? 0) - (b.position().layer ?? 0))
      .forEach((item, i) => (item.root.style.zIndex = String(i + 1)));
  }
  reorder(
    direction: "forward" | "backward" | "front" | "back",
    item = this.current,
  ) {
    if (!item) return;
    const ordered = [...this.items].sort(
      (a, b) => (a.position().layer ?? 0) - (b.position().layer ?? 0),
    );
    const index = ordered.indexOf(item);
    const next =
      direction === "front"
        ? ordered.length - 1
        : direction === "back"
          ? 0
          : Math.max(
              0,
              Math.min(
                ordered.length - 1,
                index + (direction === "forward" ? 1 : -1),
              ),
            );
    if (index === next) return;
    ordered.splice(index, 1);
    ordered.splice(next, 0, item);
    const layers = Object.fromEntries(ordered.map((i, n) => [i.id, n]));
    if (this.applyLayers) this.applyLayers(layers);
    else for (const i of ordered) i.setLayer?.(layers[i.id]);
    this.refreshLayers();
  }
  select(item: Selectable | null) {
    if (this.current !== item) {
      this.current?.root
        .querySelectorAll(".cv-property-popover")
        .forEach((n) => n.remove());
      this.current?.root.classList.remove("is-selected");
      this.current = item;
      item?.root.classList.add("is-selected");
    }
    this.position();
  }
  position() {
    this.align();
    const item = this.current;
    if (!item) return;
    const p = item.position();
    const bounds = item.bounds?.() ?? p;
    const outside =
      bounds.x + bounds.width <
        this.scroller.scrollLeft - objectCameraX(this.scroller) ||
      bounds.x >
        this.scroller.scrollLeft -
          objectCameraX(this.scroller) +
          this.scroller.clientWidth ||
      bounds.y + bounds.height < this.scroller.scrollTop ||
      bounds.y > this.scroller.scrollTop + this.scroller.clientHeight;
    item.toolbar.hidden = outside;
    if (outside) return;
    const width = item.toolbar.offsetWidth || 240;
    const left = this.scroller.scrollLeft - objectCameraX(this.scroller),
      top = this.scroller.scrollTop;
    item.toolbar.style.left =
      limit(
        bounds.x - p.x,
        left + 8 - p.x,
        left + this.scroller.clientWidth - width - 8 - p.x,
      ) + "px";
    item.toolbar.style.top =
      Math.max(
        bounds.y - p.y - (item.toolbar.offsetHeight || 40) - 8,
        top + 8 - p.y,
      ) + "px";
  }
  remove(item: Selectable) {
    if (this.current === item) this.select(null);
    this.items.delete(item);
  }
}
export function addHandles(
  parent: HTMLElement,
  onPointer: (e: PointerEvent, h: Handle) => void,
  onKey: (e: KeyboardEvent, h: Handle) => void,
) {
  for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cv-resize-handle cv-handle-" + h;
    b.setAttribute("aria-label", h === "se" ? "Resize block" : "Resize " + h);
    b.onpointerdown = (e) => onPointer(e, h);
    b.onkeydown = (e) => onKey(e, h);
    parent.append(b);
  }
}

export function rightGutter(scroller: HTMLElement) {
  const content = scroller.querySelector<HTMLElement>(".cm-content");
  const rect = scroller.getBoundingClientRect(),
    size = matchMedia("(pointer:coarse)").matches ? 44 : 28;
  return (
    Math.min(
      (content?.getBoundingClientRect().right ?? rect.right) + 8,
      rect.left + scroller.clientLeft + scroller.clientWidth - size - 8,
    ) -
    rect.left +
    scroller.scrollLeft
  );
}
export type MenuAction = {
  label: string;
  icon?: string;
  run: () => void;
  separator?: boolean;
};
/** A click opens actions; only crossing the drag threshold starts a transform. */
export function gripInteraction(
  button: HTMLElement,
  drag: (e: PointerEvent) => void,
  menu: () => void,
) {
  let cleanup: (() => void) | null = null;
  button.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cleanup?.();
    let dragged = false;
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      cleanup = null;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      if (
        Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) > 4
      ) {
        dragged = true;
        stop();
        drag(event);
        window.dispatchEvent(new PointerEvent("pointermove", e));
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      stop();
      if (!dragged) menu();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    cleanup = stop;
  };
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.detail === 0) menu();
  };
  return () => cleanup?.();
}
export interface MenuPoint {
  x: number;
  y: number;
}
/** Object actions on right-click; editable controls retain their native context menu. */
export function bindContextMenu(
  root: HTMLElement,
  open: (point?: MenuPoint) => void,
) {
  root.addEventListener("contextmenu", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        "textarea,input,select,[contenteditable='true'],.cv-property-popover",
      )
    ) {
      // Don't let an ancestor object/editor replace the text field's native menu.
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    open(
      event.clientX || event.clientY
        ? { x: event.clientX, y: event.clientY }
        : undefined,
    );
  });
}
const activeMenus = new WeakMap<HTMLElement, Menu>();
/** Obsidian owns menu rendering, keyboard navigation, positioning and theme. */
export function actionMenu(
  anchor: HTMLElement,
  actions: MenuAction[],
  point?: MenuPoint,
) {
  const editor = anchor.closest<HTMLElement>(".cm-editor");
  if (!editor) return;
  activeMenus.get(editor)?.hide();
  const menu = new Menu();
  activeMenus.set(editor, menu);
  const owner = anchor.parentElement!;
  const close = () => menu.hide();
  for (const action of actions) {
    if (action.separator) menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle(action.label)
        .setIcon(action.icon ?? null)
        .setWarning(action.label === "Delete")
        .onClick(() => action.run());
    });
  }
  owner.addEventListener("cv-destroy", close, { once: true });
  menu.onHide(() => {
    owner.removeEventListener("cv-destroy", close);
    if (activeMenus.get(editor) === menu) activeMenus.delete(editor);
  });
  const rect = anchor.getBoundingClientRect();
  menu.showAtPosition(
    point
      ? { x: point.x, y: point.y }
      : { x: rect.left, y: rect.bottom, width: rect.width, left: true },
    anchor.ownerDocument,
  );
}
export async function copyText(
  text: string,
  notify: (message: string) => void,
) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    notify("Could not copy text to the clipboard.");
  }
}
/** Align against the existing note width; never change editor layout. */
export function alignmentActions(
  scroller: HTMLElement,
  position: () => Placement,
  change: (p: Placement) => void,
): MenuAction[] {
  return (["left", "center", "right"] as const).map((side, i) => ({
    label: "Align to note " + side,
    icon: "align-" + side,
    run: () => {
      const content = scroller.querySelector<HTMLElement>(".cm-content");
      if (!content) return;
      const rect = content.getBoundingClientRect(),
        viewport = scroller.getBoundingClientRect(),
        css = getComputedStyle(content);
      const left =
        rect.left -
        viewport.left +
        scroller.scrollLeft -
        objectCameraX(scroller) +
        parseFloat(css.paddingLeft || "0");
      const width =
        rect.width -
        parseFloat(css.paddingLeft || "0") -
        parseFloat(css.paddingRight || "0");
      const p = position();
      change({
        ...p,
        x: limit(left + ((width - p.width) * i) / 2, -50000, 50000),
      });
    },
  }));
}
export function layerActions(
  selection: Selection,
  item: Selectable,
): MenuAction[] {
  return [
    {
      separator: true,
      label: "Bring forward · Ctrl/Cmd+]",
      icon: "bring-to-front",
      run: () => selection.reorder("forward", item),
    },
    {
      label: "Send backward · Ctrl/Cmd+[",
      icon: "send-to-back",
      run: () => selection.reorder("backward", item),
    },
    {
      label: "Bring to front",
      icon: "bring-to-front",
      run: () => selection.reorder("front", item),
    },
    {
      label: "Send to back",
      icon: "send-to-back",
      run: () => selection.reorder("back", item),
    },
  ];
}
/** Match the object's actual rendered frame, not the note gutter or its top. */
export function leftGrip(
  root: HTMLElement,
  read: () => Placement,
  drag: (e: PointerEvent) => void,
  key?: (e: KeyboardEvent) => void,
  menu?: () => void,
) {
  const b = iconButton(root, "grip-vertical", "Block actions", () => {});
  b.classList.add("cv-object-grip");
  const cancel = gripInteraction(
    b,
    drag,
    menu ?? (() => root.focus({ preventScroll: true })),
  );
  if (key) b.onkeydown = key;
  root.addEventListener("cv-destroy", cancel, { once: true });
  return () => {
    const p = read(),
      bounds = rotatedBounds(p);
    const r = root.getBoundingClientRect();
    const frame = root
      .querySelector<HTMLElement>(".cv-rotated-frame")
      ?.getBoundingClientRect();
    const scroller = root
      .closest<HTMLElement>(".cm-editor")
      ?.querySelector<HTMLElement>(".cm-scroller");
    const width =
      b.offsetWidth || (matchMedia("(pointer:coarse)").matches ? 44 : 28);
    const height =
      b.offsetHeight || (matchMedia("(pointer:coarse)").matches ? 44 : 32);
    const scaleX = root.offsetWidth ? r.width / root.offsetWidth : 1;
    const scaleY = root.offsetHeight ? r.height / root.offsetHeight : 1;
    let x = frame?.width
      ? frame.right + 8
      : r.left + bounds.x - p.x + bounds.width + 8;
    const center = frame?.height
      ? frame.top + frame.height / 2
      : r.top + bounds.y - p.y + bounds.height / 2;
    if (scroller) {
      const v = scroller.getBoundingClientRect();
      x = limit(
        x,
        v.left + scroller.clientLeft + 8,
        v.left + scroller.clientLeft + scroller.clientWidth - width - 8,
      );
    }
    b.style.left = (x - r.left) / (scaleX || 1) + "px";
    b.style.top = (center - r.top) / (scaleY || 1) - height / 2 + "px";
  };
}
export function rotationField(
  parent: HTMLElement,
  value: number,
  change: (n: number) => void,
) {
  const label = document.createElement("label");
  label.className = "cv-rotation-field";
  label.textContent = "Rotation";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "-180";
  input.max = "180";
  input.step = "1";
  input.value = String(Math.round(value));
  input.setAttribute("aria-label", "Rotation degrees");
  input.onchange = () => {
    const n = normalizeAngle(Number(input.value));
    input.value = String(n);
    change(n);
  };
  label.append(input);
  parent.append(label);
  return input;
}
/** Preview rotation is DOM-only; commit once at release. */
export function rotationHandle(
  root: HTMLElement,
  frame: HTMLElement,
  read: () => Placement,
  commit: (n: number) => void,
  preview?: (p: Placement | null) => void,
) {
  let cleanup: (() => void) | null = null;
  const b = iconButton(frame, "rotate-cw", "Rotate object", () =>
    root.focus({ preventScroll: true }),
  );
  b.classList.add("cv-rotation-handle");
  b.onkeydown = (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    commit(
      normalizeAngle(
        (read().rotation ?? 0) +
          (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 15 : 1),
      ),
    );
  };
  b.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    cleanup?.();
    const p = read(),
      r = root.getBoundingClientRect(),
      cx = r.left + p.width / 2,
      cy = r.top + p.height / 2;
    const initial = Math.atan2(e.clientY - cy, e.clientX - cx);
    let angle = p.rotation ?? 0,
      raf = 0,
      done = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      angle = normalizeAngle(
        (p.rotation ?? 0) +
          ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - initial) * 180) /
            Math.PI,
      );
      if (ev.shiftKey) angle = Math.round(angle / 15) * 15;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          frame.style.rotate = angle + "deg";
          preview?.({ ...p, rotation: angle });
        });
    };
    const finish = (cancelled: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
      frame.style.rotate = (cancelled ? (p.rotation ?? 0) : angle) + "deg";
      cleanup = null;
      if (!cancelled) commit(angle);
      preview?.(null);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId) {
        move(ev);
        finish(false);
      }
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId) finish(true);
    };
    const blur = () => finish(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", blur);
    cleanup = () => finish(true);
  };
  return () => cleanup?.();
}
