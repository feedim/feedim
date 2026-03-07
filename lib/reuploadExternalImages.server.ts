import { uploadToR2 } from '@/lib/r2';
import crypto from 'crypto';

const OWN_HOSTS = ['cdn.feedim.com', 'imgspcdn.feedim.com'];
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function isPrivateHost(host: string): boolean {
  return (
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0' ||
    host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.') ||
    host.endsWith('.local') || host.endsWith('.internal') ||
    /^169\.254\./.test(host) || /^fc00:/.test(host) || /^fe80:/.test(host)
  );
}

async function fetchAndUpload(src: string): Promise<string | null> {
  try {
    const parsed = new URL(src);
    if (isPrivateHost(parsed.hostname.toLowerCase())) return null;
    if (/\.svg(\?|$)/i.test(src.split('#')[0])) return null;

    const res = await fetch(src, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const ct = res.headers.get('content-type') || '';
    let fileType = ALLOWED_TYPES.find(t => ct.includes(t.split('/')[1])) || '';
    if (!fileType) {
      const ext = src.split('?')[0].split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
      else if (ext === 'png') fileType = 'image/png';
      else if (ext === 'gif') fileType = 'image/gif';
      else if (ext === 'webp') fileType = 'image/webp';
      else return null;
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_SIZE) return null;

    const buffer = Buffer.from(arrayBuf);
    const hash = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const ext = fileType.split('/')[1] === 'jpeg' ? 'jpg' : fileType.split('/')[1];
    const key = `posts/reupload-${hash}.${ext}`;

    return await uploadToR2(key, buffer, fileType);
  } catch {
    return null;
  }
}

/**
 * Server-side fallback: find external <img> URLs in HTML content,
 * re-upload them to R2, and replace the src attributes.
 * Images that fail to reupload are removed from content.
 */
export async function reuploadExternalImagesServer(html: string): Promise<string> {
  const externalImgRegex = /<img([^>]+)src=["'](https?:\/\/(?!cdn\.feedim\.com)[^"']+)["']([^>]*)>/gi;
  const matches: { full: string; src: string }[] = [];
  let m;
  while ((m = externalImgRegex.exec(html)) !== null) {
    try {
      const host = new URL(m[2]).host;
      if (OWN_HOSTS.some(h => host.includes(h)) || host.includes('supabase.co')) continue;
    } catch { continue; }
    matches.push({ full: m[0], src: m[2] });
  }

  if (matches.length === 0) return html;

  const results = await Promise.all(
    matches.map(async ({ full, src }) => {
      const newUrl = await fetchAndUpload(src);
      return { full, newUrl };
    })
  );

  let result = html;
  for (const { full, newUrl } of results) {
    if (newUrl) {
      result = result.replace(full, full.replace(/src=["'][^"']+["']/, `src="${newUrl}"`));
    } else {
      // Remove the entire figure/img if reupload failed
      const figureRegex = new RegExp(`<figure[^>]*>\\s*${full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</figure>`, 'i');
      if (figureRegex.test(result)) {
        result = result.replace(figureRegex, '');
      } else {
        result = result.replace(full, '');
      }
    }
  }

  return result;
}
