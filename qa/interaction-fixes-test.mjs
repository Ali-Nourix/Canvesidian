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
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const original = await page.evaluate(() => window.source());
  const data = () =>
    page.evaluate(() => window.plugin.store.notes["Vision.md"]);
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const tool = async (name) => {
    await clickTool(page, name);
    if (await page.locator(".cv-tool-tray").isVisible())
      await btn("Close tool settings").click();
  };
  // Match an Obsidian-style flex layout where margins previously stole the note's width.
  await page.addStyleTag({
    content: ".cm-content {flex-shrink:1!important;min-width:0!important}",
  });
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  const block = page.locator(".cv-floating-block");
  const geometry = () =>
    page.locator(".cm-content").evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      lines: [...el.querySelectorAll(".cm-line")].map((e) =>
        Math.round(e.getBoundingClientRect().height),
      ),
      margin: el.style.marginLeft,
    }));
  const before = await geometry();
  await block.focus();
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 30; i++) await page.keyboard.press("Shift+ArrowLeft");
    const current = await geometry();
    assert.equal(current.width, before.width);
    assert.deepEqual(current.lines, before.lines);
    assert.equal(current.margin, "");
  }
  assert.ok((await data()).pins[0].x < -1000);
  assert.equal(
    await page.locator(".cm-scroller").evaluate((el) => el.dataset.cvOrigin),
    undefined,
  );
  assert.equal(
    await page.locator(".cm-content").evaluate((el) => el.style.translate),
    "",
  );
  pass(
    "repeated negative left moves change only the object view, never note layout",
  );
  const b = await block.boundingBox();
  assert.ok(b.x >= 0);
  pass("negative objects remain reachable through the object camera");
  await page.evaluate(() => window.toggle());
  assert.equal(
    await page.locator(".cm-content").evaluate((el) => el.style.translate),
    "",
  );
  await page.evaluate(() => window.toggle());
  assert.equal((await geometry()).width, before.width);
  pass(
    "disabling restores the editor translation and enabling keeps the same width",
  );
  await page.evaluate(() => window.reset());
  const line = await page
    .locator(".cm-line")
    .filter({ hasText: "This paragraph stays" })
    .boundingBox();
  const content = await page.locator(".cm-content").boundingBox();
  await page.mouse.move(
    content.x + content.width + 15,
    line.y + line.height / 2,
  );
  await page.waitForTimeout(80);
  await page.locator(".cv-float-handle").click();
  assert.equal(await page.locator(".cv-source-hover-overlay").count(), 0);
  assert.equal(await page.locator(".cv-action-menu").count(), 0);
  assert.ok(await page.evaluate(() => window.nativeMenuCalls > 0));
  assert.equal(
    await page
      .getByRole("menuitem", { name: "Copy Markdown", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("menuitem", { name: "Select block text", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() =>
      window.view.state.sliceDoc(
        window.view.state.selection.main.from,
        window.view.state.selection.main.to,
      ),
    ),
    "This paragraph stays in the normal text flow.",
  );
  pass(
    "source grips use Obsidian Menu API with copy/select actions and no hover overlay",
  );
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  await block.locator(".cv-object-grip").hover();
  assert.equal(
    await block
      .locator(".cv-rotated-frame")
      .evaluate((el) => getComputedStyle(el, "::after").content),
    "none",
  );
  assert.equal(
    await block.evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  await block.locator(".cv-object-grip").click();
  await page
    .getByRole("menuitem", { name: "Align to note center", exact: true })
    .click();
  assert.equal(
    await block.evaluate((el) => el.classList.contains("is-selected")),
    true,
  );
  const p = (await data()).pins[0];
  assert.ok(Math.abs(p.x - 170) < 3, JSON.stringify(p));
  await block.locator(".cv-object-grip").click();
  await page
    .getByRole("menuitem", { name: "Reset rotation", exact: true })
    .click();
  assert.equal((await data()).pins[0].rotation, 0);
  pass(
    "floating grip actions align/reset without changing Markdown or losing selection",
  );
  await page.mouse.click(1400, 70);
  assert.equal(await block.locator(".cv-rotation-handle").isVisible(), false);
  await block.focus();
  assert.equal(await block.locator(".cv-rotation-handle").isVisible(), true);
  assert.equal(await page.locator(".cv-connection-port").count(), 0);
  pass("rotation remains selected-only and plus connection ports are removed");
  await page.evaluate(() => window.reset());
  const draw = async (x, y) => {
    await tool("Draw rectangle");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 160, y + 100, { steps: 8 });
    await page.mouse.up();
    await clickTool(page, "Select objects");
  };
  await draw(500, 300);
  await draw(1000, 500);
  await tool("Connect objects");
  await page.mouse.click(580, 350);
  await page.mouse.click(1080, 550);
  const link = (await data()).drawings.find((d) => d.kind === "connector");
  assert.ok(link?.sourceId && link?.targetId);
  const pathBefore = await page
    .locator("[data-kind=connector] .cv-vector")
    .innerHTML();
  await page.locator("[data-kind=rect]").nth(1).focus();
  await page.keyboard.press("Shift+ArrowDown");
  assert.notEqual(
    await page.locator("[data-kind=connector] .cv-vector").innerHTML(),
    pathBefore,
  );
  pass(
    "the previous two-click connector is restored and stays attached when a shape moves",
  );
  await tool("Draw arrow");
  await page.mouse.move(660, 350);
  await page.mouse.down();
  await page.mouse.move(1005, 550, { steps: 12 });
  await page.mouse.up();
  const arrow = (await data()).drawings.find((d) => d.kind === "arrow");
  assert.ok(arrow);
  assert.equal(arrow.sourceId, undefined);
  assert.equal(arrow.targetId, undefined);
  pass("normal arrow drawing is freehand again, with no automatic snap");
  await page.evaluate(() => window.remount());
  await page.waitForTimeout(100);
  assert.ok((await data()).drawings.find((d) => d.id === link.id)?.sourceId);
  assert.equal(await page.evaluate(() => window.source()), original);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "qa/fix-062.png" });
  pass(
    "reload preserves saved connections and original Markdown without browser errors",
  );
  console.log(`Verified ${checks} interaction fixes.`);
} finally {
  await browser.close();
}
