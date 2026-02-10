import imageCompression from 'browser-image-compression';

// HEIC/HEIF mime types (iPhone photos)
const HEIC_TYPES = ['image/heic', 'image/heif'];
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', ...HEIC_TYPES];

/**
 * Check if file is HEIC/HEIF format (by mime or extension)
 */
function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

/**
 * Convert HEIC/HEIF to JPEG using heic2any
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;

  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

  return new File([resultBlob], newName, { type: 'image/jpeg' });
}

/**
 * Compress image before upload to reduce storage and bandwidth costs
 * - Converts HEIC/HEIF to JPEG first
 * - Converts all formats to JPEG for consistent output
 * - Reduces 2-5MB images to ~200-500KB
 */
export async function compressImage(file: File): Promise<File> {
  let processedFile = file;

  // Convert HEIC/HEIF to JPEG first
  if (isHeicFile(file)) {
    try {
      processedFile = await convertHeicToJpeg(file);
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('HEIC dosyası dönüştürülemedi. Lütfen JPEG veya PNG olarak kaydedin.');
    }
  }

  // Skip compression for already small images (but still convert format)
  if (processedFile.size < 200 * 1024 && processedFile.type === 'image/jpeg') {
    return processedFile;
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.8,
  };

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Compressing image: ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    const compressedFile = await imageCompression(processedFile, options);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Compressed to: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% smaller)`);
    }

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return processedFile;
  }
}

/**
 * Validate image file before upload
 * Supports: JPEG, PNG, GIF, WebP, HEIC, HEIF
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type (by mime or extension for HEIC edge case)
  const isValidMime = VALID_TYPES.includes(file.type);
  const isHeic = isHeicFile(file);

  if (!isValidMime && !isHeic) {
    return {
      valid: false,
      error: 'Geçersiz dosya tipi. JPEG, PNG, GIF, WebP veya HEIC desteklenir.'
    };
  }

  // 10MB raw limit (HEIC files can be large before conversion)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Dosya çok büyük. Maksimum 10MB yükleyebilirsiniz.'
    };
  }

  return { valid: true };
}

/**
 * Get optimized file name for storage
 * Always uses .jpg extension since all images are converted to JPEG
 */
export function getOptimizedFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);

  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
    .substring(0, 30);

  return `${cleanName}-${timestamp}-${randomStr}.jpg`;
}
