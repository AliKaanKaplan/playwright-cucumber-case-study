---
description: debug/ altindaki fail kanitlarini offline okuyup net test hatalarini duzeltir; suphelileri raporlar
---

# /debugfix — Offline Bug Cozucu

`debug/` klasorundeki fail kanitlarini okuyarak test hatalarini duzeltirsin.

**Mod: TAMAMEN OFFLINE.** Asla Playwright MCP, browser, navigation veya test kosumu yok — sadece dosya oku + edit.
Kanit = bug klasorundeki dosyalar; dogrulama kaynagi = proje kaynak kodu.

## Proje mimarisi (fix'lerin hedefi)

- `features/*.feature` — Gherkin senaryolari (is dili)
- `features/step_definitions/*.steps.js` — step tanimlari (World'e delege eder)
- `pages/*.js` — page object'ler (aksiyon + assertion; `BasePage`'den extend)
- `locators/*.locators.js` — CSS selector modulleri (`search.locators.js`, `cart.locators.js`, `login.locators.js`, `product.locators.js` sayfaya ozeldir)
- **Ortak/jenerik katman — DOKUNMA:** `pages/BasePage.js`, `pages/CommonPage.js`, `locators/common.locators.js`, `locators/generic.locators.js`, `features/step_definitions/generic.steps.js`, `features/support/`, `config/`, `utils/`, `fixtures/`, `api/`

## Akis

1. `debug/` klasorunu tara. Her alt klasor bir bug'dir (`.markers` gibi gizli/nokta ile baslayan klasorleri atla). Eskiden yeniye sirala, tek tek isle.
2. Bug yoksa: "debug/ klasorunde islenecek bug yok" de ve dur.
3. `fixedBugs/` yoksa olustur. Birden fazla bug varsa todo listesiyle sirayla ilerle.
4. Her bug icin:
   a. Klasordeki `error.txt`, `errors.raw.json`, `snapshot.yaml`, `url.txt`, `console.txt` dosyalarini oku. Emin olamazsan `screenshot.png`'ye de bak.
   b. `error.txt`'teki step definition konumundan hatali kaynak dosyayi ac — sadece hatali satiri degil, fonksiyonun/step'in tamamini + 10-20 satir context'i oku. Step bir page object'e delege ediyorsa o page object'i ve kullandigi `locators/*.locators.js` dosyasini da oku.
   c. Hatayi asagidaki UC KATEGORIDEN birine sok ve kategoriye gore eylemi uygula.

## Kategoriler

### A) COZEBILECEGIN tipler (snapshot/screenshot'ta NET tek karsiligi olan)

- **Locator name mismatch:** kod "X" ariyor, snapshot'ta ayni role'de "Y" var.
- **Locator role mismatch:** kod button ariyor, ayni erisilebilir isim link rolunde (or. snapshot'ta heading farkli seviyede: kod `h3` ariyor, metin `[level=1]` heading'de).
- **URL/regex beklenti mismatch:** beklenen URL deseni `url.txt`'tekiyle uyusmuyor ve dogrusu net.
- **Strict mode / coklu eslesme:** `{ exact: true }` veya `.first()`/`.last()` ile cozuluyor ve snapshot'tan hangisi oldugu net.
- **Statik UI etiketi mismatch:** hardcoded bir arayuz etiketi (kolon basligi, sekme, buton metni) yeniden adlandirilmis — is sonucunu temsil etmiyor.

> ⚠️ Beklenen-SONUC assertion'larini A'ya SOKMA: durum/state metni ("Onaylandi"/"Reddedildi"), onay-ret sonucu, hesaplanan tutar/adet gibi beklentiler C adayidir.

### B) COZEMEYECEGIN tipler (dokunma, atla, raporla)

- Snapshot beklenen sayfada degil (onceki adimda sessiz hata; kok neden belirsiz).
- Race/timing suphesi: element hic yok ama yuklenmesi bekleniyordu.
- Form validation patlamasi (girilen degerlerin dogrulugu belirsiz).
- Console'da nedeni belirsiz JS exception.
- Birden fazla muhtemel fix var, tek dogru cikmiyor.
- Fix ortak/jenerik katmanda degisiklik gerektiriyor (yan etki riski).
- Aranan elementin snapshot'ta benzeri bile yok.
- Bir A fix'inden %80 emin degilsen → B.

### C) MUHTEMEL GERCEK UYGULAMA BUG'I (duzeltme ama "atladim" da deme — ozel isaretle)

Test bir **is sonucunu** doğruluyor ve sayfa anlamca zit/yanlis sonucu gosteriyor (test "reddedilmeli" diyor, sayfa "Onaylandi"); beklenen deger senaryonun amacini tasiyor (feature/senaryo adinda geciyor) ve gercek deger bunu curutuyor; hesaplanan is ciktisi yanlis; is kurali geregi olmasi gereken element/rozet yok.

**Ayrim kurali:** "Sayfadaki ETIKET mi degismis (→ A), akisin SONUCU mu beklenenden farkli (→ C)?" Emin degilsen → C. Beklentiyi sayfaya uydurmak gercek bug'i MASKELER — buna asla izin verme; "dogru" olan testteki beklentidir.

## Kategoriye gore eylem

### A: Fix'i uygula

- **Izinli dosyalar:** hatanin oldugu `features/step_definitions/*.steps.js` dosyasi, ilgili `pages/*.js` page object'i ve o sayfaya ozel `locators/*.locators.js` dosyasi.
- `features/*.feature` dosyasinda YALNIZCA yerinde beklenen-deger/metin duzeltmesi yapilabilir; **senaryo/adim ekleme, silme, yeniden siralama KESINLIKLE YASAK.**
- Ortak/jenerik katmana dokunma (gerekirse → B).
- Sonra bug klasorunu `fixedBugs/<ayni ad>/` altina **TASI** (kopyalama degil; `mv`/`Move-Item`) ve icine `fix-log.txt` yaz:
  bug adi, tarih, senaryo, orijinal hata, hatali dosya:satir, Tespit (snapshot'ta ne gordun, kod ne ariyordu),
  ONCE/SONRA kod satirlari, Gerekce, Kanit kaynaklari (snapshot.yaml hangi satir, url.txt, console.txt).

### B: Hicbir seye dokunma

Klasor yerinde kalir; raporda nedenini (B alt-tipi) ve onerilen sonraki adimi yaz.

### C: Koda KESINLIKLE dokunma

Klasor yerinde kalir. Icine iki dosya yaz:

1. `debugfix-suspected-bug.txt` — testin ne bekledigi, sayfanin ne gosterdigi, neden test hatasi degil uygulama kusuru suphesi oldugu (snapshot kanitiyla), "bu test kirmizi kalmali" uyarisi.
2. `jira-bug-raporu.txt` — Jira'ya kopyala-yapistir edilebilecek kisa rapor: tek cumle ozet, ortam (`config/env.js` + `.env.example`'dan; `url.txt`'teki ortam), kullanilan kullanici/rol (projenin config/fixture'larindan offline bulabiliyorsan e-postasiyla), yeniden uretim adimlari (feature'daki Gherkin adimlarindan is diliyle, selector/kod YOK), beklenen vs. gerceklesen sonuc, kanit.

## Kritik kurallar

- Asla MCP/browser/kosum yapma; sadece dosya oku + edit.
- Her bug'i izole isle; cozulen klasor tasindigi icin sonraki cagrida gorunmez.
- Klasor adlarinda Turkce/ozel karakter olabilir — tasima komutlarinda tirnakla.
- Cozemedigine bulasma; supheli edit deneme.
- Yanlis fix, fix'sizlikten kotudur; gercek bug'i maskelemek hepsinden kotudur.

## Rapor formati (islem sonunda tek markdown)

Basta ozet sayilar: "X bug — ✅ N cozuldu, ⏸️ M atlandi, 🐞 K muhtemel gercek bug". Sonra uc bolum:

- **✅ Cozulen Bug'lar** — test, hata, tespit, fix dosya:satir once→sonra, tasindigi yer.
- **⏸️ Atlanan Bug'lar** — hata, B alt-tipi, neden, onerilen adim.
- **🐞 Muhtemel Gercek Uygulama Bug'lari — test kirmizi KALMALI** — test ne bekliyordu, sayfada ne var, neden suphe, not+jira dosya yollari.

En sonda 3-4 cumle genel ozet.
