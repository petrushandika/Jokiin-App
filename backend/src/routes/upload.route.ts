import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.ts";
import { rateLimit } from "../middlewares/rateLimit.ts";
import { uploadFile, validateFileUpload } from "../lib/storage.ts";
import { ok, err } from "../lib/response.ts";

const upload = new Hono();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
];

// POST /upload/avatar — Upload avatar user
upload.post(
  "/avatar",
  requireAuth,
  rateLimit({ max: 10, windowSeconds: 300 }),
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return c.json(err("NO_FILE", "File tidak ditemukan"), 400);

    try {
      validateFileUpload(file.type, file.size, ALLOWED_IMAGE_TYPES);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("INVALID_FILE_TYPE")) return c.json(err("INVALID_FILE_TYPE", "Format file tidak didukung. Gunakan JPG, PNG, atau WebP"), 400);
      if (msg === "FILE_TOO_LARGE") return c.json(err("FILE_TOO_LARGE", "Ukuran file maksimal 20MB"), 400);
      throw e;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile({ folder: "avatars", filename: file.name, buffer, contentType: file.type });

    return c.json(ok({ url }));
  }
);

// POST /upload/order — Upload attachment order (customer)
upload.post(
  "/order",
  requireAuth,
  rateLimit({ max: 20, windowSeconds: 300 }),
  async (c) => {
    const formData = await c.req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) return c.json(err("NO_FILE", "File tidak ditemukan"), 400);
    if (files.length > 10) return c.json(err("TOO_MANY_FILES", "Maksimal 10 file"), 400);

    const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    const urls: string[] = [];

    for (const file of files) {
      try {
        validateFileUpload(file.type, file.size, allTypes);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.startsWith("INVALID_FILE_TYPE")) return c.json(err("INVALID_FILE_TYPE", `Format file "${file.name}" tidak didukung`), 400);
        if (msg === "FILE_TOO_LARGE") return c.json(err("FILE_TOO_LARGE", `File "${file.name}" melebihi batas 20MB`), 400);
        throw e;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadFile({ folder: "orders", filename: file.name, buffer, contentType: file.type });
      urls.push(url);
    }

    return c.json(ok({ urls }));
  }
);

// POST /upload/submission — Upload hasil kerja (worker)
upload.post(
  "/submission",
  requireAuth,
  rateLimit({ max: 10, windowSeconds: 300 }),
  async (c) => {
    const formData = await c.req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) return c.json(err("NO_FILE", "File tidak ditemukan"), 400);
    if (files.length > 10) return c.json(err("TOO_MANY_FILES", "Maksimal 10 file"), 400);

    const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    const urls: string[] = [];

    for (const file of files) {
      try {
        validateFileUpload(file.type, file.size, allTypes);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.startsWith("INVALID_FILE_TYPE")) return c.json(err("INVALID_FILE_TYPE", `Format file "${file.name}" tidak didukung`), 400);
        if (msg === "FILE_TOO_LARGE") return c.json(err("FILE_TOO_LARGE", `File "${file.name}" melebihi batas 20MB`), 400);
        throw e;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadFile({ folder: "submissions", filename: file.name, buffer, contentType: file.type });
      urls.push(url);
    }

    return c.json(ok({ urls }));
  }
);

// POST /upload/portfolio — Upload item portfolio worker
upload.post(
  "/portfolio",
  requireAuth,
  rateLimit({ max: 20, windowSeconds: 300 }),
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return c.json(err("NO_FILE", "File tidak ditemukan"), 400);

    const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    try {
      validateFileUpload(file.type, file.size, allTypes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("INVALID_FILE_TYPE")) return c.json(err("INVALID_FILE_TYPE", "Format file tidak didukung"), 400);
      if (msg === "FILE_TOO_LARGE") return c.json(err("FILE_TOO_LARGE", "Ukuran file maksimal 20MB"), 400);
      throw e;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile({ folder: "portfolios", filename: file.name, buffer, contentType: file.type });

    return c.json(ok({ url }));
  }
);

export default upload;
