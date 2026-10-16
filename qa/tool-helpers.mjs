const groups = {
  "Draw with pen": "Draw tools",
  "Draw with highlighter": "Draw tools",
  "Add decorative tape": "Draw tools",
  "Draw rectangle": "Shapes and lines",
  "Draw ellipse": "Shapes and lines",
  "Draw diamond": "Shapes and lines",
  "Draw triangle": "Shapes and lines",
  "Draw line": "Shapes and lines",
  "Draw arrow": "Shapes and lines",
  "Add sticky note": "Notes and labels",
  "Add label": "Notes and labels",
  "Add text annotation": "Notes and labels",
  "Add section": "Notes and labels",
  "Add table annotation": "Notes and labels",
  "Add code annotation": "Notes and labels",
  "Add sticker": "Stickers",
  "Import image from computer": "Images and icons",
  "Add Obsidian icon": "Images and icons",
};
export const toolGroup = (name) => groups[name];
export async function clickTool(page, name) {
  const group = groups[name];
  if (!group) return page.getByRole("button", { name, exact: true }).click();
  if (
    !(await page
      .getByRole("button", { name, exact: true })
      .isVisible()
      .catch(() => false))
  )
    await page.getByRole("button", { name: group, exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
