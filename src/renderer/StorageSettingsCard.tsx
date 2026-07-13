import { useEffect, useState } from "react";
import { FolderOpen, HardDrive, RefreshCw, Trash2 } from "lucide-react";
import type { StorageSummary } from "../shared/types";
import { formatStorageSize } from "../shared/storage";

export default function StorageSettingsCard() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setSummary(await window.skillforge.getStorageSummary());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setNotice(error instanceof Error ? error.message : "存储信息读取失败"));
  }, []);

  async function handleOpenPath(targetPath: string) {
    try {
      await window.skillforge.openStoragePath(targetPath);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法打开目录");
    }
  }

  async function handleChooseDataDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const directory = await window.skillforge.chooseDataDirectory();
      if (!directory) return;
      const result = await window.skillforge.requestDataDirectoryChange(directory);
      if (result.requiresRestart) {
        setNotice(`数据目录已设置为 ${result.targetPath}，请重启应用后生效。`);
      } else {
        setNotice(`数据目录已更新：${result.targetPath}`);
        await refresh();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "数据目录设置失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleChooseSkillSourcesDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const directory = await window.skillforge.chooseSkillSourcesDirectory();
      if (!directory) return;
      setNotice(`GitHub 克隆目录已更新：${directory}`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "克隆目录设置失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSkillSourcesDirectory() {
    if (!summary) return;
    setBusy(true);
    setNotice(null);
    try {
      await window.skillforge.setSkillSourcesDirectory(summary.defaultSkillSourcesPath);
      setNotice("GitHub 克隆目录已恢复为默认位置");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "恢复默认目录失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleCleanUnusedClones() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await window.skillforge.cleanUnusedSkillSourceClones();
      setNotice(result.removed.length > 0
        ? `已清理 ${result.removed.length} 个未使用克隆，释放 ${formatStorageSize(result.freedBytes)}`
        : "没有可清理的未使用克隆");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "清理失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestart() {
    await window.skillforge.restartApp();
  }

  return (
    <div className="settings-card storage-settings-card">
      <div className="settings-card-heading">
        <HardDrive size={18} />
        <div>
          <strong>存储与数据目录</strong>
          <span>查看本地占用、打开文件夹、管理 GitHub 克隆位置</span>
        </div>
        <button type="button" className="ghost-button compact-button" onClick={refresh} disabled={loading || busy}>
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {notice && <p className="settings-inline-notice">{notice}</p>}

      {loading || !summary ? (
        <div className="panel-empty">读取存储信息中…</div>
      ) : (
        <>
          <div className="storage-summary-total">
            <span>当前数据总占用</span>
            <strong>{formatStorageSize(summary.totalBytes)}</strong>
          </div>

          <div className="storage-entry-list">
            {summary.entries.map((entry) => (
              <div key={entry.id} className="storage-entry-row">
                <div className="storage-entry-copy">
                  <strong>{entry.label}</strong>
                  <code>{entry.path}</code>
                </div>
                <span className="storage-entry-size">{formatStorageSize(entry.sizeBytes)}</span>
                <button type="button" className="ghost-button compact-button" onClick={() => handleOpenPath(entry.path)}>
                  <FolderOpen size={14} /> 打开
                </button>
              </div>
            ))}
          </div>

          <div className="storage-actions-grid">
            <button type="button" className="outline-button" onClick={handleChooseDataDirectory} disabled={busy}>
              更改数据目录
            </button>
            <button type="button" className="outline-button" onClick={handleChooseSkillSourcesDirectory} disabled={busy}>
              更改 GitHub 克隆目录
            </button>
            {summary.customSkillSourcesPath && (
              <button type="button" className="outline-button" onClick={handleResetSkillSourcesDirectory} disabled={busy}>
                恢复默认克隆目录
              </button>
            )}
            <button type="button" className="outline-button" onClick={handleCleanUnusedClones} disabled={busy}>
              <Trash2 size={14} /> 清理未使用克隆
            </button>
            <button type="button" className="ghost-button" onClick={handleRestart} disabled={busy}>
              重启应用
            </button>
          </div>

          {summary.clones.length > 0 && (
            <div className="storage-clone-list">
              <div className="storage-clone-heading">
                <strong>GitHub 克隆明细</strong>
                <span>{summary.clones.length} 个目录</span>
              </div>
              {summary.clones.map((clone) => (
                <div key={clone.id} className="storage-clone-row">
                  <div className="storage-clone-copy">
                    <strong>{clone.repositoryLabel}</strong>
                    <small>{clone.inUse ? `库内引用 ${clone.linkedSkillCount} 个 Skill` : "未使用，可安全清理"}</small>
                    <code>{clone.path}</code>
                  </div>
                  <span className="storage-entry-size">{formatStorageSize(clone.sizeBytes)}</span>
                  <button type="button" className="ghost-button compact-button" onClick={() => handleOpenPath(clone.path)}>
                    打开
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="settings-hint">
            数据目录与程序安装路径无关。更改数据目录后通常需要重启；已存在的 Skill 记录不会自动迁移。
            引导配置保存在 <code>{summary.bootstrapPath}</code>。
          </p>
        </>
      )}
    </div>
  );
}
