# PR: e-bebek Uçtan Uca Test Otomasyonu (S1–S6 + bonuslar)

## Kapsam

- S1–S6 zorunlu senaryolarının tamamı `features/` altında Gherkin ile yazıldı ve otomasyona bağlandı.
- Page Object Pattern; her page object **Actions / Queries / Validations** (`verify*`) bölümlerine ayrık. Generic step'lerin ortak UI katmanı `CommonPage`'te.
- Sayfa başına tek kaynaklı locator modülleri (`locators/`); rota yolları `config/routes.js`'te merkezî; çok ortamlı konfigürasyon (`.env.test` / `.env.demo`, `ENV` değişkeni).
- 2 worker paralel koşum; senaryo başına izole browser context (README → *Test İzolasyonu*).
- Allure: adım + feature açıklamaları, environment bilgisi, failure'da ekran görüntüsü + Playwright trace. Üretilen çıktı `reports/` altında toplanır.
- Bonuslar: **API + UI hibrit (B1)** — OAuth token'ı API'den alıp storage state ile enjekte eden `@api` vitrin senaryosu; GitHub Actions CI (B2), Dockerfile (B3), custom retry/wait yaklaşımları (B4).

## Öne çıkan teknik kararlar

1. **Sepet ara toplamı sayısal doğrulanır:** fiyat metinleri TR para formatından parse edilir;
   `Ürünler Toplamı = Σ(satır tutarı)` ve `Toplam = Ürünler Toplamı − İndirim + Kargo`
   denklemleri kuruş toleransıyla assert edilir. e-bebek satırda birim değil **satır toplamı**
   gösterdiği için denklem buna göre kuruldu (canlı keşifle doğrulandı).
2. **Sonuçsuz arama:** site "sonuç bulunamadı" mesajı basmıyor; işlevsel eşdeğeri assert edildi
   (başlıkta aranan terim + hiçbir ürün adının terimi içermemesi). Gerekçe README'de.
3. **Kayıtsız e-posta:** site hata mesajı yerine register'a yönlendiriyor; senaryo gerçek
   davranışı doğruluyor.
4. **S2 üç senaryoya bölündü, tablo tek tip durumu kapsıyor.** Scenario Outline "alan doldur →
   gönder → doğrulama mesajını gör" kalıbındaki 4 durumu parametrik koşuyor (geçersiz e-posta
   formatı, boş e-posta, boş telefon, kısa telefon). Kayıtsız e-posta tabloya girmiyor çünkü
   mesaj değil **yönlendirme** üretiyor; hatalı şifre girmiyor çünkü `@auth` — aynı tabloya
   konsa credential'sız ortamda tablonun tamamı skip olur ve hesap gerektirmeyen 4 negatif durum
   da koşmadan geçerdi. Gerekçe README'deki senaryo haritasında.
5. **Flaky çözümleri:** add-to-cart tıklamasında "tıkla → rozet artışını bekle → tekrarla"
   döngüsü, overlay'ler için koşullu kapatma, arama Enter'ı için URL fallback,
   sepet özeti için `toPass` polling'i. `sleep`/`waitForTimeout` yok.
6. **Doğrulama URL'e indirgenmez.** Her `verify*`, testin amacını kanıtlayan **unique bir elementin
   visibility'sini** içerir; URL ek kanıttır. Aksi hâlde sayfa hiç render olmasa bile test geçer.
   Örnek: şifre adımı `eb-login-password`, korumalı profil sayfası `#btnEditPersonalInfo`. Login
   sayfasının iki alt durumu ayrı doğrulanır (kullanıcı-adı formu / şifre adımı), çünkü ortak bir
   buton kontrolü ikinci durumda DOM'da olmuyor.
7. **Oturum doğrulaması header markup'ına bağlı değil.** Site **iki farklı header varyantı**
   sunuyor: birinde hover menüsünün nav node'ları (`#lnkSignOutNavNode`) basılıyor, diğerinde hiç
   render edilmiyor. Node'un DOM'da olmasına bakan kontrol, kullanıcı giriş yapmış olduğu hâlde
   0 dönüyordu; timeout artırmak çözmez (sorun zamanlama değil markup). Oturum artık oturum
   gerektiren sayfaya erişimle kanıtlanıyor. Teşhis, fail anında `debug/` altına düşen aria
   snapshot'tan çıktı — README *Flaky* #5, REVIEW.md #7.
8. **`BasePage` tek geçiş noktası.** Dinamik doğrulamalar (`verifyVisibility`, `verifyUrlContains`,
   `verifyLocatorCountInDOM`…) ve eylem sarmalayıcıları (`click`/`fill`/`press`/`hover`/`waitForUrl`,
   + hazır Locator varyantları) burada; timeout tek sabitte. Sarmalayıcılara bilinçli olarak
   **ekstra bekleme koymadım** — Playwright'ın auto-wait'i onu zaten yapıyor; kattıkları değer
   teşhis: hatanın önüne "hangi element + hangi sayfa" bilgisi eklenir, Playwright'ın call log'u
   korunur (`Could not click "login button" on https://…`). Fail'de `debug/error.txt` okunurken
   fark ediliyor.
9. **Katman sınırı: hiçbir page object başka page object'i import etmez.** Sayfa sınırını aşan
   akış (arama → ürün → sepet) hiçbir sayfaya ait olmadığı için sırayı step kurar, adımlar arası
   veri World'ün `data` çantasında taşınır — case'in S5 için istediği "hooks ve senaryo bağlamı
   (World/context)" kullanımı budur. Step'ler tek metot çağırır; assertion/locator/`this.page`
   içermez.

## AI Kullanımı ve Hesap Verebilirlik

Bu projede yapay zekâ kod asistanını (Claude Code) yoğun biçimde kullandım — case bunu açıkça serbest bırakıyor. Aşağıda dürüst bir ayrım: neyi **hız için AI'a delege ettim**, neyi bir **senior olarak kendim yönettim**.

**AI'a delege ettiğim (mekanik / keşif ağırlıklı) işler.** Bunları kendim de yazabilirdim; delege etmemin sebebi yetkinlik değil, zaman kazanmaktı:
- Proje iskeleti: `cucumber.js`, `package.json` script'leri, hooks/World kurulumu, Allure/Docker/CI konfigürasyonu.
- Page object ve step'lerin ilk taslakları.
- Selector keşfi: canlı site üzerinde çalıştırılan probe script'leri (aynı işi `codegen`/DevTools ile de yapardım).
- Doküman taslakları (README/REVIEW/PR_DESCRIPTION).

**Bir senior olarak kendim sahiplendiğim (mühendislik yargısı gerektiren) işler.** Buradaki değer kod yazmak değil, doğru kararı vermek ve AI çıktısını eleştirel süzmekti:
- **Mimari kararlar:** POM + sorumluluk ayrımı (Actions/Queries/Validations), `CommonPage` ile generic step katmanı, locator'ların tek kaynağa çekilmesi, rota sabitlerinin merkezileştirilmesi, çok ortamlı konfigürasyon, üretilen çıktının `reports/` altında toplanması. 
- **Bekleme/flaky felsefesi:** `sleep` yok; koşul-tabanlı beklemeler ve UI'ın kendi sinyaline dayanan retry.
- **Alan bilgisi gerektiren doğrulama:** sepet ara toplamının satır-toplamı modeli, sonuçsuz aramanın "işlevsel eşdeğer" doğrulaması, çıkışın gerçekten sonlandığının kanıtı.
- **AI çıktısının gözden geçirilmesi ve düzeltilmesi** (ayrıntılar `REVIEW.md`): AI ilk turda sepet toplamını *birim × adet* varsaymıştı — canlı davranışla yanlış olduğunu görüp modeli düzelttim; silme onay modalını atlamıştı; `#addToCartBtn` strict-mode'da çakışıyordu; hazır `toBeCloseTo` varken özel para karşılaştırma fonksiyonları ve tek kullanımlık higher-order helper'lar üretmişti — sadeleştirdim.
- **Asistanın iki yapısal önerisini reddettim.** "Her step tek metot çağırsın" kuralını verdiğimde asistan sayfa sınırını aşan sepet kurulum akışını önce `CartPage`'e taşıdı — sepet sayfası üç page object'i import etmeye başladı; sonra `CustomWorld`'e taşıdı — yaşam döngüsü sınıfı iş akışı ve senaryo verisi taşımaya başladı; üçüncü olarak ayrı bir `flows/` katmanı önerdi. Üçünü de geri çevirdim: case'in beklediği klasör yapısında böyle bir katman yok ve S5 zaten World/context kullanımını şart koşuyor. Kompozisyon step'te, veri `this.data`'da kaldı. Kuralı mutlaklaştırmanın mimariyi bozduğu yeri görmek bu turun asıl mühendislik kararıydı.
- **Doğrulama derinliğini ben yükselttim.** İlk üretimde birkaç doğrulama yalnızca URL kontrol ediyordu; "URL yeterli değil, amaca uygun unique bir element de doğrulanmalı" kuralını koyup tüm `verify*` metotlarını buna göre gözden geçirdim. Locator'ları tahminle değil canlı DOM'dan (probe script) doğruladım.
- **Sessiz boşlukları yakaladım.** (1) Bir adımın step tanımı eksikti; Cucumber onu *undefined* sayıp sonraki adımları skip ediyordu — yani S6'nın asıl logout doğrulaması hiç koşmuyordu, çıktı da kırmızı değildi. (2) Aynı gövdeyi çağıran kopya bir step tanımı vardı (case kopya step'i eksi puan sayıyor) → kaldırıldı.

Kısacası: yazılan her satırın sahibi benim ve demo'da her birini savunabilirim. AI'ın rolü mekanik ve keşif işini hızlandırmaktı; mimari, sadeleştirme ve doğrulama kararları bana ait.

## Koşum kanıtı

- Gerçek hesapla tam suite, **2 worker + headless**: `13 scenarios (13 passed) / 61 steps (61 passed)`
  — duvar saati 1m42, adımların toplam süresi 2m56 (yani paralellik gerçekten çalışıyor).
- Tek worker ile aynı sonuç: `13 scenarios (13 passed)`, 2m33 (determinizm kontrolü).
- **Credential olmadan** (değerlendiricinin ilk deneyimi): `13 scenarios (5 skipped, 8 passed)`,
  38 saniye — `@auth` senaryoları `hooks.js` tarafından otomatik skip edilir, kalanlar geçer.
- `npx cucumber-js --dry-run`: 61 adımın tamamı eşleşiyor; undefined/ambiguous step yok.
- Allure: `npm run report:generate` başarılı; environment bilgisi raporda görünüyor
  (`environment`, `base_url`, `browser`, `headless`, `parallel_workers`, `os`, `node`).
  JUnit XML `reports/junit/results.xml` (`tests="13"`) CI özeti için üretiliyor.
