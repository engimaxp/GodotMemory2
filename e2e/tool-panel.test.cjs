const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Tool Panel', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show tool list from default mock data', async () => {
    await browser.$('.sidebar-btn[title="工具"]').click();
    await browser.pause(2000);
    const nameEls = await browser.$$('.item-name');
    const names = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    expect(names.some(n => n.includes('Aseprite') || n.includes('Blender'))).toBe(true);
  });

  it('should have search input', async () => {
    await browser.$('.sidebar-btn[title="工具"]').click();
    await browser.pause(1000);
    const searchInput = await browser.$('.panel-search-input');
    expect(await searchInput.isExisting()).toBe(true);
  });

  it('should open add tool modal', async () => {
    await browser.$('.sidebar-btn[title="工具"]').click();
    await browser.pause(1000);
    const addBtn = await browser.$('.btn-primary.btn-small');
    await addBtn.click();
    await browser.pause(500);
    const modal = await browser.$('.modal');
    expect(await modal.isExisting()).toBe(true);
  });

  it('should have screenshot toggle on Tool panels', async () => {
    await browser.$('.sidebar-btn[title="工具"]').click();
    await browser.pause(1000);
    const toggleBtn = await browser.$('.screenshot-toggle-btn');
    expect(await toggleBtn.isExisting()).toBe(true);
  });
});
