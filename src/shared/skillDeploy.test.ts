import { describe, expect, it } from "vitest";
import {
  extractSkillForgeBody,
  platformSupportsTool,
  toAgentSkillMarkdown,
  toSkillSlug,
} from "./skillDeploy";
import type { SkillSummary } from "./types";

const sampleSkill: SkillSummary = {
  id: "code-reviewer",
  name: "code-reviewer",
  description: "暂无描述",
  category: "外部导入",
  platforms: ["codex", "cursor", "claude", "hermes"],
  content: `# code-reviewer

> 暂无描述

支持平台: codex, cursor, claude, openclaw, hermes

## Prompt

# Code Reviewer

This skill guides the agent in conducting professional and thorough code reviews.`,
};

describe("toSkillSlug", () => {
  it("keeps ascii skill ids", () => {
    expect(toSkillSlug({ id: "code-reviewer", name: "code-reviewer" })).toBe("code-reviewer");
  });

  it("falls back to ascii parts of display names", () => {
    expect(toSkillSlug({ id: "UI 设计师", name: "UI Designer" })).toBe("ui-designer");
  });
});

describe("platformSupportsTool", () => {
  it("maps claude platform to claude-code tool", () => {
    expect(platformSupportsTool(["codex", "cursor", "claude"], "claude-code")).toBe(true);
    expect(platformSupportsTool(["codex"], "claude-code")).toBe(false);
  });

  it("allows all tools when platforms are empty", () => {
    expect(platformSupportsTool([], "hermes")).toBe(true);
  });
});

describe("extractSkillForgeBody", () => {
  it("extracts content after the Prompt section", () => {
    expect(extractSkillForgeBody(sampleSkill.content)).toContain("# Code Reviewer");
    expect(extractSkillForgeBody(sampleSkill.content)).not.toContain("支持平台:");
  });
});

describe("toAgentSkillMarkdown", () => {
  it("converts SkillForge format into agent SKILL.md", () => {
    const markdown = toAgentSkillMarkdown(sampleSkill);
    expect(markdown).toMatch(/^---\nname: code-reviewer\ndescription: /);
    expect(markdown).toContain("This skill guides the agent in conducting professional");
    expect(markdown).not.toContain("## Prompt");
  });

  it("passes through existing frontmatter content", () => {
    const markdown = toAgentSkillMarkdown({
      ...sampleSkill,
      content: "---\nname: existing\ndescription: already standard\n---\n\n# Existing\n",
    });
    expect(markdown).toContain("name: existing");
  });
});
