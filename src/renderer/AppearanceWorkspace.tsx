import { useEffect, useState } from "react";
import { Check, Download, Monitor, Palette, Save, Trash2, Upload } from "lucide-react";
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  DEFAULT_THEME_PREFERENCES,
  THEME_PREVIEW_SWATCHES,
  THEME_SELECTION_OPTIONS,
  parseThemePreferences,
  type AccentId,
  type DensityId,
  type ThemePreferences,
  type ThemeSelection,
} from "../shared/theme";
import type { ThemePackSummary } from "../shared/themePack";
import { APPEARANCE_OPTION_HELP, APPEARANCE_SECTION_HELP } from "./appearance-help";
import { AppearanceTip } from "./components/AppearanceTip";
import { applyThemeToDocument, previewThemePack, saveThemePreferences } from "./theme/theme-manager";

function ThemePreviewMock({ selection }: { selection: ThemeSelection }) {
  if (selection === "system") {
    return (
      <div className="theme-preview-mock theme-preview-mock-system" aria-hidden="true">
        <div className="theme-preview-system-half theme-preview-system-dark" />
        <div className="theme-preview-system-half theme-preview-system-light" />
        <Monitor size={14} className="theme-preview-system-icon" />
      </div>
    );
  }

  const swatch = THEME_PREVIEW_SWATCHES[selection];
  return (
    <div className="theme-preview-mock" style={{ background: swatch.bg }} aria-hidden="true">
      <div className="theme-preview-sidebar" style={{ background: swatch.sidebar }} />
      <div className="theme-preview-main">
        <div
          className="theme-preview-card"
          style={{
            background: swatch.card,
            borderColor: selection === "arctic" ? "#e5eaf2" : "rgba(148,163,184,0.12)",
          }}
        />
        <div className="theme-preview-dots">
          <span style={{ background: swatch.accent }} />
          <span style={{ background: swatch.ai }} />
        </div>
      </div>
    </div>
  );
}

export default function AppearanceWorkspace() {
  const [preferences, setPreferences] = useState<ThemePreferences>(DEFAULT_THEME_PREFERENCES);
  const [themePacks, setThemePacks] = useState<ThemePackSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [packBusy, setPackBusy] = useState(false);

  async function refreshThemePacks() {
    try {
      const packs = await window.skillforge.listThemePacks();
      setThemePacks(packs);
    } catch {
      setThemePacks([]);
    }
  }

  useEffect(() => {
    window.skillforge.getSettings()
      .then((settings) => setPreferences(parseThemePreferences(settings)))
      .catch(() => setPreferences(DEFAULT_THEME_PREFERENCES));
    void refreshThemePacks();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveThemePreferences(preferences);
      applyThemeToDocument(preferences);
      setNotice("外观设置已保存");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function preview(next: ThemePreferences) {
    setPreferences(next);
    await previewThemePack(next);
  }

  async function selectThemePack(key: string) {
    const next = { ...preferences, activeThemePackId: key };
    setPreferences(next);
    await previewThemePack(next);
  }

  async function importThemePack() {
    setPackBusy(true);
    try {
      const imported = await window.skillforge.importThemePackFile();
      if (!imported) return;
      await refreshThemePacks();
      await selectThemePack(imported.key);
      setNotice(`已导入 Theme Pack：${imported.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败");
    } finally {
      setPackBusy(false);
    }
  }

  async function exportThemePack(key: string) {
    setPackBusy(true);
    try {
      const result = await window.skillforge.exportThemePackFile(key);
      if (result?.filePath) {
        setNotice(`Theme Pack 已导出至 ${result.filePath}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导出失败");
    } finally {
      setPackBusy(false);
    }
  }

  async function deleteThemePack(key: string) {
    setPackBusy(true);
    try {
      await window.skillforge.deleteThemePack(key);
      await refreshThemePacks();
      if (preferences.activeThemePackId === key) {
        await selectThemePack("");
      }
      setNotice("Theme Pack 已删除");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除失败");
    } finally {
      setPackBusy(false);
    }
  }

  const activePack = themePacks.find((pack) => pack.key === preferences.activeThemePackId);

  return (
    <section className="appearance-workspace">
      <div className="section-toolbar project-toolbar">
        <div>
          <h2>外观</h2>
          <span>管理 SkillForge 的主题、强调色、密度与动效偏好。</span>
        </div>
        <button
          className="primary-button"
          onClick={save}
          disabled={saving}
          data-tip={APPEARANCE_OPTION_HELP.saveAppearance}
          data-tip-position="bottom"
        >
          <Save size={16} /> {saving ? "保存中…" : "保存外观"}
        </button>
      </div>

      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}

      <div className="appearance-layout">
        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong>主题</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.theme} />
            </div>
            <span>Dark 与 Light 是两种人格，不是简单反色。</span>
          </div>
          <div className="appearance-theme-grid">
            {THEME_SELECTION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.themeSelection === option.id ? "appearance-theme-card selected" : "appearance-theme-card"}
                data-tip={option.help}
                data-tip-position="top"
                onClick={() => preview({ ...preferences, themeSelection: option.id as ThemeSelection })}
              >
                <ThemePreviewMock selection={option.id} />
                <span className="appearance-theme-card-copy">
                  <strong className="appearance-theme-card-title">
                    {option.label}
                    {option.id === "arctic" && <span className="appearance-theme-default-badge">默认</span>}
                  </strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong>强调色 Accent</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.accent} />
            </div>
            <span>只改变交互色，布局与层级保持不变。</span>
          </div>
          <div className="appearance-accent-grid">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.accent === option.id ? "appearance-accent-option selected" : "appearance-accent-option"}
                data-tip={option.help}
                data-tip-position="top"
                onClick={() => preview({ ...preferences, accent: option.id as AccentId })}
              >
                <span className="appearance-accent-swatch" style={{ background: option.swatch }} />
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong>密度 Density</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.density} />
            </div>
            <span>Comfortable 适合日常；Compact 适合小屏或高密度工作流。</span>
          </div>
          <div className="appearance-option-list">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.density === option.id ? "appearance-option selected" : "appearance-option"}
                data-tip={option.help}
                data-tip-position="top"
                onClick={() => preview({ ...preferences, density: option.id as DensityId })}
              >
                <input type="radio" readOnly checked={preferences.density === option.id} />
                <span className="appearance-option-copy">
                  <strong>{option.label}</strong>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong>Theme Pack</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.themePack} />
            </div>
            <span>导入 JSON 主题包，覆盖基础 Token；内置 Tokyo Night 与 Nord。</span>
          </div>
          <div className="appearance-pack-toolbar">
            <button
              type="button"
              className="ghost-button"
              data-tip={APPEARANCE_OPTION_HELP.importThemePack}
              data-tip-position="bottom"
              onClick={importThemePack}
              disabled={packBusy}
            >
              <Upload size={14} /> 导入 JSON
            </button>
            {activePack && (
              <button
                type="button"
                className="ghost-button"
                data-tip={APPEARANCE_OPTION_HELP.exportThemePack}
                data-tip-position="bottom"
                onClick={() => exportThemePack(activePack.key)}
                disabled={packBusy}
              >
                <Download size={14} /> 导出当前
              </button>
            )}
          </div>
          <div className="appearance-pack-list">
            <button
              type="button"
              className={!preferences.activeThemePackId ? "appearance-pack-item selected" : "appearance-pack-item"}
              data-tip={APPEARANCE_OPTION_HELP.themePackNone}
              data-tip-position="top"
              onClick={() => selectThemePack("")}
            >
              <span className="appearance-pack-item-copy">
                <strong>无覆盖</strong>
                <small>仅使用基础主题 Token</small>
              </span>
            </button>
            {themePacks.map((pack) => (
              <div
                key={pack.key}
                className={preferences.activeThemePackId === pack.key ? "appearance-pack-item selected" : "appearance-pack-item"}
              >
                <button
                  type="button"
                  className="appearance-pack-item-main"
                  data-tip={pack.description ? `${pack.name}：${pack.description}` : `${pack.name}：覆盖基础主题的颜色 Token。`}
                  data-tip-position="top"
                  onClick={() => selectThemePack(pack.key)}
                >
                  <span className="appearance-pack-item-copy">
                    <strong>{pack.name}</strong>
                    <small>
                      {pack.source === "builtin" ? "内置" : "用户导入"}
                      {pack.description ? ` · ${pack.description}` : ""}
                    </small>
                  </span>
                </button>
                <div className="appearance-pack-item-actions">
                  <button
                    type="button"
                    className="icon-button"
                    data-tip={APPEARANCE_OPTION_HELP.exportPackItem}
                    data-tip-position="top"
                    onClick={() => exportThemePack(pack.key)}
                    disabled={packBusy}
                  >
                    <Download size={14} />
                  </button>
                  {!pack.readonly && (
                    <button
                      type="button"
                      className="icon-button danger"
                      data-tip={APPEARANCE_OPTION_HELP.deletePackItem}
                      data-tip-position="top"
                      onClick={() => deleteThemePack(pack.key)}
                      disabled={packBusy}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong>动效 Motion</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.motion} />
            </div>
            <span>降低动态效果可提升长时间使用的舒适度。</span>
          </div>
          <label
            className="appearance-toggle-row"
            data-tip={APPEARANCE_OPTION_HELP.enableAnimation}
            data-tip-position="top"
          >
            <span>
              <strong>启用动画</strong>
              <small>Hover、选中与环境光呼吸效果</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.enableAnimation}
              onChange={(event) => preview({ ...preferences, enableAnimation: event.target.checked })}
            />
          </label>
          <label
            className="appearance-toggle-row"
            data-tip={APPEARANCE_OPTION_HELP.reduceMotion}
            data-tip-position="top"
          >
            <span>
              <strong>降低动态效果</strong>
              <small>优先于系统「减少动态效果」设置</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.motion === "reduced"}
              onChange={(event) => preview({
                ...preferences,
                motion: event.target.checked ? "reduced" : "default",
              })}
            />
          </label>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <div className="appearance-section-title-row">
              <strong><Palette size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />预览</strong>
              <AppearanceTip text={APPEARANCE_SECTION_HELP.preview} />
            </div>
            <span>当前 Token 下的按钮与 AI 语义色。</span>
          </div>
          <div className="appearance-preview-strip">
            <span className="appearance-preview-chip" data-tip={APPEARANCE_OPTION_HELP.previewSurface} data-tip-position="top">表面色</span>
            <span className="appearance-preview-chip accent" data-tip={APPEARANCE_OPTION_HELP.previewPrimary} data-tip-position="top">主按钮</span>
            <span className="appearance-preview-chip ai" data-tip={APPEARANCE_OPTION_HELP.previewAi} data-tip-position="top">AI 运行态</span>
          </div>
        </section>
      </div>
    </section>
  );
}
