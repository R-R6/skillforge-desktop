import type { AgentTool, ExternalSkillRecord, SkillSummary } from "../shared/types";

export function getTopCategory(category: string) {
  return category.split(" / ")[0]?.trim() || category || "未分类";
}

export function matchesSkillSearch(skill: { name: string; description: string; category?: string }, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = `${skill.name} ${skill.description} ${skill.category ?? ""}`.toLowerCase();
  return haystack.includes(normalized);
}

export function isSkillCompatibleWithTools(skill: SkillSummary, tools: AgentTool[]) {
  if (tools.length === 0 || skill.platforms.length === 0) return true;
  return tools.some((tool) => skill.platforms.includes(tool));
}

export function groupLibrarySkills(skills: SkillSummary[], search: string, tools: AgentTool[]) {
  const filtered = skills.filter((skill) => skill.enabled !== false && matchesSkillSearch(skill, search));
  const groups = new Map<string, SkillSummary[]>();
  for (const skill of filtered) {
    const category = getTopCategory(skill.category);
    const bucket = groups.get(category) ?? [];
    bucket.push(skill);
    groups.set(category, bucket);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({
      category,
      skills: items.sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
      compatibleCount: items.filter((skill) => isSkillCompatibleWithTools(skill, tools)).length,
    }))
    .sort((left, right) => left.category.localeCompare(right.category, "zh-CN"));
}

export function groupExternalSkills(skills: ExternalSkillRecord[], search: string) {
  const filtered = skills.filter((skill) => matchesSkillSearch({ name: skill.name, description: skill.description }, search));
  const groups = new Map<string, ExternalSkillRecord[]>();
  for (const skill of filtered) {
    const category = skill.scope === "global" ? "全局 Agent" : "项目目录";
    const bucket = groups.get(category) ?? [];
    bucket.push(skill);
    groups.set(category, bucket);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({
      category,
      skills: items.sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
    }))
    .sort((left, right) => left.category.localeCompare(right.category, "zh-CN"));
}
