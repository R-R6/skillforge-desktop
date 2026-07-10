import fs from "node:fs";
import path from "node:path";
import type { AgentTool, DeployProjectInput, DeploymentResult } from "../shared/types";
import { getProject, getProjectSkillIds, getSkillsByIds, updateProjectBindings } from "./db";

const BLOCK_START = "<!-- SKILLFORGE:START -->";
const BLOCK_END = "<!-- SKILLFORGE:END -->";

export function safeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim() || "skill";
}

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

function writeSkillFiles(projectPath: string, skills: ReturnType<typeof getSkillsByIds>) {
  const skillsDir = path.join(projectPath, ".jwh-skills", "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  const files: string[] = [];

  for (const skill of skills) {
    const filePath = path.join(skillsDir, `${safeFileName(skill.name)}.md`);
    fs.writeFileSync(filePath, skill.content, "utf8");
    files.push(filePath);
  }

  const indexPath = path.join(projectPath, ".jwh-skills", "index.md");
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

function writeToolEntry(projectPath: string, tool: AgentTool, skills: ReturnType<typeof getSkillsByIds>) {
  const names = skills.map((skill) => `- @.jwh-skills/skills/${safeFileName(skill.name)}.md`).join("\n");
  const body = `## SkillForge Desktop\n\n以下 Skill 已绑定到当前项目：\n${names || "- 暂无 Skill"}`;
  const filePath = toolEntryPath(projectPath, tool);
  if (tool === "cursor") {
    writeManagedBlock(filePath, `---\ndescription: SkillForge Desktop project skills\nalwaysApply: false\n---\n\n${body}`);
    return filePath;
  }
  writeManagedBlock(filePath, body);
  return filePath;
}

export function deployProject(input: DeployProjectInput): DeploymentResult {
  const project = getProject(input.projectId);
  if (!project) throw new Error("项目不存在");
  const previousSkills = getSkillsByIds(getProjectSkillIds(project.id));
  const skills = getSkillsByIds(input.skillIds).filter((skill) => skill.enabled !== false);
  const nextTools = new Set(input.tools);
  for (const previousTool of project.tools) {
    if (!nextTools.has(previousTool)) removeManagedBlock(toolEntryPath(project.path, previousTool));
  }
  const nextFilePaths = new Set(skills.map((skill) => path.join(project.path, ".jwh-skills", "skills", `${safeFileName(skill.name)}.md`)));
  for (const previousSkill of previousSkills) {
    if (skills.some((skill) => skill.id === previousSkill.id)) continue;
    const filePath = path.join(project.path, ".jwh-skills", "skills", `${safeFileName(previousSkill.name)}.md`);
    if (nextFilePaths.has(filePath) || !fs.existsSync(filePath)) continue;
    if (fs.readFileSync(filePath, "utf8") === previousSkill.content) fs.unlinkSync(filePath);
  }
  updateProjectBindings(project.id, skills.map((skill) => skill.id), input.tools);
  const files = writeSkillFiles(project.path, skills);
  for (const tool of input.tools) files.push(writeToolEntry(project.path, tool, skills));
  return { project: getProject(project.id)!, files };
}

export function clearProjectSkills(projectId: string) {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const boundSkills = getSkillsByIds(getProjectSkillIds(projectId));
  const removedFiles: string[] = [];
  const preservedFiles: string[] = [];
  for (const skill of boundSkills) {
    const filePath = path.join(project.path, ".jwh-skills", "skills", `${safeFileName(skill.name)}.md`);
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
