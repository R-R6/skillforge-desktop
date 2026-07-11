import { useState } from "react";
import { Download, Github, X } from "lucide-react";

interface GitImportDialogProps {
  onClose: () => void;
  onImport: (repositoryUrl: string) => Promise<void>;
}

export default function GitImportDialog({ onClose, onImport }: GitImportDialogProps) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setError(null);
    try {
      await onImport(repositoryUrl);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "GitHub Skill 导入失败");
    } finally {
      setImporting(false);
    }
  }

  return <div className="skill-editor-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !importing) onClose(); }}><form className="skill-editor-dialog git-import-dialog" role="dialog" aria-modal="true" aria-labelledby="git-import-title" onSubmit={handleSubmit}><header className="skill-editor-header"><div><span className="eyebrow"><Github size={13} /> GitHub 导入</span><h2 id="git-import-title">从 GitHub 导入 Skill</h2></div><button type="button" className="prompt-close" onClick={onClose} disabled={importing} aria-label="关闭 GitHub 导入"><X size={17} /></button></header><div className="skill-editor-form"><p className="git-import-help">输入公开 GitHub 仓库地址。应用会将仓库浅克隆到本地来源目录，再扫描其中的 `.md`、`.mdc` 或 `SKILL.md` 文件。</p><label>仓库地址<input value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" autoFocus /></label>{error && <div className="skill-editor-error">{error}</div>}</div><footer className="skill-editor-actions"><button type="button" className="ghost-button" onClick={onClose} disabled={importing}>取消</button><button type="submit" className="deploy-button" disabled={importing || !repositoryUrl.trim()}>{importing ? "克隆并导入中…" : <><Download size={15} /> 开始导入</>}</button></footer></form></div>;
}
