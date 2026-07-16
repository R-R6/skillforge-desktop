import { BrowserWindow, nativeTheme } from "electron";
import {
  getWindowBackgroundColor,
  parseThemePreferences,
  resolveThemeId,
  type ResolvedThemeId,
  type ThemeSelection,
} from "../shared/theme";
import { getSettings } from "./db";

let titleBarOverlayEnabled = false;

function tryApplyTitleBarOverlay(window: BrowserWindow, resolvedThemeId: ResolvedThemeId) {
  if (process.platform !== "win32") return;
  try {
    window.setTitleBarOverlay({
      color: getWindowBackgroundColor(resolvedThemeId),
      symbolColor: getTitleBarSymbolColor(resolvedThemeId),
      height: TITLE_BAR_HEIGHT,
    });
    titleBarOverlayEnabled = true;
  } catch {
    titleBarOverlayEnabled = false;
  }
}

export function isTitleBarOverlayEnabled() {
  return titleBarOverlayEnabled;
}

const TITLE_BAR_HEIGHT = 36;

function getTitleBarSymbolColor(resolvedThemeId: ResolvedThemeId): string {
  return resolvedThemeId === "arctic-light" ? "#475569" : "#a9b1d6";
}

export function getInitialTitleBarOverlay() {
  const preferences = parseThemePreferences(getSettings());
  const resolvedThemeId = resolveThemeId(preferences.themeSelection, nativeTheme.shouldUseDarkColors);
  return {
    color: getWindowBackgroundColor(resolvedThemeId),
    symbolColor: getTitleBarSymbolColor(resolvedThemeId),
    height: TITLE_BAR_HEIGHT,
  };
}

export function getInitialWindowBackgroundColor(): string {
  const preferences = parseThemePreferences(getSettings());
  const resolvedThemeId = resolveThemeId(preferences.themeSelection, nativeTheme.shouldUseDarkColors);
  return getWindowBackgroundColor(resolvedThemeId);
}

let mainWindowGetter: () => BrowserWindow | null = () => null;

export function setMainWindowGetter(getter: () => BrowserWindow | null) {
  mainWindowGetter = getter;
}

export function syncNativeThemeSource(themeSelection: ThemeSelection) {
  if (themeSelection === "system") {
    nativeTheme.themeSource = "system";
    return;
  }
  if (themeSelection === "arctic") {
    nativeTheme.themeSource = "light";
    return;
  }
  nativeTheme.themeSource = "dark";
}

export function getSystemPrefersDark(): boolean {
  return nativeTheme.shouldUseDarkColors;
}

export function applyWindowBackground() {
  const preferences = parseThemePreferences(getSettings());
  const resolvedThemeId = resolveThemeId(preferences.themeSelection, nativeTheme.shouldUseDarkColors);
  const window = mainWindowGetter();
  const backgroundColor = getWindowBackgroundColor(resolvedThemeId);
  if (window) {
    window.setBackgroundColor(backgroundColor);
    tryApplyTitleBarOverlay(window, resolvedThemeId);
  }
}

export function initializeThemeBridge() {
  const preferences = parseThemePreferences(getSettings());
  syncNativeThemeSource(preferences.themeSelection);
  applyWindowBackground();

  nativeTheme.on("updated", () => {
    mainWindowGetter()?.webContents.send("theme:system-changed", nativeTheme.shouldUseDarkColors);
    applyWindowBackground();
  });
}
