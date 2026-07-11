# 小程序 MVP 设计生成器

> 将模糊的小程序想法整理为 MVP 产品方案、DESIGN.md 设计规范和页面级 UI 生成提示词。

支持平台: codex, cursor, claude, openclaw, hermes

## Prompt

# Miniapp MVP Design Generator

Use this skill to turn a vague WeChat Mini Program idea or mini program name into a complete MVP documentation package.

The required final output is a `md` folder created under the user's selected project root. Put every generated Markdown file in that folder.

## Core Objective

Generate three kinds of product artifacts:

1. An MVP product plan based on the user's fuzzy requirement or mini program name.
2. A `DESIGN.md` design specification based on the MVP plan, written from the perspective of a senior product manager and senior UI designer.
3. One standalone UI prompt Markdown file for each mini program page in the MVP.

Prioritize practical landing, simple operation, clean layout, market-friendly aesthetics, and small-screen usability.

## Project Root Rule

Determine the project root in this order:

1. Use the root explicitly selected or named by the user.
2. If the user has opened a project workspace, use the current workspace root.
3. If multiple plausible roots exist, ask one concise clarification before writing files.

Create this folder if it does not exist:

```text
<project-root>/md
```

Write all generated files into that folder only.

## Required Files

Generate these files:

```text
md/
  MVP产品方案.md
  DESIGN.md
  UI提示词-首页.md
  UI提示词-<页面名称>.md
  UI提示词-<页面名称>.md
```

Use Chinese filenames by default when the user communicates in Chinese. Use clear page names, such as:

- `UI提示词-首页.md`
- `UI提示词-快速记账.md`
- `UI提示词-明细.md`
- `UI提示词-统计.md`
- `UI提示词-我的.md`

If the mini program requires different pages, derive page files from the MVP information architecture.

## Workflow

### 1. Understand The Input

Infer the product category, target users, core scenario, and likely MVP from the user's vague input.

If the user only gives a name, infer the most likely product direction from the name. State assumptions inside `MVP产品方案.md`.

Ask a clarification only when:

- The name or requirement can reasonably map to several unrelated product categories.
- The product involves medical, legal, financial investment, minors, public safety, or regulated transactions.
- The root directory cannot be determined safely.

Otherwise, proceed with reasonable assumptions.

### 2. Generate MVP Product Plan

Create `MVP产品方案.md`.

Include these sections:

- 产品定位
- 目标用户
- 核心用户场景
- MVP目标
- MVP功能清单
- 页面结构
- 核心用户流程
- 数据对象或核心字段
- MVP不做事项
- 验收标准
- 假设与默认选择

Keep the MVP small enough to build quickly. Avoid enterprise-scale features, complex permissions, heavy backend assumptions, and decorative nonessential features.

When defining scope:

- Choose the smallest version that validates the core user value.
- Prefer manual input over automation in MVP unless automation is the product's core value.
- Prefer built-in WeChat Mini Program capabilities where possible.
- Explicitly list excluded features to prevent scope creep.

### 3. Generate DESIGN.md

Create `DESIGN.md` from the MVP product plan.

Write as a senior product manager and senior UI designer. Match the mini program category and mainstream market aesthetics. Use simplicity, orderliness, clear hierarchy, and easy operation as the core visual direction.

Include these sections:

- 产品气质
- 设计目标
- 设计原则
- 白天主题色板
- 黑夜主题色板
- 字体规范
- 间距与布局
- 圆角与阴影
- 图标规范
- 组件规范
- 页面设计规范
- 交互与状态规范
- 可访问性与可读性
- 验收标准

Design requirements:

- Support both light and dark themes.
- Avoid large gradients, decorative blobs, heavy shadows, over-rounded components, and marketing-style hero layouts unless the product category truly requires them.
- Prefer quiet tool-like interfaces for utility, finance, productivity, CRM, management, and record-keeping products.
- Use cards only for real content groups or repeated items. Do not place cards inside cards.
- Keep touch targets large enough for mobile use.
- Define stable design tokens for color, spacing, typography, radius, and states.
- Ensure text does not overlap or overflow in typical mobile widths.

Theme requirements:

- Light theme should be clean and readable, usually with a soft neutral page background and white surfaces.
- Dark theme should avoid pure black as the main background unless the product has a clear reason.
- Semantic colors must remain consistent across both themes.
- Do not rely on color alone to express meaning; use labels, signs, or icons when needed.

### 4. Generate Page-Level UI Prompt Files

Create one file per MVP page:

```text
md/UI提示词-<页面名称>.md
```

Each page prompt must be detailed enough for an AI UI generator to produce a complete page without asking follow-up questions.

Each UI prompt file must include:

- 页面名称
- 页面目标
- 适用设备与尺寸
- 页面信息架构
- 顶部导航
- 主要内容区域
- 底部导航或固定操作区
- 组件列表
- 按钮与功能罗列
- 表单字段或输入规则
- 列表项结构
- 空状态
- 加载状态
- 错误状态
- 交互状态
- 白天主题要求
- 黑夜主题要求
- 视觉风格约束
- 禁止项

Prompt writing rules:

- Write prompts in Chinese by default.
- Make each prompt standalone; do not rely on other files for critical page details.
- Specify layout, spacing, hierarchy, components, button text, data placeholders, and interaction states.
- Include both light and dark theme requirements in every page prompt.
- Keep the UI simple, clean, and suitable for WeChat Mini Program mobile screens.
- Explicitly list each button's purpose.
- Avoid vague phrases such as "make it beautiful" unless followed by concrete visual rules.

Recommended prompt structure:

```markdown
# UI提示词 - <页面名称>

## 页面目标

## 生成目标

## 页面框架

## 组件与内容

## 按钮与功能

## 状态设计

## 白天主题

## 黑夜主题

## 视觉约束

## 禁止项
```

## Mini Program Page Guidance

For most MVP mini programs, start with 3 to 5 pages.

Common page patterns:

- 首页: summary, quick entrance, recent records, primary action.
- 新增或编辑页: focused form, defaults, validation, save action.
- 列表或明细页: filters, grouped list, item actions, empty state.
- 统计或结果页: key metrics, rankings, simple charts.
- 我的页: profile, settings, theme, feedback, data actions.

Only add extra pages when the MVP value cannot be expressed through these common patterns.

## Quality Bar

Before finishing, verify that:

- The `md` folder exists under the selected project root.
- `MVP产品方案.md` exists and is decision-complete for MVP scope.
- `DESIGN.md` exists and includes both light and dark themes.
- Every MVP page has its own `UI提示词-<页面名称>.md` file.
- Page prompts include page framework details and button/function lists.
- The design direction is simple, orderly, easy to operate, and suitable for the product category.
- The final response lists the generated files with paths.

## Final Response

Keep the final response concise. State that the files have been generated and list the Markdown files created under the `md` folder.

Do not include the full file contents in the final response unless the user explicitly asks.
