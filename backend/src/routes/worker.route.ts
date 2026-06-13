import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.ts";
import { db, dbRead } from "../lib/database.ts";
import {
  workerProfiles, workerCategoryScores, categories,
  portfolioItems, socialLinks,
} from "../../database/schema.ts";
import { eq, and } from "drizzle-orm";
import { ok, err } from "../lib/response.ts";

const worker = new Hono();

// GET /workers/me/categories — Kategori yang dimiliki worker + skor
worker.get("/me/categories", requireAuth, requireRole("worker"), async (c) => {
  const userId = c.get("userId");
  const profile = await dbRead.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, userId),
    with: {
      categoryScores: {
        with: { category: true },
      },
    },
  });
  if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);
  return c.json(ok(profile.categoryScores));
});

// POST /workers/me/categories — Daftar ke kategori baru
worker.post(
  "/me/categories",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.object({
    categoryId: z.string().uuid(),
  })),
  async (c) => {
    const userId = c.get("userId");
    const { categoryId } = c.req.valid("json");

    const profile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.user_id, userId),
    });
    if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

    const category = await dbRead.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });
    if (!category) return c.json(err("CATEGORY_NOT_FOUND", "Kategori tidak ditemukan"), 404);

    const existing = await db.query.workerCategoryScores.findFirst({
      where: and(
        eq(workerCategoryScores.worker_id, profile.id),
        eq(workerCategoryScores.category_id, categoryId),
      ),
    });
    if (existing) return c.json(err("ALREADY_REGISTERED", "Sudah terdaftar di kategori ini"), 409);

    const [score] = await db.insert(workerCategoryScores).values({
      worker_id: profile.id,
      category_id: categoryId,
    }).returning();

    return c.json(ok(score), 201);
  }
);

// DELETE /workers/me/categories/:categoryId — Keluar dari kategori
worker.delete(
  "/me/categories/:categoryId",
  requireAuth,
  requireRole("worker"),
  async (c) => {
    const userId = c.get("userId");
    const categoryId = c.req.param("categoryId");

    const profile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.user_id, userId),
    });
    if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

    await db.delete(workerCategoryScores).where(
      and(
        eq(workerCategoryScores.worker_id, profile.id),
        eq(workerCategoryScores.category_id, categoryId),
      )
    );

    return c.json(ok(null, { message: "Berhasil keluar dari kategori" }));
  }
);

// GET /workers/me/portfolio — Daftar portfolio
worker.get("/me/portfolio", requireAuth, requireRole("worker"), async (c) => {
  const userId = c.get("userId");
  const profile = await dbRead.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, userId),
  });
  if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

  const items = await dbRead.query.portfolioItems.findMany({
    where: eq(portfolioItems.worker_id, profile.id),
    orderBy: (p, { desc }) => [desc(p.created_at)],
  });

  return c.json(ok(items));
});

// POST /workers/me/portfolio — Tambah item portfolio
worker.post(
  "/me/portfolio",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    fileUrl: z.string().url(),
    categoryId: z.string().uuid().optional(),
  })),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const profile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.user_id, userId),
    });
    if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

    const [item] = await db.insert(portfolioItems).values({
      worker_id: profile.id,
      title: body.title,
      description: body.description,
      file_url: body.fileUrl,
      category_id: body.categoryId,
    }).returning();

    return c.json(ok(item), 201);
  }
);

// DELETE /workers/me/portfolio/:id — Hapus item portfolio
worker.delete("/me/portfolio/:id", requireAuth, requireRole("worker"), async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("id");

  const profile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, userId),
  });
  if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

  await db.delete(portfolioItems).where(
    and(eq(portfolioItems.id, itemId), eq(portfolioItems.worker_id, profile.id))
  );

  return c.json(ok(null, { message: "Portfolio dihapus" }));
});

// GET /workers/me/social-links — Daftar social links
worker.get("/me/social-links", requireAuth, requireRole("worker"), async (c) => {
  const userId = c.get("userId");
  const profile = await dbRead.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, userId),
  });
  if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

  const links = await dbRead.query.socialLinks.findMany({
    where: eq(socialLinks.worker_id, profile.id),
  });
  return c.json(ok(links));
});

// PUT /workers/me/social-links — Upsert social links
worker.put(
  "/me/social-links",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.array(z.object({
    platform: z.enum(["linkedin", "github", "instagram", "tiktok", "youtube", "behance"]),
    url: z.string().url(),
  })).max(6)),
  async (c) => {
    const userId = c.get("userId");
    const links = c.req.valid("json");

    const profile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.user_id, userId),
    });
    if (!profile) return c.json(err("PROFILE_NOT_FOUND", "Profil worker tidak ditemukan"), 404);

    // Delete existing, replace with new
    await db.delete(socialLinks).where(eq(socialLinks.worker_id, profile.id));

    if (links.length > 0) {
      await db.insert(socialLinks).values(
        links.map((l) => ({
          worker_id: profile.id,
          platform: l.platform,
          url: l.url,
        }))
      );
    }

    return c.json(ok(null, { message: "Social links berhasil disimpan" }));
  }
);

export default worker;
