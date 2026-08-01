document.addEventListener('DOMContentLoaded', () => {
    // Check dark mode
    chrome.storage.local.get(['hub_dark_mode'], (result) => {
        if (result.hub_dark_mode === 'aktif') {
            document.body.classList.add('dark-theme');
        }
    });

    const cards = document.querySelectorAll('.popup-card');
    cards.forEach(card => {
        card.addEventListener('click', async () => {
            const pageName = card.dataset.page;
            const targetUrl = chrome.runtime.getURL(pageName);
            
            // Query all tabs to find if our extension is already open
            const tabs = await chrome.tabs.query({});
            const extensionTab = tabs.find(t => t.url && t.url.startsWith(chrome.runtime.getURL('')));
            
            if (extensionTab) {
                // Focus the tab and update its URL to the selected module
                await chrome.tabs.update(extensionTab.id, { url: targetUrl, active: true });
                await chrome.windows.update(extensionTab.windowId, { focused: true });
            } else {
                // Open new tab
                await chrome.tabs.create({ url: targetUrl });
            }
            window.close(); // Close the extension popup
        });
    });
});
