// --- FİNANS MOTORU ---
const activeLang = localStorage.getItem('hub_lang') || 'tr';
let KURLAR = { "TL": 1.0, "PLN": 12.55, "EUR": 53.25, "USD": 46.10, "ALTIN": 6038.0 }; 
const PARA_SIMGELERI = { "TL": "₺", "PLN": "zł", "EUR": "€", "USD": "$", "ALTIN": "gr" };
const gunIsimleriUzun = activeLang === 'en'
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// Predefined colors for common categories
const KATEGORI_RENKLERI = {
    "Market": "#f59e0b",    // Amber
    "Ulaşım": "#10b981",    // Emerald
    "Eğlence": "#ec4899",   // Pink
    "Eğitim": "#3b82f6",    // Blue
    "Sağlık": "#ef4444",    // Red
    "Faturalar": "#f97316",  // Orange
    "Diğer": "#64748b"      // Slate
};

let trendChartInstance = null; // Store chart instance globally to prevent canvas leaks

// Generates a stable unique color based on custom category name
function kategoriRenkAl(kategori) {
    if (KATEGORI_RENKLERI[kategori]) return KATEGORI_RENKLERI[kategori];
    let hash = 0;
    for (let i = 0; i < kategori.length; i++) {
        hash = kategori.charCodeAt(i) + ((hash << 5) - hash);
    }
    let c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    let colorHex = "#" + "00000".substring(0, 6 - c.length) + c;
    return colorHex;
}

const kategoriCeviri = {
    "Market": "Market",
    "Ulaşım": "Transportation",
    "Eğlence": "Entertainment",
    "Eğitim": "Education",
    "Sağlık": "Health",
    "Faturalar": "Bills",
    "Diğer": "Other"
};

const reverseKategoriCeviri = {
    "Market": "Market",
    "Transportation": "Ulaşım",
    "Entertainment": "Eğlence",
    "Education": "Eğitim",
    "Health": "Sağlık",
    "Bills": "Faturalar",
    "Other": "Diğer"
};

function translateDonem(donemVal) {
    if (!donemVal) return "";
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const trMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    for (let i = 0; i < 12; i++) {
        if (donemVal.startsWith(trMonths[i])) {
            if (activeLang === 'en') {
                return donemVal.replace(trMonths[i], enMonths[i]);
            }
            return donemVal;
        }
        if (donemVal.startsWith(enMonths[i])) {
            if (activeLang === 'tr') {
                return donemVal.replace(enMonths[i], trMonths[i]);
            }
            return donemVal;
        }
    }
    return donemVal;
}

let harcamaListesi = JSON.parse(localStorage.getItem('hub_harcama_zaman_listesi') || '[]');

// Göç (Migration): Eski harcama verilerinde kategori alanı yoksa "Diğer" ata
let gocYapildiMi = false;
harcamaListesi.forEach(h => {
    if (!h.kategori) {
        h.kategori = "Diğer";
        gocYapildiMi = true;
    }
});
if (gocYapildiMi) {
    localStorage.setItem('hub_harcama_zaman_listesi', JSON.stringify(harcamaListesi));
}

const harcamaAdInput = document.getElementById('harcama-ad'); 
const harcamaMiktarInput = document.getElementById('harcama-miktar'); 
const harcamaKurSelect = document.getElementById('harcama-kur'); 
const harcamaKategoriInput = document.getElementById('harcama-kategori');
const harcamaEkleBtn = document.getElementById('harcama-ekle-btn'); 
const harcamaTabloGovde = document.getElementById('harcama-tablo-govde');

// Alt Sekmeler Arası Geçiş Motoru
function finansAltSekmeDegistir(sekmeId) {
    const butceAlan = document.getElementById('finans-butce-alan');
    const dovizAlan = document.getElementById('finans-doviz-alan');
    const btnButce = document.getElementById('btn-finans-butce');
    const btnDoviz = document.getElementById('btn-finans-doviz');
    
    if (sekmeId === 'doviz') {
        if (butceAlan) butceAlan.style.display = 'none';
        if (dovizAlan) dovizAlan.style.display = 'block';
        if (btnButce) btnButce.classList.remove('active');
        if (btnDoviz) btnDoviz.classList.add('active');
        pariteMatrisiCiz();
        dovizCeviriciCiz();
        setTimeout(trendGrafigiCiz, 50); // Redraw trend graph in currency view
    } else {
        if (butceAlan) butceAlan.style.display = 'flex';
        if (dovizAlan) dovizAlan.style.display = 'none';
        if (btnButce) btnButce.classList.add('active');
        if (btnDoviz) btnDoviz.classList.remove('active');
    }
    
    localStorage.setItem('hub_finans_aktif_alt_sekme', sekmeId);
}

window.finansAltSekmeDegistir = finansAltSekmeDegistir;

// Kategorileri Otomatik Tamamlama (Datalist) Listesine Yükle
function kategorileriGuncelle() {
    try {
        harcamaListesi = JSON.parse(localStorage.getItem('hub_harcama_zaman_listesi') || '[]');
    } catch(e) {}
    
    const datalist = document.getElementById('kategori-listesi');
    if (!datalist) return;
    
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const varsayilanKategoriler = ["Market", "Ulaşım", "Eğlence", "Eğitim", "Sağlık", "Faturalar", "Diğer"];
    const benzersizKategoriler = new Set(varsayilanKategoriler);
    
    harcamaListesi.forEach(h => {
        if (h.kategori && h.kategori.trim() !== "") {
            benzersizKategoriler.add(h.kategori.trim());
        }
    });
    
    datalist.innerHTML = "";
    benzersizKategoriler.forEach(k => {
        const opt = document.createElement('option');
        const displayK = activeLang === 'en' ? (kategoriCeviri[k] || k) : k;
        opt.value = displayK;
        datalist.appendChild(opt);
    });
}

// Canlı Kurları Al ve Çapraz Matrisi Güncelle
async function canliKurlariGetir() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR');
        if (!response.ok) throw new Error("Kur servisi yanıt vermedi.");
        const data = await response.json();
        
        if (data && data.rates) {
            const eurToTry = data.rates["TRY"];
            const eurToPln = data.rates["PLN"];
            const eurToUsd = data.rates["USD"];
            
            if (eurToTry && eurToPln && eurToUsd) {
                KURLAR["EUR"] = eurToTry;
                KURLAR["USD"] = eurToTry / eurToUsd;
                KURLAR["PLN"] = eurToTry / eurToPln;
                console.log("🔄 Canlı Döviz Kurları Güncellendi:", KURLAR);
            }
        }
    } catch (err) {
        console.warn("⚠️ Canlı kurlar alınamadı, sabit kurlar devrede:", err.message);
    }

    // Canlı Altın Kuru (CoinGecko PAX Gold -> Gram Altın)
    try {
        const goldResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd,try');
        if (goldResponse.ok) {
            const goldData = await goldResponse.json();
            if (goldData && goldData["pax-gold"]) {
                const ouncesInTry = goldData["pax-gold"]["try"];
                if (ouncesInTry) {
                    const gramInTry = ouncesInTry / 31.1034768; // 1 troy ounce = 31.1034768 grams
                    KURLAR["ALTIN"] = Number(gramInTry.toFixed(4));
                    console.log("🔄 Canlı Altın Kuru Güncellendi (Gram):", KURLAR["ALTIN"]);
                }
            }
        }
    } catch (goldErr) {
        console.warn("⚠️ Canlı altın kuru alınamadı, sabit kur devrede:", goldErr.message);
    }
    
    zamanAnaliziHesapla();
    pariteMatrisiCiz();
    dovizCeviriciCiz();
    canliKuruGecmiseEkle();
    trendGrafigiCiz();
}

// Çapraz Parite Matrisini Çiz
function pariteMatrisiCiz() {
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const birimler = ["TL", "PLN", "EUR", "USD", "ALTIN"];
    const baslik = document.getElementById('doviz-matris-baslik');
    const govde = document.getElementById('doviz-matris-govde');
    if (!baslik || !govde) return;
    
    const displayBirim = (b) => {
        if (b === "ALTIN") return activeLang === 'en' ? "GOLD" : "ALTIN";
        return b;
    };
    
    const headerTitle = activeLang === 'en' ? "Unit" : "Birim";
    baslik.innerHTML = `<th id="doviz-matris-baslik-birim">${headerTitle}</th>` + birimler.map(b => `<th>${displayBirim(b)}</th>`).join("");
    
    govde.innerHTML = "";
    birimler.forEach(satirBirim => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="font-weight: bold; background: rgba(0,0,0,0.02);">${displayBirim(satirBirim)}</td>`;
        
        birimler.forEach(sutunBirim => {
            let oran = 1.0;
            if (satirBirim !== sutunBirim) {
                const satirTL = KURLAR[satirBirim] || 1.0;
                const sutunTL = KURLAR[sutunBirim] || 1.0;
                oran = satirTL / sutunTL;
            }
            
            let tdText = oran.toFixed(4);
            if (satirBirim === sutunBirim) tdText = "1.0000";
            
            const cellStyle = satirBirim === sutunBirim 
                ? "color: #94a3b8; font-weight: normal; background: rgba(0,0,0,0.01);" 
                : "font-weight: 600; color: #3b82f6;";
                
            tr.innerHTML += `<td style="${cellStyle}">${tdText}</td>`;
        });
        govde.appendChild(tr);
    });
}

// Döviz Çeviri Hesap Makinesini Çiz ve İşlevini Bağla
function dovizCeviriciCiz() {
    const grid = document.getElementById('doviz-cevirici-grid');
    if (!grid) return;
    
    // Yalnızca ilk kez boşsa yapılandırıp çizelim
    if (grid.children.length === 0) {
        const activeLang = localStorage.getItem('hub_lang') || 'tr';
        const birimTanimlari = {
            "TL": { ad: activeLang === 'en' ? "Turkish Lira" : "Türk Lirası", simge: "₺", format: 2 },
            "USD": { ad: activeLang === 'en' ? "US Dollar" : "ABD Doları", simge: "$", format: 2 },
            "EUR": { ad: "Euro", simge: "€", format: 2 },
            "PLN": { ad: activeLang === 'en' ? "Polish Zloty" : "Polonya Zlotisi", simge: "zł", format: 2 },
            "ALTIN": { ad: activeLang === 'en' ? "Gram Gold" : "Gram Altın", simge: "g", format: 4 }
        };
        
        const birimler = ["TL", "USD", "EUR", "PLN", "ALTIN"];
        grid.innerHTML = "";
        
        birimler.forEach(b => {
            const def = birimTanimlari[b];
            const div = document.createElement('div');
            div.className = "cevirici-kart";
            
            div.innerHTML = `
                <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; font-family: 'Outfit', sans-serif;">${def.simge} ${def.ad}</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="number" id="cevirici-input-${b}" data-birim="${b}" data-format="${def.format}" placeholder="0.00" class="cevirici-input" style="font-family: 'Outfit', sans-serif;">
                </div>
            `;
            grid.appendChild(div);
        });
        
        // Girdi dinleyicilerini bağla (herhangi birine yazıldığında diğerlerini anlık hesapla)
        const inputs = grid.querySelectorAll('input');
        inputs.forEach(input => {
            input.oninput = function() {
                const sourceBirim = this.dataset.birim;
                const val = parseFloat(this.value);
                
                if (isNaN(val) || this.value.trim() === "") {
                    inputs.forEach(inp => {
                        if (inp !== this) inp.value = "";
                    });
                    return;
                }
                
                // Seçilen birimden TL değerini bul
                const tutarTL = val * (KURLAR[sourceBirim] || 1.0);
                
                // Diğer tüm para birimlerine çevirip güncelle
                inputs.forEach(inp => {
                    if (inp !== this) {
                        const b = inp.dataset.birim;
                        const dec = parseInt(inp.dataset.format);
                        const rate = KURLAR[b] || 1.0;
                        inp.value = (tutarTL / rate).toFixed(dec);
                    }
                });
            };
        });
    }
}

// --- FİNANS EĞİLİM GRAFİK ALTYAPISI (CHART.JS) ---
let aktifTimeframe = localStorage.getItem('hub_finans_trend_timeframe') || '1w';

function gecmisKurlariYukle(range = '1w') {
    let key = 'hub_finans_doviz_gecmisi_' + range;
    let gecmis = localStorage.getItem(key);
    if (gecmis) {
        return JSON.parse(gecmis);
    }
    
    // Geçmiş veri yoksa gerçekçi simülasyon yap
    let liste = [];
    let bugun = new Date();
    
    let eurTL = KURLAR["EUR"] || 53.25;
    let usdTL = KURLAR["USD"] || 46.10;
    let plnTL = KURLAR["PLN"] || 12.55;
    
    if (range === '1w') {
        // Son 7 gün (Haftalık)
        for (let i = 6; i >= 0; i--) {
            let tarih = new Date(bugun);
            tarih.setDate(bugun.getDate() - i);
            
            let label = `${tarih.getDate()} ${tarih.toLocaleString('tr-TR', { month: 'short' })}`;
            let scale = 1 + (Math.sin(i) * 0.005) + (Math.cos(i * 1.5) * 0.003) - (i * 0.001);
            
            liste.push({
                tarihMetin: label,
                timestamp: tarih.getTime(),
                rates: {
                    "TL": 1.0,
                    "EUR": Number((eurTL * scale).toFixed(4)),
                    "USD": Number((usdTL * scale * 1.002).toFixed(4)),
                    "PLN": Number((plnTL * scale * 0.998).toFixed(4))
                }
            });
        }
    } else if (range === '1m') {
        // Son 30 gün (Aylık)
        for (let i = 29; i >= 0; i--) {
            let tarih = new Date(bugun);
            tarih.setDate(bugun.getDate() - i);
            
            let label = `${tarih.getDate()} ${tarih.toLocaleString('tr-TR', { month: 'short' })}`;
            let scale = 1 + (Math.sin(i / 3) * 0.015) + (Math.cos(i * 0.5) * 0.008) - (i * 0.0015);
            
            liste.push({
                tarihMetin: label,
                timestamp: tarih.getTime(),
                rates: {
                    "TL": 1.0,
                    "EUR": Number((eurTL * scale).toFixed(4)),
                    "USD": Number((usdTL * scale * 1.002).toFixed(4)),
                    "PLN": Number((plnTL * scale * 0.998).toFixed(4))
                }
            });
        }
    } else if (range === '1y') {
        // Son 12 ay (Yıllık)
        for (let i = 11; i >= 0; i--) {
            let tarih = new Date(bugun);
            tarih.setMonth(bugun.getMonth() - i);
            
            let label = `${tarih.toLocaleString('tr-TR', { month: 'short' })} ${tarih.getFullYear().toString().slice(-2)}`;
            let scale = 1 + (Math.sin(i / 2) * 0.06) + (Math.cos(i * 0.8) * 0.03) - (i * 0.008);
            
            liste.push({
                tarihMetin: label,
                timestamp: tarih.getTime(),
                rates: {
                    "TL": 1.0,
                    "EUR": Number((eurTL * scale).toFixed(4)),
                    "USD": Number((usdTL * scale * 1.002).toFixed(4)),
                    "PLN": Number((plnTL * scale * 0.998).toFixed(4))
                }
            });
        }
    }
    
    localStorage.setItem(key, JSON.stringify(liste));
    return liste;
}

function canliKuruGecmiseEkle() {
    const simdi = new Date();
    const labelGun = `${simdi.getDate()} ${simdi.toLocaleString('tr-TR', { month: 'short' })}`;
    const labelAy = `${simdi.toLocaleString('tr-TR', { month: 'short' })} ${simdi.getFullYear().toString().slice(-2)}`;
    const timestamp = Date.now();
    
    // 1. 1w Güncelle
    let gecmis1w = gecmisKurlariYukle('1w');
    let son1w = gecmis1w[gecmis1w.length - 1];
    if (!son1w || Math.abs(son1w.rates["EUR"] - KURLAR["EUR"]) >= 0.001 || Math.abs(son1w.rates["USD"] - KURLAR["USD"]) >= 0.001) {
        gecmis1w.push({
            tarihMetin: labelGun,
            timestamp: timestamp,
            rates: { "TL": 1.0, "EUR": Number(KURLAR["EUR"].toFixed(4)), "USD": Number(KURLAR["USD"].toFixed(4)), "PLN": Number(KURLAR["PLN"].toFixed(4)) }
        });
        if (gecmis1w.length > 10) gecmis1w.shift();
        localStorage.setItem('hub_finans_doviz_gecmisi_1w', JSON.stringify(gecmis1w));
    }
    
    // 2. 1m Güncelle
    let gecmis1m = gecmisKurlariYukle('1m');
    let son1m = gecmis1m[gecmis1m.length - 1];
    if (!son1m || Math.abs(son1m.rates["EUR"] - KURLAR["EUR"]) >= 0.001 || Math.abs(son1m.rates["USD"] - KURLAR["USD"]) >= 0.001) {
        gecmis1m.push({
            tarihMetin: labelGun,
            timestamp: timestamp,
            rates: { "TL": 1.0, "EUR": Number(KURLAR["EUR"].toFixed(4)), "USD": Number(KURLAR["USD"].toFixed(4)), "PLN": Number(KURLAR["PLN"].toFixed(4)) }
        });
        if (gecmis1m.length > 40) gecmis1m.shift();
        localStorage.setItem('hub_finans_doviz_gecmisi_1m', JSON.stringify(gecmis1m));
    }
    
    // 3. 1y Güncelle
    let gecmis1y = gecmisKurlariYukle('1y');
    let son1y = gecmis1y[gecmis1y.length - 1];
    if (son1y && son1y.tarihMetin === labelAy) {
        son1y.rates = { "TL": 1.0, "EUR": Number(KURLAR["EUR"].toFixed(4)), "USD": Number(KURLAR["USD"].toFixed(4)), "PLN": Number(KURLAR["PLN"].toFixed(4)) };
        son1y.timestamp = timestamp;
    } else {
        gecmis1y.push({
            tarihMetin: labelAy,
            timestamp: timestamp,
            rates: { "TL": 1.0, "EUR": Number(KURLAR["EUR"].toFixed(4)), "USD": Number(KURLAR["USD"].toFixed(4)), "PLN": Number(KURLAR["PLN"].toFixed(4)) }
        });
        if (gecmis1y.length > 15) gecmis1y.shift();
    }
    localStorage.setItem('hub_finans_doviz_gecmisi_1y', JSON.stringify(gecmis1y));
}

function trendGrafigiCiz() {
    const canvas = document.getElementById('doviz-trend-canvas');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const bazBirimSelect = document.getElementById('chart-baz-doviz');
    const bazBirim = bazBirimSelect ? bazBirimSelect.value : 'TL';
    
    const gecmis = gecmisKurlariYukle(aktifTimeframe);
    
    const trMonthsShort = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const enMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const translateShortDate = (str) => {
        if (!str) return "";
        let res = str;
        for (let i = 0; i < 12; i++) {
            if (activeLang === 'en') {
                res = res.replace(trMonthsShort[i], enMonthsShort[i]);
            } else {
                res = res.replace(enMonthsShort[i], trMonthsShort[i]);
            }
        }
        return res;
    };
    
    const labels = gecmis.map(item => translateShortDate(item.tarihMetin));
    
    const birimler = ["TL", "PLN", "EUR", "USD"];
    const renkler = {
        "TL": "#64748b",
        "PLN": "#ec4899",
        "EUR": "#3b82f6",
        "USD": "#10b981"
    };
    const etiketler = {
        "TL": "TL (₺)",
        "PLN": "PLN (zł)",
        "EUR": "EUR (€)",
        "USD": "USD ($)"
    };
    
    const datasets = [];
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#f8fafc' : '#334155';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    birimler.forEach(birim => {
        if (birim === bazBirim) return; // Baz dövizin kendisini çizgi olarak çizme
        
        // Diğer kurların baz döviz karşısındaki değerini hesapla
        // Oran = Birim_TL / BazBirim_TL
        const dataPoints = gecmis.map(item => {
            const birimTL = item.rates[birim] || 1.0;
            const bazTL = item.rates[bazBirim] || 1.0;
            return Number((birimTL / bazTL).toFixed(4));
        });
        
        const ctx2d = canvas.getContext('2d');
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, renkler[birim] + '22'); // %12 saydam dolgu
        gradient.addColorStop(1, renkler[birim] + '00');
        
        datasets.push({
            label: `${etiketler[birim]} / ${bazBirim}`,
            data: dataPoints,
            borderColor: renkler[birim],
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.35, // Yumuşak kıvrımlı çizgiler
            pointBackgroundColor: renkler[birim],
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: aktifTimeframe === '1y' ? 5 : (aktifTimeframe === '1m' ? 2 : 4),
            pointHoverRadius: 6
        });
    });
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', sans-serif",
                            weight: '600',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    padding: 10,
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            weight: '600'
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}

// Harcama Analizini Hesapla (Hem Haftalık hem de Kategorisel Aggregation ve Grafik Çizimi)
function zamanAnaliziHesapla() {
    const activeLang = localStorage.getItem('hub_lang') || 'tr';

    try {
        harcamaListesi = JSON.parse(localStorage.getItem('hub_harcama_zaman_listesi') || '[]');
    } catch(e) {}
    
    if (!harcamaTabloGovde) return; 
    harcamaTabloGovde.innerHTML = "";
    
    let ayToplamTL = 0; 
    let haftaMiktarlariTL = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }; 
    let kategorilerTL = {};
    
    harcamaListesi.forEach(h => {
        const miktarTL = h.miktar * (KURLAR[h.kur] || 1.0); 
        const kat = h.kategori || "Diğer";
        
        ayToplamTL += miktarTL;
        
        // Haftalık Aggregation
        if(haftaMiktarlariTL[h.hafta] !== undefined) {
            haftaMiktarlariTL[h.hafta] += miktarTL; 
        } else {
            haftaMiktarlariTL["4"] += miktarTL;
        }
        
        // Kategorisel Aggregation
        kategorilerTL[kat] = (kategorilerTL[kat] || 0) + miktarTL;
        
        // Tablo Satırını Yaz
        const simge = PARA_SIMGELERI[h.kur] || "₺"; 
        const tr = document.createElement('tr');
        
        const donemText = h.donem ? `<small style="color:#64748b;">${translateDonem(h.donem)}</small><br>` : "";
        const gunText = h.gun ? `${h.gun}` : "";
        const haftaText = h.hafta ? (activeLang === 'en' ? ` (Week ${h.hafta})` : ` (${h.hafta}. Hafta)`) : "";
        const displayKat = activeLang === 'en' ? (kategoriCeviri[kat] || kat) : kat;
        
        tr.innerHTML = `
            <td><strong>${h.ad}</strong></td>
            <td><span class="donem-etiket" style="background-color: ${kategoriRenkAl(kat)}18; color: ${kategoriRenkAl(kat)}; border: 1px solid ${kategoriRenkAl(kat)}30; font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: bold;">${displayKat}</span></td>
            <td>${donemText}${gunText}${haftaText}</td>
            <td style="color:#ef4444; font-weight:bold;">-${h.miktar.toFixed(2)} ${simge} <br><small style="color:#64748b; font-weight:normal;">(${miktarTL.toFixed(1)} ₺)</small></td>
            <td><button class="harcama-sil-btn" onclick="zamanliHarcamaSil(${h.id})">${activeLang === 'en' ? 'Delete' : 'Sil'}</button></td>
        `;
        harcamaTabloGovde.appendChild(tr);
    });
    
    // 1. Özet Kartları Güncelle
    const aylikButce = parseFloat(localStorage.getItem('hub_finans_aylik_butce') || '0');
    const butceLabel = document.getElementById('analiz-ay-butce');
    if (butceLabel) {
        if (aylikButce > 0) {
            butceLabel.innerText = `${aylikButce.toFixed(2)} TL`;
            butceLabel.style.color = '#3b82f6';
        } else {
            butceLabel.innerText = activeLang === 'en' ? "Not Defined" : "Tanımlanmadı";
            butceLabel.style.color = '#64748b';
        }
    }

    document.getElementById('analiz-ay-toplam').innerText = `${ayToplamTL.toFixed(2)} TL`; 
    document.getElementById('analiz-hafta-ort').innerText = `${(ayToplamTL / 4).toFixed(2)} TL`; 
    document.getElementById('analiz-gun-ort').innerText = `${(ayToplamTL / 30).toFixed(2)} TL`;
    document.getElementById('v-hafta-1').innerText = `${(haftaMiktarlariTL["1"]).toFixed(2)} TL`; 
    document.getElementById('v-hafta-2').innerText = `${(haftaMiktarlariTL["2"]).toFixed(2)} TL`; 
    document.getElementById('v-hafta-3').innerText = `${(haftaMiktarlariTL["3"]).toFixed(2)} TL`; 
    document.getElementById('v-hafta-4').innerText = `${(haftaMiktarlariTL["4"] + haftaMiktarlariTL["5"]).toFixed(2)} TL`;
    
    const analizKutusu = document.getElementById('akıllı-analiz-mesaj');
    if (analizKutusu) {
        if (harcamaListesi.length === 0) { 
            analizKutusu.innerHTML = activeLang === 'en' ? "System is waiting for your transaction data to accumulate." : "Sistem harcama verilerinizin birikmesini bekliyor."; 
        } else {
            let mesaj = activeLang === 'en'
                ? `💱 **Live Multi-Currency Report:** The cumulative value of your expenses in the total pool is **${ayToplamTL.toFixed(2)} TL**. (Exchange rates are live and autonomous)`
                : `💱 **Canlı Multi-Döviz Raporu:** Toplam havuzdaki harcamalarınızın kümülatif değeri **${ayToplamTL.toFixed(2)} TL** boyutunda. (Kurlar anlık ve otonomdur)`;
            if (aylikButce > 0) {
                if (ayToplamTL > aylikButce) {
                    mesaj += activeLang === 'en'
                        ? `<br><span style="color: #ef4444; font-weight: bold;">⚠️ Warning: You exceeded your monthly budget by ${ (ayToplamTL - aylikButce).toFixed(2) } TL!</span>`
                        : `<br><span style="color: #ef4444; font-weight: bold;">⚠️ Dikkat: Aylık bütçenizi ${ (ayToplamTL - aylikButce).toFixed(2) } TL aştınız!</span>`;
                } else {
                    mesaj += activeLang === 'en'
                        ? `<br><span style="color: #10b981; font-weight: bold;">✅ Budget Status: Remaining monthly budget is ${ (aylikButce - ayToplamTL).toFixed(2) } TL.</span>`
                        : `<br><span style="color: #10b981; font-weight: bold;">✅ Bütçe Durumu: Aylık bütçenizin kalan kısmı ${ (aylikButce - ayToplamTL).toFixed(2) } TL limitindedir.</span>`;
                }
            }
            analizKutusu.innerHTML = mesaj;
        }
    }

    // 2. Dinamik Kategori SVG Donut Grafiği & İlerleme Barlarını Çiz
    grafikleriCiz(kategorilerTL, ayToplamTL);
}

// SVG ve CSS Progress Bar Çizim Yardımcısı
function grafikleriCiz(kategorilerTL, totalTL) {
    const svg = document.getElementById('kategori-donut-svg');
    const listeContainer = document.getElementById('chart-kategori-liste');
    const toplamTutarLabel = document.getElementById('chart-toplam-tutar');
    const tutarEtiketLabel = document.querySelector('.donut-label-total .tutar-etiket');
    
    const aylikButce = parseFloat(localStorage.getItem('hub_finans_aylik_butce') || '0');
    
    if (toplamTutarLabel) {
        if (aylikButce > 0) {
            toplamTutarLabel.innerText = `${totalTL.toFixed(0)} / ${aylikButce.toFixed(0)} ₺`;
            
            // Adjust font size slightly if it's too long
            if (toplamTutarLabel.innerText.length > 13) {
                toplamTutarLabel.style.fontSize = '13px';
            } else {
                toplamTutarLabel.style.fontSize = '18px';
            }
            
            if (totalTL > aylikButce) {
                toplamTutarLabel.style.color = '#ef4444'; // Red if exceeded
            } else {
                toplamTutarLabel.style.color = ''; // Default
            }
        } else {
            toplamTutarLabel.innerText = `${totalTL.toFixed(1)} ₺`;
            toplamTutarLabel.style.color = '';
            toplamTutarLabel.style.fontSize = '18px';
        }
    }
    
    if (tutarEtiketLabel) {
        if (aylikButce > 0) {
            if (totalTL > aylikButce) {
                const asimPct = ((totalTL - aylikButce) / aylikButce * 100).toFixed(0);
                tutarEtiketLabel.innerText = activeLang === 'en' 
                    ? `Limit Exceeded (${asimPct}%)` 
                    : `Limit Aşıldı (%${asimPct})`;
                tutarEtiketLabel.style.color = '#ef4444';
            } else {
                const dolulukPct = (totalTL / aylikButce * 100).toFixed(0);
                tutarEtiketLabel.innerText = activeLang === 'en' 
                    ? `Budget Usage (${dolulukPct}%)` 
                    : `Bütçe Doluluğu (%${dolulukPct})`;
                tutarEtiketLabel.style.color = '';
            }
        } else {
            tutarEtiketLabel.innerText = activeLang === 'en' ? "Total Spent" : "Toplam Gider";
            tutarEtiketLabel.style.color = '';
        }
    }
    
    if (!svg || !listeContainer) return;
    
    svg.innerHTML = "";
    listeContainer.innerHTML = "";
    
    if (totalTL <= 0 && aylikButce <= 0) {
        svg.innerHTML = `<circle class="donut-ring" cx="20" cy="20" r="15.91549430918954"></circle>`;
        listeContainer.innerHTML = activeLang === 'en' 
            ? `<div style="color:#94a3b8; font-style:italic; text-align:center; font-size:13px;">No expense data.</div>`
            : `<div style="color:#94a3b8; font-style:italic; text-align:center; font-size:13px;">Harcama girdisi yok.</div>`;
        return;
    }
    
    // Choose denominator: if budget exists and we are under budget, total circle represents budget.
    // Otherwise, total circle represents totalTL.
    const payda = (aylikButce > 0 && totalTL <= aylikButce) ? aylikButce : totalTL;
    
    let cumulative = 0;
    let circlesHTML = `<circle class="donut-ring" cx="20" cy="20" r="15.91549430918954"></circle>`;
    
    const siraliKategoriler = Object.entries(kategorilerTL).sort((a, b) => b[1] - a[1]);
    
    siraliKategoriler.forEach(([kat, tutar]) => {
        const pct = (tutar / payda) * 100;
        const renk = kategoriRenkAl(kat);
        
        const segmentOffset = 100 - cumulative;
        circlesHTML += `
            <circle class="donut-segment" 
                    cx="20" cy="20" 
                    r="15.91549430918954" 
                    fill="transparent" 
                    stroke="${renk}" 
                    stroke-dasharray="${pct.toFixed(4)} ${(100 - pct).toFixed(4)}" 
                    stroke-dashoffset="${segmentOffset.toFixed(4)}">
            </circle>`;
            
        cumulative += pct;
        
        // Progress percentage relative to total spent (always sum to 100% in bar lines)
        const displayPct = (tutar / totalTL) * 100;
        
        const row = document.createElement('div');
        row.className = 'kategori-satir';
        const displayKat = activeLang === 'en' ? (kategoriCeviri[kat] || kat) : kat;
        row.innerHTML = `
            <div class="kategori-bilgi">
                <div class="kategori-isim-grup">
                    <span class="kategori-renk-noktasi" style="background-color: ${renk};"></span>
                    <span>${displayKat}</span>
                </div>
                <span>${activeLang === 'en' ? `${displayPct.toFixed(1)}%` : `%${displayPct.toFixed(1)}`} <small style="font-weight: normal; color: #64748b;">(${tutar.toFixed(1)} ₺)</small></span>
            </div>
            <div class="kategori-bar-arkaplan">
                <div class="kategori-bar-doluluk" style="width: ${displayPct.toFixed(1)}%; background-color: ${renk};"></div>
            </div>
        `;
        listeContainer.appendChild(row);
    });
    
    // Draw the remaining budget segment if applicable
    if (aylikButce > 0 && totalTL < aylikButce) {
        const pctKalan = ((aylikButce - totalTL) / aylikButce) * 100;
        const segmentOffset = 100 - cumulative;
        
        const isDark = document.body.classList.contains('dark-theme');
        const kalanRenk = isDark ? "#334155" : "#e2e8f0";
        
        circlesHTML += `
            <circle class="donut-segment remaining-budget-segment" 
                    cx="20" cy="20" 
                    r="15.91549430918954" 
                    fill="transparent" 
                    stroke="${kalanRenk}" 
                    stroke-dasharray="${pctKalan.toFixed(4)} ${(100 - pctKalan).toFixed(4)}" 
                    stroke-dashoffset="${segmentOffset.toFixed(4)}"
                    style="stroke-dasharray: ${pctKalan.toFixed(4)} ${(100 - pctKalan).toFixed(4)};">
            </circle>`;
            
        cumulative += pctKalan;
        
        // Add a Remaining Budget row to the legends list
        const kalanTutar = aylikButce - totalTL;
        const kalanPct = (kalanTutar / aylikButce) * 100;
        const row = document.createElement('div');
        row.className = 'kategori-satir remaining-budget-row';
        row.style.opacity = '0.85';
        row.innerHTML = `
            <div class="kategori-bilgi">
                <div class="kategori-isim-grup">
                    <span class="kategori-renk-noktasi" style="background-color: ${kalanRenk}; border: 1px dashed rgba(0,0,0,0.15);"></span>
                    <span style="font-style: italic; font-weight: 500;">${activeLang === 'en' ? 'Remaining Budget' : 'Kalan Bütçe'}</span>
                </div>
                <span>${activeLang === 'en' ? `${kalanPct.toFixed(1)}%` : `%${kalanPct.toFixed(1)}`} <small style="font-weight: normal; color: #64748b;">(${kalanTutar.toFixed(1)} ₺)</small></span>
            </div>
            <div class="kategori-bar-arkaplan" style="background: rgba(0,0,0,0.02);">
                <div class="kategori-bar-doluluk" style="width: ${kalanPct.toFixed(1)}%; background-color: ${kalanRenk};"></div>
            </div>
        `;
        listeContainer.appendChild(row);
    } else if (aylikButce > 0 && totalTL > aylikButce) {
        // Exceeded budget legend row
        const asimTutar = totalTL - aylikButce;
        const asimPct = (asimTutar / aylikButce) * 100;
        const row = document.createElement('div');
        row.className = 'kategori-satir over-budget-row';
        row.style.background = 'rgba(239, 68, 68, 0.05)';
        row.style.border = '1px solid rgba(239, 68, 68, 0.1)';
        row.style.borderRadius = '6px';
        row.style.padding = '8px';
        row.innerHTML = `
            <div class="kategori-bilgi" style="margin-bottom: 0;">
                <div class="kategori-isim-grup">
                    <span class="kategori-renk-noktasi" style="background-color: #ef4444;"></span>
                    <span style="color: #ef4444; font-weight: bold;">${activeLang === 'en' ? 'Budget Overrun' : 'Bütçe Aşımı'}</span>
                </div>
                <span style="color: #ef4444; font-weight: bold;">+${activeLang === 'en' ? `${asimPct.toFixed(1)}%` : `%${asimPct.toFixed(1)}`} <small style="font-weight: bold; color: #ef4444;">(${asimTutar.toFixed(1)} ₺)</small></span>
            </div>
        `;
        listeContainer.appendChild(row);
    }
    
    svg.innerHTML = circlesHTML;
}

function zamanliHarcamaSil(id) { 
    harcamaListesi = harcamaListesi.filter(h => h.id !== id); 
    localStorage.setItem('hub_harcama_zaman_listesi', JSON.stringify(harcamaListesi)); 
    zamanAnaliziHesapla(); 
    kategorileriGuncelle();
}

window.zamanliHarcamaSil = zamanliHarcamaSil;

// --- HESAP MAKİNESİ ---
const makineEkran = document.getElementById('makine-ekran');

function makineGirdi(d) { 
    if (!makineEkran) return; 
    if (makineEkran.value === "0" && d !== ".") {
        makineEkran.value = d; 
    } else {
        makineEkran.value += d; 
    }
}

function makineTemizle() { 
    if (makineEkran) makineEkran.value = "0"; 
}

function makineSil() { 
    if (!makineEkran) return; 
    makineEkran.value = makineEkran.value.slice(0, -1) || "0"; 
}

function safeArithmeticEval(str) {
    str = str.replace(/[^0-9+\-*/.]/g, '');
    try {
        const tokens = [];
        let numberBuffer = "";
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (/[0-9.]/.test(char)) {
                numberBuffer += char;
            } else if (/[+\-*/]/.test(char)) {
                if (numberBuffer) {
                    tokens.push(parseFloat(numberBuffer));
                    numberBuffer = "";
                }
                tokens.push(char);
            }
        }
        if (numberBuffer) {
            tokens.push(parseFloat(numberBuffer));
        }
        
        if (tokens.length === 0) return 0;
        
        if (tokens[0] === '-') {
            tokens.shift();
            if (tokens.length > 0 && typeof tokens[0] === 'number') {
                tokens[0] = -tokens[0];
            }
        }
        
        const intermediateTokens = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === '*' || token === '/') {
                const operator = token;
                const nextNum = tokens[++i];
                const prevNum = intermediateTokens.pop();
                if (prevNum === undefined || nextNum === undefined || isNaN(prevNum) || isNaN(nextNum)) {
                    throw new Error("Invalid expression");
                }
                if (operator === '*') {
                    intermediateTokens.push(prevNum * nextNum);
                } else {
                    if (nextNum === 0) throw new Error("Division by zero");
                    intermediateTokens.push(prevNum / nextNum);
                }
            } else {
                intermediateTokens.push(token);
            }
        }
        
        let result = intermediateTokens[0];
        if (typeof result !== 'number' || isNaN(result)) throw new Error("Invalid expression");
        
        for (let i = 1; i < intermediateTokens.length; i += 2) {
            const operator = intermediateTokens[i];
            const nextNum = intermediateTokens[i + 1];
            if (nextNum === undefined || isNaN(nextNum)) {
                throw new Error("Invalid expression");
            }
            if (operator === '+') {
                result += nextNum;
            } else if (operator === '-') {
                result -= nextNum;
            } else {
                throw new Error("Invalid operator");
            }
        }
        
        return result;
    } catch (e) {
        throw e;
    }
}

function makineHesapla() { 
    if (!makineEkran) return; 
    try { 
        const val = makineEkran.value;
        if (!val || val === "0") return;
        const result = safeArithmeticEval(val);
        if (isNaN(result) || !isFinite(result)) {
            throw new Error("Invalid calculation");
        }
        makineEkran.value = Number(result.toFixed(4)); 
    } catch { 
        makineEkran.value = "Hata"; 
        setTimeout(makineTemizle, 1500); 
    } 
}

window.makineGirdi = makineGirdi;
window.makineTemizle = makineTemizle;
window.makineSil = makineSil;
window.makineHesapla = makineHesapla;

// --- INITIALISE DOM AND LISTENERS ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Migration of old currency trend key if it exists
    const eskiGecmisKey = localStorage.getItem('hub_finans_doviz_gecmisi');
    if (eskiGecmisKey) {
        localStorage.setItem('hub_finans_doviz_gecmisi_1w', eskiGecmisKey);
        localStorage.removeItem('hub_finans_doviz_gecmisi');
    }

    // Programmatic click listeners for Finance Tab Buttons
    const btnFinButce = document.getElementById('btn-finans-butce');
    const btnFinDoviz = document.getElementById('btn-finans-doviz');
    if (btnFinButce) btnFinButce.onclick = (e) => { e.preventDefault(); finansAltSekmeDegistir('butce'); };
    if (btnFinDoviz) btnFinDoviz.onclick = (e) => { e.preventDefault(); finansAltSekmeDegistir('doviz'); };

    // Programmatic click listeners for Calculator Buttons
    const tuslar = document.querySelectorAll('.hesap-makinesi .tus');
    tuslar.forEach(tus => {
        tus.onclick = (e) => {
            e.preventDefault();
            const val = tus.innerText;
            if (val === 'C') {
                makineTemizle();
            } else if (val === '←') {
                makineSil();
            } else if (val === '=') {
                makineHesapla();
            } else {
                makineGirdi(val);
            }
        };
    });

    // 2. Zaman Dilimi Aktif Buton Durumunu Ayarla
    const savedTimeframe = localStorage.getItem('hub_finans_trend_timeframe') || '1w';
    aktifTimeframe = savedTimeframe;
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        if (btn.getAttribute('data-range') === savedTimeframe) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 3. Zaman Dilimi Seçimi Dinleyicileri
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const range = btn.getAttribute('data-range');
            aktifTimeframe = range;
            localStorage.setItem('hub_finans_trend_timeframe', range);
            
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            trendGrafigiCiz();
        };
    });

    // 4. Kategorileri, Kurları ve Trend Geçmişini Al
    kategorileriGuncelle();
    await canliKurlariGetir();
    zamanAnaliziHesapla();
    
    // 5. URL Hash veya Son Aktif Alt Sekme Ayarını Kontrol Et
    let varsayilanAltSekme = 'butce';
    if (window.location.hash === '#doviz') {
        varsayilanAltSekme = 'doviz';
    } else if (window.location.hash === '#butce') {
        varsayilanAltSekme = 'butce';
    } else {
        varsayilanAltSekme = localStorage.getItem('hub_finans_aktif_alt_sekme') || 'butce';
    }
    finansAltSekmeDegistir(varsayilanAltSekme);

    // Tekrarlayan Harcamaları Kontrol Et & Listele
    checkAndInjectRecurringTransactions();
    listeleTekrarlayanSablonlar();

    const tekrarlamaTipiSelect = document.getElementById('harcama-tekrarlama-tipi');
    const tekrarlamaGunInput = document.getElementById('harcama-tekrarlama-gun');
    if (tekrarlamaTipiSelect && tekrarlamaGunInput) {
        tekrarlamaTipiSelect.addEventListener('change', () => {
            if (tekrarlamaTipiSelect.value === 'aylik') {
                tekrarlamaGunInput.style.display = 'block';
            } else {
                tekrarlamaGunInput.style.display = 'none';
            }
        });
    }

    // Dışarıdan URL hash değiştiğinde alt sekmeyi otomatik geçiş yaptır
    window.addEventListener('hashchange', () => {
        let hash = window.location.hash;
        if (hash === '#doviz') finansAltSekmeDegistir('doviz');
        else if (hash === '#butce') finansAltSekmeDegistir('butce');
    });

    // Baz Döviz Değişimi Dinleyicisi
    const bazSelect = document.getElementById('chart-baz-doviz');
    if (bazSelect) {
        bazSelect.onchange = () => {
            trendGrafigiCiz();
        };
    }

    // Dark Mode Toggle Tıklandığında Çizimi Güncelle (Grid Renk Uyumluluğu)
    const themeBtn = document.getElementById('dark-mode-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            setTimeout(trendGrafigiCiz, 100);
        });
    }

    // Bütçe Düzenleme Dinleyicisi
    const butceDuzenleBtn = document.getElementById('butce-duzenle-btn');
    if (butceDuzenleBtn) {
        butceDuzenleBtn.onclick = (e) => {
            e.preventDefault();
            let mevcutButce = parseFloat(localStorage.getItem('hub_finans_aylik_butce') || '0');
            let girdi = prompt(
                activeLang === 'en'
                    ? `Current Budget: ${mevcutButce.toFixed(2)} TL\n\nEnter new budget value.\n- Enter number to set budget directly (ex: 15000)\n- Enter with plus sign to increase budget (ex: +2000)\n- Enter with minus sign to decrease budget (ex: -1000)`
                    : `Mevcut Bütçe: ${mevcutButce.toFixed(2)} TL\n\nYeni bütçe değerini girin.\n- Direkt bütçe ayarlamak için sayı girin (örn: 15000)\n- Bütçeyi artırmak için artı işaretiyle girin (örn: +2000)\n- Bütçeyi azaltmak için eksi işaretiyle girin (örn: -1000)`
            );
            if (girdi === null) return;
            girdi = girdi.trim();
            if (girdi === "") return;
            
            let yeniButce = mevcutButce;
            if (girdi.startsWith('+')) {
                let eklenen = parseFloat(girdi.substring(1));
                if (!isNaN(eklenen)) yeniButce += eklenen;
            } else if (girdi.startsWith('-')) {
                let cikarilan = parseFloat(girdi.substring(1));
                if (!isNaN(cikarilan)) yeniButce -= cikarilan;
            } else {
                let deger = parseFloat(girdi);
                if (!isNaN(deger)) yeniButce = deger;
            }
            
            if (yeniButce < 0) yeniButce = 0;
            localStorage.setItem('hub_finans_aylik_butce', yeniButce.toString());
            zamanAnaliziHesapla();
        };
    }

    if (harcamaEkleBtn) {
        harcamaEkleBtn.onclick = () => {
            const ad = harcamaAdInput.value.trim(); 
            const miktar = parseFloat(harcamaMiktarInput.value); 
            const kur = harcamaKurSelect.value;
            
            let kategori = harcamaKategoriInput ? harcamaKategoriInput.value.trim() : "Diğer";
            if (kategori === "") kategori = "Diğer";
            if (activeLang === 'en' && reverseKategoriCeviri[kategori]) {
                kategori = reverseKategoriCeviri[kategori];
            }
            
            if (!ad || isNaN(miktar) || miktar <= 0) { 
                alert(activeLang === 'en' ? "Please enter a valid description and amount." : "Lütfen geçerli bir açıklama ve tutar girin."); 
                return; 
            }
            
            const simdi = new Date(); 
            const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const otonomDonem = `${aylar[simdi.getMonth()]} ${simdi.getFullYear()}`;
            
            // Check if recurring
            const tekrarlamaTipiSelect = document.getElementById('harcama-tekrarlama-tipi');
            const tekrarlamaGunInput = document.getElementById('harcama-tekrarlama-gun');
            if (tekrarlamaTipiSelect && tekrarlamaTipiSelect.value === 'aylik') {
                const gun = parseInt(tekrarlamaGunInput.value) || 1;
                if (gun < 1 || gun > 28) {
                    alert(activeLang === 'en' ? "Day of month must be between 1 and 28." : "Ayın günü 1 ile 28 arasında olmalıdır.");
                    return;
                }
                let templates = JSON.parse(localStorage.getItem('hub_finans_tekrarlayan_sablonlar') || '[]');
                const newTemplate = {
                    id: Date.now(),
                    ad: ad,
                    miktar: miktar,
                    kur: kur,
                    kategori: kategori,
                    gun: gun,
                    sonTetiklenmeDonemi: getCurrentMonthString()
                };
                templates.push(newTemplate);
                localStorage.setItem('hub_finans_tekrarlayan_sablonlar', JSON.stringify(templates));
                listeleTekrarlayanSablonlar();
            }
            
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
            harcamaListesi.push(yeniHarcama); 
            localStorage.setItem('hub_harcama_zaman_listesi', JSON.stringify(harcamaListesi));
            
            harcamaAdInput.value = ""; 
            harcamaMiktarInput.value = ""; 
            if (harcamaKategoriInput) harcamaKategoriInput.value = "";
            if (tekrarlamaTipiSelect) tekrarlamaTipiSelect.value = "tek";
            if (tekrarlamaGunInput) {
                tekrarlamaGunInput.value = "";
                tekrarlamaGunInput.style.display = "none";
            }
            
            zamanAnaliziHesapla();
            kategorileriGuncelle();
        };
        
        [harcamaAdInput, harcamaMiktarInput, harcamaKategoriInput].forEach(inp => {
            if (inp) {
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        harcamaEkleBtn.click();
                    }
                });
            }
        });
    }

    const harcamaExportBtn = document.getElementById('harcama-export-btn');
    if (harcamaExportBtn) {
        harcamaExportBtn.onclick = (e) => {
            e.preventDefault(); 
            if (harcamaListesi.length === 0) { 
                alert(activeLang === 'en' ? "No records to export." : "Dışarı aktarılacak kayıt yok."); 
                return; 
            }
            let csvIcerik = activeLang === 'en'
                ? "\uFEFF;Description;Category;Period;Timeframe;Original Amount;Currency;TL Equivalent\n"
                : "\uFEFF;Açıklama;Kategori;Dönem;Zaman Dilimi;Orijinal Tutar;Para Birimi;TL Karşılığı\n";
            harcamaListesi.forEach(h => { 
                const dText = h.donem || "";
                const gText = h.gun || "";
                const hText = h.hafta ? (activeLang === 'en' ? `Week ${h.hafta}` : `${h.hafta}. Hafta`) : "";
                const ghText = gText ? (hText ? `${gText} (${hText})` : gText) : hText;
                csvIcerik += `${h.ad};${h.kategori};${dText};${ghText};${h.miktar.toFixed(2)};${h.kur};${(h.miktar * KURLAR[h.kur]).toFixed(2)}\n`; 
            });
            const blob = new Blob([csvIcerik], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const link = document.createElement("a"); 
            link.href = url; 
            link.setAttribute("download", activeLang === 'en' ? `Expense_Report.csv` : `Harcama_Raporu.csv`); 
            link.click(); 
            URL.revokeObjectURL(url);
        };
    }
});

// --- RECURRING FINANCIAL TRANSACTIONS ENGINE ---
function getCurrentMonthString() {
    const simdi = new Date();
    return `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, '0')}`;
}

function checkAndInjectRecurringTransactions() {
    const currentMonth = getCurrentMonthString();
    let templates = JSON.parse(localStorage.getItem('hub_finans_tekrarlayan_sablonlar') || '[]');
    let ledger = JSON.parse(localStorage.getItem('hub_harcama_zaman_listesi') || '[]');
    let updated = false;

    const simdi = new Date();
    const currentDay = simdi.getDate();

    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const otonomDonem = `${aylar[simdi.getMonth()]} ${simdi.getFullYear()}`;

    templates.forEach(tpl => {
        if (tpl.sonTetiklenmeDonemi !== currentMonth && currentDay >= tpl.gun) {
            const newTx = {
                id: Date.now() + Math.random(),
                ad: `${tpl.ad} (Oto)`,
                miktar: tpl.miktar,
                kur: tpl.kur,
                kategori: tpl.kategori,
                donem: otonomDonem,
                hafta: Math.ceil(currentDay / 7).toString(),
                run: gunIsimleriUzun[simdi.getDay()]
            };
            ledger.push(newTx);
            tpl.sonTetiklenmeDonemi = currentMonth;
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem('hub_harcama_zaman_listesi', JSON.stringify(ledger));
        localStorage.setItem('hub_finans_tekrarlayan_sablonlar', JSON.stringify(templates));
    }
}

function listeleTekrarlayanSablonlar() {
    const container = document.getElementById('tekrarlayan-liste');
    if (!container) return;

    let templates = JSON.parse(localStorage.getItem('hub_finans_tekrarlayan_sablonlar') || '[]');
    const isEn = activeLang === 'en';

    if (templates.length === 0) {
        container.innerHTML = `<span style="font-size: 11px; color: #64748b;" id="lbl-tekrarlayan-bos">${isEn ? 'No active recurring expense templates found.' : 'Aktif tekrarlayan harcama şablonu bulunmuyor.'}</span>`;
        return;
    }

    container.innerHTML = '';
    templates.forEach(tpl => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.02); border: 1px dashed rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 4px;';
        
        if (document.body.classList.contains('dark-theme')) {
            item.style.background = 'rgba(255,255,255,0.02)';
            item.style.borderColor = 'rgba(255,255,255,0.15)';
        }

        const miktarStr = `${tpl.miktar} ${tpl.kur}`;
        const dayLabel = isEn ? `Day ${tpl.gun} of month` : `Ayın ${tpl.gun}. günü`;
        const displayKat = isEn ? (kategoriCeviri[tpl.kategori] || tpl.kategori) : tpl.kategori;

        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: bold; color: inherit;">${tpl.ad}</span>
                <span style="font-size: 10px; opacity: 0.7;">${displayKat} | ${dayLabel} | ${miktarStr}</span>
            </div>
            <button class="delete-template-btn" data-id="${tpl.id}" style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; padding: 4px; font-size: 14px;" title="${isEn ? 'Delete' : 'Sil'}">×</button>
        `;

        item.querySelector('.delete-template-btn').addEventListener('click', (e) => {
            const id = parseFloat(e.target.dataset.id);
            templates = templates.filter(t => t.id !== id);
            localStorage.setItem('hub_finans_tekrarlayan_sablonlar', JSON.stringify(templates));
            listeleTekrarlayanSablonlar();
        });

        container.appendChild(item);
    });
}

// Keypress events for Calculator
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'makine-ekran') return;
    if (document.activeElement.tagName === 'TEXTAREA') return;
    
    if (/[0-9\+\-\*\/\.]/.test(e.key)) { 
        e.preventDefault(); 
        makineGirdi(e.key); 
    } else if (e.key === 'Enter') { 
        e.preventDefault(); 
        makineHesapla(); 
    } else if (e.key === 'Backspace') { 
        e.preventDefault(); 
        makineSil(); 
    } else if (e.key === 'Escape') { 
        e.preventDefault(); 
        makineTemizle(); 
    }
});
