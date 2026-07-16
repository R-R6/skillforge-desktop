export const APP_PACKAGE_NAME = "skillforge-desktop";

export const SETTING_SKILL_SOURCES_DIRECTORY = "skillSourcesDirectory";

export type StorageEntryId = "database" | "skill-sources" | "theme-packs" | "logs" | "other";

export interface StorageEntrySummary {
  id: StorageEntryId;
  label: string;
  path: string;
  sizeBytes: number;
}

export interface SkillSourceCloneSummary {
  id: string;
  path: string;
  sizeBytes: number;
  linkedSkillCount: number;
  repositoryUrl: string | null;
  repositoryLabel: string;
  inUse: boolean;
}

export interface StorageSummary {
  userDataPath: string;
  defaultUserDataPath: string;
  skillSourcesPath: string;
  defaultSkillSourcesPath: string;
  customSkillSourcesPath: boolean;
  customDataDirectory: boolean;
  bootstrapPath: string;
  driveLabel: string;
  onSystemDrive: boolean;
  previousDataDirectory: string | null;
  previousDataDirectoryExists: boolean;
  previousDataDirectoryBytes: number;
  /** Bootstrap already points at a new path; live process still uses the old userData until restart. */
  pendingDataDirectoryRestart: boolean;
  pendingDataDirectoryPath: string | null;
  totalBytes: number;
  entries: StorageEntrySummary[];
  clones: SkillSourceCloneSummary[];
}

export interface DataDirectoryMigrationResult {
  sourcePath: string;
  targetPath: string;
  bytesCopied: number;
  requiresRestart: boolean;
  previousDataDirectory: string;
}

export interface GitImportPreview {
  normalizedUrl: string;
  repositoryLabel: string;
  skillSourcesPath: string;
  cloneDirectory: string;
  importDirectory: string;
  alreadyCloned: boolean;
  existingSizeBytes: number;
  branch?: string;
  subPath: string[];
  willClone: boolean;
}

export interface OnboardingState {
  completed: boolean;
  defaultUserDataPath: string;
  currentUserDataPath: string;
  customDataDirectory: boolean;
}

export interface CleanUnusedClonesResult {
  removed: Array<{ id: string; path: string; sizeBytes: number }>;
  freedBytes: number;
}

export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

/** Drive / volume label for display (e.g. `C:` or `Macintosh HD`). */
export function getPathDriveLabel(
  filePath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const resolved = filePath.replace(/\\/g, "/");
  if (platform === "win32") {
    const match = resolved.match(/^([A-Za-z]:)/);
    return match ? match[1].toUpperCase() : "";
  }
  if (resolved.startsWith("/Volumes/")) {
    const segment = resolved.split("/").filter(Boolean)[1];
    return segment || "/";
  }
  return "/";
}

/** True when path lives on the OS system volume (Windows SystemDrive, else non-/Volumes). */
export function isSystemDrivePath(
  filePath: string,
  options?: { platform?: NodeJS.Platform; systemDrive?: string },
): boolean {
  const platform = options?.platform ?? process.platform;
  const label = getPathDriveLabel(filePath, platform);
  if (platform === "win32") {
    const systemDrive = (options?.systemDrive ?? process.env.SystemDrive ?? "C:").replace(/\\/g, "");
    return label.toUpperCase() === systemDrive.toUpperCase();
  }
  return label === "/";
}

export function remapPathUnderRoot(value: string, fromRoot: string, toRoot: string): string {
  const normalize = (input: string) => input.replace(/\\/g, "/").replace(/\/+$/, "");
  const original = normalize(value);
  const from = normalize(fromRoot);
  const to = normalize(toRoot);
  const compareValue = process.platform === "win32" ? original.toLowerCase() : original;
  const compareFrom = process.platform === "win32" ? from.toLowerCase() : from;
  if (compareValue === compareFrom || compareValue.startsWith(`${compareFrom}/`)) {
    const relativeFromOriginal = original.slice(from.length).replace(/^\//, "");
    const joined = relativeFromOriginal ? `${to}/${relativeFromOriginal}` : to;
    return process.platform === "win32" ? joined.replace(/\//g, "\\") : joined;
  }
  return value;
}

/** Path equality that ignores trailing separators and Windows drive letter case. */
export function pathsEqual(
  left: string,
  right: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const normalize = (input: string) => {
    let value = input.replace(/\\/g, "/").replace(/\/+$/, "");
    if (platform === "win32") value = value.toLowerCase();
    return value;
  };
  return normalize(left) === normalize(right);
}

/** True when `child` is `parent` or nested under it (Windows-safe). */
export function isPathInsideOrEqual(
  child: string,
  parent: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const normalize = (input: string) => {
    let value = input.replace(/\\/g, "/").replace(/\/+$/, "");
    if (platform === "win32") value = value.toLowerCase();
    return value;
  };
  const childNorm = normalize(child);
  const parentNorm = normalize(parent);
  return childNorm === parentNorm || childNorm.startsWith(`${parentNorm}/`);
}

/** Electron / Chromium runtime dirs that are often locked and safe to skip during migration. */
export const MIGRATION_SKIP_DIR_NAMES = new Set([
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnCache",
  "DawnWebGPUCache",
  "DawnGraphiteCache",
  "ShaderCache",
  "GrShaderCache",
  "Local Storage",
  "Session Storage",
  "IndexedDB",
  "Service Worker",
  "WebStorage",
  "blob_storage",
  "Network",
  "Cookies",
  "Cookies-journal",
]);

