import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LEGACY_SKILLS_SKILLS_DIR, MY_SKILLS_SKILLS_DIR } from "../shared/skillPaths";
import {
  collectCursorRuleFiles,
  collectSkillMarkdownFiles,
  dedupeDiscoveredSkills,
  detectAgentTools,
  globalSkillRoots,
  isImportableSkillPath,
  isSkillFileExtension,
  parseSkillMetadata,
  readSkillDescription,
} from "../shared/skillDiscovery";
import type { ExternalSkillRecord, ImportExternalSkillInput, ProjectScanResult, SkillSourceTool } from "../shared/types";
import { getDiscoveredProjectSkills, getProject, importExternalSkill, saveProjectScanCache } from "./db";

const PROJECT_SKILL_ROOTS: Array<{ relative: string; tool: SkillSourceTool; managed: boolean; mode: "skills" | "rules" }> = [
  { relative: MY_SKILLS_SKILLS_DIR, tool: "my-skills", managed: true, mode: "skills" },
  { relative: LEGACY_SKILLS_SKILLS_DIR, tool: "my-skills", managed: false, mode: "skills" },
  { relative: ".claude/skills", tool: "claude-code", managed: false, mode: "skills" },
  { relative: ".codex/skills", tool: "codex", managed: false, mode: "skills" },
  { relative: ".agents/skills", tool: "agents", managed: false, mode: "skills" },
  { relative: ".cursor/skills", tool: "cursor", managed: false, mode: "skills" },
  { relative: ".cursor/rules", tool: "cursor", managed: false, mode: "rules" },
];

const ENTRY_FILES: Array<{ name: string; tool: SkillSourceTool }> = [
  { name: "AGENTS.md", tool: "codex" },
  { name: "CLAUDE.md", tool: "claude-code" },
  { name: "HERMES.md", tool: "hermes" },
];

const LOCK_FILES: Array<{ name: string; tool: SkillSourceTool }> = [
  { name: ".my-skills-lock.json", tool: "my-skills" },
  { name: ".skills-lock.json", tool: "my-skills" },
];

function recordFor(
  filePath: string,
  tool: SkillSourceTool,
  managed: boolean,
  scope: ExternalSkillRecord["scope"],
  relativePath: string,
): ExternalSkillRecord {
  const baseName = path.basename(filePath, path.extname(filePath));
  const name = baseName.toLowerCase() === "skill" ? path.basename(path.dirname(filePath)) : baseName;
  const extension = path.extname(filePath).toLowerCase();
  const format: ExternalSkillRecord["format"] = extension === ".json" ? "json" : extension === ".mdc" ? "mdc" : "md";
  return {
    id: `${scope}:${tool}:${relativePath}`,
    name,
    tool,
    path: filePath,
    relativePath,
    format,
    managed,
    importable: isImportableSkillPath(relativePath, managed, format),
    description: readSkillDescription(filePath),
    scope,
  };
}

function isSafeProjectRelativePath(projectPath: string, relativePath: string) {
  const resolved = path.resolve(projectPath, relativePath);
  const relative = path.relative(projectPath, resolved);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function toolForPath(relativePath: string): SkillSourceTool {
  if (relativePath.startsWith("~/.claude/") || relativePath.startsWith(".claude/")) return "claude-code";
  if (relativePath.startsWith("~/.codex/") || relativePath.startsWith(".codex/")) return "codex";
  if (relativePath.startsWith("~/.cursor/") || relativePath.startsWith(".cursor/")) return "cursor";
  if (relativePath.startsWith(".agents/")) return "agents";
  if (relativePath.startsWith(".my-skills/") || relativePath.startsWith(".jwh-skills/")) return "my-skills";
  return "my-skills";
}

function collectRawProjectSkills(projectPath: string) {
  const seen = new Set<string>();
  const skills: ExternalSkillRecord[] = [];

  for (const root of PROJECT_SKILL_ROOTS) {
    const rootPath = path.join(projectPath, root.relative);
    const files = root.mode === "rules" ? collectCursorRuleFiles(rootPath) : collectSkillMarkdownFiles(rootPath);
    for (const filePath of files) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      const relativePath = path.relative(projectPath, filePath).split(path.sep).join("/");
      skills.push(recordFor(filePath, root.tool, root.managed, "project", relativePath));
    }
  }

  for (const root of globalSkillRoots()) {
    for (const filePath of collectSkillMarkdownFiles(root.absolute)) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      const relativeToRoot = path.relative(root.absolute, filePath).split(path.sep).join("/");
      const relativePath = `${root.relativeLabel}/${relativeToRoot}`;
      skills.push(recordFor(filePath, root.tool, false, "global", relativePath));
    }
  }

  for (const entry of ENTRY_FILES) {
    const filePath = path.join(projectPath, entry.name);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      skills.push(recordFor(filePath, entry.tool, false, "project", entry.name));
    }
  }

  for (const lockFile of LOCK_FILES) {
    const filePath = path.join(projectPath, lockFile.name);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      skills.push(recordFor(filePath, lockFile.tool, false, "project", lockFile.name));
    }
  }

  return skills;
}

function normalizeDiscoveredSkills(skills: ExternalSkillRecord[]) {
  return dedupeDiscoveredSkills(skills) as ExternalSkillRecord[];
}

function splitDiscoveredSkills(skills: ExternalSkillRecord[]) {
  const projectScoped = skills.filter((skill) => skill.scope === "project");
  const globalScoped = skills.filter((skill) => skill.scope === "global");
  return {
    projectSkills: normalizeDiscoveredSkills(projectScoped),
    globalSkills: normalizeDiscoveredSkills(globalScoped),
  };
}

export function importProjectSkill(input: ImportExternalSkillInput) {
  const project = getProject(input.projectId);
  if (!project) throw new Error("项目不存在");

  const filePath = input.sourcePath ? path.resolve(input.sourcePath) : path.resolve(project.path, input.relativePath);
  if (!input.sourcePath && !isSafeProjectRelativePath(project.path, input.relativePath)) {
    throw new Error("Skill 路径不在项目目录内");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || !isSkillFileExtension(filePath)) {
    throw new Error("Skill 文件不存在或格式不支持");
  }

  const normalized = input.relativePath.split(path.sep).join("/");
  if (!isImportableSkillPath(normalized, false, path.extname(filePath).toLowerCase() === ".mdc" ? "mdc" : "md")) {
    throw new Error("该文件是项目入口规则，不是可导入的 Skill 文件");
  }

  const content = fs.readFileSync(filePath, "utf8");
  const metadata = parseSkillMetadata(content, filePath);
  const id = `external:${crypto.createHash("sha1").update(`${project.id}:${filePath}`).digest("hex")}`;
  const platform = toolForPath(normalized);
  const category = input.sourcePath ? `外部导入 / ${project.name} / 全局 Agent` : `外部导入 / ${project.name}`;
  return importExternalSkill({
    id,
    name: metadata.name,
    description: metadata.description,
    category,
    platforms: [platform],
    content,
    sourcePath: filePath,
  });
}

export function scanProject(projectId: string): ProjectScanResult {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const { projectSkills, globalSkills } = splitDiscoveredSkills(collectRawProjectSkills(project.path));
  const discoveredTools = detectAgentTools([...projectSkills, ...globalSkills]);
  saveProjectScanCache(projectId, projectSkills, discoveredTools);
  return {
    project: getProject(projectId)!,
    skills: projectSkills,
    globalSkills,
    scannedAt: new Date().toISOString(),
  };
}

export function loadDiscoveredProjectSkills(projectId: string): ProjectScanResult {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const rawSkills = collectRawProjectSkills(project.path);
  const { projectSkills, globalSkills } = splitDiscoveredSkills(rawSkills);
  const cachedSkills = getDiscoveredProjectSkills(projectId);
  return {
    project,
    skills: cachedSkills.length > 0 ? cachedSkills : projectSkills,
    globalSkills,
    scannedAt: project.lastScannedAt ?? new Date().toISOString(),
  };
}
