// Compatibility for Chrome/Firefox
if (typeof browser === "undefined") {
    var browser = chrome;
}

// Storage key used by popup.js
const STORAGE_KEY = "loopInPlaylist";

let observer = null;
let currentVideo = null;

// Check if URL has a playlist
function inPlaylist() {
    const params = new URLSearchParams(location.search);
    return params.has("list");
}

// Apply loop attribute according to stored preference
function applyLoop(video) {
    if (!video) return;
    browser.storage.local.get(STORAGE_KEY).then(res => {
        const loopPlaylist = res[STORAGE_KEY] || false;

        // If an ad is currently showing, do NOT loop ads
        if (isAdPlaying()) {
            video.loop = false;
            console.log("Auto-Loopeer: Ad detected — not looping ad");
            return;
        }

        // Playlist videos loop only if toggle is ON
        if (inPlaylist() && !loopPlaylist) {
            video.loop = false; // skip playlist if toggle is off
            console.log("Auto-Loopeer: Not looping playlist video");
        } else {
            video.loop = true; // loop normal video or allowed playlist
            console.log("Auto-Loopeer: Looping video");
        }
    }).catch(err => console.warn("Auto-Loopeer storage error:", err));
}

// Called when we find a video element — attach handlers and apply loop
function onVideoFound(video) {
    if (!video) return;
    // If same video element, just reapply loop (it might have been reset)
    if (currentVideo === video) {
        applyLoop(video);
        return;
    }

    currentVideo = video;
    applyLoop(video);

    // Reapply loop when metadata/source changes
    video.addEventListener('loadedmetadata', () => applyLoop(video));
    video.addEventListener('emptied', () => {
        // small delay to allow YouTube to insert a new video element
        setTimeout(() => {
            const v = document.querySelector('video');
            if (v) onVideoFound(v);
        }, 200);
    });
    // Watch ad state changes and disable loop while ads play
    ensureAdObserver();
}

// Observe DOM mutations and detect video element
function observeVideo() {
    if (observer) return; // already observing

    observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        if (video) onVideoFound(video);
    });

    // Observe changes in the entire body subtree
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check if video already exists on load
    const video = document.querySelector('video');
    if (video) onVideoFound(video);
}

// Hook history methods so we can detect SPA navigation on pages where the
// content script is active (manifest now injects on all youtube pages).
function hookHistory() {
    const dispatchLocationChange = () => window.dispatchEvent(new Event('locationchange'));

    const _pushState = history.pushState;
    history.pushState = function(...args) {
        _pushState.apply(this, args);
        dispatchLocationChange();
    };

    const _replaceState = history.replaceState;
    history.replaceState = function(...args) {
        _replaceState.apply(this, args);
        dispatchLocationChange();
    };

    window.addEventListener('popstate', dispatchLocationChange);

    // When the location changes, check for watch page and reapply loop after a short delay
    window.addEventListener('locationchange', () => {
        setTimeout(() => {
            if (location.pathname === '/watch' || location.href.includes('/watch')) {
                const video = document.querySelector('video');
                if (video) onVideoFound(video);
            }
        }, 300);
    });
}

// Initialize everything
(function init() {
    observeVideo();
    hookHistory();
})();

// Detect whether an ad is playing. YouTube typically adds an "ad-showing"
// class to the player element when ads are displayed. We check a few
// selectors to be safe across variations.
function isAdPlaying() {
    try {
        if (document.querySelector('.ad-showing')) return true;
        if (document.querySelector('.ytp-ad-player-overlay')) return true;
        if (document.querySelector('.ad-container')) return true;
        // older selectors / fallback
        const videoAds = document.querySelector('.video-ads');
        if (videoAds && videoAds.children.length > 0) return true;
    } catch (e) {
        // ignore DOM errors
    }
    return false;
}

let adObserverAttached = false;
function ensureAdObserver() {
    if (adObserverAttached) return;

    // Observe class changes on the player element and document body to detect ad state
    const player = document.querySelector('.html5-video-player') || document.body;
    if (!player) return;

    const adObserver = new MutationObserver(muts => {
        // If ad starts, disable loop; when ad ends, reapply loop to current video
        for (const m of muts) {
            if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
                const video = document.querySelector('video');
                if (!video) continue;
                if (isAdPlaying()) {
                    if (video.loop) {
                        video.loop = false;
                        console.log('Auto-Loopeer: Detected ad - disabled loop');
                    }
                } else {
                    // reapply stored preference after ad finishes
                    applyLoop(video);
                }
            }
            // If nodes change (ad overlay inserted/removed), also check
            if (m.type === 'childList') {
                const video = document.querySelector('video');
                if (!video) continue;
                if (isAdPlaying()) {
                    if (video.loop) {
                        video.loop = false;
                        console.log('Auto-Loopeer: Detected ad (childList) - disabled loop');
                    }
                } else {
                    applyLoop(video);
                }
            }
        }
    });

    adObserver.observe(player, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true });
    adObserverAttached = true;
}
