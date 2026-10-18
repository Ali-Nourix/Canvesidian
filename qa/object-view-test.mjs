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
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  const source = await page.evaluate(() => window.source()),
    data = () => page.evaluate(() => window.plugin.store.notes["Vision.md"]);
  const native = () =>
    page
      .locator(".cm-scroller")
      .evaluate((s) => ({
        x: s.scrollLeft,
        width: s.clientWidth,
        overflow: s.scrollWidth,
        contentX: s.querySelector(".cm-content").getBoundingClientRect().x,
        contentWidth: s.querySelector(".cm-content").getBoundingClientRect()
          .width,
      }));
  const baseline = await native();
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const tool = async (name) => {
    await clickTool(page, name);
    if (await page.locator(".cv-tool-tray").isVisible())
      await btn("Close tool settings").click();
  };
  const draw = async (x, y) => {
    await tool("Draw rectangle");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 160, y + 100, { steps: 8 });
    await page.mouse.up();
    await clickTool(page, "Select objects");
  };
  await draw(400, 300);
  await draw(800, 500);
  const ids = (await data()).drawings.map((d) => d.id);
  await page.mouse.move(600, 150);
  await page.keyboard.down("Alt");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Alt");
  await page.waitForTimeout(80);
  assert.equal((await data()).viewX, 240);
  assert.deepEqual(await native(), baseline);
  pass(
    "panning objects does not add native horizontal overflow or change note geometry",
  );
  await tool("Connect objects");
  let boxes = await page.locator("[data-kind=rect]").all();
  for (const box of boxes) {
    const r = await box.boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  }
  let link = (await data()).drawings.find((d) => d.kind === "connector");
  assert.equal(link.sourceId, ids[0]);
  assert.equal(link.targetId, ids[1]);
  pass("two-click connectors use correct world coordinates in a panned view");
  const src = page.locator(`[data-id="${ids[0]}"]`);
  await src.focus();
  for (let i = 0; i < 90; i++) await page.keyboard.press("Shift+ArrowLeft");
  assert.equal((await data()).drawings.find((d) => d.id === ids[0]).x, -500);
  assert.deepEqual(await native(), baseline);
  const savedView = (await data()).viewX;
  assert.ok(savedView > 0);
  await page.evaluate(() => window.remount());
  await page.waitForTimeout(100);
  assert.equal((await data()).viewX, savedView);
  assert.equal((await data()).drawings.find((d) => d.id === ids[0]).x, -500);
  const r = await src.boundingBox();
  assert.ok(r.x >= 0 && r.x < 40);
  link = (await data()).drawings.find((d) => d.kind === "connector");
  assert.equal(link.sourceId, ids[0]);
  assert.equal(link.targetId, ids[1]);
  assert.equal(await page.evaluate(() => window.source()), source);
  assert.deepEqual(await native(), baseline);
  pass(
    "negative positions, camera and attached connector references survive close/reopen",
  );
  await draw(500, 700);
  const created = (await data()).drawings
      .filter((d) => d.kind === "rect")
      .at(-1),
    box = await page.locator(`[data-id="${created.id}"]`).boundingBox();
  assert.ok(Math.abs(created.x - (500 - savedView)) < 1);
  assert.ok(Math.abs(box.x - 500) < 1);
  pass(
    "new shapes are created at the pointer even when their world position is negative",
  );
  await page.evaluate(() => window.floatText("Move this paragraph anywhere"));
  const block = page.locator(".cv-floating-block");
  await block.locator(".cv-object-grip").click();
  await page
    .getByRole("menuitem", { name: "Align to note left", exact: true })
    .click();
  assert.ok(Math.abs((await block.boundingBox()).x - 56) < 1);
  await btn("Edit text in place").click();
  const input = page.getByRole("textbox", {
    name: "Edit floating block Markdown",
    exact: true,
  });
  await input.fill("متن شناور در فضای مستقل");
  await input.press("Control+Enter");
  assert.ok(
    (await page.evaluate(() => window.source())).includes(
      "متن شناور در فضای مستقل",
    ),
  );
  assert.ok(
    (await page.evaluate(() => window.source())).includes(
      "This paragraph stays in the normal text flow.",
    ),
  );
  assert.deepEqual(await native(), baseline);
  pass(
    "floating Markdown remains editable and can align to the stationary note after object panning",
  );
  await btn("Object view").click();
  await page
    .getByRole("menuitem", { name: "Reset object view", exact: true })
    .click();
  assert.equal((await data()).viewX, 0);
  await src.focus();
  await btn("Object view").click();
  await page
    .getByRole("menuitem", { name: "Show selected object", exact: true })
    .click();
  assert.ok((await src.boundingBox()).x >= 0);
  assert.deepEqual(await native(), baseline);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "qa/object-view-065.png" });
  pass(
    "view reset and show-selected recovery affect only the object layer, with no runtime errors",
  );
  console.log(`Verified ${checks} object-view integration checks.`);
} finally {
  await browser.close();
}
