import { useState } from "react";
import { AlertTriangle, Download, FolderOpen, Github, X } from "lucide-react";
import type { GitImportPreview } from "../shared/types";
import { formatStorageSize } from "../shared/storage";

interface GitImportDialogProps {
  onClose: () => void;
  onImport: (repositoryUrl: string) => Promise<void>;
}

export default function GitImportDialog({ onClose, onImport }: GitImportDialogProps) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [preview, setPreview] = useState<GitImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathNotice, setPathNotice] = useState<string | null>(null);

  async function refreshPreview(url: string) {
    const nextPreview = await window.skillforge.previewGitImport(url);
    setPreview(nextPreview);
    return nextPreview;
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPathNotice(null);
    try {
      await refreshPreview(repositoryUrl);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "GitHub 地址解析失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await onImport(preview.normalizedUrl);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "GitHub Skill 导入失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeCloneDirectory() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const directory = await window.skillforge.chooseSkillSourcesDirectory();
      if (!directory) return;
      await refreshPreview(preview.normalizedUrl);
      setPathNotice(`GitHub 克隆目录已更新为 ${directory}，之后所有导入都会保存到这里。`);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "克隆目录更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenCloneDirectory() {
    if (!preview) return;
    setError(null);
    try {
      const targetPath = preview.alreadyCloned ? preview.cloneDirectory : preview.skillSourcesPath;
      await window.skillforge.openStoragePath(targetPath);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "无法打开目录");
    }
  }

  return (
    <div
      className="skill-editor-overlay"
      role="presentation"
      onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}
    >
      <form
        className="skill-editor-dialog git-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="git-import-title"
        onSubmit={preview ? (event) => { event.preventDefault(); void handleConfirmImport(); } : handlePreview}
      >
        <header className="skill-editor-header">
          <div>
            <span className="eyebrow"><Github size={13} /> GitHub 导入</span>
            <h2 id="git-import-title">{preview ? "确认克隆位置" : "从 GitHub 导入 Skill"}</h2>
          </div>
          <button type="button" className="prompt-close" onClick={onClose} disabled={busy} aria-label="关闭 GitHub 导入">
            <X size={17} />
          </button>
        </header>

        <div className="skill-editor-form">
          {!preview ? (
            <>
              <p className="git-import-help">
                输入公开 GitHub 仓库地址。确认后应用会将仓库浅克隆到本地数据目录，再扫描其中的 `.md`、`.mdc` 或 `SKILL.md` 文件。
              </p>
              <label>
                仓库地址
                <input
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository"
                  autoFocus
                />
              </label>
            </>
          ) : (
            <div className="git-import-preview">
              <div className="git-import-preview-row">
                <span>仓库</span>
                <strong>{preview.repositoryLabel}</strong>
              </div>
              <div className="git-import-preview-row">
                <span>克隆根目录</span>
                <code>{preview.skillSourcesPath}</code>
              </div>
              <div className="git-import-preview-row">
                <span>本次克隆目录</span>
                <code>{preview.cloneDirectory}</code>
              </div>
              <div className="git-import-preview-row">
                <span>扫描目录</span>
                <code>{preview.importDirectory}</code>
              </div>
              <div className="git-import-preview-actions">
                <button type="button" className="git-import-action-button" onClick={handleChangeCloneDirectory} disabled={busy}>
                  <FolderOpen size={14} /> 更改克隆目录
                </button>
                <button type="button" className="git-import-action-button" onClick={handleOpenCloneDirectory} disabled={busy}>
                  <FolderOpen size={14} /> 打开文件夹
                </button>
              </div>
              <div className="git-import-preview-note">
                <AlertTriangle size={14} />
                {preview.willClone
                  ? "将执行 git clone --depth 1，把仓库下载到上述目录。具体体积取决于仓库大小。"
                  : `目录已存在，将复用本地克隆（约 ${formatStorageSize(preview.existingSizeBytes)}），不会重复下载。`}
              </div>
              <p className="git-import-help">
                更改克隆目录会立即生效，并应用于之后所有 GitHub 导入。也可在「设置 → 存储与数据目录」中管理占用与清理。
              </p>
              {pathNotice && <div className="git-import-path-notice">{pathNotice}</div>}
            </div>
          )}
          {error && <div className="skill-editor-error">{error}</div>}
        </div>

        <footer className="skill-editor-actions">
          {preview ? (
            <>
              <button type="button" className="ghost-button" onClick={() => { setPreview(null); setError(null); setPathNotice(null); }} disabled={busy}>
                返回修改
              </button>
              <button type="submit" className="deploy-button" disabled={busy}>
                {busy ? "克隆并导入中…" : <><Download size={15} /> 确认导入</>}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>取消</button>
              <button type="submit" className="deploy-button" disabled={busy || !repositoryUrl.trim()}>
                {busy ? "解析中…" : "下一步"}
              </button>
            </>
          )}
        </footer>
      </form>
    </div>
  );
}
