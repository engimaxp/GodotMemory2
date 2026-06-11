const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

async function switchToSettings() {
  const settingBtn = await browser.$('.sidebar-btn[title="设置"]');
  await settingBtn.click();
  await browser.pause(1000);
}

describe('Settings Panel', () => {
  before(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should render settings panel with correct title', async () => {
    await switchToSettings();
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('设置');
  });

  it('should have theme toggle switch', async () => {
    await switchToSettings();
    const switchEl = await browser.$('.switch');
    expect(await switchEl.isExisting()).toBe(true);
  });

  it('should have language selector', async () => {
    await switchToSettings();
    const langSelect = await browser.$('select.form-select');
    expect(await langSelect.isExisting()).toBe(true);
  });

  it('should have default panel selector', async () => {
    await switchToSettings();
    const selects = await browser.$$('select.form-select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('should have bubble opacity slider', async () => {
    await switchToSettings();
    const sliders = await browser.$$('.slider');
    const opacitySliders = sliders.length;
    expect(opacitySliders).toBeGreaterThanOrEqual(1);
  });

  it('should have import data section', async () => {
    await switchToSettings();
    const btns = await browser.$$('button');
    let foundImport = false;
    for (const btn of btns) {
      const text = await btn.getText();
      if (text.includes('导入')) { foundImport = true; break; }
    }
    expect(foundImport).toBe(true);
  });

  it('should have tag management section', async () => {
    await switchToSettings();
    const container = await browser.$('.panel-container');
    const html = await container.getHTML();
    expect(html.includes('快速标签管理')).toBe(true);
  });

  it('should have screenshot directory setting', async () => {
    await switchToSettings();
    const container = await browser.$('.panel-container');
    const html = await container.getHTML();
    expect(html.includes('截屏目录')).toBe(true);
  });

  it('should have remember position switch', async () => {
    await switchToSettings();
    const switches = await browser.$$('.switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });
});
