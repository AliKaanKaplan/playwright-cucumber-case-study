# REVIEW.md — Kod İncelemesi Bulguları

AI destekli üretilen kodun üzerinde yapılan eleştirel incelemenin bulguları. Her madde
"bulgu → risk → alınan aksiyon / bilinçli kabul" formatındadır.

## Düzeltilen bulgular

1. **`#addToCartBtn` id çakışması.** Ürün detayındaki asıl buton ile öneri carousel'lerindeki
   butonlar aynı id'yi taşıyor; ilk üretilen locator strict mode'da 11 elemente çözülüyordu.
   → `#addToCartBtn:not(.btn-add-circle)` ile ayrıştırıldı (`locators/product.locators.js`).

2. **Sepet satırındaki fiyatın yanlış modellenmesi.** İlk üretilen ara toplam hesabı satır
   fiyatını *birim fiyat* varsayıp adetle çarpıyordu; adet artırınca test doğru siteyi
   "yanlış hesap" diye fail ediyordu. Canlı doğrulama, e-bebek'in satırda **satır toplamı**
   gösterdiğini ortaya çıkardı. → Denklem `Σ(satır tutarı)` olarak düzeltildi
   (`pages/CartPage.js`); toplam doğrulaması sepetteki her değişimden sonra tekrar koşulur.

3. **Hatalı şifre akışında gereksiz timeout bekleme.** İlk üretimde tam login akışı çağrılıp
   hata yutularak 20 sn'lik URL beklemesi boşa harcanıyordu. → Akış `startExistEmailLogin` /
   `submitPassword` olarak bölündü; negatif senaryo sonucu beklemeden assert ediyor.

## Bilinçli kabul edilen sınırlamalar

4. **Arama Enter fallback'i.** Headless'ta Enter navigasyonu güvenilir tetiklemediği için URL
   değişmezse `/search?text=...` adresine gidilir. UI etkileşiminin bir adımı atlanmış olur;
   davranışsal sonuç aynı olduğu ve senaryo determinizmi öncelikli olduğu için kabul edildi
   (README'de belgelendi).

5. **`/logout` rotası ile çıkış.** Header'daki çıkış linki hover menüsünde ve oturum açılmadan
   keşfedilemedi; SAP Commerce standart rotası kullanıldı. Gerçek hesapla koşulduğunda UI
   tıklama akışına çevrilmesi not edildi.

6. **Hatalı şifre mesajının esnek deseni.** Birebir metin, gerçek hesapla ilk koşumda
   sabitlenene kadar `hatalı|yanlış|şifre` deseniyle doğrulanıyor; katılık/kırılganlık
   dengesinde bilinçli tercih.

## İkinci tur — katman sorumlulukları ve doğrulama derinliği

İlk tur "çalışıyor mu" sorusuna odaklıydı; bu tur **katmanların doğru işi yapıp yapmadığı** ve
**doğrulamaların gerçekten ne kanıtladığı** üzerineydi. Suite her maddeden sonra tam koşuldu, tamamı yeşil.

7. **Oturum kontrolünün header markup'ına bağlanması (flaky).** Oturum doğrulaması
    `#lnkSignOutNavNode`'un DOM'da bulunmasına dayanıyordu. Fail anında `debug/` altına düşen aria
    snapshot, kullanıcının **giriş yapmış** olduğunu (header'da `/my-account/update-profile` hedefli
    "Hesabım" linki) ama sign-out node'unun hiç render edilmediğini gösterdi: site iki farklı header
    varyantı sunuyor. Bekleme artırmak çözmez — sorun zamanlama değil markup farkı. → Header
    sinyalleri tamamen kaldırıldı; oturumun kanıtı olarak oturum gerektiren sayfaya erişim kullanılıyor
    (giriş: `/my-account/update-profile` + `#btnEditPersonalInfo`; çıkış: `/login`'e düşüş +
    `eb-login-username`). README'nin flaky bölümüne 5. madde olarak yazıldı.

8. **Dinamik doğrulamaların dağınıklığı ve gizli timeout rejimi.** Page object'ler doğrudan
    `expect(...)` çağırıyordu; bir kısmı timeout vermediği için Playwright'ın **5 saniyelik**
    varsayılanı geçerliydi, geri kalan suite 15 saniye bekliyordu — aynı suite içinde iki bekleme
    rejimi, gerçek siteye karşı en kırılgan yer. (`CustomWorld`'deki `setDefaultTimeout` Cucumber'ın
    *step* timeout'u; `expect` varsayılanını etkilemez.) → Tüm dinamik doğrulamalar `BasePage`'de
    toplandı (`verifyVisibility`, `verifyLocatorVisibility`, `verifyHidden`, `verifyLocatorCountInDOM`,
    `verifyTextVisibility`, `verifyUrlContains`, `verifyUrlPath`, `verifyLocatorText`), timeout tek
    sabite (`ASSERT_TIMEOUT_MS`) bağlandı ve her çağrı anlamlı hata mesajı taşıyor. Mesaj parametresi
    boş bırakılmış çağrılar (`verifyLocatorCountInDOM(..., 1, )`) fail'de yalnızca
    "Expected: 1, Received: 0" üretiyordu — `debug/error.txt`'yi offline okuyan `/debugfix` akışı için
    bu bilgi kaybıydı, dolduruldu.

9. **Sayfa sınırını aşan akış hangi katmanda durmalı.** "Her step tek metot çağırmalı" kuralı
    mutlaklaştırıldığında sepet kurulum akışı (ana sayfa → arama → ürün → sepet) için üç yerleşim
    değerlendirildi. `CartPage`: sepet sayfasının üç page object'i import etmesi gerekirdi —
    page object'ler arası bağımlılık. `CustomWorld`: yaşam döngüsü sınıfı iş akışı ve senaryo
    verisi taşımaya başlardı — sorumluluk karışması. Yeni bir `flows/` katmanı: case study'nin
    beklediği klasör yapısına yabancı bir katman eklemek olurdu. → Nihai karar: **kompozisyon step'te kalır**, adımlar arası veri `this.data`
    üzerinde World/senaryo bağlamında taşınır (case study'nin S5 için istediği kullanım). Sonuç:
    hiçbir page object başka bir page object'i import etmiyor, page object'ler durumsuz. Step'te döngü
    kurmak yerine dizi alan metot eklendi (`CartPage.verifyItemsVisible(names)`).

10. **Ortak elemanların yeri.** Arama kutusu `home.locators.js`'te, yani ana sayfaya özel gibi
    duruyordu; oysa header'da her sayfada var. → `common.locators.js`'e alındı ve `search()`
    `CommonPage`'e taşındı (`home.locators.js` boşaldığı için silindi, `HomePage`'de `openHome()`
    kaldı). Hover ile açılan My Account menüsünün seçicileri de dosyaya dağınık girmişti; bölümlere
    ayrıldı, `#lnkSignOutNavNode` tek sabitte toplandı ve menü kalemleri `myAccountMenu` haritasına
    alındı. `CommonPage.selectFromMyAccount(itemName)` böylece boş
    `switch` + `text=Orders` sabitinden isim→selector çözen dinamik bir metoda dönüştü.

### İkinci turda bilinçli kabul edilen

11. **`selectFromMyAccount` header varyantına bağımlı.** 7. maddede saptanan iki header varyantından
    hover menüsünü render etmeyen varyantta bu metot çalışmaz. Şu an hiçbir senaryo onu çağırmadığı
    için suite etkilenmiyor; kullanılmaya başlanacaksa menü açılmadığında "Hesabım" linkine düşen bir
    fallback gerekir. Bilinçli olarak ertelendi.

## Üçüncü tur — eylem katmanı ve teşhis kalitesi

12. **Ham `locator.click()` / `fill()` çağrılarının dağınıklığı.** 17 çağrı yeri vardı; her biri
    Playwright'ın genel varsayılan timeout'una tabiydi ve fail ettiğinde çıktı yalnızca
    `locator.click: Timeout 15000ms exceeded` diyordu — hangi elemente, hangi sayfada, hangi iş
    adımında olduğu belirsiz. → `BasePage`'e `click` / `fill` / `press` / `hover` / `waitForUrl`
    sarmalayıcıları (+ her birinin hazır Locator alan `...Locator` varyantı) eklendi ve tüm çağrılar
    bunlara çevrildi; `open()` de kendi `goto`'sunu aynı yoldan geçiriyor. Tek `#act` sarmalayıcısı
    hatanın önüne bağlamı ekliyor, Playwright'ın call log'unu **koruyarak**:
    `Could not click "login button" on https://www.e-bebek.com/login` + call log.
    `waitForUrl`'e ayrıca iş dilinde bir `expectation` parametresi kondu, çünkü URL predicate'i
    Playwright'ın kendi mesajında `[Function]` olarak basılıyor ve "neyi beklediği" kayboluyordu.
    **Bilinçli olarak eklenmeyen şey:** eylemlerden önce `waitFor`/visibility kontrolü. Playwright
    zaten attached/visible/stable/enabled/hit-testable bekliyor; üstüne koymak davranışı
    değiştirmez, yalnızca timeout bütçesini ikiye katlar. `force: true`, `waitForTimeout` ve
    tıklama sonrası `networkidle` beklemesi de aynı gerekçeyle kullanılmadı.
    Kapsam dışı bırakılan iki yer: `dismissOverlays`'in çerez tıklaması (kendi 4-5 sn'lik
    best-effort bütçesi var, 15 sn'ye bağlamak banner gelmeyen koşumu yavaşlatırdı) ve
    `loginViaApi`'nin `evaluate`/`reload` çağrıları (hata mesajını `authApi` zaten üretiyor).

13. **`ProductPage`'de kalan inline `expect`'ler.** İki doğrulama (`openProduct`'ta ürün başlığı,
    `addToCart`'ta buton) hâlâ doğrudan `expect(...).toBeVisible({ timeout: 20000 })` çağırıyordu:
    mesajsız, merkezi timeout'un dışında ve page object katmanı kuralına aykırı. → `verifyVisibility`
    / `verifyLocatorVisibility`'ye çevrildi, anlamlı mesaj eklendi. 20 sn bilinçliydi (ürün detay
    sayfası lazy yükleniyor), sessizce 15'e düşürmek yeni bir kırılganlık olurdu; bu yüzden iki
    visibility metoduna **opsiyonel timeout parametresi** eklendi ve süre
    `PRODUCT_LOAD_TIMEOUT_MS` olarak isimlendirildi. Aynı gerekçeyle `LoginPage`'deki iki adet 20000
    de `LOGIN_NAVIGATION_TIMEOUT_MS` oldu. Dosyada kalan iki `expect` bilinçli: `expect.poll`
    (hydration çözümü) ve `expect(added, …).toHaveLength(count)` — ikincisi bir JS dizisi üzerinde
    değer doğrulaması, sayfa durumu assertion'ı değil.

14. **`verifyLocatorText`'in sessizce yutulan mesajı.** Metot `toHaveText(expectedText, "mesaj")`
    şeklinde çağırıyordu; oysa `toHaveText`'in ikinci parametresi options objesidir — mesaj sessizce
    yutuluyor ve merkezi timeout da uygulanmıyordu. → İmza diğerleriyle hizalandı:
    `expect(locator, message).toHaveText(expected, { timeout: ASSERT_TIMEOUT_MS })`.
