# SkillForge Theme System 1.0 — 产品愿景

> **核心原则：不是换皮，是换 Token。**  
> 布局永远不变 · 层级永远不变 · 主题只替换颜色与设计变量。

> **设计宪法：** Light 不是 Dark 的反色。详见 [design-philosophy.md](./design-philosophy.md)。

---

## 1. 为什么要做 Theme System

SkillForge 定位是 **AI 开发者工作台（AI Developer Workspace）**，不是普通管理工具。

参考 VS Code、JetBrains、Raycast、Warp 等优秀开发者工具：

- 它们不是简单的「黑白切换」
- 而是 **Design Token + 多主题** 的组合
- 用户获得个性化，产品保持视觉一致性

**关键认知：** Graphite Dark 像「深夜 AI 实验室」，Arctic Light 像「白天设计工作室」——两个世界，同一个品牌。

---

## 2. Theme System 1.0 结构

### Appearance（外观模式）

```
Appearance
├── Follow System   ← 跟随操作系统（Windows / macOS）
├── Dark
└── Light
```

> **Follow System** 是专业 Electron 应用的标配，应优先支持。

### Brand Theme（品牌主题）

决定整体氛围，**各自独立设计，非深浅反色**：

| 主题 | 氛围隐喻 | 关键词 | 核心配色 |
|------|----------|--------|----------|
| **Graphite Dark**（默认） | 深夜 AI 实验室 | Calm · Focused · Professional · AI Native | Graphite + Slate + Blue + Warm Orange |
| **Arctic Light** | 白天现代设计工作室 | Bright · Precise · Modern · Open | Warm White `#F6F8FB` + Slate + Soft Blue + Warm Orange |
| **Midnight**（可选） | 极致深色空间 | Ultra Dark · OLED | Near Black `#0B0C0E` + Blue + Warm Orange |

> 第一阶段三个 Brand Theme 覆盖 ~95% 用户。Arctic Light 完整规范见 [design-philosophy.md §6](./design-philosophy.md#6-theme-2--arctic-light)。

### Accent Color（强调色）— 第二阶段

只改变交互色，**布局完全不动**：

| Accent | 气质参考 |
|--------|----------|
| Ocean Blue（默认） | SkillForge 品牌 |
| Emerald | GitHub |
| Sunset / Orange | Claude |
| Violet | Linear |
| Rose | — |

影响范围：按钮 · Focus · Notification · 激活指示条（**Hover 规则仍遵循各 Brand Theme 哲学**）

### UI Density（密度）— 第二阶段

```
Density
├── Comfortable（默认）
└── Compact
```

### Corner Style（圆角）— 可选

```
Corner Style
├── Rounded（默认）
└── Sharp
```

### Motion（动效）

```
☑ Enable Animation
☑ Reduce Motion（无障碍 / prefers-reduced-motion）
```

### Window（窗口效果）— 可选

```
☑ Acrylic Background
☑ Vibrancy
☑ Rounded Window
```

---

## 3. Settings 信息架构

**不建议**把主题塞在「设置 → 主题」下拉框里。

**建议**独立页面：

```
Settings
└── Appearance          ← 独立入口，页面本身即品牌展示
    ├── Appearance      Follow System / Graphite / Arctic / Midnight
    ├── Accent          Ocean · Emerald · Sunset · Violet · Rose
    ├── Density         Comfortable / Compact
    ├── Motion          动画开关 · 降低动态
    └── Window          Acrylic · Vibrancy · Rounded
```

---

## 4. 跨主题品牌锚点

以下元素在**所有主题**中保持一致，确保「都是 SkillForge」：

| 锚点 | 说明 |
|------|------|
| 布局结构 | 三栏 Skill 库、Sidebar 导航、卡片层级 — 永不变 |
| 间距与排版 | 同一 spacing scale、同一 font stack |
| 交互行为 | 点击、选中、键盘导航 — 永不变 |
| Warm Orange 语义 | AI 思考 / 运行 / 生成 — 三色主题均保留（饱和度按主题调整） |
| Blue Accent 家族 | 交互强调色 — Dark 用 cyan-blue，Light 用降饱和 blue |

---

## 5. 长期：Theme Pack（主题包）

未来可发布官方 / 社区主题包，**全部为 Theme JSON**，无需改代码：

- OpenAI · Anthropic · GitHub
- Nord · Tokyo Night · Catppuccin · Dracula · Gruvbox · Solarized

每个 Theme Pack 必须声明遵循 [design-philosophy.md](./design-philosophy.md) 的 Dark/Light 层次规则。

---

## 6. 主题层级总览

| 层级 | 开放给用户 | 作用 |
|------|-----------|------|
| Appearance | ✅ | 深浅 / 跟随系统 |
| Brand Theme | ✅ | 整体氛围与品牌一致性 |
| Accent Color | ✅ | 个性化，不破坏布局 |
| Density | ✅ | 屏幕尺寸与工作流 |
| Motion | ✅ | 舒适度与无障碍 |
| Corner / Window | 可选 | 平台特性增强 |

**核心优势：** 新增组件只依赖语义 Token（`--surface`、`--text-primary`、`--accent`），不必再写「深色版 / 浅色版」分支。Dark 与 Light 的差异由主题文件表达，而非组件内 `if light` 逻辑。

---

## 7. 相关文档

| 文档 | 内容 |
|------|------|
| [design-philosophy.md](./design-philosophy.md) | **设计宪法** — Dark/Light 双人格、Arctic 完整 Token、决策对照表 |
| [architecture.md](./architecture.md) | Token 分层与技术架构 |
| [implementation-roadmap.md](./implementation-roadmap.md) | 分期实施与现在做 vs 未来做 |
