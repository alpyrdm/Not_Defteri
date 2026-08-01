// --- DEFTER VE CANVAS MOTORU (ÇOKLU SAYFA DESTEKLİ) ---
const activeLang = localStorage.getItem('hub_lang') || 'tr';
let sayfaCizgiliMi = localStorage.getItem('hub_defter_cizgi_stili') !== 'bos'; 
let cizimModuAktif = false; 
let silgiModuAktif = false;
let cizimGecmisi = [];

// Çoklu Sayfa Yönetimi
let defterSayfalari = [];
let aktifSayfaIndex = 0;

const defterKagitTabakasi = document.getElementById('defter-kagit-tabakasi'); 
const defterCizgiToggle = document.getElementById('defter-cizgi-toggle'); 
const defterModToggle = document.getElementById('defter-mod-toggle'); 
const fircaPaneli = document.getElementById('firca-paneli'); 
const tuval = document.getElementById('defter-tuval'); 
const defterKonteynır = document.querySelector('.hibrit-defter-yapraki'); 
const defterSilgiBtn = document.getElementById('defter-silgi-btn'); 
const defterUndoBtn = document.getElementById('defter-undo-btn');
const defterTextarea = document.getElementById('ana-defter');

let ctx = tuval ? tuval.getContext('2d') : null; 
let cizimYapiyorMu = false;

// Sayfaları LocalStorage'dan Yükle
function sayfalariYukleVeHazirla() {
    const kayitliSayfalar = localStorage.getItem('hub_defter_sayfalar');
    aktifSayfaIndex = parseInt(localStorage.getItem('hub_defter_aktif_sayfa_index') || '0');

    if (kayitliSayfalar) {
        defterSayfalari = JSON.parse(kayitliSayfalar);
    } else {
        // Eski tek sayfa verilerini taşı (Göç - Migration)
        const eskiMetin = localStorage.getItem('hub_defter') || "";
        const eskiCizim = localStorage.getItem('hub_hibrit_canvas_resmi') || "";
        defterSayfalari = [{ metin: eskiMetin, cizim: eskiCizim }];
        localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
    }

    if (aktifSayfaIndex >= defterSayfalari.length) {
        aktifSayfaIndex = defterSayfalari.length - 1;
    }
}

// Aktif Sayfanın İçeriğini Kaydet
function sayfayiKaydet(index) {
    if (index < 0 || index >= defterSayfalari.length) return;
    
    defterSayfalari[index].metin = defterTextarea ? defterTextarea.innerHTML : "";
    defterSayfalari[index].cizim = tuval ? tuval.toDataURL('image/webp', 0.6) : "";
    
    localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
}

// Aktif Sayfanın İçeriğini Ekran/Tuval Üzerine Çek
function sayfayiEkranaYukle(index) {
    if (index < 0 || index >= defterSayfalari.length) return;
    
    // 1. Yazı alanını güncelle
    if (defterTextarea) {
        defterTextarea.innerHTML = defterSayfalari[index].metin || "";
        localStorage.setItem('hub_defter', defterTextarea.innerHTML); // Yedekleme amaçlı eski anahtarı da güncelle
    }
    
    // 2. Çizim tuvalini güncelle
    if (tuval && ctx) {
        ctx.clearRect(0, 0, tuval.width, tuval.height);
        cizimGecmisi = []; // Geri alma geçmişini bu sayfa için sıfırla
        
        const cizimVerisi = defterSayfalari[index].cizim;
        if (cizimVerisi && cizimVerisi.trim() !== "" && cizimVerisi !== "data:,") {
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0);
                cizimGecmisi.push(cizimVerisi); // İlk hali geçmişe ekle
                localStorage.setItem('hub_hibrit_canvas_resmi', cizimVerisi);
            };
            img.src = cizimVerisi;
        } else {
            localStorage.removeItem('hub_hibrit_canvas_resmi');
        }
    }
    
    // 3. Arayüz etiketini güncelle
    const indisEtiket = document.getElementById('sayfa-indis-etiket');
    if (indisEtiket) {
        indisEtiket.innerText = activeLang === 'en' 
            ? `Page ${index + 1} / ${defterSayfalari.length}`
            : `Sayfa ${index + 1} / ${defterSayfalari.length}`;
    }
    
    localStorage.setItem('hub_defter_aktif_sayfa_index', index);
}

function sayfaStiliDegistir() {
    sayfaCizgiliMi = !sayfaCizgiliMi; 
    localStorage.setItem('hub_defter_cizgi_stili', sayfaCizgiliMi ? 'cizgili' : 'bos');
    if(defterKagitTabakasi) defterKagitTabakasi.className = sayfaCizgiliMi ? "defter-kagit-efekti mod-cizgili" : "defter-kagit-efekti mod-bos";
    if(defterCizgiToggle) defterCizgiToggle.innerText = sayfaCizgiliMi 
        ? (activeLang === 'en' ? "📝 Lined" : "📝 Çizgili") 
        : (activeLang === 'en' ? "📄 Blank" : "📄 Boş");
}

function cizimModuToggle() {
    cizimModuAktif = !cizimModuAktif;
    if(defterKonteynır) {
        if(cizimModuAktif) {
            defterKonteynır.classList.add('cizim-aktif-modu'); 
            defterModToggle.innerText = activeLang === 'en' ? "✍️ Sketch" : "✍️ Çizim"; 
            defterModToggle.className = "defter-tool-btn active-draw-mode"; 
            fircaPaneli.style.opacity = "1"; 
            fircaPaneli.style.pointerEvents = "auto";
        } else {
            defterKonteynır.classList.remove('cizim-aktif-modu'); 
            defterModToggle.innerText = activeLang === 'en' ? "✍️ Text" : "✍️ Yazı"; 
            defterModToggle.className = "defter-tool-btn"; 
            fircaPaneli.style.opacity = "0.4"; 
            fircaPaneli.style.pointerEvents = "none";
            silgiModuAktif = false; 
            if(defterSilgiBtn) { 
                defterSilgiBtn.innerText = activeLang === 'en' ? "🧽 Eraser" : "🧽 Silgi"; 
                defterSilgiBtn.classList.remove('silgi-aktif-stili');
            }
        }
    }
}

window.sayfaStiliDegistir = sayfaStiliDegistir;
window.cizimModuToggle = cizimModuToggle;

if (defterSilgiBtn) {
    defterSilgiBtn.onclick = () => {
        silgiModuAktif = !silgiModuAktif;
        if(silgiModuAktif) { 
            defterSilgiBtn.innerText = activeLang === 'en' ? "🧼 Eraser: ON" : "🧼 Silgi: Açık"; 
            defterSilgiBtn.classList.add('silgi-aktif-stili'); 
        } else { 
            defterSilgiBtn.innerText = activeLang === 'en' ? "🧽 Eraser" : "🧽 Silgi"; 
            defterSilgiBtn.classList.remove('silgi-aktif-stili'); 
        }
    };
}

function cizimiGeriAl() {
    if (!tuval || !ctx || cizimGecmisi.length === 0) return;
    cizimGecmisi.pop(); 
    ctx.clearRect(0, 0, tuval.width, tuval.height);
    if (cizimGecmisi.length > 0) {
        let img = new Image();
        img.onload = () => { 
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.drawImage(img, 0, 0); 
            // Aktif sayfaya kaydet
            defterSayfalari[aktifSayfaIndex].cizim = tuval.toDataURL('image/webp', 0.6);
            localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
            localStorage.setItem('hub_hibrit_canvas_resmi', defterSayfalari[aktifSayfaIndex].cizim);
        };
        img.src = cizimGecmisi[cizimGecmisi.length - 1];
    } else {
        defterSayfalari[aktifSayfaIndex].cizim = "";
        localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
        localStorage.removeItem('hub_hibrit_canvas_resmi');
    }
}

function tuvaliBoyutlandir() { 
    if(!tuval || !defterKonteynır) return;
    if(tuval.width === defterKonteynır.clientWidth && tuval.height === defterKonteynır.clientHeight) return;
    
    // Yeniden boyutlandırmadan önce tuvali yedekle
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = tuval.width;
    tempCanvas.height = tuval.height;
    let tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(tuval, 0, 0);

    tuval.width = defterKonteynır.clientWidth; 
    tuval.height = defterKonteynır.clientHeight; 
    
    // Aktif sayfanın resim verisini çek
    const cizimVerisi = defterSayfalari[aktifSayfaIndex] ? defterSayfalari[aktifSayfaIndex].cizim : "";
    if (cizimVerisi && cizimVerisi !== "data:," && ctx) { 
        const img = new Image(); 
        ctx.globalCompositeOperation = 'source-over'; 
        img.onload = () => { 
            ctx.drawImage(img, 0, 0); 
            if(cizimGecmisi.length === 0) cizimGecmisi.push(cizimVerisi); 
        }; 
        img.src = cizimVerisi; 
    } else {
        ctx.drawImage(tempCanvas, 0, 0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Çoklu sayfa verilerini yükle ve hazırla
    sayfalariYukleVeHazirla();

    // 2. Kılavuz çizgisi ayarlarını yap
    if (defterKagitTabakasi) {
        defterKagitTabakasi.className = sayfaCizgiliMi ? "defter-kagit-efekti mod-cizgili" : "defter-kagit-efekti mod-bos";
    }
    if (defterCizgiToggle) {
        defterCizgiToggle.innerText = sayfaCizgiliMi 
            ? (activeLang === 'en' ? "📝 Lined" : "📝 Çizgili") 
            : (activeLang === 'en' ? "📄 Blank" : "📄 Boş");
    }

    if (defterCizgiToggle) {
        defterCizgiToggle.onclick = (e) => {
            if (e) e.preventDefault();
            sayfaStiliDegistir();
        };
    }
    if (defterModToggle) {
        defterModToggle.onclick = (e) => {
            if (e) e.preventDefault();
            cizimModuToggle();
        };
    }

    const defterWordExportBtn = document.getElementById('defter-word-export-btn');
    if (defterWordExportBtn) {
        defterWordExportBtn.onclick = (e) => {
            if (e) e.preventDefault();
            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            if (!defterSayfalari || defterSayfalari.length === 0) {
                alert(activeLang === 'en' ? "Notebook is empty!" : "Defter boş!");
                return;
            }

            // Create modern modal dynamically
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'word-export-modal';
            modalOverlay.style.position = 'fixed';
            modalOverlay.style.top = '0';
            modalOverlay.style.left = '0';
            modalOverlay.style.width = '100%';
            modalOverlay.style.height = '100%';
            modalOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
            modalOverlay.style.backdropFilter = 'blur(8px)';
            modalOverlay.style.display = 'flex';
            modalOverlay.style.alignItems = 'center';
            modalOverlay.style.justifyContent = 'center';
            modalOverlay.style.zIndex = '99999';
            modalOverlay.style.fontFamily = 'Outfit, sans-serif';

            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = '#ffffff';
            modalContent.style.borderRadius = '16px';
            modalContent.style.padding = '24px';
            modalContent.style.width = '380px';
            modalContent.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
            modalContent.style.border = '1px solid #e2e8f0';

            const isDark = document.body.classList.contains('dark-theme');
            if (isDark) {
                modalContent.style.backgroundColor = '#1e293b';
                modalContent.style.color = '#f8fafc';
                modalContent.style.borderColor = '#334155';
            }

            const totalPages = defterSayfalari.length;

            modalContent.innerHTML = `
                <h3 style="margin-top:0; margin-bottom:16px; font-size:18px; font-weight:700; color: ${isDark ? '#3b82f6' : '#1d4ed8'}">
                    ${activeLang === 'en' ? 'Export to Word (.doc)' : 'Word Belgesine Aktar (.doc)'}
                </h3>
                
                <div style="margin-bottom:16px;">
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; font-size:14px;">
                        <input type="radio" name="export-scope" value="all" checked style="accent-color:#1d4ed8; margin:0;">
                        <span>${activeLang === 'en' ? 'All Pages' : 'Tüm Sayfalar'} (${totalPages})</span>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; font-size:14px;">
                        <input type="radio" name="export-scope" value="current" style="accent-color:#1d4ed8; margin:0;">
                        <span>${activeLang === 'en' ? 'Only Current Page' : 'Sadece Mevcut Sayfa'} (${activeLang === 'en' ? 'Page' : 'Sayfa'} ${aktifSayfaIndex + 1})</span>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer; font-size:14px;">
                        <input type="radio" name="export-scope" value="range" style="accent-color:#1d4ed8; margin:0;">
                        <span>${activeLang === 'en' ? 'Specific Page Range' : 'Belirli Sayfa Aralığı'}</span>
                    </label>
                    
                    <div id="range-inputs" style="display:none; padding-left:24px; gap:8px; align-items:center; margin-bottom:12px; margin-top:8px;">
                        <input type="number" id="range-start" min="1" max="${totalPages}" value="1" style="width:50px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:${isDark ? '#334155' : '#fff'}; color:${isDark ? '#fff' : '#000'}">
                        <span>${activeLang === 'en' ? 'to' : 'ile'}</span>
                        <input type="number" id="range-end" min="1" max="${totalPages}" value="${totalPages}" style="width:50px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:${isDark ? '#334155' : '#fff'}; color:${isDark ? '#fff' : '#000'}">
                        <span>${activeLang === 'en' ? 'pages' : 'arası'}</span>
                    </div>
                </div>

                <div style="border-top:1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-top:12px; margin-bottom:20px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:${isDark ? '#cbd5e1' : '#475569'};">
                        <input type="checkbox" id="skip-empty-pages" checked style="accent-color:#1d4ed8; margin:0;">
                        <span>${activeLang === 'en' ? 'Do not export empty pages' : 'Boş sayfaları aktarma'}</span>
                    </label>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button id="export-cancel-btn" style="padding:8px 16px; border-radius:6px; border:1px solid #cbd5e1; background:${isDark ? '#334155' : '#f8fafc'}; color:${isDark ? '#cbd5e1' : '#475569'}; font-weight:600; cursor:pointer; font-size:13px;">
                        ${activeLang === 'en' ? 'Cancel' : 'İptal'}
                    </button>
                    <button id="export-confirm-btn" style="padding:8px 16px; border-radius:6px; border:none; background:#1d4ed8; color:#fff; font-weight:600; cursor:pointer; font-size:13px;">
                        ${activeLang === 'en' ? 'Export 📥' : 'Aktar 📥'}
                    </button>
                </div>
            `;

            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);

            // Toggle range inputs display
            const radios = modalContent.querySelectorAll('input[name="export-scope"]');
            const rangeInputs = modalContent.querySelector('#range-inputs');
            radios.forEach(r => {
                r.onchange = () => {
                    if (modalContent.querySelector('input[name="export-scope"]:checked').value === 'range') {
                        rangeInputs.style.display = 'flex';
                    } else {
                        rangeInputs.style.display = 'none';
                    }
                };
            });

            // Cancel click
            modalContent.querySelector('#export-cancel-btn').onclick = () => {
                modalOverlay.remove();
            };

            // Confirm click
            modalContent.querySelector('#export-confirm-btn').onclick = () => {
                const scope = modalContent.querySelector('input[name="export-scope"]:checked').value;
                const skipEmpty = modalContent.querySelector('#skip-empty-pages').checked;
                
                let startPage = 1;
                let endPage = totalPages;

                if (scope === 'current') {
                    startPage = aktifSayfaIndex + 1;
                    endPage = aktifSayfaIndex + 1;
                } else if (scope === 'range') {
                    startPage = parseInt(modalContent.querySelector('#range-start').value) || 1;
                    endPage = parseInt(modalContent.querySelector('#range-end').value) || totalPages;

                    if (startPage < 1) startPage = 1;
                    if (endPage > totalPages) endPage = totalPages;
                    if (startPage > endPage) {
                        const temp = startPage;
                        startPage = endPage;
                        endPage = temp;
                    }
                }

                // Filter pages
                const pagesToExport = [];
                for (let i = startPage - 1; i < endPage; i++) {
                    const sayfa = defterSayfalari[i];
                    if (!sayfa) continue;

                    // Check if empty (no text and no drawing)
                    const metinTemiz = (sayfa.metin || "").replace(/<[^>]*>/g, '').trim();
                    const hasDrawing = sayfa.cizim && sayfa.cizim.startsWith('data:image');
                    const isEmpty = (metinTemiz === "" || metinTemiz === "<br>") && !hasDrawing;

                    if (skipEmpty && isEmpty) {
                        continue;
                    }

                    pagesToExport.push({
                        index: i,
                        metin: sayfa.metin,
                        cizim: sayfa.cizim
                    });
                }

                if (pagesToExport.length === 0) {
                    alert(activeLang === 'en' ? "No matching pages found to export!" : "Aktarılacak uygun sayfa bulunamadı!");
                    return;
                }

                // Construct Word HTML structure
                let documentHtml = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset="utf-8">
                    <title>Logbook Defter</title>
                    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            font-size: 11pt;
                            line-height: 1.6;
                            color: #1e293b;
                        }
                        h1 {
                            font-size: 16pt;
                            color: #1d4ed8;
                            border-bottom: 1px solid #e2e8f0;
                            padding-bottom: 6px;
                            margin-top: 20pt;
                        }
                        .page-break {
                            page-break-before: always;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                            display: block;
                            margin: 10px auto;
                        }
                    </style>
                </head>
                <body>
                `;

                pagesToExport.forEach((p, idx) => {
                    if (idx > 0) {
                        documentHtml += `<div class="page-break"></div>`;
                    }
                    documentHtml += `<h1>${activeLang === 'en' ? 'Page' : 'Sayfa'} ${p.index + 1}</h1>`;
                    documentHtml += `<div>${p.metin || ""}</div>`;
                    
                    if (p.cizim && p.cizim.startsWith('data:image')) {
                        documentHtml += `<p style="text-align: center;"><img src="${p.cizim}" alt="Drawing Page ${p.index + 1}"></p>`;
                    }
                });

                documentHtml += `</body></html>`;

                const blob = new Blob(['\ufeff' + documentHtml], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `logbook_defter_${Date.now()}.doc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                modalOverlay.remove();
            };
        };
    }
    
    // 3. Canvası boyutlandır ve ilk sayfayı yükle
    setTimeout(() => {
        tuvaliBoyutlandir();
        sayfayiEkranaYukle(aktifSayfaIndex);
    }, 100);
    window.addEventListener('resize', tuvaliBoyutlandir);

    // 4. Yazı Alanı Giriş Dinleyicisi
    if (defterTextarea) { 
        defterTextarea.oninput = () => {
            defterSayfalari[aktifSayfaIndex].metin = defterTextarea.innerHTML;
            localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
            localStorage.setItem('hub_defter', defterTextarea.innerHTML);
        };
    }

    // 5. Çoklu Sayfa Kontrol Butonları Dinleyicileri
    const sayfaOncekiBtn = document.getElementById('sayfa-onceki-btn');
    const sayfaSonrakiBtn = document.getElementById('sayfa-sonraki-btn');
    const sayfaEkleBtn = document.getElementById('sayfa-ekle-btn');
    const sayfaSilBtn = document.getElementById('sayfa-sil-btn');

    if (sayfaOncekiBtn) {
        sayfaOncekiBtn.onclick = () => {
            if (aktifSayfaIndex > 0) {
                sayfayiKaydet(aktifSayfaIndex);
                aktifSayfaIndex--;
                localStorage.setItem('hub_defter_aktif_sayfa_index', aktifSayfaIndex);
                sayfayiEkranaYukle(aktifSayfaIndex);
            }
        };
    }

    if (sayfaSonrakiBtn) {
        sayfaSonrakiBtn.onclick = () => {
            if (aktifSayfaIndex < defterSayfalari.length - 1) {
                sayfayiKaydet(aktifSayfaIndex);
                aktifSayfaIndex++;
                localStorage.setItem('hub_defter_aktif_sayfa_index', aktifSayfaIndex);
                sayfayiEkranaYukle(aktifSayfaIndex);
            }
        };
    }

    if (sayfaEkleBtn) {
        sayfaEkleBtn.onclick = () => {
            sayfayiKaydet(aktifSayfaIndex);
            defterSayfalari.push({ metin: "", cizim: "" });
            localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
            aktifSayfaIndex = defterSayfalari.length - 1;
            localStorage.setItem('hub_defter_aktif_sayfa_index', aktifSayfaIndex);
            sayfayiEkranaYukle(aktifSayfaIndex);
        };
    }

    if (sayfaSilBtn) {
        sayfaSilBtn.onclick = () => {
            if (defterSayfalari.length === 1) {
                if (confirm(activeLang === 'en' 
                    ? "Do you want to reset this single page?" 
                    : "Bu tek sayfayı sıfırlamak istiyor musunuz?")) {
                    if (defterTextarea) defterTextarea.innerHTML = "";
                    if (ctx && tuval) ctx.clearRect(0, 0, tuval.width, tuval.height);
                    cizimGecmisi = [];
                    defterSayfalari[0] = { metin: "", cizim: "" };
                    localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                    localStorage.removeItem('hub_defter');
                    localStorage.removeItem('hub_hibrit_canvas_resmi');
                    aktifSayfaIndex = 0;
                    localStorage.setItem('hub_defter_aktif_sayfa_index', aktifSayfaIndex);
                    sayfayiEkranaYukle(0);
                }
            } else {
                if (confirm(activeLang === 'en' 
                    ? "Are you sure you want to completely delete this page?" 
                    : "Bu sayfayı tamamen silmek istediğinize emin misiniz?")) {
                    defterSayfalari.splice(aktifSayfaIndex, 1);
                    if (aktifSayfaIndex >= defterSayfalari.length) {
                        aktifSayfaIndex = defterSayfalari.length - 1;
                    }
                    localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                    localStorage.setItem('hub_defter_aktif_sayfa_index', aktifSayfaIndex);
                    sayfayiEkranaYukle(aktifSayfaIndex);
                }
            }
        };
    }

    // Defter Manuel Kaydet Butonu
    const defterKaydetBtn = document.getElementById('defter-kaydet-btn');
    if (defterKaydetBtn) {
        defterKaydetBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof sayfayiKaydet === 'function') {
                sayfayiKaydet(aktifSayfaIndex);
                
                // Visual feedback overlay
                let flash = document.getElementById('save-flash-indicator');
                if (!flash) {
                    flash = document.createElement('div');
                    flash.id = 'save-flash-indicator';
                    flash.style.position = 'fixed';
                    flash.style.bottom = '20px';
                    flash.style.right = '20px';
                    flash.style.backgroundColor = '#10b981';
                    flash.style.color = '#fff';
                    flash.style.padding = '10px 20px';
                    flash.style.borderRadius = '30px';
                    flash.style.fontSize = '14px';
                    flash.style.fontWeight = 'bold';
                    flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    flash.style.zIndex = '99999';
                    flash.style.pointerEvents = 'none';
                    flash.style.transition = 'opacity 0.3s ease';
                    document.body.appendChild(flash);
                }
                flash.innerText = activeLang === 'en' ? "Notebook Saved! 💾" : "Defter Kaydedildi! 💾";
                flash.style.opacity = '1';
                setTimeout(() => {
                    flash.style.opacity = '0';
                }, 1200);
            }
        };
    }

    // 6. Canvas Çizim Olay Dinleyicileri
    if (tuval && ctx) {
        const fircaRenk = document.getElementById('firca-renk'); 
        const fircaBoyut = document.getElementById('firca-boyut'); 
        const boyutEtiket = document.getElementById('boyut-etiket'); 
        const resimYukle = document.getElementById('resim-yukle'); 
        const defteriTemizleBtn = document.getElementById('defteri-temizle-btn');
        
        if(fircaBoyut) {
            fircaBoyut.oninput = () => boyutEtiket.innerText = fircaBoyut.value + "px";
        }
        
        tuval.addEventListener('mousedown', (e) => { 
            if(!cizimModuAktif) return; 
            cizimYapiyorMu = true; 
            ctx.beginPath(); 
            ctx.moveTo(e.clientX - tuval.getBoundingClientRect().left, e.clientY - tuval.getBoundingClientRect().top); 
        });
        
        tuval.addEventListener('mousemove', (e) => { 
            if (!cizimYapiyorMu || !cizimModuAktif) return; 
            ctx.lineTo(e.clientX - tuval.getBoundingClientRect().left, e.clientY - tuval.getBoundingClientRect().top); 
            if(silgiModuAktif) { 
                ctx.globalCompositeOperation = 'destination-out'; 
                ctx.lineWidth = fircaBoyut.value * 2; 
            } else { 
                ctx.globalCompositeOperation = 'source-over'; 
                ctx.strokeStyle = fircaRenk.value; 
                ctx.lineWidth = fircaBoyut.value; 
            }
            ctx.lineCap = "round"; 
            ctx.stroke(); 
        });
        
        tuval.addEventListener('mouseup', () => { 
            if(cizimYapiyorMu) {
                cizimYapiyorMu = false; 
                const dataUrl = tuval.toDataURL('image/webp', 0.6);
                cizimGecmisi.push(dataUrl); 
                // Aktif sayfaya çizimi kaydet
                defterSayfalari[aktifSayfaIndex].cizim = dataUrl;
                localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                localStorage.setItem('hub_hibrit_canvas_resmi', dataUrl);
            }
        });
        tuval.addEventListener('mouseleave', () => cizimYapiyorMu = false);
        
        if (defterUndoBtn) { 
            defterUndoBtn.onclick = (e) => { e.preventDefault(); cizimiGeriAl(); }; 
        }

        if(resimYukle) {
            resimYukle.onchange = (e) => { 
                const dosya = e.target.files[0]; 
                if (!dosya) return; 
                const reader = new FileReader(); 
                reader.onload = (event) => { 
                    const dataUrl = event.target.result;
                    if (cizimModuAktif) {
                        const img = new Image(); 
                        img.onload = () => { 
                            let oran = Math.min(tuval.width / img.width, tuval.height / img.height) * 0.6; 
                            let yeniW = img.width * oran; 
                            let yeniH = img.height * oran; 
                            ctx.globalCompositeOperation = 'source-over'; 
                            ctx.drawImage(img, (tuval.width - yeniW) / 2, (tuval.height - yeniH) / 2, yeniW, yeniH); 
                            
                            const dataUrlCanvas = tuval.toDataURL('image/webp', 0.6); 
                            cizimGecmisi.push(dataUrlCanvas); 
                            defterSayfalari[aktifSayfaIndex].cizim = dataUrlCanvas;
                            localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                            localStorage.setItem('hub_hibrit_canvas_resmi', dataUrlCanvas);
                        }; 
                        img.src = dataUrl;
                    } else {
                        if (defterTextarea) {
                            defterTextarea.focus();
                            const imgNode = document.createElement('img');
                            imgNode.src = dataUrl;
                            imgNode.style.maxWidth = '100%';
                            imgNode.style.display = 'block';
                            imgNode.style.margin = '10px auto';
                            imgNode.style.borderRadius = '6px';
                            imgNode.style.cursor = 'pointer';
                            
                            const sel = window.getSelection();
                            if (sel.getRangeAt && sel.rangeCount) {
                                const range = sel.getRangeAt(0);
                                if (defterTextarea.contains(range.commonAncestorContainer)) {
                                    range.deleteContents();
                                    range.insertNode(imgNode);
                                    range.setStartAfter(imgNode);
                                    range.setEndAfter(imgNode);
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                } else {
                                    defterTextarea.appendChild(imgNode);
                                }
                            } else {
                                defterTextarea.appendChild(imgNode);
                            }
                            defterTextarea.oninput();
                        }
                    }
                    resimYukle.value = '';
                }; 
                reader.readAsDataURL(dosya); 
            };
        }

        // Drag & Drop Görsel Sürükleme Desteği
        const yaprak = document.querySelector('.hibrit-defter-yapraki');
        if (yaprak) {
            yaprak.addEventListener('dragover', (e) => {
                e.preventDefault();
                yaprak.style.borderColor = '#3b82f6';
                yaprak.style.borderStyle = 'dashed';
            });
            yaprak.addEventListener('dragenter', (e) => {
                e.preventDefault();
            });
            yaprak.addEventListener('dragleave', () => {
                yaprak.style.borderColor = '#e2e8f0';
                yaprak.style.borderStyle = 'solid';
            });
            yaprak.addEventListener('drop', (e) => {
                e.preventDefault();
                yaprak.style.borderColor = '#e2e8f0';
                yaprak.style.borderStyle = 'solid';
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const dataUrl = event.target.result;
                        if (cizimModuAktif) {
                            const img = new Image();
                            img.onload = () => {
                                let oran = Math.min(tuval.width / img.width, tuval.height / img.height) * 0.6; 
                                let yeniW = img.width * oran; 
                                let yeniH = img.height * oran; 
                                ctx.globalCompositeOperation = 'source-over'; 
                                ctx.drawImage(img, (tuval.width - yeniW) / 2, (tuval.height - yeniH) / 2, yeniW, yeniH); 
                                
                                const dataUrlCanvas = tuval.toDataURL('image/webp', 0.6); 
                                cizimGecmisi.push(dataUrlCanvas); 
                                defterSayfalari[aktifSayfaIndex].cizim = dataUrlCanvas;
                                localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                                localStorage.setItem('hub_hibrit_canvas_resmi', dataUrlCanvas);
                            }; 
                            img.src = dataUrl;
                        } else {
                            if (defterTextarea) {
                                const imgNode = document.createElement('img');
                                imgNode.src = dataUrl;
                                imgNode.style.maxWidth = '100%';
                                imgNode.style.display = 'block';
                                imgNode.style.margin = '10px auto';
                                imgNode.style.borderRadius = '6px';
                                imgNode.style.cursor = 'pointer';
                                defterTextarea.appendChild(imgNode);
                                defterTextarea.oninput();
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if(defteriTemizleBtn) {
            defteriTemizleBtn.onclick = () => { 
                if(confirm(activeLang === 'en' 
                    ? "Do you want to clear the entire page?" 
                    : "Tüm sayfayı temizlemek istiyor musunuz?")) { 
                    if(defterTextarea) defterTextarea.innerHTML = ""; 
                    ctx.clearRect(0, 0, tuval.width, tuval.height); 
                    cizimGecmisi = []; 
                    defterSayfalari[aktifSayfaIndex] = { metin: "", cizim: "" };
                    localStorage.setItem('hub_defter_sayfalar', JSON.stringify(defterSayfalari));
                    localStorage.removeItem('hub_defter'); 
                    localStorage.removeItem('hub_hibrit_canvas_resmi'); 
                    sayfayiEkranaYukle(aktifSayfaIndex);
                } 
            };
        }
    }

    // --- Web Speech API (Sesle Yazma) Entegrasyonu ---
    const defterSesBtn = document.getElementById('defter-ses-btn');
    let defterRecording = false;
    let defterRec = null;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRec && defterSesBtn) {
        defterRec = new SpeechRec();
        defterRec.lang = 'tr-TR';
        defterRec.interimResults = false;
        defterRec.maxAlternatives = 1;
        
        defterRec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (defterTextarea) {
                defterTextarea.focus();
                const sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    if (defterTextarea.contains(range.commonAncestorContainer)) {
                        range.deleteContents();
                        const textNode = document.createTextNode((range.startOffset > 0 ? " " : "") + transcript);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        defterTextarea.innerHTML += (defterTextarea.innerHTML.length > 0 ? " " : "") + transcript;
                    }
                } else {
                    defterTextarea.innerHTML += (defterTextarea.innerHTML.length > 0 ? " " : "") + transcript;
                }
                
                // Otomatik kaydetmeyi tetikle
                defterTextarea.oninput();
            }
        };
        
        defterRec.onerror = (err) => {
            console.error("Defter ses tanıma hatası:", err);
            defterSesBtn.classList.remove('ses-aktif-btn');
            defterSesBtn.innerText = "🎙️ Sesle";
            defterRecording = false;
        };
        
        defterRec.onend = () => {
            defterSesBtn.classList.remove('ses-aktif-btn');
            defterSesBtn.innerText = "🎙️ Sesle";
            defterRecording = false;
        };
        
        defterSesBtn.onclick = (e) => {
            e.preventDefault();
            if (defterRecording) {
                defterRec.stop();
            } else {
                defterSesBtn.classList.add('ses-aktif-btn');
                defterSesBtn.innerText = "🔴 Dinliyor";
                defterRecording = true;
                defterRec.start();
            }
        };
    }

    // Voice Memo (MediaRecorder) Capture for Notebook
    const defterSesMemoBtn = document.getElementById('defter-ses-memo-btn');
    let defterMediaRecorder = null;
    let defterAudioChunks = [];
    let isDefterRecordingMemo = false;
    let defterMemoTimerInterval = null;
    let defterMemoSeconds = 0;

    if (defterSesMemoBtn) {
        defterSesMemoBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isDefterRecordingMemo) {
                stopDefterRecordingMemo();
            } else {
                startDefterRecordingMemo();
            }
        });
    }

    async function startDefterRecordingMemo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            defterAudioChunks = [];
            
            let options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/ogg' };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = {};
            }

            defterMediaRecorder = new MediaRecorder(stream, options);
            defterMediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    defterAudioChunks.push(event.data);
                }
            };

            defterMediaRecorder.onstop = async () => {
                const audioBlob = new Blob(defterAudioChunks, { type: defterMediaRecorder.mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Data = reader.result;
                    insertDefterAudioElement(base64Data);
                };
                
                stream.getTracks().forEach(track => track.stop());
            };

            defterMediaRecorder.start();
            isDefterRecordingMemo = true;
            defterSesMemoBtn.classList.add('pulse-recording');
            
            defterMemoSeconds = 0;
            defterMemoTimerInterval = setInterval(() => {
                defterMemoSeconds++;
                defterSesMemoBtn.innerText = `🛑 ${defterMemoSeconds}sn`;
                if (defterMemoSeconds >= 30) {
                    stopDefterRecordingMemo();
                }
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            alert(activeLang === 'en' 
                ? "Microphone access is required to record voice memos." 
                : "Ses kaydı yapabilmek için mikrofon erişimine izin vermelisiniz.");
        }
    }

    function stopDefterRecordingMemo() {
        if (defterMediaRecorder && defterMediaRecorder.state !== 'inactive') {
            defterMediaRecorder.stop();
        }
        isDefterRecordingMemo = false;
        if (defterSesMemoBtn) {
            defterSesMemoBtn.innerText = activeLang === 'en' ? '🎤 Record' : '🎤 Kaydet';
            defterSesMemoBtn.classList.remove('pulse-recording');
        }
        clearInterval(defterMemoTimerInterval);
    }

    function insertDefterAudioElement(base64Data) {
        if (defterTextarea) {
            defterTextarea.focus();
            const audioHTML = `<br><audio controls src="${base64Data}" style="max-width:100%; margin: 8px 0; display: block;"></audio><br>`;
            
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (defterTextarea.contains(range.commonAncestorContainer)) {
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
                    defterTextarea.innerHTML += audioHTML;
                }
            } else {
                defterTextarea.innerHTML += audioHTML;
            }
            defterTextarea.oninput();
        }
    }
});

// 7. Kısayol Tuşları (Undo, Save)
function defterKisayolYoneticisi(e) {
    const isS = e.keyCode === 83 || (e.key && e.key.toLowerCase() === 's') || e.code === 'KeyS';
    const isZ = e.keyCode === 90 || (e.key && e.key.toLowerCase() === 'z') || e.code === 'KeyZ';
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    
    if (isCmdOrCtrl && isZ) {
        if (document.activeElement && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault(); 
            if (typeof cizimiGeriAl === 'function') cizimiGeriAl();
        }
    }
    
    if (isCmdOrCtrl && isS) {
        e.preventDefault();
        if (typeof sayfayiKaydet === 'function' && typeof aktifSayfaIndex !== 'undefined') {
            sayfayiKaydet(aktifSayfaIndex);
            
            // Visual feedback overlay
            let flash = document.getElementById('save-flash-indicator');
            if (!flash) {
                flash = document.createElement('div');
                flash.id = 'save-flash-indicator';
                flash.style.position = 'fixed';
                flash.style.bottom = '20px';
                flash.style.right = '20px';
                flash.style.backgroundColor = '#10b981'; // Green color for success
                flash.style.color = '#fff';
                flash.style.padding = '10px 20px';
                flash.style.borderRadius = '30px';
                flash.style.fontSize = '14px';
                flash.style.fontWeight = 'bold';
                flash.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                flash.style.zIndex = '99999';
                flash.style.pointerEvents = 'none';
                flash.style.transition = 'opacity 0.3s ease';
                document.body.appendChild(flash);
            }
            flash.innerText = activeLang === 'en' ? "Notebook Saved! 💾" : "Defter Kaydedildi! 💾";
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.opacity = '0';
            }, 1200);
        }
    }
}

document.addEventListener('keydown', defterKisayolYoneticisi);
if (defterTextarea) {
    defterTextarea.addEventListener('keydown', defterKisayolYoneticisi);
}

// Advanced Defter Context Menu for Images & Text
let defterImageMenu = document.getElementById('defter-image-context-menu');
let defterTextMenu = document.getElementById('defter-text-context-menu');

if (!defterImageMenu) {
    defterImageMenu = document.createElement('div');
    defterImageMenu.id = 'defter-image-context-menu';
    defterImageMenu.style.cssText = 'display: none; position: absolute; z-index: 10000; background: #fff; border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); padding: 4px; min-width: 155px; font-family: "Outfit", sans-serif; font-size: 11px;';
    
    defterImageMenu.innerHTML = `
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Sizing' : 'Boyutlandırma'}</div>
        <div class="menu-item" data-size="30%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔍 ${activeLang === 'en' ? 'Small (%30)' : 'Küçük (%30)'}</div>
        <div class="menu-item" data-size="60%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">⚖️ ${activeLang === 'en' ? 'Medium (%60)' : 'Orta (%60)'}</div>
        <div class="menu-item" data-size="100%" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔎 ${activeLang === 'en' ? 'Large (%100)' : 'Büyük (%100)'}</div>
        <div class="menu-item" data-action="custom-size" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${activeLang === 'en' ? 'Custom Size...' : 'Elle Boyut Gir...'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Alignment' : 'Hizalama / Duruş'}</div>
        <div class="menu-item" data-align="block" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">📝 ${activeLang === 'en' ? 'Block (Center)' : 'Blok (Ortala)'}</div>
        <div class="menu-item" data-align="inline" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔗 ${activeLang === 'en' ? 'Inline' : 'Satır İçi'}</div>
        <div class="menu-item" data-align="left" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">👈 ${activeLang === 'en' ? 'Float Left' : 'Sola Yasla'}</div>
        <div class="menu-item" data-align="right" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">👉 ${activeLang === 'en' ? 'Float Right' : 'Sağa Yasla'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div class="menu-item" data-action="delete" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #ef4444; font-weight: bold;">🗑️ ${activeLang === 'en' ? 'Delete Image' : 'Resmi Sil'}</div>
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `
        #defter-image-context-menu .menu-item:hover, #defter-text-context-menu .menu-item:hover { background-color: #f1f5f9; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(defterImageMenu);
}

if (!defterTextMenu) {
    defterTextMenu = document.createElement('div');
    defterTextMenu.id = 'defter-text-context-menu';
    defterTextMenu.style.cssText = 'display: none; position: absolute; z-index: 10000; background: #fff; border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); padding: 4px; min-width: 155px; font-family: "Outfit", sans-serif; font-size: 11px;';
    
    defterTextMenu.innerHTML = `
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Format' : 'Biçim'}</div>
        <div class="menu-item" data-command="bold" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><b>B</b> ${activeLang === 'en' ? 'Bold' : 'Kalın'}</div>
        <div class="menu-item" data-command="italic" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><i>I</i> ${activeLang === 'en' ? 'Italic' : 'İtalik'}</div>
        <div class="menu-item" data-command="underline" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;"><u>U</u> ${activeLang === 'en' ? 'Underline' : 'Altı Çizili'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Size' : 'Boyut'}</div>
        <div class="menu-item" data-command="font-size-percent" data-value="14px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔍 14px</div>
        <div class="menu-item" data-command="font-size-percent" data-value="18px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">⚖️ 18px</div>
        <div class="menu-item" data-command="font-size-percent" data-value="22px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔎 22px</div>
        <div class="menu-item" data-command="font-size-percent" data-value="28px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🚀 28px</div>
        <div class="menu-item" data-command="font-size-percent" data-value="36px" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">💥 36px</div>
        <div class="menu-item" data-command="custom-font-size" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${activeLang === 'en' ? 'Custom Size...' : 'Elle Boyut Gir...'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Font' : 'Yazı Tipi'}</div>
        <div class="menu-item" data-command="fontName" data-value="Outfit" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Outfit</div>
        <div class="menu-item" data-command="fontName" data-value="Georgia" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Serif (Georgia)</div>
        <div class="menu-item" data-command="fontName" data-value="Courier New" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Monospace</div>
        <div class="menu-item" data-command="fontName" data-value="Arial" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Arial</div>
        <div class="menu-item" data-command="fontName" data-value="Times New Roman" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Times</div>
        <div class="menu-item" data-command="fontName" data-value="Comic Sans MS" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Comic Sans</div>
        <div class="menu-item" data-command="fontName" data-value="Impact" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">Impact</div>
        <div class="menu-item" data-command="custom-font-name" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${activeLang === 'en' ? 'Custom Font...' : 'Yazı Tipi Gir...'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div style="font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #333;">${activeLang === 'en' ? 'Color' : 'Renk'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#ef4444" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔴 ${activeLang === 'en' ? 'Red' : 'Kırmızı'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#10b981" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟢 ${activeLang === 'en' ? 'Green' : 'Yeşil'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#3b82f6" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🔵 ${activeLang === 'en' ? 'Blue' : 'Mavi'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#f59e0b" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟡 ${activeLang === 'en' ? 'Yellow' : 'Sarı'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#8b5cf6" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟣 ${activeLang === 'en' ? 'Purple' : 'Mor'}</div>
        <div class="menu-item" data-command="foreColor" data-value="#f97316" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #333;">🟠 ${activeLang === 'en' ? 'Orange' : 'Turuncu'}</div>
        <div class="menu-item" data-command="custom-fore-color" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #3b82f6; font-weight: bold;">✏️ ${activeLang === 'en' ? 'Custom Color...' : 'Renk Seç...'}</div>
        
        <div style="height: 1px; background: #eee; margin: 4px 0;"></div>
        
        <div class="menu-item" data-command="removeFormat" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; color: #ef4444; font-weight: bold;">🧹 ${activeLang === 'en' ? 'Clear Style' : 'Biçimi Temizle'}</div>
        <input type="color" id="defter-hidden-color-picker" style="display: none; visibility: hidden; width: 0; height: 0; padding: 0; border: none;">
    `;
    document.body.appendChild(defterTextMenu);
}

function showDefterMenuSmartly(menuEl, clientX, clientY) {
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

let activeDefterImage = null;
if (defterTextarea) {
    defterTextarea.addEventListener('contextmenu', (e) => {
        if (cizimModuAktif) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        defterImageMenu.style.display = 'none';
        defterTextMenu.style.display = 'none';
        
        if (e.target.tagName === 'IMG') {
            activeDefterImage = e.target;
            showDefterMenuSmartly(defterImageMenu, e.clientX, e.clientY);
        } else {
            showDefterMenuSmartly(defterTextMenu, e.clientX, e.clientY);
        }
    });

    // Paste handler for inline image pasting inside defterTextarea
    defterTextarea.addEventListener('paste', (e) => {
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
                    const imgNode = document.createElement('img');
                    imgNode.src = event.target.result;
                    imgNode.style.maxWidth = '100%';
                    imgNode.style.display = 'block';
                    imgNode.style.margin = '10px auto';
                    imgNode.style.borderRadius = '6px';
                    imgNode.style.cursor = 'pointer';
                    
                    const sel = window.getSelection();
                    if (sel.getRangeAt && sel.rangeCount) {
                        const range = sel.getRangeAt(0);
                        if (defterTextarea.contains(range.commonAncestorContainer)) {
                            range.deleteContents();
                            range.insertNode(imgNode);
                            range.setStartAfter(imgNode);
                            range.setEndAfter(imgNode);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } else {
                            defterTextarea.appendChild(imgNode);
                        }
                    } else {
                        defterTextarea.appendChild(imgNode);
                    }
                    defterTextarea.oninput();
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

document.addEventListener('click', () => {
    if (defterImageMenu) defterImageMenu.style.display = 'none';
    if (defterTextMenu) defterTextMenu.style.display = 'none';
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
    defterTextarea.oninput();
}

// Bind Image Menu Clicks
if (defterImageMenu) {
    defterImageMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeDefterImage) return;
            
            const size = item.dataset.size;
            const align = item.dataset.align;
            const action = item.dataset.action;
            
            if (size) {
                activeDefterImage.style.width = size;
            }
            if (action === 'custom-size') {
                const manual = prompt(activeLang === 'en' 
                    ? "Enter image width (e.g. 250px or 50%):" 
                    : "Resim genişliğini girin (örn: 250px veya %50):", activeDefterImage.style.width || "300px");
                if (manual && manual.trim() !== "") {
                    activeDefterImage.style.width = manual.trim();
                }
            }
            if (align) {
                if (align === 'block') {
                    activeDefterImage.style.display = 'block';
                    activeDefterImage.style.margin = '10px auto';
                    activeDefterImage.style.float = 'none';
                } else if (align === 'inline') {
                    activeDefterImage.style.display = 'inline-block';
                    activeDefterImage.style.margin = '5px';
                    activeDefterImage.style.float = 'none';
                } else if (align === 'left') {
                    activeDefterImage.style.display = 'block';
                    activeDefterImage.style.float = 'left';
                    activeDefterImage.style.margin = '10px 15px 10px 0';
                } else if (align === 'right') {
                    activeDefterImage.style.display = 'block';
                    activeDefterImage.style.float = 'right';
                    activeDefterImage.style.margin = '10px 0 10px 15px';
                }
            }
            if (action === 'delete') {
                if (confirm(activeLang === 'en' ? "Delete this image?" : "Bu resmi silmek istiyor musunuz?")) {
                    activeDefterImage.remove();
                }
            }
            
            defterTextarea.oninput();
            defterImageMenu.style.display = 'none';
        });
    });
}

// Bind Text Menu Clicks
if (defterTextMenu) {
    defterTextMenu.querySelectorAll('.menu-item').forEach(item => {
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
                const picker = document.getElementById('defter-hidden-color-picker');
                if (picker) {
                    picker.onchange = () => {
                        applySelectionStyle('color', picker.value);
                    };
                    picker.click();
                }
            } else if (command) {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand(command, false, value || null);
                defterTextarea.oninput();
            }
            
            defterTextMenu.style.display = 'none';
        });
    });
}
