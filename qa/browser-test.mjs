import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  assert.equal(await page.locator(".cv-card").count(), 3);
  console.log("PASS: actual plugin view renders 3 Markdown sections");
  await page
    .locator(".cv-card")
    .first()
    .getByRole("button", { name: "Attach a note or emoji", exact: true })
    .click();
  await page.getByRole("textbox").fill("⭐");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(".cv-attachment");
  let before = await page.locator(".cv-attachment").boundingBox();
  const grip = page
    .locator(".cv-card")
    .first()
    .getByRole("button", { name: /Move section:/ });
  await grip.focus();
  await page.keyboard.press("Shift+ArrowDown");
  let after = await page.locator(".cv-attachment").boundingBox();
  assert.equal(Math.round(after.y - before.y), 10);
  console.log("PASS: keyboard section movement carries its attached sticker");
  before = after;
  await page.evaluate(() => {
    document.querySelector(".cv-surface").scrollTop = 80;
  });
  after = await page.locator(".cv-attachment").boundingBox();
  assert.equal(Math.round(before.y - after.y), 80);
  console.log("PASS: sticker scrolls with note content, not fixed to viewport");
  await page.evaluate(
    () => (document.querySelector(".cv-surface").scrollTop = 0),
  );
  const ag = page
    .locator(".cv-attachment")
    .getByRole("button", { name: "Move attachment", exact: true });
  await ag.focus();
  await page.keyboard.press("Shift+ArrowRight");
  assert.equal(
    await page.evaluate(
      () =>
        window.plugin.store.boards["Vision.md"].tiles[
          "heading:1:A workspace, not a column:0"
        ].annotations[0].x,
    ),
    34,
  );
  console.log("PASS: attachment has independent parent-relative position");
  const start = await grip.boundingBox();
  await page.mouse.move(start.x + 10, start.y + 10);
  await page.mouse.down();
  await page.mouse.move(start.x + 90, start.y + 50, { steps: 8 });
  await page.mouse.up();
  assert.equal(
    await page.evaluate(
      () =>
        window.plugin.store.boards["Vision.md"].tiles[
          "heading:1:A workspace, not a column:0"
        ].x,
    ),
    128,
  );
  console.log("PASS: pointer drag updates spatial layout");
  await page
    .locator(".cv-card")
    .first()
    .getByRole("button", {
      name: "Resize section (arrow keys supported)",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Shift+ArrowRight");
  assert.equal(
    await page
      .locator(".cv-card")
      .first()
      .evaluate((el) => el.offsetWidth),
    370,
  );
  console.log("PASS: keyboard resize updates width");
  await page
    .locator(".cv-card")
    .first()
    .getByRole("button", { name: "Edit section Markdown", exact: true })
    .click();
  await page
    .getByRole("textbox")
    .fill(
      "# A workspace, not a column\nUpdated without damaging the next section.",
    );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() =>
    window.getSource().includes("Updated without"),
  );
  assert.match(await page.evaluate(() => window.getSource()), /\n# به ایده‌ها/);
  console.log("PASS: section editing preserves neighboring Persian Markdown");
  await page.waitForTimeout(100);
  await page.evaluate(() => window.view.refresh());
  await page.waitForSelector(".cv-attachment");
  assert.equal(await page.locator(".cv-attachment-text").textContent(), "⭐");
  console.log("PASS: refresh retains annotation and layout");
  await page
    .getByRole("button", { name: "Arrange sections in a grid", exact: true })
    .click();
  await page.waitForTimeout(100);
  await page
    .getByRole("button", { name: "Scroll to top left", exact: true })
    .click();
  await page
    .locator(".cv-card")
    .first()
    .getByRole("button", { name: "Edit section Markdown", exact: true })
    .click();
  await page
    .getByRole("textbox")
    .fill("A draft that should not overwrite a concurrent change");
  await page.evaluate(async () => {
    const app = window.plugin.app;
    const file = app.vault.getAbstractFileByPath("Vision.md");
    await app.vault.process(file, (current) => current + "\nExternal change");
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.match(await page.locator(".cv-error").textContent(), /changed/);
  assert.equal(
    await page.getByRole("textbox").inputValue(),
    "A draft that should not overwrite a concurrent change",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  console.log(
    "PASS: conflict leaves draft open and protects concurrent changes",
  );
  await page
    .locator(".cv-attachment")
    .getByRole("button", { name: "Remove attachment", exact: true })
    .click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".cv-attachment").count(), 0);
  await page
    .getByRole("button", {
      name: "Undo last layout or annotation change",
      exact: true,
    })
    .click();
  await page.waitForSelector(".cv-attachment");
  console.log("PASS: removed attachment can be restored with layout undo");
  await page.screenshot({ path: "qa/desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa/mobile.png" });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  console.log("PASS: narrow view keeps scrolling within spatial surface");
  assert.deepEqual(errors, []);
  console.log("PASS: no browser runtime errors");
  await page.close();
} finally {
  await browser.close();
}
