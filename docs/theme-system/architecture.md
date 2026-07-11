# Theme System — 技术架构

> 设计决策须遵循 [design-philosophy.md](./design-philosophy.md)。Dark 与 Light **不可共用同一套 hover / glow / shadow Token 值**。

---

## 1. 当前问题

```
src/renderer/styles.css   (~1000+ 行，且持续增长)
├── :root { Design Token }
├── 组件样式
└── .theme-light { 大量覆盖规则 }   ← 反模式：把 Light 当作 Dark 的反色
```

- 组件与主题耦合
- Light 模式靠 `.theme-light` 类名覆盖 — **正是「反色换皮」反模式**
- `settings.theme` 仅 `dark | light` 字符串
- Arctic Light 未独立设计（缺 Warm White、gray hover、无 glow 规则）

---

## 2. 目标架构

```
Component CSS
      ↓ 引用
Semantic Token     (--button-bg, --surface-raised, --hover-overlay, --glow-*)
      ↓ 引用
Design Token       (--color-neutral-900, --color-accent-500)
      ↓ 由主题提供（Dark 与 Light 各自独立赋值）
Theme File         (graphite-dark.css / arctic-light.css / midnight.css)
      ↓ 运行时切换
Theme Manager      (theme-manager.ts)
```

### 引用链示例

```
.nav-item:hover { background: var(--hover-overlay); }
       ↓
/* graphite-dark */  --hover-overlay: rgba(255, 255, 255, 0.05);
/* arctic-light */   --hover-overlay: rgba(15, 23, 42, 0.04);   ← 浅灰，非蓝色

.skill-row.selected { border-color: var(--border-selected); background: var(--surface-selected); }
       ↓
/* graphite-dark */  --surface-selected: var(--surface-elevated); --border-selected: var(--accent);
/* arctic-light */   --surface-selected: #EFF6FF;               --border-selected: var(--accent);
```

**禁止：** 组件内直接写 `#38BDF8` 或 `if (light) use white`

---

## 3. 语义 Token 分层（跨主题名统一，值按主题独立）

### 结构 Token（所有主题相同）

定义于 `design-tokens.css`：

- 间距：`--space-*`
- 圆角：`--radius-*`
- 字号：`--text-size-*`
- 动效时长：`--transition-hover: 120ms` 等

### 语义 Token（名称统一，值因主题而异）

定义于 `semantic-tokens.css`（仅声明名与 fallback），**具体值由主题文件覆盖**：

```css
/* semantic-tokens.css — 仅结构，不含主题色值 */
:root {
  --bg: ;
  --surface: ;
  --surface-sidebar: ;
  --surface-elevated: ;
  --surface-selected: ;
  --text-primary: ;
  --text-secondary: ;
  --text-description: ;
  --text-disabled: ;
  --accent: ;
  --accent-ai: ;           /* Warm Orange — AI 语义色，跨主题保留 */
  --border-default: ;
  --border-selected: ;
  --hover-overlay: ;
  --hero-gradient: ;
  --glow-ambient: ;        /* Arctic Light 设为 none / transparent */
  --shadow-card: ;
}
```

### 主题文件职责

| 文件 | 层次逻辑 | glow |
|------|----------|------|
| `graphite-dark.css` | contrast + ambient light | 允许 subtle |
| `arctic-light.css` | border + whitespace | **禁止**（`--glow-*: none`） |
| `midnight.css` | 同 graphite，更深色值 | minimal |

---

## 4. Arctic Light Token 参考值

实现 `arctic-light.css` 时使用（详见 [design-philosophy.md §6](./design-philosophy.md#6-theme-2--arctic-light)）：

```css
[data-theme="arctic-light"] {
  --bg: #F6F8FB;
  --surface-sidebar: #EFF2F7;
  --surface: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-selected: #EFF6FF;
  --border-default: #E5EAF2;

  --text-primary: #111827;
  --text-secondary: #475569;
  --text-description: #64748B;
  --text-disabled: #94A3B8;

  --accent: #2563EB;
  --accent-ai: #EA7A2F;

  --hover-overlay: rgba(15, 23, 42, 0.04);

  --glow-ambient: none;
  --glow-brand: none;
  --glow-nav-active: none;
  --shadow-card: none;          /* 或极轻 0 1px 2px rgba(0,0,0,.04) */

  --hero-gradient: linear-gradient(180deg, #FFFFFF 0%, #F2F7FF 100%);
}
```

---

## 5. 推荐目录结构

```
src/renderer/theme/
├── design-tokens.css        # 间距、圆角、字号、动效 — 跨主题不变
├── semantic-tokens.css      # 语义变量名 + 文档注释
├── themes/
│   ├── graphite-dark.css
│   ├── arctic-light.css     # 独立设计，非 dark 反色
│   └── midnight.css
├── accents/
│   ├── ocean.css
│   ├── emerald.css
│   ├── sunset.css
│   ├── violet.css
│   └── rose.css
├── density/
│   ├── comfortable.css
│   └── compact.css
└── theme-manager.ts
```

未来 Theme Pack：

```
resources/themes/
└── catppuccin-mocha.json    # Token 映射 JSON，须含 dark + light 两套值
```

---

## 6. Theme Manager 职责

```typescript
interface ThemePreferences {
  appearance: "system" | "dark" | "light";
  brandTheme: "graphite" | "arctic" | "midnight";
  accent: "ocean" | "emerald" | "sunset" | "violet" | "rose";
  density: "comfortable" | "compact";
  motion: "default" | "reduced";
}
```

**运行时流程：**

1. 读取 SQLite settings
2. `appearance === system` → 监听 Electron `nativeTheme`
3. 解析 effective theme（system light → `arctic-light`；system dark → `graphite-dark`）
4. 设置 `<html data-theme="arctic-light" data-accent="ocean">`
5. Theme Manager **禁止**在 JS 中做颜色反色计算

```html
<html data-theme="graphite-dark" data-accent="ocean" data-density="comfortable">
```

---

## 7. CSS 迁移策略

### Step A — 拆分 Token

- 提取 structural tokens → `design-tokens.css`
- 提取 semantic 变量名 → `semantic-tokens.css`
- Graphite 当前值 → `graphite-dark.css`

### Step B — 独立实现 Arctic Light

- **新建** `arctic-light.css`，按 design-philosophy 从零定义
- **删除** 全部 `.theme-light` 覆盖块（~100 条）
- 验收：Arctic 无 glow、hover 为浅灰、hero 为 soft gradient

### Step C — 组件改用语义 Token

- `--cyan` → `--accent`（组件层）
- 新增 `--accent-ai` 用于 AI 状态（deploy-line、agent-pill、skill-state）
- hover 统一用 `--hover-overlay`，不在组件写 `rgba(blue,...)`

### Step D — Settings 与持久化

- `AppearanceWorkspace.tsx` 独立页
- Main 进程 `BrowserWindow.backgroundColor` 随 `--bg` 同步

---

## 8. Follow System 实现要点

```typescript
import { nativeTheme } from "electron";

nativeTheme.themeSource = preferences.appearance === "system"
  ? "system"
  : preferences.appearance === "light" ? "light" : "dark";

nativeTheme.on("updated", () => {
  mainWindow?.webContents.send("theme:system-changed", nativeTheme.shouldUseDarkColors);
});
```

| System 状态 | 默认 Brand Theme |
|-------------|-----------------|
| Dark | Graphite Dark |
| Light | Arctic Light |

用户可手动覆盖 Brand Theme（例如系统 Dark 但选 Arctic — 一般不推荐，但架构应支持）。

---

## 9. 与 Visual System 2.0 的关系

| 版本 | 解决什么 |
|------|----------|
| Visual System 2.0 | Graphite Dark 的**颜色方向**（石墨灰 + 交互点缀） |
| Theme System 1.0 | **工程化** + **Arctic 独立设计** + **Midnight 变体** |

- **Graphite Dark** ≈ Visual System 2.0 Token 快照
- **Arctic Light** = 重新设计，不是 `.theme-light` 反色
- **Midnight** = Graphite 的 deeper variant

---

## 10. 相关文档

- [design-philosophy.md](./design-philosophy.md) — 设计宪法与 Dark/Light 决策对照表
- [implementation-roadmap.md](./implementation-roadmap.md) — Phase 1 Arctic 验收标准
