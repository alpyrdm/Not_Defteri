// --- ANA SAYFA DİNAMİK İSTATİSTİK VE ZAMAN MOTORU ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Canlı Saat ve Tarih Güncelleme
    const clockElement = document.getElementById('dashboard-clock');
    const greetingElement = document.getElementById('dashboard-greeting');
    
    function zamaniGuncelle() {
        const simdi = new Date();
        const saat = String(simdi.getHours()).padStart(2, '0');
        const dakika = String(simdi.getMinutes()).padStart(2, '0');
        const saniye = String(simdi.getSeconds()).padStart(2, '0');
        
        if (clockElement) {
            clockElement.innerText = `${saat}:${dakika}:${saniye}`;
        }
        
        // Dinamik Karşılama Mesajı
        if (greetingElement) {
            const activeLang = localStorage.getItem('hub_lang') || 'tr';
            const saatNo = simdi.getHours();
            let mesaj = activeLang === 'en' ? "Hello, have a good day! 🌟" : "Merhaba, iyi günler! 🌟";
            if (saatNo >= 6 && saatNo < 12) {
                mesaj = activeLang === 'en' ? "Good morning! Have a great day ☀️" : "Günaydın! Harika bir gün dileriz ☀️";
            } else if (saatNo >= 12 && saatNo < 17) {
                mesaj = activeLang === 'en' ? "Good afternoon! Keep up the work ⚡" : "Tünaydın! Çalışmalara devam ⚡";
            } else if (saatNo >= 17 && saatNo < 22) {
                mesaj = activeLang === 'en' ? "Good evening! Review your day 🌙" : "İyi akşamlar! Günün değerlendirmesini yapabilirsiniz 🌙";
            } else {
                mesaj = activeLang === 'en' ? "Good night! Time to rest 💤" : "İyi geceler! Dinlenme zamanı 💤";
            }
            
            const aylarDizi = activeLang === 'en' 
                ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const gunIsimleriUzun = activeLang === 'en'
                ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                : ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
            
            const tarihMetni = activeLang === 'en'
                ? `${gunIsimleriUzun[simdi.getDay()]}, ${aylarDizi[simdi.getMonth()]} ${simdi.getDate()}, ${simdi.getFullYear()}`
                : `${simdi.getDate()} ${aylarDizi[simdi.getMonth()]} ${simdi.getFullYear()} - ${gunIsimleriUzun[simdi.getDay()]}`;
            
            greetingElement.innerHTML = `${mesaj}<br><span style="font-size: 16px; opacity: 0.85; font-weight: normal;">${activeLang === 'en' ? 'Today' : 'Bugün'}: ${tarihMetni}</span>`;
        }
    }
    
    zamaniGuncelle();
    setInterval(zamaniGuncelle, 1000);
    
    // 2. İstatistikleri Hesaplama ve Yazma
    
    // A. Pano (Post-it) İstatistiği
    const v2Depo = localStorage.getItem('hub_pano_v2');
    let toplamNotSayisi = 0;
    let alanSayisi = 1;
    if (v2Depo) {
        const depo = JSON.parse(v2Depo);
        alanSayisi = Object.keys(depo.workspaces).length;
        Object.values(depo.workspaces).forEach(list => {
            toplamNotSayisi += list.length;
        });
    } else {
        const panoData = JSON.parse(localStorage.getItem('hub_pano') || '[]');
        toplamNotSayisi = panoData.length;
    }
    
    const activeLang = localStorage.getItem('hub_lang') || 'tr';
    const panoStat = document.getElementById('stat-pano');
    if (panoStat) {
        panoStat.innerText = activeLang === 'en'
            ? `${alanSayisi} Workspace${alanSayisi !== 1 ? 's' : ''} (${toplamNotSayisi} Post-it${toplamNotSayisi !== 1 ? 's' : ''})`
            : `${alanSayisi} Alan (${toplamNotSayisi} Post-it)`;
    }
    
    // B. Yapılacaklar (Kanban) İstatistiği
    const todoData = JSON.parse(localStorage.getItem('hub_todo_hub_v2') || '{"Genel Görevler": {"todo":[], "progress":[], "done":[]}}');
    let aktifGorevSayisi = 0;
    Object.values(todoData).forEach(liste => {
        if (liste.todo) aktifGorevSayisi += liste.todo.length;
        if (liste.progress) aktifGorevSayisi += liste.progress.length;
    });
    const todoStat = document.getElementById('stat-todo');
    if (todoStat) {
        todoStat.innerText = activeLang === 'en'
            ? `${aktifGorevSayisi} Pending Task${aktifGorevSayisi !== 1 ? 's' : ''}`
            : `${aktifGorevSayisi} Bekleyen Görev`;
    }
    
    // C. Ajanda Plan İstatistiği (Bugünkü Planlar)
    const ajandaData = JSON.parse(localStorage.getItem('hub_merkezi_ajanda_verisi') || '{}');
    const gunler = ["pzt", "sal", "car", "per", "cum", "cmt", "paz"];
    const saatler = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    
    const bugunIndex = new Date().getDay(); 
    const dinamikGunKodu = bugunIndex === 0 ? "paz" : gunler[bugunIndex - 1];
    let bugunkuPlanSayisi = 0;
    
    // Rutin planlar
    saatler.forEach(saat => {
        const hucreKodu = `${dinamikGunKodu}_${saat}`;
        if (ajandaData[hucreKodu] && ajandaData[hucreKodu].trim() !== "") {
            bugunkuPlanSayisi++;
        }
    });
    
    // Özel takvim planları
    const simdi = new Date();
    const bugunYil = simdi.getFullYear();
    const bugunAy = simdi.getMonth();
    const bugunGun = simdi.getDate();
    const ozelKey = `aylik_planlar_${bugunYil}_${bugunAy}_${bugunGun}`;
    const ozelPlanlar = JSON.parse(ajandaData[ozelKey] || "[]");
    bugunkuPlanSayisi += ozelPlanlar.length;

    const ajandaStat = document.getElementById('stat-ajanda');
    if (ajandaStat) {
        ajandaStat.innerText = activeLang === 'en'
            ? `You Have ${bugunkuPlanSayisi} Plan${bugunkuPlanSayisi !== 1 ? 's' : ''} Today`
            : `Bugün ${bugunkuPlanSayisi} Planınız Var`;
    }
    
    // D. Defter İstatistiği
    const defterSayfalari = JSON.parse(localStorage.getItem('hub_defter_sayfalar') || '[]');
    const defterStat = document.getElementById('stat-defter');
    if (defterStat) {
        if (defterSayfalari.length === 0) {
            defterStat.innerText = activeLang === 'en' ? "Empty Notebook" : "Boş Sayfa";
        } else {
            let toplamKelime = 0;
            defterSayfalari.forEach(p => {
                if (p.metin && p.metin.trim() !== "") {
                    toplamKelime += p.metin.trim().split(/\s+/).length;
                }
            });
            defterStat.innerText = activeLang === 'en'
                ? `${defterSayfalari.length} Page${defterSayfalari.length !== 1 ? 's' : ''} (${toplamKelime} Word${toplamKelime !== 1 ? 's' : ''})`
                : `${defterSayfalari.length} Sayfa (${toplamKelime} Kelime)`;
        }
    }
    
    // E. Finans İstatistiği (Aylık Toplam Harcama)
    let KURLAR = { "TL": 1.0, "PLN": 12.55, "EUR": 53.25, "USD": 46.10 }; 
    const harcamaListesi = JSON.parse(localStorage.getItem('hub_harcama_zaman_listesi') || '[]');
    const finansStat = document.getElementById('stat-finans');
    
    async function finansIstatisiginiHesapla() {
        // Canlı kurları çekip TL karşılığını güncel şekilde göstermeye çalışalım
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/EUR');
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    const eurToTry = data.rates["TRY"];
                    const eurToPln = data.rates["PLN"];
                    const eurToUsd = data.rates["USD"];
                    if (eurToTry && eurToPln && eurToUsd) {
                        KURLAR["EUR"] = eurToTry;
                        KURLAR["USD"] = eurToTry / eurToUsd;
                        KURLAR["PLN"] = eurToTry / eurToPln;
                    }
                }
            }
        } catch (err) {
            console.warn("İstatistik hesaplanırken canlı kurlar alınamadı, sabit kurlar devrede.");
        }
        
        let ayToplamTL = 0;
        harcamaListesi.forEach(h => {
            const miktarTL = h.miktar * (KURLAR[h.kur] || 1.0);
            ayToplamTL += miktarTL;
        });
        
        if (finansStat) {
            finansStat.innerText = activeLang === 'en'
                ? `${ayToplamTL.toFixed(2)} TL Spent`
                : `${ayToplamTL.toFixed(2)} TL Harcama`;
        }
    }
    
    finansIstatisiginiHesapla();

    // 3. Kullanım İpuçları Carousel (Yana Kaydırmalı / Otomatik) Motoru
    const carouselContainer = document.getElementById('carousel-container');
    const dotsContainer = document.getElementById('carousel-dots');
    
    if (carouselContainer) {
        const items = carouselContainer.querySelectorAll('.dashboard-info-item');
        const totalItems = items.length;
        let currentSlideIndex = 0;
        
        function getVisibleCount() {
            if (window.innerWidth <= 600) return 1;
            if (window.innerWidth <= 968) return 2;
            return 3;
        }
        
        function dotsGuncelle() {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = "";
            const visibleCount = getVisibleCount();
            const totalDots = Math.max(1, totalItems - visibleCount + 1);
            
            for (let i = 0; i < totalDots; i++) {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot';
                if (i === currentSlideIndex) dot.classList.add('active');
                
                dot.onclick = () => {
                    kaydirSlide(i);
                    resetAutoSlide();
                };
                dotsContainer.appendChild(dot);
            }
        }
        
        function kaydirSlide(index) {
            const visibleCount = getVisibleCount();
            const maxIndex = Math.max(0, totalItems - visibleCount);
            currentSlideIndex = Math.min(Math.max(0, index), maxIndex);
            
            const firstItem = items[0];
            if (firstItem) {
                const itemWidth = firstItem.getBoundingClientRect().width;
                const gap = 20; // Matches CSS gap
                carouselContainer.scrollLeft = currentSlideIndex * (itemWidth + gap);
            }
            
            // Update dots active class
            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach((dot, idx) => {
                if (idx === currentSlideIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        // Auto scroll interval (10 seconds)
        let autoSlideInterval = setInterval(() => {
            const visibleCount = getVisibleCount();
            const maxIndex = Math.max(0, totalItems - visibleCount);
            let nextIndex = currentSlideIndex + 1;
            if (nextIndex > maxIndex) {
                nextIndex = 0;
            }
            kaydirSlide(nextIndex);
        }, 10000);
        
        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(() => {
                const visibleCount = getVisibleCount();
                const maxIndex = Math.max(0, totalItems - visibleCount);
                let nextIndex = currentSlideIndex + 1;
                if (nextIndex > maxIndex) {
                    nextIndex = 0;
                }
                kaydirSlide(nextIndex);
            }, 10000);
        }
        
        // Handle window resize and sync
        window.addEventListener('resize', () => {
            dotsGuncelle();
            kaydirSlide(currentSlideIndex);
        });
        
        // Sync index on manual scroll/swipe
        let scrollTimeout;
        carouselContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const firstItem = items[0];
                if (firstItem) {
                    const itemWidth = firstItem.getBoundingClientRect().width;
                    const gap = 20;
                    const index = Math.round(carouselContainer.scrollLeft / (itemWidth + gap));
                    const visibleCount = getVisibleCount();
                    const maxIndex = Math.max(0, totalItems - visibleCount);
                    currentSlideIndex = Math.min(Math.max(0, index), maxIndex);
                    
                    const dots = dotsContainer.querySelectorAll('.carousel-dot');
                    dots.forEach((dot, idx) => {
                        if (idx === currentSlideIndex) {
                            dot.classList.add('active');
                        } else {
                            dot.classList.remove('active');
                        }
                    });
                }
            }, 100);
        });
        
        // Initial setup
        dotsGuncelle();
        setTimeout(() => kaydirSlide(0), 150); // Give layout time to calculate widths
    }
});
