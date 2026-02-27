# Feedim Sistem Maliyet + Gelir Simulasyon Raporu
Tarih: 2026-02-27  
Kur varsayimi: 1 USD = 36.4568 TRY  
Kapsam: 1K, 10K, 100K, 1M, 10M kullanici (MAU varsayimi), maliyet, gelir, net sonuc, monetizasyona ulasma suresi simulasyonu.

## 1) Bu raporda neye baktim
- Kod tabaninda aktif servisleri ve gelir modelini cikardim:
  - Uygulama: Next.js (Vercel)
  - DB/Auth/API: Supabase
  - Medya depolama: Cloudflare R2 (+ CDN URL)
  - AI: Anthropic Claude Haiku 4.5 (moderation/SEO/suggested tags)
  - E-posta: Resend
  - Odeme: PayTR
- Koddan monetizasyon esiklerini dogruladim:
  - Profesyonel hesap (creator/business)
  - Profil guven skoru >= 40
  - En az 100 premium takipci
  - Son 30 gunde en az 5000 goruntulenme
  - Hesap yasi >= 7 gun
  - Spam skoru < 30
  - E-posta dogrulamasi
- Koddan kazanc limitlerini dogruladim:
  - `COIN_DAILY_LIMIT = 500` (gunluk okuma kazanci limiti)
  - `COIN_POST_LIMIT = 10000` (post basina ust limit)
  - Cekimde net odeme: `COIN_TO_TRY_RATE * (1 - COIN_COMMISSION_RATE)` = `0.3333 * 0.8 = 0.26664 TRY / coin`

## 2) Resmi fiyat kaynaklari (guncel referans)
- Vercel fiyatlari ve transfer/compute:
  - https://vercel.com/pricing
  - https://vercel.com/docs/pricing/networking#fast-data-transfer
  - https://vercel.com/docs/pricing/serverless-functions
- Supabase kullanim ve ek ucretler:
  - https://supabase.com/docs/guides/platform/manage-your-usage/mau
  - https://supabase.com/docs/guides/platform/manage-your-usage/database-egress
  - https://supabase.com/docs/guides/platform/manage-your-usage/compute-pricing
  - https://supabase.com/docs/guides/platform/manage-your-usage/compute-add-ons
- Cloudflare R2:
  - https://www.cloudflare.com/developer-platform/r2/pricing/
- Anthropic model fiyatlari (Haiku 4.5 dahil):
  - https://docs.anthropic.com/en/docs/about-claude/pricing
- Resend:
  - https://resend.com/pricing
- PayTR ucretlendirme notu (oranlar sozlesmeye gore degisir):
  - https://www.paytr.com/ucretlendirme
- Kur:
  - https://open.er-api.com/v6/latest/USD

## 3) Model varsayimlari (base-case)
- Buradaki kullanici sayilari MAU kabul edildi.
- Premium donusum orani:
  - 1K: 2%
  - 10K: 3%
  - 100K: 4%
  - 1M: 5%
  - 10M: 6%
- Coin satin alan kullanici orani:
  - 1K: 3%
  - 10K: 4%
  - 100K: 5%
  - 1M: 6%
  - 10M: 7%
- Premium net gelir hesabinda PayTR kesintisi varsayimi: %3.5
- Coin tarafi net marj varsayimi (bonus + odeme + payout sonrasi): %10
- Reklam varsayimi:
  - Non-premium MAU basina aylik 220 impression
  - Net eCPM: $0.6
- Read-earning payout varsayimi:
  - Premium MAU basina aylik ortalama 12 TRY payout maliyeti
- Infra kullanim varsayimi:
  - Vercel transfer: 0.22 GB / MAU / ay
  - Supabase DB egress: 0.05 GB / MAU / ay
  - R2 aktif medya: 0.12 GB / MAU
  - AI: 1.8 cagri / MAU / ay
  - Resend: 0.8 email / MAU / ay

## 4) Aylik maliyet-gelir simulasyonu (base-case)
| MAU | Infra ($/ay) | Infra (TRY/ay) | Read payout (TRY/ay) | Toplam maliyet (TRY/ay) | Toplam gelir (TRY/ay) | Net (TRY/ay) |
|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | 188 | 6.860 | 240 | 7.100 | 6.959 | -142 |
| 10.000 | 464 | 16.925 | 3.600 | 20.525 | 79.218 | 58.694 |
| 100.000 | 4.616 | 168.296 | 48.000 | 216.296 | 888.501 | 672.204 |
| 1.000.000 | 49.571 | 1.807.202 | 600.000 | 2.407.202 | 9.848.183 | 7.440.980 |
| 10.000.000 | 498.291 | 18.166.098 | 7.200.000 | 25.366.098 | 108.113.597 | 82.747.500 |

## 5) Belirsizlik araligi (net sonuc)
Asagidaki tablo aylik net sonuc icin konservatif / base / agresif araligidir.

| MAU | Konservatif Net (TRY/ay) | Base Net (TRY/ay) | Agresif Net (TRY/ay) |
|---:|---:|---:|---:|
| 1.000 | -5.375 | -142 | 5.119 |
| 10.000 | 16.710 | 58.694 | 113.316 |
| 100.000 | 260.211 | 672.204 | 1.257.761 |
| 1.000.000 | 3.248.502 | 7.440.980 | 13.896.241 |
| 10.000.000 | 39.949.673 | 82.747.500 | 149.964.682 |

## 6) Maliyet kirilimi (en kritik iki seviye)
### 1M MAU (aylik)
- Vercel: $33.937
- Supabase: $7.725
- R2: $1.994
- Anthropic: $3.420
- Resend: $695
- Transcode worker: $1.200
- Diger izleme/operasyon: $600
- Toplam infra: $49.571

### 10M MAU (aylik)
- Vercel: $340.537
- Supabase: $79.263
- R2: $20.017
- Anthropic: $34.200
- Resend: $7.175
- Transcode worker: $12.000
- Diger izleme/operasyon: $5.100
- Toplam infra: $498.291

Ana sonuc: 1M+ seviyede en buyuk maliyet kalemi Vercel transfer/serving oluyor. Supabase ikinci buyuk kalem.

## 7) Yeni kullanici monetizasyon suresi simulasyonu
Bu kisim senin son istegine gore, yeni bir kullanicinin para kazanma kosullarina ulasma suresini simule eder.

### 7.1 Esik mantigi
- 5000 goruntulenme kosulu "son 30 gun" oldugu icin, kullanici 30 gunluk pencerede ortalama en az ~167 goruntulenme/gun seviyesini goremezse bu kapidan gecemez.
- Cogu durumda asil darbogaz `100 premium takipci` kosulu oluyor.

### 7.2 Simule edilmis profiller
| Profil | Gunluk goruntulenme | Premium takipci artis hizi (gun) | 5000/30 gun kapisi | 100 premium takipci kapisi | Tahmini tam uygunluk* | Tahmini aylik net kazanc** |
|---|---:|---:|---:|---:|---:|---:|
| Dusuk buyume | 150 | 0.6 | Ulasilamaz | 167 gun | Ulasilamaz | 0 |
| Orta buyume | 260 | 1.3 | 20 gun | 77 gun | 79 gun | ~233 TRY |
| Hizli buyume | 600 | 3.8 | 9 gun | 27 gun | 29 gun | ~891 TRY |
| Ust seviye creator | 2500 | 10 | 2 gun | 10 gun | 20 gun | ~3.999 TRY (cap) |

`*` Tam uygunluk = hesap yasi + skor + esikler + 2 gun moderasyon onayi varsayimi.  
`**` Read-earning tarafi; hediyeler ve diger gelirler haric.

### 7.3 Kritik icgoru
- Read-earning tarafinda koddaki gunluk 500 coin limiti nedeniyle aylik teorik ust sinir yaklasik 3.999 TRY.
- Bu, creator ekonomisinde en yuksek read-gelir seviyesini sinirlayarak payout riskini kontrol ediyor.
- Ama yeni creator motivasyonu icin "erken donemde kazanc cok dusuk" problemi olusturabilir.

## 8) Buyume asamasinda zorunlu degisiklikler
### 1K -> 10K
- Maliyet yerine urun-fit ve retention odagi.
- Manuel moderasyon + temel anti-abuse yeterli.
- Kritik guvenlik aciklari kapatilmis olmali (odeme/dev endpoint/rate-limit).

### 10K -> 100K
- In-memory rate-limitten Redis/KV distributed rate-limite gecis.
- Idempotency key zorunlulugu (odeme, coin, withdrawal, follow kritik akislari).
- Query budget ve endpoint bazli p95/p99 performans hedefi.

### 100K -> 1M
- Supabase compute buyutme + read replica plani.
- Feed/suggestion/moderation agir endpointleri cache + queue mimarisina alma.
- AI cagrilarinda butce limiti, fallback ve sampling stratejisi.

### 1M -> 10M
- Multi-region CDN + media pipeline optimizasyonu.
- Event-driven veri kati (Kafka/PubSub benzeri) ve analytics ayrisma.
- Reklam tarafinda mediation ve fill-rate optimizasyonu.
- Fraud/risk motoru (odeme, earning, bot ring, fake engagement) gercek zamanli hale getirilmeli.

## 9) C-level ozet
- 1K seviyesinde sistem hafif zarar/denge bolgesinde olabilir.
- 10K+ seviyesinde, base modelde net pozitif gorunuyor.
- 1M ve 10M seviyesinde kar marji teknik olarak guclu, fakat bu sonuc en cok su iki degiskene hassas:
  - Reklam eCPM/fill
  - Coin ekonomisindeki net marj ve payout kalitesi
- En kritik operasyonel risk: trafik buyudukce transfer maliyeti (ozellikle Vercel) ve fraud kaynakli payout sismesi.

## 10) Notlar
- Bu rapor kod tabani + resmi fiyat sayfalari + varsayim bazli finansal modeldir.
- Gercek rakamlar icin production metrikleriyle (MAU, DAU/MAU, impression, conversion, payout, churn) aylik tekrar kalibrasyon sarttir.
- Personel maasi, sirket operasyonu, vergi/muhasebe, hukuki giderler bu modelde yoktur.
