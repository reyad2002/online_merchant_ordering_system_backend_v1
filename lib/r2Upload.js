import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const bucketName = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_URL || "";

const s3R2 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a buffer to R2 and return the public URL for the object.
 * @param {Buffer} buffer - File buffer
 * @param {string} key - Object key (e.g. "items/123/abc.jpg")
 * @param {string} contentType - e.g. "image/jpeg"
 * @returns {Promise<string>} Public URL (if R2_PUBLIC_URL is set) or key
 */
export async function uploadToR2(buffer, key, contentType) {
  await s3R2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  if (!publicBaseUrl) return key;
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Resolve R2 object key from a stored URL or key.
 * @param {string} urlOrKey - Full public URL (e.g. https://xxx.r2.dev/items/1/uuid.jpg) or plain key
 * @returns {string} Object key for R2
 */
export function getKeyFromUrl(urlOrKey) {
  if (!urlOrKey) return "";
  if (!urlOrKey.includes("://")) return urlOrKey;
  const base = publicBaseUrl.replace(/\/$/, "");
  if (!base || !urlOrKey.startsWith(base)) {
    try {
      const u = new URL(urlOrKey);
      return u.pathname.replace(/^\//, "");
    } catch {
      return urlOrKey;
    }
  }
  return urlOrKey.slice(base.length).replace(/^\//, "");
}

/**
 * Delete an object from R2 by key.
 * @param {string} key - Object key (e.g. "items/123/abc.jpg")
 */
export async function deleteFromR2(key) {
  if (!key) return;
  await s3R2.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}
