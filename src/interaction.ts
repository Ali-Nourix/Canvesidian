import { setIcon } from "obsidian";
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
  };
  let current = { ...start };
  let frame = 0;
  let done = false;
  root.classList.add("is-transforming");
  scroller.classList.add("cv-has-gesture");
  const paint = () => {
    frame = 0;
    root.style.transform = `translate3d(${current.x - start.x}px,${current.y - start.y}px,0)`;
    if (current.width !== start.width) root.style.width = current.width + "px";
    if (options.explicitHeight && current.height !== start.height)
      root.style.height = current.height + "px";
    options.preview?.(current);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== event.pointerId || done) return;
    current = options.project(
      e.clientX - origin.x + scroller.scrollLeft - origin.sx,
      e.clientY - origin.y + scroller.scrollTop - origin.sy,
    );
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
    if (e.pointerId !== event.pointerId) return;
    move(e);
    finish(false);
  };
  const cancelEvent = (e: PointerEvent) => {
    if (e.pointerId === event.pointerId) finish(true);
  };
  const blur = () => finish(true);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancelEvent);
  window.addEventListener("blur", blur);
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
}
export class Selection {
  current: Selectable | null = null;
  constructor(private scroller: HTMLElement) {}
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
    const item = this.current;
    if (!item) return;
    const p = item.position();
    const bounds = item.bounds?.() ?? p;
    const outside =
      bounds.x + bounds.width < this.scroller.scrollLeft ||
      bounds.x > this.scroller.scrollLeft + this.scroller.clientWidth ||
      bounds.y + bounds.height < this.scroller.scrollTop ||
      bounds.y > this.scroller.scrollTop + this.scroller.clientHeight;
    item.toolbar.hidden = outside;
    if (outside) return;
    const width = item.toolbar.offsetWidth || 240;
    const left = this.scroller.scrollLeft,
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

/** Left-of-content grip independent of RTL writing direction. */
export function leftGrip(
  root: HTMLElement,
  read: () => Placement,
  drag: (e: PointerEvent) => void,
  key?: (e: KeyboardEvent) => void,
) {
  const b = iconButton(root, "grip-vertical", "Move object from left", () =>
    root.focus({ preventScroll: true }),
  );
  b.classList.add("cv-object-grip");
  b.onpointerdown = drag;
  if (key) b.onkeydown = key;
  return () => {
    const p = read(),
      a = rotatedBounds(p);
    b.style.left = a.x - p.x - 36 + "px";
    b.style.top = a.y - p.y + a.height / 2 - 16 + "px";
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
