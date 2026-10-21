import "server-only";

export function getMaxUploadVideoMb(): number {
  const maxMb = Number(process.env.MAX_UPLOAD_VIDEO_MB || "200");
  return Number.isFinite(maxMb) && maxMb > 0 ? maxMb : 200;
}
