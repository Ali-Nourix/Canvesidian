import { chromium } from "playwright";
import { clickTool } from "./tool-helpers.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const source = await page.evaluate(() => window.source());
  const target = "Move this paragraph anywhere, then edit it right there.";
  await page.evaluate((text) => window.floatText(text), target);
  await page.waitForSelector(".cv-floating-block.is-selected");
  let block = page.locator(".cv-floating-block");
  assert.equal(await block.locator(".cv-resize-handle").count(), 8);
  const frame = await block.boundingBox();
  const bar = await block.locator(".cv-context-toolbar").boundingBox();
  assert.ok(bar.y + bar.height <= frame.y);
  assert.equal(
    await block.locator(".cv-context-toolbar button").count(),
    await block.locator(".cv-context-toolbar button svg").count(),
  );
  console.log(
    "PASS: selected object has eight design handles and an icon toolbar above its bounds",
  );
  await page
    .locator(".cm-line")
    .filter({ hasText: "This paragraph stays" })
    .click();
  assert.equal(await page.locator(".is-selected").count(), 0);
  assert.equal(
    await page.getByRole("toolbar", { name: "Selected text tools" }).count(),
    0,
  );
  await block
    .locator(".cv-floating-body")
    .click({ position: { x: 24, y: 12 } });
  assert.equal(
    await block
      .locator(".cv-rotated-frame")
      .evaluate((el) => getComputedStyle(el).outlineColor),
    "rgb(39, 131, 222)",
  );
  console.log(
    "PASS: tools follow selection, not hover, and the blue selection frame survives native editor focus changes",
  );
  let grip = page.getByRole("button", { name: "Move this block", exact: true });
  let b = await grip.boundingBox();
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.down();
  await page.mouse.move(b.x + 50, b.y + 70, { steps: 120 });
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  await page.mouse.up();
  await page.waitForTimeout(60);
  assert.ok((await page.evaluate(() => window.transactionCount)) <= 2);
  console.log(
    "PASS: 120 drag moves use zero editor transactions until release, at most two including height adjustment",
  );
  // Pointer cancel must restore the saved position, not persist a half-finished gesture.
  const saved = await block.evaluate((el) => ({
    left: el.style.left,
    top: el.style.top,
  }));
  grip = page.getByRole("button", { name: "Move this block", exact: true });
  b = await grip.boundingBox();
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + 30, { steps: 10 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  assert.deepEqual(
    await block.evaluate((el) => ({ left: el.style.left, top: el.style.top })),
    saved,
  );
  console.log(
    "PASS: cancelled drag rolls back preview without changing saved placement",
  );
  await page
    .getByRole("button", { name: "Delete this block from note", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.evaluate(() => window.source()), source);
  await page
    .getByRole("button", { name: "Delete this block from note", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete block", exact: true }).click();
  assert.equal(
    await page.evaluate((text) => window.source().includes(text), target),
    false,
  );
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  await page.evaluate(() => window.undo());
  assert.equal(await page.evaluate(() => window.source()), source);
  console.log(
    "PASS: confirmed per-block deletion removes source text; cancel preserves it and native undo restores it",
  );
  const draw = async (label, from, to, steps = 12) => {
    await clickTool(page, label);
    if (await page.locator(".cv-tool-tray").isVisible())
      await clickTool(page, label);
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps });
    await page.mouse.up();
    await page.waitForTimeout(40);
  };
  await draw("Draw rectangle", [820, 180], [1080, 300]);
  assert.equal(await page.locator(".cv-drawing-object").count(), 1);
  assert.equal(await page.locator(".cv-drawing-object rect").count(), 1);
  assert.equal(await page.evaluate(() => window.source()), source);
  console.log(
    "PASS: rectangle creation stays in the existing note and never changes Markdown",
  );
  await clickTool(page, "Select objects");
  let drawing = page.locator(".cv-drawing-object.is-selected");
  await clickTool(page, "Drawing color");
  await page
    .getByRole("button", { name: "Stroke #2783DE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Brush thickness", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stroke width 8", exact: true })
    .click();
  assert.equal(await drawing.locator("rect").getAttribute("stroke"), "#2783DE");
  assert.equal(await drawing.locator("rect").getAttribute("stroke-width"), "8");
  console.log("PASS: selected drawing toolbar changes color and stroke weight");
  const before = await drawing.boundingBox();
  const resize = await drawing
    .getByRole("button", { name: "Resize block", exact: true })
    .boundingBox();
  await page.mouse.move(resize.x + 10, resize.y + 10);
  await page.mouse.down();
  await page.mouse.move(resize.x + 70, resize.y + 40, { steps: 20 });
  await page.mouse.up();
  const after = await drawing.boundingBox();
  assert.ok(
    after.width >= before.width + 55 && after.height >= before.height + 25,
  );
  console.log("PASS: design handles resize shape geometry in both dimensions");
  await draw("Draw ellipse", [820, 380], [1040, 500]);
  assert.equal(await page.locator(".cv-drawing-object ellipse").count(), 1);
  await draw("Draw line", [760, 580], [1060, 620]);
  assert.equal(await page.locator(".cv-drawing-object").count(), 3);
  console.log(
    "PASS: ellipse and line tools create independent selectable objects",
  );
  await clickTool(page, "Draw with pen");
  await clickTool(page, "Draw with pen");
  await page.mouse.move(820, 690);
  await page.mouse.down();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.move(980, 740, { steps: 80 });
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  await page.mouse.up();
  assert.equal(await page.locator(".cv-drawing-object").count(), 4);
  const pen = await page.evaluate(() =>
    window.plugin.store.notes["Vision.md"].drawings.find(
      (d) => d.kind === "pen",
    ),
  );
  assert.ok(pen.points.length > 2);
  console.log(
    "PASS: freehand pen previews without editor transactions and saves normalized vector points on release",
  );
  await draw("Draw with highlighter", [800, 800], [1000, 810]);
  assert.equal(await page.locator(".cv-drawing-object").count(), 5);
  assert.ok(
    await page.evaluate(() =>
      window.plugin.store.notes["Vision.md"].drawings.some(
        (d) => d.kind === "pen" && d.opacity < 1 && d.strokeWidth === 24,
      ),
    ),
  );
  console.log("PASS: highlighter is a distinct translucent brush preset");
  await clickTool(page, "Select objects");
  await page
    .getByRole("button", { name: "Delete this drawing", exact: true })
    .click();
  assert.equal(await page.locator(".cv-drawing-object").count(), 4);
  await page.getByRole("button", { name: "Undo drawing", exact: true }).click();
  assert.equal(await page.locator(".cv-drawing-object").count(), 5);
  await page.getByRole("button", { name: "Redo drawing", exact: true }).click();
  assert.equal(await page.locator(".cv-drawing-object").count(), 4);
  await page.locator(".cv-drawing-object").first().focus();
  await page.keyboard.press("Control+z");
  assert.equal(await page.locator(".cv-drawing-object").count(), 5);
  assert.equal(await page.evaluate(() => window.source()), source);
  console.log(
    "PASS: drawing deletion and keyboard undo/redo never alter source text",
  );
  await page.evaluate(() => window.remount());
  assert.equal(await page.locator(".cv-drawing-object").count(), 5);
  assert.equal(await page.evaluate(() => window.source()), source);
  console.log(
    "PASS: drawings survive persisted JSON rehydration without modifying the original file",
  );
  await page.evaluate(() => {
    window.floatText("This paragraph stays");
    window.plugin.store.notes["Other.md"] = {
      enabled: false,
      pins: [],
      drawings: [],
    };
  });
  await page
    .getByRole("button", { name: "Reset entire note layout", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.locator(".cv-floating-block").count(), 1);
  assert.equal(await page.locator(".cv-drawing-object").count(), 5);
  await page
    .getByRole("button", { name: "Reset entire note layout", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset layout", exact: true }).click();
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  assert.equal(await page.locator(".cv-drawing-object").count(), 0);
  assert.equal(await page.evaluate(() => window.source()), source);
  assert.equal(
    await page.evaluate(() => window.plugin.store.notes["Other.md"].enabled),
    false,
  );
  console.log(
    "PASS: reset clears this note’s layout and drawings only; Markdown and other notes remain unchanged",
  );
  // Clean representative visual states.
  await page.evaluate(() => window.floatText("Move this paragraph"));
  await draw("Draw rectangle", [800, 350], [1120, 480]);
  await draw("Draw ellipse", [850, 570], [1070, 690]);
  await clickTool(page, "Select objects");
  await page.screenshot({ path: "qa/design-desktop.png" });
  await page.evaluate(() => {
    document.documentElement.classList.add("theme-dark");
    const vars = {
      "--background-primary": "#191919",
      "--background-secondary": "#202020",
      "--background-modifier-border": "#484846",
      "--background-modifier-hover": "#383836",
      "--text-normal": "#f1f1ef",
      "--text-muted": "#b4b4af",
      "--text-error": "#e56458",
    };
    for (const [key, value] of Object.entries(vars))
      document.documentElement.style.setProperty(key, value);
  });
  await page.screenshot({ path: "qa/design-dark.png" });
  await page.evaluate(() => {
    document.documentElement.classList.remove("theme-dark");
    document.documentElement.removeAttribute("style");
  });
  await clickTool(page, "Drawing color");
  await page.screenshot({ path: "qa/design-properties.png" });
  await page
    .getByRole("button", { name: "Stroke #2783DE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset entire note layout", exact: true })
    .click();
  await page.screenshot({ path: "qa/design-reset.png" });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const s = document.querySelector(".cm-scroller");
    s.scrollLeft = 0;
    s.scrollTop = 0;
  });
  await page.screenshot({ path: "qa/design-mobile.png" });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  console.log("PASS: compact viewport keeps design tools inside the editor");
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const touch = await touchContext.newPage();
  touch.on("pageerror", (e) => errors.push(String(e)));
  await touch.goto(new URL("./harness.html", import.meta.url).href);
  await touch.waitForFunction(() => window.ready);
  assert.ok(await touch.evaluate(() => matchMedia("(pointer:coarse)").matches));
  await clickTool(touch, "Draw ellipse");
  await clickTool(touch, "Draw ellipse");
  await touch.mouse.move(80, 540);
  await touch.mouse.down();
  await touch.mouse.move(290, 650, { steps: 16 });
  await touch.mouse.up();
  await clickTool(touch, "Select objects");
  const selected = touch.locator(".cv-drawing-object.is-selected");
  const bounds = await selected.boundingBox();
  const toolBounds = await selected
    .locator(".cv-context-toolbar")
    .boundingBox();
  assert.ok(toolBounds.y + toolBounds.height <= bounds.y);
  assert.ok(toolBounds.x >= 0 && toolBounds.x + toolBounds.width <= 390);
  assert.equal(
    await touch.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await touch.screenshot({ path: "qa/design-mobile.png" });
  await touchContext.close();
  console.log(
    "PASS: coarse-pointer layout keeps selected-object tools above its frame with a compact wrapped dock",
  );
  assert.deepEqual(errors, []);
  console.log("PASS: new design tools run without browser runtime errors");
  await page.close();
} finally {
  await browser.close();
}
