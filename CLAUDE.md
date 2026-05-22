# CLAUDE.md — JokiIn Platform

## Project Overview

JokiIn adalah platform marketplace dua sisi (two-sided marketplace) yang menghubungkan **customer** (siswa/mahasiswa yang butuh bantuan tugas) dengan **worker** (tenaga ahli terverifikasi). Menggunakan model matchmaking real-time bergaya Gojek dengan sistem escrow pembayaran.

Dokumentasi lengkap ada di `docs/`:
- `docs/PRD.md` — Product Requirements Document
- `docs/ARCHITECTURE.md` — Arsitektur sistem + boilerplate
- `docs/MVP.md` — Scope MVP + milestone 16 minggu
- `docs/SCHEMA.md` — Database schema (human-readable)
- `docs/ROADMAP.md` — Roadmap Fase 1–4

---

## Tech Stack

### Frontend (`apps/web`)
- **Next.js 16.2.6 LTS** — SSR/SSG/ISR, Turbopack, React Compiler, PPR
- **TypeScript 5.8** — strict mode wajib
- **Tailwind CSS v4.1** — Lightning CSS engine
- **shadcn/ui** — component library
- **TanStack Query v5** — server state + caching
- **Zustand v5** — client state
- **React Hook Form v7 + Zod v4** — form handling + validation
- **Socket.io Client v4.8** — WebSocket real-time
- **Tiptap v3** — rich text editor (CMS, Fase 2)

### Backend (`apps/api`)
- **Bun 1.3.14** — runtime
- **Hono v4** — HTTP framework
- **Drizzle ORM v1-beta** — type-safe ORM, source of truth di `packages/db/schema.ts`
- **Better Auth v1.2** — authentication
- **Zod v4** — validation (shared dengan frontend via `packages/validators`)

### Database & Cache
- **PostgreSQL 17** (Neon) — primary database + ACID transactions
- **Redis 8** (Upstash) — cache, session, Pub/Sub untuk Socket.io
- **pgvector 0.8** — vector similarity untuk AI matching (Fase 3)

### AI & Payment
- **Claude API** (`claude-sonnet-4-5`) via Vercel AI SDK v4 — analisis kesulitan tugas + scope guard
- **Midtrans Snap v3** — payment gateway Indonesia + escrow
- **BullMQ v5** — job queue (deadline reminders, broadcast matchmaking, notifikasi)

### Infrastructure
- **Vercel** — deploy frontend
- **Railway** — deploy backend + BullMQ workers
- **Cloudflare** — CDN, WAF, DDoS protection, R2 object storage
- **Docker Compose** — local dev (PostgreSQL + Redis)
- **GitHub Actions** — CI/CD
- **Turborepo** — monorepo build pipeline
- **Biome** — linting + formatting

---

## Monorepo Structure

```
jokiin/
├── apps/
│   ├── web/                  # Next.js 16 — UI + Server Actions
│   └── api/                  # Hono v4 + Bun — REST + WebSocket
├── packages/
│   ├── db/                   # Drizzle schema + migrations (source of truth)
│   ├── types/                # Shared TypeScript types
│   ├── validators/           # Zod v4 schemas (shared frontend & backend)
│   └── ai/                   # Claude API wrapper + prompts
├── workers/
│   ├── deadline/             # BullMQ: deadline reminders + auto-approve
│   ├── broadcast/            # BullMQ: matchmaking order broadcast
│   └── notify/               # BullMQ: Novu notification triggers
├── docs/                     # Semua dokumentasi
├── docker-compose.yml
├── turbo.json
├── biome.json
└── package.json
```

---

## Development Commands

```bash
# Setup
bun install
docker-compose up -d        # PostgreSQL + Redis
cp .env.example .env.local

# Database
bun run db:generate         # Generate migration dari schema.ts
bun run db:migrate          # Jalankan migration
bun run db:studio           # Drizzle Studio (localhost:4983)
bun run db:seed             # Seed data development
bun run db:reset            # Reset + re-migrate (hati-hati!)

# Development
bun run dev                 # Semua apps paralel
bun run dev:web             # Web saja (localhost:3000)
bun run dev:api             # API saja (localhost:3001)

# Quality
bun run lint                # Biome check
bun run typecheck           # TypeScript strict check
bun run test                # Semua tests
bun run test:unit           # Bun Test
bun run test:e2e            # Playwright

# Build
bun run build
```

### Local Service URLs
| Service | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (Hono) | http://localhost:3001 |
| Admin Panel | http://localhost:3000/admin |
| API Docs | http://localhost:3001/docs |
| Drizzle Studio | http://localhost:4983 |

---

## Architecture Principles

### Escrow-First (Critical)
Semua transaksi finansial HARUS menggunakan PostgreSQL ACID transaction + idempotency key. Jangan pernah update saldo atau status escrow tanpa database transaction. Webhook Midtrans wajib dicek idempotency sebelum diproses.

### Type-Safe End-to-End
TypeScript strict dari database (Drizzle schema) → shared types (`packages/types`) → validator (`packages/validators`) → frontend. Jangan gunakan `any`, jangan bypass type checking.

### Real-Time First
Socket.io + Redis Pub/Sub untuk semua interaksi yang butuh respons instan (notifikasi order, chat, countdown). Multiple Socket.io instances harus pakai Redis adapter dari awal.

### Race Condition Safety
Order locking saat worker accept HARUS atomic (PostgreSQL SELECT FOR UPDATE atau Redis SETNX). Broadcast ke banyak worker bersamaan — hanya satu yang boleh berhasil accept.

---

## Database Conventions

- **Schema source of truth:** `packages/db/schema.ts` — jangan edit manual di migration
- **Tabel:** `snake_case` plural (`worker_profiles`, `order_milestones`)
- **Kolom:** `snake_case` (`created_at`, `worker_id`)
- **TypeScript variables:** `camelCase` (`workerProfiles`)
- **Index naming:** `{table}_{col}_idx`
- **Foreign keys:** `{referenced_table}_id` (`worker_id`, `category_id`)
- **Primary keys:** UUID (`gen_random_uuid()`)
- **Soft delete:** kolom `deleted_at` timestamp (bukan hard delete, untuk UU PDP)
- **Timestamps:** semua tabel wajib punya `created_at` dan `updated_at`

### Write vs Read Database
- INSERT, UPDATE, DELETE → `db` (primary)
- SELECT yang butuh strong consistency (setelah write) → `db` (primary)
- SELECT explore workers, blog posts → `dbRead` (read replica)

---

## API Conventions

### Standard Response Format
```typescript
// Success
{ success: true, data: T, meta: object | null, error: null }

// Error
{ success: false, data: null, error: { code: string, message: string, details: object | null } }
```

### Error Codes
Gunakan konstanta string uppercase: `ORDER_NOT_FOUND`, `INSUFFICIENT_BALANCE`, `SLOT_FULL`, dll.

### Rate Limiting
Semua endpoint kritis wajib ada rate limit via Redis sliding window. Lihat `apps/api/src/middleware/rateLimit.ts`.

---

## Key Business Rules

### Matchmaking
- Worker hanya dapat broadcast jika: online, slot tersedia (`currentActive < maxActive`), punya skor di kategori, badge cukup untuk difficulty, estimasi waktu + 1 jam buffer ≤ sisa deadline
- Sorting: `(reputationScore × 0.5) + (categoryScore × 0.3) + (badgeBonus × 0.2)`
- Batch 1: top 15 worker, timer 5 menit. Jika tidak ada yang accept → batch 2, dst.
- Emergency order (deadline < 3 jam): broadcast semua sekaligus + surge pricing 1.5×

### Escrow
- Dana customer ditahan setelah payment webhook confirmed (status: `held`)
- Release ke wallet worker HANYA setelah customer approve atau auto-approve timeout
- Pending di wallet 48 jam sebelum masuk balance tersedia
- Komisi per badge: SPROUT 15%, SPARK 13%, BLAZE 12%, PRIME 10%, APEX 8%

### Revisi
- Kuota revisi ditentukan oleh kombinasi difficulty × waktu pengerjaan (lihat tabel di PRD)
- Revisi berbayar setelah kuota habis: 25% dari harga order
- Perubahan scope HARUS lewat Amendment, bukan via chat

### Chat Moderation
Setiap pesan difilter sebelum terkirim. Blokir: nomor HP (08xx/+62xx), email, link WhatsApp, nomor rekening. Ini kritis untuk mencegah transaksi di luar platform.

---

## Security Requirements

- Password: Argon2 hashing (bukan bcrypt)
- Session: httpOnly, secure, sameSite=strict cookie via Better Auth
- Semua financial operations: wajib OTP WhatsApp
- Admin panel: subdomain terpisah + IP whitelist + 2FA wajib
- Audit log: semua aksi kritis disimpan di `audit_logs`, tidak bisa dihapus
- CSRF, HSTS, CSP headers wajib (via Hono `secureHeaders()` + Next.js config)
- SQL injection: tidak mungkin karena Drizzle parameterized queries — jangan pakai raw SQL kecuali benar-benar diperlukan

---

## Testing

- **Unit tests:** Bun Test (`bun test`)
- **E2E tests:** Playwright — happy path wajib di-cover: order flow, payment, chat, withdraw
- **Load test:** minimal 500 concurrent users sebelum launch
- Jangan mock database di integration tests — pakai test database yang nyata

---

## Commit Convention

```
feat: tambah fitur X
fix: perbaiki bug Y
docs: update dokumentasi Z
refactor: refactor komponen A
test: tambah test untuk B
chore: update dependency C
```

---

## MVP Scope (Fase 1)

Yang masuk MVP (harus selesai sebelum launch):
registrasi/login, OTP WhatsApp, form order + AI analisis, escrow Midtrans, matchmaking broadcast, chat per order, submit hasil + approve, revisi (kuota fix), rating dasar, badge system, wallet + withdraw, dashboard customer & worker, admin panel dasar, verifikasi worker manual.

Yang **tidak** masuk MVP (jangan build dulu):
explore worker, blind review, amendment system, scope guard AI di chat, pgvector matching, CMS blog editor, customer loyalty, voucher, referral.

---

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel kritis:
- `DATABASE_URL` + `DATABASE_URL_READONLY`
- `REDIS_URL`
- `BETTER_AUTH_SECRET` (min 32 karakter random)
- `ANTHROPIC_API_KEY`
- `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` + `MIDTRANS_WEBHOOK_SECRET`
- `CLOUDFLARE_R2_*`
- `FONNTE_TOKEN` (WhatsApp OTP)
- `CRON_SECRET` (BullMQ worker auth)
