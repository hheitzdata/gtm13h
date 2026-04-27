// GTM13h — Service Worker
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('tagmanager.google.com')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'GTM13h',
      message: request.message
    });
  }
});
