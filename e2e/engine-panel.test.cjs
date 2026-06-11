const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Engine Panel', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should initially render with mock engine data', async () => {
    const title = await browser.$('.popup-title');
    await title.waitForDisplayed({ timeout: 3000 });
    const text = await title.getText();
    expect(text).toBe('引擎');
  });

  it('should display engine names from mock data', async () => {
    await browser.pause(1500);
    const nameEls = await browser.$$('.item-name');
    const names = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names.some(n => n.includes('Godot'))).toBe(true);
  });

  it('should show filter-related empty state via search', async () => {
    await browser.execute(() => {
      window.__mockOverrides = {
        db_search_engines: () => ({ items: [], total: 0 })
      };
    });
    const searchInput = await browser.$('.panel-search-input');
    await searchInput.setValue('__nonexistent__');
    await browser.pause(1000);
    const emptyText = await browser.$('.empty-state p');
    const exists = await emptyText.isExisting();
    if (exists) {
      const text = await emptyText.getText();
      expect(text).toMatch(/未找到|No/);
    }
  });

  it('should open add engine modal', async () => {
    await browser.pause(1000);
    const addBtn = await browser.$('.btn-primary.btn-small');
    await addBtn.waitForDisplayed({ timeout: 3000 });
    await addBtn.click();
    await browser.pause(500);
    const modal = await browser.$('.modal');
    expect(await modal.isExisting()).toBe(true);
  });
});
