import { setIcon } from "obsidian";
import { limit, Placement } from "./model";
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
}
export class Selection {
  current: Selectable | null = null;
  constructor(private scroller: HTMLElement) {}
  select(item: Selectable | null) {
    if (this.current !== item) {
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
    const outside =
      p.x + p.width < this.scroller.scrollLeft ||
      p.x > this.scroller.scrollLeft + this.scroller.clientWidth ||
      p.y + p.height < this.scroller.scrollTop ||
      p.y > this.scroller.scrollTop + this.scroller.clientHeight;
    item.toolbar.hidden = outside;
    if (outside) return;
    const width = item.toolbar.offsetWidth || 240;
    const left = this.scroller.scrollLeft,
      top = this.scroller.scrollTop;
    item.toolbar.style.left =
      limit(
        0,
        left + 8 - p.x,
        left + this.scroller.clientWidth - width - 8 - p.x,
      ) + "px";
    item.toolbar.style.top =
      Math.max(-(item.toolbar.offsetHeight || 40) - 8, top + 8 - p.y) + "px";
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
