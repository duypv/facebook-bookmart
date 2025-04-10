// Facebook Bookmark Extension - Content Script

// Configuration
const BOOKMARK_BUTTON_CLASS = 'fb-bookmark-button';
const POST_SELECTOR = '[data-ad-rendering-role="title"]';
const LIKE_SELECTOR = '[data-ad-rendering-role="like_button"]';
const MENU_SELECTOR = '[aria-label="Like"]';
const CHECK_INTERVAL = 5000; // Check for new posts every 2 seconds

// Store for already processed posts
const processedPosts = new Set();

// Main function to add bookmark buttons to posts
function addBookmarkButtons() {
  // Find all Facebook posts
  // const posts = document.querySelectorAll(POST_SELECTOR);
  const posts = document.querySelectorAll(LIKE_SELECTOR);

  // console.log('posts', posts.length);

  posts.forEach(postLike => {
    const post = postLike?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement;
    // Skip if already processed
    if (processedPosts.has(post) || post.querySelector(`.${BOOKMARK_BUTTON_CLASS}`)) {
      return;
    }
    console.log('post', post);

    // Mark as processed

    // Find the post menu area to add our button
    const menuArea = post.querySelector(MENU_SELECTOR)?.parentElement?.parentElement;
    // console.log("menuArea", menuArea, post);
    if (!menuArea) return;

    // for sure ensure that we are not adding multiple buttons to same post
    processedPosts.add(post);


    // Create bookmark button
    const bookmarkButton = document.createElement('div');
    bookmarkButton.className = BOOKMARK_BUTTON_CLASS;
    bookmarkButton.innerHTML = `
      <div role="button" tabindex="0" class="bookmark-btn" 
           style="cursor: pointer; padding: 8px; display: flex; align-items: center;">
        <span style="margin-right: 5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="17.6" height="17.6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <span style="font-size: 110%;">Bookmark</span>
      </div>
    `;

    // Add click event
    bookmarkButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveBookmark(post);
    });

    // Add button to post
    menuArea.appendChild(bookmarkButton);
  });
}

// Function to extract post data
async function extractPostData(post) {
  try {
    // Get post URL
    const postLink = post.querySelector('a[href*="/posts/"]') ||
      post.querySelector('a[href*="/photo.php"]') ||
      post.querySelector('a[href*="/permalink.php"]');
    // dung nut copy trước
    const btnCopy = post.querySelector('[aria-label="Copy link"]');
    btnCopy.click();
    const copiedText = await navigator.clipboard.readText();
    // wait 1 second to ensure the copied text is available
    await new Promise(resolve => setTimeout(resolve, 1000 * 1));

    const postUrl = copiedText ? copiedText : (postLink ? postLink.href : window.location.href);
    // console.log('copiedText', copiedText);
    // console.log('postUrl', postUrl);

    // Get post author
    const authorElement = post.querySelector('h3 a, h4 a, strong a');
    const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';

    // Get post timestamp
    const timestampElement = post.querySelector('a[href*="/posts/"] span, a[href*="/photo.php"] span');
    const timestamp = timestampElement ? timestampElement.textContent.trim() : new Date().toLocaleString();

    // Get post content for title
    const contentElement = post.querySelector('div[data-ad-preview="message"]') ||
      post.querySelector('div[data-ad-comet-preview="message"]');
    let title = contentElement ? contentElement.textContent.trim() : '';

    // If no text content, check if it's an image post
    if (!title) {
      const imageElement = post.querySelector('img[alt]:not([alt=""])');
      title = imageElement ? `Photo: ${imageElement.alt.trim()}` : 'Facebook Post';
    }

    // Limit title length
    title = title.length > 100 ? title.substring(0, 97) + '...' : title;

    const postData = {
      url: postUrl,
      title: title,
      author: author,
      timestamp: timestamp,
      savedAt: new Date().toISOString()
    };

    console.log('postData', postData, JSON.stringify(postData),);


    return postData;

  } catch (error) {
    console.error('Error extracting post data:', error);
    return null;
  }
}

// Function to save bookmark
async function saveBookmark(post) {
  const postData = await extractPostData(post);

  if (!postData) {
    showNotification('Error extracting post data', 'error');
    return;
  }

  // Send to background script for storage
  chrome.runtime.sendMessage({
    action: 'saveBookmark',
    bookmark: postData
  }, response => {
    if (response && response.success) {
      showNotification('Post bookmarked successfully!', 'success');
    } else {
      showNotification(response.message || 'Error saving bookmark', 'error');
    }
  });
}

// Function to show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fb-bookmark-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    border-radius: 4px;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Initialize and set up observers
function initialize() {
  // Add buttons to existing posts
  addBookmarkButtons();

  // Set up interval to check for new posts
  setInterval(addBookmarkButtons, CHECK_INTERVAL);

  // Set up mutation observer for dynamic content
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldCheck = true;
        break;
      }
    }

    if (shouldCheck) {
      addBookmarkButtons();
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Handle extension context invalidation
function handleContextInvalidation() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
      sendResponse({ status: 'alive' });
    }
  });

  window.addEventListener('error', (e) => {
    if (e.message.includes('Extension context invalidated')) {
      console.log('Extension context invalidated. Reloading...');
      window.location.reload();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle context invalidation
handleContextInvalidation();
