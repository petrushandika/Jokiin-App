import { Hono } from "hono";
import { dbRead } from "../lib/database.ts";
import { categories } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { ok } from "../lib/response.ts";

const categoriesRoute = new Hono();

// GET /categories — Daftar semua kategori aktif
categoriesRoute.get("/", async (c) => {
  const list = await dbRead.query.categories.findMany({
    where: eq(categories.is_active, true),
    orderBy: (cat, { asc }) => [asc(cat.sort_order), asc(cat.name)],
  });
  return c.json(ok(list));
});

// GET /categories/:id — Detail kategori
categoriesRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const category = await dbRead.query.categories.findFirst({
    where: eq(categories.id, id),
  });
  if (!category) {
    return c.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan", details: null } }, 404);
  }
  return c.json(ok(category));
});

export default categoriesRoute;
