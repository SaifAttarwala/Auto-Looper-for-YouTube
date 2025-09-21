// This will fetch a value from popup.js line 2
const STORAGE_KEY = "loopInPlaylist";

// Check if URL has a playlist
function inPlaylist() {
    const params = new URLSearchParams(location.search);
    return params.has("list"); // true only if there is a "list" parameter
}

// Loop the video based on user preference
function loopVideo(video) {
    browser.storage.local.get(STORAGE_KEY).then(res => {
        const loopPlaylist = res[STORAGE_KEY] || false;

        // Playlist videos loop only if toggle is ON
        if (inPlaylist() && !loopPlaylist) {
            video.loop = false; // skip playlist if toggle is off
            console.log("Not looping playlist video");
        } else {
            video.loop = true; // loop normal video or allowed playlist
            console.log("Looping video");
        }
    });
}

// Observe DOM changes to detect when a video element is added
// Apparently sometimes the "video" DOM tag loads after execution. 
// This function will only run if it finds the video tag.
// It will loop every 0.5s until it finds the video tag.... indefinitely..
// Not exactly efficient but its a temporary solution
function observeVideo() {
    const observer = new MutationObserver(() => {
        const video = document.querySelector("video");
        if (video) {
            loopVideo(video);
        }
    });

    // Observe changes in the entire body subtree
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check if video already exists on load
    const video = document.querySelector("video");
    if (video) {
        loopVideo(video);
    }
}

// Initialize observer
observeVideo();
