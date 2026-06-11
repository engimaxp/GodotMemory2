const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Project Panel', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show project list from default mock data', async () => {
    await browser.$('.sidebar-btn[title="项目"]').click();
    await browser.pause(2000);
    const nameEls = await browser.$$('.item-name');
    const names = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    expect(names.some(n => n.includes('My Game') || n.includes('Test'))).toBe(true);
  });

  it('should have screenshot toggle button', async () => {
    await browser.$('.sidebar-btn[title="项目"]').click();
    await browser.pause(1000);
    const toggleBtn = await browser.$('.screenshot-toggle-btn');
    expect(await toggleBtn.isExisting()).toBe(true);
  });

  it('should toggle screenshot view on click', async () => {
    await browser.$('.sidebar-btn[title="项目"]').click();
    await browser.pause(1000);
    const toggleBtn = await browser.$('.screenshot-toggle-btn');
    const initialClass = await toggleBtn.getAttribute('class');
    await toggleBtn.click();
    await browser.pause(500);
    const afterClass = await toggleBtn.getAttribute('class');
    expect(afterClass).not.toBe(initialClass);
  });

  it('should open add project modal', async () => {
    await browser.$('.sidebar-btn[title="项目"]').click();
    await browser.pause(1000);
    const addBtn = await browser.$('.btn-primary.btn-small');
    await addBtn.click();
    await browser.pause(500);
    const modal = await browser.$('.modal');
    expect(await modal.isExisting()).toBe(true);
  });
});
