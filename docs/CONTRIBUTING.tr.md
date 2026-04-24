# HealthBinder Katkı Rehberi

**Dil:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](#) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## Ülke Kılavuz Paketi Ekleme

Paketler `packages/country-packs/<ülke-kodu>/preventive-care.json` konumunda bulunur. Sunucu başlangıçta otomatik okur — **yalnızca JSON dosyası eklemek yeterlidir**, kod değişikliği gerekmez.

Tam alan referansı için `packages/country-packs/SCHEMA.md` dosyasına bakın.

### Adımlar

1. `packages/country-packs/<ISO-kodu>/` dizinini oluşturun
2. `packages/country-packs/us/preventive-care.json` dosyasını şablon olarak kopyalayın
3. Organizasyon ve önerileri hedef ülkeye ait olanlarla değiştirin
4. Benzersiz ve kararlı ID'ler kullanın (örn.: `"saglik-kanser-2023"`)
5. `apps/web/src/pages/Settings.tsx` içindeki `COUNTRIES` dizisine ülke kodunu ekleyin
6. Sunucuyu yeniden başlatın — dosya otomatik olarak algılanır

### Önerilen Kaynaklar

Resmi ulusal tarama programlarını (KETEM, Sağlık Bakanlığı) ve büyük tıp derneklerini referans alın. Her öneri için `source_url` ve `version_date` zorunludur.

---

## Klinik Modül Tetikleyicisi Ekleme

Tetikleyiciler `packages/clinical-rules/src/module-triggers.json` dosyasındadır.

```json
{
  "id": "gut",
  "name": "Gut Yönetimi",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "gut" },
      { "medication_name_contains": "allopurinol" }
    ]
  }
}
```

Koşul türleri: `lab` (lab değeri eşiği), `diagnosis_contains` (tanı alt dizesi), `medication_name_contains` (ilaç adı alt dizesi).

---

## Yeni Sayfa Ekleme

1. `apps/web/src/pages/SayfaAdi.tsx` oluşturun
2. `apps/web/src/App.tsx` dosyasına rota ekleyin
3. `apps/web/src/components/Layout.tsx` dosyasına navigasyon öğesi ekleyin
4. `apps/web/src/i18n/en.ts` ve `ko.ts` dosyalarına çeviri anahtarları ekleyin
5. API endpoint'leri `apps/server/src/index.ts`'e, tip fonksiyonlarını `apps/web/src/api/client.ts`'e ekleyin

---

## Tıbbi Doğruluk

- Birincil kaynak zorunlu (`source_url` + `version_date`)
- Tıbbi jargon yerine hasta dostu dil kullanın
- Belirsizliği ifade edin: «olasılığı var», «doktorunuza danışın»
- Asla tanı koymayın — bulguları açıklayın ve takip önerin

---

## Kod Stili

- Yalnızca TypeScript, zorunlu olmadıkça `any` yasak
- Neden açık değilse yorum satırı eklemeyin
- Sayfa bileşenleri 250 satırın altında tutun
- DB erişimi yalnızca Drizzle ORM üzerinden
