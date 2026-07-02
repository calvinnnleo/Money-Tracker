# Sistem Keuangan Pribadi (Telegram Bot + Google Sheets + Dashboard Web)

Arsitektur:

```
Kamu (Telegram) --> Bot (VPS)  --\
                                   >-- Google Sheets --> Dashboard Web (Vercel)
                                  /
```

Satu Google Sheet jadi "database" tunggal. Bot menulis, dashboard membaca (dan bisa
diexport jadi .xlsx rapi kapan saja).

---

## 0. Yang perlu disiapkan dulu

1. **Google Cloud Service Account** (dipakai bot & dashboard untuk akses Sheets)
   1. Buka https://console.cloud.google.com/ → buat project baru.
   2. Aktifkan **Google Sheets API** (menu "APIs & Services" → "Enable APIs").
   3. Buat **Service Account** ("IAM & Admin" → "Service Accounts" → "Create").
   4. Buat key baru untuk service account itu, tipe **JSON** → file akan otomatis terdownload. Simpan sebagai `service-account.json`.
   5. Buat Google Sheet baru di akun Google-mu, lalu **Share** sheet itu ke email service account (ada di file JSON, formatnya `xxx@project-id.iam.gserviceaccount.com`) dengan akses **Editor**.
   6. Salin **Sheet ID** dari URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_DI_SINI/edit`.

2. **Telegram Bot Token**
   1. Chat `@BotFather` di Telegram → `/newbot` → ikuti instruksi → dapat token.
   2. Chat `@userinfobot` untuk tahu Telegram User ID kamu sendiri (biar bot cuma nurut ke kamu).

---

## 1. Jalankan Bot di VPS

```bash
cd telegram-bot
cp .env.example .env
# isi TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_ID, GOOGLE_SHEET_ID
# taruh service-account.json di folder ini juga

npm install
node index.js
```

Untuk production, pakai PM2 supaya jalan terus & auto-restart:

```bash
npm install -g pm2
pm2 start index.js --name finance-bot
pm2 save
pm2 startup   # ikuti instruksi yang muncul
```

**Cara pakai bot** (chat ke bot-nya di Telegram):
```
keluar 25000 kopi
masuk 5000000 gaji bulan ini
/ringkasan
```
Bot otomatis menebak kategori dari kata kunci (kopi → Makanan, bensin → Transportasi, dst — bisa diedit di `parser.js`).

---

## 2. Deploy Dashboard ke Vercel

1. Push folder `dashboard/` ke repo GitHub baru.
2. Buka https://vercel.com → **Add New Project** → import repo itu.
3. Di **Environment Variables**, isi:
   - `GOOGLE_SHEET_ID` = ID sheet yang sama seperti di bot
   - `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` = isi `service-account.json` yang di-encode base64 satu baris:
     ```bash
     base64 -w 0 service-account.json
     ```
     (kalau di Mac: `base64 -i service-account.json`)
4. Deploy. Vercel otomatis build & kasih URL, misalnya `finance-kamu.vercel.app`.

Setiap kali kamu update dari bot, buka lagi dashboard-nya → data langsung ter-refresh (fetch on load). Kalau mau real-time tanpa refresh manual, tinggal tambah `setInterval` di `page.js`.

---

## 3. Struktur Google Sheet (otomatis dibuat bot saat pertama jalan)

**Tab `Transactions`**
| Tanggal | Tipe | Kategori | Jumlah | Catatan | Dicatat Pada |

**Tab `Budget`** (isi manual sesuai kebutuhan)
| Kategori | Budget Bulanan |
|---|---|
| Makanan | 1500000 |
| Transportasi | 500000 |

Isi tab `Budget` manual di Google Sheets — dashboard otomatis membaca dan menampilkan progress bar budget vs realisasi.

---

## 4. Custom lanjutan (opsional)

- Tambah kategori/keyword baru → edit `telegram-bot/parser.js`
- Tambah kirim foto struk + OCR → bisa pakai Google Vision API atau Tesseract, lalu extract angka & append ke sheet
- Notifikasi kalau budget kelebihan → tambahkan pengecekan di `addTransaction` pada `sheets.js`, kirim pesan Telegram kalau total kategori bulan ini > budget
- Multi-akun (misal kamu + pasangan) → tambah kolom "Akun" di sheet, filter di dashboard
