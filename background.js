"use strict";

const errorCode = -1; // unable to get the value

//
// Extention Events
//
//chrome.runtime.onInstalled.addListener(function() {});

// When a tab is updated check to see if it is loaded and reset the icon UI
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status == "complete" &&
    tab.url.startsWith("http") &&
    tab.active
  ) {
    chrome.tabs.executeScript({ file: "content.js" }, (_result) => {
      // Catch errors such as "This page cannot be scripted due to an ExtensionsSettings policy."
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        console.log("Error: " + lastErr.message);

        chrome.browserAction.setIcon({ path: "icon-error.png", tabId: tabId });

        let key = hashCode(tab.url);
        chrome.storage.local.set({
          [key]: {
            score: errorCode,
            url: tab.url,
            title: tab.title,
          },
        });
      }
    });
  }
});

// Fires when the active tab in a window changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  tryToUpdateIconUIFromStorage(activeInfo.tabId);
});

// If another window is focused, switch the badge to those results
// Ideally you could have different icons/badges per window
// chrome.windows.onFocusChanged.addListener((windowId) => {
//   chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
//     if (tabs.length > 0 && tabs[0].id > 0) {
//       tryToUpdateIconUIFromStorage(tabs[0].id);
//     }
//   });
// });

// message from content script, the FCP will be in request.result
chrome.runtime.onMessage.addListener((request, sender, _response) => {
  updateIconUI(request.result, sender.tab.id);

  if (sender.tab.url) {
    let key = hashCode(sender.tab.url);
    chrome.storage.local.set({
      [key]: {
        score: request.result,
        url: sender.tab.url,
        title: sender.tab.title,
      },
    });
  }
});

//
// Mess around with the Icon UI
//

// Given the fcp as a number in milliseconds, update the Icon UI
function updateIconUI(score, tabId) {
  let color = getColor(score);

  chrome.browserAction.setIcon({
    path: "icon-" + color + ".png",
    tabId: tabId,
  });
  chrome.browserAction.setBadgeBackgroundColor({
    color: "#000000",
    tabId: tabId,
  });
  chrome.browserAction.setBadgeText({
    text: badgeTextFromScore(score),
    tabId: tabId,
  });
}

// load up the most recent result for this tab and update the IconUI
function tryToUpdateIconUIFromStorage(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab.url) {
      let key = hashCode(tab.url);
      chrome.storage.local.get(key, (result) => {
        if (result[key] && result[key].score == errorCode) {
          chrome.browserAction.setIcon({
            path: "icon-error.png",
            tabId: tabId,
          });
        } else if (result[key] && result[key].score) {
          updateIconUI(result[key].score, tabId);
        }
      });
    }
  });
}

//
// Helper Functions
//

// Given the FCP score in ms, return an appropriate sized label for the icon's badge
function badgeTextFromScore(score) {
  return score > 9999 ? "BAD" : (score / 1000).toFixed(1);
}

// Given the FCP in ms, return green, yellow, or red depending on the amount
function getColor(fcp) {
  let color = "red";

  // GREEN < 1 seconds, YELLOW < 3.0s,  RED > 4s
  if (fcp < 1000) {
    color = "green";
  } else if (fcp < 3000) {
    color = "yellow";
  }

  return color;
}

// Hash the URL and return a numeric hash as a String to be used as the key
function hashCode(str) {
  let hash = 0;
  if (str.length == 0) {
    return "";
  }
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}
