const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Asset Panel', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show asset list from default mock data', async () => {
    await browser.$('.sidebar-btn[title="资产"]').click();
    await browser.pause(2000);
    const nameEls = await browser.$$('.item-name');
    const names = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    expect(names.some(n => n.includes('Pixel') || n.includes('Terrain'))).toBe(true);
  });

  it('should have screenshot toggle button on Asset panel', async () => {
    await browser.$('.sidebar-btn[title="资产"]').click();
    await browser.pause(1000);
    const toggleBtn = await browser.$('.screenshot-toggle-btn');
    expect(await toggleBtn.isExisting()).toBe(true);
  });

  it('should open add asset modal', async () => {
    await browser.$('.sidebar-btn[title="资产"]').click();
    await browser.pause(1000);
    const addBtn = await browser.$('.btn-primary.btn-small');
    await addBtn.click();
    await browser.pause(500);
    const modal = await browser.$('.modal');
    expect(await modal.isExisting()).toBe(true);
  });
});
