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
  totalBytes: number;
  entries: StorageEntrySummary[];
  clones: SkillSourceCloneSummary[];
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
