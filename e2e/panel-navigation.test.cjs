const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  const bubble = await browser.$('.bubble');
  await bubble.waitForDisplayed({ timeout: 5000 });
  await bubble.click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Panel Navigation', () => {
  before(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should show Engine panel by default', async () => {
    const title = await browser.$('.popup-title');
    await title.waitForDisplayed({ timeout: 5000 });
    const text = await title.getText();
    expect(text).toBe('引擎');
  });

  it('should switch to Proj panel when sidebar button clicked', async () => {
    const projBtn = await browser.$('.sidebar-btn[title="项目"]');
    await projBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('项目');
  });

  it('should switch to Asset panel', async () => {
    const assetBtn = await browser.$('.sidebar-btn[title="资产"]');
    await assetBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('资产');
  });

  it('should switch to Tool panel', async () => {
    const toolBtn = await browser.$('.sidebar-btn[title="工具"]');
    await toolBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('工具');
  });

  it('should switch to Diary panel', async () => {
    const diaryBtn = await browser.$('.sidebar-btn[title="日志"]');
    await diaryBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('日志');
  });

  it('should switch to Setting panel', async () => {
    const settingBtn = await browser.$('.sidebar-btn[title="设置"]');
    await settingBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('设置');
  });

  it('should switch back to Engine panel', async () => {
    const engineBtn = await browser.$('.sidebar-btn[title="引擎"]');
    await engineBtn.click();
    await browser.pause(500);
    const title = await browser.$('.popup-title');
    const text = await title.getText();
    expect(text).toBe('引擎');
  });
});
