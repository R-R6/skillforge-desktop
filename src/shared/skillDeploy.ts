import path from "node:path";
import type { AgentTool, SkillSummary } from "./types";
import { parseSkillMetadata } from "./skillDiscovery";

export const AGENT_TOOL_SKILL_DIRS: Record<AgentTool, string> = {
  codex: ".codex/skills",
  cursor: ".cursor/skills",
  "claude-code": ".claude/skills",
  hermes: ".agents/skills",
};

export const SKILLFORGE_MANAGED_MARKER = ".skillforge-managed";

const TOOL_PLATFORM_ALIASES: Record<AgentTool, string[]> = {
  codex: ["codex"],
  cursor: ["cursor"],
  "claude-code": ["claude", "claude-code"],
  hermes: ["hermes", "agents", "openclaw"],
};

const PLACEHOLDER_DESCRIPTIONS = new Set(["暂无描述", "未读取到描述", ""]);

export function safeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim() || "skill";
}

export function toSkillSlug(skill: Pick<SkillSummary, "id" | "name">) {
  const candidates = [skill.id, skill.name, safeFileName(skill.name)];
  let best = "skill";
  for (const candidate of candidates) {
    const slug = candidate
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > best.length) best = slug;
  }
  return best;
}

export function platformSupportsTool(platforms: string[], tool: AgentTool) {
  if (platforms.length === 0) return true;
  const normalized = platforms.map((platform) => platform.trim().toLowerCase());
  return TOOL_PLATFORM_ALIASES[tool].some((alias) => normalized.includes(alias));
}

export function extractSkillForgeBody(content: string) {
  const promptHeading = /^##\s+Prompt\s*$/m;
  const match = content.match(promptHeading);
  if (match?.index !== undefined) {
    return content
      .slice(match.index)
      .replace(/^##\s+Prompt\s*\n?/, "")
      .trim();
  }

  const lines = content.split("\n");
  const bodyLines: string[] = [];
  let skippingHeader = true;
  let skippedTitle = false;

  for (const line of lines) {
    if (skippingHeader) {
      if (!skippedTitle && /^#\s+/.test(line)) {
        skippedTitle = true;
        continue;
      }
      if (/^>\s+/.test(line) || /^支持平台:/.test(line)) continue;
      if (line.trim() === "") continue;
      skippingHeader = false;
    }
    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
}

function escapeYamlString(value: string) {
  if (!/[:#\n"'&*!?|>@[`]/.test(value) && value.trim() === value) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function resolveSkillDescription(skill: SkillSummary, metadataDescription: string, body: string, slug: string) {
  if (skill.description && !PLACEHOLDER_DESCRIPTIONS.has(skill.description)) return skill.description;
  if (metadataDescription && !PLACEHOLDER_DESCRIPTIONS.has(metadataDescription)) return metadataDescription;

  const paragraph = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  if (paragraph) return paragraph.slice(0, 300);

  return `Use the ${slug} skill deployed by SkillForge Desktop.`;
}

export function toAgentSkillMarkdown(skill: SkillSummary) {
  const content = skill.content.trim();
  if (content.startsWith("---\n")) return content.endsWith("\n") ? content : `${content}\n`;

  const slug = toSkillSlug(skill);
  const metadata = parseSkillMetadata(content, `${slug}.md`);
  const body = extractSkillForgeBody(content);
  const description = resolveSkillDescription(skill, metadata.description, body, slug);

  return `---\nname: ${slug}\ndescription: ${escapeYamlString(description)}\n---\n\n${body}\n`;
}

export function nativeSkillDirectory(projectPath: string, tool: AgentTool, slug: string) {
  return path.join(projectPath, AGENT_TOOL_SKILL_DIRS[tool], slug);
}

export function nativeSkillFilePath(projectPath: string, tool: AgentTool, slug: string) {
  return path.join(nativeSkillDirectory(projectPath, tool, slug), "SKILL.md");
}

export function filterSkillsForTool(skills: SkillSummary[], tool: AgentTool) {
  return skills.filter((skill) => platformSupportsTool(skill.platforms, tool));
}
