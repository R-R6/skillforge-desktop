import path from "node:path";
import { pinyin } from "pinyin-pro";
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

type SkillSlugInput = Pick<SkillSummary, "id" | "name"> &
  Partial<Pick<SkillSummary, "sourcePath" | "content">>;

export interface ResolveSkillSlugsOptions {
  /** Previously deployed skillId -> slug. Keeps slash commands stable across redeploys. */
  preserved?: ReadonlyMap<string, string>;
}

export function safeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim() || "skill";
}

function shortStableHash(value: string) {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

function hasCjkText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

export function toAsciiSlug(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidAgentSkillName(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value !== "skill";
}

function limitSkillSlug(value: string, identity: string) {
  if (value.length <= 64) return value;
  const suffix = shortStableHash(identity);
  return `${value.slice(0, 55).replace(/-+$/, "")}-${suffix}`;
}

/** Cursor/Codex slash autocomplete only matches ASCII skill names reliably. */
export function toPinyinSlug(value: string) {
  const raw = pinyin(value, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: true,
  });
  const parts = (Array.isArray(raw) ? raw : [String(raw)])
    .map((part) => String(part).trim())
    .filter(Boolean);
  return toAsciiSlug(parts.join("-"));
}

function extractEnglishIdentity(raw: string) {
  const cleaned = raw
    .replace(/\s+Agent(?:\s+Personality)?$/i, "")
    .replace(/\s+Personality$/i, "")
    .trim();
  if (!cleaned || hasCjkText(cleaned)) return null;
  const slug = toAsciiSlug(cleaned);
  if (isValidAgentSkillName(slug) && slug.length >= 3) return slug;
  return null;
}

export function extractEnglishSlugFromContent(content: string) {
  const bold = content.match(/You are \*\*([^*]+)\*\*/i)?.[1];
  if (bold) {
    const fromBold = extractEnglishIdentity(bold);
    if (fromBold) return fromBold;
  }

  const promptIndex = content.search(/^##\s+Prompt\s*$/m);
  const searchRegion = promptIndex >= 0 ? content.slice(promptIndex) : content;
  const heading = searchRegion.match(/^#\s+([A-Za-z][A-Za-z0-9 ,&'/-]{1,80})\s*$/m)?.[1];
  if (heading) return extractEnglishIdentity(heading);

  return null;
}

export function toSkillSlug(skill: SkillSlugInput) {
  const candidates = [skill.id, skill.name, safeFileName(skill.name)];
  const hashParts = [...candidates, skill.sourcePath ?? "", skill.content ?? ""];

  for (const candidate of [skill.id, skill.name]) {
    const trimmed = candidate.trim().toLowerCase();
    if (isValidAgentSkillName(trimmed)) return limitSkillSlug(trimmed, hashParts.join("\n"));
  }

  for (const candidate of [skill.name, skill.id]) {
    if (!candidate.trim() || hasCjkText(candidate)) continue;
    const ascii = toAsciiSlug(candidate);
    if (isValidAgentSkillName(ascii)) return limitSkillSlug(ascii, hashParts.join("\n"));
  }

  if (skill.content) {
    const fromContent = extractEnglishSlugFromContent(skill.content);
    if (fromContent) return limitSkillSlug(fromContent, hashParts.join("\n"));
  }

  for (const candidate of [skill.name, skill.id]) {
    if (!candidate.trim() || !hasCjkText(candidate)) continue;
    const pinyinSlug = toPinyinSlug(candidate);
    if (isValidAgentSkillName(pinyinSlug)) return limitSkillSlug(pinyinSlug, hashParts.join("\n"));
  }

  return `skill-${shortStableHash(hashParts.filter(Boolean).join("\n"))}`;
}

function isNativeSlug(skill: Pick<SkillSummary, "id" | "name">, base: string) {
  return [skill.id, skill.name].some((value) => value.trim().toLowerCase() === base);
}

function allocateUniqueSlug(skill: SkillSummary, base: string, used: Set<string>) {
  const candidates = [
    limitSkillSlug(`${base}-${toPinyinSlug(skill.name)}`, `${skill.id}\n${skill.sourcePath ?? ""}`),
    limitSkillSlug(
      `${base}-${shortStableHash(`${skill.id}\n${skill.sourcePath ?? skill.category}`)}`,
      skill.id,
    ),
  ];

  for (const candidate of candidates) {
    if (isValidAgentSkillName(candidate) && !used.has(candidate)) return candidate;
  }

  let index = 2;
  while (index < 1000) {
    const candidate = limitSkillSlug(`${base}-${index}`, `${skill.id}-${index}`);
    if (!used.has(candidate)) return candidate;
    index += 1;
  }

  return limitSkillSlug(`${base}-${shortStableHash(`${skill.id}-overflow`)}`, skill.id);
}

function slugAssignmentPriority(
  skill: SkillSummary,
  base: string,
  preserved: ReadonlyMap<string, string>,
) {
  if (isNativeSlug(skill, base)) return 0;
  if (preserved.get(skill.id) === base) return 1;
  return 2;
}

export function resolveSkillSlugs(skills: SkillSummary[], options: ResolveSkillSlugsOptions = {}) {
  const resolved = new Map<string, string>();
  const used = new Set<string>();
  const preserved = options.preserved ?? new Map();

  const groups = new Map<string, SkillSummary[]>();
  for (const skill of skills) {
    const base = toSkillSlug(skill);
    const group = groups.get(base);
    if (group) group.push(skill);
    else groups.set(base, [skill]);
  }

  for (const [base, group] of groups) {
    const ordered = [...group].sort((left, right) => {
      const leftPriority = slugAssignmentPriority(left, base, preserved);
      const rightPriority = slugAssignmentPriority(right, base, preserved);
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.id.localeCompare(right.id, "zh-CN");
    });

    for (let index = 0; index < ordered.length; index += 1) {
      const skill = ordered[index];
      const preservedSlug = preserved.get(skill.id);
      let slug: string;

      if (index === 0 && !used.has(base)) {
        slug = base;
      } else if (
        preservedSlug &&
        isValidAgentSkillName(preservedSlug) &&
        !used.has(preservedSlug)
      ) {
        slug = preservedSlug;
      } else {
        slug = allocateUniqueSlug(skill, base, used);
      }

      used.add(slug);
      resolved.set(skill.id, slug);
    }
  }

  return resolved;
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

function enrichDescriptionWithChineseName(skill: Pick<SkillSummary, "name">, description: string) {
  if (hasCjkText(skill.name) && description && !description.includes(skill.name)) {
    return `${skill.name}：${description}`;
  }
  return description;
}

function resolveSkillDescription(skill: SkillSummary, metadataDescription: string, body: string, slug: string) {
  let description = "";
  if (skill.description && !PLACEHOLDER_DESCRIPTIONS.has(skill.description)) description = skill.description;
  else if (metadataDescription && !PLACEHOLDER_DESCRIPTIONS.has(metadataDescription)) description = metadataDescription;
  else {
    const paragraph = body
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));
    description = paragraph ? paragraph.slice(0, 300) : `Use the ${slug} skill deployed by SkillForge Desktop.`;
  }

  return enrichDescriptionWithChineseName(skill, description);
}

export function formatSlashCommandLabel(skill: SkillSlugInput, slug = toSkillSlug(skill)) {
  if (hasCjkText(skill.name) && skill.name.trim() && toAsciiSlug(skill.name) !== slug) {
    return `/${slug}（${skill.name}）`;
  }
  return `/${slug}`;
}

function upsertFrontmatterField(frontmatter: string, key: string, value: string) {
  const pattern = new RegExp(`^${key}:\\s*.+$`, "m");
  const line = `${key}: ${escapeYamlString(value)}`;
  if (pattern.test(frontmatter)) return frontmatter.replace(pattern, line);
  return `${frontmatter}\n${line}`;
}

function normalizeExistingFrontmatterName(content: string, skill: SkillSummary, slug?: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return content.endsWith("\n") ? content : `${content}\n`;

  let frontmatter = match[1];
  const body = match[2] ?? "";
  const nameLine = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  const descriptionLine = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  const targetSlug = slug ?? (isValidAgentSkillName(nameLine.toLowerCase()) ? nameLine.toLowerCase() : toSkillSlug({ ...skill, content: body || content }));
  const enrichedDescription = enrichDescriptionWithChineseName(
    skill,
    descriptionLine || skill.description || "",
  );

  let changed = false;
  if (nameLine.toLowerCase() !== targetSlug) {
    frontmatter = upsertFrontmatterField(frontmatter, "name", targetSlug);
    changed = true;
  }
  if (enrichedDescription && enrichedDescription !== descriptionLine) {
    frontmatter = upsertFrontmatterField(frontmatter, "description", enrichedDescription);
    changed = true;
  }

  if (!changed) return content.endsWith("\n") ? content : `${content}\n`;
  return `---\n${frontmatter}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`.replace(/\n*$/, "\n");
}

export function toAgentSkillMarkdown(skill: SkillSummary, slug?: string) {
  const content = skill.content.trim();
  if (content.startsWith("---\n")) return normalizeExistingFrontmatterName(content, skill, slug);

  const targetSlug = slug ?? toSkillSlug(skill);
  const metadata = parseSkillMetadata(content, `${targetSlug}.md`);
  const body = extractSkillForgeBody(content);
  const description = resolveSkillDescription(skill, metadata.description, body, targetSlug);

  return `---\nname: ${escapeYamlString(targetSlug)}\ndescription: ${escapeYamlString(description)}\n---\n\n${body}\n`;
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
