import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PREFERENCES,
  getWindowBackgroundColor,
  parseThemePreferences,
  resolveThemeId,
  themePreferencesToSettings,
} from "./theme";

describe("parseThemePreferences", () => {
  it("returns defaults for empty settings", () => {
    expect(parseThemePreferences({})).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  it("migrates legacy theme:light to arctic", () => {
    const prefs = parseThemePreferences({ theme: "light" });
    expect(prefs.themeSelection).toBe("arctic");
  });

  it("migrates legacy theme:dark to graphite", () => {
    const prefs = parseThemePreferences({ theme: "dark" });
    expect(prefs.themeSelection).toBe("graphite");
  });

  it("prefers themeSelection over legacy theme", () => {
    const prefs = parseThemePreferences({ theme: "light", themeSelection: "midnight" });
    expect(prefs.themeSelection).toBe("midnight");
  });

  it("round-trips through themePreferencesToSettings", () => {
    const prefs = {
      ...DEFAULT_THEME_PREFERENCES,
      themeSelection: "midnight" as const,
      accent: "emerald" as const,
      density: "compact" as const,
      motion: "reduced" as const,
      enableAnimation: false,
    };
    const settings = themePreferencesToSettings(prefs);
    expect(parseThemePreferences(settings)).toEqual(prefs);
  });
});

describe("resolveThemeId", () => {
  it("maps system dark to graphite-dark", () => {
    expect(resolveThemeId("system", true)).toBe("graphite-dark");
  });

  it("maps system light to arctic-light", () => {
    expect(resolveThemeId("system", false)).toBe("arctic-light");
  });

  it("maps brand themes directly", () => {
    expect(resolveThemeId("graphite", false)).toBe("graphite-dark");
    expect(resolveThemeId("arctic", true)).toBe("arctic-light");
    expect(resolveThemeId("midnight", false)).toBe("midnight");
  });
});

describe("getWindowBackgroundColor", () => {
  it("returns documented backgrounds per theme", () => {
    expect(getWindowBackgroundColor("graphite-dark")).toBe("#13161c");
    expect(getWindowBackgroundColor("arctic-light")).toBe("#f6f8fb");
    expect(getWindowBackgroundColor("midnight")).toBe("#0b0c0e");
  });
});
