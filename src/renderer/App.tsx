import { useEffect, useState, type ReactNode } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Library,
  Palette,
  Settings,
  Sparkles,
  Tags,
  Upload,
  Wrench,
} from "lucide-react";
import AppearanceWorkspace from "./AppearanceWorkspace";
import DashboardWorkspace from "./DashboardWorkspace";
import ProjectWorkspace from "./ProjectWorkspace";
import PresetWorkspace from "./PresetWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import SkillLibraryWorkspace from "./SkillLibraryWorkspace";
import SyncWorkspace from "./SyncWorkspace";
import type { SkillNavigationSnapshot } from "../shared/types";
import { getNavigationBreadcrumbLabel, NAV_ALL } from "../shared/skillNavigation";
import { handleSystemThemeChanged, loadAndApplyThemePreferences } from "./theme/theme-manager";

const agents = ["Codex", "Cursor", "Claude Code", "Hermes"];

const navTitles: Record<string, string> = {
  dashboard: "概览",
  "skill-library": "技能库",
  projects: "项目管理",
  presets: "Preset 预设",
  sync: "工具同步",
  appearance: "外观",
  settings: "设置",
};

/** 顶栏「导入 Skill」仅出现在以 Skill 库为核心的工作流页面 */
const SHOW_IMPORT_SKILL_NAV = new Set(["dashboard", "skill-library"]);

function App() {
  const [activeNav, setActiveNav] = useState("skill-library");
  const [libraryNavigationKey, setLibraryNavigationKey] = useState(NAV_ALL);
  const [libraryNavigation, setLibraryNavigation] = useState<SkillNavigationSnapshot | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [presetCount, setPresetCount] = useState(0);
  const [totalSkillCount, setTotalSkillCount] = useState(0);
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0);
  const [pendingProjectSkillIds, setPendingProjectSkillIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      window.skillforge.listProjects(),
      window.skillforge.listPresets(),
      window.skillforge.listSkillNavigation(),
    ]).then(([projects, presets, navigation]) => {
      setProjectCount(projects.length);
      setPresetCount(presets.length);
      setTotalSkillCount(navigation.totalCount);
    }).catch(() => {
      // The library remains usable if the auxiliary counters are unavailable.
    });
  }, [activeNav, libraryRefreshToken]);

  useEffect(() => {
    loadAndApplyThemePreferences().catch(() => undefined);
    const unsubscribe = window.skillforge.onSystemThemeChanged((systemDark) => {
      handleSystemThemeChanged(systemDark);
    });
    return unsubscribe;
  }, []);

  async function handleImportSkill() {
    const imported = await window.skillforge.importSkillFile();
    if (!imported) return;
    setActiveNav("skill-library");
    setLibraryRefreshToken((current) => current + 1);
  }

  function openSelectedSkillsInProjects(skillIds: string[]) {
    if (skillIds.length === 0) return;
    setPendingProjectSkillIds(skillIds);
    setActiveNav("projects");
  }

  const showMarketingSections = activeNav === "dashboard";
  const libraryBreadcrumb = activeNav === "skill-library" && libraryNavigationKey !== NAV_ALL
    ? getNavigationBreadcrumbLabel(libraryNavigationKey, libraryNavigation ?? undefined)
    : "";
  const libraryBreadcrumbParts = libraryBreadcrumb ? libraryBreadcrumb.split(" / ").filter(Boolean) : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span className="brand-mark-letter">SF</span></div>
          <div>
            <strong>SkillForge</strong>
            <span>Desktop</span>
          </div>
        </div>

        <div className="sidebar-label">工作台</div>
        <nav className="nav-list">
          <NavItem icon={<LayoutDashboard size={17} />} label="概览" active={activeNav === "dashboard"} onClick={() => setActiveNav("dashboard")} />
          <NavItem icon={<Library size={17} />} label="Skill 库" active={activeNav === "skill-library"} onClick={() => setActiveNav("skill-library")} />
          <NavItem icon={<FolderKanban size={17} />} label="项目管理" active={activeNav === "projects"} onClick={() => setActiveNav("projects")} />
          <NavItem icon={<Tags size={17} />} label="Preset 预设" active={activeNav === "presets"} onClick={() => setActiveNav("presets")} />
        </nav>

        <div className="sidebar-label sidebar-label-spaced">配置</div>
        <nav className="nav-list">
          <NavItem icon={<Wrench size={17} />} label="工具同步" active={activeNav === "sync"} onClick={() => setActiveNav("sync")} />
          <NavItem icon={<Palette size={17} />} label="外观" active={activeNav === "appearance"} onClick={() => setActiveNav("appearance")} />
          <NavItem icon={<Settings size={17} />} label="设置" active={activeNav === "settings"} onClick={() => setActiveNav("settings")} />
        </nav>

        <div className="sidebar-footer">
          <div className="sync-status"><span className="status-dot" /> 本地工作区已就绪</div>
          <div className="version">v0.1.0 · Electron</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              SkillForge Desktop
              <ChevronRight size={14} />
              {navTitles[activeNav] ?? "Skill 库"}
              {libraryBreadcrumbParts.map((part) => (
                <span key={part} style={{ display: "contents" }}>
                  <ChevronRight size={14} />
                  {part}
                </span>
              ))}
            </div>
            <h1>{navTitles[activeNav] ?? "Skill 库"}</h1>
          </div>
          {SHOW_IMPORT_SKILL_NAV.has(activeNav) && (
            <button className="primary-button" onClick={handleImportSkill}>
              <Upload size={17} /> 导入 Skill
            </button>
          )}
        </header>

        {showMarketingSections && (
          <>
            <section className="hero-strip">
              <div className="hero-copy">
                <div className="eyebrow"><Sparkles size={14} /> AI 编程能力工作台</div>
                <h2>把专业能力，装进每一个编码 Agent。</h2>
                <p>集中管理 Skill，再按项目同步到 Codex、Cursor、Claude Code 和 Hermes。</p>
              </div>
              <div className="agent-stack">
                {agents.map((agent) => <span key={agent} className="agent-pill"><Bot size={14} /> {agent}</span>)}
              </div>
            </section>

            <section className="stats-grid">
              <StatCard label="Skill 总数" value={totalSkillCount} detail="已载入本地库" icon={<Library size={18} />} />
              <StatCard label="支持工具" value="4" detail="Codex · Cursor · Claude · Hermes" icon={<Bot size={18} />} />
              <StatCard label="已管理项目" value={projectCount} detail="可绑定并部署 Skill" icon={<FolderKanban size={18} />} />
              <StatCard label="Preset 预设" value={presetCount} detail="可一键应用到项目" icon={<Tags size={18} />} />
              <StatCard label="同步状态" value="就绪" detail="SQLite 本地数据库" icon={<Check size={18} />} />
            </section>
          </>
        )}

        {activeNav === "dashboard" ? (
          <DashboardWorkspace
            onOpenLibrary={() => setActiveNav("skill-library")}
            onOpenProjects={() => setActiveNav("projects")}
            onOpenPresets={() => setActiveNav("presets")}
          />
        ) : activeNav === "projects" ? (
          <ProjectWorkspace initialSkillIds={pendingProjectSkillIds} />
        ) : activeNav === "presets" ? (
          <PresetWorkspace />
        ) : activeNav === "sync" ? (
          <SyncWorkspace onOpenProjects={() => setActiveNav("projects")} />
        ) : activeNav === "appearance" ? (
          <AppearanceWorkspace />
        ) : activeNav === "settings" ? (
          <SettingsWorkspace />
        ) : (
          <SkillLibraryWorkspace
            refreshToken={libraryRefreshToken}
            onNavigationChange={(navigationKey, snapshot) => {
              setLibraryNavigationKey(navigationKey);
              setLibraryNavigation(snapshot);
            }}
            onLibraryChanged={() => setLibraryRefreshToken((current) => current + 1)}
            onOpenProjects={openSelectedSkillsInProjects}
          />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-active-mark" />}</button>;
}

function StatCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-card-icon">{icon}</div><div className="stat-label">{label}</div><strong>{value}</strong><span>{detail}</span></div>;
}

export default App;
