import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const STORAGE_ROOT = "/home/deploy/projects/neuroclip/storage/audio";

export async function saveAudio(
  projectId: string,
  sceneId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const dir = join(STORAGE_ROOT, projectId);
  await mkdir(dir, { recursive: true });

  const ext = mimeToExt(mimeType);
  const filename = `${sceneId}${ext}`;
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);

  return `/storage/audio/${projectId}/${filename}`;
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return ".ogg";
  if (mimeType.includes("wav"))  return ".wav";
  if (mimeType.includes("aac"))  return ".aac";
  return ".audio";
}
