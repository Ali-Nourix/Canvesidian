import { chromium } from "playwright";
import assert from "node:assert/strict";
import { clickTool } from "./tool-helpers.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
let checks = 0;
const pass = (s) => {
  checks++;
  console.log("PASS: " + s);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const source = await page.evaluate(() => window.source());
  const data = () =>
    page.evaluate(() => window.plugin.store.notes["Vision.md"]?.drawings ?? []);
  const closeSettings = async () => {
    if (await page.locator(".cv-tool-tray").isVisible())
      await btn("Close tool settings").click();
  };
  const tool = async (name) => {
    await clickTool(page, name);
    await closeSettings();
  };
  const make = async (name, x, y, text) => {
    await tool(name);
    await page.mouse.click(x, y);
    if (text !== undefined) {
      await page
        .getByRole("textbox", { name: "Annotation text", exact: true })
        .fill(text);
      await btn("Save annotation").click();
    }
  };
  const draw = async () => {
    await tool("Draw rectangle");
    await page.mouse.move(820, 180);
    await page.mouse.down();
    await page.mouse.move(1040, 290, { steps: 12 });
    await page.mouse.up();
    await clickTool(page, "Select objects");
  };
  await btn("Shapes and lines").click();
  assert.equal(await page.locator(".cv-tool-choices [data-tool]").count(), 6);
  assert.equal(
    await page.locator(".cv-tool-dock > [data-tool=rect]").count(),
    0,
  );
  await page.screenshot({ path: "qa/advanced-groups.png" });
  pass("related shapes are nested under a single dock group");
  await clickTool(page, "Select objects");
  await btn("Tool settings").click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Dotted note background", exact: true })
      .count(),
    1,
  );
  assert.ok(await page.evaluate(() => !!window.settingTab));
  await page
    .getByRole("checkbox", { name: "Dotted note background", exact: true })
    .check();
  await page.screenshot({ path: "qa/advanced-settings.png" });
  await page.evaluate(() => window.currentModal.close());
  assert.ok(
    await page
      .locator(".cm-scroller")
      .evaluate((el) => el.classList.contains("cv-dot-grid")),
  );
  pass(
    "Tool settings has a working idle fallback and native plugin settings register a persistent dot-grid toggle",
  );
  // Actual glyph-aligned hover grip for a large RTL heading/line.
  const line = page
    .locator(".cm-line")
    .filter({ hasText: "این یک پاراگراف فارسی" });
  await line.evaluate((el) => {
    el.dir = "rtl";
    el.style.fontSize = "30px";
  });
  const textBounds = await line.evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const b = r.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  await page.mouse.move(
    textBounds.x + textBounds.width / 2,
    textBounds.y + textBounds.height / 2,
  );
  await page.waitForTimeout(80);
  const grip = await page
    .getByRole("button", { name: "Float block under pointer", exact: true })
    .boundingBox();
  assert.ok(grip.x + grip.width <= textBounds.x + 1);
  assert.ok(
    Math.abs(
      grip.y + grip.height / 2 - (textBounds.y + textBounds.height / 2),
    ) < 3,
  );
  await page.screenshot({ path: "qa/advanced-rtl-grip.png" });
  pass(
    "native block grip sits physically left of RTL glyphs and aligns to their vertical center",
  );
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  await btn("Tool settings").click();
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Text block width", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("spinbutton", { name: "Rotation degrees", exact: true })
    .fill("15");
  await page
    .getByRole("spinbutton", { name: "Rotation degrees", exact: true })
    .press("Tab");
  assert.equal(
    await page
      .locator(".cv-floating-block .cv-rotated-frame")
      .evaluate((el) => el.style.rotate),
    "15deg",
  );
  pass(
    "Tool settings edits the selected source block width and rotation instead of silently doing nothing",
  );
  await page.mouse.click(700, 110);
  await make("Add sticky note", 800, 360, "چسب واقعی روی یک ایده");
  const sticky = page.locator("[data-kind=sticky]");
  const left = await sticky
    .getByRole("button", { name: "Move object from left", exact: true })
    .boundingBox();
  const sb = await sticky.boundingBox();
  assert.ok(left.x + left.width <= sb.x);
  await btn("Add tape to sticky").click();
  let tape = (await data()).find((d) => d.kind === "tape");
  const stickyId = (await data()).find((d) => d.kind === "sticky").id;
  assert.equal(tape.parentId, stickyId);
  assert.ok(await page.locator("[data-kind=tape] polygon").count());
  pass(
    "decorative tape has a real torn-edge silhouette and attaches to a sticky top edge",
  );
  await sticky.click({ position: { x: 100, y: 100 } });
  let handle = await sticky
    .getByRole("button", { name: "Move object from left", exact: true })
    .boundingBox();
  const prev = { ...tape };
  await page.mouse.move(handle.x + 12, handle.y + 12);
  await page.mouse.down();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.move(handle.x + 52, handle.y + 72, { steps: 40 });
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.ok(
    Math.abs(
      (await page
        .locator("[data-kind=tape]")
        .evaluate((el) => parseFloat(el.style.left))) -
        prev.x -
        40,
    ) < 2,
  );
  await page.mouse.up();
  tape = (await data()).find((d) => d.kind === "tape");
  assert.ok(
    Math.abs(tape.x - prev.x - 40) < 2 && Math.abs(tape.y - prev.y - 60) < 2,
  );
  pass(
    "left object grip drags smoothly and attached tape follows the sticky on commit",
  );
  await btn("Tool settings").click();
  await page
    .getByRole("spinbutton", { name: "Rotation degrees", exact: true })
    .fill("30");
  await page
    .getByRole("spinbutton", { name: "Rotation degrees", exact: true })
    .press("Tab");
  tape = (await data()).find((d) => d.kind === "tape");
  assert.equal(tape.rotation, 22);
  assert.equal(
    await sticky
      .locator(".cv-context-toolbar")
      .evaluate((el) => getComputedStyle(el).rotate),
    "none",
  );
  pass(
    "numeric rotation rotates the sticky and its attached tape while keeping contextual controls upright",
  );
  await page.mouse.click(700, 100);
  await sticky.focus();
  const stickyKnob = await sticky
    .getByRole("button", { name: "Rotate object", exact: true })
    .boundingBox();
  await page.mouse.move(
    stickyKnob.x + stickyKnob.width / 2,
    stickyKnob.y + stickyKnob.height / 2,
  );
  await page.mouse.down();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.move(
    stickyKnob.x + stickyKnob.width / 2 + 45,
    stickyKnob.y + stickyKnob.height / 2 + 10,
    { steps: 15 },
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.notEqual(
    await page
      .locator("[data-kind=tape] .cv-rotated-frame")
      .evaluate((el) => el.style.rotate),
    "22deg",
  );
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  assert.equal(
    await page
      .locator("[data-kind=tape] .cv-rotated-frame")
      .evaluate((el) => el.style.rotate),
    "22deg",
  );
  pass(
    "attached tape follows live rotation previews and rolls back on cancel without editor writes",
  );
  await draw();
  let rect = page.locator("[data-kind=rect]");
  let knob = await rect
    .getByRole("button", { name: "Rotate object", exact: true })
    .boundingBox();
  let rb = await rect.boundingBox();
  await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await page.mouse.down();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.move(rb.x + rb.width + 50, rb.y + rb.height / 2, {
    steps: 50,
  });
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  await page.mouse.up();
  assert.ok(
    Math.abs((await data()).find((d) => d.kind === "rect").rotation) > 40,
  );
  pass(
    "rotation handle previews without editor transactions and commits only at release",
  );
  knob = await rect
    .getByRole("button", { name: "Rotate object", exact: true })
    .boundingBox();
  const angle = (await data()).find((d) => d.kind === "rect").rotation;
  await page.mouse.move(knob.x + 10, knob.y + 10);
  await page.mouse.down();
  await page.mouse.move(knob.x + 40, knob.y + 20);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  assert.equal((await data()).find((d) => d.kind === "rect").rotation, angle);
  pass("cancelled rotation restores the previous saved angle");
  // Import a real raster through the native file-input flow.
  await btn("Images and icons").click();
  let chooser = page.waitForEvent("filechooser");
  await btn("Import image from computer").click();
  await (
    await chooser
  ).setFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAU0lEQVR4nO3PQQ3AIADAQMAMQvGJlongcVnSU9DOfe74s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB9VosB6JnSeQwAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.waitForSelector("[data-kind=image] img");
  await page.waitForFunction(
    () => document.querySelector("[data-kind=image] img").naturalWidth === 64,
  );
  assert.equal(await page.evaluate(() => window.fileWrites), 1);
  assert.equal(await page.evaluate(() => window.source()), source);
  pass(
    "local raster import copies a vault attachment and places its image without altering Markdown",
  );
  await btn("Images and icons").click();
  chooser = page.waitForEvent("filechooser");
  await btn("Import image from computer").click();
  await (
    await chooser
  ).setFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg><script>alert(1)</script></svg>"),
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.fileWrites), 1);
  pass("unsafe non-raster payloads are rejected before any vault write");
  await clickTool(page, "Add Obsidian icon");
  await page
    .getByRole("searchbox", { name: "Search Obsidian icons", exact: true })
    .fill("heart");
  await page
    .locator(".cv-icon-grid")
    .getByRole("button", { name: "heart", exact: true })
    .click();
  await closeSettings();
  await page.mouse.click(1170, 370);
  assert.equal((await data()).find((d) => d.kind === "icon").iconId, "heart");
  assert.ok(await page.locator("[data-kind=icon] svg").count());
  pass(
    "native icon library search inserts the chosen icon as a movable resizable object",
  );
  await make("Add table annotation", 820, 650, "ایده\tوضعیت\nطرح\tآماده");
  assert.equal(await page.locator(".cv-annotation-table td").count(), 4);
  await make("Add code annotation", 240, 650, 'const idea = "room to think";');
  assert.ok(await page.locator(".cv-code-annotation").textContent());
  pass(
    "JAM-inspired table and code annotations are editable local objects, not fake new source notes",
  );
  await page.mouse.click(700, 100);
  // Stage a readable freeform sample using real UI gestures (overlap remains allowed).
  const place = async (locator, x, y) => {
    await locator.focus();
    const before = await locator.evaluate((el) => ({
      x: parseFloat(el.style.left),
      y: parseFloat(el.style.top),
    }));
    const grip = await locator
      .getByRole("button", { name: "Move object from left", exact: true })
      .boundingBox();
    await page.mouse.move(grip.x + 12, grip.y + 12);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + 12 + x - before.x,
      grip.y + 12 + y - before.y,
      { steps: 12 },
    );
    await page.mouse.up();
  };
  const image = page.locator("[data-kind=image]");
  await image.focus();
  const corner = await image
    .getByRole("button", { name: "Resize block", exact: true })
    .boundingBox();
  await page.mouse.move(corner.x + 10, corner.y + 10);
  await page.mouse.down();
  await page.mouse.move(corner.x - 30, corner.y - 20, { steps: 8 });
  await page.mouse.up();
  await place(page.locator(".cv-floating-block"), 790, 150);
  await place(image, 760, 260);
  await place(sticky, 1120, 280);
  await place(rect, 560, 580);
  await place(page.locator("[data-kind=icon]"), 1310, 100);
  await place(page.locator("[data-kind=table]"), 800, 550);
  await place(page.locator("[data-kind=code]"), 60, 550);
  await page.mouse.click(700, 110);
  await page.screenshot({ path: "qa/advanced-desktop.png" });
  const before = await data();
  await page.evaluate(() => window.remount());
  assert.equal((await data()).length, before.length);
  assert.ok((await data()).find((d) => d.kind === "image").assetPath);
  assert.equal((await data()).find((d) => d.kind === "sticky").rotation, 30);
  pass(
    "rotation, image path, icon choice and attached tape survive data rehydration",
  );
  await btn("Toggle note effects").click();
  assert.equal(
    await page.locator(".cv-floating-block,.cv-drawing-object").count(),
    0,
  );
  assert.equal(await page.evaluate(() => window.source()), source);
  assert.equal((await data()).length, before.length);
  assert.equal(await page.locator(".cv-dot-grid").count(), 0);
  assert.ok(await btn("Toggle note effects").isVisible());
  await page.screenshot({ path: "qa/advanced-effects-off.png" });
  await btn("Toggle note effects").click();
  assert.equal((await data()).length, before.length);
  assert.ok(await page.locator(".cv-dot-grid").count());
  assert.ok(await page.locator(".cv-drawing-object").count());
  pass(
    "effects toggle restores normal note appearance then restores all objects and grid without data loss",
  );
  await btn("Reset entire note layout").click();
  await btn("Cancel").click();
  assert.equal((await data()).length, before.length);
  await btn("Reset entire note layout").click();
  await btn("Reset layout").click();
  assert.equal((await data()).length, 0);
  assert.equal(await page.evaluate(() => window.source()), source);
  assert.equal(await page.evaluate(() => Object.keys(window.assets).length), 1);
  pass(
    "confirmed reset clears spatial effects separately and never removes Markdown or imported image files",
  );
  await btn("Undo drawing").click();
  assert.equal((await data()).length, before.length);
  pass("drawing undo restores all annotation types after reset");
  await page.evaluate(() => {
    document.documentElement.classList.add("theme-dark");
    for (const [k, v] of Object.entries({
      "--background-primary": "#191919",
      "--background-secondary": "#202020",
      "--background-modifier-border": "#484846",
      "--text-normal": "#f1f1ef",
      "--text-muted": "#b4b4af",
    }))
      document.documentElement.style.setProperty(k, v);
  });
  await page.screenshot({ path: "qa/advanced-dark.png" });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phone = await context.newPage();
  phone.on("pageerror", (e) => errors.push(String(e)));
  await phone.goto(new URL("./harness.html", import.meta.url).href);
  await phone.waitForFunction(() => window.ready);
  await phone
    .getByRole("button", { name: "Shapes and lines", exact: true })
    .click();
  await phone.screenshot({ path: "qa/advanced-mobile-groups.png" });
  assert.equal(
    await phone.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  const box = await phone.locator(".cv-tool-tray").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 52);
  await phone
    .getByRole("button", { name: "Toggle note effects", exact: true })
    .click();
  assert.ok(
    await phone
      .getByRole("button", { name: "Toggle note effects", exact: true })
      .isVisible(),
  );
  await phone.screenshot({ path: "qa/advanced-mobile-off.png" });
  pass(
    "compact coarse-pointer groups and the re-enable toggle remain accessible without horizontal overflow",
  );
  await context.close();
  assert.deepEqual(errors, []);
  pass("advanced features complete without browser runtime errors");
  console.log(checks + " advanced checks passed");
  await page.close();
} finally {
  await browser.close();
}
