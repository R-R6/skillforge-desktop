import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ExternalSkillRecord, ImportExternalSkillInput, ProjectScanResult, SkillSourceTool } from "../shared/types";
import { getProject, importExternalSkill } from "./db";

const SKILL_ROOTS: Array<{ relative: string; tool: SkillSourceTool; managed: boolean }> = [
  { relative: ".jwh-skills/skills", tool: "jwh", managed: true },
  { relative: ".claude/skills", tool: "claude-code", managed: false },
  { relative: ".codex/skills", tool: "codex", managed: false },
  { relative: ".agents/skills", tool: "agents", managed: false },
  { relative: ".cursor/rules", tool: "cursor", managed: false },
];

const ENTRY_FILES: Array<{ name: string; tool: SkillSourceTool }> = [
  { name: "AGENTS.md", tool: "codex" },
  { name: "CLAUDE.md", tool: "claude-code" },
  { name: "HERMES.md", tool: "hermes" },
];

const LOCK_FILES: Array<{ name: string; tool: SkillSourceTool }> = [
  { name: ".skills-lock.json", tool: "jwh" },
];

function isSkillFile(filePath: string) {
  return [".md", ".mdc"].includes(path.extname(filePath).toLowerCase());
}

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    else if (entry.isFile() && isSkillFile(fullPath)) files.push(fullPath);
  }
  return files;
}

function readDescription(filePath: string) {
  if (path.extname(filePath).toLowerCase() === ".json") return "项目 Skill 锁定文件，仅用于同步识别";
  const content = fs.readFileSync(filePath, "utf8");
  return content.match(/^>\s+(.+)$/m)?.[1]?.trim() || content.match(/^description:\s*(.+)$/m)?.[1]?.trim() || "未读取到描述";
}

function recordFor(projectPath: string, filePath: string, tool: SkillSourceTool, managed: boolean): ExternalSkillRecord {
  const relativePath = path.relative(projectPath, filePath).split(path.sep).join("/");
  const baseName = path.basename(filePath, path.extname(filePath));
  const name = baseName.toLowerCase() === "skill" || baseName.toLowerCase() === "skill.md" ? path.basename(path.dirname(filePath)) : baseName;
  const extension = path.extname(filePath).toLowerCase();
  const format: ExternalSkillRecord["format"] = extension === ".json" ? "json" : extension === ".mdc" ? "mdc" : "md";
  return {
    id: `${tool}:${relativePath}`,
    name,
    tool,
    path: filePath,
    relativePath,
    format,
    managed,
    importable: format !== "json" && ((!managed && relativePath.includes("/skills/")) || relativePath.startsWith(".cursor/rules/"))
      ? true
      : false,
    description: readDescription(filePath),
  };
}

function isSafeProjectRelativePath(projectPath: string, relativePath: string) {
  const resolved = path.resolve(projectPath, relativePath);
  const relative = path.relative(projectPath, resolved);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function toolForPath(relativePath: string): SkillSourceTool {
  if (relativePath.startsWith(".claude/")) return "claude-code";
  if (relativePath.startsWith(".codex/")) return "codex";
  if (relativePath.startsWith(".agents/")) return "agents";
  if (relativePath.startsWith(".cursor/")) return "cursor";
  return "jwh";
}

export function importProjectSkill(input: ImportExternalSkillInput) {
  const project = getProject(input.projectId);
  if (!project) throw new Error("项目不存在");
  if (!isSafeProjectRelativePath(project.path, input.relativePath)) throw new Error("Skill 路径不在项目目录内");
  const normalized = input.relativePath.split(path.sep).join("/");
  const isImportable = normalized.includes("/skills/") || normalized.startsWith(".cursor/rules/");
  if (!isImportable) throw new Error("该文件是项目入口规则，不是可导入的 Skill 文件");
  const filePath = path.resolve(project.path, input.relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || !isSkillFile(filePath)) throw new Error("Skill 文件不存在或格式不支持");

  const content = fs.readFileSync(filePath, "utf8");
  const name = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, path.extname(filePath));
  const description = readDescription(filePath);
  const id = `external:${crypto.createHash("sha1").update(`${project.id}:${normalized}`).digest("hex")}`;
  const platform = toolForPath(normalized);
  return importExternalSkill({
    id,
    name,
    description,
    category: "外部导入",
    platforms: [platform],
    content,
    sourcePath: filePath,
  });
}

export function scanProject(projectId: string): ProjectScanResult {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const seen = new Set<string>();
  const skills: ExternalSkillRecord[] = [];

  for (const root of SKILL_ROOTS) {
    const rootPath = path.join(project.path, root.relative);
    for (const filePath of collectFiles(rootPath)) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      skills.push(recordFor(project.path, filePath, root.tool, root.managed));
    }
  }

  for (const entry of ENTRY_FILES) {
    const filePath = path.join(project.path, entry.name);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      skills.push(recordFor(project.path, filePath, entry.tool, false));
    }
  }

  for (const lockFile of LOCK_FILES) {
    const filePath = path.join(project.path, lockFile.name);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      skills.push(recordFor(project.path, filePath, lockFile.tool, false));
    }
  }

  return { project, skills, scannedAt: new Date().toISOString() };
}
