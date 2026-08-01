// --- LOGBOOK GLOBAL FLOATING POST-IT NOTES ENGINE (CONTENT SCRIPT) ---

(function() {
    let selfSettingStorage = false;

    function loadNotes(callback) {
        chrome.storage.local.get(['hub_global_desktop_notes'], (result) => {
            let notes = [];
            try {
                if (result.hub_global_desktop_notes) {
                    notes = JSON.parse(result.hub_global_desktop_notes);
                }
            } catch (e) {
                console.error("Error loading notes:", e);
            }
            callback(notes || []);
        });
    }

    function saveNotes(notes, callback) {
        selfSettingStorage = true;
        chrome.storage.local.set({ 'hub_global_desktop_notes': JSON.stringify(notes) }, () => {
            setTimeout(() => { selfSettingStorage = false; }, 100);
            if (callback) callback();
        });
    }

    function isDarkMode(callback) {
        chrome.storage.local.get(['hub_dark_mode'], (result) => {
            callback(result.hub_dark_mode === 'aktif');
        });
    }

    function showToast(message) {
        let container = document.getElementById('global-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-toast-container';
            container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.style.cssText = "background: #1e293b; color: #f8fafc; padding: 12px 24px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); font-size: 14px; font-weight: bold; border-left: 4px solid #3b82f6; opacity: 0; transform: translateY(-20px); transition: opacity 0.3s, transform 0.3s; pointer-events: auto; max-width: 300px; box-sizing: border-box;";
        
        isDarkMode((dark) => {
            if (!dark) {
                toast.style.background = "#fff";
                toast.style.color = "#1e293b";
                toast.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.15)";
            }
            
            toast.innerText = message;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = "1";
                toast.style.transform = "translateY(0)";
            }, 10);
            
            setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transform = "translateY(-10px)";
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        });
    }

    function createNoteElement(note, dark) {
        const el = document.createElement('div');
        el.className = 'floating-postit';
        if (dark) {
            el.classList.add('dark-theme');
        }
        if (note.isMinimized) {
            el.classList.add('postit-minimized');
        }
        el.id = `global-postit-${note.id}`;
        el.style.left = `${note.x}px`;
        el.style.top = `${note.y}px`;

        if (note.color) {
            el.style.backgroundColor = note.color;
            el.style.borderColor = note.color;
        }

        // Inner elements
        el.innerHTML = `
            <div class="postit-header">
                <span class="postit-title">Masaüstü Notu</span>
                <div class="postit-controls">
                    <button class="postit-btn btn-min" title="Küçült/Büyüt">_</button>
                    <button class="postit-btn btn-pin" title="Deftere Ekle">📝</button>
                    <button class="postit-btn btn-todo" title="Göreve Dönüştür">✔️</button>
                    <button class="postit-btn btn-fin" title="Harcamaya Dönüştür">💰</button>
                    <button class="postit-btn btn-close" title="Kapat">×</button>
                </div>
            </div>
            <div class="postit-body">
                <div class="postit-body-content">
                    <textarea class="postit-textarea" placeholder="Buraya yazın...">${note.text || ''}</textarea>
                    ${note.imageSrc ? `<img class="postit-img" src="${note.imageSrc}" title="Resmi kaldırmak için çift tıklayın">` : ''}
                </div>
            </div>
            <div class="postit-dropzone"></div>
        `;

        // Elements
        const header = el.querySelector('.postit-header');
        const textarea = el.querySelector('.postit-textarea');
        
        if (note.color) {
            if (note.color === '#0f172a' || note.color === '#1e293b') {
                el.style.color = '#cbd5e1';
                if (textarea) textarea.style.color = '#cbd5e1';
            } else {
                el.style.color = '#0f172a';
                if (textarea) textarea.style.color = '#0f172a';
            }
        }

        const btnMin = el.querySelector('.btn-min');
        const btnPin = el.querySelector('.btn-pin');
        const btnTodo = el.querySelector('.btn-todo');
        const btnFin = el.querySelector('.btn-fin');
        const btnClose = el.querySelector('.btn-close');

        // Dragging handler
        makeDraggable(el, header, note.id);

        // Dropzone image handler
        makeDropzone(el, note.id);

        // Textarea changes
        textarea.addEventListener('input', (e) => {
            loadNotes((notes) => {
                const n = notes.find(x => x.id === note.id);
                if (n) {
                    n.text = e.target.value;
                    saveNotes(notes);
                }
            });
        });

        // Double click image to delete
        el.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('postit-img')) {
                if (confirm("Bu görseli nottan kaldırmak istiyor musunuz?")) {
                    loadNotes((notes) => {
                        const n = notes.find(x => x.id === note.id);
                        if (n) {
                            n.imageSrc = '';
                            saveNotes(notes);
                        }
                        e.target.remove();
                        showToast("Görsel kaldırıldı.");
                    });
                }
            }
        });

        // Minimize action
        btnMin.onclick = (e) => {
            e.stopPropagation();
            toggleMinimize(note.id);
        };

        // Pin to Notebook
        btnPin.onclick = (e) => {
            e.stopPropagation();
            pinToNotebook(textarea.value);
        };

        // Convert to Todo
        btnTodo.onclick = (e) => {
            e.stopPropagation();
            convertToTodo(textarea.value);
        };

        // Convert to Finance
        btnFin.onclick = (e) => {
            e.stopPropagation();
            convertToFinance(textarea.value);
        };

        // Close action
        btnClose.onclick = (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        };

        // Restoring when minimized and clicking the card
        el.onclick = () => {
            if (document.body.classList.contains('mission-control-active')) {
                exitMissionControl(note.id);
            } else if (el.classList.contains('postit-minimized')) {
                toggleMinimize(note.id);
            }
        };

        return el;
    }

    function toggleMinimize(noteId) {
        loadNotes((notes) => {
            const n = notes.find(x => x.id === noteId);
            if (n) {
                n.isMinimized = !n.isMinimized;
                saveNotes(notes, renderAllNotes);
            }
        });
    }

    function deleteNote(noteId) {
        if (confirm("Bu notu silmek istediğinize emin misiniz?")) {
            loadNotes((notes) => {
                const updated = notes.filter(x => x.id !== noteId);
                saveNotes(updated, () => {
                    renderAllNotes();
                    showToast("Not silindi.");
                });
            });
        }
    }

    function pinToNotebook(text) {
        if (!text.trim()) {
            alert("Boş not deftere eklenemez.");
            return;
        }
        chrome.storage.local.get(['hub_defter_aktif_sayfa_index', 'hub_defter_sayfalar'], (result) => {
            const activeIdx = parseInt(result.hub_defter_aktif_sayfa_index || '0');
            let defterSayfalari = [];
            try {
                if (result.hub_defter_sayfalar) {
                    defterSayfalari = JSON.parse(result.hub_defter_sayfalar);
                }
            } catch(e) {}
            
            if (defterSayfalari.length === 0) {
                defterSayfalari = [{ metin: "", cizim: "" }];
            }
            
            const targetIdx = activeIdx < defterSayfalari.length ? activeIdx : 0;
            const appendText = `\n\n--- [İliştirilen Masaüstü Notu] ---\n${text}\n`;
            defterSayfalari[targetIdx].metin = (defterSayfalari[targetIdx].metin || "") + appendText;
            
            chrome.storage.local.set({
                'hub_defter_sayfalar': JSON.stringify(defterSayfalari),
                'hub_defter': defterSayfalari[targetIdx].metin
            }, () => {
                showToast("Not, defter sayfasına iliştirildi! 📝");
            });
        });
    }

    function convertToTodo(text) {
        if (!text.trim()) {
            alert("Boş görev eklenemez.");
            return;
        }
        chrome.storage.local.get(['hub_todo_hub_v2'], (result) => {
            let todoVerileri = { "Genel Görevler": { "todo": [], "progress": [], "done": [] } };
            try {
                if (result.hub_todo_hub_v2) {
                    todoVerileri = JSON.parse(result.hub_todo_hub_v2);
                }
            } catch(e) {}
            
            const listName = Object.keys(todoVerileri)[0] || "Genel Görevler";
            if (!todoVerileri[listName]) {
                todoVerileri[listName] = { "todo": [], "progress": [], "done": [] };
            }
            
            const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            todoVerileri[listName]["todo"].push({ id: newId, txt: text });
            
            chrome.storage.local.set({
                'hub_todo_hub_v2': JSON.stringify(todoVerileri)
            }, () => {
                showToast("Görev, yapılacaklar listesine eklendi! ✔️");
            });
        });
    }

    function convertToFinance(text) {
        if (!text.trim()) {
            alert("Harcama açıklaması boş olamaz.");
            return;
        }
        const miktarVal = prompt("Harcama Tutarı girin (Örn: 150):");
        if (miktarVal === null) return;
        const miktar = parseFloat(miktarVal);
        if (isNaN(miktar) || miktar <= 0) {
            alert("Lütfen geçerli bir miktar girin.");
            return;
        }

        const kurVal = prompt("Para Birimi girin (TL, USD, EUR, PLN, ALTIN):", "TL");
        if (kurVal === null) return;
        const kur = kurVal.trim().toUpperCase() || "TL";

        const adVal = prompt("Açıklama:", text.substring(0, 50));
        if (adVal === null) return;
        const ad = adVal.trim() || text.substring(0, 50);

        const kategoriVal = prompt("Kategori seçin (Market, Ulaşım, Eğlence, Eğitim, Sağlık, Faturalar, Diğer):", "Diğer");
        if (kategoriVal === null) return;
        const kategori = kategoriVal.trim() || "Diğer";

        const simdi = new Date();
        const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const otonomDonem = `${aylar[simdi.getMonth()]} ${simdi.getFullYear()}`;
        const gunIsimleriUzun = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

        const yeniHarcama = {
            id: Date.now(),
            ad: ad,
            miktar: miktar,
            kur: kur,
            kategori: kategori,
            donem: otonomDonem,
            hafta: Math.ceil(simdi.getDate() / 7).toString(),
            run: gunIsimleriUzun[simdi.getDay()]
        };

        chrome.storage.local.get(['hub_harcama_zaman_listesi'], (result) => {
            let harcamaListesi = [];
            try {
                if (result.hub_harcama_zaman_listesi) {
                    harcamaListesi = JSON.parse(result.hub_harcama_zaman_listesi);
                }
            } catch(e) {}
            
            harcamaListesi.push(yeniHarcama);
            chrome.storage.local.set({
                'hub_harcama_zaman_listesi': JSON.stringify(harcamaListesi)
            }, () => {
                showToast("Harcama başarıyla eklendi! 💰");
            });
        });
    }

    function makeDraggable(element, handle, noteId) {
        let startX = 0, startY = 0;
        let initialX = 0, initialY = 0;
        let isDragging = false;

        handle.addEventListener('pointerdown', (e) => {
            if (document.body.classList.contains('mission-control-active')) return;
            if (element.classList.contains('postit-minimized')) return;
            if (e.target.closest('.postit-btn')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left) || 100;
            initialY = parseInt(element.style.top) || 100;
            handle.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newX = initialX + dx;
            let newY = initialY + dy;

            newX = Math.max(0, Math.min(window.innerWidth - 150, newX));
            newY = Math.max(0, Math.min(window.innerHeight - 50, newY));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        handle.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            handle.releasePointerCapture(e.pointerId);

            loadNotes((notes) => {
                const note = notes.find(n => n.id === noteId);
                if (note) {
                    note.x = parseInt(element.style.left) || 100;
                    note.y = parseInt(element.style.top) || 100;
                    saveNotes(notes);
                }
            });
        });
    }

    function makeDropzone(element, noteId) {
        element.addEventListener('dragover', (e) => {
            if (element.classList.contains('postit-minimized')) return;
            e.preventDefault();
            element.classList.add('drag-hover');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-hover');
        });

        element.addEventListener('drop', (e) => {
            if (element.classList.contains('postit-minimized')) return;
            e.preventDefault();
            element.classList.remove('drag-hover');

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const dataUrl = event.target.result;
                        loadNotes((notes) => {
                            const note = notes.find(n => n.id === noteId);
                            if (note) {
                                note.imageSrc = dataUrl;
                                saveNotes(notes);
                            }
                            
                            const bodyContent = element.querySelector('.postit-body-content');
                            if (bodyContent) {
                                let img = bodyContent.querySelector('.postit-img');
                                if (!img) {
                                    img = document.createElement('img');
                                    img.className = 'postit-img';
                                    img.title = "Resmi kaldırmak için çift tıklayın";
                                    bodyContent.appendChild(img);
                                }
                                img.src = dataUrl;
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    function renderAllNotes() {
        // Prevent execution on iframe or sandboxed components
        if (window.self !== window.top) return;

        let container = document.querySelector('.global-floating-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'global-floating-container';
            document.body.appendChild(container);
        }

        let miniZone = document.querySelector('.postit-minimized-zone');
        if (!miniZone) {
            miniZone = document.createElement('div');
            miniZone.className = 'postit-minimized-zone';
            document.body.appendChild(miniZone);
        }

        let mcOverlay = document.querySelector('.mission-control-overlay');
        if (!mcOverlay) {
            mcOverlay = document.createElement('div');
            mcOverlay.className = 'mission-control-overlay';
            document.body.appendChild(mcOverlay);
            mcOverlay.onclick = () => exitMissionControl();
        }

        let addBtn = document.querySelector('.global-add-note-btn');
        if (!addBtn) {
            addBtn = document.createElement('button');
            addBtn.className = 'global-add-note-btn';
            addBtn.innerText = '+';
            addBtn.title = "Yeni Masaüstü Notu Ekle";
            addBtn.onclick = () => {
                loadNotes((notes) => {
                    const newNote = {
                        id: Date.now(),
                        text: "",
                        imageSrc: "",
                        x: Math.max(50, Math.floor(Math.random() * (window.innerWidth - 300))),
                        y: Math.max(50, Math.floor(Math.random() * (window.innerHeight - 300))),
                        isMinimized: false,
                        color: "#fef08a"
                    };
                    notes.push(newNote);
                    saveNotes(notes, renderAllNotes);
                });
            };
            document.body.appendChild(addBtn);
        }

        // Apply dark mode styling initially
        isDarkMode((dark) => {
            if (dark) {
                container.classList.add('dark-theme');
                miniZone.classList.add('dark-theme');
                addBtn.classList.add('dark-theme');
            } else {
                container.classList.remove('dark-theme');
                miniZone.classList.remove('dark-theme');
                addBtn.classList.remove('dark-theme');
            }

            // Filter out existing notes to redraw cleanly
            const existingNotes = document.querySelectorAll('.floating-postit');
            existingNotes.forEach(el => el.remove());

            loadNotes((notes) => {
                notes.forEach(note => {
                    const noteEl = createNoteElement(note, dark);
                    if (note.isMinimized) {
                        miniZone.appendChild(noteEl);
                    } else {
                        container.appendChild(noteEl);
                    }
                });
            });
        });
    }

    // Mission Control Functions
    function toggleMissionControl() {
        const active = document.body.classList.toggle('mission-control-active');
        if (active) {
            enterMissionControl();
        } else {
            exitMissionControl();
        }
    }

    function enterMissionControl() {
        const noteElements = document.querySelectorAll('.floating-postit');
        if (noteElements.length === 0) {
            document.body.classList.remove('mission-control-active');
            return;
        }

        const N = noteElements.length;
        const cols = Math.ceil(Math.sqrt(N));
        const rows = Math.ceil(N / cols);
        const thumbW = 160;
        const thumbH = 160;
        const gap = 20;

        const gridW = cols * thumbW + (cols - 1) * gap;
        const gridH = rows * thumbH + (rows - 1) * gap;

        const startX = (window.innerWidth - gridW) / 2;
        const startY = (window.innerHeight - gridH) / 2;

        noteElements.forEach((el, index) => {
            el.classList.add('postit-thumbnail');

            const r = Math.floor(index / cols);
            const c = index % cols;

            const targetLeft = startX + c * (thumbW + gap);
            const targetTop = startY + r * (thumbH + gap);

            if (!el.dataset.origLeft) {
                el.dataset.origLeft = el.style.left || '100px';
                el.dataset.origTop = el.style.top || '100px';
                el.dataset.origWidth = el.style.width || '250px';
                el.dataset.origHeight = el.style.height || '250px';
            }

            el.style.left = `${targetLeft}px`;
            el.style.top = `${targetTop}px`;
            el.style.width = `${thumbW}px`;
            el.style.height = `${thumbH}px`;
        });
    }

    function exitMissionControl(restoreAndMaximizeNoteId) {
        document.body.classList.remove('mission-control-active');
        
        if (restoreAndMaximizeNoteId) {
            loadNotes((notes) => {
                const n = notes.find(x => x.id === restoreAndMaximizeNoteId);
                if (n && n.isMinimized) {
                    n.isMinimized = false;
                    saveNotes(notes, () => restoreLayout(restoreAndMaximizeNoteId));
                } else {
                    restoreLayout();
                }
            });
        } else {
            restoreLayout();
        }
    }

    function restoreLayout() {
        const noteElements = document.querySelectorAll('.floating-postit');
        noteElements.forEach((el) => {
            el.classList.remove('postit-thumbnail');
            if (el.dataset.origLeft) {
                el.style.left = el.dataset.origLeft;
                el.style.top = el.dataset.origTop;
                el.style.width = el.dataset.origWidth;
                el.style.height = el.dataset.origHeight;
                
                delete el.dataset.origLeft;
                delete el.dataset.origTop;
                delete el.dataset.origWidth;
                delete el.dataset.origHeight;
            }
        });

        setTimeout(renderAllNotes, 300);
    }

    // Double escape listener
    let lastEscTime = 0;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const currentTime = Date.now();
            if (currentTime - lastEscTime < 300) {
                toggleMissionControl();
                e.preventDefault();
            }
            lastEscTime = currentTime;
        }
    });

    // Initialize rendering on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderAllNotes);
    } else {
        renderAllNotes();
    }

    // Storage change listener
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.hub_global_desktop_notes && !selfSettingStorage) {
                renderAllNotes();
            }
            if (changes.hub_dark_mode) {
                const isDark = changes.hub_dark_mode.newValue === 'aktif';
                const container = document.querySelector('.global-floating-container');
                const miniZone = document.querySelector('.postit-minimized-zone');
                const addBtn = document.querySelector('.global-add-note-btn');
                const notes = document.querySelectorAll('.floating-postit');
                
                [container, miniZone, addBtn, ...notes].forEach(el => {
                    if (el) {
                        if (isDark) el.classList.add('dark-theme');
                        else el.classList.remove('dark-theme');
                    }
                });
            }
        }
    });
})();
