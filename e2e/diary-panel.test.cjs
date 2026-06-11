const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Diary Panel', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show diary names from default mock data', async () => {
    await browser.$('.sidebar-btn[title="日志"]').click();
    await browser.pause(2000);
    const nameEls = await browser.$$('.item-name');
    const names = [];
    for (const el of nameEls) {
      names.push(await el.getText());
    }
    expect(names.some(n => n.includes('开发日志') || n.includes('学习笔记'))).toBe(true);
  });

  it('should have add diary button', async () => {
    await browser.$('.sidebar-btn[title="日志"]').click();
    await browser.pause(1000);
    const addBtns = await browser.$$('.btn-primary.btn-small');
    let found = false;
    for (const btn of addBtns) {
      const text = await btn.getText();
      if (text.includes('+')) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});
