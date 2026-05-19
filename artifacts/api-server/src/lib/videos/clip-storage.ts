import { mkdir, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";

const STORAGE_ROOT = "/home/deploy/projects/neuroclip/storage/clips";

export async function saveClip(
  projectId: string,
  sceneId: string,
  buffer: Buffer,
): Promise<string> {
  const dir = join(STORAGE_ROOT, projectId);
  await mkdir(dir, { recursive: true });
  const filename = `${sceneId}.mp4`;
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);
  await chmod(filePath, 0o644);
  return `/storage/clips/${projectId}/${filename}`;
}
