import { useEffect, useState } from "react";
import { Check, CircleHelp, FolderKanban, RefreshCw, ScanSearch } from "lucide-react";
import type { AgentTool, ExternalSkillRecord, ProjectScanResult, ProjectSummary } from "../shared/types";
import { DeployScopeHints } from "./deployHints";

interface SyncWorkspaceProps {
  onOpenProjects: () => void;
}

const tools: Array<{ id: AgentTool; label: string; entry: string; path: string; note?: string }> = [
  { id: "codex", label: "Codex", entry: "AGENTS.md", path: ".codex/skills（项目级）" },
  { id: "cursor", label: "Cursor", entry: ".cursor/rules/skillforge-skills.mdc", path: ".cursor/skills（项目级）" },
  { id: "claude-code", label: "Claude Code", entry: "CLAUDE.md", path: ".claude/skills（项目级）", note: "桌面端需重启" },
  { id: "hermes", label: "Hermes", entry: "HERMES.md", path: ".agents/skills（项目级）", note: "Desktop 需重启" },
];

export default function SyncWorkspace({ onOpenProjects }: SyncWorkspaceProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [scan, setScan] = useState<ProjectScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const nextProjects = await window.skillforge.listProjects();
    setProjects(nextProjects);
    setSelectedProject((current) => current && nextProjects.some((project) => project.id === current.id) ? nextProjects.find((project) => project.id === current.id) ?? null : nextProjects[0] ?? null);
    setLoading(false);
  }

  useEffect(() => { refresh().catch((error) => setNotice(error instanceof Error ? error.message : "项目读取失败")); }, []);

  async function scanProject() {
    if (!selectedProject) return;
    setScanning(true);
    try {
      const result = await window.skillforge.scanProject(selectedProject.id);
      setScan(result);
      setNotice(`扫描完成：发现 ${result.skills.length} 个 Skill 文件或工具入口`);
    } finally {
      setScanning(false);
    }
  }

  const managedTools = new Set(selectedProject?.tools ?? []);
  const discoveredSkills = scan?.skills.filter((item) => item.importable).length ?? 0;

  return <section className="sync-workspace">
    <div className="section-toolbar project-toolbar"><div><h2>部署状态</h2><span>查看项目内 Agent 入口与项目级 Skill 目录。不会写入 ~/.codex 等全局目录。</span></div><div className="project-actions action-bar"><button className="ghost-button" onClick={() => refresh()}><RefreshCw size={15} /> 刷新</button><span className="action-divider" aria-hidden="true" /><button className="primary-button" onClick={onOpenProjects}><FolderKanban size={15} /> 前往项目管理</button></div></div>
    {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}
    <div className="sync-layout">
      <div className="sync-project-panel"><div className="panel-title"><FolderKanban size={16} /> 选择项目 <span>{projects.length}</span></div>{loading ? <div className="panel-empty">读取项目中…</div> : projects.length === 0 ? <div className="sync-empty"><CircleHelp size={25} /><p>还没有项目。添加项目后才能查看部署状态。</p><button className="outline-button" onClick={onOpenProjects}>前往添加项目</button></div> : projects.map((project) => <button key={project.id} className={selectedProject?.id === project.id ? "project-item selected" : "project-item"} onClick={() => { setSelectedProject(project); setScan(null); }}><div className="project-item-icon">⌂</div><div className="project-item-copy"><strong>{project.name}</strong><span>{project.path}</span><small>{project.skillCount} 个已部署 Skill</small></div></button>)}</div>
      <div className="sync-detail-panel">{!selectedProject ? <div className="project-placeholder"><ScanSearch size={34} /><h3>选择一个项目查看部署状态</h3><p>扫描会读取项目中的 Skill 目录和 Agent 入口文件，不会修改项目内容。</p></div> : <><div className="sync-detail-heading"><div><span className="eyebrow">部署状态</span><h2>{selectedProject.name}</h2><code>{selectedProject.path}</code></div><button className="deploy-button" onClick={scanProject} disabled={scanning}><ScanSearch size={16} /> {scanning ? "扫描中…" : "扫描项目"}</button></div><div className="sync-tool-grid">{tools.map((tool) => { const active = managedTools.has(tool.id); return <div key={tool.id} className={active ? "sync-tool-card active" : "sync-tool-card"}><div className="sync-tool-icon">{active ? <Check size={16} /> : tool.label.slice(0, 1)}</div><div><strong>{tool.label}</strong><small>{active ? `已配置 · ${tool.entry}` : `可部署 · ${tool.entry}`}</small><code>{tool.path}</code>{tool.note && <em className="sync-tool-note">{tool.note}</em>}</div></div>; })}</div><DeployScopeHints selectedTools={selectedProject.tools} /><div className="sync-summary"><div><span>已部署 Skill</span><strong>{selectedProject.skillCount} 个</strong></div><div><span>扫描发现</span><strong>{scan ? `${scan.skills.length} 个文件` : "尚未扫描"}</strong></div><div><span>待收录到库</span><strong>{scan ? `${discoveredSkills} 个` : "—"}</strong></div></div>{scan && <div className="sync-scan-list"><div className="workspace-block-heading"><strong>最近一次扫描结果</strong><span>{new Date(scan.scannedAt).toLocaleString()}</span></div>{scan.skills.length === 0 ? <div className="scan-empty">未发现可识别的 Skill 文件或入口。</div> : scan.skills.slice(0, 8).map((item: ExternalSkillRecord) => <div key={item.id} className="sync-scan-item"><span className={item.managed ? "scan-source managed" : "scan-source"}>{item.managed ? "已在库中" : item.tool}</span><span>{item.name}</span><code>{item.relativePath}</code></div>)}</div>}</>}</div>
    </div>
  </section>;
}
