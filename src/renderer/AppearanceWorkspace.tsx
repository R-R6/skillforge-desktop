import { useEffect, useState } from "react";
import { Check, Monitor, Palette, Save } from "lucide-react";
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
import { applyThemeToDocument, saveThemePreferences } from "./theme/theme-manager";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.skillforge.getSettings()
      .then((settings) => setPreferences(parseThemePreferences(settings)))
      .catch(() => setPreferences(DEFAULT_THEME_PREFERENCES));
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
    applyThemeToDocument(next);
  }

  return (
    <section className="appearance-workspace">
      <div className="section-toolbar project-toolbar">
        <div>
          <h2>外观</h2>
          <span>管理 SkillForge 的主题、强调色、密度与动效偏好。</span>
        </div>
        <button className="primary-button" onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? "保存中…" : "保存外观"}
        </button>
      </div>

      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}

      <div className="appearance-layout">
        <section className="appearance-section">
          <div className="appearance-section-header">
            <strong>主题</strong>
            <span>Dark 与 Light 是两种人格，不是简单反色。</span>
          </div>
          <div className="appearance-theme-grid">
            {THEME_SELECTION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.themeSelection === option.id ? "appearance-theme-card selected" : "appearance-theme-card"}
                onClick={() => preview({ ...preferences, themeSelection: option.id as ThemeSelection })}
              >
                <ThemePreviewMock selection={option.id} />
                <span className="appearance-theme-card-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-header">
            <strong>强调色 Accent</strong>
            <span>只改变交互色，布局与层级保持不变。</span>
          </div>
          <div className="appearance-accent-grid">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.accent === option.id ? "appearance-accent-option selected" : "appearance-accent-option"}
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
            <strong>密度 Density</strong>
            <span>Comfortable 适合日常；Compact 适合小屏或高密度工作流。</span>
          </div>
          <div className="appearance-option-list">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={preferences.density === option.id ? "appearance-option selected" : "appearance-option"}
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
            <strong>动效 Motion</strong>
            <span>降低动态效果可提升长时间使用的舒适度。</span>
          </div>
          <label className="appearance-toggle-row">
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
          <label className="appearance-toggle-row">
            <span>
              <strong>降低动态效果</strong>
              <small>优先于系统 prefers-reduced-motion</small>
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
            <strong><Palette size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />预览</strong>
            <span>当前 Token 下的按钮与 AI 语义色。</span>
          </div>
          <div className="appearance-preview-strip">
            <span className="appearance-preview-chip">Surface</span>
            <span className="appearance-preview-chip accent">Primary</span>
            <span className="appearance-preview-chip ai">AI Running</span>
          </div>
        </section>
      </div>
    </section>
  );
}
