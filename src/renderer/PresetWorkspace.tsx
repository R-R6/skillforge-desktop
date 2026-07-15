import { useEffect, useState } from "react";
import { Check, Plus, Rocket, Trash2 } from "lucide-react";
import type { AgentTool, PresetSummary, ProjectSummary, SkillSummary } from "../shared/types";
import { buildDeploySuccessNotice, DeployScopeHints } from "./deployHints";

const toolOptions: Array<{ id: AgentTool; label: string }> = [
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "claude-code", label: "Claude Code" },
  { id: "hermes", label: "Hermes" },
];

export default function PresetWorkspace() {
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [tools, setTools] = useState<AgentTool[]>(["codex"]);
  const [targetProjectId, setTargetProjectId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const [nextPresets, nextSkills, nextProjects] = await Promise.all([
      window.skillforge.listPresets(),
      window.skillforge.listSkills(),
      window.skillforge.listProjects(),
    ]);
    setPresets(nextPresets);
    setSkills(nextSkills);
    setProjects(nextProjects);
    setSelectedPresetId((current) => current && nextPresets.some((preset) => preset.id === current) ? current : nextPresets[0]?.id ?? null);
    setTargetProjectId((current) => current || nextProjects[0]?.id || "");
    if (nextPresets.length === 0) {
      setSkillIds(nextSkills.map((skill) => skill.id));
    }
  }

  useEffect(() => {
    refresh().catch((error) => setNotice(error instanceof Error ? error.message : "预设数据读取失败"));
  }, []);

  useEffect(() => {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setName(preset.name);
    setDescription(preset.description);
    setSkillIds(preset.skillIds);
    setTools(preset.tools.length > 0 ? preset.tools : ["codex"]);
  }, [presets, selectedPresetId]);

  function startNewPreset() {
    setSelectedPresetId(null);
    setName("");
    setDescription("");
    setSkillIds(skills.map((skill) => skill.id));
    setTools(["codex"]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setNotice("请先填写预设名称");
      return;
    }
    const preset = selectedPresetId
      ? await window.skillforge.updatePreset({ presetId: selectedPresetId, name, description, skillIds, tools })
      : await window.skillforge.createPreset({ name, description, skillIds, tools });
    setPresets((current) => [preset, ...current.filter((item) => item.id !== preset.id)]);
    setSelectedPresetId(preset.id);
    setNotice(`预设“${preset.name}”已保存`);
  }

  async function handleDelete() {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    await window.skillforge.deletePreset(selectedPresetId);
    setPresets((current) => current.filter((item) => item.id !== selectedPresetId));
    startNewPreset();
    setNotice(`预设“${preset?.name ?? ""}”已删除`);
  }

  async function handleApply() {
    if (!selectedPresetId || !targetProjectId) {
      setNotice("请选择预设和目标项目");
      return;
    }
    const result = await window.skillforge.applyPreset({ presetId: selectedPresetId, projectId: targetProjectId });
    setNotice(buildDeploySuccessNotice(result.files.length, result.project.name, presets.find((item) => item.id === selectedPresetId)?.tools ?? tools));
  }

  function toggleSkill(id: string) {
    setSkillIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleTool(tool: AgentTool) {
    setTools((current) => current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]);
  }

  return (
    <section className="preset-workspace">
      <div className="section-toolbar project-toolbar">
        <div><h2>预设</h2><span>把常用 Skill 组合保存下来，一键部署到项目。</span></div>
        <button className="primary-button" onClick={startNewPreset}><Plus size={16} /> 新建预设</button>
      </div>
      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}
      <div className="preset-layout">
        <div className="preset-list panel-box">
          <div className="panel-title"><span>我的预设</span><b>{presets.length}</b></div>
          <div className="panel-list-scroll">
          {presets.length === 0 ? <div className="panel-empty">还没有预设。<br />可以从当前 Skill 库创建一个。</div> : presets.map((preset) => <button key={preset.id} className={selectedPresetId === preset.id ? "preset-item selected" : "preset-item"} onClick={() => setSelectedPresetId(preset.id)}><span className="preset-item-icon">✦</span><span><strong>{preset.name}</strong><small>{preset.skillIds.length} 个 Skill · {preset.tools.length} 个工具</small></span></button>)}
          </div>
        </div>
        <div className="preset-editor panel-box">
          <div className="preset-editor-head"><div><span className="eyebrow">预设编辑</span><h2>{selectedPresetId ? "编辑预设配置" : "创建新的预设"}</h2></div>{selectedPresetId && <button className="danger-button" onClick={handleDelete}><Trash2 size={14} /> 删除</button>}</div>
          <div className="preset-form-row"><label>名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：前端项目全家桶" /></label><label>说明<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个预设适合什么项目" /></label></div>
          <div className="workspace-block"><div className="workspace-block-heading"><strong>目标 Agent</strong><span>{tools.length} 个已选择</span></div><div className="preset-tools">{toolOptions.map((tool) => <button key={tool.id} className={tools.includes(tool.id) ? "tool-select selected" : "tool-select"} onClick={() => toggleTool(tool.id)}><span className="tool-check">{tools.includes(tool.id) && <Check size={12} />}</span><strong>{tool.label}</strong></button>)}</div><DeployScopeHints selectedTools={tools} /></div>
          <div className="workspace-block"><div className="workspace-block-heading"><strong>包含 Skill</strong><span>{skillIds.length} / {skills.length} 个已选择</span></div><div className="workspace-skill-list">{skills.map((skill) => <button key={skill.id} className={skillIds.includes(skill.id) ? "workspace-skill selected" : "workspace-skill"} onClick={() => toggleSkill(skill.id)}><span className="skill-check">{skillIds.includes(skill.id) && <Check size={12} />}</span><span><strong>{skill.name}</strong><small>{skill.description}</small></span></button>)}</div></div>
          <div className="preset-apply"><label>部署到项目<select value={targetProjectId} onChange={(event) => setTargetProjectId(event.target.value)}><option value="">选择项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><div className="preset-apply-actions">{selectedPresetId && <button className="outline-button" onClick={handleCreate}><Check size={15} /> 保存修改</button>}<button className="deploy-button" onClick={selectedPresetId ? handleApply : handleCreate}>{selectedPresetId ? <><Rocket size={15} /> 部署到项目</> : <><Check size={15} /> 保存预设</>}</button></div></div>
        </div>
      </div>
    </section>
  );
}
