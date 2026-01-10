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
    if(confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        auth.signOut().then(() => {
            // Başarılı çıkış sonrası giriş sayfasına temiz bir dönüş
            window.location.reload();
        });
    }
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
    if (sayfaId === "kazanc") ogrencileriYukle();
    if (sayfaId === "panel") panelOzetiniGuncelle();
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
    const hocaAd = document.getElementById("prefHocaAd").value;
    const brans = document.getElementById("prefBrans").value;
    const basla = document.getElementById("prefMesaiBasla").value;
    const bitis = document.getElementById("prefMesaiBitis").value;
    
    // Seçili tatil günlerini topla
    const tatiller = [];
    document.querySelectorAll('.secili-tatil').forEach(btn => {
        tatiller.push(Number(btn.dataset.gun));
    });

    if(!hocaAd || !brans) {
        alert("Lütfen adınızı ve branşınızı giriniz.");
        return;
    }

    if(Number(basla) >= Number(bitis)) {
        alert("Mesai başlangıç saati, bitiş saatinden önce olmalıdır.");
        return;
    }

    const yeniAyarlar = {
        ad: hocaAd,
        brans: brans,
        mesaiBasla: Number(basla),
        mesaiBitis: Number(bitis),
        tatilGunleri: tatiller,
        kurulumTamam: true
    };

    database.ref(`kullanicilar/${aktifKullaniciId}/ayarlar`).set(yeniAyarlar).then(() => {
        alert("Ayarlar kaydedildi!");
        tercihKapat();
        window.location.reload(); 
    });
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

// --- YENİLENMİŞ GRAFİK ÇİZİM FONKSİYONU ---
function paneliCiz(kazancData, dersData) {
    if(!document.getElementById('kazancChart')) return;

    const aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    // 1. KAZANÇ GRAFİĞİ
    const ctx1 = document.getElementById('kazancChart').getContext('2d');
    
    const gradient = ctx1.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); 
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)'); 

    if(kazancGrafik) kazancGrafik.destroy();
    
    kazancGrafik = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Kazanç (₺)', 
                data: kazancData, 
                borderColor: '#3b82f6', 
                backgroundColor: gradient, 
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true, 
                tension: 0.4 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5, 5] }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });

    // 2. DERS GRAFİĞİ
    const ctx2 = document.getElementById('dersChart').getContext('2d');
    
    if(dersGrafik) dersGrafik.destroy();
    
    dersGrafik = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Ders Sayısı', 
                data: dersData, 
                backgroundColor: '#6366f1', 
                borderRadius: 6, 
                barThickness: 12
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5, 5] }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });
}

/* =========================================
   6. KAZANÇ TABLOSU & MODALLAR
   ========================================= */

function kazancTablosuCiz() {
    const yilElement = document.getElementById("yilSecim");
    if(!yilElement) return;
    
    const yil = Number(yilElement.value);
    const aylikToplam = Array(12).fill(0);
    const ogrenciToplam = {};

    kazancKayitlari.forEach(k => {
        const tarih = new Date(k.tarih);
        if (tarih.getFullYear() === yil) {
            const ay = tarih.getMonth();
            const tutar = k.sure * k.ucret;
            if (k.odemeDurumu) {
                aylikToplam[ay] += tutar;
                if (!ogrenciToplam[k.ogrenci]) ogrenciToplam[k.ogrenci] = Array(12).fill(0);
                ogrenciToplam[k.ogrenci][ay] += tutar;
            }
        }
    });

    const tbody = document.querySelector("#kazancTablo tbody");
    if(!tbody) return;
    tbody.innerHTML = "";

    const toplamSatir = document.createElement("tr");
    toplamSatir.className = "font-bold bg-gray-100 border-b";
    toplamSatir.innerHTML = `<td class="p-3 text-left">GENEL TOPLAM</td>`;
    aylikToplam.forEach(t => {
        toplamSatir.innerHTML += `<td class="p-2 text-center text-gray-700">${t > 0 ? '₺' + t.toFixed(0) : '-'}</td>`;
    });
    tbody.appendChild(toplamSatir);

    Object.keys(ogrenciToplam).forEach(o => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 border-b border-gray-100 transition";
        tr.innerHTML = `<td class="p-3 text-left font-medium text-gray-800">${o}</td>`;
        ogrenciToplam[o].forEach(t => {
            tr.innerHTML += `<td class="p-2 text-center text-gray-600">${t > 0 ? '₺' + t.toFixed(0) : '-'}</td>`;
        });
        tbody.appendChild(tr);
    });
}

function ayDetayiniGoster(ayIndex, yil) {
    modalAcikAy = ayIndex;
    modalAcikYil = yil;
    const modal = document.getElementById('ayModalArka');
    const liste = document.getElementById('ayKayitListe');
    const baslik = document.getElementById('ayModalBaslik');
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    liste.innerHTML = "";
    modal.style.display = "flex";
    baslik.innerText = `${aylar[ayIndex]} ${yil} Detayı`;

    const filtreli = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        return d.getMonth() === ayIndex && d.getFullYear() === yil;
    }).sort((a,b) => new Date(b.tarih) - new Date(a.tarih));

    if (filtreli.length === 0) {
        liste.innerHTML = `<div class="text-center p-8 text-gray-400">Kayıt yok.</div>`;
        return;
    }

    filtreli.forEach(k => {
        const tutar = k.sure * k.ucret;
        const kart = document.createElement("div");
        kart.className = `flex items-center justify-between p-4 rounded-xl border mb-2 ${k.odemeDurumu ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`;
        kart.innerHTML = `
            <div>
                <div class="font-bold text-gray-800">${k.ogrenci}</div>
                <div class="text-xs text-gray-500">${k.tarih} | ${k.sure} Saat | ₺${tutar}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="odemeDurumuGuncelle('${k.id}', ${!k.odemeDurumu})" class="text-xs font-bold px-3 py-1 rounded-lg ${k.odemeDurumu ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white'}">
                    ${k.odemeDurumu ? 'İptal Et' : 'Öde'}
                </button>
                <button onclick="kazancKaydiSil('${k.id}')" class="text-gray-400 hover:text-red-500 px-2">🗑️</button>
            </div>
        `;
        liste.appendChild(kart);
    });
}

function odemeDurumuGuncelle(id, durum) {
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).update({ odemeDurumu: durum })
        .then(() => ayDetayiniGoster(modalAcikAy, modalAcikYil));
}

function kazancKaydiSil(id) {
    if(confirm("Silmek istediğinize emin misiniz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).remove()
            .then(() => ayDetayiniGoster(modalAcikAy, modalAcikYil));
    }
}

function ayModalKapat() {
    document.getElementById('ayModalArka').style.display = "none";
}

/* =========================================
   5. DERS PROGRAMI VE DİĞER FONKSİYONLAR
   ========================================= */

function dersEkle() {
    const ogrenci = document.getElementById("ogrenci").value;
    const ucret = Number(document.getElementById("ucret").value);
    const gun = document.getElementById("gun").value;
    const baslangic = parseFloat(document.getElementById("baslangic").value);
    const sure = parseFloat(document.getElementById("sure").value);

    if (!ogrenci || !ucret) { alert("Lütfen öğrenci adı ve ücret giriniz."); return; }
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).push({ ogrenci, ucret, gun, baslangic, sure });
    document.getElementById("ogrenci").value = "";
}

// Ders Çiz fonksiyonunu kesin çözümle güncelle
function dersCiz(ders) {
    // 100ms gecikme DOM'un (tablonun) render edilmesine izin verir
    setTimeout(() => {
        const hucre = document.getElementById(`hucre-${ders.gun}-${ders.baslangic}`);
        const tablo = document.querySelector("table");
        
        if (!hucre || !tablo) return;

        // Koordinatları hesapla (Tablonun kendi offset değerlerini kullanıyoruz)
        const topPos = hucre.offsetTop;
        const leftPos = hucre.offsetLeft;
        const width = hucre.offsetWidth;
        const height = hucre.offsetHeight;
        const parcaSayisi = ders.sure / 0.5;

        const dersBlok = document.createElement("div");
        dersBlok.className = "ders-blok animate-in fade-in zoom-in duration-300"; // Küçük bir giriş efekti
        dersBlok.innerHTML = `
            <div class="flex flex-col h-full justify-center px-1 overflow-hidden">
                <span class="font-black text-[11px] leading-none mb-0.5 truncate">${ders.ogrenci}</span>
                <span class="text-[9px] font-bold opacity-80 uppercase leading-none">${ders.ucret} ₺</span>
            </div>
        `;
        dersBlok.dataset.id = ders.id;

        // Stil Atamaları
        Object.assign(dersBlok.style, {
            position: "absolute",
            top: (topPos + 1) + "px",
            left: (leftPos + 1) + "px",
            width: (width - 2) + "px",
            height: (height * parcaSayisi - 2) + "px",
            zIndex: "10",
            pointerEvents: "auto"
        });
        
        dersBlok.onclick = function (e) { 
            e.stopPropagation();
            secimModalAc(this); 
        };
        
        // Önemli: Bloğu tabloya değil, tablonun parent'ına veya bağıl bir alana eklemek gerekebilir 
        // ama mevcut yapında tablo relative olduğu için tablonun içine ekliyoruz.
        tablo.appendChild(dersBlok);
    }, 100);
}

function tabloyuTemizle() {
    document.querySelectorAll(".ders-blok").forEach(b => b.remove());
}

function secimModalAc(blok) {
    aktifBlok = blok;
    document.getElementById("secimModalArka").style.display = "flex";
}

function secimKapat() {
    document.getElementById("secimModalArka").style.display = "none";
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

function ogrencileriYukle() {
    const select = document.getElementById("kazancOgrenci");
    if(!select) return;
    const mevcutSecim = select.value;
    select.innerHTML = `<option value="">Öğrenci Seç</option>`;
    const ogrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    ogrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        select.appendChild(opt);
    });
    if(mevcutSecim) select.value = mevcutSecim;
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

function tercihleriAc() {
    if (!globalAyarlar) return;

    document.getElementById("prefHocaAd").value = globalAyarlar.ad || "";
    document.getElementById("prefBrans").value = globalAyarlar.brans || "";
    document.getElementById("prefMesaiBasla").value = globalAyarlar.mesaiBasla || "13";
    document.getElementById("prefMesaiBitis").value = globalAyarlar.mesaiBitis || "22";

    document.querySelectorAll('.gun-btn-mobil').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'secili-tatil');
        btn.classList.add('bg-white', 'text-gray-400');
    });

    if (globalAyarlar.tatilGunleri) {
        globalAyarlar.tatilGunleri.forEach(gunIndex => {
            const btn = document.querySelector(`.gun-btn-mobil[data-gun="${gunIndex}"]`);
            if (btn) {
                btn.classList.add('bg-blue-600', 'text-white', 'secili-tatil');
                btn.classList.remove('bg-white', 'text-gray-400');
            }
        });
    }

    document.getElementById("tercihlerSayfa").style.display = "flex";
}

function tercihKapat() {
    document.getElementById("tercihlerSayfa").style.display = "none";
    sayfaGoster('panel');
}