import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
let checks = 0;
const pass = (t) => {
  checks++;
  console.log("PASS: " + t);
};
const near = (a, b, label) =>
  assert.ok(Math.abs(a - b) < 0.7, `${label}: ${a} != ${b}`);
try {
  for (const split of [false, true])
    for (const dir of ["ltr", "rtl"]) {
      const page = await browser.newPage({
        viewport: { width: 1100, height: 900 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(new URL("./harness.html", import.meta.url).href);
      await page.waitForFunction(() => window.ready);
      await page.addStyleTag({
        content: `.cm-scroller{direction:${dir}!important;overflow-y:scroll!important}.cm-content{direction:${dir}} .cm-scroller::-webkit-scrollbar{width:17px;height:17px}`,
      });
      await page.evaluate((split) => {
        window.reset(
          window.original +
            "\n\n" +
            Array.from(
              { length: 150 },
              (_, i) =>
                `بخش آزمایشی ${i}: متن باید باقی بماند. A wrapped note paragraph that stays in the native document.`,
            ).join("\n\n"),
        );
        const editor = document.querySelector("#editor");
        if (split)
          Object.assign(editor.style, {
            position: "absolute",
            left: "130px",
            top: "52px",
            width: "680px",
            height: "800px",
            overflow: "hidden",
          });
        const content = window.view.contentDOM,
          sizer = document.createElement("div");
        sizer.className = "cm-sizer";
        Object.assign(sizer.style, {
          width: "100%",
          minWidth: "0",
          display: "flex",
          flexDirection: "column",
        });
        content.before(sizer);
        const title = document.createElement("div");
        title.className = "inline-title";
        title.textContent = "📅 Native Obsidian header — هدر اصلی";
        Object.assign(title.style, {
          width: "100%",
          maxWidth: "760px",
          marginInline: "auto",
          padding: "10px 56px",
          fontSize: "25px",
          fontWeight: "700",
        });
        const properties = document.createElement("div");
        properties.className = "metadata-container";
        properties.textContent = "Native properties — پراپرتی نوت";
        Object.assign(properties.style, {
          width: "100%",
          maxWidth: "760px",
          marginInline: "auto",
          padding: "8px 56px",
        });
        sizer.append(title, properties, content);
        content.style.marginInline = "auto";
        window.view.requestMeasure();
      }, split);
      await page.waitForTimeout(150);
      const source = await page.evaluate(() => window.source());
      const snapshot = () =>
        page.evaluate(() => {
          const v = window.view,
            s = v.scrollDOM,
            c = v.contentDOM;
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          };
          return {
            content: rect(c),
            header: rect(document.querySelector(".inline-title")),
            properties: rect(document.querySelector(".metadata-container")),
            styles: [
              s.style.direction,
              s.style.flexDirection,
              c.style.translate,
              c.style.marginLeft,
            ],
            scrollX: s.scrollLeft,
            scrollY: s.scrollTop,
            clientW: s.clientWidth,
            clientH: s.clientHeight,
            scrollW: s.scrollWidth,
            viewport: [v.viewport.from, v.viewport.to],
            lines: [...c.querySelectorAll(".cm-line")].map((e) => ({
              text: e.textContent,
              ...rect(e),
            })),
          };
        });
      const baseline = await snapshot();
      for (let i = 0; i < 6; i++) {
        const point = await page.evaluate(() => {
          const s = window.view.scrollDOM,
            c = window.view.contentDOM,
            r = s.getBoundingClientRect(),
            line = [...c.querySelectorAll(".cm-line")]
              .find((e) => e.textContent.includes("This paragraph stays"))
              .getBoundingClientRect();
          return {
            x:
              Math.min(
                c.getBoundingClientRect().right + 8,
                r.left + s.clientLeft + s.clientWidth - 36,
              ) + 14,
            y: line.y + line.height / 2,
            away: r.left + 40,
          };
        });
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(35);
        assert.equal(await page.locator(".cv-float-handle").isVisible(), true);
        assert.deepEqual(await snapshot(), baseline);
        await page.mouse.move(point.away, point.y);
        await page.waitForTimeout(35);
        assert.equal(await page.locator(".cv-float-handle").isVisible(), false);
        assert.deepEqual(await snapshot(), baseline);
      }
      pass(
        `${dir}/${split ? "split" : "wide"}: native header, properties and text remain pixel-stable while source grip appears/disappears`,
      );
      await page.evaluate(() =>
        window.floatText("Move this paragraph anywhere"),
      );
      await page.waitForTimeout(150);
      const block = page.locator(".cv-floating-block");
      const centered = async () => {
        const frame = await block.locator(".cv-rotated-frame").boundingBox(),
          grip = await block.locator(".cv-object-grip").boundingBox();
        near(
          grip.y + grip.height / 2,
          frame.y + frame.height / 2,
          "object grip center",
        );
      };
      await centered();
      const before = await snapshot();
      for (let i = 0; i < 3; i++) {
        await block.focus();
        const button = page.getByRole("button", {
            name: "Move this block",
            exact: true,
          }),
          r = await button.boundingBox(),
          edge = await page.locator(".cm-scroller").boundingBox();
        await page.mouse.move(r.x + 12, r.y + 12);
        await page.mouse.down();
        await page.evaluate(() => (window.transactionCount = 0));
        await page.mouse.move(edge.x - 140, r.y + 12, { steps: 25 });
        await page.waitForTimeout(50);
        const preview = await block.boundingBox();
        assert.equal(await page.evaluate(() => window.transactionCount), 0);
        await page.mouse.up();
        await page.waitForTimeout(150);
        const released = await block.boundingBox();
        near(released.x, preview.x, "release x");
        near(released.y, preview.y, "release y");
        assert.ok(
          await page.evaluate(
            () => window.plugin.store.notes["Vision.md"].pins[0].x < 0,
          ),
        );
        const after = await snapshot();
        assert.deepEqual(after.header, before.header, "native header moved");
        assert.deepEqual(
          after.properties,
          before.properties,
          "native properties moved",
        );
        assert.deepEqual(after.content, before.content, "native note moved");
        assert.deepEqual(
          after.lines,
          before.lines,
          "note lines moved or disappeared",
        );
        assert.deepEqual(after.styles, before.styles);
        assert.deepEqual(after.viewport, before.viewport);
        assert.equal(after.scrollX, before.scrollX);
        assert.equal(after.scrollW, before.scrollW);
        assert.equal(after.clientW, before.clientW);
        assert.equal(after.clientH, before.clientH);
        await centered();
      }
      pass(
        `${dir}/${split ? "split" : "wide"}: negative left-edge drag changes only objects, preserving header, properties, note and viewport`,
      );
      await page
        .getByRole("button", { name: "Object view", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "Show selected object", exact: true })
        .click();
      const beforePan = await snapshot();
      const savedWorld = await page.evaluate(
        () => window.plugin.store.notes["Vision.md"].pins[0].x,
      );
      const cameraBefore = await page.evaluate(
        () => window.plugin.store.notes["Vision.md"].viewX,
      );
      const viewBox = await page.locator(".cm-scroller").boundingBox();
      await page.mouse.move(viewBox.x + viewBox.width / 2, viewBox.y + 50);
      await page.keyboard.down("Alt");
      await page.mouse.wheel(0, -180);
      await page.keyboard.up("Alt");
      await page.waitForTimeout(70);
      assert.equal(
        await page.evaluate(() => window.plugin.store.notes["Vision.md"].viewX),
        cameraBefore + 180,
      );
      assert.equal(
        await page.evaluate(
          () => window.plugin.store.notes["Vision.md"].pins[0].x,
        ),
        savedWorld,
      );
      assert.deepEqual(await snapshot(), beforePan);
      // Undo just the manual view pan so the negative object is back at its prior visible position.
      await page.keyboard.down("Alt");
      await page.mouse.wheel(0, 180);
      await page.keyboard.up("Alt");
      await page.waitForTimeout(70);
      await block.focus();
      const moveButton = await page
        .getByRole("button", { name: "Move this block", exact: true })
        .boundingBox();
      await page.mouse.move(moveButton.x + 12, moveButton.y + 12);
      await page.mouse.down();
      await page.mouse.move(viewBox.x - 20, moveButton.y + 12, { steps: 8 });
      await page.waitForTimeout(120);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.waitForTimeout(60);
      assert.equal(
        await page.evaluate(() => window.plugin.store.notes["Vision.md"].viewX),
        cameraBefore,
      );
      assert.equal(
        await page.evaluate(
          () => window.plugin.store.notes["Vision.md"].pins[0].x,
        ),
        savedWorld,
      );
      assert.deepEqual(await snapshot(), beforePan);
      pass(
        `${dir}/${split ? "split" : "wide"}: Alt-wheel pan and cancelled edge drag never scroll or reflow the native note`,
      );
      await block.focus();
      await page
        .getByRole("button", { name: "Text block settings", exact: true })
        .click();
      const height = page.getByRole("spinbutton", {
        name: "Text block height",
        exact: true,
      });
      await height.fill("300");
      await height.press("Tab");
      await page.waitForTimeout(80);
      await centered();
      const rotation = page.getByRole("spinbutton", {
        name: "Rotation degrees",
        exact: true,
      });
      await rotation.fill("25");
      await rotation.press("Tab");
      await page.waitForTimeout(80);
      await centered();
      // Rotation can extend visual bounds, but must never mutate host layout styles.
      assert.deepEqual((await snapshot()).styles, before.styles);
      assert.equal(
        await page
          .locator(".cm-scroller")
          .evaluate((e) => getComputedStyle(e).direction),
        dir,
      );
      assert.equal(await page.locator(".cv-world-extent").count(), 0);
      assert.equal(
        await page.locator(".cm-scroller").evaluate((e) => e.dataset.cvOrigin),
        undefined,
      );
      assert.equal(await page.evaluate(() => window.source()), source);
      assert.deepEqual(errors, []);
      pass(
        `${dir}/${split ? "split" : "wide"}: grip remains centered after changing height and rotation; host direction/styles are untouched`,
      );
      await page.screenshot({
        path: `qa/edge-064-${dir}-${split ? "split" : "wide"}.png`,
      });
      await page.close();
    }
  console.log(`Verified ${checks} native-header and grip checks.`);
} finally {
  await browser.close();
}
