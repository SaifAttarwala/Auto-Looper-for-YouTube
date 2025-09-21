// Find checkbox from popup.html
const checkbox = document.getElementById("playlistToggle");

// Store state of toggle option as a value of this string
// This is a tad bit easier than using it in multiple files as just a boolean
const STORAGE_KEY = "loopInPlaylist";

// Load saved setting
browser.storage.local.get(STORAGE_KEY).then(res => {
    checkbox.checked = res[STORAGE_KEY] || false;
});

// Save setting when user changes checkbox toggle
checkbox.addEventListener("change", () => {
    browser.storage.local.set({ [STORAGE_KEY]: checkbox.checked });
});
