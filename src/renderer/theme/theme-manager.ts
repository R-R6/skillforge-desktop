import {
  DEFAULT_THEME_PREFERENCES,
  getWindowBackgroundColor,
  parseThemePreferences,
  resolveThemeId,
  themePreferencesToSettings,
  type ResolvedThemeId,
  type ThemePreferences,
} from "../../shared/theme";

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

  return applyThemeToDocument(preferences, systemDark);
}

export async function saveThemePreferences(preferences: ThemePreferences): Promise<AppliedThemeState> {
  const payload = themePreferencesToSettings(preferences);
  await Promise.all(Object.entries(payload).map(([key, value]) => window.skillforge.setSetting(key, value)));
  await window.skillforge.syncNativeTheme(preferences.themeSelection);
  return applyThemeToDocument(preferences, systemPrefersDark);
}

export function handleSystemThemeChanged(systemDark: boolean) {
  if (cachedPreferences.themeSelection !== "system") return getAppliedThemeState();
  return applyThemeToDocument(cachedPreferences, systemDark);
}
