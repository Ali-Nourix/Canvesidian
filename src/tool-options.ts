import { Drawing, STICKERS, ToolStyle } from "./model";
import { iconButton } from "./interaction";
export type { ToolStyle } from "./model";
export const COLORS = [
  "currentColor",
  "#2783DE",
  "#46A171",
  "#EAC26B",
  "#D5803B",
  "#E56458",
  "#9B6BC1",
];
export const PAPERS = [
  "#FFF0AD",
  "#E5F2FC",
  "#DDF1E4",
  "#FBE4E3",
  "#ECE3F5",
  "#F0EFED",
];
export function defaultStyle(mode: string): ToolStyle {
  return {
    stroke: "currentColor",
    strokeWidth: mode === "highlighter" ? 24 : 2,
    opacity: mode === "highlighter" ? 0.35 : 1,
    fill: mode === "sticky" ? PAPERS[0] : mode === "label" ? PAPERS[1] : "none",
    fontSize: 18,
    sticker: "star",
    ...(mode === "highlighter" ? { stroke: "#EAC26B" } : {}),
  };
}
/** One compact panel for future-tool defaults or an existing object's appearance. */
export function stylePanel(
  parent: HTMLElement,
  kind: string,
  value: ToolStyle,
  change: (patch: Partial<ToolStyle>) => void,
) {
  const panel = document.createElement("div");
  panel.className = "cv-style-panel";
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Appearance settings");
  parent.append(panel);
  const textKind = kind === "sticky" || kind === "label";
  const row = (label: string) => {
    const wrap = document.createElement("div");
    wrap.className = "cv-option-row";
    const caption = document.createElement("span");
    caption.textContent = label;
    wrap.append(caption);
    panel.append(wrap);
    return wrap;
  };
  const swatches = (
    label: string,
    colors: readonly string[],
    key: "stroke" | "fill",
  ) => {
    const wrap = row(label);
    const group = document.createElement("div");
    group.className = "cv-swatch-grid";
    wrap.append(group);
    for (const color of colors) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cv-color-swatch";
      b.style.setProperty(
        "--swatch",
        color === "currentColor"
          ? "var(--text-normal)"
          : color === "none"
            ? "transparent"
            : color,
      );
      b.setAttribute("aria-label", label + " " + color);
      b.title = color === "none" ? "No fill" : color;
      b.setAttribute("aria-pressed", String(value[key] === color));
      b.onclick = () => {
        value = { ...value, [key]: color };
        change({ [key]: color });
        group
          .querySelectorAll("button")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      };
      group.append(b);
    }
    const custom = document.createElement("input");
    custom.type = "color";
    custom.title = "Custom " + label.toLowerCase();
    custom.setAttribute("aria-label", custom.title);
    custom.value = value[key].startsWith("#") ? value[key] : "#2783DE";
    custom.onchange = () => {
      value = { ...value, [key]: custom.value };
      change({ [key]: custom.value });
      group
        .querySelectorAll("button")
        .forEach((n) => n.setAttribute("aria-pressed", "false"));
    };
    group.append(custom);
  };
  const number = (
    label: string,
    key: "strokeWidth" | "opacity" | "fontSize",
    min: number,
    max: number,
    step: number,
  ) => {
    const wrap = row(label);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value[key]);
    input.setAttribute("aria-label", label);
    const output = document.createElement("output");
    const display = () => {
      output.textContent =
        key === "opacity"
          ? Math.round(Number(input.value) * 100) + "%"
          : input.value + " px";
    };
    display();
    input.oninput = display;
    input.onchange = () => {
      value = { ...value, [key]: Number(input.value) };
      change({ [key]: Number(input.value) });
      display();
    };
    wrap.append(input, output);
  };
  if (kind === "sticker") {
    const stamps = row("Sticker");
    const grid = document.createElement("div");
    grid.className = "cv-sticker-grid";
    stamps.append(grid);
    for (const stamp of STICKERS) {
      const b = iconButton(grid, stamp.icon, stamp.label, () => {
        value = { ...value, sticker: stamp.id };
        change({ sticker: stamp.id });
        grid
          .querySelectorAll("button")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      });
      b.style.color = stamp.color;
      b.setAttribute("aria-pressed", String(value.sticker === stamp.id));
    }
  } else {
    swatches(textKind ? "Text color" : "Stroke color", COLORS, "stroke");
    if (textKind || ["rect", "ellipse", "diamond"].includes(kind))
      swatches("Fill", textKind ? PAPERS : ["none", ...PAPERS], "fill");
    if (textKind) number("Font size", "fontSize", 12, 48, 1);
    else number("Size", "strokeWidth", 1, 32, 1);
    number("Opacity", "opacity", 0.1, 1, 0.05);
  }
  return panel;
}
export function drawingStyle(d: Drawing): ToolStyle {
  return {
    ...defaultStyle(d.kind),
    ...d,
    fill: d.fill ?? "none",
    fontSize: d.fontSize ?? 18,
    sticker: d.sticker ?? "star",
  };
}
