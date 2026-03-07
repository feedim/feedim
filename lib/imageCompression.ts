import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, options?: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}): Promise<File> {
  const { maxSizeMB = 2, maxWidthOrHeight = 2048, quality = 0.85 } = options || {};

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
}
