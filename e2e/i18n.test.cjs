const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  const bubble = await browser.$('.bubble');
  await bubble.waitForDisplayed({ timeout: 5000 });
  await bubble.click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Internationalization (i18n)', () => {
  before(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show Chinese labels by default', async () => {
    const title = await browser.$('.popup-title');
    await title.waitForDisplayed({ timeout: 5000 });
    const text = await title.getText();
    expect(text).toBe('引擎');
  });

  it('should have sidebar buttons with Chinese tooltips', async () => {
    const btns = await browser.$$('.sidebar-btn');
    const tooltips = [];
    for (const btn of btns) {
      const title = await btn.getAttribute('title');
      if (title) tooltips.push(title);
    }
    expect(tooltips).toContain('引擎');
    expect(tooltips).toContain('项目');
    expect(tooltips).toContain('资产');
    expect(tooltips).toContain('工具');
    expect(tooltips).toContain('日志');
    expect(tooltips).toContain('设置');
  });

  it('should switch to English when language changed', async () => {
    const settingBtn = await browser.$('.sidebar-btn[title="设置"]');
    await settingBtn.click();
    await browser.pause(500);
    await browser.execute(() => { window.__invokeLog = []; });
    const langSelect = await browser.$('select.form-select');
    await langSelect.waitForDisplayed({ timeout: 3000 });
    await langSelect.selectByAttribute('value', 'en_US');
    await browser.pause(300);
    const settingTitle = await browser.$('.popup-title');
    const text = await settingTitle.getText();
    expect(text).toBe('Setting');
  });

  it('should preserve other Chinese panel labels', async () => {
    const engineBtn = await browser.$('.sidebar-btn[title="Engine"]');
    await engineBtn.click();
    await browser.pause(300);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('Engine');
  });
});
