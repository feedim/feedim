"use client";

type UploadedImageResult = {
  url: string;
  blurhash: string | null;
};

export async function uploadGeneratedImageBlob(
  blob: Blob,
  fileNamePrefix: string,
): Promise<UploadedImageResult> {
  const uploadFile = new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, {
    type: blob.type || "image/jpeg",
  });
  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("fileName", uploadFile.name);

  const uploadRes = await fetch("/api/upload/image", {
    method: "POST",
    body: formData,
  });
  const uploadData = await uploadRes.json();

  if (!uploadRes.ok || !uploadData.url) {
    throw new Error(uploadData.error || "image-upload-failed");
  }

  return {
    url: uploadData.url as string,
    blurhash: uploadData.blurhash || null,
  };
}

export async function uploadGeneratedImageDataUrl(
  dataUrl: string,
  fileNamePrefix: string,
): Promise<UploadedImageResult> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  return uploadGeneratedImageBlob(blob, fileNamePrefix);
}
