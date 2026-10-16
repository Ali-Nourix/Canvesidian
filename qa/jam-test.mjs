import { chromium } from "playwright";
import { clickTool, toolGroup } from "./tool-helpers.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
let checks = 0;
const pass = (name) => {
  checks++;
  console.log("PASS: " + name);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const source = await page.evaluate(() => window.source());
  const button = (name) =>
    toolGroup(name)
      ? { click: () => clickTool(page, name) }
      : page.getByRole("button", { name, exact: true });
  const tool = async (name) => {
    await button(name).click();
    if (await page.locator(".cv-tool-tray").isVisible())
      await button(name).click();
  };
  const saved = () =>
    page.evaluate(() => window.plugin.store.notes["Vision.md"]?.drawings ?? []);
  const draw = async (name, from, to) => {
    await tool(name);
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps: 25 });
    await page.mouse.up();
  };
  const setRange = async (scope, name, value) =>
    scope.getByRole("slider", { name, exact: true }).evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  await page.evaluate(() => {
    document.querySelector(".cm-editor").dir = "rtl";
  });
  const select = await button("Select objects").boundingBox(),
    reset = await button("Reset entire note layout").boundingBox();
  assert.ok(select.x < reset.x);
  assert.equal(
    await page
      .locator(".cv-tool-dock")
      .evaluate((el) => getComputedStyle(el).direction),
    "ltr",
  );
  pass("RTL note direction never reverses toolbar order");
  await page.evaluate(() => (document.querySelector(".cm-editor").dir = "ltr"));
  await button("Draw with pen").click();
  let tray = page.locator(".cv-tool-tray");
  await tray
    .getByRole("button", { name: "Stroke color #2783DE", exact: true })
    .click();
  await setRange(tray, "Size", 7);
  await setRange(tray, "Opacity", 0.8);
  await page.screenshot({ path: "qa/jam-brush.png" });
  await draw("Draw with pen", [790, 180], [1050, 250]);
  let drawings = await saved();
  let pen = drawings.at(-1);
  assert.equal(pen.stroke, "#2783DE");
  assert.equal(pen.strokeWidth, 7);
  assert.equal(pen.opacity, 0.8);
  pass("pre-draw pen color, numeric size and opacity apply to the next stroke");
  await button("Draw with highlighter").click();
  await setRange(tray, "Size", 30);
  await tray
    .getByRole("button", { name: "Stroke color #46A171", exact: true })
    .click();
  await draw("Draw with highlighter", [790, 285], [1050, 295]);
  let high = (await saved()).at(-1);
  assert.equal(high.strokeWidth, 30);
  assert.equal(high.stroke, "#46A171");
  assert.equal(high.opacity, 0.35);
  await button("Draw with pen").click();
  assert.equal(
    await tray.getByRole("slider", { name: "Size", exact: true }).inputValue(),
    "7",
  );
  pass("highlighter and pen keep independent appearance defaults");
  await page.evaluate(() => window.remount());
  await button("Draw with pen").click();
  assert.equal(
    await tray.getByRole("slider", { name: "Size", exact: true }).inputValue(),
    "7",
  );
  pass("tool defaults persist after editor close and data rehydration");
  await button("Add sticky note").click();
  await tray.getByRole("button", { name: "Fill #E5F2FC", exact: true }).click();
  await setRange(tray, "Font size", 24);
  await tool("Add sticky note");
  await page.mouse.click(800, 345);
  const input = page.getByRole("textbox", {
    name: "Annotation text",
    exact: true,
  });
  await input.fill("یک ایدهٔ تازه\nMake room for ideas.");
  assert.equal(
    await page
      .locator(
        '.is-selected > .cv-context-toolbar [aria-label="Save annotation"]',
      )
      .count(),
    1,
  );
  await page.screenshot({ path: "qa/jam-edit.png" });
  await button("Save annotation").click();
  let sticky = page.locator(".cv-drawing-object[data-kind=sticky]");
  assert.equal(
    await sticky.locator(".cv-annotation-text").textContent(),
    "یک ایدهٔ تازه\nMake room for ideas.",
  );
  assert.equal((await saved()).at(-1).fontSize, 24);
  assert.equal(await page.evaluate(() => window.source()), source);
  pass(
    "sticky note supports multiline Persian text, paper color and font size without changing Markdown",
  );
  await button("Edit annotation text").click();
  await input.fill("Cancelled text");
  await button("Cancel annotation edit").click();
  assert.ok((await sticky.textContent()).includes("Make room"));
  pass("annotation edit cancel restores its saved text");
  await tool("Add label");
  await page.mouse.click(1085, 365);
  await input.fill("نیاز به بررسی");
  await input.press("Control+Enter");
  assert.equal(
    await page.locator("[data-kind=label] .cv-annotation-text").textContent(),
    "نیاز به بررسی",
  );
  pass(
    "editable label can be added and saved with keyboard without a new note",
  );
  await button("Add sticker").click();
  await tray.getByRole("button", { name: "Heart", exact: true }).click();
  await tool("Add sticker");
  await page.mouse.click(1070, 485);
  const sticker = page.locator("[data-kind=sticker]");
  assert.equal(
    await sticker.locator(".cv-stamp-art").getAttribute("aria-label"),
    "Heart",
  );
  const before = await sticker.boundingBox();
  await sticker.click({ position: { x: 30, y: 30 } });
  await button("Move drawing").press("ArrowRight");
  const after = await sticker.boundingBox();
  assert.ok(after.x >= before.x + 1);
  pass("sticker picker creates an independent selectable movable vector stamp");
  await button("Object appearance").click();
  await page
    .locator(".cv-full-properties")
    .getByRole("button", { name: "Star", exact: true })
    .click();
  assert.equal(
    await sticker.locator(".cv-stamp-art").getAttribute("aria-label"),
    "Star",
  );
  pass(
    "selected sticker can be changed through its contextual appearance panel",
  );
  await draw("Draw diamond", [1080, 620], [1210, 725]);
  assert.equal(await page.locator("[data-kind=diamond] polygon").count(), 1);
  await draw("Draw arrow", [785, 630], [990, 700]);
  assert.equal(
    await page.locator("[data-kind=arrow] .cv-drawing-visual path").count(),
    2,
  );
  pass("diamond and directional arrow are added alongside the existing shapes");
  await tool("Select objects");
  await page.screenshot({ path: "qa/jam-desktop.png" });
  // Open the sticky appearance panel and ensure it is clamped to the visible scroller.
  await sticky.click({ position: { x: 35, y: 35 } });
  await button("Object appearance").click();
  await setRange(page.locator(".cv-full-properties"), "Font size", 22);
  await page
    .locator(".cv-full-properties")
    .getByRole("button", { name: "Fill #FBE4E3", exact: true })
    .click();
  assert.equal((await saved()).find((d) => d.kind === "sticky").fontSize, 22);
  assert.equal(
    (await saved()).find((d) => d.kind === "sticky").fill,
    "#FBE4E3",
  );
  pass(
    "existing sticky appearance updates its paper and type size without changing its text",
  );
  const props = await page.locator(".cv-full-properties").boundingBox();
  assert.ok(props.y >= 52 && props.y + props.height <= 900);
  assert.ok(props.x >= 0 && props.x + props.width <= 1440);
  await page.screenshot({ path: "qa/jam-appearance.png" });
  pass(
    "selected annotation appearance panel remains within the visible editor",
  );
  await page.evaluate(() => window.remount());
  assert.equal(await page.locator("[data-kind=sticky]").count(), 1);
  assert.equal(await page.locator("[data-kind=label]").count(), 1);
  assert.equal(await page.locator("[data-kind=sticker]").count(), 1);
  assert.equal(await page.evaluate(() => window.source()), source);
  pass(
    "sticky text, label, stamp and shape appearance survive storage round trip",
  );
  // Preserve interrupted text if a user closes the note before explicitly saving.
  sticky = page.locator("[data-kind=sticky]");
  await sticky.click({ position: { x: 35, y: 35 } });
  await button("Edit annotation text").click();
  await input.fill("پیش‌نویس مهم");
  await page.evaluate(() => window.remount());
  assert.ok(
    await page.evaluate(() =>
      window.plugin.store.recoveryDrafts.some((d) => d.text === "پیش‌نویس مهم"),
    ),
  );
  pass(
    "closing an annotation editor preserves an unfinished draft in recovery data",
  );
  await button("Reset entire note layout").click();
  await button("Reset layout").click();
  assert.equal((await saved()).length, 0);
  assert.equal(await page.evaluate(() => window.source()), source);
  pass(
    "confirmed note reset clears all new object types but never original Markdown",
  );
  // Representative dark state and compact coarse-pointer view.
  await tool("Add sticky note");
  await page.mouse.click(810, 360);
  await input.fill("همان نوت، فضای بیشتر");
  await button("Save annotation").click();
  await tool("Add sticker");
  await page.mouse.click(1090, 410);
  await page.evaluate(() => {
    document.documentElement.classList.add("theme-dark");
    for (const [k, v] of Object.entries({
      "--background-primary": "#191919",
      "--background-modifier-border": "#484846",
      "--text-normal": "#f1f1ef",
      "--text-muted": "#b4b4af",
    }))
      document.documentElement.style.setProperty(k, v);
  });
  await page.screenshot({ path: "qa/jam-dark.png" });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phone = await context.newPage();
  phone.on("pageerror", (e) => errors.push(String(e)));
  await phone.goto(new URL("./harness.html", import.meta.url).href);
  await phone.waitForFunction(() => window.ready);
  await clickTool(phone, "Add sticker");
  await phone.screenshot({ path: "qa/jam-mobile-tray.png" });
  const tr = await phone.locator(".cv-tool-tray").boundingBox();
  assert.ok(tr.x >= 0 && tr.x + tr.width <= 390 && tr.y >= 52);
  await clickTool(phone, "Add sticker");
  await phone.mouse.click(170, 550);
  await phone.screenshot({ path: "qa/jam-mobile.png" });
  assert.equal(
    await phone.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  const box = await phone
    .locator(".cv-drawing-object.is-selected")
    .boundingBox();
  const toolbar = await phone
    .locator(".cv-drawing-object.is-selected .cv-context-toolbar")
    .boundingBox();
  assert.ok(toolbar.y + toolbar.height <= box.y);
  assert.ok(toolbar.x >= 0 && toolbar.x + toolbar.width <= 390);
  pass(
    "coarse-pointer mobile dock, sticker tray and selected toolbar fit without page overflow",
  );
  await context.close();
  assert.deepEqual(errors, []);
  pass("all JAM-inspired interactions run without browser runtime errors");
  await page.close();
  console.log(`${checks} JAM checks passed`);
} finally {
  await browser.close();
}
