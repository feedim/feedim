/**
 * Supabase Storage → Cloudflare R2 Migration Script
 *
 * Migrates all media files from Supabase Storage to R2 and updates DB URLs.
 *
 * Usage: npx tsx scripts/migrate-to-r2.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/`;

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!; // https://cdn.feedim.com

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

function supabaseUrlToR2Key(url: string): string {
  // https://xxx.supabase.co/storage/v1/object/public/images/user_id/file.jpg → images/user_id/file.jpg
  return url.replace(SUPABASE_STORAGE_BASE, "");
}

function toR2Url(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

function isSupabaseUrl(url: string | null): url is string {
  return !!url && url.includes("supabase.co/storage/");
}

async function downloadAndUpload(url: string): Promise<string> {
  const key = supabaseUrlToR2Key(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url} (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";

  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return toR2Url(key);
}

// ── Stats ───────────────────────────────────────────────────────────────────

let migrated = 0;
let skipped = 0;
let failed = 0;
const errors: string[] = [];

// ── Migrate Profiles ────────────────────────────────────────────────────────

async function migrateProfiles() {
  console.log("\n── Migrating profiles.avatar_url ──");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, avatar_url")
    .not("avatar_url", "is", null);

  if (error) { console.error("  Failed to fetch profiles:", error.message); return; }
  if (!profiles?.length) { console.log("  No profiles with avatars"); return; }

  for (const profile of profiles) {
    if (!isSupabaseUrl(profile.avatar_url)) { skipped++; continue; }
    try {
      const newUrl = await downloadAndUpload(profile.avatar_url);
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("user_id", profile.user_id);
      if (updateErr) throw new Error(updateErr.message);
      migrated++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      const msg = `  avatar ${profile.user_id}: ${(err as Error).message}`;
      errors.push(msg);
      process.stdout.write("x");
    }
  }
  console.log();
}

// ── Migrate Posts ───────────────────────────────────────────────────────────

async function migratePosts() {
  console.log("\n── Migrating posts (featured_image, video_url, video_thumbnail) ──");

  // Fetch in batches of 500
  let offset = 0;
  const batchSize = 500;
  let hasMore = true;

  while (hasMore) {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, featured_image, video_url, video_thumbnail, content")
      .range(offset, offset + batchSize - 1);

    if (error) { console.error("  Failed to fetch posts:", error.message); return; }
    if (!posts?.length) { hasMore = false; break; }
    if (posts.length < batchSize) hasMore = false;

    for (const post of posts) {
      const updates: Record<string, string> = {};

      // featured_image
      if (isSupabaseUrl(post.featured_image)) {
        try {
          updates.featured_image = await downloadAndUpload(post.featured_image);
          migrated++;
          process.stdout.write(".");
        } catch (err) {
          failed++;
          errors.push(`  post ${post.id} featured_image: ${(err as Error).message}`);
          process.stdout.write("x");
        }
      }

      // video_url
      if (isSupabaseUrl(post.video_url)) {
        try {
          updates.video_url = await downloadAndUpload(post.video_url);
          migrated++;
          process.stdout.write(".");
        } catch (err) {
          failed++;
          errors.push(`  post ${post.id} video_url: ${(err as Error).message}`);
          process.stdout.write("x");
        }
      }

      // video_thumbnail
      if (isSupabaseUrl(post.video_thumbnail)) {
        try {
          updates.video_thumbnail = await downloadAndUpload(post.video_thumbnail);
          migrated++;
          process.stdout.write(".");
        } catch (err) {
          failed++;
          errors.push(`  post ${post.id} video_thumbnail: ${(err as Error).message}`);
          process.stdout.write("x");
        }
      }

      // Inline images in content
      if (post.content && post.content.includes("supabase.co/storage")) {
        // Extract all Supabase URLs from content
        const urlRegex = new RegExp(
          SUPABASE_STORAGE_BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\"'\\s<>]+",
          "g"
        );
        const matches = post.content.match(urlRegex);
        if (matches) {
          let newContent = post.content;
          for (const matchUrl of [...new Set(matches)] as string[]) {
            try {
              const newUrl = await downloadAndUpload(matchUrl);
              newContent = newContent.split(matchUrl).join(newUrl);
              migrated++;
              process.stdout.write(".");
            } catch (err) {
              failed++;
              errors.push(`  post ${post.id} inline: ${(err as Error).message}`);
              process.stdout.write("x");
            }
          }
          if (newContent !== post.content) {
            updates.content = newContent;
          }
        }
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from("posts")
          .update(updates)
          .eq("id", post.id);
        if (updateErr) {
          console.error(`\n  Failed to update post ${post.id}:`, updateErr.message);
        }
      } else {
        skipped++;
      }
    }

    offset += batchSize;
  }
  console.log();
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Supabase → R2 Migration ===");
  console.log(`Supabase base: ${SUPABASE_STORAGE_BASE}`);
  console.log(`R2 public URL: ${R2_PUBLIC_URL}`);

  // Validate env
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  await migrateProfiles();
  await migratePosts();

  console.log("\n=== Migration Complete ===");
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(e));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
