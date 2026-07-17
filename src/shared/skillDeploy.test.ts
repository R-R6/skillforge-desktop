import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractEnglishSlugFromContent,
  extractSkillForgeBody,
  formatSlashCommandLabel,
  platformSupportsTool,
  resolveSkillSlugs,
  toAgentSkillMarkdown,
  toPinyinSlug,
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

  it("prefers english identity extracted from skill content", () => {
    expect(
      toSkillSlug({
        id: "高级项目经理",
        name: "高级项目经理",
        content: "# 高级项目经理\n\n## Prompt\n\nYou are **SeniorProjectManager**, a senior PM.\n",
      }),
    ).toBe("senior-project-manager");
  });

  it("uses pinyin when no english identity is available", () => {
    expect(toPinyinSlug("会议纪要专家")).toBe("hui-yi-ji-yao-zhuan-jia");
    expect(
      toSkillSlug({
        id: "会议纪要专家",
        name: "会议纪要专家",
        content: "# 会议纪要专家\n\n## Prompt\n\n整理会议纪要。\n",
      }),
    ).toBe("hui-yi-ji-yao-zhuan-jia");
  });

  it("uses a stable unique fallback when no readable name remains", () => {
    const first = toSkillSlug({ id: "???", name: "???", sourcePath: "a.md" });
    const second = toSkillSlug({ id: "!!!", name: "!!!", sourcePath: "b.md" });

    expect(first).toMatch(/^skill-[a-f0-9]{8}$/);
    expect(second).toMatch(/^skill-[a-f0-9]{8}$/);
    expect(first).not.toBe(second);
  });
});

describe("extractEnglishSlugFromContent", () => {
  it("reads bold agent identity", () => {
    expect(extractEnglishSlugFromContent("You are **Incident Responder**, calm.")).toBe("incident-responder");
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

  it("passes through existing ascii frontmatter content", () => {
    const markdown = toAgentSkillMarkdown({
      ...sampleSkill,
      content: "---\nname: existing\ndescription: already standard\n---\n\n# Existing\n",
    });
    expect(markdown).toContain("name: existing");
  });

  it("rewrites chinese frontmatter names into ascii slugs and enriches description", () => {
    const markdown = toAgentSkillMarkdown({
      ...sampleSkill,
      id: "高级项目经理",
      name: "高级项目经理",
      description: "现实范围评估与规格转任务分解专家",
      content:
        "---\nname: 高级项目经理\ndescription: 现实范围评估与规格转任务分解专家\n---\n\nYou are **SeniorProjectManager**.\n",
    });

    expect(markdown).toMatch(/^---\nname: senior-project-manager\n/);
    expect(markdown).toContain("description: 高级项目经理：现实范围评估与规格转任务分解专家");
  });

  it("writes ascii names and keeps chinese labels in description", () => {
    const markdown = toAgentSkillMarkdown({
      ...sampleSkill,
      id: "高级项目经理",
      name: "高级项目经理",
      description: "现实范围评估与规格转任务分解专家",
      sourcePath: "resources/skills/项目管理部门/高级项目经理.md",
      content:
        "# 高级项目经理\n\n> 现实范围评估与规格转任务分解专家\n\n支持平台: codex, cursor\n\n## Prompt\n\nYou are **SeniorProjectManager**.\n",
    });

    expect(markdown).toMatch(/^---\nname: senior-project-manager\ndescription: /);
    expect(markdown).toContain("高级项目经理：现实范围评估与规格转任务分解专家");
  });
});

describe("formatSlashCommandLabel", () => {
  it("shows chinese alias beside ascii slash command", () => {
    expect(
      formatSlashCommandLabel({
        id: "高级项目经理",
        name: "高级项目经理",
        content: "You are **SeniorProjectManager**.\n",
      }),
    ).toBe("/senior-project-manager（高级项目经理）");
  });
});

describe("resolveSkillSlugs", () => {
  it("keeps the native English command and disambiguates a Chinese collision", () => {
    const skills: SkillSummary[] = [
      { ...sampleSkill, id: "code-reviewer", name: "code-reviewer" },
      {
        ...sampleSkill,
        id: "代码审查工程师",
        name: "代码审查工程师",
        content: "You are **Code Reviewer**.\n",
      },
    ];

    const slugs = resolveSkillSlugs(skills);
    expect(slugs.get("code-reviewer")).toBe("code-reviewer");
    expect(slugs.get("代码审查工程师")).toBe("code-reviewer-dai-ma-shen-cha-gong-cheng-shi");
  });

  it("gives one short command when two chinese skills collide", () => {
    const creative: SkillSummary = {
      ...sampleSkill,
      id: "UI 设计师 · 设计创意",
      name: "UI 设计师 · 设计创意",
      content: "You are **UI Designer**.\n",
    };
    const department: SkillSummary = {
      ...sampleSkill,
      id: "UI 设计师 · 设计部门",
      name: "UI 设计师 · 设计部门",
      content: "You are **UI Designer**.\n",
    };

    const slugs = resolveSkillSlugs([creative, department]);
    const values = [slugs.get(creative.id), slugs.get(department.id)];
    expect(values).toContain("ui-designer");
    expect(new Set(values).size).toBe(2);
    expect(values.every((slug) => slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it("preserves previously deployed slugs when the deploy set grows", () => {
    const creative: SkillSummary = {
      ...sampleSkill,
      id: "UI 设计师 · 设计创意",
      name: "UI 设计师 · 设计创意",
      content: "You are **UI Designer**.\n",
    };
    const department: SkillSummary = {
      ...sampleSkill,
      id: "UI 设计师 · 设计部门",
      name: "UI 设计师 · 设计部门",
      content: "You are **UI Designer**.\n",
    };

    const alone = resolveSkillSlugs([creative]);
    expect(alone.get(creative.id)).toBe("ui-designer");

    const together = resolveSkillSlugs([creative, department], {
      preserved: new Map([[creative.id, "ui-designer"]]),
    });
    expect(together.get(creative.id)).toBe("ui-designer");
    expect(together.get(department.id)).toBe("ui-designer-ui-she-ji-shi-she-ji-bu-men");
  });

  it("reclaims the short command for native English when Chinese previously preserved it", () => {
    const native: SkillSummary = { ...sampleSkill, id: "code-reviewer", name: "code-reviewer" };
    const chinese: SkillSummary = {
      ...sampleSkill,
      id: "代码审查工程师",
      name: "代码审查工程师",
      content: "You are **Code Reviewer**.\n",
    };

    const slugs = resolveSkillSlugs([native, chinese], {
      preserved: new Map([[chinese.id, "code-reviewer"]]),
    });

    expect(slugs.get("code-reviewer")).toBe("code-reviewer");
    expect(slugs.get("代码审查工程师")).toBe("code-reviewer-dai-ma-shen-cha-gong-cheng-shi");
  });
});

describe("built-in skill slash commands", () => {
  it("generates autocomplete-compatible ASCII names for every built-in skill", () => {
    const skillsRoot = path.resolve("resources", "skills");
    const files: string[] = [];
    const collect = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(filePath);
        else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && entry.name.toLowerCase() !== "readme.md") {
          files.push(filePath);
        }
      }
    };
    collect(skillsRoot);

    const generated = files.map((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const name = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, ".md");
      const slug = toSkillSlug({ id: name, name, content, sourcePath: filePath });
      return { filePath, name, slug };
    });
    const invalid = generated.filter(({ slug }) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
    const uniqueSkills = [...new Map(generated.map((item) => [item.name, item])).values()].map((item) => ({
      id: item.name,
      name: item.name,
      description: "",
      category: path.relative(skillsRoot, path.dirname(item.filePath)),
      platforms: [],
      content: fs.readFileSync(item.filePath, "utf8"),
      sourcePath: item.filePath,
    }));
    const resolved = resolveSkillSlugs(uniqueSkills);
    const resolvedSlugs = [...resolved.values()];

    expect(files.length).toBeGreaterThan(250);
    expect(invalid).toEqual([]);
    expect(resolvedSlugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
    expect(new Set(resolvedSlugs).size).toBe(resolvedSlugs.length);

    const uiDesignerSlugs = [
      resolved.get("UI 设计师 · 设计创意"),
      resolved.get("UI 设计师 · 设计部门"),
    ];
    expect(uiDesignerSlugs).toContain("ui-designer");
  });
});
