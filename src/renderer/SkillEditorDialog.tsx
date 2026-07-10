import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { CreateSkillInput, SkillSummary } from "../shared/types";

interface SkillEditorDialogProps {
  skill: SkillSummary | null;
  onClose: () => void;
  onSave: (input: CreateSkillInput) => Promise<void>;
}

export default function SkillEditorDialog({ skill, onClose, onSave }: SkillEditorDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("自定义 Skill");
  const [platforms, setPlatforms] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(skill?.name ?? "");
    setDescription(skill?.description ?? "");
    setCategory(skill?.category ?? "自定义 Skill");
    setPlatforms(skill?.platforms.join(", ") ?? "");
    setContent(skill?.content ?? "# 新 Skill\n\n请在这里写下这个 Skill 的工作方式。\n");
    setError(null);
  }, [skill]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, description, category, platforms: platforms.split(/[,，]/), content });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Skill 保存失败");
    } finally {
      setSaving(false);
    }
  }

  return <div className="skill-editor-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}><form className="skill-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-editor-title" onSubmit={handleSubmit}><header className="skill-editor-header"><div><span className="eyebrow">SKILL EDITOR</span><h2 id="skill-editor-title">{skill ? "编辑 Skill" : "新建 Skill"}</h2></div><button type="button" className="prompt-close" onClick={onClose} disabled={saving} aria-label="关闭 Skill 编辑器"><X size={17} /></button></header><div className="skill-editor-form"><div className="skill-editor-row"><label>名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：前端架构师" autoFocus /></label><label>分类<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="例如：工程 / 前端" /></label></div><div className="skill-editor-row"><label>描述<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="一句话说明这个 Skill 的职责" /></label><label>目标工具<input value={platforms} onChange={(event) => setPlatforms(event.target.value)} placeholder="codex, cursor, claude-code" /></label></div><label>Skill 内容<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} spellCheck={false} placeholder="# Skill 名称\n\n描述 Agent 应该如何工作。" /></label>{error && <div className="skill-editor-error">{error}</div>}</div><footer className="skill-editor-actions"><button type="button" className="ghost-button" onClick={onClose} disabled={saving}>取消</button><button type="submit" className="deploy-button" disabled={saving}>{saving ? "保存中…" : <><Check size={15} /> 保存 Skill</>}</button></footer></form></div>;
}
