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

    // TAKVİM SAYFASINA GEÇİNCE YERLEŞİMİ TETİKLE
    if (sayfa === "takvim") {
        tabloyuTemizle();
        dersler.forEach(ders => dersCiz(ders));
    }
    
    if (sayfa === "rapor") raporOgrencileriYukle();
    if (sayfa === "kazanc") ogrencileriYukle();
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
            // GRAFİKLER: Sadece ödemesi alınanları kazanç grafiğine ekle
            if (k.odemeDurumu) {
                aylikKazancVerisi[d.getMonth()] += tutar;
            }
            aylikDersVerisi[d.getMonth()] += 1; // Ders sayısı her halükarda artar

            if (d.getMonth() === buAy) {
                buAyDersSayisi += 1;
                if (k.odemeDurumu) {
                    buAyKazanc += tutar; // Sadece ödenenler "Bu Ay Kazanç"a
                } else {
                    bekleyenOdeme += tutar; // Ödenmeyenler "Bekleyen"e
                }
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
            
            // SADECE ÖDEME ALINDIysa hem genel toplama hem öğrenci toplamına ekle
            if (k.odemeDurumu) {
                aylikToplam[ay] += tutar;
                if (!ogrenciToplam[k.ogrenci]) ogrenciToplam[k.ogrenci] = Array(12).fill(0);
                ogrenciToplam[k.ogrenci][ay] += tutar;
            }
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
    // Hangi ayın açık olduğunu hafızaya alıyoruz
    modalAcikAy = ayIndex;
    modalAcikYil = yil;

    const modal = document.getElementById('ayModalArka');
    const liste = document.getElementById('ayKayitListe');
    const baslik = document.getElementById('ayModalBaslik');
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    liste.innerHTML = "";
    modal.style.display = "flex";
    baslik.innerText = `${aylar[ayIndex]} ${yil} Detayı`;

    const filtreliKayitlar = kazancKayitlari.filter(k => {
        const d = new Date(k.tarih);
        return d.getMonth() === ayIndex && d.getFullYear() === yil;
    }).sort((a,b) => new Date(b.tarih) - new Date(a.tarih));

    if (filtreliKayitlar.length === 0) {
        liste.innerHTML = `<div class="p-8 text-center text-gray-400 font-bold italic text-sm">Bu ayda henüz bir kayıt yok.</div>`;
        return;
    }

    filtreliKayitlar.forEach(k => {
        const tutar = k.sure * k.ucret;
        const kart = document.createElement("div");
        // Dinamik sınıf: Ödenmişse yeşil çerçeve, ödenmemişse gölgeli beyaz
        kart.className = `flex items-center justify-between p-4 rounded-xl border mb-2 transition-all duration-300 ${k.odemeDurumu ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 shadow-sm'}`;
        
        kart.innerHTML = `
            <div class="flex flex-col gap-1">
                <span class="text-[10px] font-bold text-gray-400 uppercase">${k.tarih}</span>
                <span class="font-black text-gray-800">${k.ogrenci}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-500">${k.sure} Sa / ₺${tutar}</span>
                    ${!k.odemeDurumu ? 
                        `<button onclick="odemeDurumuGuncelle('${k.id}', true)" class="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-lg font-black hover:bg-orange-600 transition shadow-sm animate-pulse">ÖDEME AL</button>` : 
                        `<span class="text-green-600 text-[10px] font-black italic">✓ TAHSİL EDİLDİ</span>`
                    }
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${k.odemeDurumu ? 
                    `<button onclick="odemeDurumuGuncelle('${k.id}', false)" class="p-2 text-gray-300 hover:text-orange-500 transition text-lg" title="Geri Al">↩</button>` : ''
                }
                <button onclick="kazancKaydiSil('${k.id}')" class="p-2 text-gray-300 hover:text-red-500 transition text-lg">🗑️</button>
            </div>
        `;
        liste.appendChild(kart);
    });
}

function odemeDurumuGuncelle(kayitId, yeniDurum) {
    database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${kayitId}`).update({
        odemeDurumu: yeniDurum
    }).then(() => {
        // Firebase güncellendiğinde modalı kapatmadan içeriği yeniliyoruz!
        if(modalAcikAy !== null) {
            ayDetayiniGoster(modalAcikAy, modalAcikYil);
        }
    });
}

function kazancKaydiSil(id) {
    if(confirm("Bu ders kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
        database.ref(`kullanicilar/${aktifKullaniciId}/kazanclar/${id}`).remove()
            .then(() => {
                // SİLME İŞLEMİ BAŞARILI OLUNCA:
                if(modalAcikAy !== null) {
                    // Listeyi anında yenile (Modal açık kalır, kayıt şak diye listeden kaybolur)
                    ayDetayiniGoster(modalAcikAy, modalAcikYil);
                }
                console.log("Kayıt başarıyla silindi.");
            })
            .catch((hata) => {
                alert("Silme işlemi sırasında bir hata oluştu: " + hata.message);
            });
    }
}

/* =========================================
   MODAL KAPATMA FONKSİYONU
   ========================================= */
function ayModalKapat() {
    const modal = document.getElementById('ayModalArka');
    if (modal) {
        modal.style.display = "none";
        // Temizlik: Hafızadaki ay/yıl bilgisini sıfırlıyoruz
        modalAcikAy = null;
        modalAcikYil = null;
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