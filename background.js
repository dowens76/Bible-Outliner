// background.js - Service worker for the extension

// Persistent port to the side panel — more reliable than runtime.sendMessage in MV3
let sidePanelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      if (sidePanelPort === port) sidePanelPort = null;
    });
  }
});

// Toggle side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NAVIGATE_TO_VERSE') {
    // Navigate StepBible to specific verse
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SCROLL_TO_VERSE',
          reference: message.reference
        });
      }
    });
  } else if (message.type === 'GET_CURRENT_BOOK') {
    // Get current book from the active Bible site page
    const SUPPORTED_HOSTS = ['stepbible.org', 'bible.com', 'biblegateway.com', 'parabible.com'];
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && SUPPORTED_HOSTS.some(s => (tabs[0].url || '').includes(s))) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CURRENT_BOOK' }, (response) => {
          sendResponse(response);
        });
        return true; // Keep message channel open
      }
    });
    return true;
  } else if (message.type === 'OPEN_HEADING_MODAL_WITH_VERSE' ||
             message.type === 'HIGHLIGHT_HEADING') {
    // Relay content-script → side panel via persistent port.
    // chrome.runtime.sendMessage from content scripts doesn't reliably reach
    // side panels in MV3, so we use the stored port instead.
    if (sidePanelPort) {
      sidePanelPort.postMessage(message);
    }
  }
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bible Outline Builder installed');
});
