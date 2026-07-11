import Database from "better-sqlite3";
import { app } from "electron";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentTool, CreatePresetInput, CreateSkillInput, ExternalSkillRecord, PresetSummary, ProjectSummary, SkillCategoryCount, SkillNavigationSnapshot, SkillQuery, SkillSummary, UpdatePresetInput, UpdateSkillInput } from "../shared/types";
import { buildSkillNavigation, matchesNavigationKey, NAV_ALL } from "../shared/skillNavigation";
import { collectSkillMarkdownFiles, parseSkillMetadata } from "../shared/skillDiscovery";

let database: Database.Database | null = null;
let databasePath: string | null = null;
const execFileAsync = promisify(execFile);

function gitCommandOptions() {
  const settings = getSettings();
  const host = settings.proxyHost?.trim();
  const port = Number.parseInt(settings.proxyPort?.trim() ?? "", 10);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { windowsHide: true, maxBuffer: 1024 * 1024 * 8 };
  }
  const proxyPrefix = /^(https?|socks5):\/\//i.test(host) ? host : `http://${host}`;
  const proxy = `${proxyPrefix}:${port}`;
  return {
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 8,
    env: { ...process.env, HTTP_PROXY: proxy, HTTPS_PROXY: proxy, ALL_PROXY: proxy, http_proxy: proxy, https_proxy: proxy, all_proxy: proxy },
  };
}

function getResourceSkillsPath() {
  const packagedPath = path.join(process.resourcesPath, "skills");
  if (fs.existsSync(packagedPath)) return packagedPath;
  return path.join(app.getAppPath(), "resources", "skills");
}

function parseSkillFile(filePath: string, category = "内置 Skill"): SkillSummary {
  const content = fs.readFileSync(filePath, "utf8");
  const metadata = parseSkillMetadata(content, filePath);
  const platforms = content
    .match(/^支持平台:\s*(.+)$/m)?.[1]
    ?.split(",")
    .map((platform) => platform.trim()) ?? [];

  return {
    id: metadata.name,
    name: metadata.name,
    description: metadata.description === "未读取到描述" ? "暂无描述" : metadata.description,
    category,
    platforms,
    content,
  };
}

function seedSkills() {
  const skillsPath = getResourceSkillsPath();
  if (!fs.existsSync(skillsPath)) return;

  const insert = database!.prepare(`
    INSERT INTO skills (id, name, description, category, platforms, content, source_type, source_path)
    VALUES (@id, @name, @description, @category, @platforms, @content, 'builtin', @sourcePath)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      platforms = excluded.platforms,
      content = excluded.content,
      source_type = 'builtin',
      source_path = excluded.source_path,
      updated_at = CURRENT_TIMESTAMP
  `);

  const files: Array<{ filePath: string; category: string }> = [];
  const collect = (currentPath: string) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const filePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        collect(filePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && entry.name.toLowerCase() !== "readme.md") {
        const relativeDirectory = path.relative(skillsPath, path.dirname(filePath));
        files.push({ filePath, category: relativeDirectory ? relativeDirectory.split(path.sep).join(" / ") : "内置 Skill" });
      }
    }
  };
  collect(skillsPath);

  const transaction = database!.transaction(() => {
    const seededIds: string[] = [];
    for (const file of files) {
      const skill = parseSkillFile(file.filePath, file.category);
      seededIds.push(skill.id);
      insert.run({
        ...skill,
        platforms: JSON.stringify(skill.platforms),
        sourcePath: file.filePath,
      });
    }
    if (seededIds.length > 0) {
      const placeholders = seededIds.map(() => "?").join(", ");
      database!
        .prepare(`DELETE FROM skills WHERE source_type = 'builtin' AND source_path IS NOT NULL AND id NOT IN (${placeholders})`)
        .run(...seededIds);
    }
  });
  transaction();
}

export function initializeDatabase() {
  const userDataPath = app.getPath("userData");
  const databaseFile = path.join(userDataPath, "skillforge.db");
  const legacyDatabaseFiles = [
    path.join(userDataPath, "jwh-skill.db"),
    path.join(userDataPath, "skillforge-desktop.db"),
  ];
  if (!fs.existsSync(databaseFile)) {
    for (const legacyPath of legacyDatabaseFiles) {
      if (fs.existsSync(legacyPath)) {
        fs.copyFileSync(legacyPath, databaseFile);
        break;
      }
    }
  }
  databasePath = databaseFile;
  database = new Database(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '未分类',
      platforms TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      content TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      source_type TEXT NOT NULL DEFAULT 'builtin',
      source_path TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      tools TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_skills (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, skill_id)
    );
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      tools TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS preset_skills (
      preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (preset_id, skill_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try {
    database.exec("ALTER TABLE skills ADD COLUMN source_type TEXT NOT NULL DEFAULT 'builtin'");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE skills ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE skills ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE skills ADD COLUMN source_path TEXT");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE skills ADD COLUMN source_url TEXT");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE projects ADD COLUMN discovered_skill_count INTEGER NOT NULL DEFAULT 0");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE projects ADD COLUMN discovered_tools TEXT NOT NULL DEFAULT '[]'");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE projects ADD COLUMN scan_cache TEXT");
  } catch {
    // Column already exists in an initialized database.
  }
  try {
    database.exec("ALTER TABLE projects ADD COLUMN last_scanned_at TEXT");
  } catch {
    // Column already exists in an initialized database.
  }
  database.pragma("foreign_keys = ON");
  seedSkills();
}

export function listSkillNavigation(): SkillNavigationSnapshot {
  if (!database) throw new Error("Database is not initialized");
  const rows = database
    .prepare(`
      SELECT category, source_type AS sourceType, source_path AS sourcePath, source_url AS sourceUrl
      FROM skills
    `)
    .all() as Array<{
    category: string;
    sourceType: "builtin" | "external";
    sourcePath: string | null;
    sourceUrl: string | null;
  }>;
  return buildSkillNavigation(rows);
}

export function listSkillCategories(): SkillCategoryCount[] {
  return listSkillNavigation().builtinCategories;
}

export function listSkills(query: SkillQuery = {}): SkillSummary[] {
  if (!database) throw new Error("Database is not initialized");
  const search = query.search?.trim() ?? "";
  const category = query.category?.trim() ?? "";
  const navigationKey = query.navigationKey?.trim() ?? "";
  const rows = database
    .prepare(`
      SELECT id, name, description, category, platforms, tags, content, enabled, source_type AS sourceType, source_path AS sourcePath, source_url AS sourceUrl
      FROM skills
      WHERE (@search = '' OR name LIKE @pattern OR description LIKE @pattern OR tags LIKE @pattern)
        AND (
          @useNavigation = 1
          OR @category = ''
          OR category = @category
          OR category LIKE @categoryPrefix
        )
      ORDER BY name COLLATE NOCASE ASC
    `)
    .all({
      search,
      pattern: `%${search}%`,
      category,
      categoryPrefix: category ? `${category} / %` : "",
      useNavigation: navigationKey && navigationKey !== NAV_ALL ? 1 : 0,
    }) as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    platforms: string;
    tags: string;
    content: string;
    enabled: number;
    sourceType: "builtin" | "external";
    sourcePath: string | null;
    sourceUrl: string | null;
  }>;

  return rows
    .map((row) => ({
      ...row,
      platforms: JSON.parse(row.platforms) as string[],
      tags: JSON.parse(row.tags) as string[],
      sourceType: row.sourceType,
      enabled: row.enabled === 1,
      sourceUrl: row.sourceUrl,
    }))
    .filter((skill) => (navigationKey && navigationKey !== NAV_ALL ? matchesNavigationKey(skill, navigationKey) : true));
}

function projectRowToSummary(row: {
  id: string;
  name: string;
  path: string;
  tools: string;
  skillCount: number;
  discoveredSkillCount?: number;
  discoveredTools?: string;
  lastScannedAt?: string | null;
  updatedAt: string;
}): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    tools: JSON.parse(row.tools) as AgentTool[],
    skillCount: row.skillCount,
    discoveredSkillCount: row.discoveredSkillCount ?? 0,
    discoveredTools: JSON.parse(row.discoveredTools ?? "[]") as AgentTool[],
    lastScannedAt: row.lastScannedAt ?? null,
    updatedAt: row.updatedAt,
  };
}

export function listProjects(): ProjectSummary[] {
  if (!database) throw new Error("Database is not initialized");
  const rows = database
    .prepare(`
      SELECT p.id, p.name, p.path, p.tools,
             COUNT(ps.skill_id) AS skillCount,
             p.discovered_skill_count AS discoveredSkillCount,
             p.discovered_tools AS discoveredTools,
             p.last_scanned_at AS lastScannedAt,
             p.updated_at AS updatedAt
      FROM projects p
      LEFT JOIN project_skills ps ON ps.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `)
    .all() as Array<{
    id: string;
    name: string;
    path: string;
    tools: string;
    skillCount: number;
    discoveredSkillCount: number;
    discoveredTools: string;
    lastScannedAt: string | null;
    updatedAt: string;
  }>;
  return rows.map(projectRowToSummary);
}

export function getProject(projectId: string): ProjectSummary | null {
  if (!database) throw new Error("Database is not initialized");
  const row = database
    .prepare(`
      SELECT p.id, p.name, p.path, p.tools,
             COUNT(ps.skill_id) AS skillCount,
             p.discovered_skill_count AS discoveredSkillCount,
             p.discovered_tools AS discoveredTools,
             p.last_scanned_at AS lastScannedAt,
             p.updated_at AS updatedAt
      FROM projects p
      LEFT JOIN project_skills ps ON ps.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `)
    .get(projectId) as {
    id: string;
    name: string;
    path: string;
    tools: string;
    skillCount: number;
    discoveredSkillCount: number;
    discoveredTools: string;
    lastScannedAt: string | null;
    updatedAt: string;
  } | undefined;
  return row ? projectRowToSummary(row) : null;
}

export function saveProjectScanCache(projectId: string, skills: ExternalSkillRecord[], discoveredTools: AgentTool[]) {
  if (!database) throw new Error("Database is not initialized");
  database
    .prepare(`
      UPDATE projects
      SET discovered_skill_count = ?,
          discovered_tools = ?,
          scan_cache = ?,
          last_scanned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(skills.length, JSON.stringify(discoveredTools), JSON.stringify(skills), projectId);
}

export function getDiscoveredProjectSkills(projectId: string): ExternalSkillRecord[] {
  if (!database) throw new Error("Database is not initialized");
  const row = database.prepare("SELECT scan_cache AS scanCache FROM projects WHERE id = ?").get(projectId) as { scanCache: string | null } | undefined;
  if (!row?.scanCache) return [];
  try {
    return JSON.parse(row.scanCache) as ExternalSkillRecord[];
  } catch {
    return [];
  }
}

export function addProject(projectPath: string): ProjectSummary {
  if (!database) throw new Error("Database is not initialized");
  const normalizedPath = path.resolve(projectPath);
  if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isDirectory()) {
    throw new Error("选择的路径不是有效的项目文件夹");
  }

  const existing = database.prepare("SELECT id FROM projects WHERE path = ?").get(normalizedPath) as { id: string } | undefined;
  if (existing) return getProject(existing.id)!;

  const id = crypto.randomUUID();
  database
    .prepare("INSERT INTO projects (id, name, path) VALUES (?, ?, ?)")
    .run(id, path.basename(normalizedPath), normalizedPath);
  return getProject(id)!;
}

export function updateProjectBindings(projectId: string, skillIds: string[], tools: AgentTool[]) {
  if (!database) throw new Error("Database is not initialized");
  const transaction = database.transaction(() => {
    database!.prepare("DELETE FROM project_skills WHERE project_id = ?").run(projectId);
    const insert = database!.prepare("INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)");
    for (const skillId of skillIds) insert.run(projectId, skillId);
    database!
      .prepare("UPDATE projects SET tools = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(tools), projectId);
  });
  transaction();
}

export function getProjectSkillIds(projectId: string): string[] {
  if (!database) throw new Error("Database is not initialized");
  const rows = database.prepare("SELECT skill_id AS skillId FROM project_skills WHERE project_id = ?").all(projectId) as Array<{ skillId: string }>;
  return rows.map((row) => row.skillId);
}

export function getSkillsByIds(skillIds: string[]): SkillSummary[] {
  if (!database || skillIds.length === 0) return [];
  const placeholders = skillIds.map(() => "?").join(", ");
  const rows = database
    .prepare(`SELECT id, name, description, category, platforms, tags, content, enabled, source_type AS sourceType, source_path AS sourcePath, source_url AS sourceUrl FROM skills WHERE id IN (${placeholders})`)
    .all(...skillIds) as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    platforms: string;
    tags: string;
    content: string;
    enabled: number;
    sourceType: "builtin" | "external";
    sourcePath: string | null;
    sourceUrl: string | null;
  }>;
  return rows.map((row) => ({ ...row, platforms: JSON.parse(row.platforms) as string[], tags: JSON.parse(row.tags) as string[], sourceType: row.sourceType, sourceUrl: row.sourceUrl, enabled: row.enabled === 1 }));
}

export function getSkillById(skillId: string): SkillSummary | null {
  if (!database) throw new Error("Database is not initialized");
  const row = database
    .prepare("SELECT id, name, description, category, platforms, tags, content, enabled, source_type AS sourceType, source_path AS sourcePath, source_url AS sourceUrl FROM skills WHERE id = ?")
    .get(skillId) as {
    id: string;
    name: string;
    description: string;
    category: string;
    platforms: string;
    tags: string;
    content: string;
    enabled: number;
    sourceType: "builtin" | "external";
    sourcePath: string | null;
    sourceUrl: string | null;
  } | undefined;
  return row ? { ...row, platforms: JSON.parse(row.platforms) as string[], tags: JSON.parse(row.tags) as string[], sourceType: row.sourceType, sourceUrl: row.sourceUrl, enabled: row.enabled === 1 } : null;
}

export function setSkillTags(skillId: string, tags: string[]) {
  if (!database) throw new Error("Database is not initialized");
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
  database.prepare("UPDATE skills SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(normalized), skillId);
  return getSkillById(skillId);
}

export function setSkillEnabled(skillId: string, enabled: boolean) {
  if (!database) throw new Error("Database is not initialized");
  database.prepare("UPDATE skills SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(enabled ? 1 : 0, skillId);
  return getSkillById(skillId);
}

export function setSkillsEnabled(skillIds: string[], enabled: boolean) {
  if (!database || skillIds.length === 0) return [];
  const validIds = [...new Set(skillIds)].filter((skillId) => getSkillById(skillId));
  if (validIds.length === 0) return [];
  const placeholders = validIds.map(() => "?").join(", ");
  const transaction = database.transaction(() => {
    database!.prepare(`UPDATE skills SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(enabled ? 1 : 0, ...validIds);
  });
  transaction();
  return getSkillsByIds(validIds);
}

export function setSkillsTags(skillIds: string[], tags: string[]) {
  if (!database || skillIds.length === 0) return [];
  const validIds = [...new Set(skillIds)].filter((skillId) => getSkillById(skillId));
  if (validIds.length === 0) return [];
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
  const placeholders = validIds.map(() => "?").join(", ");
  const transaction = database.transaction(() => {
    database!.prepare(`UPDATE skills SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(JSON.stringify(normalized), ...validIds);
  });
  transaction();
  return getSkillsByIds(validIds);
}

function validateSkillInput(input: CreateSkillInput) {
  const name = input.name.trim();
  const content = input.content.trim();
  if (!name) throw new Error("Skill 名称不能为空");
  if (!content) throw new Error("Skill 内容不能为空");
  return {
    name,
    description: input.description?.trim() ?? "",
    category: input.category?.trim() || "自定义 Skill",
    platforms: [...new Set(input.platforms.map((platform) => platform.trim()).filter(Boolean))],
    content,
  };
}

export function createSkill(input: CreateSkillInput): SkillSummary {
  if (!database) throw new Error("Database is not initialized");
  const normalized = validateSkillInput(input);
  const id = `custom:${crypto.randomUUID()}`;
  database
    .prepare(`
      INSERT INTO skills (id, name, description, category, platforms, content, source_type, source_path)
      VALUES (@id, @name, @description, @category, @platforms, @content, 'builtin', NULL)
    `)
    .run({ ...normalized, id, platforms: JSON.stringify(normalized.platforms) });
  return getSkillById(id)!;
}

export function updateSkill(input: UpdateSkillInput): SkillSummary {
  if (!database) throw new Error("Database is not initialized");
  const existing = getSkillById(input.skillId);
  if (!existing) throw new Error("Skill 不存在");
  if (existing.sourceType !== "external" && !existing.id.startsWith("custom:")) {
    throw new Error("内置 Skill 由资源文件维护，不能直接编辑");
  }
  const normalized = validateSkillInput(input);
  database
    .prepare("UPDATE skills SET name = ?, description = ?, category = ?, platforms = ?, content = ?, source_type = ?, source_path = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(normalized.name, normalized.description, normalized.category, JSON.stringify(normalized.platforms), normalized.content, existing.sourceType === "external" ? "builtin" : existing.sourceType, existing.sourceType === "external" ? null : existing.sourcePath ?? null, existing.sourceType === "external" ? null : existing.sourceUrl ?? null, input.skillId);
  return getSkillById(input.skillId)!;
}

export function deleteSkill(skillId: string) {
  if (!database) throw new Error("Database is not initialized");
  const skill = getSkillById(skillId);
  if (!skill) throw new Error("Skill 不存在");
  if (skill.sourceType !== "external" && !skill.id.startsWith("custom:")) {
    throw new Error("内置 Skill 不能删除，请使用禁用功能");
  }
  const projectReference = database.prepare("SELECT COUNT(*) AS count FROM project_skills WHERE skill_id = ?").get(skillId) as { count: number };
  const presetReference = database.prepare("SELECT COUNT(*) AS count FROM preset_skills WHERE skill_id = ?").get(skillId) as { count: number };
  if (projectReference.count > 0 || presetReference.count > 0) {
    throw new Error("该 Skill 仍被项目或 Preset 使用，请先解除绑定");
  }
  database.prepare("DELETE FROM skills WHERE id = ?").run(skillId);
}

function findGitRoot(startPath: string) {
  let currentPath = fs.statSync(startPath).isDirectory() ? startPath : path.dirname(startPath);
  while (true) {
    if (fs.existsSync(path.join(currentPath, ".git"))) return currentPath;
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}

export async function refreshExternalSkill(skillId: string): Promise<SkillSummary> {
  if (!database) throw new Error("Database is not initialized");
  const skill = getSkillById(skillId);
  if (!skill || skill.sourceType !== "external" || !skill.sourcePath) throw new Error("该 Skill 没有可同步的外部来源");
  if (!fs.existsSync(skill.sourcePath)) throw new Error("外部 Skill 来源文件不存在");
  if (skill.sourceUrl) {
    const gitRoot = findGitRoot(skill.sourcePath);
    if (!gitRoot) throw new Error("GitHub Skill 来源目录不存在 Git 元数据");
    try {
      await execFileAsync("git", ["-C", gitRoot, "pull", "--ff-only"], gitCommandOptions());
    } catch (error) {
      const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
      throw new Error(`GitHub Skill 同步失败${detail ? `：${detail}` : ""}`);
    }
  }
  const refreshed = parseSkillFile(skill.sourcePath, skill.category);
  database
    .prepare("UPDATE skills SET name = ?, description = ?, platforms = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(refreshed.name, refreshed.description, JSON.stringify(refreshed.platforms), refreshed.content, skillId);
  return getSkillById(skillId)!;
}

export function importExternalSkill(input: {
  id: string;
  name: string;
  description: string;
  category: string;
  platforms: string[];
  content: string;
  sourcePath: string;
  sourceUrl?: string;
}): SkillSummary {
  if (!database) throw new Error("Database is not initialized");
  database
    .prepare(`
      INSERT INTO skills (id, name, description, category, platforms, content, source_type, source_path, source_url)
      VALUES (@id, @name, @description, @category, @platforms, @content, 'external', @sourcePath, @sourceUrl)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        platforms = excluded.platforms,
        content = excluded.content,
        source_type = 'external',
        source_path = excluded.source_path,
        source_url = excluded.source_url,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run({ ...input, sourceUrl: input.sourceUrl ?? null, platforms: JSON.stringify(input.platforms) });
  return getSkillById(input.id)!;
}

export function importSkillFromFile(filePath: string): SkillSummary {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error("Skill 文件不存在");
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== ".md" && extension !== ".mdc") throw new Error("只支持 .md 或 .mdc Skill 文件");
  const skill = parseSkillFile(filePath, "外部导入");
  const id = `external:file:${crypto.createHash("sha1").update(path.resolve(filePath)).digest("hex")}`;
  return importExternalSkill({
    id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    platforms: skill.platforms,
    content: skill.content,
    sourcePath: path.resolve(filePath),
  });
}

function collectSkillFiles(rootPath: string): string[] {
  return collectSkillMarkdownFiles(rootPath);
}

export function importSkillsFromDirectory(directoryPath: string, sourceUrl?: string): SkillSummary[] {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) throw new Error("Skill 目录不存在");
  const files = collectSkillFiles(directoryPath);
  if (files.length === 0) throw new Error("目录中没有找到可导入的 .md 或 .mdc Skill 文件");
  return files.map((filePath) => {
    const relativeDirectory = path.relative(directoryPath, path.dirname(filePath));
    const category = relativeDirectory && relativeDirectory !== "." ? `外部导入 / ${relativeDirectory.split(path.sep).join(" / ")}` : "外部导入";
    const skill = parseSkillFile(filePath, category);
    const id = `external:folder:${crypto.createHash("sha1").update(path.resolve(filePath)).digest("hex")}`;
    return importExternalSkill({
      id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      platforms: skill.platforms,
      content: skill.content,
      sourcePath: path.resolve(filePath),
      sourceUrl,
    });
  });
}

export async function importSkillsFromGit(repositoryUrl: string): Promise<SkillSummary[]> {
  const normalizedUrl = repositoryUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error("请输入有效的 GitHub HTTPS 仓库地址");
  }
  if (parsedUrl.protocol !== "https:" || !["github.com", "www.github.com"].includes(parsedUrl.hostname.toLowerCase()) || parsedUrl.username || parsedUrl.password) {
    throw new Error("目前只支持不带账号信息的 GitHub HTTPS 地址");
  }
  const segments = parsedUrl.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments.length < 2) throw new Error("GitHub 地址需要包含 owner 和仓库名");
  const owner = segments[0];
  const repository = segments[1].replace(/\.git$/i, "");
  let cloneUrl = normalizedUrl;
  let branch: string | undefined;
  let subPath: string[] = [];
  if (segments.length > 2) {
    if (segments[2].toLowerCase() !== "tree" || !segments[3]) throw new Error("GitHub 地址只支持仓库根目录或 /tree/分支/子目录格式");
    branch = segments[3];
    subPath = segments.slice(4);
    cloneUrl = `https://github.com/${owner}/${repository}.git`;
  }

  const sourceId = crypto.createHash("sha1").update(normalizedUrl).digest("hex");
  const sourceDirectory = path.join(app.getPath("userData"), "skill-sources", sourceId);
  if (!fs.existsSync(sourceDirectory)) {
    fs.mkdirSync(path.dirname(sourceDirectory), { recursive: true });
    try {
      const cloneArguments = ["clone", "--depth", "1", "--no-tags", "--single-branch", ...(branch ? ["--branch", branch] : []), cloneUrl, sourceDirectory];
      await execFileAsync("git", cloneArguments, gitCommandOptions());
    } catch (error) {
      const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
      throw new Error(`GitHub 仓库克隆失败${detail ? `：${detail}` : "，请确认已安装 Git 且地址可访问"}`);
    }
  } else if (!fs.existsSync(path.join(sourceDirectory, ".git"))) {
    throw new Error("应用保存的 GitHub 来源目录不是有效 Git 仓库");
  }

  const importDirectory = path.resolve(sourceDirectory, ...subPath);
  const relativeImportDirectory = path.relative(sourceDirectory, importDirectory);
  if (relativeImportDirectory.startsWith("..") || path.isAbsolute(relativeImportDirectory)) throw new Error("GitHub Skill 子目录路径无效");
  if (!fs.existsSync(importDirectory) || !fs.statSync(importDirectory).isDirectory()) throw new Error("GitHub 指定的 Skill 子目录不存在");
  return importSkillsFromDirectory(importDirectory, normalizedUrl);
}

function presetRowToSummary(row: {
  id: string;
  name: string;
  description: string;
  tools: string;
  skillIds: string;
  createdAt: string;
  updatedAt: string;
}): PresetSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tools: JSON.parse(row.tools) as AgentTool[],
    skillIds: row.skillIds ? row.skillIds.split("\u001f") : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const PRESET_SELECT = `
  SELECT p.id, p.name, p.description, p.tools,
         COALESCE(GROUP_CONCAT(ps.skill_id, char(31)), '') AS skillIds,
         p.created_at AS createdAt, p.updated_at AS updatedAt
  FROM presets p
  LEFT JOIN preset_skills ps ON ps.preset_id = p.id
`;

export function listPresets(): PresetSummary[] {
  if (!database) throw new Error("Database is not initialized");
  const rows = database
    .prepare(`${PRESET_SELECT} GROUP BY p.id ORDER BY p.updated_at DESC`)
    .all() as Array<{
    id: string;
    name: string;
    description: string;
    tools: string;
    skillIds: string;
    createdAt: string;
    updatedAt: string;
  }>;
  return rows.map(presetRowToSummary);
}

export function getPreset(presetId: string): PresetSummary | null {
  if (!database) throw new Error("Database is not initialized");
  const row = database
    .prepare(`${PRESET_SELECT} WHERE p.id = ? GROUP BY p.id`)
    .get(presetId) as {
    id: string;
    name: string;
    description: string;
    tools: string;
    skillIds: string;
    createdAt: string;
    updatedAt: string;
  } | undefined;
  return row ? presetRowToSummary(row) : null;
}

export function createPreset(input: CreatePresetInput): PresetSummary {
  if (!database) throw new Error("Database is not initialized");
  const name = input.name.trim();
  if (!name) throw new Error("Preset 名称不能为空");
  const id = crypto.randomUUID();
  const validSkillIds = new Set(getSkillsByIds(input.skillIds).map((skill) => skill.id));
  const skillIds = [...new Set(input.skillIds.filter((skillId) => validSkillIds.has(skillId)))];
  const transaction = database.transaction(() => {
    database!
      .prepare("INSERT INTO presets (id, name, description, tools) VALUES (?, ?, ?, ?)")
      .run(id, name, input.description?.trim() ?? "", JSON.stringify(input.tools));
    const insert = database!.prepare("INSERT INTO preset_skills (preset_id, skill_id) VALUES (?, ?)");
    for (const skillId of skillIds) insert.run(id, skillId);
  });
  transaction();
  return getPreset(id)!;
}

export function updatePreset(input: UpdatePresetInput): PresetSummary {
  if (!database) throw new Error("Database is not initialized");
  const name = input.name.trim();
  if (!name) throw new Error("Preset 名称不能为空");
  if (!getPreset(input.presetId)) throw new Error("Preset 不存在");
  const validSkillIds = new Set(getSkillsByIds(input.skillIds).map((skill) => skill.id));
  const skillIds = [...new Set(input.skillIds.filter((skillId) => validSkillIds.has(skillId)))];
  const transaction = database.transaction(() => {
    database!
      .prepare("UPDATE presets SET name = ?, description = ?, tools = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(name, input.description?.trim() ?? "", JSON.stringify(input.tools), input.presetId);
    database!.prepare("DELETE FROM preset_skills WHERE preset_id = ?").run(input.presetId);
    const insert = database!.prepare("INSERT INTO preset_skills (preset_id, skill_id) VALUES (?, ?)");
    for (const skillId of skillIds) insert.run(input.presetId, skillId);
  });
  transaction();
  return getPreset(input.presetId)!;
}

export function deletePreset(presetId: string) {
  if (!database) throw new Error("Database is not initialized");
  database.prepare("DELETE FROM presets WHERE id = ?").run(presetId);
}

export function getDatabasePath() {
  if (!databasePath) throw new Error("Database is not initialized");
  return databasePath;
}

export function getSettings(): Record<string, string> {
  if (!database) throw new Error("Database is not initialized");
  const rows = database.prepare("SELECT key, value FROM settings ORDER BY key").all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function setSetting(key: string, value: string) {
  if (!database) throw new Error("Database is not initialized");
  database
    .prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .run(key, value);
}

export function backupDatabase(destination: string) {
  if (!database) throw new Error("Database is not initialized");
  return database.backup(destination);
}

export function exportData() {
  return {
    format: "skillforge-desktop-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    skills: listSkills(),
    projects: listProjects(),
    presets: listPresets(),
    settings: getSettings(),
  };
}

export function closeDatabase() {
  database?.close();
  database = null;
  databasePath = null;
}
