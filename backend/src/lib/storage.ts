import * as crypto from "crypto";

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

type UploadFolder = "orders" | "avatars" | "portfolios" | "submissions";

async function signRequest(
  method: string,
  path: string,
  contentType: string,
  body: Buffer
): Promise<Record<string, string>> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";
  const region = "auto";
  const service = "s3";

  const canonicalHeaders = `content-type:${contentType}\nhost:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");
  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");

  const sign = (key: Buffer | string, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();

  const signingKey = sign(sign(sign(sign(`AWS4${R2_SECRET_KEY}`, dateStamp), region), service), "aws4_request");
  const signature = sign(signingKey, stringToSign).toString("hex");

  return {
    "Content-Type": contentType,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export async function uploadFile(input: {
  folder: UploadFolder;
  filename: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY) {
    // Dev mode — return mock URL
    const key = `${input.folder}/${Date.now()}-${input.filename}`;
    console.log(`[Storage Dev] Mock upload: ${key}`);
    return `https://placehold.co/400?text=${encodeURIComponent(input.filename)}`;
  }

  const ext = input.filename.split(".").pop() ?? "";
  const uniqueKey = `${input.folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const path = `/${R2_BUCKET}/${uniqueKey}`;

  const headers = await signRequest("PUT", path, input.contentType, input.buffer);

  const res = await fetch(`${R2_ENDPOINT}${path}`, {
    method: "PUT",
    headers,
    body: input.buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed: ${res.status} ${text}`);
  }

  return `${R2_PUBLIC_URL}/${uniqueKey}`;
}

export function validateFileUpload(
  contentType: string,
  sizeBytes: number,
  allowed: string[]
): void {
  if (!allowed.includes(contentType)) {
    throw new Error(`INVALID_FILE_TYPE:${allowed.join(",")}`);
  }
  const maxBytes = 20 * 1024 * 1024; // 20 MB
  if (sizeBytes > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }
}
