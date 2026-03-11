import imageCompression from 'browser-image-compression';

export const MAX_SOURCE_IMAGE_SIZE_MB = 20;

export function isSourceImageTooLarge(file: File, maxSizeMB: number = MAX_SOURCE_IMAGE_SIZE_MB): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

async function fallbackCompressImage(file: File, options: {
  maxWidthOrHeight: number;
  quality: number;
}): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image-decode-failed"));
      el.src = objectUrl;
    });

    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight, 1);
    const scale = Math.min(1, options.maxWidthOrHeight / longestEdge);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-context-unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("canvas-blob-failed"));
      }, "image/jpeg", options.quality);
    });

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressImage(file: File, options?: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}): Promise<File> {
  const { maxSizeMB = 2, maxWidthOrHeight = 2048, quality = 0.85 } = options || {};

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      fileType: 'image/jpeg',
      initialQuality: quality,
      exifOrientation: 1,
      preserveExif: false,
    });

    return new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } catch {
    return fallbackCompressImage(file, { maxWidthOrHeight, quality });
  }
}
