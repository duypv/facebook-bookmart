// Facebook Bookmark Extension - Background Script

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['bookmarks'], (result) => {
    if (!result.bookmarks) {
      chrome.storage.local.set({ bookmarks: [] });
    }
    updateBadge();
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveBookmark') {
    saveBookmark(message.bookmark, sendResponse);
    return true; // Keep the message channel open for async response
  } else if (message.action === 'deleteBookmark') {
    deleteBookmark(message.url, sendResponse);
    return true;
  } else if (message.action === 'getBookmarks') {
    getBookmarks(sendResponse);
    return true;
  }
});

// Function to save bookmark
function saveBookmark(bookmark, callback) {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    
    // Check for duplicates
    const isDuplicate = bookmarks.some(item => item.url === bookmark.url);
    
    if (isDuplicate) {
      callback({ success: false, message: 'This post is already bookmarked' });
      return;
    }
    
    // Add new bookmark
    bookmarks.push(bookmark);
    
    // Save to storage
    chrome.storage.local.set({ bookmarks }, () => {
      updateBadge();
      callback({ success: true });
    });
  });
}

// Function to delete bookmark
function deleteBookmark(url, callback) {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    
    // Filter out the bookmark to delete
    const updatedBookmarks = bookmarks.filter(item => item.url !== url);
    
    // Save to storage
    chrome.storage.local.set({ bookmarks: updatedBookmarks }, () => {
      updateBadge();
      callback({ success: true });
    });
  });
}

// Function to get all bookmarks
function getBookmarks(callback) {
  chrome.storage.local.get(['bookmarks'], (result) => {
    callback({ bookmarks: result.bookmarks || [] });
  });
}

// Function to update badge
function updateBadge() {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const count = (result.bookmarks || []).length;
    
    // Update badge text
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    
    // Set badge color
    chrome.action.setBadgeBackgroundColor({ color: '#1877F2' });
  });
}

// Listen for tab updates to refresh badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    updateBadge();
  }
});
