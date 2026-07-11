import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  parseThemePackJson,
  parseThemePackKey,
  serializeThemePack,
  summarizeThemePack,
  validateThemePack,
  type ThemePack,
  type ThemePackSummary,
} from "../shared/themePack";

function getBuiltinThemesDirectory() {
  const packagedPath = path.join(process.resourcesPath, "themes");
  if (fs.existsSync(packagedPath)) return packagedPath;
  return path.join(app.getAppPath(), "resources", "themes");
}

function getUserThemesDirectory() {
  const directory = path.join(app.getPath("userData"), "theme-packs");
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function readPackFromFile(filePath: string, source: "builtin" | "user"): ThemePack | null {
  try {
    const json = fs.readFileSync(filePath, "utf8");
    const pack = parseThemePackJson(json);
    return pack;
  } catch {
    return null;
  }
}

function listPacksInDirectory(directory: string, source: "builtin" | "user"): ThemePackSummary[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => readPackFromFile(path.join(directory, fileName), source))
    .filter((pack): pack is ThemePack => pack !== null)
    .map((pack) => summarizeThemePack(pack, source))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export function listThemePacks(): ThemePackSummary[] {
  return [
    ...listPacksInDirectory(getBuiltinThemesDirectory(), "builtin"),
    ...listPacksInDirectory(getUserThemesDirectory(), "user"),
  ];
}

export function getThemePack(key: string): ThemePack | null {
  const parsed = parseThemePackKey(key);
  if (!parsed) return null;

  const directory = parsed.source === "builtin" ? getBuiltinThemesDirectory() : getUserThemesDirectory();
  const filePath = path.join(directory, `${parsed.id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return readPackFromFile(filePath, parsed.source);
}

export function importThemePackFromJson(json: string): ThemePackSummary {
  const pack = parseThemePackJson(json);
  const builtinPath = path.join(getBuiltinThemesDirectory(), `${pack.id}.json`);
  if (fs.existsSync(builtinPath)) {
    throw new Error(`Theme Pack "${pack.id}" 与内置主题冲突，请修改 id 后重试`);
  }

  const filePath = path.join(getUserThemesDirectory(), `${pack.id}.json`);
  fs.writeFileSync(filePath, serializeThemePack(pack), "utf8");
  return summarizeThemePack(pack, "user");
}

export function exportThemePackJson(key: string): string {
  const pack = getThemePack(key);
  if (!pack) {
    throw new Error("Theme Pack 不存在");
  }
  return serializeThemePack(pack);
}

export function deleteUserThemePack(key: string): void {
  const parsed = parseThemePackKey(key);
  if (!parsed || parsed.source !== "user") {
    throw new Error("只能删除用户导入的 Theme Pack");
  }
  const filePath = path.join(getUserThemesDirectory(), `${parsed.id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function validateThemePackPayload(raw: unknown): ThemePack {
  return validateThemePack(raw);
}
