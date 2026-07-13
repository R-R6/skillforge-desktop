import fs from "node:fs";
import path from "node:path";
import {
  AGENT_TOOL_SKILL_DIRS,
  filterSkillsForTool,
  nativeSkillDirectory,
  nativeSkillFilePath,
  safeFileName,
  SKILLFORGE_MANAGED_MARKER,
  toAgentSkillMarkdown,
  toSkillSlug,
} from "../shared/skillDeploy";
import { syncHermesExternalDirs } from "../shared/hermesConfig";
import { MY_SKILLS_ROOT, MY_SKILLS_SKILLS_DIR, mySkillsAtReference } from "../shared/skillPaths";
import type { AgentTool, DeployProjectInput, DeploymentResult, SkillSummary } from "../shared/types";
import { getProject, getProjectSkillIds, getSkillsByIds, listProjects, updateProjectBindings } from "./db";

const BLOCK_START = "<!-- SKILLFORGE:START -->";
const BLOCK_END = "<!-- SKILLFORGE:END -->";
const ALL_AGENT_TOOLS: AgentTool[] = ["codex", "cursor", "claude-code", "hermes"];

function writeManagedBlock(filePath: string, body: string) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const block = `${BLOCK_START}\n${body.trim()}\n${BLOCK_END}`;
  const pattern = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`, "m");
  const next = pattern.test(previous) ? previous.replace(pattern, block) : `${previous.trimEnd()}${previous ? "\n\n" : ""}${block}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
}

function removeManagedBlock(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const previous = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`, "m");
  if (!pattern.test(previous)) return;
  const next = previous.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();
  if (next) fs.writeFileSync(filePath, `${next}\n`, "utf8");
  else fs.unlinkSync(filePath);
}

function toolEntryPath(projectPath: string, tool: AgentTool) {
  if (tool === "cursor") return path.join(projectPath, ".cursor", "rules", "skillforge-skills.mdc");
  const entryName: Record<Exclude<AgentTool, "cursor">, string> = {
    codex: "AGENTS.md",
    "claude-code": "CLAUDE.md",
    hermes: "HERMES.md",
  };
  return path.join(projectPath, entryName[tool]);
}

function writeSkillFiles(projectPath: string, skills: SkillSummary[]) {
  const skillsDir = path.join(projectPath, MY_SKILLS_SKILLS_DIR);
  fs.mkdirSync(skillsDir, { recursive: true });
  const files: string[] = [];

  for (const skill of skills) {
    const filePath = path.join(skillsDir, `${safeFileName(skill.name)}.md`);
    fs.writeFileSync(filePath, skill.content, "utf8");
    files.push(filePath);
  }

  const indexPath = path.join(projectPath, MY_SKILLS_ROOT, "index.md");
  const index = [
    "# SkillForge Desktop Skills",
    "",
    "本目录由 SkillForge Desktop 管理，请通过应用更新 Skill。",
    "",
    ...skills.map((skill) => `- [${skill.name}](./skills/${safeFileName(skill.name)}.md) - ${skill.description}`),
    "",
  ].join("\n");
  fs.writeFileSync(indexPath, index, "utf8");
  files.push(indexPath);
  return files;
}

function writeToolEntry(projectPath: string, tool: AgentTool, skills: SkillSummary[]) {
  const compatibleSkills = filterSkillsForTool(skills, tool);
  const slashSkills = compatibleSkills.map((skill) => `- /${toSkillSlug(skill)}`).join("\n");
  const references = compatibleSkills.map((skill) => `- ${mySkillsAtReference(`${safeFileName(skill.name)}.md`)}`).join("\n");
  const body = [
    "## SkillForge Desktop",
    "",
    "以下 Skill 已绑定到当前项目，可直接使用斜杠命令调用：",
    slashSkills || "- 暂无 Skill",
    "",
    "源文件：",
    references || "- 暂无 Skill",
  ].join("\n");
  const filePath = toolEntryPath(projectPath, tool);
  if (tool === "cursor") {
    writeManagedBlock(filePath, `---\ndescription: SkillForge Desktop project skills\nalwaysApply: false\n---\n\n${body}`);
    return filePath;
  }
  writeManagedBlock(filePath, body);
  return filePath;
}

function isManagedNativeSkillDir(skillDir: string) {
  return fs.existsSync(path.join(skillDir, SKILLFORGE_MANAGED_MARKER));
}

function removeManagedNativeSkillDir(skillDir: string) {
  if (!isManagedNativeSkillDir(skillDir)) return;
  fs.rmSync(skillDir, { recursive: true, force: true });
}

function cleanupNativeSkills(projectPath: string, tool: AgentTool, keepSlugs: Set<string>) {
  const root = path.join(projectPath, AGENT_TOOL_SKILL_DIRS[tool]);
  if (!fs.existsSync(root)) return;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (keepSlugs.has(entry.name)) continue;
    removeManagedNativeSkillDir(path.join(root, entry.name));
  }
}

function writeNativeSkill(projectPath: string, tool: AgentTool, skill: SkillSummary) {
  const slug = toSkillSlug(skill);
  const skillDir = nativeSkillDirectory(projectPath, tool, slug);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(nativeSkillFilePath(projectPath, tool, slug), toAgentSkillMarkdown(skill), "utf8");
  fs.writeFileSync(path.join(skillDir, SKILLFORGE_MANAGED_MARKER), `${skill.id}\n`, "utf8");
  return nativeSkillFilePath(projectPath, tool, slug);
}

function writeNativeSkills(projectPath: string, tool: AgentTool, skills: SkillSummary[]) {
  const compatibleSkills = filterSkillsForTool(skills, tool);
  const keepSlugs = new Set<string>();
  const files: string[] = [];

  for (const skill of compatibleSkills) {
    const slug = toSkillSlug(skill);
    keepSlugs.add(slug);
    files.push(writeNativeSkill(projectPath, tool, skill));
  }

  cleanupNativeSkills(projectPath, tool, keepSlugs);
  return files;
}

export function deployProject(input: DeployProjectInput): DeploymentResult {
  const project = getProject(input.projectId);
  if (!project) throw new Error("项目不存在");
  const previousSkills = getSkillsByIds(getProjectSkillIds(project.id));
  const skills = getSkillsByIds(input.skillIds).filter((skill) => skill.enabled !== false);
  const nextTools = new Set(input.tools);

  for (const tool of ALL_AGENT_TOOLS) {
    if (nextTools.has(tool)) continue;
    removeManagedBlock(toolEntryPath(project.path, tool));
    cleanupNativeSkills(project.path, tool, new Set());
  }

  const nextFilePaths = new Set(skills.map((skill) => path.join(project.path, MY_SKILLS_SKILLS_DIR, `${safeFileName(skill.name)}.md`)));
  for (const previousSkill of previousSkills) {
    if (skills.some((skill) => skill.id === previousSkill.id)) continue;
    const filePath = path.join(project.path, MY_SKILLS_SKILLS_DIR, `${safeFileName(previousSkill.name)}.md`);
    if (nextFilePaths.has(filePath) || !fs.existsSync(filePath)) continue;
    if (fs.readFileSync(filePath, "utf8") === previousSkill.content) fs.unlinkSync(filePath);
  }

  updateProjectBindings(project.id, skills.map((skill) => skill.id), input.tools);
  const files = writeSkillFiles(project.path, skills);
  for (const tool of input.tools) {
    files.push(writeToolEntry(project.path, tool, skills));
    files.push(...writeNativeSkills(project.path, tool, skills));
  }

  const hermesTouched = input.tools.includes("hermes") || project.tools.includes("hermes");
  if (hermesTouched) {
    const hermesSync = syncHermesExternalDirs(listProjects());
    files.push(...hermesSync.configPaths);
  }

  return { project: getProject(project.id)!, files };
}

export function clearProjectSkills(projectId: string) {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const boundSkills = getSkillsByIds(getProjectSkillIds(projectId));
  const removedFiles: string[] = [];
  const preservedFiles: string[] = [];
  for (const skill of boundSkills) {
    const filePath = path.join(project.path, MY_SKILLS_SKILLS_DIR, `${safeFileName(skill.name)}.md`);
    if (!fs.existsSync(filePath)) continue;
    if (fs.readFileSync(filePath, "utf8") === skill.content) {
      fs.unlinkSync(filePath);
      removedFiles.push(filePath);
    } else {
      preservedFiles.push(filePath);
    }
  }
  const result = deployProject({ projectId, skillIds: [], tools: project.tools });
  return { project: result.project, removedFiles, preservedFiles };
}
