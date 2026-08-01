document.addEventListener('DOMContentLoaded', () => {
    function startDesktopNote() {
        const activeLang = localStorage.getItem('hub_lang') || 'tr';
        const textarea = document.getElementById('postit-text');
        const saveStatus = document.getElementById('save-status');
        const btnTodo = document.getElementById('btn-todo');
        const btnAjanda = document.getElementById('btn-ajanda');
        const btnFin = document.getElementById('btn-fin');
        const btnClear = document.getElementById('btn-clear');
        const colorDots = document.querySelectorAll('.color-dot');

        let sessionNoteId = localStorage.getItem('hub_sticky_session_id');
        
        let panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
        try {
            const rawPano = localStorage.getItem('hub_pano_v2');
            if (rawPano) panoDeposu = JSON.parse(rawPano);
        } catch (err) {}

        function recoverNotesIfMissing(depo) {
            if (!depo || typeof depo !== 'object') {
                depo = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
            }
            if (!depo.workspaces) depo.workspaces = { "Genel": [] };
            let active = depo.aktifWorkspace || "Genel";
            if (!depo.workspaces[active]) depo.workspaces[active] = [];

            if (depo.workspaces[active].length === 0) {
                for (let ws in depo.workspaces) {
                    if (Array.isArray(depo.workspaces[ws]) && depo.workspaces[ws].length > 0) {
                        depo.aktifWorkspace = ws;
                        localStorage.setItem('hub_pano_v2', JSON.stringify(depo));
                        return depo;
                    }
                }
                try {
                    const rawLegacy = localStorage.getItem('hub_pano');
                    if (rawLegacy) {
                        const legacyArr = JSON.parse(rawLegacy);
                        if (Array.isArray(legacyArr) && legacyArr.length > 0) {
                            depo.workspaces["Genel"] = legacyArr;
                            depo.aktifWorkspace = "Genel";
                            localStorage.setItem('hub_pano_v2', JSON.stringify(depo));
                            return depo;
                        }
                    }
                } catch(e){}

                try {
                    const rawGlobal = localStorage.getItem('hub_global_desktop_notes');
                    if (rawGlobal) {
                        const globalArr = JSON.parse(rawGlobal);
                        if (Array.isArray(globalArr) && globalArr.length > 0) {
                            depo.workspaces["Genel"] = globalArr;
                            depo.aktifWorkspace = "Genel";
                            localStorage.setItem('hub_pano_v2', JSON.stringify(depo));
                            return depo;
                        }
                    }
                } catch(e){}

                const draftText = localStorage.getItem('hub_sticky_text');
                if (draftText && draftText.trim().length > 0 && draftText !== "<br>") {
                    const recCard = {
                        id: Date.now().toString(),
                        metin: draftText,
                        top: "100px",
                        left: "100px",
                        renk: "#ffeaa7",
                        w: "220px",
                        h: "220px",
                        resim: ""
                    };
                    depo.workspaces["Genel"].push(recCard);
                    depo.aktifWorkspace = "Genel";
                    localStorage.setItem('hub_sticky_session_id', recCard.id);
                    localStorage.setItem('hub_pano_v2', JSON.stringify(depo));
                    return depo;
                }
            }
            return depo;
        }

        panoDeposu = recoverNotesIfMissing(panoDeposu);
        const activeWS = panoDeposu.aktifWorkspace || "Genel";

        let existingNote = null;
        if (sessionNoteId) {
            existingNote = panoDeposu.workspaces[activeWS].find(n => n.id && n.id.toString() === sessionNoteId.toString());
        }

        if (!existingNote) {
            if (panoDeposu.workspaces[activeWS].length > 0) {
                existingNote = panoDeposu.workspaces[activeWS][panoDeposu.workspaces[activeWS].length - 1];
                sessionNoteId = existingNote.id.toString();
                localStorage.setItem('hub_sticky_session_id', sessionNoteId);
            } else {
                sessionNoteId = Date.now().toString();
                localStorage.setItem('hub_sticky_session_id', sessionNoteId);
            }
        }

        const savedText = existingNote ? existingNote.metin : (localStorage.getItem('hub_sticky_text') || "");

        if (textarea) {
            textarea.innerHTML = savedText;
            localStorage.setItem('hub_sticky_text', savedText);
        }

    function extractNoteTitle(html, defaultTitle) {
        if (!html) return defaultTitle;
        let text = html.replace(/&nbsp;/gi, ' ')
                       .replace(/\u00a0/g, ' ')
                       .replace(/<br\s*\/?>/gi, '\n')
                       .replace(/<\/div>/gi, '\n')
                       .replace(/<\/p>/gi, '\n')
                       .replace(/<[^>]+>/g, '');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
            let firstLine = lines[0];
            if (firstLine.length > 18) {
                return firstLine.substring(0, 18) + "...";
            }
            return firstLine;
        }
        return defaultTitle;
    }

    function populatePageSelect() {
        const select = document.getElementById('select-note-page');
        if (!select) return;
        
        select.innerHTML = "";
        
        let localPano = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
        try {
            const rawPano = localStorage.getItem('hub_pano_v2');
            if (rawPano) localPano = JSON.parse(rawPano);
        } catch (err) {}
        
        const activeWS = localPano.aktifWorkspace || "Genel";
        if (!localPano.workspaces[activeWS]) localPano.workspaces[activeWS] = [];
        const activeNotes = localPano.workspaces[activeWS];
        
        activeNotes.forEach((note, idx) => {
            const opt = document.createElement('option');
            opt.value = note.id;
            
            const defaultTitle = activeLang === 'en' ? `Note #${idx + 1}` : `Not #${idx + 1}`;
            opt.textContent = extractNoteTitle(note.metin, defaultTitle);
            
            if (note.id.toString() === sessionNoteId.toString()) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    const selectPage = document.getElementById('select-note-page');
    const btnAddPage = document.getElementById('btn-add-note-page');
    
    if (btnAddPage) {
        btnAddPage.title = activeLang === 'en' ? 'Add New Note Page' : 'Yeni Not Sayfası Ekle';
        btnAddPage.onclick = () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
            }
            saveAsNewNoteOnBoard();

            window.isSwitchingPage = true;
            setTimeout(() => { window.isSwitchingPage = false; }, 400);

            const newId = Date.now().toString();
            sessionNoteId = newId;
            localStorage.setItem('hub_sticky_session_id', sessionNoteId);
            
            textarea.innerHTML = "";
            localStorage.setItem('hub_sticky_text', "");
            
            const defaultTheme = "theme-yellow";
            document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
            document.body.classList.add(defaultTheme);
            localStorage.setItem('hub_sticky_theme', defaultTheme);
            
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_sticky_session_id', value: sessionNoteId }
            }));
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_sticky_theme', value: defaultTheme }
            }));
            
            saveAsNewNoteOnBoard();
            populatePageSelect();
            textarea.focus();
        };
    }
    
    if (selectPage) {
        populatePageSelect();
        selectPage.onchange = () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
            }
            saveAsNewNoteOnBoard();

            window.isSwitchingPage = true;
            setTimeout(() => { window.isSwitchingPage = false; }, 400);

            const selectedId = selectPage.value;
            sessionNoteId = selectedId;
            localStorage.setItem('hub_sticky_session_id', sessionNoteId);
            
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_sticky_session_id', value: sessionNoteId }
            }));
            
            let latestPano = { workspaces: {} };
            try {
                latestPano = JSON.parse(localStorage.getItem('hub_pano_v2') || '{}');
            } catch(e){}
            const activeWS = latestPano.aktifWorkspace || "Genel";
            const note = latestPano.workspaces[activeWS]?.find(n => n.id.toString() === sessionNoteId.toString());
            if (note) {
                textarea.innerHTML = note.metin || "";
                localStorage.setItem('hub_sticky_text', note.metin || "");
                
                let theme = "theme-yellow";
                if (note.renk === "#55efc4") theme = "theme-green";
                else if (note.renk === "#ff7675") theme = "theme-pink";
                else if (note.renk === "#74b9ff") theme = "theme-blue";
                else if (note.renk === "#2d3436") theme = "theme-dark";
                
                document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
                document.body.classList.add(theme);
                localStorage.setItem('hub_sticky_theme', theme);
                
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_sticky_theme', value: theme }
                }));
            }
        };
    }

    const btnDeletePage = document.getElementById('btn-delete-note-page');
    if (btnDeletePage) {
        btnDeletePage.title = activeLang === 'en' ? 'Delete This Note Page' : 'Bu Sayfayı Sil';
        
        let deleteConfirmActive = false;
        btnDeletePage.onclick = () => {
            if (!deleteConfirmActive) {
                deleteConfirmActive = true;
                btnDeletePage.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                btnDeletePage.style.borderColor = '#ef4444';
                saveStatus.style.color = '#ef4444';
                saveStatus.innerText = activeLang === 'en'
                    ? "Click delete again to confirm"
                    : "Silmek için tekrar tıklayın";
                setTimeout(() => {
                    deleteConfirmActive = false;
                    btnDeletePage.style.backgroundColor = '';
                    btnDeletePage.style.borderColor = '';
                    saveStatus.style.color = '';
                    saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
                }, 3000);
                return;
            }
            
            deleteConfirmActive = false;
            btnDeletePage.style.backgroundColor = '';
            btnDeletePage.style.borderColor = '';
            saveStatus.style.color = '';

            let panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
            try {
                const rawPano = localStorage.getItem('hub_pano_v2');
                if (rawPano) panoDeposu = JSON.parse(rawPano);
            } catch (err) {}
            const activeWS = panoDeposu.aktifWorkspace || "Genel";
            
            let remainingNotes = [];
            if (panoDeposu.workspaces[activeWS]) {
                panoDeposu.workspaces[activeWS] = panoDeposu.workspaces[activeWS].filter(n => n.id.toString() !== sessionNoteId.toString());
                remainingNotes = panoDeposu.workspaces[activeWS];
                localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
                
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_pano_v2', value: JSON.stringify(panoDeposu) }
                }));
            }

            textarea.innerHTML = '';
            localStorage.removeItem('hub_sticky_text');
            localStorage.removeItem('hub_sticky_image');
            localStorage.removeItem('hub_sticky_image_align');
            localStorage.removeItem('hub_sticky_image_size');
            localStorage.removeItem('hub_sticky_image_x');
            localStorage.removeItem('hub_sticky_image_y');
            const imgUpload = document.getElementById('postit-img-upload');
            if (imgUpload) imgUpload.value = '';

            if (remainingNotes.length > 0) {
                const nextNote = remainingNotes[0];
                sessionNoteId = nextNote.id.toString();
                localStorage.setItem('hub_sticky_session_id', sessionNoteId);
                
                textarea.innerHTML = nextNote.metin || '';
                localStorage.setItem('hub_sticky_text', nextNote.metin || '');
                
                let theme = "theme-yellow";
                if (nextNote.renk === "#55efc4") theme = "theme-green";
                else if (nextNote.renk === "#ff7675") theme = "theme-pink";
                else if (nextNote.renk === "#74b9ff") theme = "theme-blue";
                else if (nextNote.renk === "#2d3436") theme = "theme-dark";
                
                document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
                document.body.classList.add(theme);
                localStorage.setItem('hub_sticky_theme', theme);
                
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_sticky_session_id', value: sessionNoteId }
                }));
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_sticky_theme', value: theme }
                }));
            } else {
                sessionNoteId = Date.now().toString();
                localStorage.setItem('hub_sticky_session_id', sessionNoteId);
                
                const defaultTheme = "theme-yellow";
                document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
                document.body.classList.add(defaultTheme);
                localStorage.setItem('hub_sticky_theme', defaultTheme);
                
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_sticky_session_id', value: sessionNoteId }
                }));
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_sticky_theme', value: defaultTheme }
                }));
                
                saveAsNewNoteOnBoard();
            }
            
            populatePageSelect();
            saveStatus.innerText = activeLang === 'en' ? 'Page Deleted' : 'Sayfa Silindi';
        };
    }

    let userTypingTimeout = null;

    document.addEventListener('extension_sync_update', (e) => {
        if (e.detail.key === 'hub_pano_v2' || e.detail.key === 'hub_sticky_session_id' || e.detail.key === 'hub_sticky_text') {
            populatePageSelect();
            
            let latestText = localStorage.getItem('hub_sticky_text') || "";
            if (textarea && textarea.innerHTML !== latestText && !window.isUserTyping) {
                textarea.innerHTML = latestText;
            }
            
            // If the active note's content was updated from another page, reload it in the textarea
            if (e.detail.key === 'hub_pano_v2' && !window.isSwitchingPage && !window.isUserTyping) {
                let latestPano = { workspaces: {} };
                try {
                    latestPano = JSON.parse(localStorage.getItem('hub_pano_v2') || '{}');
                } catch(err){}
                const activeWS = latestPano.aktifWorkspace || "Genel";
                const note = latestPano.workspaces[activeWS]?.find(n => n.id.toString() === sessionNoteId.toString());
                if (note && note.metin !== textarea.innerHTML) {
                    textarea.innerHTML = note.metin || "";
                    localStorage.setItem('hub_sticky_text', note.metin || "");
                }
            }
        }
    });

    // Migrate legacy single bottom image to inline HTML image
    const legacyImage = localStorage.getItem('hub_sticky_image');
    if (legacyImage && textarea) {
        if (!textarea.innerHTML.includes(legacyImage.substring(0, 50))) {
            const img = document.createElement('img');
            img.src = legacyImage;
            img.style.maxWidth = '100%';
            img.style.display = 'block';
            img.style.margin = '15px auto 0 auto';
            img.style.borderTop = '1px dashed var(--postit-border)';
            img.style.paddingTop = '10px';
            img.style.cursor = 'pointer';
            textarea.appendChild(img);
            localStorage.removeItem('hub_sticky_image');
            localStorage.setItem('hub_sticky_text', textarea.innerHTML);
        }
    }

    const savedTheme = localStorage.getItem('hub_sticky_theme');
    if (savedTheme) {
        document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
        document.body.classList.add(savedTheme);
    }

    const noteExists = panoDeposu.workspaces[activeWS].some(n => n.id.toString() === sessionNoteId.toString());
    if (!noteExists) {
        saveAsNewNoteOnBoard();
    }
    // Auto-save local draft as they type
    let saveTimeout = null;
    textarea.addEventListener('input', () => {
        window.isUserTyping = true;
        clearTimeout(userTypingTimeout);
        userTypingTimeout = setTimeout(() => { window.isUserTyping = false; }, 800);

        saveStatus.innerText = activeLang === 'en' ? 'Saving Draft...' : 'Taslak Kaydediliyor...';
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('hub_sticky_text', textarea.innerHTML);
            saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
            saveAsNewNoteOnBoard(); // Live sync to board!
            
            // Update the selected option text in the dropdown live!
            if (selectPage) {
                const selectOption = selectPage.querySelector(`option[value="${sessionNoteId}"]`);
                if (selectOption) {
                    const defaultTitle = activeLang === 'en' ? "Empty Note" : "Boş Not";
                    selectOption.textContent = extractNoteTitle(textarea.innerHTML, defaultTitle);
                }
            }
        }, 300);
    });

    window.addEventListener('pagehide', () => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
            saveAsNewNoteOnBoard();
        }
    });

    // Theme switching updates local theme AND updates the card's color on the board live
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.dataset.theme;
            document.body.classList.remove('theme-yellow', 'theme-green', 'theme-pink', 'theme-blue', 'theme-dark');
            document.body.classList.add(theme);
            localStorage.setItem('hub_sticky_theme', theme);
            saveStatus.innerText = activeLang === 'en' ? 'Theme Changed' : 'Tema Değiştirildi';

            let colorHex = "#ffeaa7";
            if (theme === "theme-green") colorHex = "#55efc4";
            else if (theme === "theme-pink") colorHex = "#ff7675";
            else if (theme === "theme-blue") colorHex = "#74b9ff";
            else if (theme === "theme-dark") colorHex = "#2d3436";

            let panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
            try {
                const rawPano = localStorage.getItem('hub_pano_v2');
                if (rawPano) panoDeposu = JSON.parse(rawPano);
            } catch (err) {}
            const activeWS = panoDeposu.aktifWorkspace || "Genel";
            if (panoDeposu.workspaces[activeWS]) {
                let existingNote = panoDeposu.workspaces[activeWS].find(n => n.id.toString() === sessionNoteId.toString());
                if (existingNote) {
                    existingNote.renk = colorHex;
                    localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
                }
            }
        });
    });

    // Explicitly update/save current draft to the pre-created card on the board
    function saveAsNewNoteOnBoard(e) {
        if (e) e.preventDefault();
        
        const textVal = textarea.innerHTML;

        let panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
        try {
            const rawPano = localStorage.getItem('hub_pano_v2');
            if (rawPano) panoDeposu = JSON.parse(rawPano);
        } catch (err) {}

        const activeWS = panoDeposu.aktifWorkspace || "Genel";
        if (!panoDeposu.workspaces[activeWS]) panoDeposu.workspaces[activeWS] = [];

        const theme = localStorage.getItem('hub_sticky_theme') || "theme-yellow";
        let colorHex = "#ffeaa7";
        if (theme === "theme-green") colorHex = "#55efc4";
        else if (theme === "theme-pink") colorHex = "#ff7675";
        else if (theme === "theme-blue") colorHex = "#74b9ff";
        else if (theme === "theme-dark") colorHex = "#2d3436";

        let existingNote = panoDeposu.workspaces[activeWS].find(n => n.id.toString() === sessionNoteId.toString());
        if (existingNote) {
            existingNote.metin = textVal;
            existingNote.resim = "";
            existingNote.renk = colorHex;
        } else {
            existingNote = {
                id: sessionNoteId,
                metin: textVal,
                top: `${Math.max(80, Math.floor(Math.random() * 300))}px`,
                left: `${Math.max(50, Math.floor(Math.random() * 500))}px`,
                renk: colorHex,
                w: "220px",
                h: "220px",
                resim: ""
            };
            panoDeposu.workspaces[activeWS].push(existingNote);
        }

        localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
        
        // Dispatch page sync update to notify background script/content script
        document.dispatchEvent(new CustomEvent('page_sync_update', {
            detail: { key: 'hub_pano_v2', value: JSON.stringify(panoDeposu) }
        }));
        
        saveStatus.innerText = activeLang === 'en' ? 'Synced to Board! 💾' : 'Panoya Aktarıldı! 💾';
        setTimeout(() => {
            saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
        }, 3000);
    }
    window.saveAsNewNoteOnBoard = saveAsNewNoteOnBoard;

    // Keyboard Shortcut (Cmd + S / Ctrl + S) - Saves the post-it content as a new page in Defter
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 's') {
            e.preventDefault();
            
            const textVal = textarea.innerHTML;
            if (!textVal || textVal.trim() === "" || textVal === "<br>") {
                alert(activeLang === 'en' ? "Cannot save an empty note to Notebook!" : "Boş bir not Deftere kaydedilemez!");
                return;
            }
            
            let defterSayfalari = [];
            try {
                const rawDefter = localStorage.getItem('hub_defter_sayfalar');
                if (rawDefter) {
                    defterSayfalari = JSON.parse(rawDefter);
                }
            } catch (err) {}
            
            if (!Array.isArray(defterSayfalari) || defterSayfalari.length === 0) {
                defterSayfalari = [{ metin: "", cizim: "" }];
            }
            
            const currentPostitId = sessionNoteId ? sessionNoteId.toString() : "";
            let existingPageIndex = defterSayfalari.findIndex(p => p.sourcePostitId === currentPostitId);
            let targetIndex;
            if (existingPageIndex !== -1) {
                defterSayfalari[existingPageIndex].metin = textVal;
                targetIndex = existingPageIndex;
            } else {
                const newPage = {
                    metin: textVal,
                    cizim: "",
                    sourcePostitId: currentPostitId
                };
                defterSayfalari.push(newPage);
                targetIndex = defterSayfalari.length - 1;
            }
            
            localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
            localStorage.setItem('hub_defter_aktif_sayfa_index', targetIndex.toString());
            
            // Dispatch page sync updates
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_defter_sayfalar', value: JSON.stringify(defterSayfalari) }
            }));
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_defter_aktif_sayfa_index', value: targetIndex.toString() }
            }));
            
            saveStatus.innerText = activeLang === 'en' ? 'Saved to Defter! 📓' : 'Deftere Kaydedildi! 📓';
            setTimeout(() => {
                saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
            }, 3000);
        }
    });

    let clearConfirmActive = false;
    btnClear.addEventListener('click', () => {
        if (!clearConfirmActive) {
            clearConfirmActive = true;
            saveStatus.style.color = '#ef4444';
            saveStatus.innerText = activeLang === 'en' 
                ? "Click again to clear text" 
                : "Metni temizlemek için tekrar tıklayın";
            setTimeout(() => {
                clearConfirmActive = false;
                saveStatus.style.color = '';
                saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
            }, 3000);
            return;
        }

        clearConfirmActive = false;
        saveStatus.style.color = '';

        textarea.innerHTML = '';
        localStorage.removeItem('hub_sticky_text');
        localStorage.removeItem('hub_sticky_image');
        localStorage.removeItem('hub_sticky_image_align');
        localStorage.removeItem('hub_sticky_image_size');
        localStorage.removeItem('hub_sticky_image_x');
        localStorage.removeItem('hub_sticky_image_y');
        const imgUpload = document.getElementById('postit-img-upload');
        if (imgUpload) imgUpload.value = '';

        saveAsNewNoteOnBoard();
        
        if (selectPage) {
            const selectOption = selectPage.querySelector(`option[value="${sessionNoteId}"]`);
            if (selectOption) {
                const defaultTitle = activeLang === 'en' ? "Empty Note" : "Boş Not";
                selectOption.textContent = defaultTitle;
            }
        }
        
        saveStatus.innerText = activeLang === 'en' ? 'Cleared' : 'Temizlendi';
    });

    // Action: Navigate to Yapılacaklar (✔️)
    btnTodo.addEventListener('click', () => {
        window.location.href = 'widget_todo.html';
    });

    // Action: Navigate to Ajanda (📅)
    if (btnAjanda) {
        btnAjanda.addEventListener('click', () => {
            window.location.href = 'widget_ajanda.html';
        });
    }

    // Action: Navigate to Finans (💰)
    btnFin.addEventListener('click', () => {
        window.location.href = 'widget_finans.html';
    });

    // --- Multimodal Voice & Image Additions ---
    const imgContainer = document.getElementById('postit-image-container');
    const imgUpload = document.getElementById('postit-img-upload');
    const menu = document.getElementById('image-context-menu');
    const postitBody = document.querySelector('.postit-body');

    if (imgContainer) imgContainer.style.display = 'none';

    function insertImageInEditor(dataUrl) {
        if (!textarea) return;
        textarea.focus();
        
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        img.style.borderRadius = '6px';
        img.style.cursor = 'pointer';
        
        const sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            if (textarea.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(img);
                range.setStartAfter(img);
                range.setEndAfter(img);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                textarea.appendChild(img);
            }
        } else {
            textarea.appendChild(img);
        }
        
        textarea.dispatchEvent(new Event('input'));
        
        saveStatus.innerText = activeLang === 'en' 
            ? 'Image inserted. Right-click to resize/align.' 
            : 'Görsel eklendi. Boyut/konum için sağ tıklayın.';
        setTimeout(() => {
            saveStatus.innerText = activeLang === 'en' ? 'Draft Saved' : 'Taslak Kaydedildi';
        }, 4000);
    }

    if (textarea) {
        textarea.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;
            
            const items = clipboardData.items;
            let hasImage = false;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    hasImage = true;
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        insertImageInEditor(event.target.result);
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
            
            if (!hasImage) {
                const text = clipboardData.getData('text/plain');
                if (text) {
                    e.preventDefault();
                    document.execCommand('insertText', false, text);
                }
            }
        });
    }

    if (imgUpload) {
        imgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                insertImageInEditor(event.target.result);
                imgUpload.value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    if (postitBody) {
        postitBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            postitBody.style.border = '2px dashed var(--postit-border)';
        });
        postitBody.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        postitBody.addEventListener('dragleave', () => {
            postitBody.style.border = 'none';
        });
        postitBody.addEventListener('drop', (e) => {
            e.preventDefault();
            postitBody.style.border = 'none';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    insertImageInEditor(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    let activeContextMenuImage = null;
    const textMenu = document.getElementById('text-context-menu');

    function showMenuSmartly(menuEl, clientX, clientY) {
        menuEl.style.display = 'block';
        const menuWidth = menuEl.offsetWidth || 145;
        const menuHeight = menuEl.offsetHeight || 250;
        
        let x = clientX;
        let y = clientY;
        
        // Smart vertical placement: If there is more space above, open upwards.
        if (y + menuHeight > window.innerHeight && y > menuHeight) {
            y = y - menuHeight;
        }
        
        // Boundaries safety cap
        x = Math.max(5, Math.min(x, window.innerWidth - menuWidth - 5));
        y = Math.max(5, Math.min(y, window.innerHeight - menuHeight - 5));
        
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
    }

    postitBody.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Close both first
        if (menu) menu.style.display = 'none';
        if (textMenu) textMenu.style.display = 'none';
        
        if (e.target.tagName === 'IMG') {
            activeContextMenuImage = e.target;
            if (menu) showMenuSmartly(menu, e.clientX, e.clientY);
        } else {
            if (textMenu) showMenuSmartly(textMenu, e.clientX, e.clientY);
        }
    });

    document.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
        if (textMenu) textMenu.style.display = 'none';
    });

    if (menu) {
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeContextMenuImage) return;
                
                const size = item.dataset.size;
                const align = item.dataset.align;
                const action = item.dataset.action;
                
                if (size) {
                    activeContextMenuImage.style.width = size;
                }
                if (action === 'custom-size') {
                    const manual = prompt(activeLang === 'en' 
                        ? "Enter image width (e.g. 250px or 50%):" 
                        : "Resim genişliğini girin (örn: 250px veya %50):", activeContextMenuImage.style.width || "300px");
                    if (manual && manual.trim() !== "") {
                        activeContextMenuImage.style.width = manual.trim();
                    }
                }
                if (align) {
                    if (align === 'block') {
                        activeContextMenuImage.style.display = 'block';
                        activeContextMenuImage.style.margin = '10px auto';
                        activeContextMenuImage.style.float = 'none';
                        activeContextMenuImage.style.borderTop = 'none';
                        activeContextMenuImage.style.paddingTop = '0';
                    } else if (align === 'inline') {
                        activeContextMenuImage.style.display = 'inline-block';
                        activeContextMenuImage.style.margin = '5px';
                        activeContextMenuImage.style.float = 'none';
                        activeContextMenuImage.style.borderTop = 'none';
                        activeContextMenuImage.style.paddingTop = '0';
                    } else if (align === 'left') {
                        activeContextMenuImage.style.display = 'block';
                        activeContextMenuImage.style.float = 'left';
                        activeContextMenuImage.style.margin = '10px 15px 10px 0';
                        activeContextMenuImage.style.borderTop = 'none';
                        activeContextMenuImage.style.paddingTop = '0';
                    } else if (align === 'right') {
                        activeContextMenuImage.style.display = 'block';
                        activeContextMenuImage.style.float = 'right';
                        activeContextMenuImage.style.margin = '10px 0 10px 15px';
                        activeContextMenuImage.style.borderTop = 'none';
                        activeContextMenuImage.style.paddingTop = '0';
                    } else if (align === 'bottom') {
                        textarea.appendChild(activeContextMenuImage);
                        activeContextMenuImage.style.display = 'block';
                        activeContextMenuImage.style.margin = '15px auto 0 auto';
                        activeContextMenuImage.style.float = 'none';
                        activeContextMenuImage.style.borderTop = '1px dashed var(--postit-border)';
                        activeContextMenuImage.style.paddingTop = '10px';
                    }
                }
                if (action === 'delete') {
                    if (confirm(activeLang === 'en' ? "Delete this image?" : "Bu resmi silmek istiyor musunuz?")) {
                        activeContextMenuImage.remove();
                    }
                }
                
                textarea.dispatchEvent(new Event('input'));
                menu.style.display = 'none';
            });
        });
    }

    function applySelectionStyle(styleName, styleValue) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;
        
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style[styleName] = styleValue;
        
        try {
            const contents = range.extractContents();
            
            // Clean up existing nested styles of the SAME type inside the selection
            const elements = contents.querySelectorAll('*');
            elements.forEach(el => {
                if (el.style) {
                    if (styleName === 'fontSize' && el.style.fontSize) {
                        el.style.fontSize = '';
                    } else if (styleName === 'fontFamily' && el.style.fontFamily) {
                        el.style.fontFamily = '';
                    } else if (styleName === 'color' && el.style.color) {
                        el.style.color = '';
                    }
                    
                    // If the element is a span and has no styles left, unwrap it
                    if (el.tagName === 'SPAN' && (!el.style.cssText || el.style.length === 0)) {
                        const parent = el.parentNode;
                        if (parent) {
                            while (el.firstChild) {
                                parent.insertBefore(el.firstChild, el);
                            }
                            el.remove();
                        }
                    }
                }
                if (styleName === 'fontSize' && el.tagName === 'FONT') {
                    el.removeAttribute('size');
                }
                if (styleName === 'fontFamily' && el.tagName === 'FONT') {
                    el.removeAttribute('face');
                }
            });
            
            span.appendChild(contents);
            range.insertNode(span);
        } catch (err) {
            document.execCommand('styleWithCSS', false, true);
            if (styleName === 'fontSize') {
                document.execCommand('fontSize', false, '4');
            } else if (styleName === 'fontFamily') {
                document.execCommand('fontName', false, styleValue);
            } else if (styleName === 'color') {
                document.execCommand('foreColor', false, styleValue);
            }
        }
        textarea.dispatchEvent(new Event('input'));
    }

    if (textMenu) {
        textMenu.querySelectorAll('.menu-item').forEach(item => {
            // Prevent selection loss on clicking context menu items
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const command = item.dataset.command;
                const value = item.dataset.value;
                
                if (command === 'font-size-percent') {
                    applySelectionStyle('fontSize', value);
                } else if (command === 'custom-font-size') {
                    const manual = prompt(activeLang === 'en'
                        ? "Enter font size in pixels (e.g. 12, 16, 24):"
                        : "Yazı boyutu piksel değerini girin (örn: 12, 16, 24):");
                    if (manual && !isNaN(manual)) {
                        applySelectionStyle('fontSize', `${manual}px`);
                    }
                } else if (command === 'custom-font-name') {
                    const manual = prompt(activeLang === 'en'
                        ? "Enter font family name (e.g. Arial, Tahoma, Georgia):"
                        : "Yazı tipi adını girin (örn: Arial, Tahoma, Georgia):");
                    if (manual && manual.trim() !== "") {
                        applySelectionStyle('fontFamily', manual.trim());
                    }
                } else if (command === 'custom-fore-color') {
                    const picker = document.getElementById('hidden-color-picker');
                    if (picker) {
                        picker.onchange = () => {
                            applySelectionStyle('color', picker.value);
                        };
                        picker.click();
                    }
                } else if (command) {
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand(command, false, value || null);
                    textarea.dispatchEvent(new Event('input'));
                }
                textMenu.style.display = 'none';
            });
        });
    }

    // -------------------------------------------------------------
    // Spellcheck (Yazım Denetimi - Kırmızı Çizgiler) Yönetimi
    // -------------------------------------------------------------
    let spellcheckEnabled = localStorage.getItem('hub_spellcheck_enabled') !== 'false';

    function applySpellcheckState(enabled) {
        spellcheckEnabled = enabled;
        localStorage.setItem('hub_spellcheck_enabled', enabled ? 'true' : 'false');
        
        if (textarea) {
            textarea.setAttribute('spellcheck', enabled ? 'true' : 'false');
        }

        const label = document.getElementById('spellcheck-status-label');
        if (label) {
            label.innerText = enabled ? (activeLang === 'en' ? 'ON' : 'Açık') : (activeLang === 'en' ? 'OFF' : 'Kapalı');
            label.style.color = enabled ? '#10b981' : '#ef4444';
        }

        const btnSpellcheck = document.getElementById('btn-spellcheck');
        if (btnSpellcheck) {
            btnSpellcheck.style.opacity = enabled ? '1' : '0.5';
            btnSpellcheck.title = enabled 
                ? (activeLang === 'en' ? 'Spellcheck: ON (Click to disable red lines)' : 'Yazım Denetimi: AÇIK (Kırmızı çizgileri kapatmak için tıkla)')
                : (activeLang === 'en' ? 'Spellcheck: OFF (Click to enable red lines)' : 'Yazım Denetimi: KAPALI (Kırmızı çizgileri açmak için tıkla)');
        }
    }

    applySpellcheckState(spellcheckEnabled);

    const btnSpellcheck = document.getElementById('btn-spellcheck');
    if (btnSpellcheck) {
        btnSpellcheck.addEventListener('click', (e) => {
            e.preventDefault();
            applySpellcheckState(!spellcheckEnabled);
        });
    }

    const btnToggleSpellcheck = document.getElementById('btn-toggle-spellcheck');
    if (btnToggleSpellcheck) {
        btnToggleSpellcheck.addEventListener('click', (e) => {
            e.preventDefault();
            applySpellcheckState(!spellcheckEnabled);
            const textMenu = document.getElementById('text-context-menu');
            if (textMenu) textMenu.style.display = 'none';
        });
    }

    // Voice Typing (Speech to Text)
    const btnVoice = document.getElementById('btn-voice');
    let recording = false;
    let rec = null;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRec && btnVoice) {
        rec = new SpeechRec();
        rec.lang = 'tr-TR';
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (textarea) {
                textarea.focus();
                const sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    if (textarea.contains(range.commonAncestorContainer)) {
                        range.deleteContents();
                        const textNode = document.createTextNode((range.startOffset > 0 ? " " : "") + transcript);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        textarea.innerHTML += (textarea.innerHTML.length > 0 ? " " : "") + transcript;
                    }
                } else {
                    textarea.innerHTML += (textarea.innerHTML.length > 0 ? " " : "") + transcript;
                }
                textarea.dispatchEvent(new Event('input'));
            }
        };

        rec.onerror = (err) => {
            console.error("Postit ses tanıma hatası:", err);
            btnVoice.innerText = "🎙️";
            recording = false;
        };

        rec.onend = () => {
            btnVoice.innerText = "🎙️";
            recording = false;
        };

        btnVoice.addEventListener('click', (e) => {
            e.preventDefault();
            if (recording) {
                rec.stop();
            } else {
                btnVoice.innerText = "🔴";
                recording = true;
                rec.start();
            }
        });
    }

    // Voice Memo (MediaRecorder) Capture
    const btnVoiceMemo = document.getElementById('btn-voice-memo');
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecordingMemo = false;
    let memoTimerInterval = null;
    let memoSeconds = 0;

    if (btnVoiceMemo) {
        btnVoiceMemo.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isRecordingMemo) {
                stopRecordingMemo();
            } else {
                startRecordingMemo();
            }
        });
    }

    async function startRecordingMemo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            
            let options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/ogg' };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = {};
            }

            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Data = reader.result;
                    insertAudioElement(base64Data);
                };
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecordingMemo = true;
            btnVoiceMemo.innerText = "🛑";
            btnVoiceMemo.classList.add('pulse-recording');
            
            memoSeconds = 0;
            const statusIndicator = document.getElementById('save-status');
            
            memoTimerInterval = setInterval(() => {
                memoSeconds++;
                if (statusIndicator) {
                    const activeLang = localStorage.getItem('hub_lang') || 'tr';
                    statusIndicator.innerText = activeLang === 'en' 
                        ? `Recording... (${memoSeconds}s / 30s)` 
                        : `Kayıt Yapılıyor... (${memoSeconds}sn / 30sn)`;
                }
                if (memoSeconds >= 30) {
                    stopRecordingMemo();
                }
            }, 1000);

        } catch (err) {
            console.warn("Microphone access denied or error:", err);
            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            alert(activeLang === 'en' 
                ? "Microphone access is required to record voice memos.\nIf the permission prompt didn't appear, please open the dashboard in a full tab and allow microphone access there." 
                : "Ses kaydı yapabilmek için mikrofon erişimine izin vermelisiniz.\nEğer izin penceresi açılmadıysa, lütfen uygulamayı ana sayfada (tam sekmede) açarak mikrofon iznini onaylayın.");
        }
    }

    function stopRecordingMemo() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecordingMemo = false;
        if (btnVoiceMemo) {
            btnVoiceMemo.innerText = "🎤";
            btnVoiceMemo.classList.remove('pulse-recording');
        }
        clearInterval(memoTimerInterval);
        const statusIndicator = document.getElementById('save-status');
        if (statusIndicator) {
            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            statusIndicator.innerText = activeLang === 'en' ? 'Saved' : 'Kaydedildi';
        }
    }

    function insertAudioElement(base64Data) {
        if (textarea) {
            textarea.focus();
            const audioHTML = `<br><audio controls src="${base64Data}" style="max-width:100%; margin: 8px 0; display: block;"></audio><br>`;
            
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (textarea.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    const div = document.createElement('div');
                    div.innerHTML = audioHTML;
                    const frag = document.createDocumentFragment();
                    let node, lastNode;
                    while ((node = div.firstChild)) {
                        lastNode = frag.appendChild(node);
                    }
                    range.insertNode(frag);
                    if (lastNode) {
                        range.setStartAfter(lastNode);
                        range.setEndAfter(lastNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                } else {
                    textarea.innerHTML += audioHTML;
                }
            } else {
                textarea.innerHTML += audioHTML;
            }
            textarea.dispatchEvent(new Event('input'));
        }
    }

    // -------------------------------------------------------------
    // Backup & Restore (Yedekle & Geri Yükle) Modülü
    // -------------------------------------------------------------
    const btnBackup = document.getElementById('btn-backup');
    const backupModal = document.getElementById('backup-modal');
    const btnCloseBackup = document.getElementById('btn-close-backup');
    const btnDoBackup = document.getElementById('btn-do-backup');
    const btnDoRestore = document.getElementById('btn-do-restore');
    const restoreFileInput = document.getElementById('restore-file-input');
    const backupTitle = document.getElementById('backup-title');
    const backupDesc = document.getElementById('backup-desc');

    // Language labels for backup modal
    if (activeLang === 'en') {
        if (backupTitle) backupTitle.innerText = "Backup & Restore";
        if (backupDesc) backupDesc.innerText = "Backup all Logbook data into a single file, or restore from a previous backup.";
        if (btnDoBackup) btnDoBackup.innerText = "📤 Export Data (Backup)";
        if (btnDoRestore) btnDoRestore.innerText = "📥 Import Data (Restore)";
        if (btnCloseBackup) btnCloseBackup.innerText = "Close";
    }

    if (btnBackup && backupModal) {
        btnBackup.addEventListener('click', () => {
            backupModal.style.display = 'flex';
        });
    }

    if (btnCloseBackup && backupModal) {
        btnCloseBackup.addEventListener('click', () => {
            backupModal.style.display = 'none';
        });
    }

    // Export Backup
    if (btnDoBackup) {
        btnDoBackup.addEventListener('click', () => {
            const sharedKeys = [
                'hub_sticky_text',
                'hub_sticky_theme',
                'hub_sticky_image',
                'hub_sticky_image_align',
                'hub_sticky_session_id',
                'hub_todo_list',
                'hub_todo_filter',
                'hub_todo_active_list',
                'hub_todo_workspace_lists',
                'hub_ajanda_etkinlikler',
                'hub_ajanda_tatil_modu',
                'hub_defter_sayfalar',
                'hub_defter_aktif_sayfa_index',
                'hub_finans_para_birimi',
                'hub_finans_gelirler',
                'hub_finans_giderler',
                'hub_finans_kategoriler',
                'hub_finans_limitler',
                'hub_pano_v2',
                'hub_lang'
            ];

            const backupData = {};
            sharedKeys.forEach(key => {
                const val = localStorage.getItem(key);
                if (val !== null) {
                    backupData[key] = val;
                }
            });

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `logbook_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            saveStatus.innerText = activeLang === 'en' ? 'Backup Downloaded' : 'Yedek İndirildi';
            backupModal.style.display = 'none';
        });
    }

    // Trigger Import Restore
    if (btnDoRestore && restoreFileInput) {
        btnDoRestore.addEventListener('click', () => {
            restoreFileInput.click();
        });
    }

    // Read and Apply Restore File
    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const restoredObj = JSON.parse(evt.target.result);
                    if (!restoredObj || typeof restoredObj !== 'object') {
                        throw new Error("Invalid format");
                    }

                    // Apply keys
                    Object.keys(restoredObj).forEach(key => {
                        localStorage.setItem(key, restoredObj[key]);
                        // Set standard custom event to sync with other pages
                        document.dispatchEvent(new CustomEvent('page_sync_update', {
                            detail: { key: key, value: restoredObj[key] }
                        }));
                    });

                    alert(activeLang === 'en' ? "Data restored successfully! Refreshing..." : "Veriler başarıyla geri yüklendi! Yenileniyor...");
                    window.location.reload();
                } catch (err) {
                    alert(activeLang === 'en' ? "Error: Invalid backup file!" : "Hata: Geçersiz yedek dosyası!");
                }
            };
            reader.readAsText(file);
        });
    }
    } // end startDesktopNote

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const sharedKeys = ['hub_global_desktop_notes', 'hub_defter_sayfalar', 'hub_defter', 'hub_defter_aktif_sayfa_index', 'hub_todo_hub_v2', 'hub_harcama_zaman_listesi', 'hub_dark_mode', 'hub_sticky_text', 'hub_sticky_theme', 'hub_sticky_image', 'hub_sticky_image_minimized', 'hub_sticky_image_align', 'hub_sticky_image_size', 'hub_sticky_image_x', 'hub_sticky_image_y', 'hub_merkezi_ajanda_verisi', 'hub_pano_v2', 'hub_lang', 'hub_sticky_session_id', 'hub_spellcheck_enabled', 'hub_pano'];
        chrome.storage.local.get(sharedKeys, (result) => {
            if (result) {
                for (let k in result) {
                    if (result[k] !== undefined) {
                        let val = result[k];
                        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                        localStorage.setItem(k, val);
                    }
                }
            }
            startDesktopNote();
        });
    } else {
        startDesktopNote();
    }
});
