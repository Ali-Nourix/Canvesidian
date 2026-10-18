import { chromium } from "playwright";
import assert from "node:assert/strict";
import { clickTool } from "./tool-helpers.mjs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
let checks = 0;
const pass = (s) => {
  checks++;
  console.log("PASS: " + s);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const data = () =>
    page.evaluate(() => window.plugin.store.notes["Vision.md"]);
  const original = await page.evaluate(() => window.source());
  const line = page
    .locator(".cm-line")
    .filter({ hasText: "This paragraph stays" });
  await line.hover();
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".cv-float-handle").isVisible(), false);
  pass("content hover does not show a typing grip");
  const content = await page.locator(".cm-content").boundingBox(),
    lr = await line.boundingBox();
  await page.mouse.move(content.x + content.width + 15, lr.y + lr.height / 2);
  await page.waitForTimeout(80);
  assert.equal(await page.locator(".cv-float-handle").isVisible(), true);
  assert.equal(await page.locator(".cv-source-hover-overlay").count(), 0);
  await page.locator(".cv-float-handle").click();
  assert.equal(await page.locator(".menu").isVisible(), true);
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  pass(
    "right gutter reveals only its grip and a click opens host menu actions without floating",
  );
  await page
    .getByRole("menuitem", { name: "Float and move", exact: true })
    .click();
  await page.waitForSelector(".cv-floating-block");
  const block = page.locator(".cv-floating-block");
  await page.mouse.move(20, 20);
  assert.equal(
    await block
      .locator(".cv-object-grip")
      .evaluate((el) => getComputedStyle(el).opacity),
    "0",
  );
  assert.equal(
    await block
      .locator(".cv-rotation-handle")
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  await block.locator(".cv-object-grip").hover();
  assert.equal(
    await block
      .locator(".cv-object-grip")
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  pass("grips stay quiet while selected rotation controls remain visible");
  await btn("Text block settings").click();
  await page
    .getByRole("spinbutton", { name: "Text font size", exact: true })
    .fill("40");
  await page
    .getByRole("spinbutton", { name: "Text font size", exact: true })
    .press("Tab");
  await page
    .getByRole("spinbutton", { name: "Text block width", exact: true })
    .fill("700");
  await page
    .getByRole("spinbutton", { name: "Text block width", exact: true })
    .press("Tab");
  assert.equal(
    await block
      .locator(".cv-floating-body")
      .evaluate((el) => getComputedStyle(el).fontSize),
    "40px",
  );
  assert.equal((await data()).pins[0].width, 700);
  pass("Markdown text size and block width are editable and persisted");
  await page.mouse.click(1100, 80);
  const tool = async (name) => {
    await clickTool(page, name);
    if (await page.locator(".cv-tool-tray").isVisible())
      await btn("Close tool settings").click();
  };
  const draw = async (x, y, w, h) => {
    await tool("Draw rectangle");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + w, y + h, { steps: 8 });
    await page.mouse.up();
    await clickTool(page, "Select objects");
  };
  await draw(810, 300, 140, 100);
  await draw(1130, 420, 140, 100);
  await tool("Connect objects");
  await page.mouse.click(875, 350);
  await page.mouse.click(1200, 470);
  assert.equal(
    (await data()).drawings.filter((d) => d.kind === "connector").length,
    1,
  );
  const link = page.locator("[data-kind=connector]");
  const oldPath = await link
    .locator(".cv-vector > path")
    .first()
    .getAttribute("d");
  const dest = page.locator("[data-kind=rect]").nth(1);
  await dest.focus();
  await page.keyboard.press("Shift+ArrowDown");
  assert.notEqual(
    await link.locator(".cv-vector > path").first().getAttribute("d"),
    oldPath,
  );
  pass("attached arrow connects two shapes and reroutes when a target moves");
  const selectedID = await dest.getAttribute("data-id");
  const ordered = (note) =>
    [...note.pins, ...note.drawings]
      .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0))
      .map((d) => d.id);
  const beforeOrder = ordered(await data());
  await page.evaluate(() => (window.transactionCount = 0));
  await page.keyboard.press("Control+BracketLeft");
  assert.equal(await page.evaluate(() => window.transactionCount), 1);
  assert.equal(
    ordered(await data()).indexOf(selectedID),
    beforeOrder.indexOf(selectedID) - 1,
  );
  const back = (await data()).drawings.filter((d) => d.kind === "rect")[1]
    .layer;
  assert.ok(Number.isFinite(back));
  await page.keyboard.press("Control+BracketRight");
  assert.deepEqual(ordered(await data()), beforeOrder);
  assert.ok(
    (await data()).drawings.filter((d) => d.kind === "rect")[1].layer > back,
  );
  await dest.locator(".cv-object-grip").click();
  assert.equal(
    await page
      .getByRole("menuitem", { name: "Send to back", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("menuitem", { name: "Send to back", exact: true })
    .click();
  pass("layer shortcuts and grip actions change persisted object order");
  assert.equal(
    await page.locator('.cv-tool-dock > [aria-label="Tool settings"]').count(),
    0,
  );
  assert.equal(
    await page
      .locator('.cv-tool-dock > [aria-label="Plugin settings"]')
      .count(),
    1,
  );
  assert.equal(
    await btn("Toggle note effects").locator("svg").getAttribute("data-icon"),
    "toggle-right",
  );
  await btn("Toggle note effects").click();
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  await btn("Toggle note effects").click();
  assert.equal(await page.locator(".cv-floating-block").count(), 1);
  pass("single settings action and reversible toggle preserve the note");
  await tool("Add sticker");
  assert.ok((await page.locator(".cv-sticker-grid button").count()) >= 28);
  await btn("Close tool settings")
    .click()
    .catch(() => {});
  await page.mouse.click(1020, 650);
  await clickTool(page, "Select objects");
  const sticker = page.locator("[data-kind=sticker]");
  await sticker.focus();
  await page.evaluate(() => {
    window.savedX = window.plugin.store.notes["Vision.md"].drawings.find(
      (d) => d.kind === "sticker",
    ).x;
  });
  // A single real drag crosses the old x=0 boundary. Then pan left to see it.
  const grip = await sticker.locator(".cv-object-grip").boundingBox();
  await page.mouse.move(grip.x + 12, grip.y + 12);
  await page.mouse.down();
  await page.mouse.move(grip.x - 1100, grip.y + 12, { steps: 20 });
  await page.mouse.up();
  const savedSticker = (await data()).drawings.find(
    (d) => d.kind === "sticker",
  );
  assert.ok(savedSticker.x < 0, JSON.stringify(savedSticker));
  await btn("Object view").click();
  await page
    .getByRole("menuitem", { name: "View space to the left", exact: true })
    .click();
  await page.waitForTimeout(80);
  const bounds = await sticker.boundingBox();
  assert.ok(bounds.x >= 0);
  pass(
    "negative left-side placement stays reachable through the object-only view",
  );
  await page.evaluate(() => window.remount());
  await page.waitForTimeout(100);
  const savedAgain = (await data()).drawings.find((d) => d.kind === "sticker");
  assert.equal(savedAgain.x, savedSticker.x);
  assert.equal((await data()).pins[0].fontSize, 40);
  pass(
    "reload preserves left geometry, connectors, layers and text appearance",
  );
  assert.equal(await page.evaluate(() => window.source()), original);
  assert.deepEqual(errors, []);
  pass(
    "all layout changes leave original Markdown untouched with no browser errors",
  );
  await page.screenshot({ path: "qa/refinement-light.png" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty(
      "--background-primary",
      "#1e1e1e",
    );
    document.documentElement.style.setProperty(
      "--background-secondary",
      "#292929",
    );
    document.documentElement.style.setProperty("--text-normal", "#dedede");
    document.documentElement.style.setProperty("--text-muted", "#aaa");
    document.documentElement.style.setProperty(
      "--background-modifier-hover",
      "#ffffff16",
    );
  });
  await page.screenshot({ path: "qa/refinement-dark.png" });
  // Markdown pins are also valid endpoints; a transform preview must stay DOM-only.
  await page.evaluate(() => window.reset());
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  await draw(1020, 450, 180, 110);
  const textBlock = page.locator(".cv-floating-block"),
    box = await textBlock.boundingBox();
  await tool("Connect objects");
  await page.mouse.click(box.x + 30, box.y + 25);
  await page.mouse.click(1100, 500);
  assert.equal(
    (await data()).drawings.find((d) => d.kind === "connector").sourceId,
    (await data()).pins[0].id,
  );
  const textLink = page.locator("[data-kind=connector] .cv-vector");
  const start = await textLink.evaluate((el) => ({
    path: el.firstChild.getAttribute("d"),
    rect: el.getBoundingClientRect().toJSON(),
  }));
  await textBlock.focus();
  const move = await btn("Move this block").boundingBox();
  await page.mouse.move(move.x + 12, move.y + 12);
  await page.mouse.down();
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.move(move.x - 60, move.y + 70, { steps: 12 });
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => window.transactionCount), 0);
  const preview = await textLink.evaluate((el) => ({
    path: el.firstChild.getAttribute("d"),
    rect: el.getBoundingClientRect().toJSON(),
  }));
  assert.notDeepEqual(preview, start);
  await page.mouse.up();
  await textBlock.focus();
  await btn("Return block to normal text flow").click();
  assert.equal(
    (await data()).drawings.filter((d) => d.kind === "connector").length,
    0,
  );
  assert.equal(await page.evaluate(() => window.source()), original);
  pass(
    "connectors follow Markdown blocks live without transactions and are removed on return to flow",
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(new URL("./harness.html", import.meta.url).href);
  await mobile.waitForFunction(() => window.ready);
  await mobile.evaluate(() => window.floatText("Move this paragraph anywhere"));
  const mobileGrip = await mobile.locator(".cv-object-grip").boundingBox();
  assert.ok(mobileGrip.x >= 0 && mobileGrip.x + mobileGrip.width <= 390);
  pass(
    "right action gutter remains reachable in a narrow coarse-pointer editor",
  );
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(`Verified ${checks} refinement interactions.`);
} finally {
  await browser.close();
}
