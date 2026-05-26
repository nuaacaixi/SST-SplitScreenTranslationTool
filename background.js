// Strip frame-blocking response headers so Google Translate (*.translate.goog)
// and the original page can be loaded inside iframes.
function setupNetRequestRules() {
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'content-security-policy-report-only', operation: 'remove' },
          { header: 'frame-options', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: '*translate.goog*',
        resourceTypes: ['sub_frame', 'main_frame']
      }
    }],
    removeRuleIds: [1]
  });
}

// Set up rules on service worker start
setupNetRequestRules();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
    return;
  }

  const prefs = await chrome.storage.sync.get({
    targetLang: 'zh-CN',
    layout: 'horizontal',
    translatedFirst: true,
    splitRatio: 50
  });

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle-split', preferences: prefs });
  } catch (e) {
    // Content script not injected yet (e.g. page was open before extension install).
    // Inject it programmatically and try again.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-split', preferences: prefs });
    } catch (e2) {
      console.error('Failed to inject split view:', e2);
    }
  }
});
