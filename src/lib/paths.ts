import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Local-first data directory for SQLite DB and product photos.
 * Prefer BABYALESTOCK_DATA_DIR; default to ~/.babyalestock (outside the repo).
 * Do not put this folder in cloud sync (iCloud/Dropbox/OneDrive).
 */
export function getDataDir(): string {
  const configured = process.env.BABYALESTOCK_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(os.homedir(), ".babyalestock");
}

export function getDbPath(): string {
  return path.join(getDataDir(), "babyalestock.sqlite");
}

export function getPhotosDir(): string {
  return path.join(/*turbopackIgnore: true*/ getDataDir(), "photos");
}

export function ensureDataDirs(): void {
  const dataDir = getDataDir();
  const photosDir = getPhotosDir();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(photosDir, { recursive: true });
}
