/* =========================================
   1. FIREBASE AYARLARI VE BAŞLATMA
   ========================================= */
const firebaseConfig = {
    apiKey: "AIzaSyB3XiXrKxkIhnuGL_rDyBVUY25P2T20u-4",
    authDomain: "munise-hocamla-matematik.firebaseapp.com",
    databaseURL: "https://munise-hocamla-matematik-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "munise-hocamla-matematik",
    storageBucket: "munise-hocamla-matematik.firebasestorage.app",
    messagingSenderId: "163225575516",
    appId: "1:163225575516:web:474562dce4ce0d7c604699",
    measurementId: "G-BVGCFJ7Z3K"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let aktifKullaniciId = null;
let dersler = []; 
let kazancKayitlari = []; 
let aktifBlok = null; 
let kazancGrafik = null;
let dersGrafik = null;
let modalAcikAy = null;
let modalAcikYil = null;
let globalAyarlar = null;
let duzenlenecekDersId = null; // Düzenleme modu takibi için


/* =========================================
   2. GİRİŞ VE NAVİGASYON
   ========================================= */

auth.onAuthStateChanged((user) => {
    if (user) {
        aktifKullaniciId = user.uid;
        document.getElementById("loginSayfa").style.display = "none";
        document.getElementById("anaUygulama").style.display = "block";
        // ÖNCE AYARLARI KONTROL ET
        ayarKontrolVeBaslat();

    } else {
        aktifKullaniciId = null;
        globalAyarlar = null;

        document.getElementById("loginSayfa").style.display = "flex";
        document.getElementById("anaUygulama").style.display = "none";
    }
});

function googleIleGiris() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(hata => alert(hata.message));
}

function cikisYap() {
    const modal = document.getElementById('cikisModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // KRİTİK NOKTA: Arka planın kaymasını engelle
        document.body.style.overflow = 'hidden'; 
    }
}

function cikisIptal() {
    const modal = document.getElementById('cikisModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // KRİTİK NOKTA: Kaydırmayı tekrar serbest bırak
        document.body.style.overflow = ''; 
    }
}

function cikisOnayla() {
    cikisIptal(); // Önce pencereyi kapat
    
    auth.signOut().then(() => {
        // Çıkış başarılı olunca havalı bir veda mesajı göster
        bildirimGoster("Başarıyla çıkış yapıldı!");
        
        // 1 saniye sonra giriş sayfasına yönlendir (Firebase zaten yönlendirir ama garanti olsun)
        setTimeout(() => {
            sayfaGoster("login");
            window.location.reload();
        }, 1000);
    }).catch((error) => {
        console.error("Çıkış hatası:", error);
    });
}

function ayarKontrolVeBaslat() {
    database.ref(`kullanicilar/${aktifKullaniciId}/ayarlar`).once('value', (snapshot) => {
        globalAyarlar = snapshot.val();

        const header = document.querySelector("header");
        const tercihSayfasi = document.getElementById("tercihlerSayfa");
        const navBar = document.getElementById("nav-bar");

        if (!globalAyarlar || !globalAyarlar.kurulumTamam) {
            // AYAR YOKSA: Header ve Nav gizle, Tercihleri aç
            if(header) header.style.display = "none";
            if(navBar) navBar.style.display = "none";
            
            // Tüm sayfaları gizle
            document.querySelectorAll('.sayfa-bolum').forEach(el => el.style.display = 'none');
            
            tercihSayfasi.style.display = "flex"; 
        } else {
            // AYAR VARSA: Normal akış
            if(header) header.style.display = "block";
            if(navBar) navBar.style.display = "flex";
            tercihSayfasi.style.display = "none";
            verileriBuluttanDinle(); 
            sayfaGoster('panel');
        }
    });
}

// --- YENİLENMİŞ SAYFA GÖSTER FONKSİYONU ---
function sayfaGoster(sayfaId) {
    // 1. Tüm sayfaları gizle
    document.querySelectorAll('.sayfa-bolum').forEach(div => {
        div.style.display = 'none';
    });

    // 2. İstenen sayfayı göster
    const secilenSayfa = document.getElementById(sayfaId + 'Sayfa');
    if (secilenSayfa) {
        secilenSayfa.style.display = 'block';
    }

    // 3. Alt Menü Butonlarını Güncelle
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const colorClass = btn.dataset.color; 
        const bgClass = btn.dataset.bg;       
        
        // Aktiflik sınıflarını temizle
        if (colorClass) btn.classList.remove(colorClass);
        if (bgClass) btn.classList.remove(bgClass);
        btn.classList.remove('active', 'shadow-sm');
        
        // Pasif hale getir (Gri yap)
        btn.classList.add('text-gray-400');
        
        // Animasyon için scale sıfırla
        const svg = btn.querySelector('svg');
        if(svg) {
            svg.classList.remove('scale-110');
            svg.style.stroke = ""; 
        }
        
        // Yazı stili sıfırla - Sadece varsa uygula
        const span = btn.querySelector('span');
        if(span) {
            span.classList.remove('font-bold', 'text-gray-800');
            // Yazı rengini griye çevir
            if(colorClass) span.classList.remove(colorClass);
        }
    });

    // 4. Aktif Butonu Boya
    const aktifBtn = document.getElementById('nav-' + sayfaId);
    if (aktifBtn) {
        const activeColor = aktifBtn.dataset.color;
        const activeBg = aktifBtn.dataset.bg;

        aktifBtn.classList.remove('text-gray-400');
        aktifBtn.classList.add('active', activeColor, activeBg, 'shadow-sm');
        
        const svg = aktifBtn.querySelector('svg');
        if(svg) svg.classList.add('scale-110');
        
        const span = aktifBtn.querySelector('span');
        if(span) {
            span.classList.add('font-bold');
            // Yazı rengini de ikon rengiyle aynı yap
            span.classList.remove('text-gray-400');
            span.classList.add(activeColor);
        }
    }

    // Sayfa özel yüklemeler
    if (sayfaId === "takvim") {
        takvimOlustur();
        setTimeout(() => {
            dersler.forEach(ders => dersCiz(ders));
        }, 50);
    }
    if (sayfaId === "rapor") raporOgrencileriYukle();
    if (sayfaId === "kazanc") formVerileriniYukle();    
    if (sayfaId === "panel") {
        panelOzetiniGuncelle();
        karsilamaGuncelle(); // <-- Bunu ekledik
    }
}

/* =========================================
   3. TERCİHLER VE AYAR KAYDETME
   ========================================= */

function gunSec(btn) {
    // Butona basınca seçildi efekti ver (Mavi)
    if (btn.classList.contains('bg-blue-600')) {
        // Seçimi kaldır
        btn.classList.remove('bg-blue-600', 'text-white', 'secili-tatil');
        btn.classList.add('bg-white', 'text-gray-400');
    } else {
        // Seç
        btn.classList.remove('bg-white', 'text-gray-400');
        btn.classList.add('bg-blue-600', 'text-white', 'secili-tatil');
    }
}

function ayarlariKaydet() {
    console.log("Kaydetme işlemi başladı...");

    // 1. Girdileri Güvenli Şekilde Al (Hata korumalı)
    const adEl = document.getElementById("prefHocaAd");
    const bransEl = document.getElementById("prefBrans");
    const baslaEl = document.getElementById("prefMesaiBasla");
    const bitisEl = document.getElementById("prefMesaiBitis");

    const hocaAd = adEl ? adEl.value : "";
    const brans = bransEl ? bransEl.value : "";
    const basla = baslaEl ? baslaEl.value : "13";
    const bitis = bitisEl ? bitisEl.value : "22";

    // 2. Tatil Günlerini Topla
    const tatiller = [];
    document.querySelectorAll('.secili-tatil').forEach(btn => {
        if(btn.dataset.gun) tatiller.push(Number(btn.dataset.gun));
    });

    // 3. (Eğer eklediysen) Ders Sürelerini Topla 
    const seciliSureler = [];
    document.querySelectorAll('.secili-sure').forEach(btn => {
        if(btn.dataset.sure) seciliSureler.push(Number(btn.dataset.sure));
    });

    // 4. (YENİ) Öğrenci Düzeylerini Topla
    const seciliDuzeyler = [];
    document.querySelectorAll('.secili-duzey').forEach(btn => {
        if(btn.dataset.duzey) seciliDuzeyler.push(btn.dataset.duzey);
    });

    // 5. Kontroller
    if(!hocaAd || !brans) {
        alert("Lütfen adınızı ve branşınızı giriniz.");
        return;
    }

    const yeniAyarlar = {
        ad: hocaAd,
        brans: brans,
        mesaiBasla: Number(basla),
        mesaiBitis: Number(bitis),
        tatilGunleri: tatiller,
        dersSureleri: seciliSureler,
        ogrenciDuzeyleri: seciliDuzeyler, // Veritabanına bu isimle gidiyor
        kurulumTamam: true
    };

    if (typeof database !== 'undefined' && aktifKullaniciId) {
        database.ref(`kullanicilar/${aktifKullaniciId}/ayarlar`).set(yeniAyarlar)
        .then(() => {
            // Modalı hemen kapat
            tercihKapat();
            
            // Havalı bildirimi göster
            bildirimGoster("Ayarlar başarıyla güncellendi!");
            
            // Bildirim göründükten 1.5 saniye sonra sayfayı yenile
            setTimeout(() => {
                window.location.reload(); 
            }, 1500);
        })
        .catch((err) => alert("Hata: " + err.message));
    }
}

/* =========================================
   4. DİNAMİK TAKVİM OLUŞTURMA
   ========================================= */

function takvimOlustur() {
    const tbody = document.getElementById("takvimBody");
    if(!tbody) return;
    tbody.innerHTML = ""; 

    const basla = globalAyarlar ? globalAyarlar.mesaiBasla : 13;
    const bitis = globalAyarlar ? globalAyarlar.mesaiBitis : 22;
    const tatiller = globalAyarlar ? (globalAyarlar.tatilGunleri || []) : [];

    for (let s = basla; s < bitis; s += 0.5) {
        const basSaatStr = s % 1 === 0 ? `${s}:00` : `${Math.floor(s)}:30`;
        
        let rowHtml = `<tr class='border-b last:border-0'>`;
        rowHtml += `<td class='p-3 font-bold bg-gray-50 text-gray-400 text-xs border-r text-center align-top'>${basSaatStr}</td>`;
        
        for (let g = 1; g <= 7; g++) {
            const tatilMi = tatiller.includes(g);
            const bgClass = tatilMi ? "bg-gray-100" : "";
            rowHtml += `<td id="hucre-${g}-${s}" class="p-0 border-r min-h-[50px] relative ${bgClass}"></td>`;
        }
        rowHtml += "</tr>";
        tbody.innerHTML += rowHtml;
    }

    const saatSelect = document.getElementById("baslangic");
    if(saatSelect) {
        saatSelect.innerHTML = "";
        for (let s = basla; s < bitis; s += 0.5) {
             const text = s % 1 === 0 ? `${s}:00` : `${Math.floor(s)}:30`;
             const opt = document.createElement("option");
             opt.value = s;
             opt.text = text;
             saatSelect.appendChild(opt);
        }
    }

    // --- YENİ: Düzey Kutusunu Ayarlardan Doldur ---
    const duzeySelect = document.getElementById("duzey");
    if (duzeySelect) {
        // Önce temizle ve varsayılanı ekle
        duzeySelect.innerHTML = '<option value="">Düzey Seçiniz</option>';
        
        // Ayarlardaki veriyi güvenli şekilde al
        let duzeyler = (globalAyarlar && (globalAyarlar.ogrenciDuzeyleri || globalAyarlar.ogrenciDuzeyi)) || [];
        
        // Eğer veri tekil geldiyse diziye çevir
        if (!Array.isArray(duzeyler)) duzeyler = [duzeyler];

        // Seçenekleri oluştur
        duzeyler.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.innerText = d;
            duzeySelect.appendChild(opt);
        });
    }

// --- YENİ (GÜNCEL): Süre Kutusunu Ayarlardan Doldur (SAAT CİNSİNDEN) ---
    const sureSelect = document.getElementById("sure");
    if (sureSelect) {
        sureSelect.innerHTML = ""; // Temizle
        
        // Ayarlardan süreleri al (Yoksa varsayılan 1 saat olsun)
        let sureler = (globalAyarlar && globalAyarlar.dersSureleri) ? globalAyarlar.dersSureleri : [];
        if (sureler.length === 0) sureler = [1]; 

        sureler.forEach(saat => {
            const opt = document.createElement("option");
            
            // Ayarlar zaten saat (1, 1.5, 2) olduğu için direkt atıyoruz
            opt.value = saat; 
            
            // Ekranda görünecek yazı
            opt.innerText = `${saat} Saat`;
            
            sureSelect.appendChild(opt);
        });
    }
}


/* =========================================
   5. VERİLERİ ÇEKME & GRAFİKLER
   ========================================= */

function verileriBuluttanDinle() {
    if (!aktifKullaniciId) return;

    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).on('value', (snapshot) => {
        const veri = snapshot.val();
        dersler = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        
        if(document.getElementById("takvimSayfa").style.display !== "none") {
            tabloyuTemizle();
            dersler.forEach(ders => dersCiz(ders));
        }
        panelOzetiniGuncelle();
    });

    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar`).on('value', (snapshot) => {
        const veri = snapshot.val();
        kazancKayitlari = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        kazancTablosuCiz();
        panelOzetiniGuncelle();
    });
}

function panelOzetiniGuncelle() {
    const simdi = new Date();
    const buAy = simdi.getMonth();
    const buYil = simdi.getFullYear();

    let buAyKazanc = 0;
    let buAyDersSayisi = 0;
    let bekleyenOdeme = 0;
    const aylikKazancVerisi = Array(12).fill(0);
    const aylikDersVerisi = Array(12).fill(0);

    const benzersizOgrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    const toplamOgrenciEl = document.getElementById("panel-toplamOgrenci");
    if(toplamOgrenciEl) toplamOgrenciEl.innerText = benzersizOgrenciler.length;

    kazancKayitlari.forEach(k => {
        const d = new Date(k.tarih);
        const tutar = k.sure * k.ucret;
        
        if (d.getFullYear() === buYil) {
            if (k.odemeDurumu) {
                aylikKazancVerisi[d.getMonth()] += tutar;
            }
            aylikDersVerisi[d.getMonth()] += 1;

            if (d.getMonth() === buAy) {
                buAyDersSayisi += 1;
                if (k.odemeDurumu) buAyKazanc += tutar;
                else bekleyenOdeme += tutar;
            }
        }
    });

    const elBuAyDers = document.getElementById("panel-buAyDers");
    const elKazanc = document.getElementById("panel-kazanc");
    const elBekleyen = document.getElementById("panel-bekleyen");

    if(elBuAyDers) elBuAyDers.innerText = buAyDersSayisi;
    if(elKazanc) elKazanc.innerText = "₺" + buAyKazanc.toFixed(0);
    if(elBekleyen) elBekleyen.innerText = "₺" + bekleyenOdeme.toFixed(0);

    paneliCiz(aylikKazancVerisi, aylikDersVerisi);
}

/// --- DENGELİ, ŞIK VE "MAVİ KONSEPT" GRAFİKLER ---
function paneliCiz(kazancData, dersData) {
    if(!document.getElementById('kazancChart')) return;

    // Ayları kısalttık (Mobilde sığması için)
    const aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    // ------------------------------------------
    // 1. KAZANÇ GRAFİĞİ (MAVİ - LINE)
    // ------------------------------------------
    const ctx1 = document.getElementById('kazancChart').getContext('2d');
    
    // Mavi Gradyan (Yukarıdan aşağıya solan)
    const gradientKazanc = ctx1.createLinearGradient(0, 0, 0, 350);
    gradientKazanc.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // Blue-600 (Yarı şeffaf)
    gradientKazanc.addColorStop(1, 'rgba(37, 99, 235, 0.0)'); // Tam şeffaf

    if(kazancGrafik) kazancGrafik.destroy();
    
    kazancGrafik = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Kazanç', 
                data: kazancData, 
                borderColor: '#2563eb', // ANA RENK: Blue-600
                backgroundColor: gradientKazanc, 
                borderWidth: 3,
                // Noktalar
                pointRadius: 3, 
                pointBackgroundColor: '#ffffff', // İçi beyaz
                pointBorderColor: '#2563eb',     // Çerçevesi Mavi
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: true, 
                tension: 0.4 // Yumuşak kavis
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Beyaz tooltip
                    titleColor: '#1e293b', // Koyu başlık
                    bodyColor: '#2563eb',  // Mavi yazı
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₺' + context.raw.toLocaleString('tr-TR');
                        }
                    }
                }
            },
            scales: {
                x: { 
                    display: true, 
                    grid: { display: false }, 
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: { 
                    display: true,
                    beginAtZero: true, 
                    grid: { 
                        color: '#f1f5f9', // Çok silik ızgara
                        borderDash: [5, 5] // Kesik çizgiler
                    },
                    ticks: { display: false } 
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });

    // ------------------------------------------
    // 2. DERS YOĞUNLUĞU GRAFİĞİ (MAVİ - BAR)
    // ------------------------------------------
    const ctx2 = document.getElementById('dersChart').getContext('2d');
    
    // Bar için Mavi Geçiş
    const gradientDers = ctx2.createLinearGradient(0, 0, 0, 300);
    gradientDers.addColorStop(0, '#2563eb'); // Üst taraf Blue-600
    gradientDers.addColorStop(1, '#60a5fa'); // Alt taraf Blue-400 (Daha açık)

    if(dersGrafik) dersGrafik.destroy();
    
    dersGrafik = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Ders', 
                data: dersData, 
                backgroundColor: gradientDers, 
                borderRadius: 6, 
                barThickness: 12, // İnce ve zarif barlar
                hoverBackgroundColor: '#1d4ed8' // Üzerine gelince koyu mavi
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#2563eb', // Mavi yazı
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                x: { 
                    display: true, 
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: { 
                    display: true,
                    beginAtZero: true, 
                    grid: { 
                        color: '#f1f5f9',
                        borderDash: [5, 5]
                    },
                    ticks: { display: false }
                }
            }
        }
    });
}

/* =========================================
   6. KAZANÇ TABLOSU (DÜZELTİLMİŞ: ÖDENMEYENLER DE GÖRÜNÜR)
   ========================================= */

function kazancTablosuCiz() {
    const yilElement = document.getElementById("yilSecim");
    if(!yilElement) return;
    
    const yil = Number(yilElement.value);
    const aylikToplam = Array(12).fill(0);
    const ogrenciToplam = {};      // Paraların tutulduğu yer
    const ogrenciKayitVar = {};    // "Burada ders var mı?" kontrolü (Ödenmese bile)

    // 1. Verileri Hesapla
    kazancKayitlari.forEach(k => {
        const tarih = new Date(k.tarih);
        if (tarih.getFullYear() === yil) {
            const ay = tarih.getMonth();
            const tutar = k.sure * k.ucret;

            // ÖNEMLİ DÜZELTME: Öğrenci nesnesini her durumda oluştur (Ödenmese bile)
            if (!ogrenciToplam[k.ogrenci]) {
                ogrenciToplam[k.ogrenci] = Array(12).fill(0);
                ogrenciKayitVar[k.ogrenci] = Array(12).fill(false);
            }

            // Kayıt var diye işaretle (Rengi ayarlamak için lazım olacak)
            ogrenciKayitVar[k.ogrenci][ay] = true;
            
            // Eğer ÖDEME ALINDI ise parayı toplama ekle
            // (Alınmadıysa bakiye 0 kalır ama kayıt var görünür)
            if (k.odemeDurumu) {
                aylikToplam[ay] += tutar;
                ogrenciToplam[k.ogrenci][ay] += tutar;
            }
        }
    });

    const tbody = document.querySelector("#kazancTablo tbody");
    if(!tbody) return;
    tbody.innerHTML = "";

    // 2. Genel Toplam Satırı
    const toplamSatir = document.createElement("tr");
    toplamSatir.className = "font-black bg-emerald-50/50 text-emerald-800 border-b";
    toplamSatir.innerHTML = `<td class="p-4 text-left">GENEL TOPLAM</td>`;
    aylikToplam.forEach(t => {
        toplamSatir.innerHTML += `<td class="p-2 text-center text-xs">${t > 0 ? '₺' + t.toFixed(0) : '-'}</td>`;
    });
    tbody.appendChild(toplamSatir);

    // 3. Öğrenci Satırları
    Object.keys(ogrenciToplam).sort().forEach(o => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 border-b border-gray-100 transition group";
        
        // Öğrenci Adı
        tr.innerHTML = `<td class="p-4 text-left font-bold text-gray-700 text-xs">${o}</td>`;
        
        // Aylık Hücreler
        ogrenciToplam[o].forEach((t, ayIndex) => {
            const kayitVarMi = ogrenciKayitVar[o][ayIndex];
            
            let hucreIcerik = '';
            let stil = '';

            if (t > 0) {
                // A) Para Ödenmiş: Yeşil Bakiye Göster
                hucreIcerik = '₺' + t.toFixed(0);
                stil = 'text-emerald-600 font-bold bg-emerald-50/50 hover:bg-emerald-100 hover:scale-105';
            } else if (kayitVarMi) {
                // B) Para 0 ama Ders Var (ÖDENMEMİŞ): Kırmızı Uyarı Göster
                hucreIcerik = '<span class="text-[10px]">ÖDENMEDİ</span>';
                stil = 'text-red-500 font-bold bg-red-50 hover:bg-red-100 hover:scale-105 border border-red-100';
            } else {
                // C) Hiç Ders Yok: Gri Nokta
                hucreIcerik = '<span class="text-gray-200 text-[9px]">•</span>';
                stil = 'text-gray-300 hover:bg-gray-50';
            }
            
            // Hepsine tıklama özelliği veriyoruz (Boş olana bile, belki yanlışlıkla sildi geri ekleyecek)
            tr.innerHTML += `
                <td onclick="ayDetayiniGoster(${ayIndex}, ${yil}, '${o}')" class="p-2 text-center transition-all rounded-lg cursor-pointer ${stil}">
                    ${hucreIcerik}
                </td>`;
        });
        tbody.appendChild(tr);
    });
}

// Detay Penceresini Açma (Öğrenci Filtreli)
function ayDetayiniGoster(ayIndex, yil, seciliOgrenci) {
    modalAcikAy = ayIndex;
    modalAcikYil = yil;
    // Öğrenci adını global veya geçici tutabiliriz ama filtrede kullanacağız
    
    const modal = document.getElementById('ayModalArka');
    const liste = document.getElementById('ayKayitListe');
    const baslik = document.getElementById('ayModalBaslik');
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    liste.innerHTML = "";
    modal.style.display = "flex";

    document.body.style.overflow = 'hidden';
    
    // Başlığı güncelle (Örn: Mert - Mart 2026 Detayı)
    baslik.innerHTML = `<span class="text-emerald-600">${seciliOgrenci}</span> <span class="text-gray-400">|</span> ${aylar[ayIndex]} ${yil}`;

    // Filtreleme: Yıl + Ay + Öğrenci
    const filtreli = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        return d.getMonth() === ayIndex && 
               d.getFullYear() === yil && 
               k.ogrenci === seciliOgrenci;
    }).sort((a,b) => new Date(b.tarih) - new Date(a.tarih)); // Tarihe göre sırala

    if (filtreli.length === 0) {
        liste.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-gray-400 gap-2">
                <span class="text-2xl">📭</span>
                <p class="text-sm font-medium">Bu tarihte kayıtlı ders bulunamadı.</p>
            </div>`;
        return;
    }

    filtreli.forEach(k => {
        const tutar = k.sure * k.ucret;
        
        // Tarihi güzelleştir (17 Jan 2026 formatı yerine 17.01.2026)
        const tarihGuzel = new Date(k.tarih).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long'});
        
        const kart = document.createElement("div");
        kart.className = `flex items-center justify-between p-4 rounded-xl border mb-3 transition hover:shadow-sm ${k.odemeDurumu ? 'bg-white border-emerald-100' : 'bg-red-50/50 border-red-100'}`;
        
        kart.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex flex-col items-center justify-center w-10 h-10 rounded-lg ${k.odemeDurumu ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-500'} font-black text-xs">
                    <span>${new Date(k.tarih).getDate()}</span>
                </div>
                <div>
                    <div class="font-bold text-gray-800 text-sm">${tarihGuzel}</div>
                    <div class="text-xs text-gray-500 font-medium">${k.sure} Saat • <span class="text-gray-900 font-bold">₺${tutar}</span></div>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="odemeDurumuGuncelle('${k.id}', ${!k.odemeDurumu}, '${seciliOgrenci}')" class="h-9 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ${k.odemeDurumu ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 shadow-md'}">
                    ${k.odemeDurumu ? 'Ödemeyi İptal Et' : '✅ Ödeme Alındı'}
                </button>
                
                <button onclick="kazancKaydiSil('${k.id}', '${seciliOgrenci}')" class="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        `;
        liste.appendChild(kart);
    });
}

// Güncelleme Fonksiyonu (Parametre eklendi: seciliOgrenci)
function odemeDurumuGuncelle(id, durum, seciliOgrenci) {
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).update({ odemeDurumu: durum })
        .then(() => ayDetayiniGoster(modalAcikAy, modalAcikYil, seciliOgrenci));
}

// Silme Fonksiyonu (Parametre eklendi: seciliOgrenci)
function kazancKaydiSil(id, seciliOgrenci) {
    if(confirm("Bu ders kaydını tamamen silmek istediğinize emin misiniz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).remove()
            .then(() => ayDetayiniGoster(modalAcikAy, modalAcikYil, seciliOgrenci));
    }
}

function ayModalKapat() {
    const modal = document.getElementById('ayModalArka');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/* =========================================
   7. DERS EKLEME & ÇİZME
   ========================================= */

function dersEkle() {
    // 1. Verileri Al
    const ogrenci = document.getElementById("ogrenci").value;
    const iletisim = document.getElementById("iletisim").value;
    const ucret = Number(document.getElementById("ucret").value);
    const duzey = document.getElementById("duzey").value;
    const gun = document.getElementById("gun").value;
    const baslangic = parseFloat(document.getElementById("baslangic").value);
    const sure = parseFloat(document.getElementById("sure").value);

    // 2. Tatil Kontrolü
    if (globalAyarlar && globalAyarlar.tatilGunleri && globalAyarlar.tatilGunleri.includes(Number(gun))) {
        alert("Seçtiğiniz gün tatil olarak ayarlanmış! Ders ekleyemezsiniz.");
        return;
    }

    // 3. Eksik Bilgi Kontrolü
    if (!ogrenci || !ucret) { alert("Eksik bilgi girdiniz."); return; }
    
    const dersVerisi = { 
        ogrenci, 
        iletisim, 
        ucret, 
        duzey,
        gun, 
        baslangic, 
        sure 
    };

    // --- KARAR ANI: GÜNCELLEME Mİ, YENİ Mİ? ---
    
    if (duzenlenecekDersId) {
        // A) GÜNCELLEME MODU
        database.ref(`kullanicilar/${aktifKullaniciId}/dersler/${duzenlenecekDersId}`).update(dersVerisi)
            .then(() => {
                alert("Ders başarıyla güncellendi! ✅");
                formuSifirla(); // Butonu ve değişkeni eski haline getir
            });
    } else {
        // B) YENİ EKLEME MODU
        database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).push(dersVerisi);
        // Formu temizle (Sadece inputları)
        document.getElementById("ogrenci").value = "";
        document.getElementById("iletisim").value = "";
        document.getElementById("duzey").value = "";
        // Diğerleri (Saat vb.) kalsın, belki peş peşe ekler
    }
}

// Yardımcı Fonksiyon: Formu ve Butonu Sıfırla
function formuSifirla() {
    duzenlenecekDersId = null; // Moddan çık
    
    // İnputları temizle
    document.getElementById("ogrenci").value = "";
    document.getElementById("iletisim").value = "";
    document.getElementById("duzey").value = "";

    // Butonu eski haline (Mavi) getir
    const kaydetBtn = document.querySelector("#takvimSayfa button[onclick='dersEkle()']");
    if(kaydetBtn) {
        kaydetBtn.innerText = "Dersi Kaydet";
        kaydetBtn.classList.remove("bg-orange-500", "hover:bg-orange-600");
        kaydetBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
    }
}

function dersCiz(ders) {
    const hucre = document.getElementById(`hucre-${ders.gun}-${ders.baslangic}`);
    
    if (!hucre) return;

    const topPos = hucre.offsetTop;
    const leftPos = hucre.offsetLeft;
    const width = hucre.offsetWidth;
    const height = hucre.offsetHeight;
    const parcaSayisi = ders.sure / 0.5;

    const dersBlok = document.createElement("div");
    dersBlok.className = "ders-blok animate-in fade-in zoom-in duration-300 shadow-md hover:shadow-xl transition-all cursor-pointer";
    dersBlok.innerHTML = `
        <div class="flex flex-col h-full justify-center px-1 md:px-2 bg-blue-100 border-l-4 border-blue-600 rounded-r-md overflow-hidden leading-tight">
            <span class="font-black text-[11px] md:text-xs text-blue-900 truncate">${ders.ogrenci}</span>
            
            <span class="text-[10px] font-semibold text-blue-700 truncate opacity-80">${ders.duzey || ''}</span>
            
            <span class="text-[9px] font-bold text-blue-500 mt-0.5">${ders.ucret} ₺</span>
        </div>
    `;
    dersBlok.dataset.id = ders.id;

    // Hücre içine göre göreceli konumlandırma
    dersBlok.style.position = "absolute";
    dersBlok.style.top = "0px";
    dersBlok.style.left = "0px";
    dersBlok.style.width = "100%";
    dersBlok.style.height = `calc(${parcaSayisi * 100}% + ${parcaSayisi - 1}px)`;
    dersBlok.style.zIndex = "20";
    
    dersBlok.onclick = function (e) { 
        e.stopPropagation();
        secimModalAc(this); 
    };
    
    hucre.appendChild(dersBlok);
}
function tabloyuTemizle() {
    document.querySelectorAll(".ders-blok").forEach(b => b.remove());
}

function secimModalAc(blok) {
    aktifBlok = blok;
    document.getElementById("secimModalArka").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function secimKapat() {
    document.getElementById("secimModalArka").style.display = "none";
    document.body.style.overflow = "";
}

function secimSil() {
    if (!aktifBlok) return;
    if(confirm("Bu dersi programdan silmek istiyor musunuz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/dersler/${aktifBlok.dataset.id}`).remove();
        secimKapat();
    }
}

function kazancEkle() {
    const ogrenci = document.getElementById("kazancOgrenci").value;
    const tarih = document.getElementById("kazancTarih").value;
    const sure = parseFloat(document.getElementById("kazancSure").value);
    const odemeAlindi = document.getElementById("kazancOdeme").checked;

    if (!ogrenci || !tarih || !sure) { alert("Lütfen tüm alanları doldurun."); return; }

    const dersProg = dersler.find(d => d.ogrenci === ogrenci);
    const ucret = dersProg ? Number(dersProg.ucret) : 0;

    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar`).push({
        ogrenci, tarih, sure, ucret, odemeDurumu: odemeAlindi
    });
    alert("Ders kaydedildi!");
}


/* =========================================
   KAZANÇ SAYFASI FORM HAZIRLIĞI
   ========================================= */
function formVerileriniYukle() {
    // 1. Öğrencileri Doldur
    const ogrSelect = document.getElementById("kazancOgrenci");
    if(ogrSelect) {
        const mevcutSecim = ogrSelect.value;
        ogrSelect.innerHTML = `<option value="">Öğrenci Seçiniz</option>`;
        
        const ogrenciler = [...new Set(dersler.map(d => d.ogrenci))];
        
        ogrenciler.forEach(o => {
            const opt = document.createElement("option");
            opt.value = o; 
            opt.textContent = o;
            ogrSelect.appendChild(opt);
        });
        if(mevcutSecim) ogrSelect.value = mevcutSecim;
    }

// 2. Süreleri Doldur (Ayarlardan Gelen Seçenekler)
    const sureSelect = document.getElementById("kazancSure");
    if (sureSelect) {
        sureSelect.innerHTML = ""; 
        
        // YENİ EKLENEN KISIM: Varsayılan başlık
        const baslikOpt = document.createElement("option");
        baslikOpt.value = "";
        baslikOpt.text = "Süre Seçiniz";
        sureSelect.appendChild(baslikOpt);
        // -------------------------------------

        // Ayarlardan süreleri al (Yoksa varsayılan 1 saat)
        let sureler = (globalAyarlar && globalAyarlar.dersSureleri) ? globalAyarlar.dersSureleri : [];
        if (sureler.length === 0) sureler = [1]; 

        sureler.forEach(saat => {
            const opt = document.createElement("option");
            opt.value = saat; 
            opt.innerText = `${saat} Saat`; 
            sureSelect.appendChild(opt);
        });
    }

    // 3. Tarihi Bugüne Ayarla (Eğer boşsa)
    const tarihInput = document.getElementById("kazancTarih");
    if(tarihInput && !tarihInput.value) {
        tarihInput.valueAsDate = new Date();
    }
}

// Rapor sayfasındaki öğrenci listesini günceller
function raporOgrencileriYukle() {
    const select = document.getElementById("raporFiltreOgrenci");
    if(!select) return;
    select.innerHTML = `<option value="all">Tüm Öğrenciler</option>`;
    const ogrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    ogrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        select.appendChild(opt);
    });
}

function raporUret() {
    const seciliOgrenci = document.getElementById("raporFiltreOgrenci").value;
    const seciliYil = document.getElementById("raporFiltreYil").value;
    const seciliAy = document.getElementById("raporFiltreAy").value;
    const onizleme = document.getElementById("raporOnizleme");

    // Verileri Filtrele
    let filtrelenmis = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        const ogrenciUygun = seciliOgrenci === "all" || k.ogrenci === seciliOgrenci;
        const yilUygun = seciliYil === "all" || d.getFullYear().toString() === seciliYil;
        const ayUygun = seciliAy === "all" || d.getMonth().toString() === seciliAy;
        return ogrenciUygun && yilUygun && ayUygun;
    });

    // Tarihe göre sırala
    filtrelenmis.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

    // Raporu Oluştur
    let toplamSaat = 0;
    let toplamKazanc = 0;
    let raporHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
                <div>
                    <h1 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">DERS TAKİP RAPORU</h1>
                    <p class="text-sm text-gray-500 font-bold">${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturuldu</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-blue-600 uppercase text-lg">Munise Hoca</p>
                    <p class="text-xs text-gray-400 font-bold">Özel Ders Yönetim Sistemi</p>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-8">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Toplam Ders</p>
                    <p class="text-xl font-black text-gray-800">${filtrelenmis.length} Adet</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Toplam Süre</p>
                    <p id="raporToplamSaat" class="text-xl font-black text-blue-600">0 Saat</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Toplam Tutar</p>
                    <p id="raporToplamTutar" class="text-xl font-black text-green-600">₺0</p>
                </div>
            </div>

            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr class="text-left border-b-2 border-gray-100 text-gray-400">
                        <th class="py-3 font-bold text-[10px] uppercase">Tarih</th>
                        <th class="py-3 font-bold text-[10px] uppercase">Öğrenci</th>
                        <th class="py-3 font-bold text-[10px] uppercase text-center">Süre</th>
                        <th class="py-3 font-bold text-[10px] uppercase text-center">Durum</th>
                        <th class="py-3 font-bold text-[10px] uppercase text-right">Ücret</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
    `;

    filtrelenmis.forEach(k => {
        const tutar = k.sure * k.ucret;
        toplamSaat += k.sure;
        toplamKazanc += tutar;

        raporHTML += `
            <tr>
                <td class="py-4 font-bold text-gray-600">${new Date(k.tarih).toLocaleDateString('tr-TR')}</td>
                <td class="py-4 font-black text-gray-800">${k.ogrenci}</td>
                <td class="py-4 text-center font-bold text-gray-600">${k.sure} Sa</td>
                <td class="py-4 text-center">
                    <span class="text-[9px] font-black px-2 py-1 rounded-full ${k.odemeDurumu ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                        ${k.odemeDurumu ? 'ÖDENDİ' : 'BEKLİYOR'}
                    </span>
                </td>
                <td class="py-4 text-right font-black text-gray-800">₺${tutar}</td>
            </tr>
        `;
    });

    raporHTML += `
                </tbody>
            </table>
            
            <div class="mt-12 pt-6 border-t border-dashed border-gray-200 text-center">
                <p class="text-xs text-gray-400 font-medium italic">Bu rapor Munise Hoca Ders Takip sistemi tarafından otomatik olarak üretilmiştir.</p>
            </div>
        </div>
    `;

    onizleme.innerHTML = raporHTML;
    document.getElementById("raporToplamSaat").innerText = toplamSaat + " Saat";
    document.getElementById("raporToplamTutar").innerText = "₺" + toplamKazanc;
}function secimDuzenle() { alert("Düzenleme için lütfen takvim üzerinden modalı kullanın."); secimKapat(); }

/* =========================================
   8. AYARLARI DÜZENLEME VE GÜNCELLEME
   ========================================= */
/* =========================================
   GÜVENLİ TERCİHLERİ AÇ FONKSİYONU
   ========================================= */
function tercihleriAc() {
    const modal = document.getElementById("tercihlerSayfa");
    if (!modal) return; // Sayfa yoksa hiçbir şey yapma

    // Ayarlar yoksa direkt boş aç
    if (!globalAyarlar) {
        modal.style.display = "flex";
        return;
    }

    // 1. Temel Bilgileri Doldur (Varsa)
    if(document.getElementById("prefHocaAd")) document.getElementById("prefHocaAd").value = globalAyarlar.ad || "";
    if(document.getElementById("prefBrans")) document.getElementById("prefBrans").value = globalAyarlar.brans || "";
    if(document.getElementById("prefMesaiBasla")) document.getElementById("prefMesaiBasla").value = globalAyarlar.mesaiBasla || "13";
    if(document.getElementById("prefMesaiBitis")) document.getElementById("prefMesaiBitis").value = globalAyarlar.mesaiBitis || "22";

    // 2. Tatil Günlerini Yükle
    document.querySelectorAll('.gun-btn-mobil').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'secili-tatil');
        btn.classList.add('bg-white', 'text-gray-400');
    });
    if (globalAyarlar.tatilGunleri) {
        globalAyarlar.tatilGunleri.forEach(gun => {
            const btn = document.querySelector(`.gun-btn-mobil[data-gun="${gun}"]`);
            if (btn) {
                btn.classList.add('bg-blue-600', 'text-white', 'secili-tatil');
                btn.classList.remove('bg-white', 'text-gray-400');
            }
        });
    }

    // 3. Ders Sürelerini Yükle
    document.querySelectorAll('.sure-btn-mobil').forEach(b => b.classList.remove('secili-sure'));
    if (globalAyarlar.dersSureleri) {
        globalAyarlar.dersSureleri.forEach(sure => {
            const btn = document.querySelector(`.sure-btn-mobil[data-sure="${sure}"]`);
            if (btn) btn.classList.add('secili-sure');
        });
    }

    // 4. (YENİ) Öğrenci Düzeylerini Yükle
    document.querySelectorAll('.duzey-btn-mobil').forEach(b => b.classList.remove('secili-duzey'));
    
    // Veriyi diziye çevir (Hata önleyici)
    let kayitliDuzeyler = globalAyarlar.ogrenciDuzeyleri || globalAyarlar.ogrenciDuzeyi || [];
    if (!Array.isArray(kayitliDuzeyler)) {
        kayitliDuzeyler = [kayitliDuzeyler]; 
    }

    kayitliDuzeyler.forEach(duzey => {
        const btn = document.querySelector(`.duzey-btn-mobil[data-duzey="${duzey}"]`);
        if (btn) btn.classList.add('secili-duzey');
    });

    // 5. Menüyü Kapalı Başlat ve Rozeti Güncelle
    const cekmece = document.getElementById("duzeyCekmece");
    const ok = document.getElementById("duzeyOk");
    if(cekmece) cekmece.classList.add("hidden");
    if(ok) ok.style.transform = "rotate(0deg)";

    const seciliSayisi = document.querySelectorAll('.secili-duzey').length;
    const rozet = document.getElementById("secimSayisiRozeti");
    if(rozet) {
        if(seciliSayisi > 0) {
            rozet.innerText = seciliSayisi;
            rozet.classList.remove("hidden");
        } else {
            rozet.classList.add("hidden");
        }
    }

    // Sayfayı Aç
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

/* =========================================
   9. KARŞILAMA METNİ GÜNCELLEME
   ========================================= */
function karsilamaGuncelle() {
    // 1. Tarihi Yazdır
    const tarihEl = document.getElementById("karsilamaTarih");
    if (tarihEl) {
        const simdi = new Date();
        const secenekler = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        tarihEl.innerText = simdi.toLocaleDateString('tr-TR', secenekler);
    }

    // 2. İsmi Yazdır
    const adEl = document.getElementById("karsilamaAd");
    if (adEl && globalAyarlar && globalAyarlar.ad) {
        // Sadece ilk ismi alıp samimi yapalım (Örn: "Munise Yılmaz" -> "Munise")
        const sadeIsim = globalAyarlar.ad.split(' ')[0];
        adEl.innerText = sadeIsim;
    }
}

/* =========================================
   10. YENİ: SÜRE BUTONU SEÇİMİ
   ========================================= */
function sureSec(btn) {
    // Butona basınca seçildi/seçilmedi yap (Toggle)
    if (btn.classList.contains('secili-sure')) {
        btn.classList.remove('secili-sure');
    } else {
        btn.classList.add('secili-sure');
    }
}

/* =========================================
   11. YENİ: AKORDEON VE SEÇİM FONKSİYONLARI
   ========================================= */

// 1. Menüyü Açıp Kapatma (Ok işaretiyle birlikte)
function duzeyMenusuAcKapa() {
    const cekmece = document.getElementById("duzeyCekmece");
    const ok = document.getElementById("duzeyOk");
    
    if (cekmece.classList.contains("hidden")) {
        // Gizliyse -> Göster
        cekmece.classList.remove("hidden");
        if(ok) ok.style.transform = "rotate(180deg)"; // Oku yukarı çevir
    } else {
        // Açıksa -> Gizle
        cekmece.classList.add("hidden");
        if(ok) ok.style.transform = "rotate(0deg)"; // Oku aşağı çevir
    }
}

// 2. Butona Tıklayınca Seçme/Bırakma ve Rozet Sayısı
function duzeySec(btn) {
    // Seçim işlemini yap
    if (btn.classList.contains('secili-duzey')) {
        btn.classList.remove('secili-duzey');
    } else {
        btn.classList.add('secili-duzey');
    }

    // Kaç tane seçili olduğunu say ve rozete yaz
    const seciliSayisi = document.querySelectorAll('.secili-duzey').length;
    const rozet = document.getElementById("secimSayisiRozeti");
    
    if (rozet) {
        if (seciliSayisi > 0) {
            rozet.innerText = seciliSayisi;
            rozet.classList.remove("hidden");
        } else {
            rozet.classList.add("hidden");
        }
    }
}

/* =========================================
   PENCEREYİ KAPATMA FONKSİYONU (EKSİKSE ÇALIŞMAZ)
   ========================================= */
function tercihKapat() {
    const modal = document.getElementById("tercihlerSayfa");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

/* =========================================
   YENİ: DÜZENLEME FONKSİYONU
   ========================================= */
function secimDuzenle() {
    if (!aktifBlok) return;

    // 1. Seçilen dersin verisini bul
    const id = aktifBlok.dataset.id;
    const ders = dersler.find(d => d.id === id);
    
    if (!ders) return;

    // 2. Yukarıdaki kutuları doldur
    document.getElementById("ogrenci").value = ders.ogrenci;
    document.getElementById("iletisim").value = ders.iletisim || ""; // Varsa doldur
    document.getElementById("ucret").value = ders.ucret;
    document.getElementById("duzey").value = ders.duzey || ""; // Varsa seç
    
    document.getElementById("gun").value = ders.gun;
    document.getElementById("baslangic").value = ders.baslangic;
    document.getElementById("sure").value = ders.sure;

    // 3. Modu "Düzenleme" yap
    duzenlenecekDersId = id;

    // 4. Kaydet butonunun şeklini değiştir (Turuncu yap)
    const kaydetBtn = document.querySelector("#takvimSayfa button[onclick='dersEkle()']");
    if(kaydetBtn) {
        kaydetBtn.innerText = "Değişiklikleri Güncelle";
        kaydetBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
        kaydetBtn.classList.add("bg-orange-500", "hover:bg-orange-600");
    }

    // 5. Modalı kapat ve yukarı kaydır
    secimKapat();
    document.getElementById("takvimSayfa").scrollIntoView({ behavior: 'smooth' });
}

/* =========================================
   MOBİL ZOOM ENGELLEME (IPHONE İÇİN)
   ========================================= */

// 1. İki parmakla büyütmeyi (Pinch) engelle
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
});

// 2. Çift dokunarak büyütmeyi (Double Tap) engelle
let sonDokunmaZamani = 0;
document.addEventListener('touchstart', function(event) {
    const simdi = new Date().getTime();
    const zamanFarki = simdi - sonDokunmaZamani;
    
    // Eğer 300ms içinde iki kere dokunulursa engelle
    if (zamanFarki < 300 && zamanFarki > 0) {
        event.preventDefault();
    }
    sonDokunmaZamani = simdi;
}, { passive: false });

// Profesyonel Bildirim Gösterme Fonksiyonu
function bildirimGoster(mesaj, tur = "basarili") {
    const kutu = document.getElementById("bildirimKutusu");
    const metin = document.getElementById("bildirimMetin");
    const ikon = document.getElementById("bildirimIkon");

    // İçeriği Ayarla
    metin.innerText = mesaj;
    
    if (tur === "basarili") {
        kutu.className = "fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-4 rounded-full shadow-2xl z-[10000] flex items-center gap-3 transition-all";
        ikon.innerText = "✅";
    } else {
        kutu.className = "fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-full shadow-2xl z-[10000] flex items-center gap-3 transition-all";
        ikon.innerText = "⚠️";
    }

    // Göster
    kutu.classList.remove("hidden");
    kutu.classList.remove("bildirim-gizle");
    kutu.classList.add("bildirim-goster");

    // 3 Saniye sonra gizle
    setTimeout(() => {
        kutu.classList.remove("bildirim-goster");
        kutu.classList.add("bildirim-gizle");
        // Animasyon bitince hidden yap
        setTimeout(() => { kutu.classList.add("hidden"); }, 500);
    }, 3000);
}

/* =========================================
   9. RAPOR SAYFASI GELİŞTİRMELERİ (ÖĞRENCİ LİSTESİ)
   ========================================= */

// 1. Mod Değiştirme (Finansal <-> Öğrenci)
function raporModuDegistir() {
    const secim = document.getElementById("raporTuru").value;
    const panelFinansal = document.getElementById("panelFinansal");
    const panelOgrenci = document.getElementById("panelOgrenci");
    const sonucAlani = document.getElementById("raporSonucAlani");

    if (secim === "finansal") {
        panelFinansal.classList.remove("hidden");
        panelOgrenci.classList.add("hidden");
        // Eğer daha önce rapor alındıysa sonucunu göster
        if (sonucAlani.innerHTML.trim() !== "") {
            sonucAlani.classList.remove("hidden");
        }
    } else {
        panelFinansal.classList.add("hidden");
        panelOgrenci.classList.remove("hidden");
        sonucAlani.classList.add("hidden"); // Finansal tabloyu gizle
        
        // Öğrenci listesini oluştur
        ogrenciListesiOlustur();
    }
}

// 2. Öğrenci Listesini Oluşturma ve Gruplama (DÜZELTİLMİŞ VERSİYON)
function ogrenciListesiOlustur() {
    const container = document.getElementById("ogrenciListesiContainer");
    container.innerHTML = "";

    if (dersler.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 py-8 italic">Henüz kayıtlı öğrenci yok.</div>`;
        return;
    }

    // Öğrencileri Grupla
    const ogrenciMap = {};

    dersler.forEach(ders => {
        if (!ogrenciMap[ders.ogrenci]) {
            ogrenciMap[ders.ogrenci] = {
                ad: ders.ogrenci,
                iletisim: ders.iletisim || "-",
                ucret: ders.ucret,
                duzey: ders.duzey || "Belirtilmedi",
                dersler: [] 
            };
        }
        
        const gunler = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
        
        // DÜZELTME 1: Saati 'baslangic' olarak al, yoksa 'saat'i dene, o da yoksa '-' koy
        let dersSaati = ders.baslangic || ders.saat || "-";

        ogrenciMap[ders.ogrenci].dersler.push({
            gun: gunler[ders.gun],
            saat: dersSaati,
            sure: ders.sure
        });
    });

    // İsim sırasına göre diz
    const siraliOgrenciler = Object.values(ogrenciMap).sort((a, b) => a.ad.localeCompare(b.ad));

    // Kartları Oluştur
    siraliOgrenciler.forEach(ogr => {
        let dersProgramiHtml = "";
        
        ogr.dersler.forEach(d => {
            // DÜZELTME 2: Akıllı Süre Gösterimi
            // Eğer süre 10'dan küçükse (1, 2, 1.5 gibi) "Saat" yaz.
            // Eğer 10'dan büyükse (30, 40, 60 gibi) "dk" yaz.
            let sureBirimi = parseFloat(d.sure) <= 10 ? "Saat" : "dk";

            dersProgramiHtml += `<span class="inline-block bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-md mr-1 mb-1 border border-orange-100">
                ${d.gun} ${d.saat} (${d.sure} ${sureBirimi})
            </span>`;
        });

        // Telefon linki
        let telHtml = ogr.iletisim !== "-" 
            ? `<a href="tel:${ogr.iletisim}" class="text-blue-500 hover:underline flex items-center gap-1"><span class="text-xs">📞</span>${ogr.iletisim}</a>` 
            : `<span class="text-gray-400 text-xs">Tel Yok</span>`;

        const kart = document.createElement("div");
        kart.className = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col gap-2";
        kart.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-black text-gray-800 text-lg leading-tight">${ogr.ad}</h3>
                    <div class="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">${ogr.duzey}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-sm">₺${ogr.ucret}/saat</div>
                </div>
            </div>
            
            <div class="border-t border-gray-50 my-1"></div>
            
            <div class="flex items-center justify-between">
                <div class="flex flex-wrap items-center">
                    ${dersProgramiHtml}
                </div>
            </div>

            <div class="flex justify-between items-center mt-1 pt-2 border-t border-gray-50">
                ${telHtml}
                <span class="text-[10px] text-gray-400 font-bold">TOPLAM ${ogr.dersler.length} DERS</span>
            </div>
        `;
        container.appendChild(kart);
    });
}