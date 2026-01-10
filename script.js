/* =========================================
   1. FIREBASE AYARLARI VE GLOBAL DEĞİŞKENLER
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
let globalAyarlar = null; // Kullanıcı ayarlarını burada tutacağız

/* =========================================
   2. GİRİŞ, KONTROL VE NAVİGASYON
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

function ayarKontrolVeBaslat() {
    database.ref(`kullanicilar/${aktifKullaniciId}/ayarlar`).once('value', (snapshot) => {
        globalAyarlar = snapshot.val();

        // Header (Logo ve Menü) ve Tercih Sayfası Elementleri
        const header = document.querySelector("header");
        const tercihSayfasi = document.getElementById("tercihlerSayfa");
        const digerSayfalar = ["panelSayfa", "takvimSayfa", "kazancSayfa", "raporSayfa"];

        if (!globalAyarlar || !globalAyarlar.kurulumTamam) {
            // AYAR YOKSA: Header gizle, sadece Tercih Formunu göster
            if(header) header.style.display = "none";
            digerSayfalar.forEach(s => {
                const el = document.getElementById(s);
                if(el) el.style.display = "none";
            });
            tercihSayfasi.style.display = "block";
        } else {
            // AYAR VARSA: Normal akış
            if(header) header.style.display = "block";
            tercihSayfasi.style.display = "none";
            verileriBuluttanDinle(); 
            sayfaGoster('panel');
        }
    });
}

function googleIleGiris() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(hata => alert(hata.message));
}

function cikisYap() {
    if(confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        auth.signOut().then(() => window.location.reload());
    }
}

function sayfaGoster(sayfa) {
    const sayfalar = ["panelSayfa", "takvimSayfa", "kazancSayfa", "raporSayfa"];
    sayfalar.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = "none";
    });
    
    document.getElementById(sayfa + "Sayfa").style.display = "block";

    // Menü aktiflik ayarı
/* === script.js -> sayfaGoster fonksiyonu içi === */

// Menü aktiflik ayarı (MODERN BACKGROUND EFEKTİ)
document.querySelectorAll('.nav-btn').forEach(btn => {
    const colorClass = btn.dataset.color; 
    const bgClass = btn.dataset.bg; // Yeni eklenen background rengi
    
    // Aktif sınıfları temizle
    btn.classList.remove('active', colorClass, bgClass, 'shadow-sm'); 
    
    // Varsayılan gri haline döndür
    btn.classList.add('text-gray-400'); 
    
    // SVG stroke rengini sıfırla
    const svg = btn.querySelector('svg');
    if(svg) svg.style.stroke = "";
});

const aktifBtn = document.getElementById("nav-" + sayfa);
if(aktifBtn) {
    const activeColor = aktifBtn.dataset.color;
    const activeBg = aktifBtn.dataset.bg; // HTML'den bg rengini al
    
    // Griyi kaldır, renkleri ekle
    aktifBtn.classList.remove('text-gray-400');
    aktifBtn.classList.add('active', activeColor, activeBg, 'shadow-sm'); // Arkasına renkli kutu ve gölge ekle
}

    if (sayfa === "takvim") {
        // Takvimi her açışta ayara göre yeniden oluştur
        takvimOlustur();
        setTimeout(() => {
            dersler.forEach(ders => dersCiz(ders));
        }, 50);
    }
    
    if (sayfa === "rapor") raporOgrencileriYukle();
    if (sayfa === "kazanc") ogrencileriYukle();
}

/* =========================================
   3. TERCİHLER VE AYAR KAYDETME
   ========================================= */

function gunSec(btn) {
    // Butona basınca seçildi efekti ver (kırmızı)
    btn.classList.toggle('bg-red-500');
    btn.classList.toggle('text-white');
    btn.classList.toggle('border-red-500');
    btn.classList.toggle('secili-tatil'); // İşaretleyici sınıf
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
        alert("Profiliniz başarıyla oluşturuldu!");
        window.location.reload(); // Sayfayı yenile ki her şey otursun
    });
}

/* =========================================
   4. DİNAMİK TAKVİM OLUŞTURMA
   ========================================= */

function takvimOlustur() {
    const tbody = document.getElementById("takvimBody");
    tbody.innerHTML = ""; // Önce temizle

    // Ayarlardan saatleri al, yoksa varsayılan yap
    const basla = globalAyarlar ? globalAyarlar.mesaiBasla : 13;
    const bitis = globalAyarlar ? globalAyarlar.mesaiBitis : 22;
    const tatiller = globalAyarlar ? (globalAyarlar.tatilGunleri || []) : [];

    for (let s = basla; s < bitis + 0.1; s += 0.5) {
        const basSaatStr = s % 1 === 0 ? `${s}:00` : `${Math.floor(s)}:30`;
        
        let rowHtml = `<tr class='border-b last:border-0'>`;
        rowHtml += `<td class='p-3 font-bold bg-gray-50 text-gray-400 text-xs border-r text-center align-top'>${basSaatStr}</td>`;
        
        for (let g = 1; g <= 7; g++) {
            // Eğer gün tatilse gri yap
            const tatilMi = tatiller.includes(g);
            const bgClass = tatilMi ? "bg-gray-100" : "";
            
            // Hücre ID'si yine aynı formatta: hucre-GUN-SAAT
            rowHtml += `<td id="hucre-${g}-${s}" class="p-0 border-r min-h-[50px] relative ${bgClass}"></td>`;
        }
        rowHtml += "</tr>";
        tbody.innerHTML += rowHtml;
    }

    // Dropdown (Ders ekleme) saatlerini de güncelle
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
        
        // Eğer takvim sayfası açıksa çiz
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
    document.getElementById("panel-toplamOgrenci").innerText = benzersizOgrenciler.length;

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

    document.getElementById("panel-buAyDers").innerText = buAyDersSayisi;
    document.getElementById("panel-kazanc").innerText = "₺" + buAyKazanc.toFixed(0);
    document.getElementById("panel-bekleyen").innerText = "₺" + bekleyenOdeme.toFixed(0);

    paneliCiz(aylikKazancVerisi, aylikDersVerisi);
}

/* === script.js içindeki paneliCiz fonksiyonunu bununla değiştir === */

function paneliCiz(kazancData, dersData) {
    const aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    // --- 1. KAZANÇ GRAFİĞİ (Modern Line Chart) ---
    const ctx1 = document.getElementById('kazancChart').getContext('2d');
    
    // Gradyan (Gölge) Oluşturma
    const gradient = ctx1.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Üstte Mavi
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)'); // Altta Şeffaf

    if(kazancGrafik) kazancGrafik.destroy();
    
    kazancGrafik = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Kazanç (₺)', 
                data: kazancData, 
                borderColor: '#3b82f6', // Ana Mavi
                backgroundColor: gradient, // Altına gradyan
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true, 
                tension: 0.4 // Çizgiyi yumuşatır (kıvrımlı yapar)
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₺' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#f3f4f6', borderDash: [5, 5] }, 
                    border: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false }, 
                    border: { display: false },
                    ticks: { font: { size: 10 }, color: '#9ca3af' }
                }
            }
        }
    });

    // --- 2. DERS YOĞUNLUĞU (Modern Bar Chart) ---
    const ctx2 = document.getElementById('dersChart').getContext('2d');
    
    if(dersGrafik) dersGrafik.destroy();
    
    dersGrafik = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Ders Sayısı', 
                data: dersData, 
                backgroundColor: '#6366f1', // İndigo Rengi
                borderRadius: 6, // Çubukların köşelerini yuvarla
                barThickness: 12, // Çubuk inceliği
                hoverBackgroundColor: '#4f46e5'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#f3f4f6', borderDash: [5, 5] }, 
                    border: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af', stepSize: 1 }
                },
                x: { 
                    grid: { display: false }, 
                    border: { display: false },
                    ticks: { font: { size: 10 }, color: '#9ca3af' }
                }
            }
        }
    });
}

/* =========================================
   6. KAZANÇ TABLOSU & MODALLAR
   ========================================= */

function kazancTablosuCiz() {
    const yil = Number(document.getElementById("yilSecim").value);
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

    const theadRow = document.querySelector("#kazancTablo thead tr");
    if (theadRow) {
        const aylar = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
        theadRow.innerHTML = `<th class="p-3 text-left bg-gray-100">ÖĞRENCİ</th>`;
        aylar.forEach((ayAd, index) => {
            const th = document.createElement("th");
            th.innerText = ayAd;
            th.className = "cursor-pointer hover:bg-blue-600 hover:text-white transition p-2 bg-gray-50 text-blue-600 font-black text-center";
            th.onclick = () => ayDetayiniGoster(index, yil);
            theadRow.appendChild(th);
        });
    }

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
   7. DERS EKLEME & ÇİZME
   ========================================= */

function dersEkle() {
    const ogrenci = document.getElementById("ogrenci").value;
    const ucret = Number(document.getElementById("ucret").value);
    const gun = document.getElementById("gun").value;
    const baslangic = parseFloat(document.getElementById("baslangic").value);
    const sure = parseFloat(document.getElementById("sure").value);

    // Ayarları kontrol et: Tatil günü mü?
    if (globalAyarlar && globalAyarlar.tatilGunleri && globalAyarlar.tatilGunleri.includes(Number(gun))) {
        alert("Seçtiğiniz gün tatil olarak ayarlanmış! Ders ekleyemezsiniz.");
        return;
    }

    if (!ogrenci || !ucret) { alert("Eksik bilgi girdiniz."); return; }
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).push({ ogrenci, ucret, gun, baslangic, sure });
    document.getElementById("ogrenci").value = "";
}

function dersCiz(ders) {
    // Tablo henüz çizilmediyse veya hücre yoksa bekleme yapma, abort et
    const hucre = document.getElementById(`hucre-${ders.gun}-${ders.baslangic}`);
    const tablo = document.querySelector("#takvimBody");
    
    if (!hucre || !tablo) return;

    const topPos = hucre.offsetTop;
    const leftPos = hucre.offsetLeft;
    const width = hucre.offsetWidth;
    const height = hucre.offsetHeight;
    const parcaSayisi = ders.sure / 0.5;

    const dersBlok = document.createElement("div");
    dersBlok.className = "ders-blok animate-in fade-in zoom-in duration-300 shadow-md hover:shadow-xl transition-all cursor-pointer";
    dersBlok.innerHTML = `
        <div class="flex flex-col h-full justify-center px-2 bg-blue-100 border-l-4 border-blue-600 rounded-r-md overflow-hidden">
            <span class="font-black text-[10px] md:text-xs leading-tight text-blue-900 truncate">${ders.ogrenci}</span>
            <span class="text-[9px] font-bold text-blue-500">${ders.ucret} ₺</span>
        </div>
    `;
    dersBlok.dataset.id = ders.id;

    Object.assign(dersBlok.style, {
        position: "absolute",
        top: (topPos + 1) + "px",
        left: (leftPos + 1) + "px",
        width: (width - 2) + "px",
        height: (height * parcaSayisi - 2) + "px",
        zIndex: "20"
    });
    
    dersBlok.onclick = function (e) { 
        e.stopPropagation();
        secimModalAc(this); 
    };
    
    // Tablonun parent'ına eklemiyoruz, direkt TD'nin içine eklersek kayma yapabilir.
    // En sağlıklısı tablo body'sine eklemektir (pozisyon absolute olduğu için)
    // Ancak relative parent gerekli. Tablo yapısında td içi en güvenlisi.
    // Üstteki kodda TD relative yapıldı, o yüzden TD içine append ediyoruz:
    // DÜZELTME: TD içine append edersek overflow hidden yiyebilir, tablo container'a ekleyelim mi?
    // Hayır, mevcut yapıda document body veya table parent'a eklemek koordinat karmaşası yaratır.
    // TD içine ekleyelim ama TD'nin style'ı relative olmalı.
    
    // Kodda td'ye relative eklemiştim: class="... relative" -> Sorun yok.
    hucre.appendChild(dersBlok);
    
    // Ama bekle, absolute pozisyonu top/left vererek yapıyoruz, TD içine koyarsak
    // top:0 left:0 olması lazım.
    // Eğer TD içine koyacaksak style şöyle güncellenmeli:
    dersBlok.style.top = "0px";
    dersBlok.style.left = "0px";
    dersBlok.style.width = "100%";
    dersBlok.style.height = (100 * parcaSayisi) + "%";
    // Yükseklik % olarak biraz riskli olabilir (border'lar yüzünden), ama deneyelim.
    // Yok, en garantisi piksel hesabı ve tablo üzerine koymak ama o çok kompleks.
    // En basiti:
    dersBlok.style.height = `calc(${parcaSayisi * 100}% + ${parcaSayisi}px)`; // Kabaca ayar
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
    if(confirm("Dersi silmek istediğinize emin misiniz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/dersler/${aktifBlok.dataset.id}`).remove();
        secimKapat();
    }
}

function kazancEkle() {
    const ogrenci = document.getElementById("kazancOgrenci").value;
    const tarih = document.getElementById("kazancTarih").value;
    const sure = parseFloat(document.getElementById("kazancSure").value);
    const odemeAlindi = document.getElementById("kazancOdeme").checked;

    if (!ogrenci || !tarih || !sure) { alert("Eksik bilgi."); return; }
    
    const dersProg = dersler.find(d => d.ogrenci === ogrenci);
    const ucret = dersProg ? Number(dersProg.ucret) : 0;

    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar`).push({
        ogrenci, tarih, sure, ucret, odemeDurumu: odemeAlindi
    });
    alert("Ders işlendi olarak kaydedildi!");
}

function ogrencileriYukle() {
    const select = document.getElementById("kazancOgrenci");
    if(!select) return;
    select.innerHTML = `<option value="">Öğrenci Seç</option>`;
    const ogrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    ogrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        select.appendChild(opt);
    });
}

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

    let filtrelenmis = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        const ogrenciUygun = seciliOgrenci === "all" || k.ogrenci === seciliOgrenci;
        const yilUygun = seciliYil === "all" || d.getFullYear().toString() === seciliYil;
        const ayUygun = seciliAy === "all" || d.getMonth().toString() === seciliAy;
        return ogrenciUygun && yilUygun && ayUygun;
    }).sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

    let toplamSaat = 0;
    let toplamKazanc = 0;
    
    let html = `<table class="w-full text-sm text-left"><thead><tr class="text-gray-400 border-b"><th>Tarih</th><th>Öğrenci</th><th>Süre</th><th>Tutar</th></tr></thead><tbody>`;
    
    filtrelenmis.forEach(k => {
        const tutar = k.sure * k.ucret;
        toplamSaat += k.sure;
        toplamKazanc += tutar;
        html += `<tr class="border-b"><td class="py-2">${k.tarih}</td><td class="font-bold">${k.ogrenci}</td><td>${k.sure}</td><td class="text-right">₺${tutar}</td></tr>`;
    });
    html += `</tbody></table>`;
    
    onizleme.innerHTML = html;
}

/* =========================================
   8. AYARLARI DÜZENLEME VE GÜNCELLEME
   ========================================= */

/* =========================================
   8. AYARLARI DÜZENLEME VE GÜNCELLEME
   ========================================= */

function tercihleriAc() {
    if (!globalAyarlar) return;

    // 1. Verileri Doldur
    document.getElementById("prefHocaAd").value = globalAyarlar.ad || "";
    document.getElementById("prefBrans").value = globalAyarlar.brans || "";
    document.getElementById("prefMesaiBasla").value = globalAyarlar.mesaiBasla || "13";
    document.getElementById("prefMesaiBitis").value = globalAyarlar.mesaiBitis || "22";

    // 2. Tatil Günlerini Boya
    document.querySelectorAll('.gun-btn').forEach(btn => {
        btn.classList.remove('bg-red-500', 'text-white', 'border-red-500', 'secili-tatil');
        btn.classList.add('text-gray-400');
    });

    if (globalAyarlar.tatilGunleri) {
        globalAyarlar.tatilGunleri.forEach(gunIndex => {
            const btn = document.querySelector(`.gun-btn[data-gun="${gunIndex}"]`);
            if (btn) {
                btn.classList.add('bg-red-500', 'text-white', 'border-red-500', 'secili-tatil');
                btn.classList.remove('text-gray-400');
            }
        });
    }

    // 3. Sayfa Geçişi
    document.getElementById("panelSayfa").style.display = "none";
    document.getElementById("takvimSayfa").style.display = "none";
    document.getElementById("kazancSayfa").style.display = "none";
    document.getElementById("raporSayfa").style.display = "none";
    
    // Header'ı gizlemiyoruz, çünkü kullanıcı çıkış yapmak isteyebilir
    document.getElementById("tercihlerSayfa").style.display = "block";
}

// Yeni Kapatma Fonksiyonu (Sağ üstteki X butonu için)
function tercihKapat() {
    // Ayarları kapat, panele dön
    document.getElementById("tercihlerSayfa").style.display = "none";
    sayfaGoster('panel');
}