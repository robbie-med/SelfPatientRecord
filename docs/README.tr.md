# HealthBinder

**Dil:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](#) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

Yerel çalışan, hastaya ait kişisel sağlık kaydı ve yapay zeka sağlık organizatörü. Verileriniz cihazınızdaki bir SQLite veritabanında saklanır.

**Tıbbi cihaz değildir. HIPAA uyumlu değildir. Acil durumlarda kullanmayın.**

---

## Özellikler

- **Gelen Kutusu** — Herhangi bir tıbbi belgeyi yapıştırın (laboratuvar sonuçları, taburcu özeti, reçete). Yapay zeka yapılandırılmış verileri çıkarır; kaydetmeden önce siz onaylarsınız.
- **Laboratuvar & Vital Bulgular** — Panele göre gruplandırılmış sonuçlar, trend grafikleri ve 20 yaygın test için sade dil açıklamaları.
- **Görüntüleme** — Radyoloji raporlarını saklayın. Terimleri (atelektazi, plevral efüzyon vb.) anlaşılır dilde öğrenin.
- **İlaçlar** — Mevcut ve geçmiş ilaçlar, alerjiler, yazdırılabilir ilaç listesi.
- **Önleme** — Otomatik tespit edilen bakım boşlukları, kılavuzlar (USPSTF/ADA/KETEM), aşı takvimi.
- **Kaydımı Sor** — Onaylanmış sağlık verilerinizle yapay zeka aracılığıyla sohbet edin (varsayılan: devre dışı).
- **Ayarlar** — Profil, ülke/kuruluş tercihleri, yapay zeka yapılandırması, modüller, veri dışa aktarma/silme.

---

## Kurulum

```bash
git clone <depo-url>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Web uygulaması: http://localhost:5173
- API sunucusu: http://localhost:3001

### Ortam Değişkenleri (`.env`)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3001` | API sunucu portu |
| `AI_ENABLED` | `false` | Yapay zeka özelliklerini etkinleştir (`true`) |
| `AI_API_KEY` | — | OpenAI uyumlu API anahtarı |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API uç noktası |
| `AI_MODEL` | `gpt-4o-mini` | Model adı |

Tüm temel özellikler yapay zeka olmadan çalışır.

---

## GitHub Codespaces

1. GitHub deposu → **Code** → **Codespaces** → **Create codespace**
2. `npm install` tamamlanana kadar bekleyin (~1 dk)
3. Terminalde: `npm run dev`
4. Codespaces, 5173 portunda tarayıcıyı otomatik açar

---

## Katkıda Bulunma

Ülke kılavuz paketleri, klinik modül tetikleyicileri veya test açıklamaları eklemek için [CONTRIBUTING.tr.md](CONTRIBUTING.tr.md) sayfasına bakın.

---

## Sorumluluk Reddi

HealthBinder kişisel bir sağlık organizasyon aracıdır. Tıbbi cihaz değildir ve profesyonel tıbbi bakımın yerini tutmaz. Acil durumlarda 112'yi arayın.
