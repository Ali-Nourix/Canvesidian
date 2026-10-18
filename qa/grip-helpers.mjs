/** Reveal a source grip using real pointer input after CodeMirror has measured layout. */
export async function hoverSourceGrip(page, line) {
  await line.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    window.view.requestMeasure();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const position = await line.evaluate((el) => {
    const scroller = el.closest(".cm-scroller");
    const content = scroller.querySelector(".cm-content");
    const rect = scroller.getBoundingClientRect();
    const size = matchMedia("(pointer:coarse)").matches ? 44 : 28;
    const left = Math.min(
      content.getBoundingClientRect().right + 8,
      rect.left + scroller.clientLeft + scroller.clientWidth - size - 8,
    );
    const lineRect = el.getBoundingClientRect();
    return { x: left + size / 2, y: (lineRect.top + lineRect.bottom) / 2 };
  });
  await page.mouse.move(position.x, position.y);
  const grip = page.getByRole("button", {
    name: "Float block under pointer",
    exact: true,
  });
  await grip.waitFor({ state: "visible", timeout: 10000 });
  return grip;
}
