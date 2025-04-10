chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ bookmarks: [] }, (result) => {
    if (!result.bookmarks) {
      chrome.storage.local.set({ bookmarks: [] });
    }
    updateBadge(result.bookmarks.length);
  });
});

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
}

function addBookmark(bookmark) {
  chrome.storage.local.get({ bookmarks: [] }, (result) => {
    let bookmarks = result.bookmarks;
    if (!bookmarks.some(b => b.url === bookmark.url)) {
      bookmarks.push(bookmark);
      chrome.storage.local.set({ bookmarks: bookmarks }, () => {
        updateBadge(bookmarks.length);
      });
    }
  });
}

function getBookmarks(callback) {
  chrome.storage.local.get({ bookmarks: [] }, (result) => {
    callback(result.bookmarks);
  });
}

function removeBookmark(url) {
  chrome.storage.local.get({ bookmarks: [] }, (result) => {
    let bookmarks = result.bookmarks.filter(b => b.url !== url);
    chrome.storage.local.set({ bookmarks: bookmarks }, () => {
      updateBadge(bookmarks.length);
    });
  });
}