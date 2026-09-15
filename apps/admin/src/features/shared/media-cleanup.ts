import "server-only";

import { realpath, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { db, images, serviceImages, siteSettings, tourImages, tourPlanImages } from "@database";
import { and, inArray, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const UPLOAD_STEM = String.raw`\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`;
const IMAGE_KEY = new RegExp(`^(?:tours|services|settings)/${UPLOAD_STEM}\\.(?:jpg|png|webp|avif)$`);
const VIDEO_KEY = new RegExp(`^settings/videos/${UPLOAD_STEM}\\.mp4$`);

/** Return only rows actually removed; callers must wait for commit before deleting files. */
export async function deleteUnreferencedImages(tx: Transaction, ids: string[]) {
  if (!ids.length) return [];
  return tx.delete(images).where(and(
    inArray(images.id, [...new Set(ids)]),
    sql`not exists (select 1 from ${tourImages} where ${tourImages.imageId} = ${images.id})`,
    sql`not exists (select 1 from ${tourPlanImages} where ${tourPlanImages.imageId} = ${images.id})`,
    sql`not exists (select 1 from ${serviceImages} where ${serviceImages.imageId} = ${images.id})`,
  )).returning({ url: images.url });
}

function managedUpload(url: string) {
  const base = "/uploads";
  if (!url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1);
  // Only names produced by our upload writers are eligible. No decoding, traversal,
  // query strings, alternate separators, or arbitrary user-supplied filenames.
  if (!IMAGE_KEY.test(key) && !VIDEO_KEY.test(key)) return null;
  const root = resolve(process.env.UPLOAD_DIR || "public/uploads");
  const path = resolve(root, key);
  return { root, path, aliases: [url] };
}

function isWithin(root: string, path: string) {
  const child = relative(root, path);
  return child !== "" && child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

/** Best-effort post-commit cleanup, never a reason to roll back newly saved uploads. */
export async function removeUnreferencedMediaFiles(candidates: Array<{ url: string }>) {
  for (const url of new Set(candidates.map((candidate) => candidate.url))) {
    try {
      const upload = managedUpload(url);
      if (!upload) continue;
      const imageReferences = await db.select({ id: images.id }).from(images)
        .where(inArray(images.url, upload.aliases)).limit(1);
      if (imageReferences.length) continue;
      const settingReferences = await db.select({ key: siteSettings.key }).from(siteSettings)
        .where(and(inArray(siteSettings.type, ["image", "video"]), inArray(siteSettings.value, upload.aliases))).limit(1);
      if (settingReferences.length) continue;

      // Resolve the parent as well as checking lexical containment to avoid following
      // a symlink/junction in an upload subdirectory outside the upload root.
      const root = await realpath(upload.root);
      const parent = await realpath(dirname(upload.path));
      if (!isWithin(upload.root, upload.path) || !isWithin(root, parent)) {
        console.error("[MediaCleanup] Refusing path outside upload root", { url });
        continue;
      }
      await unlink(upload.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      console.error("[MediaCleanup] Post-commit file cleanup failed", { url, error });
    }
  }
}
