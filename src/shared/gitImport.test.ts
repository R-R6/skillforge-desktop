import { describe, expect, it } from "vitest";
import { getGitImportDirectory, parseGitHubImportUrl } from "./gitImport";

describe("parseGitHubImportUrl", () => {
  it("parses repository root urls", () => {
    const plan = parseGitHubImportUrl("https://github.com/multica-ai/andrej-karpathy-skills");
    expect(plan.owner).toBe("multica-ai");
    expect(plan.repository).toBe("andrej-karpathy-skills");
    expect(plan.cloneUrl).toBe("https://github.com/multica-ai/andrej-karpathy-skills");
    expect(plan.sourceId).toHaveLength(40);
    expect(plan.subPath).toEqual([]);
  });

  it("parses tree urls with branch and subpath", () => {
    const plan = parseGitHubImportUrl("https://github.com/owner/repo/tree/main/skills/core");
    expect(plan.branch).toBe("main");
    expect(plan.subPath).toEqual(["skills", "core"]);
    expect(plan.cloneUrl).toBe("https://github.com/owner/repo.git");
  });

  it("rejects non-github urls", () => {
    expect(() => parseGitHubImportUrl("https://gitlab.com/owner/repo")).toThrow("GitHub HTTPS");
  });
});

describe("getGitImportDirectory", () => {
  it("joins source id under skill sources root", () => {
    const directory = getGitImportDirectory("abc123", "D:/SkillForgeData/skill-sources");
    expect(directory).toMatch(/skill-sources[\\/]abc123$/);
  });
});
