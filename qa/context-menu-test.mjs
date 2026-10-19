import { chromium } from "playwright";
import assert from "node:assert/strict";
import { clickTool } from "./tool-helpers.mjs";
import { hoverSourceGrip } from "./grip-helpers.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
let checks = 0;
const pass = (t) => {
  checks++;
  console.log("PASS: " + t);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const item = (name) => page.getByRole("menuitem", { name, exact: true });
  const note = () =>
    page.evaluate(() => window.plugin.store.notes["Vision.md"]);
  const tool = async (name) => {
    await clickTool(page, name);
    if (await page.locator(".cv-tool-tray").isVisible())
      await button("Close tool settings").click();
  };
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  const block = page.locator(".cv-floating-block");
  await page.waitForTimeout(100);
  const original = await page.evaluate(() => window.source()),
    before = (await note()).pins[0];
  const r = await block.locator(".cv-floating-body").boundingBox();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.click(r.x + 48, r.y + 12, { button: "right" });
  await item("Copy Markdown").waitFor();
  for (const name of [
    "Edit text",
    "Text size and color",
    "Bring forward · Ctrl/Cmd+]",
    "Send backward · Ctrl/Cmd+[",
    "Duplicate",
    "Return to text flow",
    "Delete",
  ])
    assert.equal(await item(name).isVisible(), true, name);
  const menu = await page.locator(".menu").boundingBox();
  assert.ok(Math.abs(menu.x - (r.x + 48)) < 2);
  assert.equal(await page.locator(".is-transforming").count(), 0);
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  assert.deepEqual((await note()).pins[0], before);
  assert.equal(await page.evaluate(() => window.source()), original);
  pass(
    "right-clicking floating Markdown opens the full native object menu at the pointer without moving or editing it",
  );
  await item("Edit text").click();
  const input = page.getByRole("textbox", {
    name: "Edit floating block Markdown",
    exact: true,
  });
  await input.fill("Edited through the right-click menu.");
  await input.evaluate((el) =>
    el.addEventListener(
      "contextmenu",
      (e) => (window.lastTextContextEvent = e),
    ),
  );
  await input.click({ button: "right" });
  assert.equal(
    await page.evaluate(() => window.lastTextContextEvent.defaultPrevented),
    false,
  );
  assert.equal(await page.locator(".menu").count(), 0);
  await input.press("Escape");
  assert.ok(
    (await page.evaluate(() => window.source())).includes(
      "Edited through the right-click menu.",
    ),
  );
  pass(
    "right-click Edit text works, while the editing textarea retains its native context menu",
  );
  await tool("Draw rectangle");
  await page.mouse.move(820, 260);
  await page.mouse.down();
  await page.mouse.move(1010, 370, { steps: 8 });
  await page.mouse.up();
  await clickTool(page, "Select objects");
  const rect = page.locator("[data-kind=rect]");
  const rectBefore = (await note()).drawings[0];
  await rect.click({ button: "right", position: { x: 40, y: 30 } });
  await item("Appearance and text size").waitFor();
  assert.equal(
    await rect.evaluate((el) => el.classList.contains("is-selected")),
    true,
  );
  assert.equal(
    await block.evaluate((el) => el.classList.contains("is-selected")),
    false,
  );
  assert.deepEqual((await note()).drawings[0], rectBefore);
  await item("Duplicate").click();
  assert.equal(
    (await note()).drawings.filter((d) => d.kind === "rect").length,
    2,
  );
  pass(
    "right-clicking an SVG shape selects that object and its Duplicate action works",
  );
  await tool("Add sticky note");
  await page.mouse.click(810, 520);
  await page
    .getByRole("textbox", { name: "Annotation text", exact: true })
    .fill("A real sticky action");
  await button("Save annotation").click();
  const sticky = page.locator("[data-kind=sticky]");
  {
    const bounds = await sticky.boundingBox();
    await page.mouse.click(bounds.x + 60, bounds.y + 60, { button: "right" });
  }
  await item("Edit text").click();
  const annotation = page.getByRole("textbox", {
    name: "Annotation text",
    exact: true,
  });
  await annotation.evaluate((el) =>
    el.addEventListener(
      "contextmenu",
      (e) => (window.lastAnnotationContextEvent = e),
    ),
  );
  await annotation.click({ button: "right" });
  assert.equal(
    await page.evaluate(
      () => window.lastAnnotationContextEvent.defaultPrevented,
    ),
    false,
  );
  assert.equal(await page.locator(".menu").count(), 0);
  await button("Save annotation").click();
  pass(
    "sticky-note context actions work without replacing the annotation editor text menu",
  );
  await tool("Add sticker");
  await page.mouse.click(1200, 300);
  await clickTool(page, "Select objects");
  const sticker = page.locator("[data-kind=sticker]");
  await sticker.click({ button: "right", position: { x: 30, y: 30 } });
  await item("Appearance and text size").waitFor();
  assert.equal(await item("Return to text flow").count(), 0);
  await page.keyboard.press("Escape");
  pass(
    "sticker SVG right-clicks use relevant drawing actions rather than Markdown-only actions",
  );
  const line = page
    .locator(".cm-line")
    .filter({ hasText: "This paragraph stays in the normal text flow." });
  await line.click({ button: "right" });
  assert.equal(await page.locator(".menu").count(), 0);
  pass(
    "ordinary Markdown context menus are not intercepted by object handlers",
  );
  const grip = await hoverSourceGrip(page, line);
  const pinsBefore = (await note()).pins.length;
  await grip.click({ button: "right" });
  await item("Float and move").waitFor();
  assert.equal((await note()).pins.length, pinsBefore);
  assert.equal(await page.locator(".is-transforming").count(), 0);
  await page.keyboard.press("Escape");
  pass(
    "right-click on the source grip opens its block menu without starting a drag or floating the text",
  );
  await block
    .locator(".cv-floating-body")
    .click({ button: "right", position: { x: 12, y: 10 } });
  const field = await item("Text size and color");
  await field.click();
  const width = page.getByRole("spinbutton", {
    name: "Text block width",
    exact: true,
  });
  await width.evaluate((el) =>
    el.addEventListener(
      "contextmenu",
      (e) => (window.lastSettingsContextEvent = e),
    ),
  );
  await width.click({ button: "right" });
  assert.equal(
    await page.evaluate(() => window.lastSettingsContextEvent.defaultPrevented),
    false,
  );
  assert.equal(await page.locator(".menu").count(), 0);
  pass("numeric appearance controls keep native field context menus");
  await page.mouse.click(700, 110);
  await block
    .locator(".cv-floating-body")
    .click({ button: "right", position: { x: 12, y: 10 } });
  await page.evaluate(() => window.toggle());
  assert.equal(await page.locator(".menu").count(), 0);
  await page.evaluate(() => window.toggle());
  await block
    .locator(".cv-floating-body")
    .click({ button: "right", position: { x: 12, y: 10 } });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".menu").count(), 0);
  assert.deepEqual(errors, []);
  pass(
    "object menus clean up on effects-off and Escape, with no browser runtime errors",
  );
  console.log(`Verified ${checks} right-click context-menu checks.`);
} finally {
  await browser.close();
}
