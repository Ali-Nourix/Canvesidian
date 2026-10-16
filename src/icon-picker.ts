import { getIconIds } from "obsidian";
import { iconButton } from "./interaction";
export function iconPicker(
  parent: HTMLElement,
  selected: string,
  pick: (id: string) => void,
) {
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search Obsidian icons…";
  search.setAttribute("aria-label", "Search Obsidian icons");
  search.className = "cv-icon-search";
  const grid = document.createElement("div");
  grid.className = "cv-icon-grid";
  const status = document.createElement("p");
  status.className = "cv-icon-status";
  status.setAttribute("aria-live", "polite");
  const ids = getIconIds();
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const found = ids.filter((id) => id.toLowerCase().includes(query));
    grid.replaceChildren();
    for (const id of found.slice(0, 60)) {
      const b = iconButton(grid, id, id, () => {
        selected = id;
        pick(id);
        grid
          .querySelectorAll("button")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      });
      b.setAttribute("aria-pressed", String(selected === id));
    }
    status.textContent = found.length
      ? `${Math.min(60, found.length)} of ${found.length} icons${found.length > 60 ? " — refine search" : ""}`
      : "No matching icons";
  };
  search.oninput = render;
  parent.append(search, grid, status);
  render();
}
