import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP_PACKAGE_NAME } from "../shared/storage";

export interface BootstrapConfig {
  version: 1;
  dataDirectory: string | null;
  onboardingCompleted: boolean;
}

const DEFAULT_BOOTSTRAP: BootstrapConfig = {
  version: 1,
  dataDirectory: null,
  onboardingCompleted: false,
};

export function getBootstrapDirectory(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return path.join(localAppData, "SkillForge Desktop");
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "SkillForge Desktop");
  }
  return path.join(home, ".config", "skillforge-desktop");
}

export function getBootstrapFilePath(): string {
  return path.join(getBootstrapDirectory(), "bootstrap.json");
}

export function getDefaultElectronUserDataPath(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, APP_PACKAGE_NAME);
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", APP_PACKAGE_NAME);
  }
  return path.join(home, ".config", APP_PACKAGE_NAME);
}

export function readBootstrapConfig(): BootstrapConfig {
  const filePath = getBootstrapFilePath();
  if (!fs.existsSync(filePath)) {
    const existingDb = path.join(getDefaultElectronUserDataPath(), "skillforge.db");
    if (fs.existsSync(existingDb)) {
      const migrated: BootstrapConfig = { version: 1, dataDirectory: null, onboardingCompleted: true };
      writeBootstrapConfig(migrated);
      return migrated;
    }
    return { ...DEFAULT_BOOTSTRAP };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<BootstrapConfig>;
    return {
      version: 1,
      dataDirectory: typeof parsed.dataDirectory === "string" && parsed.dataDirectory.trim() ? path.resolve(parsed.dataDirectory.trim()) : null,
      onboardingCompleted: parsed.onboardingCompleted === true,
    };
  } catch {
    return { ...DEFAULT_BOOTSTRAP };
  }
}

export function writeBootstrapConfig(config: BootstrapConfig): void {
  const directory = getBootstrapDirectory();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(getBootstrapFilePath(), JSON.stringify(config, null, 2), "utf8");
}

export function applyBootstrapPaths(): BootstrapConfig {
  const config = readBootstrapConfig();
  if (config.dataDirectory) {
    fs.mkdirSync(config.dataDirectory, { recursive: true });
    app.setPath("userData", config.dataDirectory);
  }
  return config;
}

export function completeOnboarding(options?: { dataDirectory?: string | null }): BootstrapConfig {
  const current = readBootstrapConfig();
  const next: BootstrapConfig = {
    version: 1,
    onboardingCompleted: true,
    dataDirectory: options?.dataDirectory
      ? path.resolve(options.dataDirectory)
      : current.dataDirectory,
  };
  writeBootstrapConfig(next);
  if (next.dataDirectory) {
    fs.mkdirSync(next.dataDirectory, { recursive: true });
    app.setPath("userData", next.dataDirectory);
  }
  return next;
}

export function setBootstrapDataDirectory(dataDirectory: string): BootstrapConfig {
  const current = readBootstrapConfig();
  const next: BootstrapConfig = {
    ...current,
    dataDirectory: path.resolve(dataDirectory),
    onboardingCompleted: true,
  };
  writeBootstrapConfig(next);
  return next;
}

export function requiresRestartForDataDirectoryChange(targetDirectory: string): boolean {
  const normalizedTarget = path.resolve(targetDirectory);
  return path.resolve(app.getPath("userData")) !== normalizedTarget;
}
