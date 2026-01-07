/* =========================================
   1. FIREBASE AYARLARI VE BAŞLATMA
   ========================================= */
// ❗ Firebase panelinden aldığın "config" kodlarını buraya yapıştır:
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


// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let aktifKullaniciId = null;
let dersler = []; // Hafızadaki ders listesi
let kazancKayitlari = []; // Hafızadaki kazanç listesi
let aktifBlok = null; // Düzenlenen ders bloğu

/* =========================================
   2. GİRİŞ (AUTH) İŞLEMLERİ
   ========================================= */

// Auth durumunu izle (Giriş yapılmış mı?)
auth.onAuthStateChanged((user) => {
    if (user) {
        // Giriş Başarılı
        aktifKullaniciId = user.uid;
        document.getElementById("loginSayfa").style.display = "none";
        document.getElementById("anaUygulama").style.display = "block";
        
        // Verileri buluttan dinlemeye başla
        verileriBuluttanDinle(); 
    } else {
        // Çıkış Yapılmış
        aktifKullaniciId = null;
        document.getElementById("loginSayfa").style.display = "flex";
        document.getElementById("anaUygulama").style.display = "none";
        tabloyuTemizle(); // Ekranda kalan dersleri temizle
    }
});

function googleIleGiris() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(hata => alert(hata.message));
}

function cikisYap() {
    auth.signOut();
    location.reload(); // Sayfayı yenile
}

/* =========================================
   3. VERİTABANI DİNLEYİCİSİ (Gerçek Zamanlı)
   ========================================= */

function verileriBuluttanDinle() {
    if (!aktifKullaniciId) return;

    // 1. DERS PROGRAMINI DİNLE
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).on('value', (snapshot) => {
        const veri = snapshot.val();
        // Firebase objesini diziye çevir
        dersler = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        
        // Takvimi güncelle
        tabloyuTemizle();
        dersler.forEach(ders => dersCiz(ders));
        // Öğrenci listesini güncelle (Select kutusu için)
        ogrencileriYukle(); 
    });

    // 2. KAZANÇ KAYITLARINI DİNLE
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar`).on('value', (snapshot) => {
        const veri = snapshot.val();
        kazancKayitlari = veri ? Object.keys(veri).map(key => ({ id: key, ...veri[key] })) : [];
        
        // Kazanç tablosunu güncelle
        kazancTablosuCiz();
    });
}

/* =========================================
   4. TAKVİM VE DERS İŞLEMLERİ
   ========================================= */

function dersEkle() {
    const ogrenci = document.getElementById("ogrenci").value;
    const ucret = Number(document.getElementById("ucret").value);
    const gun = document.getElementById("gun").value;
    const baslangic = parseFloat(document.getElementById("baslangic").value);
    const sure = parseFloat(document.getElementById("sure").value);

    if (!ogrenci || !ucret) {
        alert("Lütfen öğrenci adı ve ücret giriniz.");
        return;
    }

    const yeniDers = {
        ogrenci,
        ucret,
        gun,
        baslangic,
        sure
    };

    // Firebase'e Gönder (Push)
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler`).push(yeniDers);
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
    dersBlok.innerHTML = `
        ${ders.ogrenci}<br>
        <small>${ders.ucret} ₺ / saat</small>
    `;

    // Verileri elementin üzerine yaz (Dataset)
    dersBlok.dataset.id = ders.id; // Firebase ID'si
    dersBlok.dataset.ogrenci = ders.ogrenci;
    dersBlok.dataset.ucret = ders.ucret;

    // Pozisyonlama
    dersBlok.style.left = (hucreRect.left - tabloRect.left) + "px";
    dersBlok.style.top = (hucreRect.top - tabloRect.top) + "px";
    dersBlok.style.width = hucreRect.width + "px";
    dersBlok.style.height = (hucreYukseklik * parcaSayisi) + "px";

    dersBlok.onclick = function () { secimModalAc(this); };

    document.querySelector("table").appendChild(dersBlok);
}

function tabloyuTemizle() {
    // Sadece ders bloklarını sil, tablo iskeleti kalsın
    const bloklar = document.querySelectorAll(".ders-blok");
    bloklar.forEach(b => b.remove());
}

/* =========================================
   5. MODAL İŞLEMLERİ (Sil / Düzenle)
   ========================================= */

function secimModalAc(blok) {
    aktifBlok = blok;
    document.getElementById("secimModalArka").style.display = "flex";
}

function secimKapat() {
    document.getElementById("secimModalArka").style.display = "none";
}

function secimSil() {
    if (!aktifBlok) return;
    const id = aktifBlok.dataset.id; // Firebase ID

    if(confirm("Bu dersi programdan silmek istiyor musunuz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/dersler/${id}`).remove();
        secimKapat();
    }
}

function secimDuzenle() {
    secimKapat();
    modalAc(aktifBlok);
}

function modalAc(blok) {
    aktifBlok = blok;
    document.getElementById("modalOgrenci").value = blok.dataset.ogrenci;
    document.getElementById("modalUcret").value = blok.dataset.ucret;
    document.getElementById("modalArkaPlan").style.display = "flex";
}

function modalKapat() {
    document.getElementById("modalArkaPlan").style.display = "none";
    aktifBlok = null;
}

function modalKaydet() {
    if (!aktifBlok) return;
    const id = aktifBlok.dataset.id;

    const guncelVeri = {
        ogrenci: document.getElementById("modalOgrenci").value,
        ucret: document.getElementById("modalUcret").value
    };

    // Firebase Güncelle (Update)
    database.ref(`kullanicilar/${aktifKullaniciId}/dersler/${id}`).update(guncelVeri);
    modalKapat();
}

/* =========================================
   6. KAZANÇ SAYFASI İŞLEMLERİ
   ========================================= */

function kazancEkle() {
    const ogrenci = document.getElementById("kazancOgrenci").value;
    const tarih = document.getElementById("kazancTarih").value;
    const sure = parseFloat(document.getElementById("kazancSure").value);
    const odemeAlindi = document.getElementById("kazancOdeme").checked;

    if (!ogrenci || !tarih || !sure) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    // Öğrenci ücretini bul
    const dersProgrami = dersler.find(d => d.ogrenci === ogrenci);
    if (!dersProgrami) {
        alert("Bu öğrenci takvimde kayıtlı değil, ücret bilgisi bulunamadı.");
        return;
    }

    const yeniKayit = {
        ogrenci,
        tarih,
        sure,
        ucret: Number(dersProgrami.ucret),
        odemeDurumu: odemeAlindi
    };

    // Firebase'e Gönder
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar`).push(yeniKayit);
    
    // Formu temizle
    document.getElementById("kazancOdeme").checked = false;
    alert("Ders kaydedildi!");
}

function kazancTablosuCiz() {
    const yil = Number(document.getElementById("yilSecim").value);
    const aylikToplam = Array(12).fill(0);
    const ogrenciToplam = {};

    kazancKayitlari.forEach(k => {
        const tarih = new Date(k.tarih);
        if (tarih.getFullYear() === yil) {
            const ay = tarih.getMonth();
            
            // Eğer sadece ödenenleri saymak istersen buraya if(k.odemeDurumu) ekle
            const tutar = k.sure * k.ucret;
            
            // Ödemesi alınanları toplama ekle (Senin tercihin bu yöndeydi)
            if (k.odemeDurumu) {
                aylikToplam[ay] += tutar;
                if (!ogrenciToplam[k.ogrenci]) ogrenciToplam[k.ogrenci] = Array(12).fill(0);
                ogrenciToplam[k.ogrenci][ay] += tutar;
            }
        }
    });

    // Tabloyu Oluştur
    const tbody = document.querySelector("#kazancTablo tbody");
    tbody.innerHTML = "";

    // Genel Toplam Satırı
    const toplamSatir = document.createElement("tr");
    toplamSatir.innerHTML = "<th>Toplam</th>";
    aylikToplam.forEach(t => {
        toplamSatir.innerHTML += `<td><strong>${t.toFixed(2)} ₺</strong></td>`;
    });
    tbody.appendChild(toplamSatir);

    // Öğrenci Satırları
    Object.keys(ogrenciToplam).forEach(ogrenci => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${ogrenci}</td>`;
        ogrenciToplam[ogrenci].forEach(t => {
            tr.innerHTML += `<td>${t.toFixed(2)} ₺</td>`;
        });
        tbody.appendChild(tr);
    });
}

/* =========================================
   7. AY DETAY MODALI (Görsel Düzeltmeli)
   ========================================= */

function ayDetayAc(ayIndex) {
    const yil = Number(document.getElementById("yilSecim").value);
    
    const ayKayitlari = kazancKayitlari.filter(k => {
        const t = new Date(k.tarih);
        return t.getFullYear() === yil && t.getMonth() === ayIndex;
    });

    const ayAdlari = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    document.getElementById("ayModalBaslik").innerText = `${ayAdlari[ayIndex]} - Ders Detayları`;

    const liste = document.getElementById("ayKayitListe");
    liste.innerHTML = "";

    if (ayKayitlari.length === 0) {
        liste.innerHTML = "<p>Bu ay için kayıt yok.</p>";
    }

    ayKayitlari.forEach((k) => {
        const div = document.createElement("div");
        div.className = "ay-kayit"; // CSS'te grid yapısını buna göre ayarlamıştık

        const btnMetin = k.odemeDurumu ? "✅" : "❌";
        const btnRenk = k.odemeDurumu ? "#2ecc71" : "#f39c12";

        // Düzeltilmiş HTML Yapısı (Sil butonu başta, sadece ikon)
        div.innerHTML = `
            <button class="sil-btn" onclick="kazancSil('${k.id}')">🗑️</button>
            <span style="font-weight:bold">${k.ogrenci}</span>
            <span>${k.tarih.split('-').reverse().slice(0,2).join('.')}</span>
            <span>${k.sure} sa</span>
            <strong style="text-align:right">${(k.sure * k.ucret).toFixed(2)} ₺</strong>
            <button class="odeme-btn" style="background:${btnRenk}; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;" 
                onclick="odemeDurumuDegistir('${k.id}', ${k.odemeDurumu})">${btnMetin}</button>
        `;
        liste.appendChild(div);
    });

    document.getElementById("ayModalArka").style.display = "flex";
}

function odemeDurumuDegistir(id, mevcutDurum) {
    // Firebase'de durumu tersine çevir
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).update({
        odemeDurumu: !mevcutDurum
    });
    
    // Modalın kapanmaması için küçük bir hile:
    // Firebase dinleyicisi tabloyu güncelleyecek, biz sadece bekliyoruz
    // Kullanıcıya anlık tepki vermek için görseli JS ile değiştirebiliriz ama listener en doğrusu.
    // Modal açık kalacak ve listener sayesinde içerik yenilenecek.
}

function kazancSil(id) {
    if(confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).remove();
    }
}

function ayModalKapat() {
    document.getElementById("ayModalArka").style.display = "none";
}

/* =========================================
   8. RAPOR VE DİĞER YARDIMCILAR
   ========================================= */

function sayfaGoster(sayfa) {
    document.getElementById("takvimSayfa").style.display = sayfa === "takvim" ? "block" : "none";
    document.getElementById("kazancSayfa").style.display = sayfa === "kazanc" ? "block" : "none";
    document.getElementById("raporSayfa").style.display = sayfa === "rapor" ? "block" : "none";

    if (sayfa === "rapor") raporOgrencileriYukle();
    if (sayfa === "kazanc") ogrencileriYukle();
}

function ogrencileriYukle() {
    const select = document.getElementById("kazancOgrenci");
    const mevcutSecim = select.value;
    select.innerHTML = `<option value="">Öğrenci Seç</option>`;

    // Benzersiz öğrencileri bul
    const ogrenciler = [...new Set(dersler.map(d => d.ogrenci))];

    ogrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        select.appendChild(opt);
    });
    
    if(mevcutSecim) select.value = mevcutSecim;
}

function raporOgrencileriYukle() {
    const select = document.getElementById("raporOgrenci");
    select.innerHTML = `<option value="hepsi">Tüm Öğrenciler</option>`;
    const benzersizOgrenciler = [...new Set(dersler.map(d => d.ogrenci))];
    benzersizOgrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        select.appendChild(opt);
    });
}

function raporOlustur() {
    const yil = Number(document.getElementById("raporYil").value);
    const ay = document.getElementById("raporAy").value;
    const ogrenci = document.getElementById("raporOgrenci").value;

    const filtreli = kazancKayitlari.filter(k => {
        const t = new Date(k.tarih);
        const yilUygun = t.getFullYear() === yil;
        const ayUygun = ay === "hepsi" || t.getMonth() === Number(ay);
        const ogrenciUygun = ogrenci === "hepsi" || k.ogrenci === ogrenci;
        return yilUygun && ayUygun && ogrenciUygun;
    });

    let toplam = 0;
    let tabloHTML = `
        <div class="rapor-ozet">
            <div><strong>Öğretmen Raporu</strong><br>Tarih: ${new Date().toLocaleDateString()}</div>
            <div><strong>Filtre:</strong> ${ogrenci} / ${yil}</div>
        </div>
        <table border="1" style="width:100%; border-collapse:collapse; font-size:12px;">
             <colgroup>
                <col style="width: 15%">
                <col style="width: 30%">
                <col style="width: 15%">
                <col style="width: 20%">
                <col style="width: 20%">
            </colgroup>
            <thead>
                <tr style="background:#f2f2f2">
                    <th>Tarih</th><th>Öğrenci</th><th>Süre</th><th>Ücret</th><th>Durum</th>
                </tr>
            </thead>
            <tbody>`;

    filtreli.forEach(k => {
        toplam += (k.sure * k.ucret);
        tabloHTML += `
            <tr>
                <td>${k.tarih.split('-').reverse().join('.')}</td>
                <td>${k.ogrenci}</td>
                <td>${k.sure} sa</td>
                <td>${(k.sure * k.ucret).toFixed(2)} ₺</td>
                <td>${k.odemeDurumu ? "Ödendi" : "Bekliyor"}</td>
            </tr>`;
    });

    tabloHTML += `</tbody></table>
        <h3 style="text-align:right; margin-top:20px;">Genel Toplam: ${toplam.toFixed(2)} ₺</h3>`;

    document.getElementById("raporOnizleme").innerHTML = tabloHTML;
}