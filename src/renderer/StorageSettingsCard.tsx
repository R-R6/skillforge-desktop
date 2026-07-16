import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRightLeft, FolderOpen, HardDrive, Power, RefreshCw, Trash2 } from "lucide-react";
import type { DataDirectoryMigrationResult, StorageSummary } from "../shared/storage";
import { formatStorageSize } from "../shared/storage";

export default function StorageSettingsCard() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRestart, setPendingRestart] = useState<DataDirectoryMigrationResult | null>(null);

  const awaitingRestart = Boolean(pendingRestart) || Boolean(summary?.pendingDataDirectoryRestart);
  const pendingTargetPath = pendingRestart?.targetPath ?? summary?.pendingDataDirectoryPath ?? null;

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

  async function handleMigrateDataDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const directory = await window.skillforge.chooseDataDirectory();
      if (!directory) return;
      const result = await window.skillforge.migrateDataDirectory(directory);
      if (!result) return;
      setPendingRestart(result);
      setNotice(`已复制 ${formatStorageSize(result.bytesCopied)} 到新目录。请立即重启应用以切换数据路径。`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "数据迁移失败");
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

  async function handleCleanPreviousDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await window.skillforge.cleanPreviousDataDirectory();
      if (!result) return;
      setNotice(`已删除旧目录，释放 ${formatStorageSize(result.freedBytes)}`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "清理旧目录失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissPreviousDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      setSummary(await window.skillforge.dismissPreviousDataDirectory());
      setNotice("已忽略旧目录清理提示");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestart() {
    try {
      await window.skillforge.restartApp();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "重启失败");
    }
  }

  return (
    <div className="settings-card storage-settings-card">
      <div className="settings-card-heading">
        <HardDrive size={18} />
        <div>
          <strong>存储与数据目录</strong>
          <span>迁出系统盘、查看占用，并管理 GitHub 克隆位置</span>
        </div>
        <button type="button" className="ghost-button compact-button" onClick={refresh} disabled={loading || busy}>
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {notice && (
        <p className={`settings-inline-notice${pendingRestart ? " settings-inline-notice--accent" : ""}`} role="status">
          {notice}
        </p>
      )}

      {loading || !summary ? (
        <div className="panel-empty">读取存储信息中…</div>
      ) : (
        <>
          <div className={`storage-location-banner${summary.onSystemDrive ? " storage-location-banner--system" : " storage-location-banner--external"}`}>
            <div className="storage-location-banner-copy">
              <div className="storage-location-banner-title">
                <span className="storage-drive-badge" aria-label={summary.onSystemDrive ? "位于系统盘" : "位于非系统盘"}>
                  {summary.driveLabel || "—"}
                  <em>{summary.onSystemDrive ? "系统盘" : "非系统盘"}</em>
                </span>
                <strong>当前数据目录</strong>
              </div>
              <code title={summary.userDataPath}>{summary.userDataPath}</code>
              <small>
                总占用 {formatStorageSize(summary.totalBytes)}
                {summary.customDataDirectory ? " · 已使用自定义目录" : " · 默认位置（通常在用户配置目录）"}
              </small>
            </div>
            <div className="storage-location-banner-actions">
              <button type="button" className="storage-banner-btn storage-banner-btn--primary" onClick={handleMigrateDataDirectory} disabled={busy || Boolean(pendingRestart)}>
                <ArrowRightLeft size={15} /> 迁移数据目录…
              </button>
              <button type="button" className="storage-banner-btn" onClick={handleRestart} disabled={busy}>
                <Power size={15} /> 重启应用
              </button>
              <button type="button" className="storage-banner-btn" onClick={() => handleOpenPath(summary.userDataPath)} disabled={busy}>
                <FolderOpen size={15} /> 打开
              </button>
            </div>
          </div>

          {summary.onSystemDrive && !pendingRestart && (
            <p className="storage-system-hint">
              <AlertTriangle size={14} aria-hidden="true" />
              数据目前在系统盘。迁移会复制下方列出的全部内容（数据库、GitHub 克隆、主题包、日志及其他数据），仅跳过浏览器缓存；完成后点旁边「重启应用」生效。
            </p>
          )}

          {pendingRestart && (
            <div className="storage-restart-panel" role="status">
              <div>
                <strong>迁移完成，需要重启</strong>
                <p>新目录：<code>{pendingRestart.targetPath}</code></p>
              </div>
              <button type="button" className="primary-button" onClick={handleRestart} disabled={busy}>
                立即重启
              </button>
            </div>
          )}

          {summary.previousDataDirectoryExists && summary.previousDataDirectory && !pendingRestart && (
            <div className="storage-cleanup-panel">
              <div className="storage-cleanup-copy">
                <strong>可清理旧数据目录</strong>
                <small>迁移前目录仍占用 {formatStorageSize(summary.previousDataDirectoryBytes)}</small>
                <code title={summary.previousDataDirectory}>{summary.previousDataDirectory}</code>
              </div>
              <div className="storage-cleanup-actions">
                <button type="button" className="danger-button" onClick={handleCleanPreviousDirectory} disabled={busy}>
                  <Trash2 size={14} /> 删除旧目录
                </button>
                <button type="button" className="ghost-button compact-button" onClick={handleDismissPreviousDirectory} disabled={busy}>
                  暂不清理
                </button>
              </div>
            </div>
          )}

          <div className="storage-summary-total">
            <span>当前数据总占用</span>
            <strong>{formatStorageSize(summary.totalBytes)}</strong>
          </div>

          <div className="storage-entry-list">
            {summary.entries.map((entry) => (
              <div key={entry.id} className="storage-entry-row">
                <div className="storage-entry-copy">
                  <strong>{entry.label}</strong>
                  <code title={entry.path}>{entry.path}</code>
                </div>
                <span className="storage-entry-size">{formatStorageSize(entry.sizeBytes)}</span>
                <button type="button" className="ghost-button compact-button" onClick={() => handleOpenPath(entry.path)}>
                  <FolderOpen size={14} /> 打开
                </button>
              </div>
            ))}
          </div>

          <div className="storage-actions-grid">
            <button type="button" className="outline-button" onClick={handleChooseSkillSourcesDirectory} disabled={busy || Boolean(pendingRestart)}>
              更改 GitHub 克隆目录
            </button>
            {summary.customSkillSourcesPath && (
              <button type="button" className="outline-button" onClick={handleResetSkillSourcesDirectory} disabled={busy || Boolean(pendingRestart)}>
                恢复默认克隆目录
              </button>
            )}
            <button type="button" className="outline-button" onClick={handleCleanUnusedClones} disabled={busy || Boolean(pendingRestart)}>
              <Trash2 size={14} /> 清理未使用克隆
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
                    <code title={clone.path}>{clone.path}</code>
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
            数据目录与程序安装路径无关。迁移复制整个数据目录（含列表中的全部条目），重启后使用新路径；旧目录可稍后清理。
            引导配置保存在 <code>{summary.bootstrapPath}</code>。
          </p>
        </>
      )}
    </div>
  );
}
