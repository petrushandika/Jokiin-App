<div align="center">

# 🎯 JokiIn

### Platform Task Marketplace — Matchmaking Cerdas untuk Siswa & Mahasiswa Indonesia

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6_LTS-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Bun](https://img.shields.io/badge/Bun-1.3.14-F9F1E1?logo=bun&logoColor=black)](https://bun.sh)
[![Hono](https://img.shields.io/badge/Hono-v4-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

**Menghubungkan customer dengan worker terpercaya secara real-time — aman, transparan, dan terukur.**

[🚀 Demo](#) · [📋 PRD](./PRD.md) · [🗺️ Roadmap](./ROADMAP.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🗄️ Schema](./SCHEMA.md) · [📦 MVP](./MVP.md)

</div>

---

## 📖 Tentang JokiIn

JokiIn adalah **platform marketplace dua sisi** (two-sided marketplace) yang menghubungkan:

- **Customer** — siswa, mahasiswa, dan kalangan umum yang membutuhkan bantuan pengerjaan tugas
- **Worker** — tenaga ahli terverifikasi yang menyediakan jasa pengerjaan secara profesional

Platform menggunakan sistem **matchmaking real-time bergaya Gojek** — customer membuat order, sistem broadcast ke worker paling eligible secara bersamaan, dan worker pertama yang menerima mendapat pekerjaan. Seluruh pembayaran melalui sistem **escrow** yang aman.

---

## ✨ Fitur Utama

| Fitur                        | Deskripsi                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| 🚀 **Matchmaking Real-time** | Broadcast Gojek-style, worker pertama accept dapat order    |
| 🔒 **Escrow Payment**        | Dana customer aman, dilepas setelah customer approve hasil  |
| 🤖 **AI Task Analysis**      | Claude API nilai kesulitan tugas & harga minimum otomatis   |
| ⭐ **Reputasi Multidimensi** | 5 komponen weighted score + blind review system             |
| 💬 **Chat per Order**        | Terisolasi, moderasi otomatis, blokir kontak eksternal      |
| 🏆 **Badge System**          | SPROUT → SPARK → BLAZE → PRIME → APEX                       |
| ⏱️ **Deadline Guard**        | Slot kapasitas worker, buffer otomatis, eskalasi bertahap   |
| 💰 **Wallet Internal**       | Saldo terakumulasi, withdraw T+1 hari kerja via bank        |
| 🛡️ **Trust System**          | Verifikasi social media, tes kemampuan, portofolio          |
| 📝 **Custom CMS**            | Blog, halaman statis, category landing, newsletter built-in |
| 📊 **Admin Panel**           | Dashboard lengkap, dispute resolution, moderasi konten      |
| 🔔 **Notifikasi Omni**       | In-app, WhatsApp, Email, Web Push via Novu                  |

---

## 🗂️ Dokumentasi

| Dokumen                              | Deskripsi                                     |
| ------------------------------------ | --------------------------------------------- |
| [README.md](./README.md)             | Ringkasan project, quick start, struktur      |
| [PRD.md](./PRD.md)                   | Product Requirements Document lengkap         |
| [MVP.md](./MVP.md)                   | Scope MVP, milestone, timeline 16 minggu      |
| [ROADMAP.md](./ROADMAP.md)           | Roadmap Fase 1–4, fitur per fase              |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arsitektur sistem, infrastruktur, boilerplate |
| [SCHEMA.md](./SCHEMA.md)             | ERD, deskripsi semua tabel & kolom            |
| [schema.ts](./schema.ts)             | Drizzle ORM schema (source of truth)          |

---

## 🛠️ Tech Stack

### Frontend

| Tech             | Versi      | Fungsi                         |
| ---------------- | ---------- | ------------------------------ |
| Next.js          | 16.2.6 LTS | Framework utama SSR/SSG/ISR    |
| TypeScript       | 5.8        | Type safety end-to-end         |
| Tailwind CSS     | v4.1       | Styling (Lightning CSS engine) |
| shadcn/ui        | 2026       | Component library              |
| TanStack Query   | v5         | Server state + caching         |
| Zustand          | v5         | Client state management        |
| React Hook Form  | v7         | Form handling                  |
| Zod              | v4         | Schema validation              |
| Tiptap           | v3         | Rich text editor (CMS)         |
| Socket.io Client | v4.8       | Real-time WebSocket            |

### Backend

| Tech        | Versi   | Fungsi                              |
| ----------- | ------- | ----------------------------------- |
| Bun         | 1.3.14  | Runtime (3× lebih cepat dari Node)  |
| Hono        | v4      | HTTP framework ultra-ringan         |
| Drizzle ORM | v1-beta | Type-safe ORM                       |
| Better Auth | v1.2    | Authentication                      |
| Jose        | v6      | JWT signing (edge-compatible)       |
| Zod         | v4      | Validation (shared dengan frontend) |

### Database & Cache

| Tech       | Versi       | Fungsi                          |
| ---------- | ----------- | ------------------------------- |
| PostgreSQL | 17 (Neon)   | Primary database + ACID         |
| Redis      | 8 (Upstash) | Cache, session, Pub/Sub         |
| pgvector   | 0.8         | Vector similarity (AI matching) |

### Infrastructure

| Tech           | Fungsi                         |
| -------------- | ------------------------------ |
| Vercel         | Deploy frontend + Edge Network |
| Railway        | Deploy backend + workers       |
| Cloudflare     | CDN, WAF, DDoS protection      |
| Cloudflare R2  | Object storage (egress gratis) |
| Docker         | Containerisasi local dev       |
| GitHub Actions | CI/CD pipeline                 |

### AI & Payment

| Tech                           | Fungsi                                  |
| ------------------------------ | --------------------------------------- |
| Claude API (claude-sonnet-4-5) | Analisis kesulitan tugas, scope guard   |
| Vercel AI SDK v4               | Structured output + streaming           |
| Midtrans Snap v3               | Payment gateway Indonesia               |
| BullMQ v5                      | Job queue (deadline, broadcast, notify) |

### Monitoring

| Tech               | Fungsi                             |
| ------------------ | ---------------------------------- |
| Sentry v8          | Error tracking + session replay    |
| Better Stack       | Log management + uptime monitoring |
| OpenTelemetry v1.9 | Distributed tracing                |
| Checkly            | Synthetic monitoring               |

---

## 📁 Struktur Monorepo

```
jokiin/
├── apps/
│   ├── web/                        # Next.js 16 — UI + Server Actions
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, Register
│   │   │   ├── (public)/           # Blog, Landing, Kategori
│   │   │   ├── (customer)/         # Dashboard customer
│   │   │   ├── (worker)/           # Dashboard worker
│   │   │   └── (admin)/            # Admin panel + CMS
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── api/                        # Hono v4 + Bun — REST + WebSocket
│       └── src/
│           ├── routes/
│           ├── middleware/
│           ├── services/
│           └── socket/
├── packages/
│   ├── db/                         # Drizzle schema + migrations
│   ├── types/                      # Shared TypeScript types
│   ├── validators/                 # Zod v4 schemas
│   └── ai/                         # Claude API wrapper
├── workers/
│   ├── deadline/                   # BullMQ: timer + eskalasi
│   ├── broadcast/                  # BullMQ: matchmaking
│   └── notify/                     # BullMQ: Novu triggers
├── docs/                           # Dokumentasi (folder ini)
├── .github/
│   └── workflows/                  # CI/CD pipelines
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Pastikan sudah terinstall
bun --version    # >= 1.3.0
docker --version # >= 24.0
git --version
```

### Setup Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourorg/jokiin.git
cd jokiin

# 2. Install semua dependencies
bun install

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local dan isi semua variabel

# 4. Jalankan services (PostgreSQL + Redis)
docker-compose up -d

# 5. Generate dan jalankan migration database
bun run db:generate
bun run db:migrate

# 6. Seed data awal (opsional, untuk development)
bun run db:seed

# 7. Jalankan semua apps sekaligus
bun run dev
```

### Akses Aplikasi

| Service        | URL                         |
| -------------- | --------------------------- |
| Web (Next.js)  | http://localhost:3000       |
| API (Hono)     | http://localhost:3001       |
| Admin Panel    | http://localhost:3000/admin |
| API Docs       | http://localhost:3001/docs  |
| Drizzle Studio | http://localhost:4983       |

### Commands Penting

```bash
# Development
bun run dev              # Jalankan semua apps paralel
bun run dev:web          # Web saja
bun run dev:api          # API saja

# Database
bun run db:generate      # Generate migration dari schema
bun run db:migrate       # Jalankan migration
bun run db:studio        # Buka Drizzle Studio
bun run db:seed          # Seed data development
bun run db:reset         # Reset + re-migrate (hati-hati!)

# Testing
bun run test             # Semua tests
bun run test:unit        # Unit tests (Bun Test)
bun run test:e2e         # E2E tests (Playwright)
bun run test:coverage    # Coverage report

# Build & Deploy
bun run build            # Build semua apps
bun run lint             # Lint semua packages
bun run typecheck        # TypeScript check
```

---

## 🔐 Environment Variables

```env
# ─── App ──────────────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
APP_NAME=JokiIn

# ─── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://jokiin:secret@localhost:5432/jokiin_dev
DATABASE_URL_READONLY=postgresql://jokiin:secret@localhost:5432/jokiin_dev

# ─── Redis ────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# ─── Auth ─────────────────────────────────────────────────────
BETTER_AUTH_SECRET=change-this-to-random-32-chars-minimum
BETTER_AUTH_URL=http://localhost:3000

# ─── AI ───────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# ─── Payment ──────────────────────────────────────────────────
MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
MIDTRANS_WEBHOOK_SECRET=xxx
MIDTRANS_IS_PRODUCTION=false

# ─── Storage ──────────────────────────────────────────────────
CLOUDFLARE_R2_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=jokiin-dev
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# ─── Notifications ────────────────────────────────────────────
FONNTE_TOKEN=xxx                    # WhatsApp OTP
RESEND_API_KEY=re_xxx               # Email transaksional
NOVU_API_KEY=xxx                    # Notification orchestration

# ─── Monitoring ───────────────────────────────────────────────
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
BETTER_STACK_SOURCE_TOKEN=xxx

# ─── Internal ─────────────────────────────────────────────────
CRON_SECRET=xxx                     # BullMQ worker auth
WEBHOOK_SECRET=xxx                  # Internal webhook validation
ADMIN_PANEL_ALLOWED_IPS=127.0.0.1  # Whitelist IP admin
```

---

## 🤝 Contributing

```bash
# Buat branch dari main
git checkout -b feat/nama-fitur

# Commit dengan conventional commits
git commit -m "feat: tambah fitur X"
git commit -m "fix: perbaiki bug Y"
git commit -m "docs: update dokumentasi Z"

# Push dan buat Pull Request
git push origin feat/nama-fitur
```

**Conventional Commits:** `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`

---

## 📄 Lisensi

MIT © 2026 JokiIn Team
