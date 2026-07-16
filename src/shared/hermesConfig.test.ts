import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectHermesExternalDirs,
  HERMES_SKILLFORGE_MARKER,
  resolveDefaultHermesHome,
  resolveHermesConfigPath,
  resolveHermesHome,
  resolvePreferredHermesHome,
  upsertHermesExternalDirs,
} from "./hermesConfig";
import type { ProjectSummary } from "./types";

const tempRoots: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skillforge-hermes-"));
  tempRoots.push(dir);
  return dir;
}

function project(overrides: Partial<ProjectSummary>): ProjectSummary {
  return {
    id: "p1",
    name: "demo",
    path: "F:/demo",
    tools: ["hermes"],
    skillCount: 1,
    discoveredSkillCount: 0,
    discoveredTools: [],
    lastScannedAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveHermesHome", () => {
  const previousHome = process.env.HERMES_HOME;

  afterEach(() => {
    if (previousHome === undefined) delete process.env.HERMES_HOME;
    else process.env.HERMES_HOME = previousHome;
  });

  it("prefers HERMES_HOME when set", () => {
    process.env.HERMES_HOME = "F:/custom/hermes";
    expect(resolveHermesHome()).toBe("F:/custom/hermes");
    expect(resolveHermesConfigPath()).toBe(path.join("F:/custom/hermes", "config.yaml"));
  });

  it("uses ~/.hermes as the macOS default home", () => {
    expect(resolveDefaultHermesHome("darwin", {}, "/Users/demo")).toBe(path.join("/Users/demo", ".hermes"));
    expect(resolvePreferredHermesHome({}, "darwin", "/Users/demo")).toBe(path.join("/Users/demo", ".hermes"));
  });

  it("prefers HERMES_HOME on macOS before the default home", () => {
    expect(resolvePreferredHermesHome({ HERMES_HOME: "/tmp/custom-hermes" }, "darwin", "/Users/demo")).toBe(
      "/tmp/custom-hermes",
    );
  });

  it("uses LOCALAPPDATA\\hermes as the Windows default home", () => {
    expect(
      resolveDefaultHermesHome("win32", { LOCALAPPDATA: "C:/Users/demo/AppData/Local" }, "C:/Users/demo"),
    ).toBe(path.join("C:/Users/demo/AppData/Local", "hermes"));
  });
});

describe("collectHermesExternalDirs", () => {
  it("collects only hermes-enabled projects with deployed skills", () => {
    const root = makeTempDir();
    const projectPath = path.join(root, "repo");
    fs.mkdirSync(path.join(projectPath, ".agents", "skills", "demo"), { recursive: true });
    fs.writeFileSync(path.join(projectPath, ".agents", "skills", "demo", "SKILL.md"), "# demo\n");

    const dirs = collectHermesExternalDirs([
      project({ path: projectPath, skillCount: 2 }),
      project({ id: "p2", path: path.join(root, "other"), tools: ["codex"], skillCount: 1 }),
      project({ id: "p3", path: path.join(root, "empty"), skillCount: 0 }),
    ]);

    expect(dirs).toEqual([path.join(projectPath, ".agents", "skills").replace(/\\/g, "/")]);
  });
});

describe("upsertHermesExternalDirs", () => {
  it("creates config with managed external dirs", () => {
    const root = makeTempDir();
    const configPath = path.join(root, "config.yaml");
    upsertHermesExternalDirs(["F:/project/demo/.agents/skills"], configPath);
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain("skills:");
    expect(content).toContain("external_dirs:");
    expect(content).toContain(`- F:/project/demo/.agents/skills  ${HERMES_SKILLFORGE_MARKER}`);
  });

  it("preserves user-defined external dirs", () => {
    const root = makeTempDir();
    const configPath = path.join(root, "config.yaml");
    fs.writeFileSync(configPath, [
      "display:",
      "  busy_input_mode: bell",
      "skills:",
      "  external_dirs:",
      "    - ~/.agents/skills",
      "",
    ].join("\n"), "utf8");

    upsertHermesExternalDirs(["F:/project/demo/.agents/skills"], configPath);
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain("- ~/.agents/skills");
    expect(content).toContain(`- F:/project/demo/.agents/skills  ${HERMES_SKILLFORGE_MARKER}`);
    expect(content).toContain("display:");
  });

  it("replaces previous skillforge-managed dirs", () => {
    const root = makeTempDir();
    const configPath = path.join(root, "config.yaml");
    upsertHermesExternalDirs(["F:/old/.agents/skills"], configPath);
    upsertHermesExternalDirs(["F:/new/.agents/skills"], configPath);
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).not.toContain("F:/old/.agents/skills");
    expect(content).toContain("F:/new/.agents/skills");
  });

  it("replaces inline external_dirs: [] without duplicating the skills section", () => {
    const root = makeTempDir();
    const configPath = path.join(root, "config.yaml");
    fs.writeFileSync(configPath, [
      "goals:",
      "  max_turns: 20",
      "skills:",
      "  external_dirs: []",
      "  template_vars: true",
      "",
    ].join("\n"), "utf8");

    upsertHermesExternalDirs(["F:/project/demo/.agents/skills"], configPath);
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain(`- F:/project/demo/.agents/skills  ${HERMES_SKILLFORGE_MARKER}`);
    expect(content).toContain("template_vars: true");
    expect(content).not.toContain("external_dirs: []");
    expect(content.match(/^skills:\s*$/gm)?.length).toBe(1);
  });

  it("inserts external_dirs into an existing skills section", () => {
    const root = makeTempDir();
    const configPath = path.join(root, "config.yaml");
    fs.writeFileSync(configPath, [
      "skills:",
      "  config:",
      "    wiki:",
      "      path: ./wiki",
      "",
    ].join("\n"), "utf8");

    upsertHermesExternalDirs(["F:/project/demo/.agents/skills"], configPath);
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain("wiki:");
    expect(content).toContain(`- F:/project/demo/.agents/skills  ${HERMES_SKILLFORGE_MARKER}`);
  });
});
