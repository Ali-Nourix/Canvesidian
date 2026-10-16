import { chromium } from "playwright";
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
  assert.equal(await page.locator(".cm-editor").count(), 1);
  assert.equal(await page.evaluate(() => window.leafCreates), 0);
  console.log(
    "PASS: extends the same real CodeMirror editor, no new note or workspace leaf",
  );
  const target = "Move this paragraph anywhere, then edit it right there.";
  const original = await page.evaluate(() => window.source());
  await page.evaluate((text) => window.floatText(text), target);
  await page.waitForSelector(".cv-floating-block");
  assert.equal(await page.evaluate(() => window.source()), original);
  assert.equal(
    await page
      .locator(".cm-content")
      .innerText()
      .then((t) => t.includes(target)),
    false,
  );
  console.log(
    "PASS: a single existing paragraph floats without rewriting or duplicating source",
  );
  let grip = page.getByRole("button", { name: "Move this block", exact: true });
  await grip.focus();
  let before = await page.locator(".cv-floating-block").boundingBox();
  await page.keyboard.press("Shift+ArrowRight");
  let after = await page.locator(".cv-floating-block").boundingBox();
  assert.equal(Math.round(after.x - before.x), 10);
  console.log(
    "PASS: keyboard placement changes only document-space coordinates",
  );
  let b = await grip.boundingBox();
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 90, b.y + 170, { steps: 12 });
  await page.mouse.up();
  after = await page.locator(".cv-floating-block").boundingBox();
  assert.ok(after.x > 450);
  console.log("PASS: pointer drag pulls the paragraph outside the text column");
  before = after;
  await page.evaluate(() => {
    document.querySelector(".cm-scroller").scrollTop = 60;
  });
  after = await page.locator(".cv-floating-block").boundingBox();
  assert.equal(Math.round(before.y - after.y), 60);
  console.log(
    "PASS: floating block scrolls with the same note, not the viewport",
  );
  await page.evaluate(
    () => (document.querySelector(".cm-scroller").scrollTop = 0),
  );
  await page
    .getByRole("button", { name: "Edit text in place", exact: true })
    .click();
  const input = page.getByRole("textbox", {
    name: "Edit floating block Markdown",
  });
  await input.fill("متن جدید، در همان نوت و همان محل.");
  assert.ok(
    await page.evaluate(() =>
      window.source().includes("متن جدید، در همان نوت و همان محل."),
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      window.source().includes("This paragraph stays in the normal text flow."),
    ),
  );
  await page.screenshot({ path: "qa/editing.png" });
  console.log(
    "PASS: editing in place changes the original document and preserves neighboring text",
  );
  await page.keyboard.press("Control+z");
  assert.equal(await input.inputValue(), target);
  await page.keyboard.press("Control+Shift+z");
  assert.equal(await input.inputValue(), "متن جدید، در همان نوت و همان محل.");
  console.log(
    "PASS: in-place typing participates in the original editor undo/redo history",
  );
  await page
    .getByRole("button", { name: "Finish editing this block", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector(".cv-floating-body")
      .textContent.includes("متن جدید"),
  );
  console.log(
    "PASS: finishing editing renders the same block in place without a modal",
  );
  const geometry = await page.locator(".cv-floating-block").evaluate((el) => ({
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
  }));
  await page.evaluate(() => window.remount());
  await page.waitForSelector(".cv-floating-block");
  assert.deepEqual(
    await page.locator(".cv-floating-block").evaluate((el) => ({
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
    })),
    geometry,
  );
  console.log(
    "PASS: editor close/reopen restores placement and content from persisted anchors",
  );
  await page.evaluate(() => window.mode(false));
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  assert.ok(
    await page
      .locator(".cm-content")
      .innerText()
      .then((t) => t.includes("متن جدید")),
  );
  await page.evaluate(() => window.mode(true));
  await page.waitForSelector(".cv-floating-block");
  console.log(
    "PASS: Source mode restores normal Markdown; Live Preview restores spatial layout",
  );
  await page.evaluate(() => window.toggle());
  assert.equal(await page.locator(".cv-floating-block").count(), 0);
  await page.evaluate(() => window.toggle());
  await page.waitForSelector(".cv-floating-block");
  console.log(
    "PASS: per-note spatial toggle is reversible without altering content",
  );
  await page.evaluate(() => window.floatText("const idea"));
  await page.waitForFunction(
    () => document.querySelectorAll(".cv-floating-block").length === 2,
  );
  assert.ok(
    await page
      .locator(".cv-floating-block pre")
      .textContent()
      .then((t) => t.includes("const idea")),
  );
  console.log("PASS: fenced code floats as one complete block");
  await page.evaluate(() => window.floatText("![Sketch]"));
  await page.waitForFunction(
    () => document.querySelectorAll(".cv-floating-block").length === 3,
  );
  console.log("PASS: an existing image Markdown block floats independently");
  const texts = await page.evaluate(() => window.source());
  await page
    .locator(".cv-floating-block")
    .first()
    .locator(".cv-floating-body")
    .click();
  await page
    .getByRole("button", {
      name: "Return block to normal text flow",
      exact: true,
    })
    .first()
    .click();
  assert.equal(await page.evaluate(() => window.source()), texts);
  assert.equal(await page.locator(".cv-floating-block").count(), 2);
  console.log(
    "PASS: returning a block changes layout only, never source order or text",
  );
  // Changes in the ordinary editor must move source anchors without moving placements.
  const originalGeometry = await page
    .locator(".cv-floating-block")
    .last()
    .evaluate((el) => ({ left: el.style.left, top: el.style.top }));
  await page.evaluate(() =>
    window.view.dispatch({
      changes: { from: 0, insert: "Inserted before everything.\n\n" },
    }),
  );
  assert.deepEqual(
    await page
      .locator(".cv-floating-block")
      .last()
      .evaluate((el) => ({ left: el.style.left, top: el.style.top })),
    originalGeometry,
  );
  console.log(
    "PASS: native document transactions map anchors without changing placements",
  );
  const countBefore = await page.locator(".cv-floating-block").count();
  await page.evaluate(() => {
    const v = window.view;
    v.dispatch({
      changes: {
        from: 0,
        to: v.state.doc.length,
        insert: "External prefix.\n\n" + v.state.doc.toString(),
      },
    });
  });
  assert.equal(await page.locator(".cv-floating-block").count(), countBefore);
  console.log(
    "PASS: whole-document replacement safely reanchors multiple floating blocks",
  );

  await page.evaluate(() => window.floatText("متن جدید"));
  await page.waitForTimeout(40);
  // Exercise IME, not merely setting a Persian string with fill().
  const textCard = page
    .locator(".cv-floating-block")
    .filter({ hasText: "متن جدید" });
  await textCard
    .getByRole("button", { name: "Edit text in place", exact: true })
    .click();
  const composing = page.getByRole("textbox", {
    name: "Edit floating block Markdown",
  });
  await composing.evaluate((input) => {
    input.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    input.value = "پیش‌نویس فارسی در حال تایپ";
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        isComposing: true,
      }),
    );
  });
  assert.equal(
    await page.evaluate(() =>
      window.source().includes("پیش‌نویس فارسی در حال تایپ"),
    ),
    false,
  );
  await composing.evaluate((input) =>
    input.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    ),
  );
  assert.equal(
    await page.evaluate(() =>
      window.source().includes("پیش‌نویس فارسی در حال تایپ"),
    ),
    true,
  );
  console.log("PASS: IME composition commits only after compositionend");
  await composing.evaluate((input) => {
    input.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    input.value = "این پیش‌نویس نباید گم شود";
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
  });
  await page.evaluate(() => {
    const v = window.view;
    const current = v.state.doc.toString();
    const text = "پیش‌نویس فارسی در حال تایپ";
    const from = current.indexOf(text);
    v.dispatch({
      changes: {
        from,
        to: from + text.length,
        insert: "Concurrent source edit",
      },
    });
  });
  await composing.evaluate((input) =>
    input.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    ),
  );
  assert.equal(await composing.inputValue(), "این پیش‌نویس نباید گم شود");
  assert.ok(
    await page.evaluate(() =>
      window.source().includes("Concurrent source edit"),
    ),
  );
  assert.ok(await page.locator(".cv-draft-warning").count());
  await page.screenshot({ path: "qa/conflict.png" });
  await page
    .locator(".cv-floating-block")
    .filter({ has: composing })
    .getByRole("button", {
      name: "Return block to normal text flow",
      exact: true,
    })
    .click();
  assert.ok(
    await page.evaluate(() =>
      window.plugin.store.recoveryDrafts.some(
        (d) => d.text === "این پیش‌نویس نباید گم شود",
      ),
    ),
  );
  console.log(
    "PASS: concurrent source change does not overwrite composition; interrupted draft is recoverable",
  );

  // Start from the user's actual hover grip, not only the command helper.
  await page.evaluate(() => window.reset());
  await page.waitForTimeout(120);
  const line = page.locator(".cm-line").filter({ hasText: target });
  await line.hover();
  await page.waitForSelector(".cv-float-handle:not([hidden])");
  const hoverGrip = await page.locator(".cv-float-handle").boundingBox();
  await page.mouse.move(hoverGrip.x + 12, hoverGrip.y + 12);
  await page.mouse.down();
  await page.mouse.move(hoverGrip.x + 620, hoverGrip.y + 120, { steps: 12 });
  await page.mouse.up();
  assert.equal(await page.locator(".cv-floating-block").count(), 1);
  assert.equal(await page.evaluate(() => window.source()), original);
  console.log(
    "PASS: hovering and dragging the native paragraph grip creates a floating block in one gesture",
  );

  // A clean, non-overlapping example for visual QA (not a claim of real Obsidian rendering).
  await page.evaluate(() => window.floatText("const idea"));
  const moveCard = async (card, x, y) => {
    await card
      .locator(".cv-floating-body")
      .click({ position: { x: 24, y: 12 } });
    const box = await card.boundingBox();
    const g = await card
      .getByRole("button", { name: "Move this block", exact: true })
      .boundingBox();
    await page.mouse.move(g.x + 12, g.y + 12);
    await page.mouse.down();
    await page.mouse.move(g.x + 12 + x - box.x, g.y + 12 + y - box.y, {
      steps: 12,
    });
    await page.mouse.up();
  };
  const cardList = page.locator(".cv-floating-block");
  await moveCard(cardList.nth(0), 820, 150);
  await moveCard(cardList.nth(1), 820, 360);
  await page.mouse.move(1400, 850);
  await page.waitForTimeout(180);
  await page.screenshot({ path: "qa/desktop.png" });
  await moveCard(cardList.nth(0), 16, 500);
  const resizer = cardList
    .nth(0)
    .getByRole("button", { name: "Resize block", exact: true });
  await resizer.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("Shift+ArrowLeft");
  await page.setViewportSize({ width: 390, height: 844 });
  await cardList
    .nth(0)
    .getByRole("button", { name: "Move this block", exact: true })
    .evaluate((el) => el.focus({ preventScroll: true }));
  await page.evaluate(() => {
    const s = document.querySelector(".cm-scroller");
    s.scrollLeft = 0;
    s.scrollTop = 0;
  });
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({ path: "qa/mobile.png" });
  console.log("PASS: narrow screen scroll stays inside the editor surface");
  assert.equal(await page.evaluate(() => window.testFutureData()), true);
  console.log(
    "PASS: unsupported future storage is never overwritten, including on unload",
  );
  assert.equal(await page.evaluate(() => window.fileWrites), 0);
  assert.equal(await page.evaluate(() => window.leafCreates), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: no runtime errors, direct vault rewrites, or additional workspace leaves",
  );
  await page.close();
} finally {
  await browser.close();
}
