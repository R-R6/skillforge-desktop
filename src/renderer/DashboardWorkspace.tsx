import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, FolderKanban, Layers, Library, Plus, Tags } from "lucide-react";
import type { PresetSummary, ProjectSummary, SkillSummary } from "../shared/types";

interface DashboardWorkspaceProps {
  onOpenLibrary: () => void;
  onOpenProjects: () => void;
  onOpenPresets: () => void;
}

export default function DashboardWorkspace({ onOpenLibrary, onOpenProjects, onOpenPresets }: DashboardWorkspaceProps) {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.skillforge.listSkills(),
      window.skillforge.listProjects(),
      window.skillforge.listPresets(),
    ]).then(([nextSkills, nextProjects, nextPresets]) => {
      if (cancelled) return;
      setSkills(nextSkills);
      setProjects(nextProjects);
      setPresets(nextPresets);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const enabledSkills = skills.filter((skill) => skill.enabled !== false).length;
  const boundProjects = projects.filter((project) => project.skillCount > 0).length;
  const recentSkills = skills.slice(0, 5);

  return <section className="dashboard-workspace">
    <div className="dashboard-intro">
      <div><span className="eyebrow">工作区概览</span><h2>今天从管理你的 AI 能力开始</h2><p>SkillForge 负责保存 Skill，再将选中的能力部署到具体项目与编码 Agent。</p></div>
      <button className="primary-button" onClick={onOpenLibrary}><Library size={16} /> 浏览 Skill 库</button>
    </div>

    <div className="dashboard-metrics">
      <MetricCard icon={<Layers size={17} />} label="Skill 总数" value={loading ? "—" : skills.length} detail={`${enabledSkills} 个已启用`} />
      <MetricCard icon={<FolderKanban size={17} />} label="已管理项目" value={loading ? "—" : projects.length} detail={`${boundProjects} 个已部署 Skill`} />
      <MetricCard icon={<Tags size={17} />} label="预设" value={loading ? "—" : presets.length} detail="可一键部署到项目" />
      <MetricCard icon={<Bot size={17} />} label="支持 Agent" value="4" detail="Codex · Cursor · Claude · Hermes" />
    </div>

    <div className="dashboard-columns">
      <div className="dashboard-card">
        <div className="dashboard-card-heading"><div><span className="eyebrow">最近 Skill</span><h3>最近可用的 Skill</h3></div><button className="text-button" onClick={onOpenLibrary}>查看全部 <ArrowRight size={14} /></button></div>
        {loading ? <div className="dashboard-empty">正在读取本地库…</div> : recentSkills.length === 0 ? <div className="dashboard-empty">还没有 Skill，先从 Skill 库导入。</div> : <div className="recent-skill-list">{recentSkills.map((skill) => <button key={skill.id} className="recent-skill" onClick={onOpenLibrary}><span className="recent-skill-icon">✦</span><span className="recent-skill-copy"><strong>{skill.name}</strong><small>{skill.description}</small></span><span className={skill.enabled === false ? "skill-state muted" : "skill-state"}>{skill.enabled === false ? "已禁用" : "可部署"}</span></button>)}</div>}
      </div>
      <div className="dashboard-card">
        <div className="dashboard-card-heading"><div><span className="eyebrow">快速开始</span><h3>快速开始</h3></div><CheckCircle2 size={18} className="dashboard-check" /></div>
        <div className="quick-action-list"><button className="quick-action" onClick={onOpenProjects}><span><FolderKanban size={16} /><strong>添加一个项目</strong><small>登记本地项目目录，再选择 Agent 并部署 Skill</small></span><ArrowRight size={15} /></button><button className="quick-action" onClick={onOpenPresets}><span><Tags size={16} /><strong>创建预设</strong><small>保存一组常用的 Skill 组合</small></span><Plus size={15} /></button><button className="quick-action" onClick={onOpenLibrary}><span><Library size={16} /><strong>管理 Skill 库</strong><small>搜索、打标签、启用或禁用</small></span><ArrowRight size={15} /></button></div>
      </div>
    </div>
  </section>;
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <div className="dashboard-metric"><span className="dashboard-metric-icon">{icon}</span><span className="dashboard-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
