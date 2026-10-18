import { limit, Placement } from "./model";
const cameras = new WeakMap<HTMLElement, ObjectCamera>();
export const objectCameraX = (scroller: HTMLElement) =>
  cameras.get(scroller)?.x ?? 0;
export const setObjectCamera = (scroller: HTMLElement, x: number) =>
  cameras.get(scroller)?.set(x);
export const worldFromScreen = (
  screen: number,
  scroll: number,
  camera: number,
) => screen + scroll - camera;
export const screenFromWorld = (
  world: number,
  scroll: number,
  camera: number,
) => world - scroll + camera;
export function edgePanSpeed(x: number, left: number, right: number) {
  if (x < left + 24) return Math.min(10, (left + 24 - x) * 0.4);
  if (x > right - 24) return -Math.min(10, (x - right + 24) * 0.4);
  return 0;
}
export function revealObject(scroller: HTMLElement, bounds: Placement) {
  const left = scroller.scrollLeft - objectCameraX(scroller),
    width = scroller.clientWidth;
  if (bounds.x < left + 16)
    setObjectCamera(scroller, scroller.scrollLeft - bounds.x + 16);
  else if (bounds.x + bounds.width > left + width - 16)
    setObjectCamera(
      scroller,
      scroller.scrollLeft -
        bounds.x -
        Math.min(bounds.width, width - 32) +
        width -
        16,
    );
}
/** Clip only horizontal object overflow. Native vertical scrolling stays native. */
export class ObjectCamera {
  viewport = document.createElement("div");
  x = 0;
  private observer: ResizeObserver;
  private frame = 0;
  private destroyed = false;
  constructor(
    private editor: HTMLElement,
    private scroller: HTMLElement,
    private layer: HTMLElement,
    private changed: (x: number) => void,
  ) {
    this.viewport.className = "cv-object-viewport";
    this.viewport.contentEditable = "false";
    this.viewport.append(layer);
    scroller.append(this.viewport);
    cameras.set(scroller, this);
    this.observer = new ResizeObserver(this.schedule);
    this.observer.observe(editor);
    this.observer.observe(scroller);
    this.layout();
  }
  private schedule = () => {
    if (!this.frame && !this.destroyed)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.layout();
      });
  };
  layout() {
    this.viewport.style.width = this.scroller.clientWidth + "px";
    this.layer.style.transform = `translate3d(${this.x}px,0,0)`;
  }
  set(value: number, notify = true) {
    const x = limit(Number.isFinite(value) ? value : 0, -50000, 50000);
    if (x === this.x) return;
    this.x = x;
    this.layout();
    if (notify) this.changed(x);
  }
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    cameras.delete(this.scroller);
    this.viewport.remove();
  }
}
