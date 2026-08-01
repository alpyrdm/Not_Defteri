// --- PANO (POST-IT) MOTORU (ÇOKLU İŞ ALANI VE SESLİ GİRDİ DESTEKLİ) ---
const pano = document.getElementById('pano');
let globalZIndex = 10;
window.lastLocalSaveTime = 0;

// Çoklu İş Alanı Veri Modeli
let panoDeposu = {
    aktifWorkspace: "Genel",
    workspaces: {
        "Genel": []
    }
};

// Sayfa Yüklendiğinde Verileri Al ve Göç Ettir
function workspacesYukle() {
    const v2Depo = localStorage.getItem('hub_pano_v2');
    if (v2Depo) {
        try {
            panoDeposu = JSON.parse(v2Depo);
        } catch(e) {
            panoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
        }
    } else {
        // Eski tekil pano yapısından göç (Migration)
        const eskiPano = JSON.parse(localStorage.getItem('hub_pano') || '[]');
        panoDeposu = {
            aktifWorkspace: "Genel",
            workspaces: {
                "Genel": eskiPano
            }
        };
        localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
    }

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
    const aktif = panoDeposu.aktifWorkspace || "Genel";

    // Synchronize Hızlı Not session card with Pano board
    let stickySessionId = localStorage.getItem('hub_sticky_session_id');
    let stickyText = localStorage.getItem('hub_sticky_text');
    let stickyTheme = localStorage.getItem('hub_sticky_theme') || "theme-yellow";
    
    let colorHex = "#ffeaa7";
    if (stickyTheme === "theme-green") colorHex = "#55efc4";
    else if (stickyTheme === "theme-pink") colorHex = "#ff7675";
    else if (stickyTheme === "theme-blue") colorHex = "#74b9ff";
    else if (stickyTheme === "theme-dark") colorHex = "#2d3436";

    let existingCard = null;
    if (stickySessionId) {
        existingCard = panoDeposu.workspaces[aktif].find(n => n.id && n.id.toString() === stickySessionId.toString());
    }

    if (!existingCard) {
        if (panoDeposu.workspaces[aktif].length > 0) {
            existingCard = panoDeposu.workspaces[aktif][panoDeposu.workspaces[aktif].length - 1];
            stickySessionId = existingCard.id.toString();
            localStorage.setItem('hub_sticky_session_id', stickySessionId);
            localStorage.setItem('hub_sticky_text', existingCard.metin || "");
        } else {
            stickySessionId = Date.now().toString();
            localStorage.setItem('hub_sticky_session_id', stickySessionId);
            existingCard = {
                id: stickySessionId,
                metin: stickyText !== null && stickyText !== undefined ? stickyText : "",
                top: "100px",
                left: "100px",
                renk: colorHex,
                w: "220px",
                h: "220px",
                resim: ""
            };
            panoDeposu.workspaces[aktif].push(existingCard);
            localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
        }
    }
}

// Seçiciyi (Dropdown) Doldur
function workspaceSeciciGuncelle() {
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const select = document.getElementById('workspace-select');
    if (!select) return;
    
    select.innerHTML = "";
    Object.keys(panoDeposu.workspaces).forEach(ad => {
        const opt = document.createElement('option');
        opt.value = ad;
        opt.innerText = (activeLang === 'en' && ad === "Genel") ? "General" : ad;
        if (ad === panoDeposu.aktifWorkspace) opt.selected = true;
        select.appendChild(opt);
    });
}

// Ekrandaki Notları Temizle ve Aktif İş Alanındakileri Çiz
function workspaceYukle() {
    if (!pano) return;
    
    // Çöp kutusu hariç tüm post-it'leri sil
    document.querySelectorAll('.post-it').forEach(p => p.remove());
    
    const aktifAlan = panoDeposu.aktifWorkspace;
    const notlar = panoDeposu.workspaces[aktifAlan] || [];
    
    notlar.forEach(n => {
        notOlustur(n.metin || "", n.top || "100px", n.left || "100px", n.renk || "#ffeaa7", n.w || "200px", n.h || "200px", n.resim || "", n.id || Date.now());
    });
    
    copSayaciniGuncelle();
}

// Mevcut İş Alanındaki Notları Kaydet
function panoKaydet() {
    window.lastLocalSaveTime = Date.now();
    const data = [...document.querySelectorAll('.post-it')].map(k => {
        const imgEl = k.querySelector('.postit-card-img');
        const txt = k.querySelector('.postit-editor-body') || k.querySelector('textarea');
        const metinVal = txt ? (txt.tagName === 'TEXTAREA' ? txt.value : txt.innerHTML) : "";
        
        return { 
            id: k.dataset.id ? parseInt(k.dataset.id) : Date.now(),
            metin: metinVal, 
            top: k.style.top, 
            left: k.style.left, 
            renk: k.style.backgroundColor, 
            w: k.style.width, 
            h: k.style.height,
            resim: imgEl ? imgEl.src : ""
        };
    });
    
    const aktifAlan = panoDeposu.aktifWorkspace;
    panoDeposu.workspaces[aktifAlan] = data;
    
    localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));

    // Bidirectional sync for the extension note card
    const activeSessionId = localStorage.getItem('hub_sticky_session_id');
    if (activeSessionId) {
        const extensionCard = data.find(n => n.id && parseFloat(n.id) === parseFloat(activeSessionId));
        if (extensionCard) {
            localStorage.setItem('hub_sticky_text', extensionCard.metin);
            
            let theme = "theme-yellow";
            const c = extensionCard.renk;
            if (c === '#55efc4' || c === 'rgb(85, 239, 196)') theme = "theme-green";
            else if (c === '#ff7675' || c === 'rgb(255, 118, 117)') theme = "theme-pink";
            else if (c === '#74b9ff' || c === 'rgb(116, 185, 255)') theme = "theme-blue";
            else if (c === '#2d3436' || c === 'rgb(45, 52, 54)') theme = "theme-dark";
            localStorage.setItem('hub_sticky_theme', theme);
            
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_sticky_text', value: extensionCard.metin }
            }));
            document.dispatchEvent(new CustomEvent('page_sync_update', {
                detail: { key: 'hub_sticky_theme', value: theme }
            }));
        }
    }
    
    // Eski anahtarı da uyumluluk için yedekle (Genel alan ise)
    if (aktifAlan === "Genel") {
        localStorage.setItem('hub_pano', JSON.stringify(data));
    }
}

// Post-it Oluşturucu (Ses Kayıt Butonlu ve Resim Destekli)
// Post-it Oluşturucu (Ses Kayıt Butonlu ve Resim Destekli)
function notOlustur(metin, top, left, renk, w, h, resim, id) {
    if (!pano) return; 
    const kutu = document.createElement('div'); 
    kutu.className = 'post-it'; 
    kutu.dataset.id = id || Date.now();
    kutu.style.top = top; 
    kutu.style.left = left; 
    kutu.style.backgroundColor = renk; 
    kutu.style.width = w; 
    kutu.style.height = h;
    kutu.style.zIndex = globalZIndex++;
    
    // Create rich text div with contentEditable
    const txt = document.createElement('div'); 
    txt.className = 'postit-editor-body';
    txt.contentEditable = "true";
    txt.innerHTML = metin || ""; 
    txt.oninput = panoKaydet;
    
    // Style it exactly like the previous textarea
    txt.style.width = '100%';
    txt.style.height = 'calc(100% - 25px)';
    txt.style.outline = 'none';
    txt.style.border = 'none';
    txt.style.background = 'transparent';
    txt.style.overflowY = 'auto';
    txt.style.fontFamily = 'Outfit, sans-serif';
    txt.style.fontSize = '13px';
    txt.style.lineHeight = '1.5';
    txt.style.padding = '0';
    txt.style.margin = '0';
    txt.style.boxSizing = 'border-box';
    
    if (renk === '#2d3436' || renk === 'rgb(45, 52, 54)') {
        txt.style.color = '#f8fafc';
    } else {
        txt.style.color = '#1e293b';
    }

    // Context Menu logic for board images & text
    let panoImageMenu = document.getElementById('pano-image-context-menu');
    let panoTextMenu = document.getElementById('pano-text-context-menu');
    const isEn = localStorage.getItem('hub_lang') === 'en';
    
    if (!panoImageMenu) {
        panoImageMenu = document.createElement('div');
        panoImageMenu.id = 'pano-image-context-menu';
        panoImageMenu.style.cssText = 'display: none; position: absolute; z-index: 10000; background: #fff; border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); padding: 4px; min-width: 155px; font-family: "Outfit", sans-serif; font-size: 11px;';
        
        panoImageMenu.innerHTML = `
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Sizing' : 'Boyutlandırma'}</div>
            <div class="menu-item" data-size="30%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔍 ${isEn ? 'Small (%30)' : 'Küçük (%30)'}</div>
            <div class="menu-item" data-size="60%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">⚖️ ${isEn ? 'Medium (%60)' : 'Orta (%60)'}</div>
            <div class="menu-item" data-size="100%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔎 ${isEn ? 'Large (%100)' : 'Büyük (%100)'}</div>
            <div class="menu-item" data-action="custom-size" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${isEn ? 'Custom Size...' : 'Elle Boyut Gir...'}</div>
            
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Alignment' : 'Hizalama / Duruş'}</div>
            <div class="menu-item" data-align="block" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">📝 ${isEn ? 'Block (Center)' : 'Blok (Ortala)'}</div>
            <div class="menu-item" data-align="inline" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔗 ${isEn ? 'Inline' : 'Satır İçi'}</div>
            <div class="menu-item" data-align="left" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">👈 ${isEn ? 'Float Left' : 'Sola Yasla'}</div>
            <div class="menu-item" data-align="right" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">👉 ${isEn ? 'Float Right' : 'Sağa Yasla'}</div>
            <div class="menu-item" data-align="bottom" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">⬇️ ${isEn ? 'Anchor Bottom' : 'En Alta Sabitle'}</div>
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            <div class="menu-item" data-action="delete" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #ef4444; font-weight: bold;">🗑️ ${isEn ? 'Delete Image' : 'Resmi Sil'}</div>
        `;
        
        const style = document.createElement('style');
        style.innerHTML = `
            #pano-image-context-menu .menu-item:hover, #pano-text-context-menu .menu-item:hover { background-color: #f1f5f9; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panoImageMenu);
    }

    if (!panoTextMenu) {
        panoTextMenu = document.createElement('div');
        panoTextMenu.id = 'pano-text-context-menu';
        panoTextMenu.style.cssText = 'display: none; position: absolute; z-index: 10000; background: #fff; border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); padding: 4px; min-width: 155px; font-family: "Outfit", sans-serif; font-size: 11px;';
        
        panoTextMenu.innerHTML = `
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Format' : 'Biçim'}</div>
            <div class="menu-item" data-command="bold" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><b>B</b> ${isEn ? 'Bold' : 'Kalın'}</div>
            <div class="menu-item" data-command="italic" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><i>I</i> ${isEn ? 'Italic' : 'İtalik'}</div>
            <div class="menu-item" data-command="underline" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><u>U</u> ${isEn ? 'Underline' : 'Altı Çizili'}</div>
            
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Size' : 'Boyut'}</div>
            <div class="menu-item" data-command="font-size-percent" data-value="11px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔍 11px</div>
            <div class="menu-item" data-command="font-size-percent" data-value="13px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">⚖️ 13px</div>
            <div class="menu-item" data-command="font-size-percent" data-value="16px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔎 16px</div>
            <div class="menu-item" data-command="font-size-percent" data-value="20px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🚀 20px</div>
            <div class="menu-item" data-command="font-size-percent" data-value="26px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">💥 26px</div>
            <div class="menu-item" data-command="custom-font-size" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${isEn ? 'Custom Size...' : 'Elle Boyut Gir...'}</div>
            
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Font' : 'Yazı Tipi'}</div>
            <div class="menu-item" data-command="fontName" data-value="Outfit" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Outfit</div>
            <div class="menu-item" data-command="fontName" data-value="Georgia" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Serif (Georgia)</div>
            <div class="menu-item" data-command="fontName" data-value="Courier New" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Monospace</div>
            <div class="menu-item" data-command="fontName" data-value="Arial" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Arial</div>
            <div class="menu-item" data-command="fontName" data-value="Times New Roman" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Times</div>
            <div class="menu-item" data-command="fontName" data-value="Comic Sans MS" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Comic Sans</div>
            <div class="menu-item" data-command="fontName" data-value="Impact" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Impact</div>
            <div class="menu-item" data-command="custom-font-name" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${isEn ? 'Custom Font...' : 'Yazı Tipi Gir...'}</div>
            
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            
            <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${isEn ? 'Color' : 'Renk'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#ef4444" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔴 ${isEn ? 'Red' : 'Kırmızı'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#10b981" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟢 ${isEn ? 'Green' : 'Yeşil'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#3b82f6" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔵 ${isEn ? 'Blue' : 'Mavi'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#f59e0b" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟡 ${isEn ? 'Yellow' : 'Sarı'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#8b5cf6" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟣 ${isEn ? 'Purple' : 'Mor'}</div>
            <div class="menu-item" data-command="foreColor" data-value="#f97316" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟠 ${isEn ? 'Orange' : 'Turuncu'}</div>
            <div class="menu-item" data-command="custom-fore-color" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${isEn ? 'Custom Color...' : 'Renk Seç...'}</div>
            
            <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
            
            <div class="menu-item" data-command="removeFormat" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #ef4444; font-weight: bold;">🧹 ${isEn ? 'Clear Style' : 'Biçimi Temizle'}</div>
            <input type="color" id="pano-hidden-color-picker" style="display: none; visibility: hidden; width: 0; height: 0; padding: 0; border: none;">
        `;
        document.body.appendChild(panoTextMenu);
    }

    function showPanoMenuSmartly(menuEl, clientX, clientY) {
        menuEl.style.display = 'block';
        const menuWidth = menuEl.offsetWidth || 155;
        const menuHeight = menuEl.offsetHeight || 300;
        
        let x = clientX;
        let y = clientY;
        
        if (y + menuHeight > window.innerHeight && y > menuHeight) {
            y = y - menuHeight;
        }
        
        x = Math.max(5, Math.min(x, window.innerWidth - menuWidth - 5));
        y = Math.max(5, Math.min(y, window.innerHeight - menuHeight - 5));
        
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
    }

    let activeBoardImage = null;
    txt.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        panoImageMenu.style.display = 'none';
        panoTextMenu.style.display = 'none';
        
        if (e.target.tagName === 'IMG') {
            activeBoardImage = e.target;
            showPanoMenuSmartly(panoImageMenu, e.clientX, e.clientY);
        } else {
            showPanoMenuSmartly(panoTextMenu, e.clientX, e.clientY);
        }
    });

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
        panoKaydet();
    }

    if (!panoImageMenu.dataset.bound) {
        panoImageMenu.dataset.bound = "true";
        document.addEventListener('click', () => {
            panoImageMenu.style.display = 'none';
            panoTextMenu.style.display = 'none';
        });
        
        panoImageMenu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeBoardImage) return;
                
                const size = item.dataset.size;
                const align = item.dataset.align;
                const action = item.dataset.action;
                
                if (size) {
                    activeBoardImage.style.width = size;
                }
                if (action === 'custom-size') {
                    const manual = prompt(isEn 
                        ? "Enter image width (e.g. 250px or 50%):" 
                        : "Resim genişliğini girin (örn: 250px veya %50):", activeBoardImage.style.width || "300px");
                    if (manual && manual.trim() !== "") {
                        activeBoardImage.style.width = manual.trim();
                    }
                }
                if (align) {
                    if (align === 'block') {
                        activeBoardImage.style.display = 'block';
                        activeBoardImage.style.margin = '10px auto';
                        activeBoardImage.style.float = 'none';
                        activeBoardImage.style.borderTop = 'none';
                        activeBoardImage.style.paddingTop = '0';
                    } else if (align === 'inline') {
                        activeBoardImage.style.display = 'inline-block';
                        activeBoardImage.style.margin = '5px';
                        activeBoardImage.style.float = 'none';
                        activeBoardImage.style.borderTop = 'none';
                        activeBoardImage.style.paddingTop = '0';
                    } else if (align === 'left') {
                        activeBoardImage.style.display = 'block';
                        activeBoardImage.style.float = 'left';
                        activeBoardImage.style.margin = '10px 15px 10px 0';
                        activeBoardImage.style.borderTop = 'none';
                        activeBoardImage.style.paddingTop = '0';
                    } else if (align === 'right') {
                        activeBoardImage.style.display = 'block';
                        activeBoardImage.style.float = 'right';
                        activeBoardImage.style.margin = '10px 0 10px 15px';
                        activeBoardImage.style.borderTop = 'none';
                        activeBoardImage.style.paddingTop = '0';
                    } else if (align === 'bottom') {
                        const parentTxt = activeBoardImage.closest('.postit-editor-body');
                        if (parentTxt) {
                            parentTxt.appendChild(activeBoardImage);
                            activeBoardImage.style.display = 'block';
                            activeBoardImage.style.margin = '15px auto 0 auto';
                            activeBoardImage.style.float = 'none';
                            activeBoardImage.style.borderTop = '1px dashed rgba(0,0,0,0.15)';
                            activeBoardImage.style.paddingTop = '10px';
                        }
                    }
                }
                if (action === 'delete') {
                    if (confirm(isEn ? "Delete this image?" : "Bu resmi silmek istiyor musunuz?")) {
                        activeBoardImage.remove();
                    }
                }
                
                panoKaydet();
                panoImageMenu.style.display = 'none';
            });
        });
        
        panoTextMenu.querySelectorAll('.menu-item').forEach(item => {
            // Prevent selection loss on clicking board context menu items
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
                    const manual = prompt(isEn
                        ? "Enter font size in pixels (e.g. 12, 16, 24):"
                        : "Yazı boyutu piksel değerini girin (örn: 12, 16, 24):");
                    if (manual && !isNaN(manual)) {
                        applySelectionStyle('fontSize', `${manual}px`);
                    }
                } else if (command === 'custom-font-name') {
                    const manual = prompt(isEn
                        ? "Enter font family name (e.g. Arial, Tahoma, Georgia):"
                        : "Yazı tipi adını girin (örn: Arial, Tahoma, Georgia):");
                    if (manual && manual.trim() !== "") {
                        applySelectionStyle('fontFamily', manual.trim());
                    }
                } else if (command === 'custom-fore-color') {
                    const picker = document.getElementById('pano-hidden-color-picker');
                    if (picker) {
                        picker.onchange = () => {
                            applySelectionStyle('color', picker.value);
                        };
                        picker.click();
                    }
                } else if (command) {
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand(command, false, value || null);
                    panoKaydet();
                }
                panoTextMenu.style.display = 'none';
            });
        });
    }

    kutu.addEventListener('mousedown', () => {
        kutu.style.zIndex = globalZIndex++;
    });
    
    const sil = document.createElement('button'); 
    sil.innerText = 'X'; 
    sil.className = 'sil-btn';
    
    sil.onclick = (e) => {
        e.stopPropagation();
        let depo = JSON.parse(localStorage.getItem('hub_silinen_notlar_deposu') || '[]');
        depo.push({ metin: txt.innerHTML, renk: kutu.style.backgroundColor, w: kutu.style.width, h: kutu.style.height });
        localStorage.setItem('hub_silinen_notlar_deposu', JSON.stringify(depo));
        copSayaciniGuncelle();
        kutu.remove(); 
        panoKaydet(); 
    };

    const palet = document.createElement('div'); 
    palet.className = 'renk-paleti';
    palet.style.alignItems = 'center';
    
    ['#ffeaa7', '#ff7675', '#74b9ff', '#55efc4'].forEach(c => { 
        const n = document.createElement('div'); 
        n.className = 'renk-noktasi'; 
        n.style.backgroundColor = c; 
        n.onclick = (e) => { 
            e.stopPropagation(); 
            kutu.style.backgroundColor = c; 
            if (c === '#2d3436' || c === 'rgb(45, 52, 54)') {
                txt.style.color = '#f8fafc';
            } else {
                txt.style.color = '#1e293b';
            }
            panoKaydet(); 
        }; 
        palet.appendChild(n); 
    });
    
    // --- Web Speech API (Sesle Yazma) Entegrasyonu ---
    const micBtn = document.createElement('button');
    micBtn.innerText = '🎙️';
    micBtn.className = 'aksiyon-mini-btn';
    micBtn.title = 'Sesle yazmayı başlat/durdur';
    micBtn.style.cssText = "margin-left: auto; border: none; padding: 2px 5px; font-size: 13px; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;";
    
    let isRecording = false;
    let recognition = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            txt.innerHTML += (txt.innerHTML.length > 0 ? " " : "") + transcript;
            panoKaydet();
        };
        
        recognition.onerror = (err) => {
            console.error("Ses tanıma hatası:", err);
            micBtn.classList.remove('ses-aktif-btn');
            isRecording = false;
        };
        
        recognition.onend = () => {
            micBtn.classList.remove('ses-aktif-btn');
            isRecording = false;
        };
    }
    
    micBtn.onclick = (e) => {
        e.stopPropagation();
        if (!recognition) {
            alert("Tarayıcınız Web Speech (ses tanıma) API'sini desteklemiyor. Chrome veya Safari deneyebilirsiniz.");
            return;
        }
        
        if (isRecording) {
            recognition.stop();
        } else {
            document.querySelectorAll('.ses-aktif-btn').forEach(btn => {
                if (btn !== micBtn) btn.click();
            });
            
            micBtn.classList.add('ses-aktif-btn');
            isRecording = true;
            recognition.start();
        }
    };
    
    let imgEl = null;
    if (resim) {
        imgEl = document.createElement('img');
        imgEl.src = resim;
        imgEl.className = 'postit-card-img';
        imgEl.style.cssText = "width: 100%; max-height: 110px; object-fit: contain; margin-top: 4px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); display: block; background-color: rgba(0,0,0,0.02);";
        imgEl.ondblclick = (e) => {
            e.stopPropagation();
            if (confirm("Bu görseli nottan kaldırmak istiyor musunuz?")) {
                imgEl.remove();
                panoKaydet();
            }
        };
    }
    
    palet.appendChild(micBtn);
    
    // Check if this card matches the active extension popup card sessionNoteId
    const activeSessionId = localStorage.getItem('hub_sticky_session_id');
    if (id && activeSessionId && parseFloat(id) === parseFloat(activeSessionId)) {
        const badge = document.createElement('span');
        badge.className = 'extension-badge';
        badge.innerText = '⚡ Hızlı Not';
        badge.style.position = 'absolute';
        badge.style.top = '6px';
        badge.style.left = '10px';
        badge.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
        badge.style.color = '#1d4ed8';
        badge.style.border = '1px solid rgba(59, 130, 246, 0.25)';
        badge.style.padding = '1px 5px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '8px';
        badge.style.fontWeight = 'bold';
        badge.style.pointerEvents = 'none';
        badge.style.fontFamily = 'Outfit, sans-serif';
        kutu.appendChild(badge);
    }
    
    if (imgEl) {
        kutu.append(sil, txt, imgEl, palet);
    } else {
        kutu.append(sil, txt, palet);
    }
    pano.appendChild(kutu);
    
    let isDragging = false; let isResizing = false; let ox, oy;
    kutu.addEventListener('mousedown', (e) => { 
        if (txt.contains(e.target) || e.target === sil || e.target.classList.contains('renk-noktasi') || e.target === micBtn) return; 
        const rect = kutu.getBoundingClientRect(); 
        if (e.clientX > rect.right - 15 && e.clientY > rect.bottom - 15) {
            isResizing = true;
            return;
        }
        isDragging = true; ox = e.clientX - kutu.offsetLeft; oy = e.clientY - kutu.offsetTop; 
    });
    document.addEventListener('mousemove', (e) => { if (!isDragging) return; kutu.style.left = (e.clientX - ox) + 'px'; kutu.style.top = (e.clientY - oy) + 'px'; });
    document.addEventListener('mouseup', () => { 
        if (isDragging || isResizing) { 
            isDragging = false; 
            isResizing = false; 
            panoKaydet(); 
        } 
    });
}

const hizalaNotBtn = document.getElementById('hizala-not-btn');
if (hizalaNotBtn) {
    hizalaNotBtn.onclick = () => {
        const notlar = document.querySelectorAll('.post-it');
        let sutunSayisi = 4; let notGenislik = 210; let notYukseklik = 210;
        let baslangicTop = 80; let baslangicLeft = 20;
        
        notlar.forEach((kutu, index) => {
            let satir = Math.floor(index / sutunSayisi);
            let sutun = index % sutunSayisi;
            kutu.style.top = (baslangicTop + satir * notYukseklik) + "px";
            kutu.style.left = (baslangicLeft + sutun * notGenislik) + "px";
        });
        panoKaydet();
    };
}

const yeniNotBtn = document.getElementById('yeni-not-btn');
if (yeniNotBtn) {
    yeniNotBtn.onclick = () => {
        const yukseklikKonum = Math.random() * 200 + 100 + 'px'; const genislikKonum = Math.random() * (window.innerWidth - 250) + 'px';
        notOlustur("", yukseklikKonum, genislikKonum, "#ffeaa7", "200px", "200px"); 
        panoKaydet();
    };
}

function copSayaciniGuncelle() {
    const sayacEleman = document.getElementById('cop-sayac');
    if (sayacEleman) sayacEleman.innerText = JSON.parse(localStorage.getItem('hub_silinen_notlar_deposu') || '[]').length;
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Çoklu Alanları Yükle
    workspacesYukle();
    workspaceSeciciGuncelle();
    workspaceYukle();
    
    // 2. İş Alanı Tıklama ve Kontrol Olayları
    const select = document.getElementById('workspace-select');
    const ekleBtn = document.getElementById('workspace-ekle-btn');
    const silBtn = document.getElementById('workspace-sil-btn');
    
    if (select) {
        select.onchange = () => {
            // Önce mevcut notları kaydet
            panoKaydet();
            panoDeposu.aktifWorkspace = select.value;
            localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
            workspaceYukle();
        };
    }
    
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    if (ekleBtn) {
        ekleBtn.onclick = () => {
            const isim = prompt(activeLang === 'en' ? "Please enter the name of the new workspace:" : "Lütfen yeni iş alanının adını girin:");
            if (!isim || isim.trim() === "") return;
            const temizIsim = isim.trim();
            
            if (panoDeposu.workspaces[temizIsim]) {
                alert(activeLang === 'en' ? "A workspace with this name already exists!" : "Bu isimde bir iş alanı zaten mevcut!");
                return;
            }
            
            panoKaydet(); // Aktif alanı kaydet
            panoDeposu.workspaces[temizIsim] = [];
            panoDeposu.aktifWorkspace = temizIsim;
            localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
            
            workspaceSeciciGuncelle();
            workspaceYukle();
        };
    }
    
    if (silBtn) {
        silBtn.onclick = () => {
            const aktif = panoDeposu.aktifWorkspace;
            if (Object.keys(panoDeposu.workspaces).length === 1) {
                alert(activeLang === 'en' ? "You cannot delete the only workspace in the system. Clear the notes instead." : "Sistemdeki tek iş alanını silemezsiniz. Bunun yerine notları temizleyebilirsiniz.");
                return;
            }
            
            const dispName = (activeLang === 'en' && aktif === 'Genel') ? 'General' : aktif;
            if (confirm(activeLang === 'en' 
                ? `Are you sure you want to delete the workspace "${dispName}" and all notes inside it?`
                : `"${aktif}" iş alanını ve içindeki tüm notları silmek istediğinize emin misiniz?`)) {
                delete panoDeposu.workspaces[aktif];
                panoDeposu.aktifWorkspace = Object.keys(panoDeposu.workspaces)[0] || "Genel";
                localStorage.setItem('hub_pano_v2', JSON.stringify(panoDeposu));
                
                workspaceSeciciGuncelle();
                workspaceYukle();
            }
        };
    }

    // 3. Çöp Kutusu Olayları
    const copKutusuBtn = document.getElementById('pano-cop-kutusu');
    if (copKutusuBtn) {
        copKutusuBtn.onclick = (e) => {
            e.preventDefault(); 
            let depo = JSON.parse(localStorage.getItem('hub_silinen_notlar_deposu') || '[]');
            if (depo.length === 0) return alert(activeLang === 'en' ? "Trash is empty." : "Çöp kutusu boş.");
            
            const geri = depo.pop(); 
            localStorage.setItem('hub_silinen_notlar_deposu', JSON.stringify(depo));
            copSayaciniGuncelle(); 
            
            const merkezTop = (window.innerHeight / 3) + (Math.random() * 50) + "px";
            const merkezLeft = (window.innerWidth / 3) + (Math.random() * 50) + "px";
            
            notOlustur(geri.metin, merkezTop, merkezLeft, geri.renk, geri.w, geri.h); 
            panoKaydet();
        };
        copKutusuBtn.oncontextmenu = (e) => {
            e.preventDefault(); 
            if (confirm("Çöp kutusunu tamamen boşaltmak istiyor musunuz?")) { 
                localStorage.removeItem('hub_silinen_notlar_deposu'); 
                copSayaciniGuncelle(); 
            }
        };
    }

    // 4. Real-time Synchronization from Extension Updates
    const handleSyncUpdate = (key) => {
        if (window.lastLocalSaveTime && (Date.now() - window.lastLocalSaveTime < 1000)) return;
        
        if (key === 'hub_sticky_session_id') {
            workspaceYukle();
            return;
        }
        
        if (key === 'hub_pano_v2') {
            // Keep track of active focused card to avoid losing focus if editing on the board
            const activeElement = document.activeElement;
            const activeCardId = activeElement && activeElement.closest('.post-it') 
                ? activeElement.closest('.post-it').dataset.id 
                : null;
            
            // Re-read data and update card bodies that are NOT currently focused
            let freshPanoDeposu = { aktifWorkspace: "Genel", workspaces: { "Genel": [] } };
            try {
                const rawPano = localStorage.getItem('hub_pano_v2');
                if (rawPano) {
                    freshPanoDeposu = JSON.parse(rawPano);
                    panoDeposu = freshPanoDeposu; // Update memory state
                }
            } catch (err) {}
            
            const activeAlan = freshPanoDeposu.aktifWorkspace || "Genel";
            const freshNotes = freshPanoDeposu.workspaces[activeAlan] || [];
            
            freshNotes.forEach(n => {
                if (activeCardId && n.id && parseFloat(activeCardId) === parseFloat(n.id)) return;
                
                const card = document.querySelector(`.post-it[data-id="${n.id}"]`);
                if (card) {
                    const txt = card.querySelector('.postit-editor-body');
                    if (txt && txt.innerHTML !== n.metin) {
                        txt.innerHTML = n.metin || "";
                    }
                    card.style.backgroundColor = n.renk;
                } else {
                    workspaceYukle();
                }
            });
            
            const existingCardIds = [...document.querySelectorAll('.post-it')].map(c => c.dataset.id.toString());
            const freshCardIds = freshNotes.map(n => n.id.toString());
            const hasChanges = existingCardIds.some(id => !freshCardIds.includes(id)) || freshCardIds.some(id => !existingCardIds.includes(id));
            if (hasChanges) {
                workspaceYukle();
            }
        }
    };

    window.addEventListener('storage', (e) => {
        handleSyncUpdate(e.key);
    });

    document.addEventListener('extension_sync_update', (e) => {
        handleSyncUpdate(e.detail.key);
    });

    // Keyboard Shortcut (Cmd + S / Ctrl + S) - Saves focused card content as a new page in Defter
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 's') {
            const activeElement = document.activeElement;
            const activeCard = activeElement ? activeElement.closest('.post-it') : null;
            if (activeCard) {
                e.preventDefault();
                
                const txtEl = activeCard.querySelector('.postit-editor-body');
                const metinVal = txtEl ? txtEl.innerHTML : "";
                
                if (!metinVal || metinVal.trim() === "" || metinVal === "<br>") {
                    alert("Boş bir not Deftere kaydedilemez!");
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
                
                const cardId = activeCard.dataset.id ? activeCard.dataset.id.toString() : "";
                let existingPageIndex = defterSayfalari.findIndex(p => p.sourcePostitId === cardId);
                let targetIndex;
                if (existingPageIndex !== -1) {
                    defterSayfalari[existingPageIndex].metin = metinVal;
                    targetIndex = existingPageIndex;
                } else {
                    const newPage = {
                        metin: metinVal,
                        cizim: "",
                        sourcePostitId: cardId
                    };
                    defterSayfalari.push(newPage);
                    targetIndex = defterSayfalari.length - 1;
                }
                
                localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                localStorage.setItem('hub_defter_aktif_sayfa_index', targetIndex.toString());
                
                // Dispatch page sync update
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_defter_sayfalar', value: JSON.stringify(defterSayfalari) }
                }));
                document.dispatchEvent(new CustomEvent('page_sync_update', {
                    detail: { key: 'hub_defter_aktif_sayfa_index', value: targetIndex.toString() }
                }));
                
                // Visual checkmark overlay notification
                const alertOverlay = document.createElement('div');
                alertOverlay.style.position = 'absolute';
                alertOverlay.style.top = '0';
                alertOverlay.style.left = '0';
                alertOverlay.style.width = '100%';
                alertOverlay.style.height = '100%';
                alertOverlay.style.backgroundColor = 'rgba(59, 130, 246, 0.95)';
                alertOverlay.style.color = '#fff';
                alertOverlay.style.display = 'flex';
                alertOverlay.style.flexDirection = 'column';
                alertOverlay.style.alignItems = 'center';
                alertOverlay.style.justifyContent = 'center';
                alertOverlay.style.borderRadius = '8px';
                alertOverlay.style.zIndex = '1000';
                alertOverlay.style.fontFamily = 'Outfit, sans-serif';
                alertOverlay.style.fontSize = '14px';
                alertOverlay.style.fontWeight = 'bold';
                alertOverlay.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                alertOverlay.innerHTML = '📓 Deftere Kaydedildi!';
                
                activeCard.appendChild(alertOverlay);
                setTimeout(() => {
                    alertOverlay.remove();
                }, 1500);
            }
        }
    });
});
