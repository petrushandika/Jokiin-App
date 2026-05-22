# MVP Roadmap — JokiIn

> Minimum Viable Product yang fokus pada core value: **customer bisa order → worker terima → bayar aman → selesai**.
> Semua fitur advanced dipisah ke fase berikutnya.

---

## Prinsip MVP

1. **Validasi dulu** — buktikan orang mau pakai sebelum build fitur kompleks
2. **Core loop dulu** — order → match → escrow → selesai harus sempurna sebelum fitur lain
3. **Manual dulu yang bisa manual** — verifikasi worker bisa manual admin, belum perlu otomatis penuh
4. **Satu platform** — web only, responsif, belum perlu mobile app

---

## Scope MVP vs Fase Berikutnya

| Fitur                                    | MVP | Fase 2 | Fase 3 |
| ---------------------------------------- | --- | ------ | ------ |
| Registrasi customer & worker             | ✅  |        |        |
| OTP WhatsApp                             | ✅  |        |        |
| Buat order (form terstruktur)            | ✅  |        |        |
| AI analisis kesulitan (Groq/Mistral)    | ✅  |        |        |
| Matchmaking broadcast Gojek-style        | ✅  |        |        |
| Escrow Midtrans (hold & release)         | ✅  |        |        |
| Chat per order                           | ✅  |        |        |
| Submit hasil + approve/tolak             | ✅  |        |        |
| Revisi (kuota fix, belum dynamic)        | ✅  |        |        |
| Rating & review sederhana                | ✅  |        |        |
| Notifikasi in-app + WA                   | ✅  |        |        |
| Deadline countdown real-time             | ✅  |        |        |
| Dashboard customer (basic)               | ✅  |        |        |
| Dashboard worker (basic)                 | ✅  |        |        |
| Admin panel (basic)                      | ✅  |        |        |
| Verifikasi worker manual admin           | ✅  |        |        |
| Badge sistem (5 level)                   | ✅  |        |        |
| Wallet internal + withdraw               | ✅  |        |        |
| Dark mode                                | ✅  |        |        |
| UU PDP compliance (consent + hapus data) | ✅  |        |        |
| Halaman explore worker                   |     | ✅     |        |
| Blind review system                      |     | ✅     |        |
| Reputasi multidimensi (weighted score)   |     | ✅     |        |
| AI matching via pgvector                 |     | ✅     |        |
| Amendment system                         |     | ✅     |        |
| Scope guard AI di chat                   |     | ✅     |        |
| Draft preview (watermarked)              |     | ✅     |        |
| Moderasi chat otomatis                   |     | ✅     |        |
| Emergency order + surge pricing          |     | ✅     |        |
| Escrow parsial (milestone)               |     | ✅     |        |
| Customer level & loyalty                 |     | ✅     |        |
| Worker favorit + waiting list            |     | ✅     |        |
| Voucher & promo                          |     | ✅     |        |
| Subscription Pro worker                  |     | ✅     |        |
| Referral system                          |     | ✅     |        |
| Analytics worker lengkap                 |     | ✅     |        |
| Anti-plagiarisme (Copyleaks)             |     |        | ✅     |
| Joki team (multi-worker)                 |     |        | ✅     |
| Konsultasi sebelum order                 |     |        | ✅     |
| Partnership institusi                    |     |        | ✅     |
| Featured listing                         |     |        | ✅     |

---

## Timeline MVP — 16 Minggu

```mermaid
gantt
    title JokiIn MVP Development Timeline
    dateFormat  YYYY-MM-DD
    section Fondasi
    Setup monorepo & boilerplate       :f1, 2026-06-01, 7d
    Database schema & migrations       :f2, after f1, 7d
    Auth system (Better Auth + OTP WA) :f3, after f2, 7d

    section Core Order
    Form order + AI analisis (Claude)  :o1, after f3, 7d
    Escrow Midtrans (hold + webhook)   :o2, after o1, 7d
    Matchmaking broadcast + Socket.io  :o3, after o2, 10d

    section Pengerjaan
    Chat per order                     :c1, after o3, 7d
    Submit hasil + approve/tolak       :c2, after c1, 5d
    Revisi + deadline countdown        :c3, after c2, 5d

    section Trust & Reputasi
    Rating & review (basic)            :r1, after c3, 5d
    Badge system + penalti             :r2, after r1, 5d
    Wallet + withdraw                  :r3, after r2, 7d

    section Dashboard & Admin
    Dashboard customer & worker       :d1, after r3, 7d
    Admin panel basic                  :d2, after d1, 7d
    Notifikasi berjenjang + BullMQ     :d3, after d2, 5d

    section Launch Prep
    Security hardening + rate limiting :s1, after d3, 5d
    E2E testing (Playwright)           :s2, after s1, 5d
    Beta testing (100 user terbatas)   :s3, after s2, 7d
    Bug fixing & stabilisasi           :s4, after s3, 7d
    Launch MVP                         :milestone, after s4, 0d
```

---

## Milestone Detail

### Milestone 1 — Fondasi (Minggu 1–3)

**Goal:** Infrastruktur siap, auth jalan, database running.

**Deliverable:**

- [ ] Monorepo `pnpm workspaces` + Turborepo setup
- [ ] Next.js 16 (web) + Hono/Bun (api) berjalan di local
- [ ] Docker Compose: PostgreSQL 17, Redis 8
- [ ] Drizzle schema + migration semua tabel MVP
- [ ] Better Auth: register, login, logout, session
- [ ] OTP WhatsApp via Fonnte
- [ ] CI/CD: GitHub Actions → Vercel (web) + Railway (api)
- [ ] Environment: `.env.example` lengkap

**Definition of Done:** User bisa daftar dan login, semua tabel sudah ada di DB.

---

### Milestone 2 — Core Order Flow (Minggu 4–7)

**Goal:** Customer bisa buat order dan bayar, dana masuk escrow.

**Deliverable:**

- [ ] Form order terstruktur (semua field wajib + opsional)
- [ ] Integrasi AI (Groq/Mistral via Vercel AI SDK): analisis kesulitan → skor + harga minimum
- [ ] Validasi budget: warning jika di bawah minimum
- [ ] Integrasi Midtrans Snap: inisiasi payment
- [ ] Webhook handler Midtrans dengan idempotency key
- [ ] Escrow record dibuat setelah payment confirmed
- [ ] BullMQ worker: matchmaking broadcast
- [ ] Socket.io: koneksi real-time customer & worker
- [ ] Notifikasi order baru ke worker (in-app + Web Push)
- [ ] Worker: tampilan order masuk, accept/tolak dalam 5 menit
- [ ] Logika: worker pertama yang accept → order dikunci

**Definition of Done:** Customer bisa bayar, worker menerima notifikasi, dan bisa accept order.

---

### Milestone 3 — Pengerjaan & Penyelesaian (Minggu 8–10)

**Goal:** Worker bisa kerjakan dan submit, customer bisa approve.

**Deliverable:**

- [ ] Chat per order (Socket.io room per order ID)
- [ ] Upload file di chat (Uploadthing → R2)
- [ ] Blokir dasar di chat: nomor HP, email, link WA
- [ ] Countdown deadline real-time (client-side timer + server sync)
- [ ] BullMQ worker: deadline reminder (H-6, H-2, H-30menit)
- [ ] Worker: upload hasil kerja (file + catatan)
- [ ] Watermark PDF otomatis pada file hasil (PDF-lib)
- [ ] Customer: approve / request revisi
- [ ] Kuota revisi (fix: 1–3 berdasarkan difficulty × waktu)
- [ ] Auto-approve jika customer tidak respons dalam 2× waktu pengerjaan
- [ ] Release escrow ke wallet worker setelah approve
- [ ] Pending 48 jam di wallet sebelum masuk balance tersedia

**Definition of Done:** Full loop order selesai — dari buat order sampai dana masuk wallet worker.

---

### Milestone 4 — Trust & Reputasi (Minggu 11–12)

**Goal:** Sistem kepercayaan dasar berfungsi.

**Deliverable:**

- [ ] Form rating customer ke worker (3 dimensi: kualitas, komunikasi, waktu)
- [ ] Rating worker ke customer
- [ ] Kalkulasi overall rating sederhana (rata-rata)
- [ ] Badge system: SPROUT → APEX (threshold manual awal)
- [ ] Sistem penalti otomatis (cancel, telat, tidak submit)
- [ ] Strike counter + suspend otomatis saat strike ≥ 3 dalam 30 hari
- [ ] Profil publik worker: badge, rating, jumlah order selesai
- [ ] Verifikasi social media: flow kode unik di bio
- [ ] Onboarding checklist worker (progress bar)
- [ ] Wallet: request withdraw + OTP + antrian proses

**Definition of Done:** Rating berfungsi, badge tampil, worker bisa withdraw.

---

### Milestone 5 — Dashboard & Admin (Minggu 13–14)

**Goal:** Semua pihak punya visibility atas aktivitas mereka.

**Deliverable:**

- [ ] Dashboard customer: order aktif, riwayat, status real-time
- [ ] Dashboard worker: earning, order aktif, skor, grafik penghasilan
- [ ] Admin panel: login terpisah, IP whitelist
- [ ] Admin: antrian verifikasi worker (approve/reject)
- [ ] Admin: tabel semua order + filter + detail
- [ ] Admin: dispute manual (open/resolve)
- [ ] Admin: suspend/ban user
- [ ] Admin: kelola withdraw queue (approve/reject)
- [ ] Notifikasi email (Resend): konfirmasi order, hasil, dispute
- [ ] Novu setup: orchestrasi semua channel notifikasi

**Definition of Done:** Admin bisa verifikasi worker dan handle dispute, semua dashboard fungsional.

---

### Milestone 6 — Stabilisasi & Launch (Minggu 15–16)

**Goal:** Platform aman, stabil, dan siap dipakai publik terbatas.

**Deliverable:**

- [ ] Rate limiting semua endpoint kritis (Redis sliding window)
- [ ] Sentry setup: error tracking + alerting
- [ ] Better Stack: uptime monitoring
- [ ] Security audit: CSRF, HSTS, CSP headers (Helmet)
- [ ] Argon2 password hashing
- [ ] 2FA wajib untuk admin, opsional untuk worker
- [ ] Playwright E2E tests: happy path order, payment, chat, withdraw
- [ ] Load testing: 500 concurrent users minimum
- [ ] Landing page + halaman cara kerja
- [ ] ToS & Privacy Policy (halaman statis)
- [ ] Beta: invite 100 customer + 20 worker terpilih
- [ ] Bug fixing sprint (7 hari)
- [ ] Soft launch dengan traffic terbatas

**Definition of Done:** 0 critical bugs, uptime > 99% dalam seminggu beta, 10+ order berhasil end-to-end.

---

## Struktur Boilerplate

### Root `package.json`

```json
{
  "name": "jokiin",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "db:generate": "bun run --cwd packages/db generate",
    "db:migrate": "bun run --cwd packages/db migrate",
    "db:studio": "bun run --cwd packages/db studio"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.8.0"
  },
  "workspaces": ["apps/*", "packages/*", "workers/*"]
}
```

### `apps/web` — Next.js 16

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (customer)/
│   │   ├── dashboard/page.tsx
│   │   ├── orders/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── explore/page.tsx
│   ├── (worker)/
│   │   ├── dashboard/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   └── wallet/page.tsx
│   ├── (admin)/
│   │   ├── dashboard/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── worker/page.tsx
│   │   ├── disputes/page.tsx
│   │   └── withdrawals/page.tsx
│   ├── layout.tsx
│   └── page.tsx           ← landing page
├── components/
│   ├── ui/                ← shadcn/ui components
│   ├── order/
│   ├── chat/
│   ├── worker/
│   └── shared/
├── hooks/
├── lib/
│   ├── auth.ts            ← Better Auth client
│   ├── api.ts             ← API client helper
│   └── socket.ts          ← Socket.io client
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### `apps/api` — Hono + Bun

```
apps/api/
├── src/
│   ├── index.ts           ← entry point Hono app
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── worker.ts
│   │   ├── chat.ts
│   │   ├── payments.ts
│   │   ├── wallets.ts
│   │   ├── reviews.ts
│   │   └── admin/
│   ├── middleware/
│   │   ├── auth.ts        ← session validation
│   │   ├── rateLimit.ts
│   │   └── logger.ts
│   ├── services/
│   │   ├── matchmaking.ts
│   │   ├── escrow.ts
│   │   ├── ai.ts          ← AI provider calls (Groq/Mistral)
│   │   ├── notification.ts
│   │   └── withdraw.ts
│   ├── socket/
│   │   ├── index.ts       ← Socket.io setup
│   │   ├── handlers/
│   │   └── middleware/
│   └── lib/
│       ├── db.ts          ← Drizzle client
│       ├── redis.ts
│       └── midtrans.ts
└── package.json
```

### `packages/db` — Drizzle Schema

```
packages/db/
├── schema.ts              ← semua tabel (lihat 01-database-schema.ts)
├── index.ts               ← export db client
├── migrate.ts             ← migration runner
├── drizzle.config.ts
└── package.json
```

### `packages/validators` — Zod Schemas

```
packages/validators/
├── order.ts               ← CreateOrderSchema, UpdateOrderSchema
├── user.ts                ← RegisterSchema, LoginSchema
├── review.ts              ← ReviewSchema
├── withdraw.ts            ← WithdrawSchema
└── index.ts
```

### `workers/deadline` — BullMQ

```
workers/deadline/
├── src/
│   ├── index.ts           ← worker entry
│   ├── jobs/
│   │   ├── deadlineReminder.ts    ← H-6, H-2, H-30menit
│   │   ├── autoApprove.ts         ← auto-approve setelah X jam
│   │   ├── escalation.ts          ← broadcast ke batch berikutnya
│   │   └── penaltyApply.ts        ← penalti setelah deadline lewat
│   └── queues.ts
└── package.json
```

### `docker-compose.yml`

```yaml
version: "3.9"
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: jokiin
      POSTGRES_USER: jokiin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:8-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  pgdata:
```

### `.env.example`

```env
# App
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://jokiin:secret@localhost:5432/jokiin
DATABASE_URL_READONLY=postgresql://jokiin:secret@localhost:5432/jokiin

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=change-this-to-random-32-chars
BETTER_AUTH_URL=http://localhost:3000

# AI (Free Tier)
GROQ_API_KEY=gsk_xxx
MISTRAL_API_KEY=xxx
CEREBRAS_API_KEY=xxx
AI_PRIMARY_PROVIDER=groq

# Payment
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...
MIDTRANS_WEBHOOK_SECRET=...
MIDTRANS_IS_PRODUCTION=false

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=jokiin-dev
CLOUDFLARE_R2_PUBLIC_URL=https://...

# Notifications
FONNTE_TOKEN=...
RESEND_API_KEY=re_...
NOVU_API_KEY=...

# Monitoring (opsional untuk dev)
SENTRY_DSN=
BETTER_STACK_SOURCE_TOKEN=
```

---

## Definition of MVP Success

Platform dinyatakan **MVP berhasil** jika dalam 30 hari setelah soft launch:

- [ ] ≥ 50 order berhasil diselesaikan end-to-end
- [ ] ≥ 30 worker aktif (minimal 1 order selesai)
- [ ] ≥ 200 customer terdaftar
- [ ] Order success rate ≥ 80%
- [ ] Dispute rate < 15%
- [ ] Tidak ada critical bug yang menyebabkan kehilangan dana
- [ ] Uptime ≥ 99% dalam 30 hari pertama
- [ ] Net Promoter Score (NPS) ≥ 30 dari survei beta user

---

## Risiko & Mitigasi

| Risiko                           | Probabilitas | Dampak | Mitigasi                                                           |
| -------------------------------- | ------------ | ------ | ------------------------------------------------------------------ |
| Tidak ada worker yang mau daftar | Tinggi       | Kritis | Pre-recruit 20 worker sebelum launch via komunitas mahasiswa       |
| Midtrans webhook gagal           | Sedang       | Kritis | Idempotency key + retry logic + monitoring ketat                   |
| Socket.io tidak scale            | Sedang       | Tinggi | Redis adapter dari awal, load test sebelum launch                  |
| Worker ghosting setelah accept   | Tinggi       | Tinggi | Penalti berat + auto-cancel dengan refund jika tidak respons 2 jam |
| Customer dispute berlebihan      | Sedang       | Sedang | Deskripsi terkunci + panduan jelas saat buat order                 |
| Regulasi konten akademik         | Rendah       | Tinggi | Disclaimer kuat di ToS + posisi platform sebagai marketplace       |

---

_Dokumen ini adalah panduan development aktif. Update setiap sprint._

**Versi:** 1.0.0 | **Tanggal:** 21 Mei 2026

---

## Addendum: CMS MVP Scope

CMS masuk ke **Fase 2** setelah core platform stabil. Tapi beberapa komponen CMS perlu disiapkan sejak MVP karena mempengaruhi SEO dari hari pertama launch.

### Yang Masuk MVP (Fase 1)

| Fitur CMS                                  | Alasan Masuk MVP                              |
| ------------------------------------------ | --------------------------------------------- |
| Halaman statis: FAQ, About, Cara Kerja     | Dibutuhkan sebelum launch untuk trust visitor |
| Global settings (nama, logo, footer)       | Identitas platform dari hari pertama          |
| Landing page per kategori (hardcoded dulu) | SEO dari hari pertama, data real dari DB      |
| Basic meta tags per halaman                | Minimal SEO hygiene                           |
| Sitemap.xml otomatis                       | Agar Google mulai index sejak launch          |

### Yang Masuk Fase 2 (Post-MVP)

| Fitur CMS                                       | Timeline                 |
| ----------------------------------------------- | ------------------------ |
| Blog editor (Tiptap) + workflow editorial       | Bulan 2–3 setelah launch |
| Media library (R2 upload)                       | Bulan 2                  |
| Newsletter + subscriber management              | Bulan 3                  |
| Category landing page via CMS (bukan hardcoded) | Bulan 3                  |
| SEO redirect manager                            | Bulan 3                  |
| Revisi history & version control                | Bulan 4                  |
| FAQ manager via CMS                             | Bulan 4                  |
| Scheduled publish                               | Bulan 4                  |
| Newsletter stats (open/click)                   | Bulan 5                  |

### Milestone CMS Fase 2 — 10 Minggu

```mermaid
gantt
    title CMS Development — Fase 2
    dateFormat  YYYY-MM-DD
    section Fondasi
    Tiptap editor setup + schema migration    :c1, 2026-11-01, 14d
    Media library (R2 upload + browser)      :c2, after c1, 10d
    section Konten
    Blog CRUD + workflow draft/publish       :c3, after c2, 14d
    Category landing via CMS                 :c4, after c3, 10d
    Static pages editor (FAQ, About)         :c5, after c4, 7d
    section Distribution
    Newsletter subscriber + double opt-in    :c6, after c5, 7d
    Newsletter editor + send + stats         :c7, after c6, 10d
    section SEO Tools
    Redirect manager                         :c8, after c7, 5d
    Sitemap auto-update + RSS feed           :c9, after c8, 5d
    Preview link + scheduled publish         :c10, after c9, 7d
```

### Struktur Folder CMS di `apps/web`

```
apps/web/app/
├── (public)/
│   ├── blog/
│   │   ├── page.tsx              ← daftar artikel
│   │   ├── [slug]/page.tsx       ← detail artikel
│   │   └── feed.xml/route.ts     ← RSS feed
│   ├── kategori/
│   │   └── [slug]/page.tsx       ← category landing (ISR 1 jam)
│   ├── faq/page.tsx
│   ├── about/page.tsx
│   └── cara-kerja/page.tsx
└── (admin)/
    └── cms/
        ├── posts/
        │   ├── page.tsx           ← list semua post
        │   ├── new/page.tsx       ← editor baru
        │   └── [id]/edit/page.tsx ← edit existing
        ├── pages/page.tsx         ← static pages editor
        ├── media/page.tsx         ← media library
        ├── categories/page.tsx
        ├── tags/page.tsx
        ├── newsletter/
        │   ├── subscribers/page.tsx
        │   └── sends/page.tsx
        ├── redirects/page.tsx
        └── settings/page.tsx
```

### Dependencies Tambahan untuk CMS

```json
{
  "@tiptap/react": "^3.x",
  "@tiptap/starter-kit": "^3.x",
  "@tiptap/extension-image": "^3.x",
  "@tiptap/extension-table": "^3.x",
  "@tiptap/extension-code-block-lowlight": "^3.x",
  "@tiptap/extension-youtube": "^3.x",
  "next-sitemap": "^4.x",
  "rss": "^1.x",
  "reading-time": "^1.x",
  "slugify": "^1.x",
  "date-fns": "^4.x"
}
```

### Strategi Konten Awal (Content Plan)

Sebelum launch Fase 2 CMS, siapkan minimal:

| Tipe             | Jumlah               | Contoh Topik                                           |
| ---------------- | -------------------- | ------------------------------------------------------ |
| Blog artikel     | 10 post              | "Cara Cepat Selesaikan Skripsi", "5 Tips Tugas Coding" |
| Category landing | 1 per kategori utama | /kategori/matematika, /kategori/coding                 |
| FAQ              | 20 item              | Dibagi: customer (10), worker (5), payment (5)         |
| Halaman statis   | 3                    | About, Cara Kerja, FAQ                                 |

Konten awal bisa ditulis manual dan di-seed lewat migration script sebelum CMS editor selesai dibangun.
