import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AGENT_TOOL_SKILL_DIRS } from "./skillDeploy";
import type { ProjectSummary } from "./types";

export const HERMES_SKILLFORGE_MARKER = "# skillforge";
export const HERMES_CONFIG_RELATIVE = ".hermes/config.yaml";
const DESKTOP_OWNER_FILE = "desktop-owner.json";

function readWindowsEnvironmentVariable(name: string, scope: "User" | "Machine" | "Process") {
  if (process.platform !== "win32") return undefined;
  try {
    const value = execSync(
      `powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('${name}','${scope}')"`,
      { encoding: "utf8", timeout: 5000 },
    ).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function readHermesHomesFromWindowsEnvironment() {
  if (process.platform !== "win32") return [] as string[];
  const homes = new Set<string>();
  for (const scope of ["User", "Machine", "Process"] as const) {
    const value = readWindowsEnvironmentVariable("HERMES_HOME", scope);
    if (value) homes.add(normalizeHermesHome(value));
  }
  return [...homes];
}

function platformDefaultHermesHome() {
  const localAppData = process.env.LOCALAPPDATA;
  if (process.platform === "win32" && localAppData) {
    return path.join(localAppData, "hermes");
  }
  return path.join(os.homedir(), ".hermes");
}

function normalizeHermesHome(targetPath: string) {
  return path.resolve(targetPath);
}

function readHermesHomeFromDesktopOwner(ownerPath: string) {
  try {
    const owner = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as { hermesHome?: string };
    return owner.hermesHome?.trim();
  } catch {
    return undefined;
  }
}

function discoverHermesDesktopHomesFromRunningProcess() {
  if (process.platform !== "win32") return [] as string[];
  try {
    const output = execSync(
      "powershell -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*HermesDesktop*' -or $_.Name -like '*hermes-agent-cn-desktop*' } | Select-Object -ExpandProperty ExecutablePath\"",
      { encoding: "utf8", timeout: 8000 },
    ).trim();
    const homes = new Set<string>();
    for (const executablePath of output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
      const ownerPath = path.join(path.dirname(executablePath), "data", DESKTOP_OWNER_FILE);
      const hermesHome = readHermesHomeFromDesktopOwner(ownerPath);
      if (hermesHome) homes.add(normalizeHermesHome(hermesHome));
    }
    return [...homes];
  } catch {
    return [] as string[];
  }
}

function discoverHermesDesktopHomesFromInstallDirs() {
  const homes = new Set<string>();
  const ownerCandidates = new Set<string>();

  for (const root of [process.env.LOCALAPPDATA, process.env.APPDATA, os.homedir(), process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]) {
    if (!root) continue;
    ownerCandidates.add(path.join(root, "HermesDesktop", "data", DESKTOP_OWNER_FILE));
    const parent = path.resolve(root);
    if (!fs.existsSync(parent)) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(parent, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !/hermes/i.test(entry.name)) continue;
      ownerCandidates.add(path.join(parent, entry.name, "data", DESKTOP_OWNER_FILE));
    }
  }

  for (const ownerPath of ownerCandidates) {
    const hermesHome = readHermesHomeFromDesktopOwner(ownerPath);
    if (hermesHome) homes.add(normalizeHermesHome(hermesHome));
  }

  return [...homes];
}

export function resolveHermesHome() {
  const fromProcess = process.env.HERMES_HOME?.trim();
  if (fromProcess) return fromProcess;

  for (const scope of ["User", "Machine", "Process"] as const) {
    const fromWindows = readWindowsEnvironmentVariable("HERMES_HOME", scope);
    if (fromWindows) return fromWindows;
  }

  return platformDefaultHermesHome();
}

export function resolveHermesHomes() {
  const homes = new Set<string>();

  for (const home of readHermesHomesFromWindowsEnvironment()) homes.add(home);

  const fromProcess = process.env.HERMES_HOME?.trim();
  if (fromProcess) homes.add(normalizeHermesHome(fromProcess));

  for (const home of [
    ...discoverHermesDesktopHomesFromRunningProcess(),
    ...discoverHermesDesktopHomesFromInstallDirs(),
  ]) {
    homes.add(home);
  }

  const defaultHome = normalizeHermesHome(platformDefaultHermesHome());
  if (homes.size === 0 || fs.existsSync(defaultHome)) homes.add(defaultHome);

  return [...homes].sort();
}

export function resolveHermesConfigPath(home = resolveHermesHome()) {
  return path.join(home, "config.yaml");
}

export function resolveHermesConfigPaths() {
  return resolveHermesHomes().map((home) => resolveHermesConfigPath(home));
}

export function normalizeHermesConfigPath(targetPath: string) {
  return path.resolve(targetPath).replace(/\\/g, "/");
}

export function hermesExternalSkillsDir(projectPath: string) {
  return path.join(projectPath, AGENT_TOOL_SKILL_DIRS.hermes);
}

export function collectHermesExternalDirs(projects: ProjectSummary[]) {
  const dirs = new Set<string>();
  for (const project of projects) {
    if (!project.tools.includes("hermes") || project.skillCount <= 0) continue;
    const skillsDir = hermesExternalSkillsDir(project.path);
    if (!fs.existsSync(skillsDir)) continue;
    dirs.add(normalizeHermesConfigPath(skillsDir));
  }
  return [...dirs].sort();
}

function parseExternalDirLines(configText: string) {
  const lines = configText.split("\n");
  const skillsIndex = lines.findIndex((line) => /^skills:\s*$/.test(line));
  if (skillsIndex === -1) return { lines, skillsIndex: -1, externalIndex: -1, entries: [] as string[] };

  let externalIndex = -1;
  for (let index = skillsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/.test(line) && !/^\s/.test(line)) break;
    if (/^  external_dirs:/.test(line)) {
      externalIndex = index;
      break;
    }
  }

  if (externalIndex === -1) return { lines, skillsIndex, externalIndex: -1, entries: [] as string[] };

  const externalLine = parsedExternalDirLine(lines[externalIndex]);
  if (externalLine.inlineEmpty) {
    return { lines, skillsIndex, externalIndex, entries: [] as string[] };
  }

  const entries: string[] = [];
  for (let index = externalIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^    - /.test(line)) break;
    if (line.includes(HERMES_SKILLFORGE_MARKER)) continue;
    entries.push(line.replace(/^    - /, "").trim());
  }

  return { lines, skillsIndex, externalIndex, entries };
}

function parsedExternalDirLine(line: string) {
  return {
    inlineEmpty: /^  external_dirs:\s*\[\]\s*$/.test(line),
  };
}

function buildExternalDirBlock(managedDirs: string[], preservedEntries: string[]) {
  const managedLines = managedDirs.map((dir) => `    - ${dir}  ${HERMES_SKILLFORGE_MARKER}`);
  const preservedLines = preservedEntries.map((entry) => `    - ${entry}`);
  const externalLines = [...managedLines, ...preservedLines];
  if (externalLines.length === 0) return ["  external_dirs: []"];
  return ["  external_dirs:", ...externalLines];
}

function buildSkillsSection(managedDirs: string[], preservedEntries: string[]) {
  return ["skills:", ...buildExternalDirBlock(managedDirs, preservedEntries), ""].join("\n");
}

export function upsertHermesExternalDirs(managedDirs: string[], configPath = resolveHermesConfigPath()) {
  const previous = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const parsed = parseExternalDirLines(previous);
  const externalBlock = buildExternalDirBlock(managedDirs, parsed.entries);

  let next = "";
  if (parsed.skillsIndex === -1) {
    next = `${previous.trimEnd()}${previous.trim() ? "\n\n" : ""}${buildSkillsSection(managedDirs, parsed.entries)}`;
  } else if (parsed.externalIndex === -1) {
    next = [
      ...parsed.lines.slice(0, parsed.skillsIndex + 1),
      ...externalBlock,
      ...parsed.lines.slice(parsed.skillsIndex + 1),
    ].join("\n");
  } else {
    let sectionEnd = parsed.externalIndex + 1;
    if (!parsedExternalDirLine(parsed.lines[parsed.externalIndex]).inlineEmpty) {
      while (sectionEnd < parsed.lines.length && /^    - /.test(parsed.lines[sectionEnd])) sectionEnd += 1;
    }
    next = [
      ...parsed.lines.slice(0, parsed.externalIndex),
      ...externalBlock,
      ...parsed.lines.slice(sectionEnd),
    ].join("\n");
  }

  if (!next.endsWith("\n")) next += "\n";
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, next, "utf8");
  return configPath;
}

export function syncHermesExternalDirs(projects: ProjectSummary[]) {
  const managedDirs = collectHermesExternalDirs(projects);
  const configPaths = resolveHermesConfigPaths().map((configPath) => upsertHermesExternalDirs(managedDirs, configPath));
  return { configPaths, managedDirs };
}
