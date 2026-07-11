import {
  DEFAULT_THEME_PREFERENCES,
  getWindowBackgroundColor,
  parseThemePreferences,
  resolveThemeId,
  themePreferencesToSettings,
  type ResolvedThemeId,
  type ThemePreferences,
} from "../../shared/theme";
import { resolveThemePackTokens, tokensToStyleBlock, type ThemePack } from "../../shared/themePack";

export type ThemeChangeListener = (state: AppliedThemeState) => void;

export interface AppliedThemeState {
  preferences: ThemePreferences;
  resolvedThemeId: ResolvedThemeId;
  systemPrefersDark: boolean;
}

let cachedPreferences: ThemePreferences = { ...DEFAULT_THEME_PREFERENCES };
let systemPrefersDark = true;
const listeners = new Set<ThemeChangeListener>();

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shouldReduceMotion(preferences: ThemePreferences): boolean {
  return preferences.motion === "reduced" || !preferences.enableAnimation || prefersReducedMotion();
}

function applyThemePackOverrides(tokens: Record<string, string>) {
  let element = document.getElementById("theme-pack-overrides") as HTMLStyleElement | null;
  if (!element) {
    element = document.createElement("style");
    element.id = "theme-pack-overrides";
    document.head.appendChild(element);
  }
  element.textContent = tokensToStyleBlock(tokens);
}

async function refreshThemePackOverrides(preferences: ThemePreferences, resolvedThemeId: ResolvedThemeId) {
  if (!preferences.activeThemePackId) {
    applyThemePackOverrides({});
    return;
  }

  try {
    const pack = await window.skillforge.getThemePack(preferences.activeThemePackId) as ThemePack | null;
    if (!pack) {
      applyThemePackOverrides({});
      return;
    }
    applyThemePackOverrides(resolveThemePackTokens(pack, resolvedThemeId));
  } catch {
    applyThemePackOverrides({});
  }
}

export function getAppliedThemeState(): AppliedThemeState {
  return {
    preferences: cachedPreferences,
    resolvedThemeId: resolveThemeId(cachedPreferences.themeSelection, systemPrefersDark),
    systemPrefersDark,
  };
}

export function applyThemeToDocument(preferences: ThemePreferences, nextSystemPrefersDark = systemPrefersDark) {
  cachedPreferences = { ...preferences };
  systemPrefersDark = nextSystemPrefersDark;

  const resolvedThemeId = resolveThemeId(preferences.themeSelection, systemPrefersDark);
  const root = document.documentElement;

  root.dataset.theme = resolvedThemeId;
  root.dataset.accent = preferences.accent;
  root.dataset.density = preferences.density;
  root.dataset.motion = shouldReduceMotion(preferences) ? "reduced" : "default";

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", getWindowBackgroundColor(resolvedThemeId));
  }

  const state = getAppliedThemeState();
  listeners.forEach((listener) => listener(state));
  void refreshThemePackOverrides(preferences, resolvedThemeId);
  return state;
}

export function subscribeThemeChanges(listener: ThemeChangeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadAndApplyThemePreferences(): Promise<AppliedThemeState> {
  const settings = await window.skillforge.getSettings();
  const preferences = parseThemePreferences(settings);
  let systemDark = systemPrefersDark;

  try {
    systemDark = await window.skillforge.getSystemPrefersDark();
  } catch {
    systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  const state = applyThemeToDocument(preferences, systemDark);
  await refreshThemePackOverrides(preferences, state.resolvedThemeId);
  return getAppliedThemeState();
}

export async function saveThemePreferences(preferences: ThemePreferences): Promise<AppliedThemeState> {
  const payload = themePreferencesToSettings(preferences);
  await Promise.all(Object.entries(payload).map(([key, value]) => window.skillforge.setSetting(key, value)));
  await window.skillforge.syncNativeTheme(preferences.themeSelection);
  const state = applyThemeToDocument(preferences, systemPrefersDark);
  await refreshThemePackOverrides(preferences, state.resolvedThemeId);
  return getAppliedThemeState();
}

export function handleSystemThemeChanged(systemDark: boolean) {
  if (cachedPreferences.themeSelection !== "system") return getAppliedThemeState();
  const state = applyThemeToDocument(cachedPreferences, systemDark);
  void refreshThemePackOverrides(cachedPreferences, state.resolvedThemeId);
  return state;
}

export async function previewThemePack(preferences: ThemePreferences): Promise<AppliedThemeState> {
  const state = applyThemeToDocument(preferences, systemPrefersDark);
  await refreshThemePackOverrides(preferences, state.resolvedThemeId);
  return getAppliedThemeState();
}
