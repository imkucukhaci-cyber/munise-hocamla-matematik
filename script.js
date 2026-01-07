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

/* =========================================
   2. GİRİŞ VE NAVİGASYON
   ========================================= */

auth.onAuthStateChanged((user) => {
    if (user) {
        aktifKullaniciId = user.uid;
        document.getElementById("loginSayfa").style.display = "none";
        document.getElementById("anaUygulama").style.display = "block";
        verileriBuluttanDinle(); 
        sayfaGoster('panel'); // İlk girişte Paneli göster
    } else {
        aktifKullaniciId = null;
        document.getElementById("loginSayfa").style.display = "flex";
        document.getElementById("anaUygulama").style.display = "none";
        tabloyuTemizle();
    }
});

function googleIleGiris() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(hata => alert(hata.message));
}

function cikisYap() {
    auth.signOut();
    location.reload();
}

function sayfaGoster(sayfa) {
    const sayfalar = ["panelSayfa", "takvimSayfa", "kazancSayfa", "raporSayfa"];
    sayfalar.forEach(s => document.getElementById(s).style.display = "none");
    
    document.getElementById(sayfa + "Sayfa").style.display = "block";

    // Navigasyon butonlarının stilini güncelle
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    const aktifBtn = document.getElementById("nav-" + sayfa);
    if(aktifBtn) {
        aktifBtn.classList.remove('border-transparent', 'text-gray-500');
        aktifBtn.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
    }

    if (sayfa === "rapor") raporOgrencileriYukle();
    if (sayfa === "kazanc" || sayfa === "takvim") ogrencileriYukle();
}

/* =========================================
   3. VERİ DİNLEME VE PANEL RAPORLAMA
   ========================================= */

function verileriBuluttanDinle() {
    if (!aktifKullaniciId) return;

    // Ders Programı Dinleyicisi
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).on('value', (snapshot) => {
        const veri = snapshot.val();
        dersler = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        tabloyuTemizle();
        dersler.forEach(ders => dersCiz(ders));
        panelOzetiniGuncelle();
    });

    // Kazanç Kayıtları Dinleyicisi
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

    // Öğrenci Sayısı
    const benzersizOgrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    document.getElementById("panel-toplamOgrenci").innerText = benzersizOgrenciler.length;

    // Kazanç ve Grafik Hesaplamaları
    kazancKayitlari.forEach(k => {
        const d = new Date(k.tarih);
        const tutar = k.sure * k.ucret;
        
        if (d.getFullYear() === buYil) {
            aylikKazancVerisi[d.getMonth()] += tutar;
            aylikDersVerisi[d.getMonth()] += 1;

            if (d.getMonth() === buAy) {
                buAyKazanc += tutar;
                buAyDersSayisi += 1;
                if (!k.odemeDurumu) bekleyenOdeme += tutar;
            }
        }
    });

    document.getElementById("panel-buAyDers").innerText = buAyDersSayisi;
    document.getElementById("panel-kazanc").innerText = "₺" + buAyKazanc.toFixed(0);
    document.getElementById("panel-bekleyen").innerText = "₺" + bekleyenOdeme.toFixed(0);

    paneliCiz(aylikKazancVerisi, aylikDersVerisi);
}

function paneliCiz(kazancData, dersData) {
    const aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    // Kazanç Grafiği
    const ctx1 = document.getElementById('kazancChart').getContext('2d');
    if(kazancGrafik) kazancGrafik.destroy();
    kazancGrafik = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Kazanç (₺)', 
                data: kazancData, 
                borderColor: '#4F46E5', 
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, // CSS yüksekliğine uyması için şart
        }
    });

    // Ders Sayısı Grafiği
    const ctx2 = document.getElementById('dersChart').getContext('2d');
    if(dersGrafik) dersGrafik.destroy();
    dersGrafik = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: aylar,
            datasets: [{ 
                label: 'Ders Sayısı', 
                data: dersData, 
                backgroundColor: '#3B82F6',
                borderRadius: 5
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false // CSS yüksekliğine uyması için şart
        }
    });
}

/* =========================================
   4. MEVCUT FONKSİYONLAR (DOKUNULMADI)
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

function dersCiz(ders) {
    const ilkHucre = document.getElementById(`hucre-${ders.gun}-${ders.baslangic}`);
    if (!ilkHucre) return;

    const hucreRect = ilkHucre.getBoundingClientRect();
    const tabloRect = document.querySelector("table").getBoundingClientRect();
    const hucreYukseklik = ilkHucre.offsetHeight;
    const parcaSayisi = ders.sure / 0.5;

    const dersBlok = document.createElement("div");
    dersBlok.className = "ders-blok";
    dersBlok.innerHTML = `${ders.ogrenci}<br><small>${ders.ucret} ₺ / sa</small>`;
    dersBlok.dataset.id = ders.id;
    dersBlok.dataset.ogrenci = ders.ogrenci;
    dersBlok.dataset.ucret = ders.ucret;

    dersBlok.style.left = (hucreRect.left - tabloRect.left) + "px";
    dersBlok.style.top = (hucreRect.top - tabloRect.top) + "px";
    dersBlok.style.width = hucreRect.width + "px";
    dersBlok.style.height = (hucreYukseklik * parcaSayisi) + "px";
    dersBlok.onclick = function () { secimModalAc(this); };
    document.querySelector("table").appendChild(dersBlok);
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
    if(confirm("Bu dersi silmek istiyor musunuz?")) {
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

function kazancTablosuCiz() {
    const yil = Number(document.getElementById("yilSecim").value);
    const aylikToplam = Array(12).fill(0);
    const ogrenciToplam = {};

    kazancKayitlari.forEach(k => {
        const tarih = new Date(k.tarih);
        if (tarih.getFullYear() === yil && k.odemeDurumu) {
            const ay = tarih.getMonth();
            const tutar = k.sure * k.ucret;
            aylikToplam[ay] += tutar;
            if (!ogrenciToplam[k.ogrenci]) ogrenciToplam[k.ogrenci] = Array(12).fill(0);
            ogrenciToplam[k.ogrenci][ay] += tutar;
        }
    });

    const tbody = document.querySelector("#kazancTablo tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    const toplamSatir = document.createElement("tr");
    toplamSatir.innerHTML = "<th>Toplam</th>";
    aylikToplam.forEach(t => { toplamSatir.innerHTML += `<td>${t.toFixed(0)}₺</td>`; });
    tbody.appendChild(toplamSatir);

    Object.keys(ogrenciToplam).forEach(o => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${o}</td>`;
        ogrenciToplam[o].forEach(t => { tr.innerHTML += `<td>${t.toFixed(0)}₺</td>`; });
        tbody.appendChild(tr);
    });
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

// Rapor ve Modal kapatma gibi diğer küçük fonksiyonları aynen koruyabilirsin.
function secimDuzenle() { alert("Düzenleme için lütfen takvim üzerinden modalı kullanın."); secimKapat(); }