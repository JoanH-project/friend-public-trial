const maximumAvatarBytes = 2 * 1024 * 1024;
const maximumAvatarEdge = 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片无法读取")); };
    image.src = url;
  });
}

/** Validates and downscales local avatars before they ever reach Cloud Storage. */
export async function prepareAvatar(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("请上传图片文件");
  if (file.size > maximumAvatarBytes) throw new Error("请上传 2MB 以内的图片");

  const image = await loadImage(file);
  const scale = Math.min(1, maximumAvatarEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  // Avoid re-encoding small images that are already within the avatar target.
  if (scale === 1 && file.size <= 360 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片处理不可用");
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("图片压缩失败");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "avatar"}.jpg`, { type: "image/jpeg" });
}
