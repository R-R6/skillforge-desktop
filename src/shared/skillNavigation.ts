export type SkillSourceKind = "pack" | "github" | "local" | "import" | "builtin";

export interface SkillRecordRef {
  category: string;
  sourceType?: "builtin" | "external" | string;
  sourcePath?: string | null;
  sourceUrl?: string | null;
}

export interface SkillSourceGroup {
  id: string;
  label: string;
  description?: string;
  kind: SkillSourceKind;
  count: number;
}

export interface SkillCategoryCount {
  category: string;
  count: number;
}

export interface SkillNavigationSnapshot {
  totalCount: number;
  builtinCategories: SkillCategoryCount[];
  externalTotal: number;
  externalSources: SkillSourceGroup[];
}

export const NAV_ALL = "全部";
export const NAV_EXTERNAL_ALL = "ext:全部";
export const NAV_PACK_BUILTIN = "ext:pack:builtin";

export function isExternalSkill(skill: SkillRecordRef): boolean {
  return skill.sourceType === "external"
    || skill.category === "外部 Skill"
    || skill.category.startsWith("外部导入");
}

export function isBuiltinDepartmentSkill(skill: SkillRecordRef): boolean {
  return !isExternalSkill(skill);
}

export function normalizeGithubUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const segments = parsed.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    if (segments.length >= 2) {
      const repository = segments[1].replace(/\.git$/i, "");
      return `${parsed.hostname.toLowerCase()}/${segments[0]}/${repository}`.toLowerCase();
    }
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function formatGithubLabel(url: string): string {
  const normalized = normalizeGithubUrl(url);
  const parts = normalized.split("/");
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return normalized;
}

function extractSkillSourcesCacheId(sourcePath?: string | null): string | null {
  if (!sourcePath) return null;
  const normalized = sourcePath.replace(/\\/g, "/");
  const match = normalized.match(/skill-sources\/([a-f0-9]{8,})/i);
  return match?.[1] ?? null;
}

function getLocalSourceLabel(sourcePath?: string | null): { key: string; label: string } {
  if (!sourcePath) return { key: "unknown", label: "本地导入" };
  const normalized = sourcePath.replace(/\\/g, "/");
  const directory = normalized.slice(0, normalized.lastIndexOf("/"));
  const folderName = directory.split("/").filter(Boolean).pop() ?? "本地导入";
  const key = directory.toLowerCase();
  if (normalized.includes("/resources/skills/")) {
    return { key: "resources", label: "SkillForge 资源库" };
  }
  return { key, label: folderName };
}

export function getSourceGroup(skill: SkillRecordRef): SkillSourceGroup {
  if (skill.category === "外部 Skill" && skill.sourceType !== "external") {
    return {
      id: NAV_PACK_BUILTIN,
      label: "SkillForge 精选合集",
      description: "社区与开源仓库精选",
      kind: "pack",
      count: 0,
    };
  }

  if (skill.sourceType === "external") {
    if (skill.sourceUrl) {
      return {
        id: `ext:github:${normalizeGithubUrl(skill.sourceUrl)}`,
        label: formatGithubLabel(skill.sourceUrl),
        description: "GitHub 仓库导入",
        kind: "github",
        count: 0,
      };
    }

    const cacheId = extractSkillSourcesCacheId(skill.sourcePath);
    if (cacheId) {
      return {
        id: `ext:cache:${cacheId}`,
        label: skill.sourceUrl ? formatGithubLabel(skill.sourceUrl) : `GitHub 缓存 · ${cacheId.slice(0, 8)}`,
        description: "GitHub 仓库导入",
        kind: "github",
        count: 0,
      };
    }

    const local = getLocalSourceLabel(skill.sourcePath);
    return {
      id: `ext:local:${local.key}`,
      label: local.label,
      description: "本地目录或文件导入",
      kind: "local",
      count: 0,
    };
  }

  if (skill.category.startsWith("外部导入")) {
    const suffix = skill.category.replace(/^外部导入\s*/, "").replace(/^\/?\s*/, "");
    return {
      id: suffix ? `ext:import:${skill.category}` : "ext:import:root",
      label: suffix ? `项目导入 / ${suffix}` : "项目扫描导入",
      description: "从项目工作区扫描导入",
      kind: "import",
      count: 0,
    };
  }

  return {
    id: `cat:${skill.category}`,
    label: skill.category,
    kind: "builtin",
    count: 0,
  };
}

export function getNavigationCategoryKey(category: string): string {
  return `cat:${category}`;
}

export function matchesNavigationKey(skill: SkillRecordRef, navigationKey?: string): boolean {
  const key = navigationKey?.trim() || NAV_ALL;
  if (key === NAV_ALL) return true;
  if (key === NAV_EXTERNAL_ALL) return isExternalSkill(skill);
  if (key === NAV_PACK_BUILTIN) {
    return skill.category === "外部 Skill" && skill.sourceType !== "external";
  }
  if (key.startsWith("ext:github:")) {
    return skill.sourceType === "external"
      && !!skill.sourceUrl
      && `ext:github:${normalizeGithubUrl(skill.sourceUrl)}` === key;
  }
  if (key.startsWith("ext:cache:")) {
    const cacheId = key.slice("ext:cache:".length);
    return skill.sourceType === "external" && extractSkillSourcesCacheId(skill.sourcePath) === cacheId;
  }
  if (key.startsWith("ext:local:")) {
    const localKey = key.slice("ext:local:".length);
    return skill.sourceType === "external" && getLocalSourceLabel(skill.sourcePath).key === localKey;
  }
  if (key.startsWith("ext:import:")) {
    if (key === "ext:import:root") return skill.category === "外部导入";
    const category = key.slice("ext:import:".length);
    return skill.category === category;
  }
  if (key.startsWith("cat:")) {
    const category = key.slice(4);
    return skill.category === category || skill.category.startsWith(`${category} / `);
  }
  return skill.category === key || skill.category.startsWith(`${key} / `);
}

export function buildSkillNavigation(rows: SkillRecordRef[]): SkillNavigationSnapshot {
  const builtinMap = new Map<string, number>();
  const sourceMap = new Map<string, SkillSourceGroup>();
  let externalTotal = 0;

  for (const row of rows) {
    if (isExternalSkill(row)) {
      externalTotal += 1;
      const group = getSourceGroup(row);
      const existing = sourceMap.get(group.id);
      if (existing) existing.count += 1;
      else sourceMap.set(group.id, { ...group, count: 1 });
      continue;
    }

    builtinMap.set(row.category, (builtinMap.get(row.category) ?? 0) + 1);
  }

  const kindOrder: Record<SkillSourceKind, number> = { pack: 0, github: 1, local: 2, import: 3, builtin: 4 };
  const externalSources = [...sourceMap.values()].sort((left, right) => {
    const kindDiff = kindOrder[left.kind] - kindOrder[right.kind];
    if (kindDiff !== 0) return kindDiff;
    return left.label.localeCompare(right.label, "zh-CN");
  });

  return {
    totalCount: rows.length,
    builtinCategories: [...builtinMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => left.category.localeCompare(right.category, "zh-CN")),
    externalTotal,
    externalSources,
  };
}

export function getSkillSourceLabel(skill: SkillRecordRef): string {
  if (!isExternalSkill(skill)) {
    return skill.category.split(" / ")[0]?.trim() || skill.category;
  }
  return getSourceGroup(skill).label;
}

export function getNavigationBreadcrumbLabel(navigationKey: string, snapshot?: SkillNavigationSnapshot): string {
  if (navigationKey === NAV_ALL) return "";
  if (navigationKey === NAV_EXTERNAL_ALL) return "外部 Skill";
  if (navigationKey.startsWith("cat:")) return navigationKey.slice(4);
  const source = snapshot?.externalSources.find((group) => group.id === navigationKey);
  if (source) return `外部 Skill / ${source.label}`;
  if (navigationKey === NAV_PACK_BUILTIN) return "外部 Skill / SkillForge 精选合集";
  return "外部 Skill";
}
