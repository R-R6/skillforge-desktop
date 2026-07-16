import { app, shell } from "electron";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  clearPreviousDataDirectory,
  getBootstrapDirectory,
  getBootstrapFilePath,
  getDefaultElectronUserDataPath,
  readBootstrapConfig,
  setBootstrapDataDirectory,
} from "./bootstrap";
import {
  closeDatabase,
  getDatabasePath,
  getSkillSourcesDirectory,
  initializeDatabase,
  listSkillSourceReferences,
  setSetting,
} from "./db";
import { getGitImportDirectory, parseGitHubImportUrl } from "../shared/gitImport";
import {
  getPathDriveLabel,
  isPathInsideOrEqual,
  isSystemDrivePath,
  MIGRATION_SKIP_DIR_NAMES,
  pathsEqual,
  remapPathUnderRoot,
  SETTING_SKILL_SOURCES_DIRECTORY,
  type CleanUnusedClonesResult,
  type DataDirectoryMigrationResult,
  type GitImportPreview,
  type OnboardingState,
  type SkillSourceCloneSummary,
  type StorageEntryId,
  type StorageEntrySummary,
  type StorageSummary,
} from "../shared/storage";

function directorySize(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = path.join(targetPath, entry.name);
    total += entry.isDirectory() ? directorySize(entryPath) : fs.statSync(entryPath).size;
  }
  return total;
}

export function getDefaultSkillSourcesDirectory(): string {
  return path.join(app.getPath("userData"), "skill-sources");
}

export function setSkillSourcesDirectory(directoryPath: string): string {
  const resolved = path.resolve(directoryPath);
  fs.mkdirSync(resolved, { recursive: true });
  setSetting(SETTING_SKILL_SOURCES_DIRECTORY, resolved);
  return resolved;
}

function getLinkedCloneUsage(): Map<string, { count: number; repositoryUrl: string | null }> {
  const usage = new Map<string, { count: number; repositoryUrl: string | null }>();
  for (const skill of listSkillSourceReferences()) {
    if (!skill.sourcePath) continue;
    const normalized = skill.sourcePath.replace(/\\/g, "/");
    const match = normalized.match(/skill-sources\/([a-f0-9]{8,})/i);
    if (!match) continue;
    const cloneId = match[1];
    const current = usage.get(cloneId) ?? { count: 0, repositoryUrl: skill.sourceUrl ?? null };
    current.count += 1;
    if (!current.repositoryUrl && skill.sourceUrl) current.repositoryUrl = skill.sourceUrl;
    usage.set(cloneId, current);
  }
  return usage;
}

function listCloneSummaries(skillSourcesRoot: string): SkillSourceCloneSummary[] {
  if (!fs.existsSync(skillSourcesRoot)) return [];
  const usage = getLinkedCloneUsage();
  return fs.readdirSync(skillSourcesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const clonePath = path.join(skillSourcesRoot, entry.name);
      const linked = usage.get(entry.name);
      const repositoryUrl = linked?.repositoryUrl ?? null;
      let repositoryLabel = entry.name.slice(0, 8);
      if (repositoryUrl) {
        try {
          const segments = new URL(repositoryUrl).pathname.split("/").filter(Boolean);
          if (segments.length >= 2) repositoryLabel = `${segments[0]}/${segments[1]}`;
        } catch {
          repositoryLabel = repositoryUrl;
        }
      }
      return {
        id: entry.name,
        path: clonePath,
        sizeBytes: directorySize(clonePath),
        linkedSkillCount: linked?.count ?? 0,
        repositoryUrl,
        repositoryLabel,
        inUse: (linked?.count ?? 0) > 0,
      };
    })
    .sort((left, right) => right.sizeBytes - left.sizeBytes);
}

function buildEntry(id: StorageEntryId, label: string, entryPath: string): StorageEntrySummary {
  return { id, label, path: entryPath, sizeBytes: directorySize(entryPath) };
}

export function getStorageSummary(): StorageSummary {
  const userDataPath = app.getPath("userData");
  const defaultUserDataPath = getDefaultElectronUserDataPath();
  const skillSourcesPath = getSkillSourcesDirectory();
  const defaultSkillSourcesPath = path.join(userDataPath, "skill-sources");
  const bootstrap = readBootstrapConfig();

  const entries: StorageEntrySummary[] = [
    buildEntry("database", "数据库", getDatabasePath()),
    buildEntry("skill-sources", "GitHub 克隆", skillSourcesPath),
    buildEntry("theme-packs", "主题包", path.join(userDataPath, "theme-packs")),
    buildEntry("logs", "日志", path.join(userDataPath, "logs")),
  ];

  const knownPaths = new Set(entries.map((entry) => path.resolve(entry.path)));
  let otherBytes = 0;
  if (fs.existsSync(userDataPath)) {
    for (const entry of fs.readdirSync(userDataPath, { withFileTypes: true })) {
      const entryPath = path.resolve(path.join(userDataPath, entry.name));
      if (knownPaths.has(entryPath)) continue;
      otherBytes += entry.isDirectory() ? directorySize(entryPath) : fs.statSync(entryPath).size;
    }
  }
  entries.push({
    id: "other",
    label: "其他数据",
    path: userDataPath,
    sizeBytes: otherBytes,
  });

  const clones = listCloneSummaries(skillSourcesPath);
  const previousDataDirectory = bootstrap.previousDataDirectory;
  // Before restart, previous === live userData; never offer cleanup of the active directory.
  const previousReadyForCleanup = Boolean(
    previousDataDirectory
    && !pathsEqual(previousDataDirectory, userDataPath)
    && fs.existsSync(previousDataDirectory),
  );
  const pendingDataDirectoryPath = bootstrap.dataDirectory
    && !pathsEqual(bootstrap.dataDirectory, userDataPath)
    ? bootstrap.dataDirectory
    : null;
  return {
    userDataPath,
    defaultUserDataPath,
    skillSourcesPath,
    defaultSkillSourcesPath,
    customSkillSourcesPath: path.resolve(skillSourcesPath) !== path.resolve(defaultSkillSourcesPath),
    customDataDirectory: bootstrap.dataDirectory !== null,
    bootstrapPath: getBootstrapFilePath(),
    driveLabel: getPathDriveLabel(userDataPath),
    onSystemDrive: isSystemDrivePath(userDataPath),
    previousDataDirectory: previousReadyForCleanup ? previousDataDirectory : null,
    previousDataDirectoryExists: previousReadyForCleanup,
    previousDataDirectoryBytes: previousReadyForCleanup && previousDataDirectory ? directorySize(previousDataDirectory) : 0,
    pendingDataDirectoryRestart: Boolean(pendingDataDirectoryPath),
    pendingDataDirectoryPath,
    totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries,
    clones,
  };
}

export function getOnboardingState(): OnboardingState {
  const bootstrap = readBootstrapConfig();
  return {
    completed: bootstrap.onboardingCompleted,
    defaultUserDataPath: getDefaultElectronUserDataPath(),
    currentUserDataPath: app.getPath("userData"),
    customDataDirectory: bootstrap.dataDirectory !== null,
  };
}

export function previewGitImport(repositoryUrl: string): GitImportPreview {
  const plan = parseGitHubImportUrl(repositoryUrl);
  const skillSourcesRoot = getSkillSourcesDirectory();
  const cloneDirectory = getGitImportDirectory(plan.sourceId, skillSourcesRoot);
  const importDirectory = path.resolve(cloneDirectory, ...plan.subPath);
  const alreadyCloned = fs.existsSync(cloneDirectory) && fs.existsSync(path.join(cloneDirectory, ".git"));
  const existingSizeBytes = alreadyCloned ? directorySize(cloneDirectory) : 0;
  return {
    normalizedUrl: plan.normalizedUrl,
    repositoryLabel: `${plan.owner}/${plan.repository}`,
    skillSourcesPath: skillSourcesRoot,
    cloneDirectory,
    importDirectory,
    alreadyCloned,
    existingSizeBytes,
    branch: plan.branch,
    subPath: plan.subPath,
    willClone: !alreadyCloned,
  };
}

export function cleanUnusedSkillSourceClones(): CleanUnusedClonesResult {
  const skillSourcesRoot = getSkillSourcesDirectory();
  const clones = listCloneSummaries(skillSourcesRoot);
  const removed: CleanUnusedClonesResult["removed"] = [];
  let freedBytes = 0;
  for (const clone of clones) {
    if (clone.inUse) continue;
    fs.rmSync(clone.path, { recursive: true, force: true });
    removed.push({ id: clone.id, path: clone.path, sizeBytes: clone.sizeBytes });
    freedBytes += clone.sizeBytes;
  }
  return { removed, freedBytes };
}

export async function openStoragePath(targetPath: string): Promise<void> {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) throw new Error("路径不存在");
  // Prefer opening the parent folder for files (e.g. skillforge.db) — Explorer handles dirs more reliably.
  const openTarget = fs.statSync(resolved).isFile() ? path.dirname(resolved) : resolved;
  const errorMessage = await shell.openPath(openTarget);
  if (errorMessage) throw new Error(errorMessage);
}

export function requestDataDirectoryChange(dataDirectory: string): { requiresRestart: boolean; targetPath: string } {
  const targetPath = path.resolve(dataDirectory);
  fs.mkdirSync(targetPath, { recursive: true });
  setBootstrapDataDirectory(targetPath);
  const requiresRestart = !pathsEqual(app.getPath("userData"), targetPath);
  return { requiresRestart, targetPath };
}

function assertValidMigrationTarget(sourcePath: string, targetPath: string): void {
  if (pathsEqual(sourcePath, targetPath)) {
    throw new Error("目标目录与当前数据目录相同");
  }
  if (isPathInsideOrEqual(targetPath, sourcePath) && !pathsEqual(sourcePath, targetPath)) {
    throw new Error("目标目录不能位于当前数据目录内部");
  }
  if (isPathInsideOrEqual(sourcePath, targetPath) && !pathsEqual(sourcePath, targetPath)) {
    throw new Error("目标目录不能是当前数据目录的父级");
  }
}

function directoryHasEntries(directoryPath: string): boolean {
  if (!fs.existsSync(directoryPath)) return false;
  return fs.readdirSync(directoryPath).length > 0;
}

export function previewDataDirectoryMigration(targetDirectory: string): {
  sourcePath: string;
  targetPath: string;
  sourceBytes: number;
  targetExists: boolean;
  targetHasDatabase: boolean;
  targetNonEmpty: boolean;
} {
  const sourcePath = path.resolve(app.getPath("userData"));
  const targetPath = path.resolve(targetDirectory);
  assertValidMigrationTarget(sourcePath, targetPath);
  const targetHasDatabase = fs.existsSync(path.join(targetPath, "skillforge.db"));
  return {
    sourcePath,
    targetPath,
    sourceBytes: directorySize(sourcePath),
    targetExists: fs.existsSync(targetPath),
    targetHasDatabase,
    targetNonEmpty: directoryHasEntries(targetPath),
  };
}

function remapMigratedDatabase(targetUserData: string, sourceUserData: string): void {
  const databaseFile = path.join(targetUserData, "skillforge.db");
  if (!fs.existsSync(databaseFile)) return;

  const db = new Database(databaseFile);
  try {
    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
    const updateSetting = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    for (const row of settingsRows) {
      if (row.key !== SETTING_SKILL_SOURCES_DIRECTORY) continue;
      const remapped = remapPathUnderRoot(row.value, sourceUserData, targetUserData);
      if (remapped !== row.value) updateSetting.run(row.key, remapped);
    }

    const skills = db.prepare("SELECT id, source_path AS sourcePath FROM skills WHERE source_path IS NOT NULL").all() as Array<{
      id: string;
      sourcePath: string;
    }>;
    const updateSkill = db.prepare("UPDATE skills SET source_path = ? WHERE id = ?");
    for (const skill of skills) {
      const remapped = remapPathUnderRoot(skill.sourcePath, sourceUserData, targetUserData);
      if (remapped !== skill.sourcePath) updateSkill.run(remapped, skill.id);
    }
  } finally {
    db.close();
  }
}

export function migrateDataDirectory(targetDirectory: string): DataDirectoryMigrationResult {
  const sourcePath = path.resolve(app.getPath("userData"));
  const targetPath = path.resolve(targetDirectory);
  assertValidMigrationTarget(sourcePath, targetPath);

  fs.mkdirSync(targetPath, { recursive: true });

  // Unlock SQLite before copy; Chromium caches/session dirs are skipped (often locked on Windows).
  closeDatabase();
  let bytesCopied = 0;
  try {
    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      force: true,
      filter: (src) => !MIGRATION_SKIP_DIR_NAMES.has(path.basename(src)),
    });
    remapMigratedDatabase(targetPath, sourcePath);
    bytesCopied = directorySize(targetPath);
    setBootstrapDataDirectory(targetPath, { previousDataDirectory: sourcePath });
  } catch (error) {
    try {
      initializeDatabase();
    } catch {
      // Re-open best-effort; surface the original migration error.
    }
    throw error;
  }

  // Keep serving the old location until restart so the UI can show a restart CTA.
  initializeDatabase();

  return {
    sourcePath,
    targetPath,
    bytesCopied,
    requiresRestart: true,
    previousDataDirectory: sourcePath,
  };
}

export function dismissPreviousDataDirectory(): void {
  clearPreviousDataDirectory();
}

export function cleanPreviousDataDirectory(): { removedPath: string; freedBytes: number } {
  const bootstrap = readBootstrapConfig();
  const previous = bootstrap.previousDataDirectory;
  if (!previous) throw new Error("没有可清理的旧数据目录");

  const current = path.resolve(app.getPath("userData"));
  const previousPath = path.resolve(previous);
  if (pathsEqual(previousPath, current)) {
    clearPreviousDataDirectory();
    throw new Error("旧目录与当前数据目录相同，已取消清理");
  }
  if (!fs.existsSync(previousPath)) {
    clearPreviousDataDirectory();
    throw new Error("旧数据目录已不存在");
  }

  const freedBytes = directorySize(previousPath);
  fs.rmSync(previousPath, { recursive: true, force: true });
  clearPreviousDataDirectory();
  return { removedPath: previousPath, freedBytes };
}

export { getBootstrapDirectory, getBootstrapFilePath } from "./bootstrap";
