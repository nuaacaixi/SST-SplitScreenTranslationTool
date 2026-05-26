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

  await chrome.tabs.sendMessage(tab.id, { type: 'toggle-split', preferences: prefs });
});
