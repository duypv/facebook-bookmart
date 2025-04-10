document.addEventListener('DOMContentLoaded', () => {
  const bookmarkList = document.getElementById('bookmarkList');
  const emptyState = document.getElementById('emptyState');

  function displayBookmarks(bookmarks) {
    bookmarkList.innerHTML = ''; // Clear existing list items
    if (bookmarks && bookmarks.length > 0) {
      emptyState.style.display = 'none';
      bookmarks.forEach(bookmark => {
        const listItem = document.createElement('li');

        const favicon = document.createElement('img');
        favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}`;
        favicon.alt = 'Favicon';
        favicon.classList.add('favicon');

        const titleLink = document.createElement('a');
        titleLink.href = bookmark.url;
        titleLink.textContent = bookmark.title;
        titleLink.target = '_blank'; // Open in new tab

        const authorSpan = document.createElement('span');
        authorSpan.textContent = ` by ${bookmark.author}`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
          chrome.runtime.sendMessage({ type: 'removeBookmark', url: bookmark.url });
          listItem.remove();
          // Check if list is empty after deletion and show empty state
          if (bookmarkList.children.length === 0) {
            emptyState.style.display = 'block';
          }
        });

        listItem.appendChild(favicon);
        listItem.appendChild(titleLink);
        listItem.appendChild(authorSpan);
        listItem.appendChild(deleteButton);
        bookmarkList.appendChild(listItem);
      });
    } else {
      emptyState.style.display = 'block';
    }
  }

  chrome.runtime.sendMessage({ type: 'getBookmarks' }, response => {
    if (chrome.runtime.lastError) {
      console.error('Error retrieving bookmarks:', chrome.runtime.lastError);
      // Optionally display an error message in the popup
    } else {
      displayBookmarks(response.bookmarks);
    }
  });
});