import type { ResolvedThemeId } from "./theme";

export const THEME_PACK_SCHEMA_VERSION = 1;

export type ThemePackTokenMap = Record<string, string>;

export interface ThemePackVariant {
  tokens: ThemePackTokenMap;
}

export interface ThemePack {
  schemaVersion: typeof THEME_PACK_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  author?: string;
  variants: Partial<Record<ResolvedThemeId | "dark" | "light", ThemePackVariant>>;
}

export interface ThemePackSummary {
  key: string;
  id: string;
  name: string;
  description?: string;
  author?: string;
  source: "builtin" | "user";
  readonly: boolean;
}

const TOKEN_KEY_PATTERN = /^--[a-z0-9-]+$/i;
const RESOLVED_VARIANTS = new Set<ResolvedThemeId>(["graphite-dark", "arctic-light", "midnight"]);
const FALLBACK_VARIANTS = new Set(["dark", "light"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTokenMap(raw: unknown, path: string): ThemePackTokenMap {
  if (!isRecord(raw)) {
    throw new Error(`${path} 必须是对象`);
  }

  const tokens: ThemePackTokenMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!TOKEN_KEY_PATTERN.test(key)) {
      throw new Error(`${path}.${key} 不是合法的 CSS 变量名`);
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${path}.${key} 必须是非空字符串`);
    }
    tokens[key] = value.trim();
  }
  return tokens;
}

export function validateThemePack(raw: unknown): ThemePack {
  if (!isRecord(raw)) {
    throw new Error("Theme Pack 必须是 JSON 对象");
  }

  if (raw.schemaVersion !== THEME_PACK_SCHEMA_VERSION) {
    throw new Error(`不支持的 schemaVersion: ${String(raw.schemaVersion)}`);
  }

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error("Theme Pack id 只能包含小写字母、数字和连字符");
  }
  if (!name) {
    throw new Error("Theme Pack 缺少 name");
  }

  if (!isRecord(raw.variants)) {
    throw new Error("Theme Pack 缺少 variants");
  }

  const variants: ThemePack["variants"] = {};
  for (const [variantKey, variantValue] of Object.entries(raw.variants)) {
    if (!RESOLVED_VARIANTS.has(variantKey as ResolvedThemeId) && !FALLBACK_VARIANTS.has(variantKey)) {
      throw new Error(`不支持的 variant: ${variantKey}`);
    }
    if (!isRecord(variantValue)) {
      throw new Error(`variants.${variantKey} 必须是对象`);
    }
    variants[variantKey as keyof ThemePack["variants"]] = {
      tokens: normalizeTokenMap(variantValue.tokens, `variants.${variantKey}.tokens`),
    };
  }

  if (Object.keys(variants).length === 0) {
    throw new Error("Theme Pack 至少需要一个 variant");
  }

  return {
    schemaVersion: THEME_PACK_SCHEMA_VERSION,
    id,
    name,
    description: typeof raw.description === "string" ? raw.description.trim() : undefined,
    author: typeof raw.author === "string" ? raw.author.trim() : undefined,
    variants,
  };
}

export function parseThemePackJson(json: string): ThemePack {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Theme Pack JSON 解析失败");
  }
  return validateThemePack(parsed);
}

export function serializeThemePack(pack: ThemePack): string {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export function buildThemePackKey(source: "builtin" | "user", id: string): string {
  return `${source}:${id}`;
}

export function parseThemePackKey(key: string): { source: "builtin" | "user"; id: string } | null {
  const match = /^(builtin|user):([a-z0-9-]+)$/.exec(key);
  if (!match) return null;
  return { source: match[1] as "builtin" | "user", id: match[2] };
}

export function resolveThemePackTokens(pack: ThemePack, resolvedThemeId: ResolvedThemeId): ThemePackTokenMap {
  const specific = pack.variants[resolvedThemeId]?.tokens;
  if (specific) return { ...specific };

  const fallbackKey = resolvedThemeId === "arctic-light" ? "light" : "dark";
  const fallback = pack.variants[fallbackKey]?.tokens;
  return fallback ? { ...fallback } : {};
}

export function summarizeThemePack(pack: ThemePack, source: "builtin" | "user"): ThemePackSummary {
  return {
    key: buildThemePackKey(source, pack.id),
    id: pack.id,
    name: pack.name,
    description: pack.description,
    author: pack.author,
    source,
    readonly: source === "builtin",
  };
}

export function tokensToStyleBlock(tokens: ThemePackTokenMap): string {
  if (Object.keys(tokens).length === 0) return "";
  const body = Object.entries(tokens).map(([key, value]) => `${key}: ${value};`).join("\n  ");
  return `:root {\n  ${body}\n}`;
}
