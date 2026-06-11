window.TestUtils = {
  wait: function(ms) {
    return new Promise(r => setTimeout(r, ms));
  },

  waitForSelector: function(selector, timeout) {
    timeout = timeout || 5000;
    const start = Date.now();
    return new Promise((resolve, reject) => {
      function check() {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for ' + selector));
        setTimeout(check, 50);
      }
      check();
    });
  },

  clickAndWait: async function(selector, delay) {
    const el = await this.waitForSelector(selector);
    el.click();
    if (delay) await this.wait(delay);
    return el;
  },

  setValue: function(selector, value) {
    const el = document.querySelector(selector);
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return el;
  },

  getText: function(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : '';
  },

  isVisible: function(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
  },

  getInvokeLog: function() {
    return window.__invokeLog || [];
  },

  clearInvokeLog: function() {
    window.__invokeLog = [];
  },

  setMockResponse: function(cmd, handler) {
    window.__mockOverrides = window.__mockOverrides || {};
    window.__mockOverrides[cmd] = handler;
  }
};

window.__invokeLog = [];
const origInvoke = window.__TAURI_INTERNALS__.invoke;
window.__TAURI_INTERNALS__.invoke = async function(cmd, args) {
  window.__invokeLog.push({ cmd, args });
  if (window.__mockOverrides && window.__mockOverrides[cmd]) {
    const handler = window.__mockOverrides[cmd];
    if (typeof handler === 'function') {
      return handler(args);
    }
    return handler;
  }
  return origInvoke(cmd, args);
};
