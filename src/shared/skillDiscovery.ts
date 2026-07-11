import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SkillSourceTool } from "./types";

export const IGNORED_SKILL_FILE_NAMES = new Set([
  "readme.md",
  "index.md",
  "agents.md",
  "claude.md",
  "hermes.md",
  "license.txt",
  "license.md",
  "contributing.md",
]);

export function isSkillFileExtension(filePath: string) {
  return [".md", ".mdc"].includes(path.extname(filePath).toLowerCase());
}

/** Collect skill entry files under an agent skills tree (SKILL.md packages or flat *.md). */
export function collectSkillMarkdownFiles(rootPath: string): string[] {
  if (!fs.existsSync(rootPath)) return [];
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) return isSkillFileExtension(rootPath) ? [rootPath] : [];

  const directSkillFile = path.join(rootPath, "SKILL.md");
  if (fs.existsSync(directSkillFile) && fs.statSync(directSkillFile).isFile()) {
    return [directSkillFile];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const filePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSkillMarkdownFiles(filePath));
    } else if (
      entry.isFile() &&
      isSkillFileExtension(filePath) &&
      !IGNORED_SKILL_FILE_NAMES.has(entry.name.toLowerCase())
    ) {
      files.push(filePath);
    }
  }
  return dedupeSkillFiles(files);
}

/** Collect Cursor rule files directly under `.cursor/rules`. */
export function collectCursorRuleFiles(rootPath: string): string[] {
  if (!fs.existsSync(rootPath)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const filePath = path.join(rootPath, entry.name);
    if (entry.isFile() && isSkillFileExtension(filePath)) files.push(filePath);
  }
  return files;
}

function dedupeSkillFiles(files: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const file of files) {
    const key = path.join(path.dirname(file), path.basename(file, path.extname(file))).toLowerCase();
    const existing = byKey.get(key);
    if (!existing || path.extname(file).toLowerCase() === ".md") byKey.set(key, file);
  }
  return [...byKey.values()];
}

export function parseSkillMetadata(content: string, filePath: string) {
  const frontmatterName = content.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const frontmatterDescription = content.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const quoteDescription = content.match(/^>\s+(.+)$/m)?.[1]?.trim();
  const baseName = path.basename(filePath, path.extname(filePath));
  const name =
    frontmatterName ||
    heading ||
    (baseName.toLowerCase() === "skill" ? path.basename(path.dirname(filePath)) : baseName);
  const description = frontmatterDescription || quoteDescription || "未读取到描述";
  return { name, description };
}

export function readSkillDescription(filePath: string) {
  if (path.extname(filePath).toLowerCase() === ".json") return "项目 Skill 锁定文件，仅用于同步识别";
  const content = fs.readFileSync(filePath, "utf8");
  return parseSkillMetadata(content, filePath).description;
}

export function isImportableSkillPath(relativePath: string, managed: boolean, format: "md" | "mdc" | "json") {
  if (format === "json" || managed) return false;
  return (
    relativePath.includes("/skills/") ||
    relativePath.startsWith(".cursor/rules/") ||
    relativePath.startsWith(".cursor/skills/") ||
    relativePath.startsWith("~/")
  );
}

const TOOL_PRIORITY: Record<SkillSourceTool, number> = {
  "my-skills": 0,
  codex: 2,
  "claude-code": 3,
  cursor: 4,
  hermes: 5,
  agents: 6,
};

function discoveryPriority(record: { scope: "project" | "global"; relativePath: string; tool: SkillSourceTool }) {
  let score = TOOL_PRIORITY[record.tool] ?? 9;
  if (record.scope === "global") score += 20;
  if (record.relativePath.startsWith(".jwh-skills/")) score -= 3;
  if (record.relativePath.startsWith(".my-skills/")) score -= 4;
  return score;
}

export function dedupeDiscoveredSkills(skills: Array<{ name: string; scope: "project" | "global"; relativePath: string; tool: SkillSourceTool; importable: boolean; managed: boolean }>) {
  const byName = new Map<string, (typeof skills)[number]>();
  for (const skill of skills) {
    if (!skill.importable || skill.managed) continue;
    const key = skill.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || discoveryPriority(skill) < discoveryPriority(existing)) byName.set(key, skill);
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export function detectAgentTools(skills: Array<{ tool: SkillSourceTool }>): Array<"codex" | "cursor" | "claude-code" | "hermes"> {
  const tools = new Set<"codex" | "cursor" | "claude-code" | "hermes">();
  for (const skill of skills) {
    if (skill.tool === "codex" || skill.tool === "cursor" || skill.tool === "claude-code" || skill.tool === "hermes") {
      tools.add(skill.tool);
    }
  }
  return [...tools];
}

export function globalSkillRoots(): Array<{ absolute: string; tool: SkillSourceTool; relativeLabel: string }> {
  const home = os.homedir();
  return [
    { absolute: path.join(home, ".codex", "skills"), tool: "codex", relativeLabel: "~/.codex/skills" },
    { absolute: path.join(home, ".claude", "skills"), tool: "claude-code", relativeLabel: "~/.claude/skills" },
    { absolute: path.join(home, ".cursor", "skills"), tool: "cursor", relativeLabel: "~/.cursor/skills" },
  ];
}
