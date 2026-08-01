// content_sync.js — Bridges chrome.storage.local and local page localStorage in real-time
(function() {
    const sharedKeys = ['hub_global_desktop_notes', 'hub_defter_sayfalar', 'hub_defter', 'hub_defter_aktif_sayfa_index', 'hub_todo_hub_v2', 'hub_harcama_zaman_listesi', 'hub_dark_mode', 'hub_sticky_text', 'hub_sticky_theme', 'hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y', 'hub_merkezi_ajanda_verisi', 'hub_pano_v2', 'hub_lang', 'hub_sticky_session_id'];
    
    // Listen for storage changes in the extension and write them to the page's localStorage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local') {
                    for (let key in changes) {
                        if (sharedKeys.includes(key)) {
                            const newVal = changes[key].newValue;
                            window.isSyncingFromExtension = true;
                            if (newVal === undefined) {
                                localStorage.removeItem(key);
                            } else {
                                localStorage.setItem(key, newVal);
                            }
                            window.isSyncingFromExtension = false;
                            
                            // Dispatch a custom DOM event that crosses the world isolation boundary to the page
                            document.dispatchEvent(new CustomEvent('extension_sync_update', {
                                detail: { key: key, value: newVal }
                            }));
                        }
                    }
                }
            });
        } catch (err) {
            console.log("Logbook sync listener failed: ", err.message);
        }
    }

    // Listen to changes from the page and write them to chrome.storage.local
    document.addEventListener('page_sync_update', (e) => {
        if (sharedKeys.includes(e.detail.key)) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                try {
                    chrome.storage.local.set({ [e.detail.key]: e.detail.value });
                } catch (err) {
                    if (err.message && err.message.includes("Extension context invalidated")) {
                        // Silently ignore context invalidation on reload/upgrade
                        return;
                    }
                    console.log("Logbook local save sync failed: ", err.message);
                }
            }
        }
    });

    // Global click listener for post-it links on webpages
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            const isPostitLink = link.classList.contains('postit-link') || 
                                 link.classList.contains('postit-link-badge') || 
                                 link.closest('.postit-textarea') || 
                                 link.closest('.postit-editor-body');
            if (isPostitLink) {
                e.preventDefault();
                e.stopPropagation();
                window.open(link.href, '_blank');
            }
        }
    }, true);
})();
