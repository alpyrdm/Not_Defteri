let aktifAltSekme = localStorage.getItem('hub_aktif_alt_sekme') || 'gunlik-alan';

function ajandaGörünümüDegistir(altSekmeId, tiklananButon) {
    document.querySelectorAll('.ajanda-sub-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.alt-tab-btn').forEach(b => b.classList.remove('active'));
    const hedefAltSekme = document.getElementById(altSekmeId);
    if (hedefAltSekme) hedefAltSekme.classList.add('active');
    
    if (tiklananButon) {
        tiklananButon.classList.add('active');
    } else {
        let btnId = 'btn-gunlik-alan';
        if (altSekmeId === 'haftalik-alan') btnId = 'btn-haftalik-alan';
        else if (altSekmeId === 'aylik-alan') btnId = 'btn-aylik-alan';
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
    }
    localStorage.setItem('hub_aktif_alt_sekme', altSekmeId);
}

window.ajandaGörünümüDegistir = ajandaGörünümüDegistir;

// --- AJANDA MOTORU (DİNAMİK TARİH ENTEGRASYONU) ---
const activeLang = localStorage.getItem('hub_lang') || 'tr';
const saatler = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const gunler = ["pzt", "sal", "car", "per", "cum", "cmt", "paz"];
const gunIsimleriKisa = activeLang === 'en'
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const gunIsimleriUzun = activeLang === 'en'
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
let merkeziAjandaHafizasi = JSON.parse(localStorage.getItem('hub_merkezi_ajanda_verisi') || '{}');

function bulEnYakinSaatGrup(saatStr, saatlerDizisi) {
    if (!saatStr || saatStr === "Tüm Gün") return null;
    const parts = saatStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m)) return null;
    
    let enYakinSaat = saatlerDizisi[0];
    let minDiff = Infinity;
    const targetMinutes = h * 60 + m;
    
    saatlerDizisi.forEach(s => {
        const sParts = s.split(':');
        const sh = parseInt(sParts[0]);
        const sm = parseInt(sParts[1]);
        const sMinutes = sh * 60 + sm;
        const diff = Math.abs(targetMinutes - sMinutes);
        if (diff < minDiff) {
            minDiff = diff;
            enYakinSaat = s;
        }
    });
    return enYakinSaat;
}

let suAnkiTarih = new Date(); // Canlı Gerçek Zaman Takibi
let secilenTarih = new Date(); // Seçilen Gün Takibi

// Modal Mod Durumları: 'haftalik' (Haftalık rutin) veya 'aylik' (Belirli tarih planı)
let modalModu = 'haftalik';
let modalSecilenTarihVerisi = null; // { yil, ay, gun }
let editPlanId = null; // ID of the plan currently being edited

function canliTarihArayuzunuGuncelle() {
    const baslik = document.getElementById('gunluk-tarih-baslik');
    if (!baslik) return;
    const aylarDizi = activeLang === 'en'
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    baslik.innerText = activeLang === 'en'
        ? `${gunIsimleriUzun[secilenTarih.getDay()]}, ${aylarDizi[secilenTarih.getMonth()]} ${secilenTarih.getDate()}, ${secilenTarih.getFullYear()}`
        : `${secilenTarih.getDate()} ${aylarDizi[secilenTarih.getMonth()]} ${secilenTarih.getFullYear()} - ${gunIsimleriUzun[secilenTarih.getDay()]}`;
}

function mevcutHaftaninTarihleriniGetir() {
    let list = [];
    let d = new Date();
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    
    for (let i = 0; i < 7; i++) {
        let yeniTarih = new Date(d.setDate(diff + i));
        list.push({
            kod: gunler[i],
            isim: gunIsimleriKisa[i],
            gunNo: yeniTarih.getDate(),
            yil: yeniTarih.getFullYear(),
            ay: yeniTarih.getMonth(),
            tamMetin: activeLang === 'en'
                ? `${gunIsimleriUzun[yeniTarih.getDay()]} (${yeniTarih.toLocaleString('en-US', { month: 'long' })} ${yeniTarih.getDate()})`
                : `${gunIsimleriUzun[yeniTarih.getDay()]} (${yeniTarih.getDate()} ${yeniTarih.toLocaleString('tr-TR', { month: 'long' })})`
        });
        d = new Date();
    }
    return list;
}

function haftalikTabloyuInsaEt() {
    try {
        merkeziAjandaHafizasi = JSON.parse(localStorage.getItem('hub_merkezi_ajanda_verisi') || '{}');
    } catch(e) {}

    const govde = document.getElementById('haftalik-tablo-govde');
    const baslikSatiri = document.getElementById('haftalik-baslik-satiri');
    if (!govde || !baslikSatiri) return;
    
    const haftaDetaylari = mevcutHaftaninTarihleriniGetir();
    const canliBugun = new Date().getDay();
    const bugunKod = canliBugun === 0 ? "paz" : gunler[canliBugun - 1];
    
    baslikSatiri.innerHTML = `<div class="saat-etiket">Saat</div>`;
    haftaDetaylari.forEach(h => {
        const div = document.createElement('div');
        div.innerText = `${h.isim} (${h.gunNo})`;
        if (h.kod === bugunKod) {
            div.classList.add('haftalik-tablo-bugun-vurgu');
            div.title = "Bugündesiniz";
        }
        baslikSatiri.appendChild(div);
    });

    govde.innerHTML = "";

    // 1. Tüm Gün Hatırlatıcıları Satırı Ekle
    const tumGunSatir = document.createElement('div');
    tumGunSatir.className = 'tablo-satir tum-gun-satiri';
    
    const tumGunEtiket = document.createElement('div');
    tumGunEtiket.className = 'saat-etiket';
    tumGunEtiket.innerText = 'Tüm Gün';
    tumGunEtiket.style.fontWeight = 'bold';
    tumGunEtiket.style.color = '#ef4444';
    tumGunSatir.appendChild(tumGunEtiket);
    
    haftaDetaylari.forEach(h => {
        const gun = h.kod;
        const hucre = document.createElement('textarea');
        hucre.className = 'tum-gun-hucre';
        hucre.placeholder = 'Tüm gün...';
        hucre.style.fontWeight = '500';
        hucre.style.color = '#b91c1c';
        hucre.style.height = '45px';
        
        const ozelKey = `aylik_planlar_${h.yil}_${h.ay}_${h.gunNo}`;
        
        // Fetch specific date all-day plans
        let ozelTumGunler = [];
        try {
            const ozelPlanlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");
            ozelTumGunler = ozelPlanlar.filter(p => p.saat === "Tüm Gün").map(p => p.not);
        } catch(e) {}
        
        const birlesikIcerik = ozelTumGunler.join(" | ");
        hucre.value = birlesikIcerik;
        
        if (gun === bugunKod) {
            hucre.style.backgroundColor = "rgba(59, 130, 246, 0.05)";
        } else if (birlesikIcerik.trim() !== "") {
            hucre.style.backgroundColor = "rgba(239, 68, 68, 0.06)";
            hucre.style.borderLeft = "2px solid #ef4444";
        }
        
        hucre.oninput = () => {
            const val = hucre.value.trim();
            let planlar = [];
            try {
                planlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");
            } catch(e) {}
            
            planlar = planlar.filter(p => p.saat !== "Tüm Gün");
            
            if (val !== "") {
                planlar.push({
                    id: Date.now().toString(),
                    saat: "Tüm Gün",
                    not: val
                });
            }
            
            if (planlar.length > 0) {
                merkeziAjandaHafizasi[ozelKey] = JSON.stringify(planlar);
            } else {
                delete merkeziAjandaHafizasi[ozelKey];
            }
            
            localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
            
            if (hucre.value.trim() !== "") {
                hucre.style.backgroundColor = "rgba(239, 68, 68, 0.06)";
                hucre.style.borderLeft = "2px solid #ef4444";
            } else {
                hucre.style.backgroundColor = (gun === bugunKod) ? "rgba(59, 130, 246, 0.05)" : "transparent";
                hucre.style.borderLeft = "none";
            }
            
            gunlukPlanlariListele();
            takvimCiz();
        };
        tumGunSatir.appendChild(hucre);
    });
    govde.appendChild(tumGunSatir);

    saatler.forEach(saat => {
        const satir = document.createElement('div'); satir.className = 'tablo-satir';
        const saatEtiket = document.createElement('div'); saatEtiket.className = 'saat-etiket'; saatEtiket.innerText = saat; satir.appendChild(saatEtiket);
        haftaDetaylari.forEach(h => {
            const gun = h.kod;
            const hucre = document.createElement('textarea'); 
            const ozelKey = `aylik_planlar_${h.yil}_${h.ay}_${h.gunNo}`;
            
            // Fetch specific date hourly plans
            let ozelSaatlikler = [];
            try {
                const ozelPlanlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");
                ozelPlanlar.forEach(p => {
                    if (p.saat === "Tüm Gün") return;
                    const enYakin = bulEnYakinSaatGrup(p.saat, saatler);
                    if (enYakin === saat) {
                        if (p.saat === saat) {
                            ozelSaatlikler.push(p.not);
                        } else {
                            ozelSaatlikler.push(`[${p.saat}] ${p.not}`);
                        }
                    }
                });
            } catch(e) {}
            
            const birlesikIcerik = ozelSaatlikler.join(" | ");
            hucre.value = birlesikIcerik;
            
            if (gun === bugunKod) hucre.style.backgroundColor = "rgba(59, 130, 246, 0.02)";
            
            hucre.oninput = () => { 
                const val = hucre.value.trim();
                let planlar = [];
                try {
                    planlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");
                } catch(e) {}
                
                planlar = planlar.filter(p => p.saat === "Tüm Gün" || bulEnYakinSaatGrup(p.saat, saatler) !== saat);
                
                if (val !== "") {
                    planlar.push({
                        id: Date.now().toString(),
                        saat: saat,
                        not: val
                    });
                }
                
                if (planlar.length > 0) {
                    merkeziAjandaHafizasi[ozelKey] = JSON.stringify(planlar);
                } else {
                    delete merkeziAjandaHafizasi[ozelKey];
                }
                
                localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi)); 
                gunlukPlanlariListele(); 
                takvimCiz();
            };
            satir.appendChild(hucre);
        });
        govde.appendChild(satir);
    });
}

function gunlukPlanlariListele() {
    try {
        merkeziAjandaHafizasi = JSON.parse(localStorage.getItem('hub_merkezi_ajanda_verisi') || '{}');
    } catch(e) {}

    const listeKapsayici = document.getElementById('gunluk-aktif-planlar');
    if (listeKapsayici) {
        listeKapsayici.innerHTML = "";
        const bugunIndex = secilenTarih.getDay(); 
        const dinamikGunKodu = bugunIndex === 0 ? "paz" : gunler[bugunIndex - 1]; 
        
        const bugunYil = secilenTarih.getFullYear();
        const bugunAy = secilenTarih.getMonth();
        const bugunGun = secilenTarih.getDate();
        const ozelKey = `aylik_planlar_${bugunYil}_${bugunAy}_${bugunGun}`;
        const planlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");

        // 1. Tüm Gün Hatırlatıcılarını Listele (En Üstte Vurgulu)
        const tumGunRutin = merkeziAjandaHafizasi[`${dinamikGunKodu}_tumgun`];
        const tumGunOzel = planlar.filter(p => p.saat === "Tüm Gün");
        
        if ((tumGunRutin && tumGunRutin.trim() !== "") || tumGunOzel.length > 0) {
            const tumGunKonteynir = document.createElement('div');
            tumGunKonteynir.className = 'gunluk-tum-gun-konteynir';
            tumGunKonteynir.style.backgroundColor = 'rgba(239, 68, 68, 0.04)';
            tumGunKonteynir.style.border = '1px dashed rgba(239, 68, 68, 0.2)';
            tumGunKonteynir.style.borderRadius = '8px';
            tumGunKonteynir.style.padding = '10px';
            tumGunKonteynir.style.marginBottom = '15px';
            
            const baslik = document.createElement('div');
            baslik.innerText = "📌 Günlük Hatırlatıcılar (Tüm Gün)";
            baslik.style.color = "#ef4444";
            baslik.style.fontSize = "13px";
            baslik.style.fontWeight = "bold";
            baslik.style.marginBottom = "8px";
            tumGunKonteynir.appendChild(baslik);
            
            // Rutin Tüm Gün
            if (tumGunRutin && tumGunRutin.trim() !== "") {
                const kart = document.createElement('div');
                kart.className = 'tek-plan-karti';
                kart.style.borderLeft = '3px solid #ef4444';
                kart.style.marginBottom = '6px';
                
                const saatAlani = document.createElement('div');
                saatAlani.className = 'tek-plan-saat';
                saatAlani.style.color = '#ef4444';
                saatAlani.innerText = activeLang === 'en' ? "All Day" : "Tüm Gün";
                
                const metinAlani = document.createElement('div');
                metinAlani.className = 'tek-plan-metin';
                metinAlani.style.fontWeight = '500';
                metinAlani.innerText = tumGunRutin;
                
                const silBtn = document.createElement('button');
                silBtn.className = 'tek-plan-sil';
                silBtn.innerText = activeLang === 'en' ? 'Delete' : 'Sil';
                silBtn.onclick = () => {
                    merkeziAjandaHafizasi[`${dinamikGunKodu}_tumgun`] = "";
                    localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
                    gunlukPlanlariListele();
                    haftalikTabloyuInsaEt();
                    takvimCiz();
                };
                kart.append(saatAlani, metinAlani, silBtn);
                tumGunKonteynir.appendChild(kart);
            }
            
            // Özel Tüm Günler
            tumGunOzel.forEach(p => {
                const kart = document.createElement('div');
                kart.className = 'tek-plan-karti';
                kart.style.borderLeft = '3px solid #ef4444';
                kart.style.marginBottom = '6px';
                
                const saatAlani = document.createElement('div');
                saatAlani.className = 'tek-plan-saat';
                saatAlani.style.color = '#ef4444';
                saatAlani.innerText = activeLang === 'en' ? "All Day" : "Tüm Gün";
                
                const metinAlani = document.createElement('div');
                metinAlani.className = 'tek-plan-metin';
                metinAlani.style.fontWeight = '500';
                metinAlani.innerText = p.not;
                
                const silBtn = document.createElement('button');
                silBtn.className = 'tek-plan-sil';
                silBtn.innerText = activeLang === 'en' ? 'Delete' : 'Sil';
                silBtn.onclick = () => {
                    if (confirm(activeLang === 'en' ? "Are you sure you want to delete this custom plan?" : "Bu özel planı silmek istediğinize emin misiniz?")) {
                        const yeniListe = planlar.filter(x => {
                            const xId = x.id ? x.id.toString() : '';
                            const pId = p.id ? p.id.toString() : '';
                            if (!xId || !pId) {
                                return x.saat !== p.saat || x.not !== p.not;
                            }
                            return xId !== pId;
                        });
                        if (yeniListe.length > 0) {
                            merkeziAjandaHafizasi[ozelKey] = JSON.stringify(yeniListe);
                        } else {
                            delete merkeziAjandaHafizasi[ozelKey];
                        }
                        localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
                        gunlukPlanlariListele();
                        takvimCiz();
                    }
                };
                const duzenleBtn = document.createElement('button');
                duzenleBtn.className = 'tek-plan-duzenle';
                duzenleBtn.innerText = activeLang === 'en' ? 'Edit' : 'Düzenle';
                duzenleBtn.onclick = () => {
                    acPlanDuzenleModal(p, ozelKey);
                };
                
                kart.append(saatAlani, metinAlani, duzenleBtn, silBtn);
                tumGunKonteynir.appendChild(kart);
            });
            
            listeKapsayici.appendChild(tumGunKonteynir);
        }

        // 2. Saatlik Rutin Planları Listele
        let planVarMi = false;
        saatler.forEach(saat => {
            const hucreKodu = `${dinamikGunKodu}_${saat}`; 
            const icerik = merkeziAjandaHafizasi[hucreKodu];
            if (icerik && icerik.trim() !== "") {
                planVarMi = true;
                const kart = document.createElement('div'); kart.className = 'tek-plan-karti';
                const saatAlani = document.createElement('div'); saatAlani.className = 'tek-plan-saat'; saatAlani.innerText = saat;
                const metinAlani = document.createElement('div'); metinAlani.className = 'tek-plan-metin'; metinAlani.innerText = icerik;
                const silBtn = document.createElement('button'); silBtn.className = 'tek-plan-sil'; silBtn.innerText = activeLang === 'en' ? 'Delete' : 'Sil';
                silBtn.onclick = () => { 
                    merkeziAjandaHafizasi[hucreKodu] = ""; 
                    localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi)); 
                    gunlukPlanlariListele(); haftalikTabloyuInsaEt();
                };
                kart.append(saatAlani, metinAlani, silBtn); 
                listeKapsayici.appendChild(kart);
            }
        });
        if (!planVarMi && !((tumGunRutin && tumGunRutin.trim() !== "") || tumGunOzel.length > 0)) {
            listeKapsayici.innerHTML = activeLang === 'en'
                ? `<div style="color:#94a3b8; text-align:center; padding:15px; font-style:italic;">No routine plans scheduled for today.</div>`
                : `<div style="color:#94a3b8; text-align:center; padding:15px; font-style:italic;">Bugün için girilmiş rutin bir planınız bulunmuyor.</div>`;
        }
    }

    // 3. Bugünün Özel Tarih Planlarını Listele (Saatlik Olanlar)
    const ozelPlanlarKapsayici = document.getElementById('gunluk-ozel-planlar-kapsayici');
    const ozelPlanlarListe = document.getElementById('gunluk-ozel-aktif-planlar');
    
    if (ozelPlanlarListe) {
        ozelPlanlarListe.innerHTML = "";
        
        const bugunYil = secilenTarih.getFullYear();
        const bugunAy = secilenTarih.getMonth();
        const bugunGun = secilenTarih.getDate();
        
        const ozelKey = `aylik_planlar_${bugunYil}_${bugunAy}_${bugunGun}`;
        const planlar = JSON.parse(merkeziAjandaHafizasi[ozelKey] || "[]");
        const saatliOzelPlanlar = planlar.filter(p => p.saat !== "Tüm Gün");
        
        if (saatliOzelPlanlar.length > 0) {
            if (ozelPlanlarKapsayici) ozelPlanlarKapsayici.style.display = 'block';
            saatliOzelPlanlar.forEach(p => {
                const kart = document.createElement('div'); kart.className = 'tek-plan-karti';
                kart.style.borderLeftColor = '#8b5cf6'; // Özel takvim planları için mor sol kenar
                
                const saatAlani = document.createElement('div'); 
                saatAlani.className = 'tek-plan-saat'; 
                saatAlani.style.color = '#8b5cf6';
                saatAlani.innerText = p.saat;
                
                const metinAlani = document.createElement('div'); 
                metinAlani.className = 'tek-plan-metin'; 
                metinAlani.innerText = p.not;
                
                const silBtn = document.createElement('button'); 
                silBtn.className = 'tek-plan-sil'; 
                silBtn.innerText = activeLang === 'en' ? 'Delete' : 'Sil';
                silBtn.onclick = () => { 
                    if (confirm(activeLang === 'en' ? "Are you sure you want to delete this custom plan?" : "Bu özel planı silmek istediğinize emin misiniz?")) {
                        const yeniListe = planlar.filter(x => {
                            const xId = x.id ? x.id.toString() : '';
                            const pId = p.id ? p.id.toString() : '';
                            if (!xId || !pId) {
                                return x.saat !== p.saat || x.not !== p.not;
                            }
                            return xId !== pId;
                        });
                        if (yeniListe.length > 0) {
                            merkeziAjandaHafizasi[ozelKey] = JSON.stringify(yeniListe);
                        } else {
                            delete merkeziAjandaHafizasi[ozelKey];
                        }
                        localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
                        gunlukPlanlariListele();
                        takvimCiz();
                    }
                };
                
                const duzenleBtn = document.createElement('button');
                duzenleBtn.className = 'tek-plan-duzenle';
                duzenleBtn.innerText = activeLang === 'en' ? 'Edit' : 'Düzenle';
                duzenleBtn.onclick = () => {
                    acPlanDuzenleModal(p, ozelKey);
                };
                
                kart.append(saatAlani, metinAlani, duzenleBtn, silBtn);
                ozelPlanlarListe.appendChild(kart);
            });
        } else {
            if (ozelPlanlarKapsayici) ozelPlanlarKapsayici.style.display = 'none';
        }
    }
}

function modalGunSecenekleriniDoldur() {
    const select = document.getElementById('modal-gun-select');
    if (!select) return;
    select.innerHTML = "";
    const haftaDetaylari = mevcutHaftaninTarihleriniGetir();
    const secilenGunIndex = secilenTarih.getDay();
    const secilenGunKod = secilenGunIndex === 0 ? "paz" : gunler[secilenGunIndex - 1];
    
    haftaDetaylari.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.kod;
        opt.innerText = h.tamMetin;
        if (h.kod === secilenGunKod) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

// Aylık Takvimden Plan Ekleme Modalı Açıcı
function acTakvimEtkinlikModal(yil, ay, gunNo) {
    const planModal = document.getElementById('plan-modal');
    const modalBaslik = document.getElementById('modal-baslik');
    const tarihAlani = document.getElementById('modal-secilen-tarih-alani');
    const gunKapsayici = document.getElementById('modal-gun-kapsayici');
    
    if (!planModal) return;
    
    modalModu = 'aylik';
    modalSecilenTarihVerisi = { yil, ay, gun: gunNo };
    
    const aylar = activeLang === 'en'
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    if (modalBaslik) modalBaslik.innerText = activeLang === 'en' ? "Add Plan to Calendar" : "Takvime Plan Ekle";
    if (tarihAlani) {
        tarihAlani.innerText = activeLang === 'en'
            ? `Selected Date: ${aylar[ay]} ${gunNo}, ${yil}`
            : `Seçilen Tarih: ${gunNo} ${aylar[ay]} ${yil}`;
        tarihAlani.style.display = 'block';
    }
    if (gunKapsayici) {
        gunKapsayici.style.display = 'none';
    }
    
    const modalTumGunBtn = document.getElementById('modal-tum-gun-btn');
    const modalSaatKapsayici = document.getElementById('modal-saat-kapsayici');
    if (modalTumGunBtn) {
        modalTumGunBtn.classList.remove('active');
        modalTumGunBtn.innerText = activeLang === 'en' 
            ? "All Day Reminder: OFF 🔴" 
            : "Tüm Gün Sürecek Hatırlatıcı: Kapalı 🔴";
    }
    if (modalSaatKapsayici) {
        modalSaatKapsayici.style.display = 'block';
        const modalSaatSelect = document.getElementById('modal-saat-select');
        if (modalSaatSelect) {
            const simdi = new Date();
            const saat = String(simdi.getHours()).padStart(2, '0');
            const dakika = String(simdi.getMinutes()).padStart(2, '0');
            modalSaatSelect.value = `${saat}:${dakika}`;
        }
    }
    
    planModal.style.display = 'flex';
}

// Düzenleme Modalı Açıcı
function acPlanDuzenleModal(plan, ozelKey) {
    const planModal = document.getElementById('plan-modal');
    const modalBaslik = document.getElementById('modal-baslik');
    const tarihAlani = document.getElementById('modal-secilen-tarih-alani');
    const gunKapsayici = document.getElementById('modal-gun-kapsayici');
    const modalNotInput = document.getElementById('modal-not-input');
    const modalTumGunBtn = document.getElementById('modal-tum-gun-btn');
    const modalSaatKapsayici = document.getElementById('modal-saat-kapsayici');
    const modalSaatSelect = document.getElementById('modal-saat-select');

    if (!planModal) return;

    modalModu = 'edit';
    editPlanId = plan.id;
    
    // Parse key format aylik_planlar_Y_M_D
    const parts = ozelKey.split('_');
    const yil = parseInt(parts[2]);
    const ay = parseInt(parts[3]);
    const gunNo = parseInt(parts[4]);
    modalSecilenTarihVerisi = { yil, ay, gun: gunNo };

    const aylar = activeLang === 'en'
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    if (modalBaslik) {
        modalBaslik.innerText = activeLang === 'en' ? "Edit Plan Details" : "Plan Detaylarını Düzenle";
    }
    if (tarihAlani) {
        tarihAlani.innerText = activeLang === 'en'
            ? `Date: ${aylar[ay]} ${gunNo}, ${yil}`
            : `Tarih: ${gunNo} ${aylar[ay]} ${yil}`;
        tarihAlani.style.display = 'block';
    }
    if (gunKapsayici) {
        gunKapsayici.style.display = 'none';
    }
    if (modalNotInput) {
        modalNotInput.value = plan.not || "";
    }

    isTumGun = (plan.saat === "Tüm Gün");
    if (modalTumGunBtn) {
        if (isTumGun) {
            modalTumGunBtn.classList.add('active');
            modalTumGunBtn.innerText = activeLang === 'en' 
                ? "All Day Reminder: ON 🟢" 
                : "Tüm Gün Sürecek Hatırlatıcı: Açık 🟢";
            if (modalSaatKapsayici) modalSaatKapsayici.style.display = 'none';
        } else {
            modalTumGunBtn.classList.remove('active');
            modalTumGunBtn.innerText = activeLang === 'en' 
                ? "All Day Reminder: OFF 🔴" 
                : "Tüm Gün Sürecek Hatırlatıcı: Kapalı 🔴";
            if (modalSaatKapsayici) modalSaatKapsayici.style.display = 'block';
            if (modalSaatSelect) modalSaatSelect.value = plan.saat || "12:00";
        }
    }

    planModal.style.display = 'flex';
}

function takvimCiz() {
    try {
        merkeziAjandaHafizasi = JSON.parse(localStorage.getItem('hub_merkezi_ajanda_verisi') || '{}');
    } catch(e) {}

    const yil = suAnkiTarih.getFullYear(); const ay = suAnkiTarih.getMonth();
    const aylar = activeLang === 'en'
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const baslikElemani = document.getElementById('takvim-ay-yil-baslik'); if (baslikElemani) baslikElemani.innerText = `${aylar[ay]} ${yil}`;
    const grid = document.getElementById('takvim-gunler-grid'); if (!grid) return; grid.innerHTML = "";
    
    let ilkGun = new Date(yil, ay, 1).getDay(); 
    ilkGun = ilkGun === 0 ? 6 : ilkGun - 1; 
    const toplamGun = new Date(yil, ay + 1, 0).getDate();
    
    const canliSimdi = new Date();
    
    for (let i = 0; i < ilkGun; i++) { 
        const bos = document.createElement('div'); 
        bos.className = 'takvim-gun-kutu takvim-bos-kutu'; 
        grid.appendChild(bos); 
    }
    
    for (let gunNo = 1; gunNo <= toplamGun; gunNo++) {
        const kutu = document.createElement('div'); 
        kutu.className = 'takvim-gun-kutu';
        
        if (gunNo === canliSimdi.getDate() && ay === canliSimdi.getMonth() && yil === canliSimdi.getFullYear()) {
            kutu.classList.add('takvim-bugun');
        }
        
        const no = document.createElement('div'); 
        no.className = 'takvim-gun-no'; 
        no.innerText = gunNo;
        kutu.appendChild(no);
        
        // Bu güne ait planları getir
        const yeniKey = `aylik_planlar_${yil}_${ay}_${gunNo}`;
        const eskiKey = `aylik_${yil}_${ay}_${gunNo}`;
        
        // Göç (Migration): Eski düz metin verilerini saatli dizi yapısına taşı
        if (merkeziAjandaHafizasi[eskiKey] && merkeziAjandaHafizasi[eskiKey].trim() !== "" && !merkeziAjandaHafizasi[yeniKey]) {
            const eskiIcerik = merkeziAjandaHafizasi[eskiKey];
            merkeziAjandaHafizasi[yeniKey] = JSON.stringify([{ id: Date.now().toString(), saat: "Tüm Gün", not: eskiIcerik }]);
            delete merkeziAjandaHafizasi[eskiKey];
            localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
        }

        // 1. Haftalık Rutin Planları Getir
        let birlesikPlanlar = [];
        const celDate = new Date(yil, ay, gunNo);
        const celDayIndex = celDate.getDay();
        const celDayCode = celDayIndex === 0 ? "paz" : gunler[celDayIndex - 1];
        
        // Rutin Tüm Gün Hatırlatıcı
        const rTumGunCode = `${celDayCode}_tumgun`;
        const rTumGunIcerik = merkeziAjandaHafizasi[rTumGunCode];
        if (rTumGunIcerik && rTumGunIcerik.trim() !== "") {
            birlesikPlanlar.push({
                id: `routine_${rTumGunCode}`,
                saat: "Tüm Gün",
                not: rTumGunIcerik,
                isRoutine: true,
                rCode: rTumGunCode
            });
        }

        saatler.forEach(saat => {
            const rCode = `${celDayCode}_${saat}`;
            const rIcerik = merkeziAjandaHafizasi[rCode];
            if (rIcerik && rIcerik.trim() !== "") {
                birlesikPlanlar.push({
                    id: `routine_${rCode}`,
                    saat: saat,
                    not: rIcerik,
                    isRoutine: true,
                    rCode: rCode
                });
            }
        });

        // 2. Özel Takvim Planlarını Getir
        const ozelPlanlar = JSON.parse(merkeziAjandaHafizasi[yeniKey] || "[]");
        ozelPlanlar.forEach(p => {
            birlesikPlanlar.push({
                id: p.id,
                saat: p.saat,
                not: p.not,
                isRoutine: false,
                yeniKey: yeniKey
            });
        });

        // Tüm Gün olanları en üste sırala, saatlikleri kendi arasında sırala
        birlesikPlanlar.sort((a, b) => {
            if (a.saat === "Tüm Gün" && b.saat !== "Tüm Gün") return -1;
            if (a.saat !== "Tüm Gün" && b.saat === "Tüm Gün") return 1;
            return a.saat.localeCompare(b.saat);
        });
        
        if (gunNo === secilenTarih.getDate() && ay === secilenTarih.getMonth() && yil === secilenTarih.getFullYear()) {
            kutu.classList.add('takvim-secilen-gun');
        }

        // Etkinlik listesi oluştur
        const liste = document.createElement('ul');
        liste.className = 'takvim-etkinlikler-liste';
        
        birlesikPlanlar.forEach(p => {
            const li = document.createElement('li');
            li.className = 'takvim-etkinlik-badge';
            if (p.isRoutine) {
                li.style.borderLeft = "2px solid #3b82f6"; // Blue left border for routine
            }
            if (p.saat === "Tüm Gün") {
                li.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
                li.style.color = "#b91c1c";
                li.style.borderLeft = "2px solid #ef4444";
                li.style.fontWeight = "600";
            }
            li.title = `${p.saat} - ${p.not}${p.isRoutine ? ' (Haftalık Rutin)' : ''}`;
            
            const spanText = document.createElement('span');
            spanText.innerText = `${p.saat} ${p.not}`;
            li.appendChild(spanText);
            
            const silBtn = document.createElement('button');
            silBtn.className = 'takvim-etkinlik-sil-btn';
            silBtn.innerText = '×';
            silBtn.onclick = (e) => {
                e.stopPropagation(); // Kutu tıklama olayını engelle!
                if (p.isRoutine) {
                    if (confirm("Bu plan haftalık rutin programınızdan silinecektir. Emin misiniz?")) {
                        merkeziAjandaHafizasi[p.rCode] = "";
                        localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
                        takvimCiz();
                        gunlukPlanlariListele();
                        haftalikTabloyuInsaEt();
                    }
                } else {
                    if (confirm("Bu planı silmek istediğinize emin misiniz?")) {
                        try {
                            const planlar = JSON.parse(merkeziAjandaHafizasi[p.yeniKey] || "[]");
                            const yeniPlanlar = planlar.filter(x => {
                                const xId = x.id ? x.id.toString() : '';
                                const pId = p.id ? p.id.toString() : '';
                                if (!xId || !pId) {
                                    return x.saat !== p.saat || x.not !== p.not;
                                }
                                return xId !== pId;
                            });
                            if (yeniPlanlar.length > 0) {
                                merkeziAjandaHafizasi[p.yeniKey] = JSON.stringify(yeniPlanlar);
                            } else {
                                delete merkeziAjandaHafizasi[p.yeniKey];
                            }
                            localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi));
                            takvimCiz();
                            gunlukPlanlariListele();
                            if (typeof haftalikTabloyuInsaEt === 'function') haftalikTabloyuInsaEt();
                        } catch(err) {}
                    }
                }
            };
            li.appendChild(silBtn);
            liste.appendChild(li);
        });
        
        kutu.appendChild(liste);
        
        // Kutuya tıklayınca tarihi güncelle ve modal aç
        kutu.onclick = () => {
            secilenTarih = new Date(yil, ay, gunNo);
            canliTarihArayuzunuGuncelle();
            gunlukPlanlariListele();
            takvimCiz(); // Redraw to update selected style
            acTakvimEtkinlikModal(yil, ay, gunNo);
        };
        
        grid.appendChild(kutu);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    canliTarihArayuzunuGuncelle();
    haftalikTabloyuInsaEt();
    gunlukPlanlariListele();
    takvimCiz();
    ajandaGörünümüDegistir(aktifAltSekme, null);

    const btnGunlik = document.getElementById('btn-gunlik-alan');
    const btnHaftalik = document.getElementById('btn-haftalik-alan');
    const btnAylik = document.getElementById('btn-aylik-alan');
    if (btnGunlik) btnGunlik.onclick = () => ajandaGörünümüDegistir('gunlik-alan', btnGunlik);
    if (btnHaftalik) btnHaftalik.onclick = () => ajandaGörünümüDegistir('haftalik-alan', btnHaftalik);
    if (btnAylik) btnAylik.onclick = () => ajandaGörünümüDegistir('aylik-alan', btnAylik);

    const tGeriBtn = document.getElementById('gunluk-tarih-geri-btn');
    const tIleriBtn = document.getElementById('gunluk-tarih-ileri-btn');
    if (tGeriBtn) {
        tGeriBtn.onclick = () => {
            secilenTarih.setDate(secilenTarih.getDate() - 1);
            canliTarihArayuzunuGuncelle();
            gunlukPlanlariListele();
            takvimCiz();
        };
    }
    if (tIleriBtn) {
        tIleriBtn.onclick = () => {
            secilenTarih.setDate(secilenTarih.getDate() + 1);
            canliTarihArayuzunuGuncelle();
            gunlukPlanlariListele();
            takvimCiz();
        };
    }

    const planModal = document.getElementById('plan-modal');
    const acPlanModalBtn = document.getElementById('ac-plan-modal-btn');
    const modalIptalBtn = document.getElementById('modal-iptal-btn');
    const modalKaydetBtn = document.getElementById('modal-kaydet-btn');
    const modalSaatSelect = document.getElementById('modal-saat-select');
    const modalNotInput = document.getElementById('modal-not-input');
    const modalGunSelect = document.getElementById('modal-gun-select');
    const modalTumGunBtn = document.getElementById('modal-tum-gun-btn');
    const modalSaatKapsayici = document.getElementById('modal-saat-kapsayici');
    let isTumGun = false;

    // Dynamically inject validation span under the input field
    if (modalNotInput) {
        const valSpan = document.createElement('span');
        valSpan.id = 'ajanda-validation-msg';
        valSpan.style.cssText = 'display: none; color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: 600; font-family: sans-serif;';
        modalNotInput.parentNode.insertBefore(valSpan, modalNotInput.nextSibling);
    }

    const resetAjandaValidation = () => {
        const valSpan = document.getElementById('ajanda-validation-msg');
        if (valSpan) valSpan.style.display = 'none';
        if (modalNotInput) modalNotInput.style.borderColor = '';
    };

    if (modalNotInput) {
        modalNotInput.oninput = resetAjandaValidation;
    }

    if (modalTumGunBtn && modalSaatKapsayici) {
        modalTumGunBtn.onclick = (e) => {
            if (e) e.preventDefault();
            modalTumGunBtn.classList.toggle('active');
            isTumGun = modalTumGunBtn.classList.contains('active');
            if (isTumGun) {
                modalTumGunBtn.innerText = activeLang === 'en' 
                    ? "All Day Reminder: ON 🟢" 
                    : "Tüm Gün Sürecek Hatırlatıcı: Açık 🟢";
                modalSaatKapsayici.style.display = 'none';
            } else {
                modalTumGunBtn.innerText = activeLang === 'en' 
                    ? "All Day Reminder: OFF 🔴" 
                    : "Tüm Gün Sürecek Hatırlatıcı: Kapalı 🔴";
                modalSaatKapsayici.style.display = 'block';
            }
        };
    }
    
    if (acPlanModalBtn) {
        acPlanModalBtn.onclick = () => {
            modalModu = 'aylik';
            modalSecilenTarihVerisi = { 
                yil: secilenTarih.getFullYear(), 
                ay: secilenTarih.getMonth(), 
                gun: secilenTarih.getDate() 
            };
            
            const modalBaslik = document.getElementById('modal-baslik');
            const tarihAlani = document.getElementById('modal-secilen-tarih-alani');
            const gunKapsayici = document.getElementById('modal-gun-kapsayici');
            
            const aylar = activeLang === 'en'
                ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                : ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            
            if (modalBaslik) modalBaslik.innerText = activeLang === 'en' ? "Add New Plan" : "Yeni Plan Ekle";
            if (tarihAlani) {
                tarihAlani.innerText = activeLang === 'en'
                    ? `Selected Date: ${aylar[secilenTarih.getMonth()]} ${secilenTarih.getDate()}, ${secilenTarih.getFullYear()}`
                    : `Seçilen Tarih: ${secilenTarih.getDate()} ${aylar[secilenTarih.getMonth()]} ${secilenTarih.getFullYear()}`;
                tarihAlani.style.display = 'block';
            }
            if (gunKapsayici) {
                gunKapsayici.style.display = 'none';
            }
            
            isTumGun = false;
            if (modalTumGunBtn) {
                modalTumGunBtn.classList.remove('active');
                modalTumGunBtn.innerText = activeLang === 'en' 
                    ? "All Day Reminder: OFF 🔴" 
                    : "Tüm Gün Sürecek Hatırlatıcı: Kapalı 🔴";
            }
            if (modalSaatKapsayici) {
                modalSaatKapsayici.style.display = 'block';
                const modalSaatSelect = document.getElementById('modal-saat-select');
                if (modalSaatSelect) {
                    const simdi = new Date();
                    const saat = String(simdi.getHours()).padStart(2, '0');
                    const dakika = String(simdi.getMinutes()).padStart(2, '0');
                    modalSaatSelect.value = `${saat}:${dakika}`;
                }
            }
            
            planModal.style.display = 'flex';
        };
    }
    
    if (modalIptalBtn) {
        modalIptalBtn.onclick = () => { 
            planModal.style.display = 'none'; 
            modalNotInput.value = ""; 
            resetAjandaValidation();
        };
    }
    
    if (modalKaydetBtn) {
        modalKaydetBtn.onclick = () => {
            const secilenSaat = isTumGun ? "Tüm Gün" : modalSaatSelect.value; 
            const girilenNot = modalNotInput.value.trim();
            
            if (!girilenNot) {
                const valSpan = document.getElementById('ajanda-validation-msg');
                if (valSpan) {
                    valSpan.innerText = activeLang === 'en' ? "This field is required!" : "Bu alanın doldurulması zorunludur!";
                    valSpan.style.display = 'block';
                }
                if (modalNotInput) {
                    modalNotInput.style.borderColor = '#ef4444';
                    modalNotInput.focus();
                }
                return;
            }
            
            if (modalModu === 'haftalik') {
                // Haftalık rutin planı kaydet
                const secilenGun = modalGunSelect.value;
                const saatKod = isTumGun ? "tumgun" : secilenSaat;
                const hucreKodu = `${secilenGun}_${saatKod}`;
                if (merkeziAjandaHafizasi[hucreKodu]) { 
                     merkeziAjandaHafizasi[hucreKodu] += " | " + girilenNot; 
                } else { 
                     merkeziAjandaHafizasi[hucreKodu] = girilenNot; 
                }
            } else if (modalModu === 'aylik') {
                // Takvime özel plan kaydet
                const { yil, ay, gun } = modalSecilenTarihVerisi;
                const yeniKey = `aylik_planlar_${yil}_${ay}_${gun}`;
                
                let planlar = JSON.parse(merkeziAjandaHafizasi[yeniKey] || "[]");
                planlar.push({
                    id: Date.now().toString(),
                    saat: secilenSaat,
                    not: girilenNot
                });
                
                // Tüm Gün planları en üste sıralanacak şekilde sırala
                planlar.sort((a, b) => {
                    if (a.saat === "Tüm Gün" && b.saat !== "Tüm Gün") return -1;
                    if (a.saat !== "Tüm Gün" && b.saat === "Tüm Gün") return 1;
                    return a.saat.localeCompare(b.saat);
                });
                
                merkeziAjandaHafizasi[yeniKey] = JSON.stringify(planlar);
            } else if (modalModu === 'edit') {
                // Özel planı güncelle
                const { yil, ay, gun } = modalSecilenTarihVerisi;
                const yeniKey = `aylik_planlar_${yil}_${ay}_${gun}`;
                
                let planlar = JSON.parse(merkeziAjandaHafizasi[yeniKey] || "[]");
                const planIndex = planlar.findIndex(p => p.id && p.id.toString() === editPlanId.toString());
                if (planIndex !== -1) {
                    planlar[planIndex].saat = secilenSaat;
                    planlar[planIndex].not = girilenNot;
                    
                    // Sort again
                    planlar.sort((a, b) => {
                        if (a.saat === "Tüm Gün" && b.saat !== "Tüm Gün") return -1;
                        if (a.saat !== "Tüm Gün" && b.saat === "Tüm Gün") return 1;
                        return a.saat.localeCompare(b.saat);
                    });
                    
                    merkeziAjandaHafizasi[yeniKey] = JSON.stringify(planlar);
                }
            }
            
            localStorage.setItem('hub_merkezi_ajanda_verisi', JSON.stringify(merkeziAjandaHafizasi)); 
            gunlukPlanlariListele(); 
            haftalikTabloyuInsaEt(); 
            takvimCiz();
            
            planModal.style.display = 'none'; 
            modalNotInput.value = "";
        };
    }

    const oncekiAyBtn = document.getElementById('onceki-ay-btn'); 
    const sonrakiAyBtn = document.getElementById('sonraki-ay-btn');
    if (oncekiAyBtn) oncekiAyBtn.onclick = () => { suAnkiTarih.setMonth(suAnkiTarih.getMonth() - 1); takvimCiz(); };
    if (sonrakiAyBtn) sonrakiAyBtn.onclick = () => { suAnkiTarih.setMonth(suAnkiTarih.getMonth() + 1); takvimCiz(); };
});
