# CLAUDE.md

e-bebek (www.e-bebek.com) icin JavaScript + Playwright + Cucumber (BDD) + Allure test otomasyon projesi.
Testler gercek siteye karsi kosar; login gerektiren senaryolar `@auth` etiketlidir ve kimlik bilgisi yoksa otomatik skip edilir.

## Dizin yapisi ve katmanlar

```
features/                  Gherkin senaryolari (*.feature) — is dilinde, selector/kod icermez
features/step_definitions/ Step tanimlari (*.steps.js) — ince katman, World uzerindeki page objelere delege eder
features/support/          CustomWorld.js (World), hooks.js (browser/context yasam dongusu), debugCapture.js (fail kanit toplama)
pages/                     Page Object'ler — BasePage'den extend; aksiyonlar + assertion'lar burada
locators/                  *.locators.js — saf CSS selector string'leri export eden moduller
config/                    env.js (.env.<ENV> okur), routes.js (sayfa path'leri)
fixtures/                  testData.js — test verisi ve uretec fonksiyonlar
utils/                     price.js gibi saf yardimcilar (TR fiyat formati parse)
api/                       authApi.js — OAuth token ile API login (UI'siz oturum kurulumu)
reports/                   allure-results, junit, traces (gitignore'da; her kosuda temizlenir)
debug/                     Fail aninda otomatik kanit klasorleri (gitignore'da — asagida "Debug & Fix Sistemi")
```

### Katman sorumluluklari

- **feature**: Sadece is dili. Yeni adim eklerken once `generic.steps.js`'teki hazir adimlara bak
  (`the user navigates to the {string} page`, `the {string} element is clicked`, `the text {string} should be visible`...).
- **step definition**: Assertion, locator ve `this.page` erisimi ICERMEZ; page object metotlarina delege eder.
  Tek sayfaya ait adimlar tek satirdir (`await this.cart.verifyTotalsConsistent()`).
  Birden fazla sayfaya dokunan adimlar (or. arama -> urun -> sepet) page object'leri sirayla burada surer ve
  sonucu `this.data`'ya yazar; **kompozisyonun yeri step'tir** — bunun icin ayri bir flow/akis katmani ACILMAZ.
  Assertion'da dongu kurmak yerine page object'e dizi alan metot eklenir (`cart.verifyItemsVisible(names)`).
  Ayni govdeye sahip ikinci bir step tanimi yazmak yasak; mevcut adim metnini feature dosyasinda tekrar kullan.
- **page object**: `BasePage`'den extend, constructor'da `page` alir; **sadece kendi** `locators/<sayfa>.locators.js`
  dosyasini (gerekirse `common.locators.js`) tanir. Baska page object'i require ETMEZ — birden fazla sayfayi
  ilgilendiren sira step'te kurulur, sayfa nesnesi durumsuzdur (senaryo verisi World'de durur).
  Bolum yorumlari konvansiyonu: `// --- Actions ---`, `// --- Queries ---`, `// --- Validations ---`.
  Assertion'lar dogrudan `expect` ile degil, `BasePage`'in dinamik validation metotlariyla ve anlamli hata mesajiyla
  yazilir: `verifyVisibility`, `verifyHidden`, `verifyLocatorCountInDOM`, `verifyTextVisibility`,
  `verifyUrlContains` (duz metin arar, regex DEGIL), `verifyUrlPath` (tam sayfa kimligi: `pathname` esitligi,
  query string'i yok sayar) (timeout tek yerde: `ASSERT_TIMEOUT_MS`). URL dogrulamalarinda regex kullanilmaz.
  Bunlarin selector alan her varyantinin locator alan bir esi vardir — filtrelenmis/kapsamli locator'larda
  (`items().filter(...)` gibi) ham `expect` yerine bunlar kullanilir: `verifyLocatorVisibility`,
  `verifyLocatorHidden`, `verifyLocatorCount`, `verifyLocatorText`. Hepsi opsiyonel `timeout` parametresi alir.
  Ortam/fixture verisini tek sayfaya ait akislarda page object'in kendisi okur (or. `LoginPage.loginWithValidCredentials`
  `config`'i, `attemptLoginWithWrongPassword` `testData`'yi okur); cok sayfali adimlarda fixture'i step gecirir.
- **locators**: Her sayfanin selectorlari kendi `locators/<sayfa>.locators.js` dosyasinda duz obje olarak durur.
  `locators/generic.locators.js` insan-okur isim -> selector haritasidir; `CommonPage` generic adimlar icin bunu kullanir.
  `common.locators.js` her sayfada bulunan elemanlardir: cookie banner + header (arama kutusu, mini-cart badge,
  login/sign-out linkleri). Header'daki arama bu yuzden `CommonPage.search(term)`'dedir, ana sayfaya ozel degildir.

### World / page erisimi

Step'ler Playwright page'e **World uzerinden** erisir: `this.page`, `this.context` ve `initPages()`'in kurdugu
`this.common`, `this.home`, `this.login`, `this.results`, `this.product`, `this.cart`.
Adimlar arasi veri `this.data` uzerinde tasinir (or. `this.data.addedProducts`, `this.data.noResultTerm`) —
case study'nin S5 icin istedigi "senaryo baglami (World/context)" kullanimi budur.
Hook duzeni (`features/support/hooks.js`): `BeforeAll` worker basina tek browser launch eder; `Before` her senaryoya
temiz `context` + `page` acar ve tracing baslatir; `After` fail'de screenshot + trace'i Allure'a attach edip context'i kapatir.
`@auth` etiketli senaryolar kimlik bilgisi yoksa (`config.hasCredentials`) `Before`'da skip edilir.

## Testleri kosma

```bash
npm test                        # tum suite (once reports/ temizlenir)
npm run test:smoke              # @smoke      (test:regression, test:negative, test:noauth benzer)
npx cucumber-js features/search.feature            # tek feature
npx cucumber-js --name "senaryo adi parcasi"       # tek senaryo
npm run report                  # Allure raporu uret + ac
```

Ortam: `ENV` (varsayilan `test`) hangi `.env.<ENV>` dosyasinin okunacagini secer.
Onemli degiskenler: `BASE_URL`, `BROWSER` (chromium|firefox|webkit), `HEADLESS`, `PARALLEL_WORKERS` (varsayilan **2** — paralel!),
`DEFAULT_TIMEOUT_MS`, `EBEBEK_EMAIL`/`EBEBEK_PASSWORD` (@auth icin).

**Claude icin:** koslari her zaman `HEADLESS=true` ile yap (varsayilan headed degil ama .env dosyasi degistirebilir; garanti ol).
Tek senaryo dogrularken `PARALLEL_WORKERS=1` kullan.

## Konvansiyonlar (koddan gozlemlenen)

- CommonJS (`require`/`module.exports`); class tabanli page object'ler.
- Locator stili: kisa CSS selector string'leri (`'.product-item'`, `'h1'`); XPath yok. Rol/metin bazli arama gerektiginde
  page object icinde `getByText`/`filter({ hasText })` kullanilir.
- Dosya adlari: `<konu>.feature`, `<konu>.steps.js`, `<sayfa>.locators.js`, `PascalCase` page class'lari.
- Turkce metin karsilastirmalari `toLocaleLowerCase('tr-TR')` ile normalize edilir; fiyatlar `utils/price.js` ile parse edilir.
- Overlay/cookie banner'lari `BasePage.dismissOverlays()` best-effort kapatir; yeni sayfa acilislarinda `open()` kullan.
- Rastgele/degisken test verisi `fixtures/testData.js`'te uretec fonksiyon olarak tanimlanir.

## Dogrulama ilkesi

**URL kontrolu tek basina dogrulama sayilmaz.** Her validation, testin amacini kanitlayan **unique bir elementin
visibility'sini** de kontrol etmelidir (or. sifre adimi `eb-login-password`, korumali profil sayfasi
`#btnEditPersonalInfo`); URL kontrolu bunun yaninda ek kanittir. Generic `the page URL should contain {string}`
adimi parametrik oldugu icin elementi bilemez — feature dosyasinda daima bir element adimiyla eslenir
(or. `And the "register form" element should be visible`).
Gizli ama DOM'da olan elemanlar (or. hover ile acilan My Account menusundeki `#lnkSignOutNavNode`) visibility ile
degil `verifyLocatorCountInDOM` ile dogrulanir.

## Locator ilkesi

Yeni bir element/locator gerektiginde **tahmin etme**: Playwright MCP ile canli sayfayi acip selector'u gercek DOM'dan
dogrula, sonra ilgili `locators/*.locators.js` dosyasina ekle. Calisan mevcut locator'lari "iyilestirme" amacli degistirme.

## Debug & Fix Sistemi

- Bir Gherkin adimi FAIL oldugunda `features/support/debugCapture.js` o anin tum kanitini
  `debug/<SenaryoAdi>-w<worker>-<timestamp>/` klasorune yazar: `error.txt` (patlayan adim, step definition konumu,
  mesaj+stack), `errors.raw.json`, `snapshot.yaml` (aria snapshot; sayfa oldeyse son bilinen duruma duser),
  `screenshot.png`, `url.txt`, `console.txt` (son 100 satir console/pageerror/requestfailed).
  Capture tamamen best-effort'tur; kosuyu asla bozmaz.
- `/debugfix` skill'i (`.claude/commands/debugfix.md`) bu klasorleri **tamamen offline** (browser/MCP/kosum yok) okur,
  net locator/beklenti uyusmazliklarini duzeltir, cozdugu bug'in klasorunu `fixedBugs/` altina tasiyip `fix-log.txt` yazar;
  emin olamadiklarini atlar, gercek uygulama bug'i suphelilerini Jira raporu taslagiyla isaretler (test kirmizi kalir).
- `debug/` ve `fixedBugs/` gitignore'dadir.
