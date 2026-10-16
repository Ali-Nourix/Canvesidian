import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(new URL("./harness.html", import.meta.url).href);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.floatText("Move this paragraph"));
  await page.waitForSelector(".cv-floating-block");
  await page.waitForTimeout(500);
  const grip = page.getByRole("button", {
    name: "Move this block",
    exact: true,
  });
  const box = await grip.boundingBox();
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.evaluate(() => (window.transactionCount = 0));
  await page.mouse.down();
  const t = performance.now();
  await page.mouse.move(box.x + 90, box.y + 100, { steps: 120 });
  const during = await page.evaluate(() => window.transactionCount);
  await page.mouse.up();
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => window.transactionCount);
  const result = {
    pointerMoves: 120,
    transactionsDuringMove: during,
    transactionsAfterRelease: after,
    elapsedMs: Math.round(performance.now() - t),
    note: "Synthetic Chromium harness, one floating block; wall time includes Playwright input pacing and is not an FPS measurement.",
  };
  writeFileSync(
    process.env.BENCH_OUTPUT ??
      new URL("./performance-result.json", import.meta.url),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await page.close();
} finally {
  await browser.close();
}
