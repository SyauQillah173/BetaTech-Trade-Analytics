# 🚀 BetaTech Trade Analytics

**BetaTech Trade Analytics** adalah platform analitik dan terminal trading modern berkonsep *Dark Theme* futuristik yang menggabungkan analitik pasar *multi-asset* (Crypto, Forex, Commodities), grafik interaktif *TradingView Lightweight Charts*, sinyal kuantitatif berbasis **AI (Gemini / OpenAI)**, manajemen portofolio **Watchlist Database**, dan **Trade Journal Simulator** menggunakan **Prisma ORM** & **PostgreSQL (Neon / Supabase)**.

---

## ⚡ Fitur Utama

- **📊 Modern Trading Dashboard**:
  - Ticker harga real-time running stream dengan koneksi langsung ke Binance REST API.
  - Multi-market switcher: Crypto, Forex, dan Commodities.
  - Grafik interaktif Lightweight Charts dengan indikator teknikal (MA, RSI, Bollinger Bands, Volume).
- **🤖 AI Signal Generator Widget**:
  - Analisis teknikal otomatis pada data OHLCV (candlestick).
  - Integrasi dengan Google Gemini 2.0 Flash / OpenAI GPT-4o.
  - Menghasilkan rekomendasi: Sinyal (`BUY` / `SELL` / `WAIT`), *Confidence Score*, *Target Price*, *Stop Loss*, dan alasan kuantitatif.
  - *Algorithmic Fallback Engine* untuk keandalan maksimal tanpa batas kuota.
- **⭐ Watchlist Management**:
  - Penambahan & penghapusan instrumen pantauan dengan penyimpanan permanen di database PostgreSQL.
  - Tombol preset cepat (`SOL`, `DOGE`, `XRP`, `GBP`, `XAU`) dan kustomisasi simbol.
- **📔 Trade Journal & Performance Simulator**:
  - Formulir simulasi trade terstruktur (Entry, SL, TP, Risk:Reward, Position Size, Strategi, Catatan Psikologi).
  - Sinkronisasi instan satu klik dari kartu AI Signal ke formulir Trade Journal.
  - Evaluasi penutupan posisi (*Close Trade*) dengan kalkulasi otomatis *Win Rate (%)* dan *Total PnL ($)*.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts**: [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) (TradingView)
- **Icons**: [Lucide React](https://lucide.dev/)
- **ORM**: [Prisma ORM](https://www.prisma.io/)
- **Database**: [Neon](https://neon.tech/) / [Supabase](https://supabase.com/) (Serverless PostgreSQL)
- **Data Fetching & State**: [SWR](https://swr.vercel.app/)

---

## 🚀 Panduan Menjalankan Secara Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/SyauQillah173/BetaTech-Trade-Analytics.git
cd BetaTech-Trade-Analytics
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi database PostgreSQL (Neon / Supabase) Anda:
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 4. Sinkronisasi Skema Database
```bash
npx prisma db push
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## ☁️ Panduan Deploy ke Vercel

1. **Import Repository**:
   - Buka [Vercel Dashboard](https://vercel.com/dashboard).
   - Klik **"Add New..."** -> **"Project"**.
   - Pilih repositori `BetaTech-Trade-Analytics`.
2. **Environment Variables**:
   Tambahkan variabel lingkungan di pengaturan proyek Vercel:
   - `DATABASE_URL`: Connection string pooling database Neon Anda.
   - `DIRECT_URL`: Direct connection string database Neon Anda.
   - *(Opsional)* `GEMINI_API_KEY`: API Key Gemini untuk fitur AI.
3. **Deploy**:
   - Klik tombol **"Deploy"**. Vercel akan otomatis menjalankan `prisma generate` via `postinstall` dan melakukan *production build*!

---

## 📄 Lisensi
MIT License © 2026 SyauQillah173 / BetaTech Analytics.
