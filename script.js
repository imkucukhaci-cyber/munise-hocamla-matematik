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
        sayfaGoster('panel');
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
    sayfalar.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = "none";
    });
    
    document.getElementById(sayfa + "Sayfa").style.display = "block";

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

    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).on('value', (snapshot) => {
        const veri = snapshot.val();
        dersler = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        tabloyuTemizle();
        dersler.forEach(ders => dersCiz(ders));
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
        options: { responsive: true, maintainAspectRatio: false }
    });

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
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/* =========================================
   4. KAZANÇ TABLOSU (GÜNCELLENEN KISIM)
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
            if (k.odemeDurumu) aylikToplam[ay] += tutar;
            if (!ogrenciToplam[k.ogrenci]) ogrenciToplam[k.ogrenci] = Array(12).fill(0);
            ogrenciToplam[k.ogrenci][ay] += tutar;
        }
    });

    // 1. Tablo Başlıklarını Güncelle (Sadece Aylara Tıklama Özelliği)
    const theadRow = document.querySelector("#kazancTablo thead tr");
    if (theadRow) {
        const aylar = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
        theadRow.innerHTML = `<th class="p-3 text-left bg-gray-100">ÖĞRENCİ</th>`;
        aylar.forEach((ayAd, index) => {
            const th = document.createElement("th");
            th.innerText = ayAd;
            th.className = "cursor-pointer hover:bg-blue-600 hover:text-white transition p-2 bg-gray-50 text-blue-600 font-black text-center";
            // SADECE BURASI TIKLANABİLİR:
            th.onclick = () => ayDetayiniGoster(index, yil);
            theadRow.appendChild(th);
        });
    }

    const tbody = document.querySelector("#kazancTablo tbody");
    if(!tbody) return;
    tbody.innerHTML = "";

    // 2. Toplam Satırı (Tıklama özelliği yok)
    const toplamSatir = document.createElement("tr");
    toplamSatir.className = "font-bold bg-gray-100 border-b";
    toplamSatir.innerHTML = `<td class="p-3 text-left">GENEL TOPLAM</td>`;
    aylikToplam.forEach(t => {
        toplamSatir.innerHTML += `<td class="p-2 text-center text-gray-700">${t > 0 ? '₺' + t.toFixed(0) : '-'}</td>`;
    });
    tbody.appendChild(toplamSatir);

    // 3. Öğrenci Satırları (Tıklama özelliği yok)
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
    const modal = document.getElementById('ayModalArka');
    const liste = document.getElementById('ayKayitListe');
    const baslik = document.getElementById('ayModalBaslik');
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    if(!modal || !liste) return;

    liste.innerHTML = "";
    modal.style.display = "flex";
    baslik.innerText = `${aylar[ayIndex]} ${yil} - Tüm Kayıtlar`;

    const filtreliKayitlar = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        return d.getMonth() === ayIndex && d.getFullYear() === yil;
    }).sort((a,b) => new Date(a.tarih) - new Date(b.tarih));

    if (filtreliKayitlar.length === 0) {
        liste.innerHTML = `<div class="p-8 text-center text-gray-400">Bu ayda herhangi bir ders kaydı bulunmuyor.</div>`;
        return;
    }

    filtreliKayitlar.forEach(k => {
        const tutar = k.sure * k.ucret;
        const kart = document.createElement("div");
        kart.className = "flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm mb-2";
        kart.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[10px] font-bold text-blue-500 uppercase tracking-tight">${k.tarih}</span>
                <span class="font-bold text-gray-800 text-sm">${k.ogrenci} - ${k.sure} Saat Ders</span>
                <span class="text-[10px] ${k.odemeDurumu ? 'text-green-500' : 'text-orange-500'} font-bold">
                    ${k.odemeDurumu ? '● ÖDEME ALINDI' : '○ ÖDEME BEKLİYOR'}
                </span>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-black text-gray-900">₺${tutar}</span>
                <button onclick="kazancKaydiSil('${k.id}')" class="p-2 text-gray-300 hover:text-red-500 transition">🗑️</button>
            </div>
        `;
        liste.appendChild(kart);
    });
}

function ayModalKapat() {
    document.getElementById('ayModalArka').style.display = "none";
}

function kazancKaydiSil(id) {
    if(confirm("Bu ders kaydını silmek istediğinize emin misiniz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).remove()
            .then(() => ayModalKapat());
    }
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

    dersBlok.style.left = (hucreRect.left - tabloRect.left) + "px";
    dersBlok.style.top = (hucreRect.top - tabloRect.top) + "px";
    dersBlok.style.width = (hucreRect.width - 2) + "px";
    dersBlok.style.height = (hucreYukseklik * parcaSayisi - 2) + "px";
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

function raporOgrencileriYukle() {}
function secimDuzenle() { alert("Düzenleme için lütfen takvim üzerinden modalı kullanın."); secimKapat(); }