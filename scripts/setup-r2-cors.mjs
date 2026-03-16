/**
 * One-time script to configure CORS on the R2 bucket.
 * Run: node --env-file=.env.local scripts/setup-r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing R2 env vars. Run with: node --env-file=.env.local scripts/setup-r2-cors.mjs");
  process.exit(1);
}

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

await R2.send(new PutBucketCorsCommand({
  Bucket: R2_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: [
          "http://localhost:3003",
          "https://feedim.com",
          "https://www.feedim.com",
        ],
        AllowedMethods: ["PUT", "GET", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 86400,
      },
    ],
  },
}));

console.log("R2 CORS configured successfully for:", R2_BUCKET_NAME);
