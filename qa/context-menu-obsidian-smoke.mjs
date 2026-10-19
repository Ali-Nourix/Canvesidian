// Optional actual-app smoke test, only for the isolated documentation vault.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
try {
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes("index.html"));
  page.setDefaultTimeout(10000);
  await page.waitForFunction(() => !!app.plugins.plugins.canvesidian);
  const version = await page.evaluate(() => {
    if (app.vault.adapter.getBasePath() != "/data/canvsidian-demo-vault")
      throw Error("Not the disposable demo vault");
    return app.plugins.plugins.canvesidian.manifest.version;
  });
  assert.equal(version, "0.6.6");
  const block = page.locator(".cv-floating-block");
  await block.waitFor();
  const source = await page.evaluate(() =>
    app.workspace.activeLeaf.view.editor.getValue(),
  );
  const placement = () =>
    page.evaluate(() => {
      const p =
        app.plugins.plugins.canvesidian.store.notes["Launch plan.md"].pins[0];
      return { x: p.x, y: p.y, width: p.width, height: p.height };
    });
  const before = await placement();
  await block
    .locator(".cv-floating-body")
    .click({ button: "right", position: { x: 60, y: 30 } });
  await page
    .getByText("Return to text flow", { exact: true })
    .waitFor({ state: "visible" });
  assert.equal(await page.locator(".is-transforming").count(), 0);
  assert.deepEqual(await placement(), before);
  console.log(
    "PASS: actual Obsidian right-click opens floating Markdown menu without moving the block",
  );
  await page.getByText("Edit text", { exact: true }).click();
  const input = page.getByRole("textbox", {
    name: "Edit floating block Markdown",
    exact: true,
  });
  await input.waitFor();
  await input.evaluate((el) =>
    el.addEventListener(
      "contextmenu",
      (e) => (window.lastNativeInputContext = e),
    ),
  );
  await input.click({ button: "right" });
  assert.equal(
    await page.evaluate(() => window.lastNativeInputContext.defaultPrevented),
    false,
  );
  assert.equal(
    await page.getByText("Return to text flow", { exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Finish editing this block", exact: true })
    .click();
  await block.locator(".cv-floating-body strong").waitFor();
  console.log(
    "PASS: actual Obsidian Edit text works and textarea right-click is not intercepted",
  );
  const sticky = page.locator("[data-kind=sticky]").last();
  {
    const r = await sticky.boundingBox();
    await page.mouse.click(r.x + 60, r.y + 60, { button: "right" });
  }
  await page
    .getByText("Appearance and text size", { exact: true })
    .waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  console.log(
    "PASS: actual Obsidian sticky-note body right-click opens native annotation actions",
  );
  await block
    .locator(".cv-floating-body")
    .click({ button: "right", position: { x: 60, y: 30 } });
  await page.waitForFunction(() => !document.querySelector(".notice"));
  await page.screenshot({ path: "/data/obsidian-context-menu-066.png" });
  assert.equal(
    await page.evaluate(() => app.workspace.activeLeaf.view.editor.getValue()),
    source,
  );
  await page.keyboard.press("Escape");
  console.log(
    "PASS: actual Obsidian Escape closes the menu and original Markdown stays unchanged",
  );
} finally {
  await browser.close();
}
