export type ThemeSelection = "system" | "graphite" | "arctic" | "midnight";
export type ResolvedThemeId = "graphite-dark" | "arctic-light" | "midnight";
export type AccentId = "ocean" | "emerald" | "sunset" | "violet" | "rose";
export type DensityId = "comfortable" | "compact";
export type MotionPreference = "default" | "reduced";

export interface ThemePreferences {
  themeSelection: ThemeSelection;
  accent: AccentId;
  density: DensityId;
  motion: MotionPreference;
  enableAnimation: boolean;
  activeThemePackId: string;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  themeSelection: "graphite",
  accent: "ocean",
  density: "comfortable",
  motion: "default",
  enableAnimation: true,
  activeThemePackId: "",
};

export const THEME_SETTING_KEYS = {
  themeSelection: "themeSelection",
  accent: "accent",
  density: "density",
  motion: "motion",
  enableAnimation: "enableAnimation",
  activeThemePackId: "activeThemePackId",
  /** @deprecated migrated to themeSelection */
  legacyTheme: "theme",
} as const;

const VALID_THEME_SELECTION = new Set<ThemeSelection>(["system", "graphite", "arctic", "midnight"]);
const VALID_ACCENT = new Set<AccentId>(["ocean", "emerald", "sunset", "violet", "rose"]);
const VALID_DENSITY = new Set<DensityId>(["comfortable", "compact"]);
const VALID_MOTION = new Set<MotionPreference>(["default", "reduced"]);

export function resolveThemeId(selection: ThemeSelection, systemPrefersDark: boolean): ResolvedThemeId {
  if (selection === "system") {
    return systemPrefersDark ? "graphite-dark" : "arctic-light";
  }
  if (selection === "arctic") return "arctic-light";
  if (selection === "midnight") return "midnight";
  return "graphite-dark";
}

export function getWindowBackgroundColor(themeId: ResolvedThemeId): string {
  switch (themeId) {
    case "arctic-light":
      return "#f6f8fb";
    case "midnight":
      return "#0b0c0e";
    default:
      return "#13161c";
  }
}

function parseThemeSelection(raw: string | undefined): ThemeSelection {
  if (raw && VALID_THEME_SELECTION.has(raw as ThemeSelection)) {
    return raw as ThemeSelection;
  }
  return DEFAULT_THEME_PREFERENCES.themeSelection;
}

function parseAccent(raw: string | undefined): AccentId {
  if (raw && VALID_ACCENT.has(raw as AccentId)) {
    return raw as AccentId;
  }
  return DEFAULT_THEME_PREFERENCES.accent;
}

function parseDensity(raw: string | undefined): DensityId {
  if (raw && VALID_DENSITY.has(raw as DensityId)) {
    return raw as DensityId;
  }
  return DEFAULT_THEME_PREFERENCES.density;
}

function parseMotion(raw: string | undefined): MotionPreference {
  if (raw && VALID_MOTION.has(raw as MotionPreference)) {
    return raw as MotionPreference;
  }
  return DEFAULT_THEME_PREFERENCES.motion;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === "on" || raw === "true") return true;
  if (raw === "off" || raw === "false") return false;
  return fallback;
}

/** Migrate legacy `theme: dark|light` into themeSelection when needed. */
export function parseThemePreferences(settings: Record<string, string>): ThemePreferences {
  let themeSelection = parseThemeSelection(settings[THEME_SETTING_KEYS.themeSelection]);

  if (!settings[THEME_SETTING_KEYS.themeSelection] && settings[THEME_SETTING_KEYS.legacyTheme]) {
    themeSelection = settings[THEME_SETTING_KEYS.legacyTheme] === "light" ? "arctic" : "graphite";
  }

  return {
    themeSelection,
    accent: parseAccent(settings[THEME_SETTING_KEYS.accent]),
    density: parseDensity(settings[THEME_SETTING_KEYS.density]),
    motion: parseMotion(settings[THEME_SETTING_KEYS.motion]),
    enableAnimation: parseBool(settings[THEME_SETTING_KEYS.enableAnimation], DEFAULT_THEME_PREFERENCES.enableAnimation),
    activeThemePackId: settings[THEME_SETTING_KEYS.activeThemePackId]?.trim() ?? "",
  };
}

export function themePreferencesToSettings(preferences: ThemePreferences): Record<string, string> {
  return {
    [THEME_SETTING_KEYS.themeSelection]: preferences.themeSelection,
    [THEME_SETTING_KEYS.accent]: preferences.accent,
    [THEME_SETTING_KEYS.density]: preferences.density,
    [THEME_SETTING_KEYS.motion]: preferences.motion,
    [THEME_SETTING_KEYS.enableAnimation]: preferences.enableAnimation ? "on" : "off",
    [THEME_SETTING_KEYS.activeThemePackId]: preferences.activeThemePackId,
  };
}

export const THEME_SELECTION_OPTIONS: Array<{ id: ThemeSelection; label: string; description: string; help: string }> = [
  {
    id: "system",
    label: "跟随系统",
    description: "随 Windows / macOS 外观自动切换",
    help: "读取操作系统浅色/深色偏好，自动在 Graphite Dark 与 Arctic Light 之间切换，并同步 Electron 原生窗口外观。",
  },
  {
    id: "graphite",
    label: "Graphite Dark",
    description: "默认品牌主题 · 深夜 AI 实验室",
    help: "石墨灰基底 + 柔和层级，品牌色仅点缀交互元素，适合夜间长时间使用。",
  },
  {
    id: "arctic",
    label: "Arctic Light",
    description: "明亮精确 · 白天设计工作室",
    help: "高可读浅色主题，强调干净留白与精确边界，适合白天审阅与演示。",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "极致深色 · OLED 友好",
    help: "更深、更沉的背景与更高对比，装饰更少，适合 OLED 屏幕与偏好极简深色的用户。",
  },
];

export const THEME_PREVIEW_SWATCHES: Record<Exclude<ThemeSelection, "system">, {
  bg: string;
  sidebar: string;
  card: string;
  accent: string;
  ai: string;
}> = {
  graphite: {
    bg: "#13161c",
    sidebar: "#1a1d24",
    card: "#20242c",
    accent: "#38bdf8",
    ai: "#ff9f68",
  },
  arctic: {
    bg: "#f6f8fb",
    sidebar: "#eff2f7",
    card: "#ffffff",
    accent: "#2563eb",
    ai: "#ea7a2f",
  },
  midnight: {
    bg: "#0b0c0e",
    sidebar: "#121316",
    card: "#16181d",
    accent: "#38bdf8",
    ai: "#ff9f68",
  },
};

export const ACCENT_OPTIONS: Array<{ id: AccentId; label: string; swatch: string; help: string }> = [
  { id: "ocean", label: "Ocean Blue", swatch: "#2563eb", help: "默认海洋蓝，稳重通用，适合大多数工作流。" },
  { id: "emerald", label: "Emerald", swatch: "#10b981", help: "翡翠绿强调色，适合偏好冷静、自然语义的场景。" },
  { id: "sunset", label: "Sunset", swatch: "#ea580c", help: "日落橙强调色，视觉更活跃，适合需要更强引导的操作区。" },
  { id: "violet", label: "Violet", swatch: "#7c3aed", help: "紫罗兰强调色，偏创意与探索氛围。" },
  { id: "rose", label: "Rose", swatch: "#f43f5e", help: "玫瑰红强调色，对比鲜明，适合需要突出警示或关键操作的面板。" },
];

export const DENSITY_OPTIONS: Array<{ id: DensityId; label: string; help: string }> = [
  { id: "comfortable", label: "Comfortable", help: "默认宽松密度：更大字号、间距与控件高度，阅读压力更低。" },
  { id: "compact", label: "Compact", help: "紧凑密度：缩小间距与控件尺寸，一屏可展示更多列表与表单字段。" },
];
