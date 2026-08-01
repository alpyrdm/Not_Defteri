// --- DOMContentLoaded & Load Event Polyfill for dynamic script loading ---
(function() {
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
        if (type === 'DOMContentLoaded' && (document.readyState === 'interactive' || document.readyState === 'complete')) {
            setTimeout(listener, 0);
        } else {
            originalAddEventListener.apply(this, arguments);
        }
    };

    const originalWindowAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
        if (type === 'load' && document.readyState === 'complete') {
            setTimeout(listener, 0);
        } else {
            originalWindowAddEventListener.apply(this, arguments);
        }
    };
})();

// --- GLOBAL LINK CLICK DELEGATION FOR POST-IT NOTES ---
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href) {
        if (link.href.startsWith('http://') || link.href.startsWith('https://') || link.classList.contains('postit-link') || link.classList.contains('postit-link-badge')) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: link.href });
            } else {
                window.open(link.href, '_blank');
            }
        }
    }
}, true);

// --- CHROME STORAGE INTERCEPTOR & SYNC ENGINE ---
let selfSettingStorage = false;

const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (window.isSyncingFromExtension) return;
    const sharedKeys = ['hub_global_desktop_notes', 'hub_defter_sayfalar', 'hub_defter', 'hub_defter_aktif_sayfa_index', 'hub_todo_hub_v2', 'hub_harcama_zaman_listesi', 'hub_dark_mode', 'hub_sticky_text', 'hub_sticky_theme', 'hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y', 'hub_merkezi_ajanda_verisi', 'hub_pano_v2', 'hub_lang', 'hub_sticky_session_id', 'hub_spellcheck_enabled'];
    if (sharedKeys.includes(key)) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            selfSettingStorage = true;
            chrome.storage.local.set({ [key]: value }, () => {
                setTimeout(() => { selfSettingStorage = false; }, 50);
            });
        } else {
            // Dispatch to content script on local file:// pages
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: key, value: value }
            }));
        }
    }
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    if (window.isSyncingFromExtension) return;
    const sharedKeys = ['hub_global_desktop_notes', 'hub_defter_sayfalar', 'hub_defter', 'hub_defter_aktif_sayfa_index', 'hub_todo_hub_v2', 'hub_harcama_zaman_listesi', 'hub_dark_mode', 'hub_sticky_text', 'hub_sticky_theme', 'hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y', 'hub_merkezi_ajanda_verisi', 'hub_pano_v2', 'hub_lang', 'hub_sticky_session_id'];
    if (sharedKeys.includes(key)) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            selfSettingStorage = true;
            chrome.storage.local.remove(key, () => {
                setTimeout(() => { selfSettingStorage = false; }, 50);
            });
        } else {
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: key, value: undefined }
            }));
        }
    }
};

// Startup Sync from chrome.storage.local
(function() {
    const sharedKeys = ['hub_global_desktop_notes', 'hub_defter_sayfalar', 'hub_defter', 'hub_defter_aktif_sayfa_index', 'hub_todo_hub_v2', 'hub_harcama_zaman_listesi', 'hub_dark_mode', 'hub_sticky_text', 'hub_sticky_theme', 'hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y', 'hub_merkezi_ajanda_verisi', 'hub_pano_v2', 'hub_lang', 'hub_sticky_session_id'];
    
    function finishLoad() {
        // Automatically handle styling and dimensions if running in a popup widget window
        if (typeof chrome !== 'undefined' && chrome.windows) {
            const performResize = () => {
                chrome.windows.getCurrent((win) => {
                    if (chrome.runtime.lastError || !win) return;
                    if (win.type === 'popup') {
                        const pathname = window.location.pathname;
                        let targetW = 300;
                        let targetH = 330;
                        
                        if (pathname.includes('widget_todo.html')) {
                            targetW = 550;
                            targetH = 580;
                        } else if (pathname.includes('widget_defter.html')) {
                            targetW = 500;
                            targetH = 550;
                        } else if (pathname.includes('widget_finans.html')) {
                            targetW = 450;
                            targetH = 500;
                        } else if (pathname.includes('widget_ajanda.html')) {
                            targetW = 580;
                            targetH = 600;
                        } else if (pathname.includes('desktop_note.html')) {
                            targetW = 380;
                            targetH = 480;
                        }
                        
                        // Resize window to match the specific module's layout requirements
                        if (win.width !== targetW || win.height !== targetH) {
                            chrome.windows.update(win.id, {
                                width: targetW,
                                height: targetH
                            });
                        }
                    }
                });
            };

            // Run immediately on page load
            performResize();
            // Run again after 250ms to override any Chrome startup window restoration dimensions
            setTimeout(performResize, 250);
        }

        // Programmatically bind back button if present (solves CSP inline onclick issue)
        const backBtn = document.querySelector('.popup-back-btn');
        if (backBtn) {
            backBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = 'desktop_note.html';
            };
        }

        // Apply dark mode immediately based on synced localStorage
        let dMode = localStorage.getItem('hub_dark_mode') === 'aktif';
        if (dMode) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Setup theme toggle listener
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) {
            darkToggle.innerText = dMode ? "☀️" : "🌙";
            darkToggle.onclick = () => {
                document.body.classList.toggle('dark-theme');
                const simdiDark = document.body.classList.contains('dark-theme');
                localStorage.setItem('hub_dark_mode', simdiDark ? 'aktif' : 'pasif');
                darkToggle.innerText = simdiDark ? "☀️" : "🌙";
            };
            
            // Inject language toggle button next to dark mode toggle
            if (!document.getElementById('lang-toggle')) {
                const langBtn = document.createElement('button');
                langBtn.id = 'lang-toggle';
                langBtn.className = 'lang-toggle-btn';
                
                const currentLang = localStorage.getItem('hub_lang') || 'tr';
                langBtn.innerText = currentLang === 'tr' ? 'EN' : 'TR';
                langBtn.title = currentLang === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç';
                
                langBtn.onclick = () => {
                    const nextLang = currentLang === 'tr' ? 'en' : 'tr';
                    localStorage.setItem('hub_lang', nextLang);
                    window.location.reload();
                };
                
                darkToggle.parentNode.insertBefore(langBtn, darkToggle);
            }
        }

        // Apply translations if language is set to English
        const activeLang = localStorage.getItem('hub_lang') || 'tr';
        if (activeLang === 'en') {
            applyEnglishTranslations();
        }

        // Dynamically load the page's main JS file (from data-main attribute)
        const scriptTags = document.querySelectorAll('script');
        let mainScript = null;
        scriptTags.forEach(s => {
            if (s.src.includes('common.js') && s.dataset.main) {
                mainScript = s.dataset.main;
            }
        });
        
        if (mainScript) {
            const s = document.createElement('script');
            s.src = mainScript;
            document.body.appendChild(s);
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(sharedKeys, (result) => {
            sharedKeys.forEach(key => {
                if (result[key] !== undefined) {
                    let val = result[key];
                    if (typeof val === 'object' && val !== null) {
                        val = JSON.stringify(val);
                    }
                    originalSetItem.call(localStorage, key, val);
                }
            });
            finishLoad();
        });

        // Real-time synchronization when storage changes in other tabs/content scripts
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && !selfSettingStorage) {
                for (let key in changes) {
                    if (sharedKeys.includes(key)) {
                        const newVal = changes[key].newValue;
                        if (newVal === undefined) {
                            originalRemoveItem.call(localStorage, key);
                        } else {
                            let val = newVal;
                            if (typeof val === 'object' && val !== null) {
                                val = JSON.stringify(val);
                            }
                            originalSetItem.call(localStorage, key, val);
                        }

                        if (['hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y'].includes(key)) {
                            if (typeof renderStickyImage === 'function') renderStickyImage();
                        }
                        if (key === 'hub_global_desktop_notes' && typeof renderAllNotes === 'function') {
                            renderAllNotes();
                        }
                        if (key === 'hub_todo_hub_v2') {
                            if (typeof todoHubYukle === 'function') todoHubYukle();
                            if (typeof todoHubYenile === 'function') todoHubYenile();
                        }
                        if (key === 'hub_pano_v2') {
                            if (window.lastLocalSaveTime && (Date.now() - window.lastLocalSaveTime < 1000)) {
                                // Skip local save sync echo
                            } else {
                                if (typeof workspacesYukle === 'function') workspacesYukle();
                                if (typeof workspaceSeciciGuncelle === 'function') workspaceSeciciGuncelle();
                                if (typeof workspaceYukle === 'function') workspaceYukle();
                            }
                        }
                        if (key === 'hub_sticky_text') {
                            const textarea = document.getElementById('postit-text');
                            if (textarea && textarea.innerHTML !== (newVal || "") && !window.isUserTyping) {
                                textarea.innerHTML = newVal || "";
                            }
                        }
                        if (key === 'hub_sticky_theme') {
                            if (window.location.pathname.includes('desktop_note.html')) {
                                const savedTheme = newVal || 'theme-yellow';
                                document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
                                document.body.classList.add(savedTheme);
                            }
                        }
                        if (key === 'hub_spellcheck_enabled') {
                            const isEnabled = newVal !== 'false';
                            document.querySelectorAll('.postit-editor-body, .postit-textarea').forEach(el => {
                                el.setAttribute('spellcheck', isEnabled ? 'true' : 'false');
                            });
                        }

                        document.dispatchEvent(new CustomEvent('extension_sync_update', {
                            detail: { key: key, value: newVal }
                        }));
                        if (key === 'hub_sticky_session_id') {
                            if (typeof workspaceYukle === 'function') workspaceYukle();
                        }
                        if (key === 'hub_defter_sayfalar' || key === 'hub_defter_aktif_sayfa_index') {
                            if (typeof sayfalariYukleVeHazirla === 'function' && typeof sayfayiEkranaYukle === 'function') {
                                const defterTextarea = document.getElementById('ana-defter');
                                const isEditingDefter = defterTextarea && document.activeElement === defterTextarea;
                                
                                if (isEditingDefter) {
                                    // If actively editing, only reload pages in memory, don't overwrite input focus!
                                    sayfalariYukleVeHazirla();
                                } else {
                                    sayfalariYukleVeHazirla();
                                    if (typeof aktifSayfaIndex !== 'undefined') {
                                        sayfayiEkranaYukle(aktifSayfaIndex);
                                    }
                                }
                            }
                        }
                        if (key === 'hub_harcama_zaman_listesi') {
                            if (typeof zamanAnaliziHesapla === 'function') {
                                zamanAnaliziHesapla();
                            }
                            if (typeof kategorileriGuncelle === 'function') {
                                kategorileriGuncelle();
                            }
                        }
                        if (key === 'hub_merkezi_ajanda_verisi') {
                            if (typeof gunlukPlanlariListele === 'function') gunlukPlanlariListele();
                            
                            const isEditingWeekly = document.activeElement && 
                                                    (document.activeElement.tagName === 'TEXTAREA' && 
                                                     (document.activeElement.classList.contains('tum-gun-hucre') || 
                                                      document.activeElement.closest('#haftalik-tablo-govde')));
                                                      
                            if (!isEditingWeekly && typeof haftalikTabloyuInsaEt === 'function') haftalikTabloyuInsaEt();
                            if (typeof takvimCiz === 'function') takvimCiz();
                        }
                        if (key === 'hub_dark_mode') {
                            const dMode = newVal === 'aktif';
                            const darkToggle = document.getElementById('dark-mode-toggle');
                            if (dMode) {
                                document.body.classList.add('dark-theme');
                                if (darkToggle) darkToggle.innerText = "☀️";
                            } else {
                                document.body.classList.remove('dark-theme');
                                if (darkToggle) darkToggle.innerText = "🌙";
                            }
                            if (typeof renderAllNotes === 'function') {
                                renderAllNotes();
                            }
                        }
                        if (key === 'hub_lang') {
                            window.location.reload();
                        }
                    }
                }
            }
        });
    } else {
        finishLoad();
    }

    // Real-time synchronization event listener for local file:// pages (bridged by content_sync.js)
    document.addEventListener('extension_sync_update', (e) => {
        const key = e.detail.key;
        const newVal = e.detail.value;
        if (sharedKeys.includes(key)) {
            // Update page's actual localStorage
            if (newVal === undefined || newVal === null) {
                originalRemoveItem.call(localStorage, key);
            } else {
                originalSetItem.call(localStorage, key, typeof newVal === 'string' ? newVal : JSON.stringify(newVal));
            }
            // Dark Mode
            if (key === 'hub_dark_mode') {
                const dMode = newVal === 'aktif';
                const darkToggle = document.getElementById('dark-mode-toggle');
                if (dMode) {
                    document.body.classList.add('dark-theme');
                    if (darkToggle) darkToggle.innerText = "☀️";
                } else {
                    document.body.classList.remove('dark-theme');
                    if (darkToggle) darkToggle.innerText = "🌙";
                }
            }
            // Todo Hub
            if (key === 'hub_todo_hub_v2') {
                if (typeof todoHubYukle === 'function') todoHubYukle();
                if (typeof todoHubYenile === 'function') todoHubYenile();
            }
            // Defter (Notebook)
            if (key === 'hub_defter_sayfalar' || key === 'hub_defter_aktif_sayfa_index') {
                if (typeof sayfalariYukleVeHazirla === 'function' && typeof sayfayiEkranaYukle === 'function') {
                    const defterTextarea = document.getElementById('ana-defter');
                    const isEditingDefter = defterTextarea && document.activeElement === defterTextarea;
                    
                    if (isEditingDefter) {
                        sayfalariYukleVeHazirla();
                    } else {
                        sayfalariYukleVeHazirla();
                        if (typeof aktifSayfaIndex !== 'undefined') {
                            sayfayiEkranaYukle(aktifSayfaIndex);
                        }
                    }
                }
            }
            if (key === 'hub_merkezi_ajanda_verisi') {
                if (typeof gunlukPlanlariListele === 'function') gunlukPlanlariListele();
                
                const isEditingWeekly = document.activeElement && 
                                        (document.activeElement.tagName === 'TEXTAREA' && 
                                         (document.activeElement.classList.contains('tum-gun-hucre') || 
                                          document.activeElement.closest('#haftalik-tablo-govde')));
                                          
                if (!isEditingWeekly && typeof haftalikTabloyuInsaEt === 'function') haftalikTabloyuInsaEt();
                if (typeof takvimCiz === 'function') takvimCiz();
            }
            // Finans / Zaman Analizi
            if (key === 'hub_harcama_zaman_listesi') {
                if (typeof zamanAnaliziHesapla === 'function') zamanAnaliziHesapla();
                if (typeof kategorileriGuncelle === 'function') kategorileriGuncelle();
            }
            // Sticky Note
            if (key === 'hub_sticky_text') {
                if (!window.location.pathname.includes('desktop_note.html')) {
                    const textarea = document.getElementById('postit-text');
                    if (textarea && textarea.innerHTML !== newVal) textarea.innerHTML = newVal || "";
                }
            }
            if (key === 'hub_sticky_theme') {
                const isSticky = window.location.pathname.includes('desktop_note.html');
                if (isSticky) {
                    document.body.className = "page-stickynote " + (newVal || "theme-yellow");
                }
            }
            if (['hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y'].includes(key)) {
                if (typeof renderStickyImage === 'function') renderStickyImage();
            }
            if (key === 'hub_pano_v2') {
                if (window.lastLocalSaveTime && (Date.now() - window.lastLocalSaveTime < 1000)) {
                    // Skip local save sync echo
                } else {
                    if (typeof workspacesYukle === 'function') workspacesYukle();
                    if (typeof workspaceSeciciGuncelle === 'function') workspaceSeciciGuncelle();
                    if (typeof workspaceYukle === 'function') workspaceYukle();
                }
            }
            if (key === 'hub_sticky_session_id') {
                if (typeof workspaceYukle === 'function') workspaceYukle();
            }
            if (key === 'hub_lang') {
                window.location.reload();
            }
        }
    });

    // English translation engine dictionary mapping
    function applyEnglishTranslations() {
        const translations = {
            // Navigation bar
            "#btn-pano-sekme": "Board",
            "#btn-todo-sekme": "To-Do",
            "#btn-ajanda-sekme": "Agenda / Calendar",
            "#btn-defter-sekme": "Notebook",
            "#btn-finans-sekme": "Finance & Time",
            "a[href$='finans.html#butce']": "💰 Budget & Expenses",
            "a[href$='finans.html#doviz']": "💱 Live Forex Desk",
            "#btn-stickynote-sekme": "Quick Note",
            
            // Pano / Board (pano.html)
            "#yeni-not-btn": "+ New Post-it",
            "#hizala-not-btn": "Arrange / Align Notes",
            "label[for='workspace-select']": "Workspace:",
            "#workspace-ekle-btn": "+ Add Workspace",
            "#workspace-sil-btn": "Delete Workspace",
            ".cop-kutusu h3": "🗑️ Trash / Deleted Notes",
            "#cop-temizle-btn": "Empty Trash",
            ".cop-kutusu p": "Trash is empty.",
            
            // Todo (todo.html / widget_todo.html)
            ".todo-sidebar h3": "My Lists",
            "#yeni-liste-btn": "+ Create New List",
            "#liste-sil-btn": "Delete This List Completely",
            "#todo-input": "Add a new task to this list...",
            "#todo-ekle-btn": "Add",
            "#havuz-todo h4": "📋 To Do",
            "#havuz-progress h4": "⚡ Doing",
            "#havuz-done h4": "✅ Done",
            
            // Defter (defter.html / widget_defter.html)
            ".defter-header .defter-title": "Smart Notebook",
            "#sayfa-onceki-btn": "◀",
            "#sayfa-sonraki-btn": "▶",
            "#sayfa-ekle-btn": "➕",
            "#sayfa-sil-btn": "🗑️",
            "#defter-cizgi-toggle": "📝 Lined",
            "#defter-mod-toggle": "✍️ Text",
            "#defter-ses-btn": "🎙️ Dictate",
            "#defter-ses-memo-btn": "🎤 Record",
            "#defter-kaydet-btn": "💾 Save",
            "#defteri-temizle-btn": "🔄 Reset",
            "#boyut-etiket": "5px",
            "#defter-silgi-btn": "🧽 Eraser",
            "#defter-undo-btn": "↩ Undo",
            "label[for='resim-yukle']": "🖼️ Image",
            "#defter-word-export-btn": "📥 Export to Word",
            "#ana-defter": "You can write text, switch modes to sketch on top, or drag and drop images here...",
            
            // Finans (finans.html / widget_finans.html)
            "#btn-finans-butce": "💰 Budget & Expenses",
            "#btn-finans-doviz": "💱 Live Forex Desk",
            "#lbl-tekrarlayan-baslik": "🔄 Monthly Recurring Expenses",
            "#lbl-tekrarlayan-bos": "No active recurring expense templates found.",
            "#finans-form-blok h3": "Add Income/Expense",
            "#finans-butce-alan h3": "Expense Tracking & Time Distribution",
            "#finans-doviz-alan h3": "💱 Live Forex Exchange Matrix",
            "#finans-doviz-alan p": "Real-time exchange parities board. Data is calculated autonomously.",
            "#harcama-ad": "Expense name...",
            "#harcama-miktar": "Amount",
            "#harcama-kategori": "Type or select category...",
            ".butce-label-title": "Monthly Budget:",
            "#analiz-ay-butce": "Not Defined",
            "#butce-duzenle-btn": "Update Budget",
            "#harcama-ekle-btn": "Save Transaction",
            "#harcama-export-btn": "Export CSV",
            ".analiz-kolon:nth-child(1) h5": "Monthly Flow Summaries (Shared Pool)",
            ".analiz-kolon:nth-child(2) h5": "Weekly Intensity Comparison",
            ".mini-analiz-tablosu tr:nth-child(1) td:nth-child(1)": "Monthly Total Spent:",
            ".mini-analiz-tablosu tr:nth-child(2) td:nth-child(1)": "Weekly Average Pace:",
            ".mini-analiz-tablosu tr:nth-child(3) td:nth-child(1)": "Daily Average Pace:",
            ".akıllı-analiz-kutusu": "System waiting for data...",
            ".harcama-tablosu th:nth-child(1)": "Description",
            ".harcama-tablosu th:nth-child(2)": "Category",
            ".harcama-tablosu th:nth-child(3)": "Period / Day",
            ".harcama-tablosu th:nth-child(4)": "Amount (Original / TL)",
            ".harcama-tablosu th:nth-child(5)": "Action",
            ".makine-alani h3": "Quick Calculator",
                    "#doviz-trend-baslik": "📈 Forex Exchange Trend",
            "#doviz-trend-desc": "Comparative exchange rates of currencies against the base currency over the last few days.",
            "#chart-baz-doviz-label": "Base Currency:",
            "#doviz-matris-baslik-birim": "Currency",
            "#cevirici-baslik": "🧮 Currency Cross Converter",
            "#cevirici-aciklama": "Convert between all currencies using real-time cross parities. Writing in any field automatically calculates the others.",
            
            // Ajanda (ajanda.html / widget_ajanda.html)
            "#btn-gunlik-alan": "Daily Plan",
            "#btn-haftalik-alan": "Weekly Schedule",
            "#btn-aylik-alan": "Monthly Calendar",
            ".ajanda-kart h4": "📋 Weekly Routine Schedule",
            ".ozel-planlar-baslik": "📅 Today's Special Calendar Events",
            "#ac-plan-modal-btn": "+ Add New Plan",
            "#onceki-ay-btn": "< Prev",
            "#sonraki-ay-btn": "Next >",
            "#modal-baslik": "Create New Plan",
            "#modal-secilen-tarih-alani": "Date: -",
            "#modal-gun-kapsayici label": "Select Day:",
            "#modal-saat-kapsayici label": "Select Time:",
            "#modal-not-input": "Type your plan here...",
            "#modal-iptal-btn": "Cancel",
            "#modal-kaydet-btn": "Add to Plan",
            "#modal-tum-gun-btn": "All Day Reminder: OFF 🔴",
            
            // Quick Note (desktop_note.html)
            ".postit-title": "Logbook Quick Note",
            "#postit-text": "Type your notes here...",
            "#save-status": "Saved",
            "#backup-title": "Backup & Restore",
            "#backup-desc": "Backup all Logbook data into a single file, or restore from a previous backup.",
            "#btn-do-backup": "📤 Export Data (Backup)",
            "#btn-do-restore": "📥 Import Data (Restore)",
            "#btn-close-backup": "Close",
            
            // Dashboard Cards (index.html)
            ".dashboard-info-header h2": "Logbook Tips & User Guide"
        };
 
        // Apply exact selector translation mapping
        for (let selector in translations) {
            document.querySelectorAll(selector).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.hasAttribute('placeholder')) {
                    el.setAttribute('placeholder', translations[selector]);
                } else {
                    el.innerText = translations[selector];
                }
            });
        }
 
        const titleTranslations = {
            "#btn-todo": "Open To-Do",
            "#btn-ajanda": "Open Agenda",
            "#btn-fin": "Open Finance",
            "#btn-clear": "Save & Reset",
            "#btn-voice": "Voice Typing",
            "#btn-voice-memo": "Record Voice Memo",
            "#defter-ses-memo-btn": "Add Voice Memo",
            "#btn-image-label": "Insert Image",
            "#btn-backup": "Backup & Restore",
            "#defter-word-export-btn": "Download notebook as Word document"
        };
        for (let selector in titleTranslations) {
            document.querySelectorAll(selector).forEach(el => {
                el.title = titleTranslations[selector];
            });
        }

        // Special translation for select elements' children
        document.querySelectorAll("option").forEach(opt => {
            if (opt.value === 'bos' && opt.text.includes('Boş')) opt.text = "Blank";
            if (opt.value === 'cizgili' && opt.text.includes('Çizgili')) opt.text = "Lined";
            if (opt.value === 'kareli' && opt.text.includes('Kareli')) opt.text = "Grid";
            if (opt.value === 'noktali' && opt.text.includes('Noktalı')) opt.text = "Dotted";
            if (opt.value === 'gider' && opt.text.includes('Gider')) opt.text = "Expense";
            if (opt.value === 'gelir' && opt.text.includes('Gelir')) opt.text = "Income";
            if (opt.value === 'ALTIN' && opt.text.includes('Gram Altın')) opt.text = "Gold Gram (gr)";
            if (opt.value === 'tek' && opt.text.includes('Tek Seferlik')) opt.text = "One-Time (Payments)";
            if (opt.value === 'aylik' && opt.text.includes('Aylık Tekrarlayan')) opt.text = "Monthly Recurring (Subscription/Rent)";
        });

        // Translate dashboard card texts dynamically
        const pathname = window.location.pathname;
        if (pathname.includes('index.html') || pathname.endsWith('/')) {
            const dashboardTranslations = {
                ".card-pano .card-title": "Board (Post-it)",
                ".card-pano .card-desc": "Pin your ideas and quick notes as colored sticky notes on the board. Drag and organize as you wish.",
                ".card-todo .card-title": "To-Do List",
                ".card-todo .card-desc": "Categorize tasks by lists. Drag and drop between Todo, Doing, and Done to track progress.",
                ".card-ajanda .card-title": "Agenda / Calendar",
                ".card-ajanda .card-desc": "Manage daily plans, schedule weekly courses/work, or take smart notes on the monthly calendar.",
                ".card-defter .card-title": "Hybrid Notebook",
                ".card-defter .card-desc": "Type text and sketch on the same page. Toggle gridlines or insert images to enrich your work.",
                ".card-finans .card-title": "Finance & Time Analysis",
                ".card-finans .card-desc": "Track expenses with multi-currency support, analyze weekly/monthly time distribution, and export reports."
            };
            for (let selector in dashboardTranslations) {
                document.querySelectorAll(selector).forEach(el => {
                    el.innerText = dashboardTranslations[selector];
                });
            }
            
            // Translate Carousel Tips
            const carouselItems = document.querySelectorAll('.dashboard-info-item');
            const tipTranslations = [
                {
                    title: "Spotlight Search Panel",
                    desc: "Press <strong>Command + K</strong> (or <strong>Ctrl + K</strong>) to open the spotlight panel and search across notebook pages, boards, tasks, agenda plans, and transactions instantly."
                },
                {
                    title: "System-wide Quick Note",
                    desc: "Open the Quick Note window by pressing <strong>Control + Shift + L</strong> even when Chrome is in the background. (Needs to be enabled once in <code>chrome://extensions/shortcuts</code>)."
                },
                {
                    title: "Automatic Board Sync",
                    desc: "Anything written or dragged into the Quick Note is automatically synchronized to the extension post-it card on the Board in real-time."
                },
                {
                    title: "Allow File URLs Access",
                    desc: "To ensure sync works on local pages, visit <code>chrome://extensions</code>, open Logbook details, and enable the <strong>'Allow access to file URLs'</strong> setting."
                },
                {
                    title: "Notebook Shortcut & Save",
                    desc: "Press <strong>Cmd + S</strong> (or <strong>Ctrl + S</strong>) inside the Notebook text/canvas areas or click the green button to manually save drawings and notes instantly."
                },
                {
                    title: "Drag & Drop Images",
                    desc: "Drag and drop any image file from your computer or paste from clipboard (Ctrl+V) directly into the Notebook drawing area or the Quick Note body."
                },
                {
                    title: "Voice Note Dictation",
                    desc: "Click the microphone (🎙️) icon in the Quick Note popup to automatically dictate your speech into text."
                },
                {
                    title: "All Day & Weekly Plans",
                    desc: "Toggle 'All Day' in Agenda plans to keep important reminders at the top, or double-click weekly routine cells to add date-specific plans."
                },
                {
                    title: "Board Card Resize",
                    desc: "Resize post-it cards on the Board by dragging their bottom-right corner. Card dimensions are automatically saved to the database."
                },
                {
                    title: "Image Size & Deletion",
                    desc: "Right-click any image in a Post-it card to toggle between mini preview or full view, and double-click to remove it entirely."
                },
                {
                    title: "Finance Currency Converter",
                    desc: "Record expenses in foreign currencies; they will automatically convert to TL based on live forex exchange rates."
                },
                {
                    title: "Recurring Expenses",
                    desc: "Set up monthly recurring template transactions for regular payments like rent or bills to auto-inject them at the start of each month."
                },
                {
                    title: "Notebook Page Gridlines",
                    desc: "Toggle between grid, lined, dotted, or blank templates using the 'Guide Grid' dropdown menu inside the Notebook."
                },
                {
                    title: "Post-it Export to Notebook",
                    desc: "Press <strong>Cmd + S</strong> (or <strong>Ctrl + S</strong>) inside a Post-it card or the Quick Note editor to export its content as a new page in the Notebook."
                },
                {
                    title: "Advanced Word Export",
                    desc: "Export your Notebook to a Word document (.doc) with custom page scopes (all, current page, or page ranges) and empty page filtering."
                },
                {
                    title: "Data Backup & Restore",
                    desc: "Use the backup icon in the navigation bar to export all your Logbook data into a single <strong>.json</strong> file or restore from a previous backup."
                },
                {
                    title: "Kanban Task Reminders",
                    desc: "Configure due dates/times on your Kanban tasks and receive native desktop push notifications when the deadline arrives."
                }
            ];

            carouselItems.forEach((item, idx) => {
                const trans = tipTranslations[idx];
                if (trans) {
                    const h4 = item.querySelector('h4');
                    const p = item.querySelector('p');
                    if (h4) h4.innerText = trans.title;
                    if (p) p.innerHTML = trans.desc;
                }
            });
        }
    }

    // --- SPOTLIGHT SEARCH ENGINE (Command/Ctrl + K) ---
    function initSpotlight() {
        if (document.getElementById('spotlight-search-modal')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #spotlight-search-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 999999;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
                font-family: 'Outfit', sans-serif;
            }
            .spotlight-container {
                width: 580px;
                max-width: 90vw;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.4);
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                color: #1e293b;
            }
            body.dark-theme .spotlight-container,
            body.theme-dark .spotlight-container,
            body.dark .spotlight-container {
                background: rgba(30, 41, 59, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #f1f5f9;
            }
            .spotlight-header {
                display: flex;
                align-items: center;
                padding: 14px 18px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            }
            body.dark-theme .spotlight-header,
            body.theme-dark .spotlight-header,
            body.dark .spotlight-header {
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .spotlight-input {
                flex-grow: 1;
                background: transparent;
                border: none;
                outline: none;
                font-size: 16px;
                color: inherit;
                font-family: inherit;
            }
            .spotlight-input::placeholder {
                color: #94a3b8;
            }
            .spotlight-results {
                max-height: 320px;
                overflow-y: auto;
                padding: 8px;
            }
            .spotlight-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                user-select: none;
                font-size: 13px;
                transition: background 0.15s ease;
            }
            .spotlight-item:hover, .spotlight-item.active {
                background: rgba(59, 130, 246, 0.12);
                color: #3b82f6;
            }
            .spotlight-item-badge {
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 4px;
                background: #f1f5f9;
                color: #64748b;
            }
            body.dark-theme .spotlight-item-badge,
            body.theme-dark .spotlight-item-badge,
            body.dark .spotlight-item-badge {
                background: #334155;
                color: #94a3b8;
            }
            .spotlight-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 18px;
                font-size: 11px;
                color: #64748b;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
            }
            body.dark-theme .spotlight-footer,
            body.theme-dark .spotlight-footer,
            body.dark .spotlight-footer {
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                color: #94a3b8;
            }
            .spotlight-kbs {
                display: flex;
                gap: 6px;
            }
            .spotlight-kb {
                background: rgba(0,0,0,0.05);
                padding: 2px 4px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 10px;
            }
            body.dark-theme .spotlight-kb,
            body.theme-dark .spotlight-kb,
            body.dark .spotlight-kb {
                background: rgba(255,255,255,0.05);
            }
        `;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.id = 'spotlight-search-modal';
        modal.style.display = 'none';

        const activeLang = localStorage.getItem('hub_lang') || 'tr';
        const isEn = activeLang === 'en';

        modal.innerHTML = `
            <div class="spotlight-container">
                <div class="spotlight-header">
                    <span style="font-size: 18px; margin-right: 10px;">🔍</span>
                    <input type="text" class="spotlight-input" placeholder="${isEn ? 'Search files, notes, tasks...' : 'Not, görev veya sayfaları arayın...'}" autofocus>
                </div>
                <div class="spotlight-results"></div>
                <div class="spotlight-footer">
                    <span>${isEn ? 'Use Arrow keys to navigate, Enter to open' : 'Yön tuşları ile seçin, Enter ile açın'}</span>
                    <div class="spotlight-kbs">
                        <span class="spotlight-kb">ESC</span> ${isEn ? 'to close' : 'kapat'}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector('.spotlight-input');
        const resultsContainer = modal.querySelector('.spotlight-results');

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSpotlight();
            }
        });

        input.addEventListener('input', () => {
            renderResults(input.value.trim());
        });

        input.addEventListener('keydown', (e) => {
            const items = Array.from(resultsContainer.querySelectorAll('.spotlight-item'));
            const activeIndex = items.findIndex(item => item.classList.contains('active'));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length === 0) return;
                if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                const nextIndex = (activeIndex + 1) % items.length;
                items[nextIndex].classList.add('active');
                items[nextIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length === 0) return;
                if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                const prevIndex = (activeIndex - 1 + items.length) % items.length;
                items[prevIndex].classList.add('active');
                items[prevIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = resultsContainer.querySelector('.spotlight-item.active');
                if (activeItem) {
                    activeItem.click();
                }
            } else if (e.key === 'Escape') {
                closeSpotlight();
            }
        });
    }

    function parseSafeJSON(str, fallback = []) {
        try {
            return JSON.parse(str) || fallback;
        } catch(e) {
            return fallback;
        }
    }

    function searchAllData(query) {
        const results = [];
        const q = query.toLowerCase();
        const activeLang = localStorage.getItem('hub_lang') || 'tr';
        const isEn = activeLang === 'en';

        // 1. Defter (Notebook Pages)
        const defterSayfalar = parseSafeJSON(localStorage.getItem('hub_defter_sayfalar'), []);
        defterSayfalar.forEach((sayfa, index) => {
            const title = sayfa.baslik || '';
            const content = sayfa.icerik || '';
            if (title.toLowerCase().includes(q) || content.toLowerCase().includes(q)) {
                results.push({
                    type: 'defter',
                    badge: isEn ? 'Notebook' : 'Defter',
                    title: title || (isEn ? `Page ${index + 1}` : `Sayfa ${index + 1}`),
                    desc: content.replace(/<[^>]*>/g, ' ').substring(0, 60) + '...',
                    action: () => {
                        localStorage.setItem('hub_defter_aktif_sayfa_index', index);
                        navigateToModule('defter');
                    }
                });
            }
        });

        // 2. Pano (Post-its)
        const panoVerileri = parseSafeJSON(localStorage.getItem('hub_pano_v2'), { workspaces: {} });
        const workspaces = panoVerileri.workspaces || {};
        Object.keys(workspaces).forEach(wsKey => {
            const cards = workspaces[wsKey] || [];
            cards.forEach(card => {
                const text = card.text || '';
                if (text.toLowerCase().includes(q)) {
                    results.push({
                        type: 'pano',
                        badge: isEn ? 'Post-it' : 'Pano',
                        title: text.replace(/<[^>]*>/g, ' ').substring(0, 30) || (isEn ? 'Sticky Note' : 'Yapışkan Not'),
                        desc: text.replace(/<[^>]*>/g, ' ').substring(0, 60) + '...',
                        action: () => {
                            navigateToModule('pano');
                        }
                    });
                }
            });
        });

        // 3. Yapılacaklar (Kanban Board)
        const todoData = parseSafeJSON(localStorage.getItem('hub_todo_hub_v2'), {});
        Object.keys(todoData).forEach(listName => {
            const listData = todoData[listName] || {};
            ['todo', 'progress', 'done'].forEach(columnKey => {
                const cards = listData[columnKey] || [];
                cards.forEach(card => {
                    const cardTitle = typeof card === 'string' ? card : (card.title || card.text || '');
                    const cardDesc = card.desc || '';
                    if (cardTitle.toLowerCase().includes(q) || cardDesc.toLowerCase().includes(q) || listName.toLowerCase().includes(q)) {
                        results.push({
                            type: 'todo',
                            badge: isEn ? 'To-Do' : 'Yapılacaklar',
                            title: cardTitle,
                            desc: `${isEn ? 'List' : 'Liste'}: ${listName} | ${columnKey.toUpperCase()} ${cardDesc ? '| ' + cardDesc.substring(0, 30) : ''}`,
                            action: () => {
                                navigateToModule('todo');
                            }
                        });
                    }
                });
            });
        });

        // 4. Ajanda (Calendar)
        const ajandaVerisi = parseSafeJSON(localStorage.getItem('hub_merkezi_ajanda_verisi'), {});
        Object.keys(ajandaVerisi).forEach(dateStr => {
            const dayData = ajandaVerisi[dateStr] || {};
            const items = Array.isArray(dayData) ? dayData : (dayData.items || []);
            items.forEach(event => {
                const note = event.note || '';
                if (note.toLowerCase().includes(q)) {
                    results.push({
                        type: 'ajanda',
                        badge: isEn ? 'Calendar' : 'Ajanda',
                        title: note.substring(0, 30),
                        desc: `${dateStr} | ${note}`,
                        action: () => {
                            navigateToModule('ajanda');
                        }
                    });
                }
            });
        });

        // 5. Finans (Finance Ledger)
        const finansVerisi = parseSafeJSON(localStorage.getItem('hub_harcama_zaman_listesi'), []);
        finansVerisi.forEach(transaction => {
            const desc = transaction.ad || '';
            const cat = transaction.kategori || '';
            const miktar = transaction.miktar || '';
            const birim = transaction.kur || 'TL';
            if (desc.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) {
                results.push({
                    type: 'finans',
                    badge: isEn ? 'Finance' : 'Finans',
                    title: `${miktar} ${birim} - ${desc}`,
                    desc: `${isEn ? 'Category' : 'Kategori'}: ${cat} | ${transaction.donem || ''}`,
                    action: () => {
                        navigateToModule('finans');
                    }
                });
            }
        });

        return results.slice(0, 10);
    }

    function navigateToModule(moduleName) {
        const loc = window.location.pathname;
        let prefix = '../';
        if (loc.endsWith('index.html') || loc.endsWith('/') || (!loc.includes('/defter/') && !loc.includes('/pano/') && !loc.includes('/todo/') && !loc.includes('/ajanda/') && !loc.includes('/finans/') && !loc.includes('/uzanti/'))) {
            prefix = './';
        }
        closeSpotlight();
        
        if (moduleName === 'index') {
            window.location.href = prefix + 'index.html';
        } else {
            window.location.href = prefix + moduleName + '/' + moduleName + '.html';
        }
    }

    function renderResults(query) {
        const resultsContainer = document.querySelector('.spotlight-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';
        if (!query) {
            resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">${localStorage.getItem('hub_lang') === 'en' ? 'Type something to search...' : 'Aramak için yazmaya başlayın...'}</div>`;
            return;
        }

        const matches = searchAllData(query);
        if (matches.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">${localStorage.getItem('hub_lang') === 'en' ? 'No results found.' : 'Sonuç bulunamadı.'}</div>`;
            return;
        }

        matches.forEach((match, idx) => {
            const item = document.createElement('div');
            item.className = 'spotlight-item';
            if (idx === 0) item.classList.add('active');

            item.innerHTML = `
                <span class="spotlight-item-badge">${match.badge}</span>
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <span style="font-weight: bold;">${match.title}</span>
                    <span style="font-size: 11px; opacity: 0.75; margin-top: 2px;">${match.desc}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                match.action();
            });

            resultsContainer.appendChild(item);
        });
    }

    function openSpotlight() {
        initSpotlight();
        const modal = document.getElementById('spotlight-search-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = modal.querySelector('.spotlight-input');
            if (input) {
                input.value = '';
                input.focus();
            }
            renderResults('');
        }
    }

    function closeSpotlight() {
        const modal = document.getElementById('spotlight-search-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function openBackupRestoreModal() {
        let modal = document.getElementById('global-backup-modal');
        const isEn = localStorage.getItem('hub_lang') === 'en';
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'global-backup-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 20000; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
            
            modal.innerHTML = `
                <div style="background: var(--bg-card, #ffffff); padding: 25px; border-radius: 12px; max-width: 450px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid var(--border-color, #cbd5e1); color: var(--text-color, #1e293b);">
                    <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; font-weight: bold; border-bottom: 1px solid var(--border-color, #cbd5e1); padding-bottom: 10px; color: var(--text-color, #1e293b);">
                        ${isEn ? '💾 Data Backup & Restore' : '💾 Veri Yedekleme & Geri Yükleme'}
                    </h3>
                    <p style="font-size: 13px; opacity: 0.8; margin-bottom: 20px; line-height: 1.5; color: var(--text-color, #475569);">
                        ${isEn ? 'You can back up all your sticky notes, checklist tasks, calendar events, notebook pages, and financial data into a single file, or restore them from an existing backup.' : 'Tüm post-it notlarınızı, yapılacak görevlerinizi, ajanda planlarınızı, defter sayfalarınızı ve finans kayıtlarınızı tek bir dosyada yedekleyebilir veya yedekten geri yükleyebilirsiniz.'}
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                        <!-- Backup -->
                        <div style="background: rgba(59, 130, 246, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-size: 13px; font-weight: 600; color: var(--text-color, #1e293b);">${isEn ? 'Create Backup' : 'Yedek Dosyası Al'}</span>
                            <button id="backup-download-btn" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                ${isEn ? 'Download .json' : 'Yedek İndir (.json)'}
                            </button>
                        </div>
                        
                        <!-- Restore -->
                        <div style="background: rgba(16, 185, 129, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.15); display: flex; flex-direction: column; gap: 10px;">
                            <span style="font-size: 13px; font-weight: 600; color: var(--text-color, #1e293b);">${isEn ? 'Restore from Backup' : 'Yedekten Geri Yükle'}</span>
                            <input type="file" id="backup-upload-file" accept=".json" style="font-size: 12px; border: 1px dashed var(--border-color, #cbd5e1); padding: 8px; border-radius: 6px; background: transparent; color: var(--text-color, #334155); width: 100%; box-sizing: border-box;">
                            <button id="backup-restore-confirm-btn" style="background: #10b981; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; width: 100%;">
                                ${isEn ? 'Upload & Restore Data' : 'Yedekten Yükle ve Uygula'}
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color, #cbd5e1); padding-top: 15px;">
                        <button id="backup-modal-close-btn" style="background: transparent; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-color, #475569); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            ${isEn ? 'Close' : 'Kapat'}
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Bind functions inside modal
            const closeBtn = document.getElementById('backup-modal-close-btn');
            closeBtn.onclick = () => { modal.style.display = 'none'; };
            
            const downloadBtn = document.getElementById('backup-download-btn');
            downloadBtn.onclick = () => {
                const backupData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('hub_')) {
                        backupData[key] = localStorage.getItem(key);
                    }
                }
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const date = new Date().toISOString().split('T')[0];
                a.href = url;
                a.download = `Logbook_Yedek_${date}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
            
            const restoreBtn = document.getElementById('backup-restore-confirm-btn');
            const fileInput = document.getElementById('backup-upload-file');
            restoreBtn.onclick = () => {
                const file = fileInput.files[0];
                if (!file) {
                    alert(isEn ? 'Please choose a backup file first!' : 'Lütfen önce bir yedek dosyası seçin!');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (typeof data !== 'object' || Array.isArray(data)) {
                            throw new Error('Invalid format');
                        }
                        
                        const keys = Object.keys(data);
                        const valid = keys.every(k => k.startsWith('hub_'));
                        if (!valid || keys.length === 0) {
                            alert(isEn ? 'Invalid backup file content!' : 'Geçersiz yedek dosyası içeriği!');
                            return;
                        }
                        
                        if (confirm(isEn ? 'This will overwrite all existing local data. Are you sure you want to proceed?' : 'Bu işlem mevcut tüm verilerinizi yedek verileriyle değiştirecektir. Devam etmek istediğinize emin misiniz?')) {
                            // Clear existing hub keys
                            const toRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const k = localStorage.key(i);
                                if (k && k.startsWith('hub_')) toRemove.push(k);
                            }
                            toRemove.forEach(k => localStorage.removeItem(k));
                            
                            // Set new keys and dispatch sync events
                            keys.forEach(k => {
                                localStorage.setItem(k, data[k]);
                                document.dispatchEvent(new CustomEvent('page_sync_update', {
                                    detail: { key: k, value: data[k] }
                                }));
                            });
                            
                            alert(isEn ? 'Restore complete! Reloading the page...' : 'Geri yükleme tamamlandı! Sayfa yenileniyor...');
                            location.reload();
                        }
                    } catch(err) {
                        alert(isEn ? 'Failed to parse JSON file!' : 'Dosya okunamadı veya geçersiz JSON formatı!');
                    }
                };
                reader.readAsText(file);
            };
        } else {
            modal.style.display = 'flex';
            const fileInput = document.getElementById('backup-upload-file');
            if (fileInput) fileInput.value = "";
        }
    }

    function initBackupRestore() {
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (toggleBtn && toggleBtn.parentElement) {
            if (document.getElementById('backup-restore-btn')) return;
            
            const backupBtn = document.createElement('button');
            backupBtn.id = 'backup-restore-btn';
            backupBtn.className = 'dark-mode-btn';
            const isEn = localStorage.getItem('hub_lang') === 'en';
            backupBtn.title = isEn ? 'Backup & Restore' : 'Yedekle & Geri Yükle';
            backupBtn.style.fontSize = '16px';
            backupBtn.innerText = '💾';
            
            toggleBtn.parentElement.insertBefore(backupBtn, toggleBtn);
            backupBtn.onclick = () => {
                openBackupRestoreModal();
            };
        }
    }

    function openFullExtensionTab(pagePath) {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
            const targetUrl = chrome.runtime.getURL(pagePath);
            chrome.tabs.query({}, (tabs) => {
                const extensionTab = tabs.find(t => t.url && t.url.startsWith(chrome.runtime.getURL('')) && !t.url.includes('/uzanti/'));
                if (extensionTab) {
                    chrome.tabs.update(extensionTab.id, { url: targetUrl, active: true });
                    chrome.windows.update(extensionTab.windowId, { focused: true });
                } else {
                    chrome.tabs.create({ url: targetUrl });
                }
            });
        } else {
            window.open('../' + pagePath, '_blank');
        }
    }
    window.openFullExtensionTab = openFullExtensionTab;

    function initExtensionTabOpeners() {
        const isEn = localStorage.getItem('hub_lang') === 'en';
        
        // 1. If running inside widget pages (popup-widget-mode)
        if (document.body.classList.contains('popup-widget-mode')) {
            if (document.querySelector('.popup-open-tab-btn')) return;
            
            const openBtn = document.createElement('button');
            openBtn.className = 'popup-open-tab-btn';
            openBtn.innerHTML = '↗️';
            openBtn.title = isEn ? 'Open in Full Tab' : 'Tam Ekranda Aç';
            openBtn.onclick = (e) => {
                if (e) e.preventDefault();
                let targetPage = 'index.html';
                const path = window.location.pathname;
                if (path.includes('widget_todo.html')) targetPage = 'todo/todo.html';
                else if (path.includes('widget_ajanda.html')) targetPage = 'ajanda/ajanda.html';
                else if (path.includes('widget_finans.html')) targetPage = 'finans/finans.html';
                else if (path.includes('widget_defter.html')) targetPage = 'defter/defter.html';
                
                openFullExtensionTab(targetPage);
            };
            document.body.appendChild(openBtn);
        }
        
        // 2. If running inside quick note standalone window (page-stickynote)
        if (document.body.classList.contains('page-stickynote')) {
            const footerActions = document.querySelector('.footer-actions');
            if (footerActions && !document.getElementById('btn-dashboard')) {
                const dashBtn = document.createElement('button');
                dashBtn.className = 'action-btn';
                dashBtn.id = 'btn-dashboard';
                dashBtn.innerHTML = '🏠';
                dashBtn.title = isEn ? 'Open Dashboard' : 'Kontrol Panelini Aç';
                dashBtn.onclick = (e) => {
                    if (e) e.preventDefault();
                    openFullExtensionTab('index.html');
                };
                footerActions.insertBefore(dashBtn, footerActions.firstChild);
            }
        }
    }

    function getSelectionCoords() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0).cloneRange();
            let rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                const span = document.createElement('span');
                span.innerHTML = '&#8203;';
                range.insertNode(span);
                rect = span.getBoundingClientRect();
                span.parentNode.removeChild(span);
            }
            return rect;
        }
        return null;
    }

    function enableAutoCapitalize(editor) {
        if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') return;
        
        let isAutocorrecting = false;
        let lastWord = "";
        let originalWord = "";
        let targetNode = null;
        let targetStartPos = 0;
        
        // Create/retrieve tooltip element
        let tooltip = document.getElementById('autocorrect-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'autocorrect-tooltip';
            document.body.appendChild(tooltip);
            
            // Add style sheet
            const style = document.createElement('style');
            style.innerHTML = `
                #autocorrect-tooltip {
                    position: absolute;
                    background: #18181b;
                    color: #f4f4f5;
                    font-family: 'Outfit', sans-serif;
                    font-size: 13px;
                    padding: 5px 10px;
                    border-radius: 20px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                    display: none;
                    align-items: center;
                    gap: 8px;
                    z-index: 1000000;
                    border: 1px solid #27272a;
                    pointer-events: auto;
                }
                .autocorrect-close-btn {
                    color: #a1a1aa;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-left: 1px solid #27272a;
                    padding-left: 8px;
                    transition: color 0.15s;
                }
                .autocorrect-close-btn:hover {
                    color: #ef4444;
                }
            `;
            document.head.appendChild(style);
        }

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                tooltip.style.display = 'none';
            }
        });
        
        // Hide tooltip if user clicks elsewhere
        document.addEventListener('click', (e) => {
            if (tooltip && !tooltip.contains(e.target) && e.target !== editor) {
                tooltip.style.display = 'none';
            }
        });

        editor.addEventListener('input', (e) => {
            if (isAutocorrecting) return;

            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const node = range.startContainer;

            if (node.nodeType !== Node.TEXT_NODE) {
                tooltip.style.display = 'none';
                return;
            }

            const text = node.data;
            const offset = range.startOffset;
            const textBeforeCursor = text.substring(0, offset);

            // Autocorrect dictionaries
            const trAutocorrectMap = {
                "herkez": "herkes",
                "yalnış": "yanlış",
                "yannış": "yanlış",
                "yanlız": "yalnız",
                "şuan": "şu an",
                "birşey": "bir şey",
                "herşey": "her şey",
                "hicbir": "hiçbir",
                "cünki": "çünkü",
                "cünkü": "çünkü",
                "tabiki": "tabii ki",
                "bircok": "birçok",
                "yada": "ya da",
                "pantalon": "pantolon",
                "orjinal": "orijinal",
                "malesef": "maalesef",
                "şarz": "şarj",
                "süpriz": "sürpriz",
                "egzoz": "egzoz",
                "traş": "tıraş",
                "silahşör": "silahşor",
                "aferim": "aferin",
                "acenta": "acente",
                "aliminyum": "alüminyum",
                "dinazor": "dinozor",
                "entellektüel": "entelektüel",
                "hıristiyan": "hristiyan",
                "ıstırap": "ıstırap",
                "iddaa": "iddia",
                "insiyatif": "inisiyatif",
                "karnıbahar": "karnabahar",
                "makina": "makine",
                "meyva": "meyve",
                "mütahit": "müteahhit",
                "nisbet": "nispet",
                "pohaça": "poğaça",
                "poaça": "poğaça",
                "restorant": "restoran",
                "sarmısak": "sarımsak",
                "sezeryan": "sezaryen",
                "stajer": "stajyer",
                "şöför": "şoför",
                "tesbih": "tespih",
                "ünvan": "unvan",
                "vejeteryan": "vejetaryen",
                "zerafet": "zarafet",
                "klavuz": "kılavuz",
                "kıravat": "kravat",
                "labaratuvar": "laboratuvar",
                "muhattap": "muhatap",
                "tisort": "tişört",
                "tşört": "tişört",
                "birkac": "birkaç",
                "herhangibir": "herhangi bir"
            };

            const enAutocorrectMap = {
                "teh": "the",
                "dont": "don't",
                "cant": "can't",
                "im": "I'm",
                "wont": "won't",
                "recieve": "receive",
                "seperate": "separate",
                "shoudl": "should",
                "abotu": "about",
                "definately": "definitely",
                "goverment": "government",
                "occurance": "occurrence",
                "truely": "truly",
                "untill": "until",
                "wierd": "weird",
                "alot": "a lot",
                "couldve": "could've",
                "wouldve": "would've",
                "shouldve": "should've",
                "doesnt": "doesn't",
                "didnt": "didn't",
                "isnt": "isn't",
                "arent": "aren't",
                "wasnt": "wasn't",
                "werent": "weren't",
                "hasnt": "hasn't",
                "havent": "haven't",
                "hadnt": "hadn't"
            };

            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            const autocorrectMap = activeLang === 'en' ? enAutocorrectMap : trAutocorrectMap;

            // 1. Check if a word was just completed (followed by space or punctuation)
            const completedWordMatch = textBeforeCursor.match(/([a-zA-ZçğıöşüÇĞİÖŞÜ]+)([\s,.:;!?])$/);
            if (completedWordMatch) {
                const word = completedWordMatch[1];
                const delimiter = completedWordMatch[2];
                const wordIndex = completedWordMatch.index;
                const lowercaseWord = word.toLowerCase();

                if (autocorrectMap.hasOwnProperty(lowercaseWord)) {
                    let corrected = autocorrectMap[lowercaseWord];
                    // Keep original capitalization structure if first char is uppercase
                    if (word.charAt(0) === word.charAt(0).toUpperCase() && word.charAt(0) !== word.charAt(0).toLowerCase()) {
                        corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
                    }

                    isAutocorrecting = true;
                    originalWord = word;
                    targetNode = node;
                    targetStartPos = wordIndex;

                    const startPos = wordIndex;
                    const endPos = wordIndex + word.length;
                    const newData = text.substring(0, startPos) + corrected + text.substring(endPos);
                    node.data = newData;

                    // Restore cursor after corrected word and space/punctuation
                    const newRange = document.createRange();
                    newRange.setStart(node, startPos + corrected.length + delimiter.length);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    isAutocorrecting = false;

                    // Show tooltip
                    tooltip.innerHTML = `
                        <span style="font-weight: 500;">${corrected}</span>
                        <span class="autocorrect-close-btn" title="${activeLang === 'en' ? 'Undo' : 'Geri Al'}">×</span>
                    `;

                    const rect = getSelectionCoords();
                    if (rect) {
                        tooltip.style.display = 'flex';
                        tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
                        tooltip.style.left = `${rect.left + window.scrollX - 10}px`;
                    }

                    const closeBtn = tooltip.querySelector('.autocorrect-close-btn');
                    closeBtn.onclick = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (targetNode && targetNode.data) {
                            isAutocorrecting = true;
                            const currentText = targetNode.data;
                            if (currentText.substring(targetStartPos, targetStartPos + corrected.length) === corrected) {
                                const restoredData = currentText.substring(0, targetStartPos) + originalWord + currentText.substring(targetStartPos + corrected.length);
                                targetNode.data = restoredData;

                                const restoreSel = window.getSelection();
                                const restoreRange = document.createRange();
                                restoreRange.setStart(targetNode, targetStartPos + originalWord.length + delimiter.length);
                                restoreRange.collapse(true);
                                restoreSel.removeAllRanges();
                                restoreSel.addRange(restoreRange);
                            }
                            isAutocorrecting = false;
                        }
                        tooltip.style.display = 'none';
                    };
                    return;
                }
            }

            // 2. Check if currently typing a word at start of sentence/line (Auto-capitalization)
            const lastWordMatch = textBeforeCursor.match(/([a-zA-ZçğıöşüÇĞİÖŞÜ]+)$/);
            if (!lastWordMatch) {
                tooltip.style.display = 'none';
                return;
            }

            const word = lastWordMatch[1];
            const wordIndex = lastWordMatch.index;
            const beforeWord = textBeforeCursor.substring(0, wordIndex);

            const isStartOfSentence = beforeWord.trim() === "" || /[.!?]\s*$/.test(beforeWord);

            if (isStartOfSentence && word.length > 0) {
                const firstChar = word.charAt(0);
                if (firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase()) {
                    isAutocorrecting = true;
                    
                    const capitalized = firstChar.toUpperCase() + word.slice(1);
                    originalWord = word;
                    targetNode = node;
                    targetStartPos = wordIndex;

                    const startPos = wordIndex;
                    const endPos = wordIndex + word.length;
                    const newData = text.substring(0, startPos) + capitalized + text.substring(endPos);
                    
                    node.data = newData;

                    const newRange = document.createRange();
                    newRange.setStart(node, startPos + capitalized.length);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    isAutocorrecting = false;

                    tooltip.innerHTML = `
                        <span style="font-weight: 500;">${capitalized}</span>
                        <span class="autocorrect-close-btn" title="${activeLang === 'en' ? 'Undo' : 'Geri Al'}">×</span>
                    `;

                    const rect = getSelectionCoords();
                    if (rect) {
                        tooltip.style.display = 'flex';
                        tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
                        tooltip.style.left = `${rect.left + window.scrollX - 10}px`;
                    }

                    const closeBtn = tooltip.querySelector('.autocorrect-close-btn');
                    closeBtn.onclick = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        
                        if (targetNode && targetNode.data) {
                            isAutocorrecting = true;
                            const currentText = targetNode.data;
                            if (currentText.substring(targetStartPos, targetStartPos + capitalized.length) === capitalized) {
                                const restoredData = currentText.substring(0, targetStartPos) + originalWord + currentText.substring(targetStartPos + capitalized.length);
                                targetNode.data = restoredData;

                                const restoreSel = window.getSelection();
                                const restoreRange = document.createRange();
                                restoreRange.setStart(targetNode, targetStartPos + originalWord.length);
                                restoreRange.collapse(true);
                                restoreSel.removeAllRanges();
                                restoreSel.addRange(restoreRange);
                            }
                            isAutocorrecting = false;
                        }
                        tooltip.style.display = 'none';
                    };
                }
            } else {
                tooltip.style.display = 'none';
            }
        });
    }

    function initAutoCapitalize() {
        const postitText = document.getElementById('postit-text');
        if (postitText) {
            enableAutoCapitalize(postitText);
        }
        const anaDefter = document.getElementById('ana-defter');
        if (anaDefter) {
            enableAutoCapitalize(anaDefter);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initBackupRestore();
            initExtensionTabOpeners();
            initAutoCapitalize();
        });
    } else {
        initBackupRestore();
        initExtensionTabOpeners();
        initAutoCapitalize();
    }

    // Keydown listener to toggle spotlight
    window.addEventListener('keydown', (e) => {
        const isK = e.key === 'k' || e.key === 'K';
        const isModifier = e.metaKey || e.ctrlKey;
        if (isModifier && isK) {
            e.preventDefault();
            const modal = document.getElementById('spotlight-search-modal');
            if (modal && modal.style.display === 'flex') {
                closeSpotlight();
            } else {
                openSpotlight();
            }
        }
    });
})();
