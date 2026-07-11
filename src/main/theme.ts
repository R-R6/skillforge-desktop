import { BrowserWindow, nativeTheme } from "electron";
import {
  getWindowBackgroundColor,
  parseThemePreferences,
  resolveThemeId,
  type ThemeSelection,
} from "../shared/theme";
import { getSettings } from "./db";

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
  if (window) {
    window.setBackgroundColor(getWindowBackgroundColor(resolvedThemeId));
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
