import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
  throw new Error("Missing required R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)");
}

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // https://cdn.feedim.com

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  cacheControl = "public, max-age=31536000, immutable",
  customMetadata?: Record<string, string>,
) {
  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      ...(customMetadata ? { Metadata: customMetadata } : {}),
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  cacheControl = "public, max-age=31536000, immutable",
  customMetadata?: Record<string, string>,
) {
  const url = await getSignedUrl(
    R2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: cacheControl,
      ...(customMetadata ? { Metadata: customMetadata } : {}),
    }),
    { expiresIn }
  );
  return { uploadUrl: url, publicUrl: `${PUBLIC_URL}/${key}` };
}

export async function deleteFromR2(key: string) {
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Delete all objects under a given prefix (e.g. "avatars/{user_id}/") */
export async function deleteR2Prefix(prefix: string) {
  let continuationToken: string | undefined;
  let totalDeleted = 0;
  do {
    const list = await R2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    const objects = list.Contents;
    if (!objects || objects.length === 0) break;
    await R2.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: objects.map(o => ({ Key: o.Key! })), Quiet: true },
    }));
    totalDeleted += objects.length;
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
  return totalDeleted;
}

/** Extract R2 key from a full CDN URL */
export function r2KeyFromUrl(url: string): string | null {
  if (!url || !PUBLIC_URL) return null;
  if (url.startsWith(PUBLIC_URL + "/")) return url.slice(PUBLIC_URL.length + 1);
  if (url.startsWith("https://cdn.feedim.com/")) return url.slice("https://cdn.feedim.com/".length);
  return null;
}

export { R2, BUCKET, PUBLIC_URL };
