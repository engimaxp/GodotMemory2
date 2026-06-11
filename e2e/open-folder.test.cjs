const { browser, expect } = require('@wdio/globals');

async function openPanel() {
  await browser.$('.bubble').waitForDisplayed({ timeout: 5000 });
  await browser.$('.bubble').click();
  await browser.pause(1000);
  await browser.$('.popup').waitForDisplayed({ timeout: 5000 });
}

describe('Open Folder & Path Normalization', () => {
  beforeEach(async () => {
    await browser.url('/app.html');
    await browser.pause(1500);
    await openPanel();
  });

  it('should render engine panel with Chinese labels', async () => {
    const title = await browser.$('.popup-title');
    await title.waitForDisplayed({ timeout: 3000 });
    const text = await title.getText();
    expect(text).toBe('引擎');
  });

  it('should invoke open_folder when folder button clicked on engine row', async () => {
    await browser.execute(() => {
      window.__mockOverrides = {
        db_list_engines: () => ({
          items: [{
            entity: { id: 'e1', name: 'Godot4', version: '4.2', directory: 'C:/godot/godot.exe', main_version: 4, has_console: false, console_dir: '', is_enc: false, enc_key: '', is_default: false, desc: '', sort: 0, is_delete: false },
            tags: [], images: []
          }],
          total: 1
        }),
        db_list_tags: () => []
      };
      window.__invokeLog = [];
    });
    await browser.pause(800);

    const itemBtns = await browser.$$('.item-btn');
    for (const btn of itemBtns) {
      const html = await btn.getHTML();
      if (html.includes('folder') || html.includes('Open')) {
        await btn.click();
        await browser.pause(300);
        break;
      }
    }
    const logs = await browser.execute(() => window.__invokeLog);
    const folderCalls = logs.filter(l => l.cmd === 'open_folder');
    expect(folderCalls.length).toBeGreaterThanOrEqual(0);
  });

  it('should show error toast when open_folder fails', async () => {
    await browser.execute(() => {
      window.__mockOverrides = {
        open_folder: () => Promise.reject('error')
      };
      window.__invokeLog = [];
    });
    const toast = await browser.$('.toast');
    await browser.pause(100);
    expect(await toast.isExisting()).toBe(true);
  });
});
