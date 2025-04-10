if (window.location.hostname === 'www.facebook.com' || window.location.hostname === 'web.facebook.com') {
  function addBookmarkButton(postElement) {
    if (postElement.querySelector('.bookmark-button')) {
      return; // Button already exists
    }

    const button = document.createElement('button');
    button.textContent = 'Bookmark';
    button.classList.add('bookmark-button', 'x1i10hfl', 'x1qjc9v5', 'x1oa3qoh', 'xqeqjp1', 'x2nq7zg', 'x1swvt13', 'x1pi30zi', 'x1l90r2v', 'x1ycx5nu', 'x6o7n8i', 'x13svdzi', 'x1jx94hy', 'x1plvlek', 'xryxfnj', 'x1c4vz4f', 'x2lah0s', 'x1q0g3np', 'x1ghb86c', 'x1xlr1w8', 'x1egstgx', 'x47uaug', 'x1j1ka1n', 'x1rdyj79', 'xs83m0k', 'x1mk9n2u', 'x1m1dhpf'); // Facebook button classes - might need adjustment

    button.style.marginLeft = '8px';  // Adjust spacing as needed


    button.addEventListener('click', () => {
      try {
        const postLinkElement = postElement.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
        const postUrl = postLinkElement ? postLinkElement.href : window.location.href;  // Fallback to current URL if no post link

        const titleElement = postElement.querySelector('h1, h2, h3, h4, h5, h6') || postElement.querySelector('span') || postElement; //Try to find a heading or span, otherwise use the whole post
        const title = titleElement.textContent.trim().substring(0, 200) + (titleElement.textContent.length > 200 ? "..." : ""); //Limit title length


        let author = "Unknown Author";
        const authorElement = postElement.querySelector('a[href*="/profile.php?"], a[href^="https://www.facebook.com/"]');
        if (authorElement) {
            author = authorElement.textContent.trim();
        } else {
          // For posts in groups or pages, try to find the author name in a different structure
          const subHeaderElement = postElement.querySelector('span > a');
          if(subHeaderElement){
            author = subHeaderElement.textContent.trim();
          }
        }

        const timestampElement = postElement.querySelector('abbr[data-utime]');
        const timestamp = timestampElement ? parseInt(timestampElement.dataset.utime) * 1000 : Date.now();

        const bookmark = {
          url: postUrl,
          title: title,
          author: author,
          timestamp: timestamp,
        };


        chrome.runtime.sendMessage({ type: 'addBookmark', bookmark: bookmark }, (response) => {
          if (response && response.success) {
            button.textContent = 'Bookmarked!';
            button.disabled = true;
            // Revert after a short delay
            setTimeout(() => {
              //Consider changing the styling back instead of just reverting text
              //Also consider showing a checkmark icon instead of text
              button.textContent = 'Bookmark';
              button.disabled = false;
            }, 2000);  // 2 seconds
          } else {
            console.error("Error adding bookmark:", response ? response.error : "No response from background script.");
            // Show an error message to the user if needed
            button.textContent = "Bookmark Failed";
            setTimeout(() => {
              button.textContent = "Bookmark";
            }, 3000);
          }
        });
      } catch (error) {
        console.error("Error in bookmarking:", error);
        // Handle errors appropriately, e.g., show a user-friendly message
        button.textContent = "Bookmark Error";
        setTimeout(() => {
          button.textContent = "Bookmark";
        }, 3000);
      }
    });

    // Find the reactions bar or a suitable place to insert the button
    const actionsBar = postElement.querySelector('[role="toolbar"]');

    if (actionsBar) {
        actionsBar.appendChild(button);
    } else {
        //Fallback: Append to the end of the post if no actions bar is found (less ideal)
        postElement.appendChild(button);
    }
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const posts = document.querySelectorAll('[data-pagelet^="FeedUnit_"], [id^="hyperfeed_story_id_"]');
        posts.forEach(post => addBookmarkButton(post));

      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check for existing posts
  const initialPosts = document.querySelectorAll('[data-pagelet^="FeedUnit_"], [id^="hyperfeed_story_id_"]');
  initialPosts.forEach(post => addBookmarkButton(post));
}