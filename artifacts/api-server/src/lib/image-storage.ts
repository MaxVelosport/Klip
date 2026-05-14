import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STORAGE_ROOT = "/home/deploy/projects/neuroclip/storage/images";

export async function saveImage(
  projectId: string,
  sceneId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const dir = join(STORAGE_ROOT, projectId);
  await mkdir(dir, { recursive: true });
  const filename = `${sceneId}.${ext}`;
  await writeFile(join(dir, filename), buffer);
  // Set read permissions for nginx/www-data
  const { chmod } = await import("node:fs/promises");
  await chmod(join(dir, filename), 0o644);
  return `/storage/images/${projectId}/${filename}`;
}

export function imageSeedFromProjectId(projectId: string): number {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (Math.imul(h, 31) + projectId.charCodeAt(i)) | 0;
  return Math.abs(h);
}
