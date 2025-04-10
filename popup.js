// Facebook Bookmark Extension - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const bookmarksList = document.getElementById('bookmarks-list');
  const emptyState = document.getElementById('empty-state');
  const loadingIndicator = document.getElementById('loading-indicator');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const sortField = document.getElementById('sort-field');
  const sortDirection = document.getElementById('sort-direction');
  const exportCsvButton = document.getElementById('export-csv');
  
  // Load bookmarks
  loadBookmarks();
  
  // Add event listeners
  searchInput.addEventListener('input', handleSearch);
  searchButton.addEventListener('click', () => handleSearch());
  sortField.addEventListener('change', handleSort);
  sortDirection.addEventListener('change', handleSort);
  exportCsvButton.addEventListener('click', exportBookmarksToCSV);
  
  // Function to load bookmarks
  function loadBookmarks() {
    showLoading();
    
    chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
      hideLoading();
      
      if (response && response.bookmarks) {
        renderBookmarks(response.bookmarks);
      } else {
        showEmptyState();
      }
    });
  }
  
  // Function to render bookmarks
  function renderBookmarks(bookmarks) {
    // Clear previous content
    bookmarksList.innerHTML = '';
    
    if (!bookmarks || bookmarks.length === 0) {
      showEmptyState();
      return;
    }
    
    hideEmptyState();
    
    // Get sort preferences
    const sortBy = sortField.value;
    const sortOrder = sortDirection.value;
    
    // Group bookmarks by author
    const bookmarksByAuthor = groupByAuthor(bookmarks);
    
    // Sort authors based on sort preferences
    let sortedAuthors = Object.keys(bookmarksByAuthor);
    
    if (sortBy === 'name') {
      // Sort authors alphabetically
      sortedAuthors.sort((a, b) => {
        return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      });
    } else {
      // For date sorting, we'll sort authors based on the most recent bookmark in each group
      sortedAuthors.sort((a, b) => {
        const mostRecentA = getMostRecentDate(bookmarksByAuthor[a]);
        const mostRecentB = getMostRecentDate(bookmarksByAuthor[b]);
        return sortOrder === 'asc' 
          ? mostRecentA - mostRecentB 
          : mostRecentB - mostRecentA;
      });
    }
    
    // Render each group
    sortedAuthors.forEach(author => {
      const authorGroup = document.createElement('div');
      authorGroup.className = 'author-group';
      
      // Create author header
      const authorHeader = document.createElement('div');
      authorHeader.className = 'author-header';
      authorHeader.textContent = author;
      authorGroup.appendChild(authorHeader);
      
      // Sort bookmarks based on sort preferences
      let sortedBookmarks = bookmarksByAuthor[author];
      
      if (sortBy === 'name') {
        // Sort by title
        sortedBookmarks.sort((a, b) => {
          return sortOrder === 'asc' 
            ? a.title.localeCompare(b.title) 
            : b.title.localeCompare(a.title);
        });
      } else {
        // Sort by date
        sortedBookmarks.sort((a, b) => {
          return sortOrder === 'asc' 
            ? new Date(a.savedAt) - new Date(b.savedAt) 
            : new Date(b.savedAt) - new Date(a.savedAt);
        });
      }
      
      // Add bookmarks for this author
      sortedBookmarks.forEach(bookmark => {
        const bookmarkItem = createBookmarkElement(bookmark);
        authorGroup.appendChild(bookmarkItem);
      });
      
      bookmarksList.appendChild(authorGroup);
    });
  }
  
  // Function to create a bookmark element
  function createBookmarkElement(bookmark) {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    
    // Format the timestamp
    const savedDate = new Date(bookmark.savedAt);
    const formattedDate = savedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Create favicon element
    const faviconUrl = `https://www.google.com/s2/favicons?domain=facebook.com`;
    
    // Create bookmark content
    bookmarkItem.innerHTML = `
      <div class="bookmark-title">
        <img src="${faviconUrl}" class="favicon" alt="Facebook">
        ${escapeHTML(bookmark.title)}
      </div>
      <div class="bookmark-url">${escapeHTML(bookmark.url)}</div>
      <div class="bookmark-meta">
        <span class="bookmark-timestamp">${formattedDate}</span>
        <span class="bookmark-author">${escapeHTML(bookmark.author)}</span>
      </div>
      <button class="delete-button" title="Delete bookmark">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    
    // Add click event to open bookmark
    bookmarkItem.querySelector('.bookmark-title').addEventListener('click', () => {
      chrome.tabs.create({ url: bookmark.url });
    });
    
    // Add click event to delete button
    bookmarkItem.querySelector('.delete-button').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(bookmark.url);
    });
    
    return bookmarkItem;
  }
  
  // Function to delete a bookmark
  function deleteBookmark(url) {
    chrome.runtime.sendMessage({
      action: 'deleteBookmark',
      url: url
    }, (response) => {
      if (response && response.success) {
        loadBookmarks(); // Reload the list
      }
    });
  }
  
  // Function to handle search
  function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
      if (response && response.bookmarks) {
        let filteredBookmarks = response.bookmarks;
        
        if (searchTerm) {
          filteredBookmarks = response.bookmarks.filter(bookmark => {
            return bookmark.title.toLowerCase().includes(searchTerm) ||
                   bookmark.url.toLowerCase().includes(searchTerm) ||
                   bookmark.author.toLowerCase().includes(searchTerm);
          });
        }
        
        renderBookmarks(filteredBookmarks);
      }
    });
  }
  
  // Function to handle sorting
  function handleSort() {
    // Get current search term to maintain filtering
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
      if (response && response.bookmarks) {
        let filteredBookmarks = response.bookmarks;
        
        // Apply search filter if there's a search term
        if (searchTerm) {
          filteredBookmarks = response.bookmarks.filter(bookmark => {
            return bookmark.title.toLowerCase().includes(searchTerm) ||
                   bookmark.url.toLowerCase().includes(searchTerm) ||
                   bookmark.author.toLowerCase().includes(searchTerm);
          });
        }
        
        renderBookmarks(filteredBookmarks);
      }
    });
  }
  
  // Helper function to group bookmarks by author
  function groupByAuthor(bookmarks) {
    return bookmarks.reduce((groups, bookmark) => {
      const author = bookmark.author || 'Unknown';
      if (!groups[author]) {
        groups[author] = [];
      }
      groups[author].push(bookmark);
      return groups;
    }, {});
  }
  
  // Helper function to escape HTML
  function escapeHTML(str) {
    return str;
    // return str
    //   .replace(/&/g, '&amp;')
    //   .replace(/</g, '&lt;')
    //   .replace(/>/g, '&gt;')
    //   .replace(/"/g, '&quot;')
    //   .replace(/'/g, '&#039;');
  }
  
  // Helper function to get the most recent date from a group of bookmarks
  function getMostRecentDate(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) return new Date(0);
    
    return Math.max(...bookmarks.map(bookmark => new Date(bookmark.savedAt)));
  }
  
  // UI helper functions
  function showEmptyState() {
    emptyState.classList.remove('hidden');
    bookmarksList.classList.add('hidden');
  }
  
  function hideEmptyState() {
    emptyState.classList.add('hidden');
    bookmarksList.classList.remove('hidden');
  }
  
  function showLoading() {
    loadingIndicator.classList.remove('hidden');
    bookmarksList.classList.add('hidden');
    emptyState.classList.add('hidden');
  }
  
  function hideLoading() {
    loadingIndicator.classList.add('hidden');
  }
  
  // Function to export bookmarks to CSV
  function exportBookmarksToCSV() {
    chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
      if (response && response.bookmarks && response.bookmarks.length > 0) {
        const bookmarks = response.bookmarks;
        
        // CSV header
        let csvContent = 'Title,Author,URL,Date Added\n';
        
        // Add each bookmark as a row
        bookmarks.forEach(bookmark => {
          const title = bookmark.title.replace(/,/g, ' ').replace(/"/g, '""');
          const author = bookmark.author.replace(/,/g, ' ').replace(/"/g, '""');
          const url = bookmark.url.replace(/"/g, '""');
          const date = new Date(bookmark.savedAt).toLocaleDateString();
          
          // Create CSV row with proper escaping
          csvContent += `"${title}","${author}","${url}","${date}"\n`;
        });
        
        // Create a blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set up download attributes
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `facebook-bookmarks-${timestamp}.csv`);
        link.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = 'Bookmarks exported successfully!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => notification.remove(), 500);
        }, 3000);
      } else {
        // Show error notification if no bookmarks
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = 'No bookmarks to export!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => notification.remove(), 500);
        }, 3000);
      }
    });
  }
});
