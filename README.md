# e-bebek Web Test Otomasyonu — ErikLabs QA Case Study

<!-- KULLANICI/REPO kismini kendi GitHub kullanici adiniz ve repo adinizla degistirin. -->
[![E2E Tests](https://github.com/KULLANICI/REPO/actions/workflows/e2e.yml/badge.svg)](https://github.com/KULLANICI/REPO/actions/workflows/e2e.yml)

📊 **[Son koşumun Allure raporu →](https://KULLANICI.github.io/REPO/)** (her gecelik koşumda otomatik güncellenir)

**JavaScript + Playwright + Cucumber (BDD) + Allure Reporter** ile [e-bebek.com](https://www.e-bebek.com) üzerinde uçtan uca test otomasyonu. Page Object Pattern ile yapılandırılmıştır; senaryolar generic (hazır) step kütüphanesini azami ölçüde yeniden kullanır.

## Zorunlu Senaryolar (S1–S6) Haritası

| Case | Nerede | Doğrulamanın dayanağı |
|---|---|---|
| **S1** Giriş | `features/login.feature` → *S1 - Successful login with valid credentials* | Giriş sonrası kullanıcıya özgü element: korumalı profil sayfasında `#btnEditPersonalInfo` |
| **S2** Negatif login | `features/login.feature` → **Scenario Outline (4 satır)** + 2 ayrı senaryo | Her satırda sitenin bastığı doğrulama mesajı assert edilir |
| **S3** Arama | `features/search.feature` (2 senaryo) | Sonuçlu: ürün adları terimle ilişkili; sonuçsuz: başlıkta terim + hiçbir üründe gerçek eşleşme yok |
| **S4** Sepet | `features/cart.feature` | Fiyatlar sayıya parse edilir; iki denklem her değişimden sonra yeniden doğrulanır |
| **S5** Oturum devamlılığı | `features/session.feature` | Misafir sepeti → login → sepet korunuyor; adımlar arası veri `World` (`this.data`) üzerinde |
| **S6** Çıkış | `features/logout.feature` | Oturum gerektiren sayfa `/login`'e düşer + misafir formu görünür |

**S2 neden tek bir Scenario Outline değil?** Parametrik tablo, tetiklenme biçimi aynı olan durumları
kapsar — alan doldur → gönder → **doğrulama mesajını gör**: geçersiz e-posta formatı, boş e-posta alanı,
boş telefon alanı, kısa telefon numarası (4 satır). Case'in saydığı diğer iki durum aynı tabloya
girmiyor, çünkü çıktıları farklı türde:

- **Kayıtlı olmayan e-posta** hata mesajı üretmez; site kullanıcıyı register sayfasına yönlendirir.
  Assert edilecek şey mesaj değil yönlendirmedir, o yüzden ayrı senaryodur.
- **Hatalı şifre** iki adımlı login'in ikinci adımında oluşur ve **gerçek bir hesap gerektirir**
  (`@auth`). Aynı tabloya konsaydı, credential olmayan bir ortamda tablonun tamamı skip olur ve
  hesap gerektirmeyen 4 negatif durum da koşmadan geçilirdi.

## Kurulum

```bash
npm install
npx playwright install    # chromium + firefox + webkit (tek tarayıcı için: npx playwright install chromium)
cp .env.example .env.test # ortam dosyasını oluştur
npm test
```

Ortam dosyaları (`.env.test`, `.env.demo`) **repoda yer almaz** — kimlik bilgisi içerdikleri için `.gitignore`'dadır. Şablon olarak `.env.example` takip edilir; kopyalayıp doldurmak yeterlidir.

`EBEBEK_EMAIL` / `EBEBEK_PASSWORD` **boş bırakılabilir**: bu durumda `@auth` etiketli senaryolar fail olmaz, `features/support/hooks.js` tarafından otomatik **SKIP** edilir ve hesap gerektirmeyen senaryolar sorunsuz koşar. Kendi hesabınızı girerseniz tüm suite çalışır; giriş e-posta + şifre ile UI üzerinden yapılır (OTP gerekmez).

## Çalıştırma

```bash
npm test                  # tüm suite, 2 worker ile PARALEL (varsayılan: .env.test)
npm run test:demo         # aynı suite, .env.demo ortamıyla
npm run test:smoke        # yalnızca @smoke
npm run test:regression   # yalnızca @regression
npm run test:negative     # yalnızca @negative
npm run test:noauth       # hesap gerektirmeyen senaryolar
npm run test:firefox      # firefox'ta koş (chromium/webkit için de var)
npm run clean             # önceki koşumun çıktılarını (reports/) siler

# Raporlama
npm run report            # Allure raporunu üretir ve tarayıcıda açar
npm run report:generate   # yalnızca üretir (reports/allure-report/)
```

Her `npm test` (ve varyantları) **önce `clean` çalıştırır** (`rimraf reports`); böylece rapor yalnızca son koşumu yansıtır, eski sonuçlar karışmaz. Paralellik `PARALLEL_WORKERS` (varsayılan **2**), görünür tarayıcı için `HEADLESS=false`. Bu değerler seçilen ortam dosyasından okunur; komut satırından verilen değer dosyayı **yener** (örn. `HEADLESS=true npm test`).

## Çok Ortamlı Konfigürasyon

Ortam `ENV` ile seçilir (verilmezse `test`) ve o ortamın dosyası (`.env.<ortam>`) yüklenir:

| Komut | Yüklenen dosya |
|---|---|
| `npm test` | `.env.test` |
| `npm run test:demo` | `.env.demo` |

Yeni bir ortam eklemek için `.env.<ad>` dosyası oluşturup `ENV=<ad> npm test` demek yeterlidir.

Bu dosyalar repoda tutulmaz; `.env.example` şablonundan üretilir. Kodda hard-coded URL/credential yoktur; tüm ortam parametreleri `config/env.js` üzerinden tek noktadan okunur, rota yolları ise `config/routes.js`'te toplanır. CI'da aynı değerler GitHub Secrets üzerinden geçilir.

## Tarayıcı Seçimi (parametre-güdümlü)

Tarayıcı `BROWSER` değişkeniyle seçilir (`chromium` | `firefox` | `webkit`; varsayılan `chromium`). `hooks.js` seçime göre ilgili Playwright launcher'ını başlatır. Öncelik: **`.env` dosyası varsayılanı → shell/CI env değişkeni ezer** (dotenv mevcut env'i ezmez).

```bash
npm test                       # .env.test'teki BROWSER (chromium)
cross-env BROWSER=firefox npm test   # firefox — veya: npm run test:firefox
```

**CI'da (GitHub Actions):** Actions → *Run workflow* → **browser** dropdown'ından seç → yalnızca o tarayıcı koşar (matrix değil; senin seçtiğin tek tarayıcı). Gecelik otomatik koşum `chromium`'a düşer.

## Klasör Yapısı

```
features/
  *.feature             Gherkin senaryoları (S1–S6)
  step_definitions/     Step tanımları (generic + alana özgü, DRY)
  support/              World (CustomWorld) + hooks (Cucumber-Playwright + Allure)
pages/                  Page Object'ler (BasePage + CommonPage + sayfa nesneleri)
locators/               Sayfa başına locator modülleri (her locator tek yerde)
config/                 env.js (ortam okuma) + routes.js (rota sabitleri)
utils/                  Fiyat parser
fixtures/               Test verisi (dinamik üreticiler dahil)
api/                    OAuth login istemcisi (B1 — API + UI hibrit)
reports/                Üretilen çıktılar: allure-results / allure-report / traces (gitignore)
```

### Page Object mimarisi
Her page object tek bir sınıftır ve içi bölümlere ayrılır: **Actions** (yap), **Queries** (durumu oku), **Validations** (`verify*` — doğrula). Generic step'lerin arkasındaki ortak UI aksiyonları ve doğrulamaları `CommonPage`'te toplanır; step tanımları yalnızca bu metotlara delege eder, `click/fill/expect` gibi Playwright detayları step dosyalarına sızmaz.

### Locator stratejisi
Selector'lar **`locators/`** altında sayfa başına modüllerde tanımlıdır (`cart.locators.js`, `login.locators.js`…); her locator'ın projede tek tanımı vardır. Page object'ler kendi modülünü, generic step'lerin isim kayıt defteri (`locators/generic.locators.js`) de aynı modülleri kullanır — kopya tanım yoktur. Site Angular/SAP Spartacus tabanlı olduğu için `id` (`#txtSearchBox`, `#txtEmail`), anlamlı component etiketleri (`eb-cart-item`, `eb-mini-cart`) ve kararlı sınıflar tercih edildi; XPath zinciri kullanılmadı. Öneri carousel'lerinde tekrar eden `#addToCartBtn` id'si `:not(.btn-add-circle)` ile ayrıştırıldı.

## Test İzolasyonu (paralel koşum tasarımı)

- Cucumber **2 worker** ile koşar; her worker ayrı bir process'tir ve `BeforeAll` ile kendi browser instance'ını açar.
- **Her senaryo `Before` hook'unda sıfırdan bir `BrowserContext`** (bağımsız cookie/localStorage/oturum) ve yeni bir `Page` alır; `After` hook'unda context kapatılır. Böylece senaryolar arasında oturum/sepet/veri sızıntısı olmaz — misafir sepeti senaryosu ile login senaryosu aynı anda koşabilir.
- Senaryolar arası paylaşılan mutable durum yoktur; adımlar arası veri (örn. sepete eklenen ürün adları) senaryoya özel `World` (`CustomWorld`) nesnesinde taşınır.
- Test verisi çakışması yoktur: ürünler koşum anında arama sonuçlarından dinamik seçilir, sonuçsuz arama terimi her koşumda benzersiz üretilir (`fixtures/testData.js`).

## Bekleme Stratejisi ve Çözülen Flaky Durumlar

`sleep`/`waitForTimeout` **hiç kullanılmadı**. Tüm beklemeler koşul tabanlıdır: Playwright auto-wait, web-first `expect` (`toBeVisible`, `toHaveText`), `expect.poll` ve `expect(...).toPass` polling'i.

Çözülen gerçek flaky durumlar:

1. **"Sepete Ekle" tıklamasının sessizce kaybolması:** Angular hydration nedeniyle buton görünür olduğu hâlde click handler'ı geç bağlanabiliyor; tıklama kayboluyor ve ürün eklenmiyor. Çözüm: `ProductPage.addToCart` — tıkla → mini-sepet rozetinin artmasını `expect.poll` ile bekle → artmadıysa tıklamayı tekrarla (en fazla 3 deneme). Sabit bekleme yok; doğrulama sinyali UI'ın kendisi.
2. **Çerez banner'ı ve overlay'ler:** Banner asenkron ve her oturumda gelmiyor. `BasePage.dismissOverlays()` kısa timeout'lu koşul bekler; banner geldiyse kapatır, gelmediyse akışı bloklamaz.
3. **Arama overlay'inde Enter'ın router'a ulaşmaması:** Headless koşumda Enter bazen navigasyon tetiklemiyor. Çözüm: Enter sonrası URL değişimi koşullu beklenir; gerçekleşmezse aynı aramanın kanonik adresi olan `/search?text=...` üzerinden devam edilir (davranışsal sonuç aynı, senaryo deterministik).
4. **Sepet özetinin asenkron güncellenmesi:** Adet artırma/silme sonrası özet rakamları gecikmeli güncellenir. Ara toplam doğrulaması `expect(...).toPass` ile "tutarlı hâle gelene kadar" polling yapar.
5. **Header'ın iki farklı varyantı (oturum doğrulaması):** Giriş yapılmış durumda e-bebek header'ı bazen hover ile açılan "Hesabım" menüsünü nav node'larıyla (`#lnkSignOutNavNode`, `#lnkOrderHistoryNavNode`) basıyor, bazen bu node'ları hiç render etmeyip yerine tek bir "Hesabım" linki koyuyor — aynı hesap, aynı akış, farklı DOM. Oturum doğrulaması bu node'ların DOM'da bulunmasına dayandığı sürece senaryolar koşuma göre yeşil/kırmızı oynuyordu: fail anında `debug/` altına düşen aria snapshot'ta kullanıcı **giriş yapmış** olduğu hâlde (header'da `/my-account/update-profile` hedefli "Hesabım" linki var) sign-out node'u DOM'da yoktu. Bekleme süresini artırmak çözmez, çünkü sorun zamanlama değil markup farkı. Çözüm: header markup'ına hiç bakmamak; oturumun kanıtı olarak **oturum gerektiren sayfaya erişim** kullanılır — `/my-account/update-profile` açılır, URL'in korunduğu doğrulanır ve sayfanın kendi unique elementi (`#btnEditPersonalInfo`) görünür olmalıdır. Çıkışta ise aynı adresin `/login`'e düşmesi ve misafir login formunun (`eb-login-username`) görünmesi beklenir. Doğrulama böylece varyanttan bağımsız ve senaryonun amacına (oturumun gerçekliği) doğrudan bağlı hâle geldi.

## Sepet Ara Toplam Doğrulaması (S4)

Fiyat metinleri (`"1.999,98 TL"`) `utils/price.js` ile **para birimi ve binlik/ondalık ayraçları parse edilerek sayıya** çevrilir; karşılaştırmalar kuruş toleransıyla sayısaldır (metin eşitliği değildir). Doğrulanan denklemler:

1. `Ürünler Toplamı = Σ(satır liste tutarı)` — e-bebek sepet satırında birim fiyat değil **satır toplamı** gösterir (adet 2 → `1.999,98 TL`); denklem buna göre kurulur.
2. `Toplam = Ürünler Toplamı − Toplam İndirim + Kargo`.

Bu iki denklem sepetin her değişiminden sonra (ekleme, adet artırma, silme) `CartPage.verifyTotalsConsistent` ile yeniden doğrulanır; özet asenkron güncellendiği için kontrol `toPass` ile "tutarlı hâle gelene kadar" tekrarlanır.

## Site Davranışına Dair Keşif Notları (senaryo tasarımını etkileyenler)

- **Login iki adımlıdır** (Telefon/E-posta sekmeleri): e-posta girilir; kayıtlı hesapsa şifre adımı açılır (şifre adımının submit butonu `btn-login-password`, e-posta adımınınkinden farklıdır), **kayıtsız e-posta register sayfasına yönlendirilir**. Bu yüzden "kayıtlı olmayan e-posta" senaryosu hata mesajı yerine register yönlendirmesini assert eder (sitenin gerçek davranışı).
- **Sonuçsuz aramada** e-bebek ayrı bir "sonuç bulunamadı" mesajı basmaz; aranan terimi başlıkta gösterip öneri ürünlerine düşer. Senaryo işlevsel eşdeğeri doğrular: başlık aranan terimi gösterir **ve** listelenen hiçbir ürün adı terimi içermez (gerçek eşleşme yok).
- **Çıkış** SAP Commerce'in standart `/logout` rotası ile yapılır; oturumun *gerçekten* bittiği, oturum gerektiren `/my-account/update-profile` isteğinin `/login`'e yönlendirilmesiyle (misafir durumuna dönüş) kanıtlanır — yalnızca butona tıklamak yeterli sayılmaz.

## Allure Raporu

- Adım açıklamaları Gherkin adımlarından, feature açıklamaları `.feature` dosyalarından gelir; **environment bilgisi** (aktif ortam, base URL, browser, worker sayısı, OS) rapora eklenir.
- **Başarısız senaryolarda ekran görüntüsü + son URL + Playwright trace (zip)** `After` hook'unda otomatik olarak rapora iliştirilir. Trace dosyaları `reports/traces/` altında **senaryo adıyla** kaydedilir (ör. `S4_Add_to_cart_increase_quantity_remove_and_verify_totals.zip`); `npx playwright show-trace <dosya>` ile açılabilir (artı puan kapsamındaki video/trace maddesi).
- Konsol formatter'ı `progress` (paralel-güvenli); Allure reporter'a dosya hedefi verilir ki stdout'u kapıp konsol çıktısını susturmasın.

## CI ve Raporlama

Üretilen çıktılar (`reports/`) **repoda tutulmaz** — build artefaktıdır, `.gitignore`'dadır. Bunun yerine CI'da üretilip iki yerde yaşarlar:

| Çıktı | Nerede | Ne kadar |
|---|---|---|
| Ham sonuçlar (`allure-results`) | Actions artifact | 14 gün |
| Trace zip'leri (yalnızca fail'de) | Actions artifact | 14 gün |
| Allure HTML raporu | GitHub Pages (`gh-pages` branch) | Kalıcı, her koşumda güncellenir |
| Koşu özeti (JUnit XML) | Actions koşu sayfasında check olarak | Koşu ile birlikte |

**Neden Pages?** Allure raporu verisini `widgets/*.json` dosyalarından `fetch` ile çeker; tarayıcılar bunu `file://` protokolünde CORS gereği engeller. Yani raporu indirip `index.html`'e çift tıklamak **boş sayfa** verir — rapor mutlaka HTTP üzerinden servis edilmelidir. Lokalde `npm run report` bunu yerel bir sunucu açarak yapar, CI'da ise Pages üstlenir.

**Neden history taşınıyor?** Tek koşumun raporu "şu an ne durumda"yı söyler; asıl değerli olan trenddir. `report` job'ı yeni raporu üretmeden önce `gh-pages` üzerindeki bir önceki raporun `history/` klasörünü yeni sonuçların içine kopyalar. Bu yapılmazsa Allure'un **Trend** ve **Retries** sekmeleri her koşumda boş doğar.

**Neden trace sadece fail'de?** Trace/video çıktıları hızla gigabaytlara çıkar. `features/support/hooks.js` içindeki `tracing.stop({ path: failed ? tracePath : undefined })` geçen senaryolarda kaydı diske hiç yazmaz — Playwright'ın `retain-on-failure` davranışının elle uygulanmış hâli.

**Neden push'ta koşmuyor?** Suite canlı bir üçüncü taraf siteye (e-bebek) bağlı. Her push'ta koşmak, site kaynaklı geçici bir dalgalanmada badge'i kırmızıya düşürür. Bu yüzden gecelik (`cron`) + manuel (`workflow_dispatch`) tetikleniyor — canlı siteye karşı koşan E2E suite'lerinde yaygın bir tercih.

### Kurulum adımları (repo sahibi için)

1. **Secrets:** Settings → Secrets and variables → Actions → `EBEBEK_EMAIL` ve `EBEBEK_PASSWORD` ekleyin. (Eklenmezse `@auth` senaryoları SKIP olur, koşum yine yeşil kalır.)
2. **Pages:** İlk workflow koşumu `gh-pages` branch'ini oluşturur. Ardından Settings → Pages → Source: *Deploy from a branch* → `gh-pages` / `root`.
3. **Badge ve rapor linki:** README'nin en üstündeki `KULLANICI/REPO` yer tutucularını kendi bilgilerinizle değiştirin.

## Bonuslar

- **B1 — API + UI hibrit:** `api/authApi.js`, Playwright'ın `request` context'iyle e-bebek'in OAuth2 password-grant endpoint'ine (`/authorizationserver/oauth/token`) gidip token alır ve bundan Spartacus'un `spartacus⚿⚿auth` anahtarını içeren bir Playwright `storageState`'i üretir. Bu state, senaryo context'i **yaratılırken** verilir (`features/support/hooks.js`, `@api and @auth` hook'u), yani oturum daha ilk navigasyondan itibaren vardır — UI login'e de canlı sayfaya storage enjeksiyonuna da gerek kalmaz. Vitrin senaryosu `features/api_login.feature` (`@api`): API ile giriş → UI oturumu tanır → UI'dan çıkış → sonlanma doğrulanır. Kimlik API'den, doğrulama UI'dan.
- **B2 — CI:** `.github/workflows/e2e.yml` iki job'a ayrılmıştır. `test` job'ı Playwright resmi imajında headless + 2 worker koşar; ham sonuçları ve (yalnızca fail varsa) trace'leri artifact olarak yükler, JUnit XML'den koşu özeti üretir. `report` job'ı raporu üretip **GitHub Pages**'e yayınlar ve bir önceki koşumun `history/` klasörünü taşıyarak trend/flaky grafiklerini besler. Credential'lar GitHub Secrets'tan (`EBEBEK_EMAIL`/`EBEBEK_PASSWORD`) enjekte edilir. Ayrıntı: [CI ve Raporlama](#ci-ve-raporlama).
- **B3 — Docker:** Playwright resmi imajı üzerinde, tarayıcılar hazır gelir; headless koşar.

  ```bash
  docker build -t ebebek-e2e .

  # Hesap gerektirmeyen senaryolar (@auth otomatik SKIP):
  docker run --rm ebebek-e2e

  # Tüm suite — kimlik bilgileri KOŞUM ANINDA verilir:
  docker run --rm -e EBEBEK_EMAIL=... -e EBEBEK_PASSWORD=... ebebek-e2e
  # veya hazır bir ortam dosyasıyla:
  docker run --rm --env-file .env.test ebebek-e2e
  ```

  `.env.*` dosyaları `.dockerignore`'da olduğu için **imaja kopyalanmaz**; kimlik bilgisi imaj katmanlarında saklı kalmaz. Ortam dosyası imajda bulunmadığında `config/env.js` uyarı verip varsayılanlara düşer ve `@auth` senaryoları skip edilir. Diğer parametreler de aynı yolla geçilebilir: `-e BROWSER=firefox -e PARALLEL_WORKERS=2`.
- **B4 — Custom retry/wait yaklaşımları:** `ProductPage.addToCart` içindeki tıkla→doğrula→tekrarla döngüsü, `BasePage.dismissOverlays` koşullu overlay temizliği ve `CartPage.verifyTotalsConsistent` içindeki `toPass` tabanlı tutarlılık beklemesi; eklenemeyen üründe sıradaki ürüne geçiş `ProductPage.addProductsToCart` içinde yapılır.

## Bilinen Sınırlamalar

- `@auth` senaryoları gerçek bir e-bebek hesabı gerektirir; credential yokken **fail olmaz, SKIP edilir**. (Gerçek hesapla tam suite 13/13 doğrulanmıştır; credential'sız koşumda 5 senaryo skip, 8 senaryo geçer.)
- "Hatalı şifre" hata mesajı, sitenin bastığı Türkçe metni yakalayan esnek bir desenle (`hatalı|yanlış|şifre`) doğrulanır.
