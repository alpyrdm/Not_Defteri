let isCreatingWindow = false;

function triggerPopup() {
    if (isCreatingWindow) return;
    
    chrome.storage.local.get("noteWindowId", (result) => {
        const storedWindowId = result && result.noteWindowId;
        if (storedWindowId !== undefined && storedWindowId !== null) {
            chrome.windows.get(storedWindowId, (win) => {
                if (chrome.runtime.lastError || !win) {
                    createNewNoteWindow();
                } else {
                    chrome.windows.update(storedWindowId, { focused: true });
                }
            });
        } else {
            createNewNoteWindow();
        }
    });
}

chrome.action.onClicked.addListener(triggerPopup);

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-quick-note" || command === "_execute_action") {
        triggerPopup();
    }
});

function createNewNoteWindow() {
    isCreatingWindow = true;
    chrome.windows.create({
        url: 'uzanti/desktop_note.html',
        type: 'popup',
        width: 380,
        height: 480
    }, (win) => {
        isCreatingWindow = false;
        if (win) {
            chrome.storage.local.set({ noteWindowId: win.id });
        }
    });
}

// Clean up ID when window is closed
chrome.windows.onRemoved.addListener((windowId) => {
    chrome.storage.local.get("noteWindowId", (result) => {
        if (result && result.noteWindowId === windowId) {
            chrome.storage.local.remove("noteWindowId");
        }
    });
});

// 1. Context Menu (Sağ Tık Menüsü) - Seçilen Metni Hızlı Nota Gönder
function initializeContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.storage.local.get("hub_lang", (result) => {
            const isEn = result && result.hub_lang === 'en';
            chrome.contextMenus.create({
                id: "send-to-quick-note",
                title: isEn ? "Send to Logbook Quick Note" : "Logbook Hızlı Nota Gönder",
                contexts: ["selection"]
            }, () => {
                if (chrome.runtime.lastError) {
                    // Silently absorb duplicate registration warnings
                    const err = chrome.runtime.lastError.message;
                }
            });
        });
    });
}

// Run globally on load/activation
initializeContextMenu();

// Dynamic context menu language update
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.hub_lang) {
        initializeContextMenu();
    }
});

function convertUrlsToLinks(text) {
    if (!text) return "";
    // Regex for URLs starting with http://, https://, or www.
    const urlRegex = /(https?:\/\/[^\s<"']+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s<"']*)?)/gi;
    return text.replace(urlRegex, (url) => {
        // If it's part of an existing HTML attribute or tag, don't replace
        if (url.startsWith('<') || url.includes('href=')) return url;
        let href = url;
        if (!href.match(/^https?:\/\//i)) {
            href = 'https://' + href;
        }
        return `<a href="${href}" target="_blank" class="postit-link" title="${href}">${url}</a>`;
    });
}

function saveQuickNoteSelection(selectedText, selectedHtml, info, tab) {
    chrome.storage.local.get(["hub_sticky_text", "hub_sticky_session_id", "hub_pano_v2", "hub_sticky_theme"], (result) => {
        let currentText = result.hub_sticky_text || "";
        
        let formattedContent = "";
        if (selectedHtml && selectedHtml.trim() && (selectedHtml.includes('<a ') || selectedHtml.includes('href='))) {
            formattedContent = selectedHtml.trim();
        } else if (selectedText) {
            formattedContent = convertUrlsToLinks(selectedText.trim());
        }

        if (!formattedContent) return;

        // Build clickable page source badge if available
        let pageUrl = info.pageUrl || (tab && tab.url) || "";
        let pageTitle = (tab && tab.title) || "";
        let pageBadgeHtml = "";

        if (pageUrl && !pageUrl.startsWith('chrome://') && !pageUrl.startsWith('chrome-extension://')) {
            let cleanTitle = pageTitle ? pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Kaynak Bağlantı";
            if (cleanTitle.length > 28) cleanTitle = cleanTitle.substring(0, 28) + "...";
            pageBadgeHtml = `<br><a href="${pageUrl}" target="_blank" class="postit-link-badge" title="${pageUrl}">🔗 ${cleanTitle}</a>`;
        }

        // Format and append the text
        if (currentText && !currentText.endsWith('<br>') && !currentText.endsWith('</div>')) {
            currentText += "<br>";
        }
        currentText += `<div><i>"${formattedContent}"</i>${pageBadgeHtml}</div>`;

        let sessionId = result.hub_sticky_session_id;
        if (!sessionId) {
            sessionId = Date.now().toString();
        }

        let panoDeposu = result.hub_pano_v2;
        if (panoDeposu) {
            try {
                if (typeof panoDeposu === 'string') panoDeposu = JSON.parse(panoDeposu);
            } catch (e) { panoDeposu = null; }
        }

        if (!panoDeposu || typeof panoDeposu !== 'object') {
            panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
        }
        if (!panoDeposu.workspaces) panoDeposu.workspaces = { "Genel": [] };
        const activeWS = panoDeposu.aktifWorkspace || "Genel";
        if (!panoDeposu.workspaces[activeWS]) panoDeposu.workspaces[activeWS] = [];

        const theme = result.hub_sticky_theme || "theme-yellow";
        let colorHex = "#ffeaa7";
        if (theme === "theme-green") colorHex = "#55efc4";
        else if (theme === "theme-pink") colorHex = "#ff7675";
        else if (theme === "theme-blue") colorHex = "#74b9ff";
        else if (theme === "theme-dark") colorHex = "#2d3436";

        let existingNote = panoDeposu.workspaces[activeWS].find(n => n.id && n.id.toString() === sessionId.toString());
        if (existingNote) {
            existingNote.metin = currentText;
            existingNote.renk = colorHex;
        } else {
            existingNote = {
                id: sessionId,
                metin: currentText,
                top: `${Math.max(80, Math.floor(Math.random() * 250))}px`,
                left: `${Math.max(50, Math.floor(Math.random() * 400))}px`,
                renk: colorHex,
                w: "220px",
                h: "220px",
                resim: ""
            };
            panoDeposu.workspaces[activeWS].push(existingNote);
        }

        const updates = {
            "hub_sticky_text": currentText,
            "hub_sticky_session_id": sessionId,
            "hub_pano_v2": JSON.stringify(panoDeposu)
        };

        chrome.storage.local.set(updates);
    });
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "send-to-quick-note") {
        if (tab && tab.id && chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return { text: "", html: "" };

                    const container = document.createElement("div");
                    for (let i = 0; i < sel.rangeCount; i++) {
                        container.appendChild(sel.getRangeAt(i).cloneContents());
                    }

                    // Process anchors inside the DOM selection to retain their href links
                    const anchors = container.querySelectorAll("a");
                    anchors.forEach(a => {
                        let href = a.getAttribute("href");
                        if (href) {
                            if (!href.match(/^https?:\/\//i) && !href.startsWith("mailto:")) {
                                href = "https://" + href.replace(/^\/+/, "");
                            }
                            a.setAttribute("href", href);
                            a.setAttribute("target", "_blank");
                            a.setAttribute("class", "postit-link");
                            a.setAttribute("title", href);
                        }
                    });

                    return {
                        text: sel.toString(),
                        html: container.innerHTML
                    };
                }
            }, (results) => {
                let htmlRes = "";
                let textRes = info.selectionText || "";
                if (results && results[0] && results[0].result) {
                    htmlRes = results[0].result.html || "";
                    if (results[0].result.text) textRes = results[0].result.text;
                }
                saveQuickNoteSelection(textRes, htmlRes, info, tab);
            });
        } else {
            saveQuickNoteSelection(info.selectionText || "", "", info, tab);
        }
    }
});

// --- CALENDAR REMINDER ENGINE ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("calendar_check_alarm", { periodInMinutes: 1 });
});

chrome.alarms.create("calendar_check_alarm", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "calendar_check_alarm") {
        checkCalendarEvents();
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.hub_merkezi_ajanda_verisi || changes.hub_todo_hub_v2)) {
        checkCalendarEvents();
    }
});

function checkCalendarEvents() {
    chrome.storage.local.get(["hub_merkezi_ajanda_verisi", "hub_todo_hub_v2", "hub_lang", "hub_notified_events"], (result) => {
        let ajandaVerisi = result.hub_merkezi_ajanda_verisi;
        let todoVerisi = result.hub_todo_hub_v2;
        
        let notifiedEvents = result.hub_notified_events || [];
        if (typeof notifiedEvents === 'string') {
            try { notifiedEvents = JSON.parse(notifiedEvents); } catch(e) { notifiedEvents = []; }
        }

        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        const day = now.getDate();
        const dbKey = `aylik_planlar_${year}_${monthIndex}_${day}`;
        
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${currentHour}:${currentMinute}`;

        let hasNewNotification = false;

        // 1. Process custom calendar plans for today
        if (ajandaVerisi) {
            try {
                if (typeof ajandaVerisi === 'string') ajandaVerisi = JSON.parse(ajandaVerisi);
                
                let planlar = [];
                if (ajandaVerisi[dbKey]) {
                    planlar = JSON.parse(ajandaVerisi[dbKey]);
                    if (!Array.isArray(planlar)) planlar = [];
                }

                planlar.forEach(event => {
                    const time = event.saat || "00:00";
                    const note = event.not || "";
                    const eventId = `${dbKey}_${time}_${note}`;

                    if (time === timeStr && !notifiedEvents.includes(eventId)) {
                        const isEn = result.hub_lang === 'en';
                        chrome.notifications.create("", {
                            type: 'basic',
                            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                            title: isEn ? 'Logbook Calendar Reminder' : 'Logbook Ajanda Hatırlatıcı',
                            message: `${time} - ${note}`,
                            priority: 2
                        });
                        notifiedEvents.push(eventId);
                        hasNewNotification = true;
                    }
                });

                // Check weekly routine plans for today
                const dayOfWeekIndex = now.getDay();
                const gunler = ["pzt", "sal", "car", "per", "cum", "cmt", "paz"];
                const dinamikGunKodu = dayOfWeekIndex === 0 ? "paz" : gunler[dayOfWeekIndex - 1];
                
                const routineKey = `${dinamikGunKodu}_${timeStr}`;
                const routineNote = ajandaVerisi[routineKey];

                if (routineNote && routineNote.trim() !== "") {
                    const routineId = `${routineKey}_${routineNote}`;
                    if (!notifiedEvents.includes(routineId)) {
                        const isEn = result.hub_lang === 'en';
                        chrome.notifications.create("", {
                            type: 'basic',
                            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                            title: isEn ? 'Logbook Routine Reminder' : 'Logbook Rutin Hatırlatıcı',
                            message: `${timeStr} - ${routineNote}`,
                            priority: 2
                        });
                        notifiedEvents.push(routineId);
                        hasNewNotification = true;
                    }
                }
            } catch(e) {}
        }

        // 2. Process Kanban todo list reminders
        if (todoVerisi) {
            try {
                if (typeof todoVerisi === 'string') todoVerisi = JSON.parse(todoVerisi);
                
                Object.keys(todoVerisi).forEach(listName => {
                    const list = todoVerisi[listName];
                    if (!list) return;
                    
                    ["todo", "progress"].forEach(poolKey => {
                        const tasks = list[poolKey];
                        if (Array.isArray(tasks)) {
                            tasks.forEach(task => {
                                if (task.dueDate && task.dueTime) {
                                    if (task.dueDate === dateStr && task.dueTime === timeStr) {
                                        const eventId = `todo_${task.id}_${task.dueDate}_${task.dueTime}`;
                                        if (!notifiedEvents.includes(eventId)) {
                                            const isEn = result.hub_lang === 'en';
                                            chrome.notifications.create("", {
                                                type: 'basic',
                                                iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                                                title: isEn ? 'Logbook Task Reminder' : 'Logbook Görev Hatırlatıcı',
                                                message: `${task.txt} (${isEn ? 'Due Now' : 'Teslim Saati'})`,
                                                priority: 2
                                            });
                                            notifiedEvents.push(eventId);
                                            hasNewNotification = true;
                                        }
                                    }
                                }
                            });
                        }
                    });
                });
            } catch(e) {}
        }

        if (hasNewNotification) {
            if (notifiedEvents.length > 100) notifiedEvents = notifiedEvents.slice(-100);
            chrome.storage.local.set({ "hub_notified_events": JSON.stringify(notifiedEvents) });
        }
    });
}
