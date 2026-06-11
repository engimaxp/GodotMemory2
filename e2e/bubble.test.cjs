const { browser, expect } = require('@wdio/globals');

async function getViewportSize() {
  return browser.execute(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));
}

async function isElementWithinViewport(elem) {
  const vp = await getViewportSize();
  const x = elem.x;
  const y = elem.y;
  const w = elem.width;
  const h = elem.height;
  console.log(`Viewport: ${JSON.stringify(vp)}, Element: (${x},${y}) ${w}x${h}`);
  console.log(`Checks: left=${x>=0}, top=${y>=0}, right=${x + w <= vp.width}, bottom=${y + h <= vp.height}`);
  return x >= 0 && y >= 0 && (x + w) <= vp.width && (y + h) <= vp.height;
}

describe('Bubble viewport test', () => {
  it('should keep bubble within viewport when opening and closing panel', async () => {
    await browser.url('/test-page.html');
    await browser.pause(500);

    const bubble = await $('#bubble');
    await bubble.waitForDisplayed();

    const bb = await bubble.getLocation();
    const bs = await bubble.getSize();
    console.log(`Bubble initial location:`, JSON.stringify(bb));
    console.log(`Bubble initial size:`, JSON.stringify(bs));
    expect(await isElementWithinViewport({ ...bb, ...bs })).toBe(true);

    await bubble.click();
    await browser.pause(500);

    const panel = await $('#panel');
    await panel.waitForDisplayed();
    expect(await panel.isDisplayed()).toBe(true);

    const pb = await panel.getLocation();
    const ps = await panel.getSize();
    console.log(`Panel:`, JSON.stringify(pb), JSON.stringify(ps));
    expect(await isElementWithinViewport({ ...pb, ...ps })).toBe(true);

    const closeBtn = await $('#panel-close');
    await closeBtn.click();
    await browser.pause(500);

    await bubble.waitForDisplayed();
    expect(await bubble.isDisplayed()).toBe(true);

    const bb2 = await bubble.getLocation();
    const bs2 = await bubble.getSize();
    console.log(`Bubble after close:`, JSON.stringify(bb2), JSON.stringify(bs2));
    expect(await isElementWithinViewport({ ...bb2, ...bs2 })).toBe(true);
  });
});
