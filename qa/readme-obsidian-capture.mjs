// Real Obsidian documentation capture. Requires a disposable local demo vault.
// Uses the production plugin, real MarkdownRenderer and native Obsidian controls.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { clickTool } from "./tool-helpers.mjs";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
const page = browser
  .contexts()[0]
  .pages()
  .find((p) => p.url().includes("index.html"));
const button = (name) => page.getByRole("button", { name, exact: true });
const out = new URL("../docs/images/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const source = readFileSync(
  new URL("../docs/demo-note.md", import.meta.url),
  "utf8",
);
const closeTray = async () => {
  if (await page.locator(".cv-tool-tray").isVisible())
    await button("Close tool settings").click();
};
const move = async (locator, x, y, name) => {
  await locator.focus();
  const before = await locator.boundingBox();
  const grip = await locator
    .getByRole("button", { name, exact: true })
    .boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip.x + grip.width / 2 + x - before.x,
    grip.y + grip.height / 2 + y - before.y,
    { steps: 24 },
  );
  await page.mouse.up();
};
const settle = async () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
const capture = async (name) => {
  await page.mouse.move(600, 90);
  await page.waitForFunction(
    () => !document.querySelector(".notice"),
    {},
    { timeout: 15000 },
  );
  await settle();
  await page.screenshot({ path: out + name + ".png" });
  console.log("Captured real Obsidian:", name);
};
try {
  await page.evaluate(async (source) => {
    if (app.vault.adapter.getBasePath() != "/data/canvsidian-demo-vault")
      throw Error("Refusing to modify a non-demo vault");
    const window = require("@electron/remote").getCurrentWindow();
    window.setSize(1440, 960);
    window.setPosition(0, 0);
    app.workspace.leftSplit?.collapse();
    if (app.workspace.activeLeaf.view.editor.getValue() !== source)
      throw Error("Open a fresh demo vault using docs/demo-note.md");
    if (!document.body.classList.contains("theme-dark"))
      app.commands.executeCommandById("theme:toggle-light-dark");
  }, source);
  await page.waitForSelector(".cv-tool-dock");
  await page.waitForFunction(() => innerWidth >= 1400);
  await page.evaluate(() => {
    const view = app.workspace.activeLeaf.view;
    view.editor.setCursor({
      line: view.editor
        .getValue()
        .split("\n")
        .findIndex((s) => s.startsWith("**One source")),
      ch: 0,
    });
    app.commands.executeCommandById("canvesidian:float-current-block");
  });
  await page.waitForSelector(".cv-floating-block");
  const block = page.locator(".cv-floating-block");
  await button("Text block settings").click();
  for (const [name, value] of [
    ["Text block width", "430"],
    ["Text font size", "22"],
    ["Text block height", "140"],
  ]) {
    const input = page.getByRole("spinbutton", { name, exact: true });
    await input.fill(value);
    await input.press("Tab");
  }
  await page.mouse.click(600, 170);
  await move(block, 780, 185, "Move this block");
  await page.evaluate(
    () => (document.querySelector(".cm-scroller").scrollTop = 0),
  );
  const makeSticky = async (text, color, x, y) => {
    await clickTool(page, "Add sticky note");
    await button("Fill " + color).click();
    await page
      .getByRole("slider", { name: "Font size", exact: true })
      .evaluate((el) => {
        el.value = "21";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await closeTray();
    await page.mouse.click(x, y);
    await page
      .getByRole("textbox", { name: "Annotation text", exact: true })
      .fill(text);
    await button("Save annotation").click();
    const item = page
      .locator("[data-kind=sticky]")
      .nth((await page.locator("[data-kind=sticky]").count()) - 1);
    return item;
  };
  const a = await makeSticky(
    "01  CAPTURE\nCollect the idea.",
    "#FFF0AD",
    800,
    410,
  );
  await a
    .getByRole("button", { name: "Add tape to sticky", exact: true })
    .click();
  const b = await makeSticky(
    "02  CONNECT\nFind the next step.",
    "#E5F2FC",
    1130,
    410,
  );
  const c = await makeSticky("03  SHIP\nMake it useful.", "#DDF1E4", 1130, 660);
  const nodes = page.locator("[data-kind=sticky]");
  const connect = async (source, target) => {
    await clickTool(page, "Connect objects");
    await closeTray();
    for (const index of [source, target]) {
      const r = await nodes.nth(index).boundingBox();
      await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    }
    await clickTool(page, "Select objects");
  };
  await connect(0, 1);
  await connect(1, 2);
  await clickTool(page, "Add sticker");
  await button("Rocket").click();
  await closeTray();
  await page.mouse.click(1280, 210);
  await clickTool(page, "Select objects");
  await block.focus();
  await capture("obsidian-overview-dark");
  const noteBefore = await page.evaluate(() =>
    app.workspace.activeLeaf.view.editor.getValue(),
  );
  await page.evaluate(() => {
    if (!document.body.classList.contains("theme-light"))
      app.commands.executeCommandById("theme:toggle-light-dark");
  });
  await page.waitForFunction(() =>
    document.body.classList.contains("theme-light"),
  );
  await block.focus();
  await button("Edit text in place").click();
  await page
    .getByRole("textbox", { name: "Edit floating block Markdown", exact: true })
    .waitFor();
  await capture("obsidian-edit-light");
  await button("Finish editing this block").click();
  await block.locator(".cv-floating-body strong").waitFor({ state: "visible" });
  await block.focus();
  await block.locator(".cv-object-grip").click();
  await capture("obsidian-actions-light");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    if (!document.body.classList.contains("theme-dark"))
      app.commands.executeCommandById("theme:toggle-light-dark");
  });
  await page.waitForFunction(() =>
    document.body.classList.contains("theme-dark"),
  );
  await button("Toggle note effects").click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".cv-floating-block,.cv-drawing-object")
        .length === 0,
  );
  if (
    (await page.evaluate(() =>
      app.workspace.activeLeaf.view.editor.getValue(),
    )) !== noteBefore
  )
    throw Error("Toggle altered source");
  await capture("obsidian-normal-flow-dark");
  await button("Toggle note effects").click();
  await page.evaluate(() => app.plugins.plugins.canvesidian.flush());
  const details = await page.evaluate(() => ({
    appVersion: require("@electron/remote").app.getVersion(),
    pluginVersion: app.plugins.plugins.canvesidian.manifest.version,
    screenshotViewport: { width: innerWidth, height: innerHeight },
    connectedArrows: app.plugins.plugins.canvesidian.store.notes[
      "Launch plan.md"
    ].drawings.filter((d) => d.kind === "connector").length,
    sourceUnchangedByToggle: true,
    renderer: "Obsidian application, default theme, native MarkdownRenderer",
    fixture: "Synthetic demo vault; no user notes or private data",
  }));
  writeFileSync(
    out + "capture-info.json",
    JSON.stringify(details, null, 2) + "\n",
  );
  console.log(JSON.stringify(details));
} finally {
  await browser.close();
}
