let dersler = JSON.parse(localStorage.getItem("dersler")) || [];
let aktifBlok = null;

function dersEkle() {
    const ogrenci = document.getElementById("ogrenci").value;
    const ucret = Number(document.getElementById("ucret").value);
    const gun = document.getElementById("gun").value;
    const baslangic = parseFloat(document.getElementById("baslangic").value);
    const sure = parseFloat(document.getElementById("sure").value);

    if (!ogrenci || !ucret) {
        alert("Öğrenci ve ücret gir");
        return;
    }

    const ilkHucre = document.getElementById(`hucre-${gun}-${baslangic}`);
    if (!ilkHucre) return;

    const hucreRect = ilkHucre.getBoundingClientRect();
    const tabloRect = document.querySelector("table").getBoundingClientRect();

    const parcaSayisi = sure / 0.5;
    const hucreYukseklik = ilkHucre.offsetHeight;

    const dersBlok = document.createElement("div");
    dersBlok.className = "ders-blok";

    dersBlok.innerHTML = `
        ${ogrenci}<br>
        <small>${ucret} ₺ / saat</small>
    `;

    dersBlok.dataset.ogrenci = ogrenci;
    dersBlok.dataset.ucret = ucret;
    dersBlok.dataset.gun = gun;
    dersBlok.dataset.baslangic = baslangic;
    dersBlok.dataset.sure = sure;

    dersBlok.style.left = (hucreRect.left - tabloRect.left) + "px";
    dersBlok.style.top = (hucreRect.top - tabloRect.top) + "px";
    dersBlok.style.width = hucreRect.width + "px";
    dersBlok.style.height = (hucreYukseklik * parcaSayisi) + "px";

    // 👉 ARTIK CONFIRM YOK
    dersBlok.onclick = function () {
        secimModalAc(this);
    };

    document.querySelector("table").appendChild(dersBlok);

const dersObj = {
    id: Date.now(),
    ogrenci,
    ucret,
    gun,
    baslangic,
    sure
};

dersBlok.dataset.id = dersObj.id;

dersler.push(dersObj);
localStorage.setItem("dersler", JSON.stringify(dersler));

}

/* =======================
   SEÇİM MODALI (Sil / Düzenle)
======================= */

function secimModalAc(blok) {
    aktifBlok = blok;
    document.getElementById("secimModalArka").style.display = "flex";
}

function secimKapat() {
    document.getElementById("secimModalArka").style.display = "none";
}

function secimSil() {
    if (!aktifBlok) return;

    const id = Number(aktifBlok.dataset.id);

    dersler = dersler.filter(d => d.id !== id);
    localStorage.setItem("dersler", JSON.stringify(dersler));

    aktifBlok.remove();
    secimKapat();
}

function secimDuzenle() {
    secimKapat();
    modalAc(aktifBlok);
}

/* =======================
   DÜZENLEME MODALI
======================= */

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

    const yeniOgrenci = document.getElementById("modalOgrenci").value;
    const yeniUcret = document.getElementById("modalUcret").value;

    if (!yeniOgrenci || !yeniUcret) {
        alert("Alanları doldurun");
        return;
    }

    aktifBlok.dataset.ogrenci = yeniOgrenci;
    aktifBlok.dataset.ucret = yeniUcret;

    const id = Number(aktifBlok.dataset.id);

    const ders = dersler.find(d => d.id === id);
    if (ders) {
        ders.ogrenci = yeniOgrenci;
        ders.ucret = yeniUcret;
    }

    localStorage.setItem("dersler", JSON.stringify(dersler));


    aktifBlok.innerHTML = `
        ${yeniOgrenci}<br>
        <small>${yeniUcret} ₺ / saat</small>
    `;

    modalKapat();
}

window.onload = function () {
    dersler.forEach(ders => {
        dersCiz(ders);
    });
};

function dersCiz(ders) {
    const ilkHucre = document.getElementById(`hucre-${ders.gun}-${ders.baslangic}`);
    if (!ilkHucre) return;

    const hucreRect = ilkHucre.getBoundingClientRect();
    const tabloRect = document.querySelector("table").getBoundingClientRect();

    const parcaSayisi = ders.sure / 0.5;
    const hucreYukseklik = ilkHucre.offsetHeight;

    const dersBlok = document.createElement("div");
    dersBlok.className = "ders-blok";

    dersBlok.innerHTML = `
        ${ders.ogrenci}<br>
        <small>${ders.ucret} ₺ / saat</small>
    `;

    dersBlok.dataset.id = ders.id;
    dersBlok.dataset.ogrenci = ders.ogrenci;
    dersBlok.dataset.ucret = ders.ucret;
    dersBlok.dataset.gun = ders.gun;
    dersBlok.dataset.baslangic = ders.baslangic;
    dersBlok.dataset.sure = ders.sure;

    dersBlok.style.left = (hucreRect.left - tabloRect.left) + "px";
    dersBlok.style.top = (hucreRect.top - tabloRect.top) + "px";
    dersBlok.style.width = hucreRect.width + "px";
    dersBlok.style.height = (hucreYukseklik * parcaSayisi) + "px";

    dersBlok.onclick = function () {
        secimModalAc(this);
    };

    document.querySelector("table").appendChild(dersBlok);
}

function sayfaGoster(sayfa) {
    document.getElementById("takvimSayfa").style.display =
        sayfa === "takvim" ? "block" : "none";

    document.getElementById("kazancSayfa").style.display =
        sayfa === "kazanc" ? "block" : "none";

    if (sayfa === "kazanc") {
        ogrencileriYukle();

        kazancTablosuCiz();
    }
}


function ogrencileriYukle() {
    const select = document.getElementById("kazancOgrenci");
    select.innerHTML = `<option value="">Öğrenci Seç</option>`;

    const dersler = JSON.parse(localStorage.getItem("dersler")) || [];
    const ogrenciler = [];

    dersler.forEach(d => {
        if (!ogrenciler.includes(d.ogrenci)) {
            ogrenciler.push(d.ogrenci);
        }
    });

    ogrenciler.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        select.appendChild(opt);
    });
}

function kazancEkle() {
    const ogrenci = document.getElementById("kazancOgrenci").value;
    const tarih = document.getElementById("kazancTarih").value;
    const sure = parseFloat(document.getElementById("kazancSure").value);

    if (!ogrenci || !tarih || !sure) {
        alert("Tüm alanları doldurun");
        return;
    }

    // Öğrencinin saatlik ücretini bul
    const dersler = JSON.parse(localStorage.getItem("dersler")) || [];
    const ders = dersler.find(d => d.ogrenci === ogrenci);

    if (!ders) {
        alert("Bu öğrenci için ücret bulunamadı");
        return;
    }

    const kayit = {
        id: Date.now(),
        ogrenci,
        tarih,
        sure,
        ucret: Number(ders.ucret)
    };

    const kayitlar = JSON.parse(localStorage.getItem("kazancKayitlari")) || [];
    kayitlar.push(kayit);
    localStorage.setItem("kazancKayitlari", JSON.stringify(kayitlar));

    kazancTablosuCiz();
}


function kazancTablosuCiz() {
    const yil = Number(document.getElementById("yilSecim").value);
    const kayitlar = JSON.parse(localStorage.getItem("kazancKayitlari")) || [];

    // 🔹 Aylar için toplam
    const aylikToplam = Array(12).fill(0);

    // 🔹 Öğrenci bazlı { ogrenci: [12 ay] }
    const ogrenciToplam = {};

    kayitlar.forEach(k => {
        const tarih = new Date(k.tarih);

        if (tarih.getFullYear() === yil) {
            const ay = tarih.getMonth();
            const tutar = k.sure * k.ucret;

            // Genel toplam
            aylikToplam[ay] += tutar;

            // Öğrenci bazlı
            if (!ogrenciToplam[k.ogrenci]) {
                ogrenciToplam[k.ogrenci] = Array(12).fill(0);
            }

            ogrenciToplam[k.ogrenci][ay] += tutar;
        }
    });

    const tbody = document.querySelector("#kazancTablo tbody");
    tbody.innerHTML = "";

    /* =====================
       🔹 GENEL TOPLAM SATIRI
    ===================== */
    const toplamSatir = document.createElement("tr");
    toplamSatir.innerHTML = "<th>Toplam</th>";

    aylikToplam.forEach(t => {
        toplamSatir.innerHTML += `<td><strong>${t.toFixed(2)} ₺</strong></td>`;
    });

    tbody.appendChild(toplamSatir);

    /* =====================
       🔹 ÖĞRENCİ SATIRLARI
    ===================== */
    Object.keys(ogrenciToplam).forEach(ogrenci => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${ogrenci}</td>`;

        ogrenciToplam[ogrenci].forEach(t => {
            tr.innerHTML += `<td>${t.toFixed(2)} ₺</td>`;
        });

        tbody.appendChild(tr);
    });
}

function ayDetayAc(ayIndex) {
    const yil = Number(document.getElementById("yilSecim").value);
    const kayitlar = JSON.parse(localStorage.getItem("kazancKayitlari")) || [];

    const ayKayitlari = kayitlar.filter(k => {
        const t = new Date(k.tarih);
        return t.getFullYear() === yil && t.getMonth() === ayIndex;
    });

    const ayAdlari = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                      "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

    document.getElementById("ayModalBaslik").innerText =
        `${ayAdlari[ayIndex]} ${yil} Ders Kayıtları`;

    const liste = document.getElementById("ayKayitListe");
    liste.innerHTML = "";

    if (ayKayitlari.length === 0) {
        liste.innerHTML = "<p>Bu ay için kayıt yok.</p>";
    }

    ayKayitlari.forEach((k, index) => {
        const div = document.createElement("div");
        div.className = "ay-kayit";

        div.innerHTML = `
            <input type="text" value="${k.ogrenci}"
               onchange="kayitGuncelle(${k.id}, 'ogrenci', this.value)">
            <input type="date" value="${k.tarih}"
               oonchange="kayitGuncelle(${k.id}, 'tarih', this.value)">
            <input type="number" step="0.5" value="${k.sure}"
               onchange="kayitGuncelle(${k.id}, 'sure', this.value)">
            <strong>${(k.sure * k.ucret).toFixed(2)} ₺</strong>
            <button onclick="kayitSil(${k.id})">🗑️</button>
        `;

        document.getElementById("ayKayitListe").appendChild(div);
    });



    document.getElementById("ayModalArka").style.display = "flex";
}

function kayitSil(id) {
    if (!confirm("Bu kaydı silmek istiyor musun?")) return;

    let kayitlar = JSON.parse(localStorage.getItem("kazancKayitlari")) || [];
    
    // ID'si eşleşmeyenleri tut, eşleşeni listeden at
    kayitlar = kayitlar.filter(k => k.id !== id);

    localStorage.setItem("kazancKayitlari", JSON.stringify(kayitlar));

    kazancTablosuCiz();
    ayModalKapat(); // Pencereyi kapatıp güncel halini görmeyi sağlar
}

function kayitGuncelle(id, alan, deger) {
    const kayitlar = JSON.parse(localStorage.getItem("kazancKayitlari")) || [];
    
    // İlgili kaydı bul ve güncelle
    const kayit = kayitlar.find(k => k.id === id);
    if (kayit) {
        kayit[alan] = (alan === "sure" || alan === "ucret") ? Number(deger) : deger;
        localStorage.setItem("kazancKayitlari", JSON.stringify(kayitlar));
        kazancTablosuCiz();
    }
}

function ayModalKapat() {
    document.getElementById("ayModalArka").style.display = "none";
}

