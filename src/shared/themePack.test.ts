import { describe, expect, it } from "vitest";
import {
  buildThemePackKey,
  parseThemePackJson,
  parseThemePackKey,
  resolveThemePackTokens,
  serializeThemePack,
  tokensToStyleBlock,
  validateThemePack,
} from "./themePack";

const SAMPLE_PACK = {
  schemaVersion: 1,
  id: "demo-pack",
  name: "Demo Pack",
  description: "For tests",
  author: "SkillForge",
  variants: {
    dark: {
      tokens: {
        "--bg": "#101010",
        "--accent": "#38bdf8",
      },
    },
    "arctic-light": {
      tokens: {
        "--bg": "#fafafa",
        "--accent": "#2563eb",
      },
    },
  },
};

describe("validateThemePack", () => {
  it("accepts a valid theme pack", () => {
    const pack = validateThemePack(SAMPLE_PACK);
    expect(pack.id).toBe("demo-pack");
    expect(pack.variants.dark?.tokens["--bg"]).toBe("#101010");
  });

  it("rejects invalid css variable names", () => {
    expect(() => validateThemePack({
      ...SAMPLE_PACK,
      variants: { dark: { tokens: { bg: "#111" } } },
    })).toThrow();
  });

  it("rejects unsupported schema version", () => {
    expect(() => validateThemePack({ ...SAMPLE_PACK, schemaVersion: 2 })).toThrow();
  });
});

describe("parseThemePackJson", () => {
  it("round-trips through serializeThemePack", () => {
    const pack = parseThemePackJson(JSON.stringify(SAMPLE_PACK));
    const restored = parseThemePackJson(serializeThemePack(pack));
    expect(restored).toEqual(pack);
  });
});

describe("resolveThemePackTokens", () => {
  it("prefers exact resolved theme variant", () => {
    const pack = validateThemePack(SAMPLE_PACK);
    expect(resolveThemePackTokens(pack, "arctic-light")["--bg"]).toBe("#fafafa");
  });

  it("falls back to dark variant for graphite-dark", () => {
    const pack = validateThemePack(SAMPLE_PACK);
    expect(resolveThemePackTokens(pack, "graphite-dark")["--bg"]).toBe("#101010");
  });
});

describe("theme pack keys", () => {
  it("builds and parses keys", () => {
    const key = buildThemePackKey("builtin", "tokyo-night");
    expect(parseThemePackKey(key)).toEqual({ source: "builtin", id: "tokyo-night" });
  });
});

describe("tokensToStyleBlock", () => {
  it("returns empty string for no tokens", () => {
    expect(tokensToStyleBlock({})).toBe("");
  });

  it("renders css custom properties", () => {
    const css = tokensToStyleBlock({ "--bg": "#111318", "--accent": "#38bdf8" });
    expect(css).toContain("--bg: #111318");
    expect(css).toContain(":root {");
  });
});

describe("builtin theme json files", () => {
  it("parses tokyo-night and nord packs", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const root = resolve(process.cwd(), "resources/themes");
    const tokyo = parseThemePackJson(readFileSync(resolve(root, "tokyo-night.json"), "utf8"));
    const nord = parseThemePackJson(readFileSync(resolve(root, "nord.json"), "utf8"));
    expect(tokyo.id).toBe("tokyo-night");
    expect(nord.variants.light?.tokens["--bg"]).toBe("#eceff4");
  });
});
