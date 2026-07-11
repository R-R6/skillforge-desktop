# SkillForge 主题设计哲学

> 本文档是 Theme System 的**设计宪法**。所有主题实现、Token 定义、组件样式决策，均须遵循本文原则。

---

## 1. 第一原则：Light 不是 Dark 的反色

很多产品的做法：

```
Dark：黑背景
  ↓
Light：白背景
结束。
```

结果：

- 深色很好看
- 浅色很廉价

**真正优秀的产品：Dark 和 Light 是两个世界，但拥有同一个品牌。**

| 主题 | 隐喻 | 传递的情绪 |
|------|------|-----------|
| **Graphite Dark** | 深夜工作的 AI 实验室 | 专注 · 沉浸 · 冷静 |
| **Arctic Light** | 白天工作的现代设计工作室 | 清晰 · 开放 · 精确 |

它们不是同一个东西的明暗版本，而是 **同一产品的两种人格（Two Personalities）**。

---

## 2. 主题设计宪法（Design Constitution）

以下原则必须写入 Prompt、Code Review 与 Token 规范，**不可违反**：

### 英文原文（规范引用）

> **Dark Mode and Light Mode should NOT be inversions of each other.**
>
> Dark Mode should communicate **focus, immersion, and calmness**.
>
> Light Mode should communicate **clarity, openness, and precision**.
>
> Both themes must share the same **layout, spacing, typography, iconography, and interaction behavior**, while expressing different emotional atmospheres through color.
>
> Dark Mode should rely on **contrast, ambient lighting, and subtle glow**.
>
> Light Mode should rely on **whitespace, borders, typography, and clean surfaces** instead of glow.
>
> The two themes should feel like **two personalities of the same product** rather than two different products.

### 中文摘要

| 维度 | Dark Mode | Light Mode |
|------|-----------|------------|
| 情绪 | 专注 · 沉浸 · 冷静 | 清晰 · 开放 · 精确 |
| 层次手段 | 对比 · 环境光 ·  subtle glow | 留白 · 边框 · 排版 · 干净表面 |
| 共享不变 | 布局 · 间距 · 字体 · 图标 · 交互行为 | 同左 |
| 禁止 | 把 Light 当作 Dark 的反色 | 在 Light 中使用 Glow |

---

## 3. 层次制造方式的根本差异

### Dark Theme 依赖

- **Light**（亮度对比）
- **Glow**（环境光晕）
- **Contrast**（明暗反差）

制造深度与氛围。

### Light Theme 依赖

- **Spacing**（间距）
- **Border**（边框）
- **Whitespace**（留白）
- **Typography**（排版层级）

制造深度与氛围。

这是 **Apple · Figma · Linear** 共同遵循的路径。

**Light Theme 千万不要 Glow。** 这是很多 AI 软件在浅色模式下显得「土」的最大原因——白天界面还在发蓝光。

---

## 4. 跨主题语义色：Warm Orange（AI 状态色）

**暖橙色在三个主题中均保留**，仅调整亮度与饱和度：

| 主题 | AI 状态色 | 说明 |
|------|----------|------|
| Graphite Dark | `#FF9F68` | 完整饱和度，AI 思考 / 运行 / 生成 |
| Arctic Light | `#EA7A2F` | 降低饱和度，避免浅色背景下过跳 |
| Midnight | `#FF9F68`（或略降） | 与 Graphite 一致，OLED 友好 |

**品牌认知目标：** 无论用户处于哪个主题，看到暖橙色即知道——**AI 正在思考、生成或执行任务**。这种跨主题一致的语义色，比单纯配色统一更能强化 SkillForge 品牌识别。

---

## 5. Theme 1 — Graphite Dark（默认）

### 关键词

Calm · Focused · Professional · AI Native

### 适合场景

- 晚上
- 程序员长时间编码
- 沉浸式 AI 工作流

### 核心配色

| Token | 值 | 用途 |
|-------|-----|------|
| Background | Graphite `#13161C` | 页面基底 |
| Surface | `#1A1D24` → `#252A33` | 卡片 / 侧栏 / 面板层级 |
| Text | Slate 层级 | 见 §7 |
| Accent | Blue `#38BDF8` → `#4F8CFF` | 交互 · 按钮 · 激活 |
| AI Semantic | Warm Orange `#FF9F68` | AI 状态 ONLY |

### 交互规则

| 状态 | 规则 |
|------|------|
| Hover | 蓝色调 hover 可用（克制） |
| Active | Cyan / Blue 指示 |
| Selected Card | Graphite 底 + Blue Border |
| Glow | 允许 subtle ambient glow |
| Hero | 允许 soft blue glow |

---

## 6. Theme 2 — Arctic Light

### 关键词

Bright · Precise · Modern · Open

### 适合场景

- 白天办公
- 设计评审
- 演示与截图

### 核心气质

Warm White · Cool Gray · Soft Blue — **不是纯白世界**。

### 为什么不用 `#FFFFFF` 做背景？

纯白 `#FFFFFF` 太刺眼。Apple、Linear、Figma 均使用 **Warm White** 作为页面底：

| Token | 推荐值 | 说明 |
|-------|--------|------|
| `--bg` | `#F6F8FB` 或 `#F5F7FA` | 页面背景，立即舒服很多 |
| `--surface-sidebar` | `#EFF2F7` | 比背景深一点点，形成层级 |
| `--surface` | `#FFFFFF` | 卡片表面 |
| `--border` | `#E5EAF2` | 1px 边框，**不用阴影堆层级** |

> **阴影越多，越像 Windows 2015。** Light 模式用 Border + Whitespace，不用 heavy shadow。

### 文字 — 与 Dark 一一对应

| 层级 | Arctic Light | Graphite Dark 对应 |
|------|-------------|-------------------|
| Primary | `#111827` | `#F8FAFC` |
| Secondary | `#475569` | `#CBD5E1` |
| Description | `#64748B` | `#94A3B8` |
| Disabled | `#94A3B8` | `#64748B` |

### Accent — Light 模式必须降刺

Dark 用的 `#38BDF8` **不要**原样搬到 Light。浅色背景下高饱和 cyan 会特别刺眼。

| Token | Arctic Light 推荐 |
|-------|------------------|
| `--accent` | `#3B82F6` 或 `#2563EB` |
| `--accent-ai` | `#EA7A2F`（降饱和 Orange） |

### 交互规则 — 与 Dark 完全不同

| 状态 | Arctic Light 规则 | ❌ 禁止 |
|------|------------------|--------|
| Hover | 浅灰 `rgba(15, 23, 42, 0.04)` | 蓝色 Hover |
| Active | 才变蓝 | -hover 就发蓝 |
| Selected Card | White + Blue Border + `#EFF6FF` 极淡填充 | 大面积蓝底 |
| Glow | **完全去掉** | 任何 glow / 蓝光 |
| Hero | Very Soft Gradient `#FFFFFF` → `#F2F7FF`（几乎看不出） | Blue Glow |

### Icon — Light 模式降低表现

| Dark | Light |
|------|-------|
| 可用渐变 | 降低强度 |
| Cyan → Blue → 一点 Orange | Blue → Light Blue → 一点 Orange |
| — | **不要紫色 · 不要 RGB 彩虹** |

---

## 7. Theme 3 — Midnight（可选）

### 关键词

Ultra Dark · OLED · High Contrast

### 适合场景

- 极致夜间
- OLED 屏幕
- 高对比环境

### 核心配色

| Token | 值 |
|-------|-----|
| Background | `#0B0C0E` |
| Card / Surface | `#16181D` |
| Accent | Blue（与 Graphite 一致） |
| AI Semantic | Warm Orange（保留） |

Midnight 是 Graphite 的「更深变体」，共享 Dark 的层次逻辑（glow · contrast），而非 Arctic 的逻辑。

---

## 8. 最终主题体系总览

| 主题 | 氛围 | 核心配色 | 层次手段 | 适合场景 |
|------|------|----------|----------|----------|
| **Graphite Dark**（默认） | AI 实验室 · 沉浸 · 专业 | Graphite + Slate + Blue + Warm Orange | Contrast · Ambient Glow | 夜间开发 · 长时间编码 |
| **Arctic Light** | 明亮 · 精确 · 现代 | Warm White + Slate + Blue + Warm Orange | Border · Whitespace · Typography | 白天办公 · 设计 · 演示 |
| **Midnight**（可选） | 极致深色 · OLED | Near Black + Cyan/Blue + Warm Orange | Contrast · Minimal Glow | 夜间 · 高对比 · OLED |

---

## 9. Dark vs Light 决策对照表

实现任何组件时，先查此表，**禁止用同一套 hover / glow / shadow 规则**:

| 设计决策 | Graphite / Midnight | Arctic Light |
|----------|----------------------|--------------|
| 页面背景 | Graphite / Near Black | `#F6F8FB` Warm White |
| 卡片层级 | Surface 色阶 + subtle glow | `#FFFFFF` + 1px `#E5EAF2` border |
| Sidebar | Surface 色阶 | `#EFF2F7`（比 bg 深一级） |
| Hover | 可选 blue tint（克制） | `rgba(15,23,42,.04)` 浅灰 ONLY |
| Active / Selected | Blue border + graphite fill | Blue border + `#EFF6FF` 极淡 fill |
| Glow | 允许 ambient（极 subtle） | **禁止** |
| Hero Banner | Blue ambient glow | `#FFFFFF` → `#F2F7FF` 渐变 |
| Shadow | 辅助，非主要 | 极轻或不用，靠 border |
| Primary Accent | `#38BDF8` / `#4F8CFF` | `#3B82F6` / `#2563EB` |
| AI Orange | `#FF9F68` | `#EA7A2F` |
| Icon | 可渐变 | 降强度，无紫无 RGB |

---

## 10. 给工程师的检查清单

新增或修改 UI 时，逐项确认：

- [ ] 布局 / 间距 / 字体 / 图标 / 交互行为是否与另一主题一致？
- [ ] Light 模式是否误用了 glow？
- [ ] Light hover 是否误用了蓝色？（应只有 active 才蓝）
- [ ] Arctic 背景是否用了 `#F6F8FB` 而非 `#FFFFFF`？
- [ ] Card 是否用 border 而非 heavy shadow 分层层级？
- [ ] AI 状态是否使用 Warm Orange 语义色（而非 generic accent）？
- [ ] Accent 在 Light 下是否降饱和（`#2563EB` 而非 `#38BDF8`）？
- [ ] 是否把 Light 当作 Dark 颜色的简单反色？

---

## 11. 相关文档

- [vision.md](./vision.md) — Theme System 产品结构与 Settings 信息架构
- [architecture.md](./architecture.md) — Token 分层与技术实现
- [implementation-roadmap.md](./implementation-roadmap.md) — 分期实施计划
