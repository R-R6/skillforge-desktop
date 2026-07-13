import { useState } from "react";
import { FolderOpen, HardDrive, Sparkles } from "lucide-react";
import type { OnboardingState } from "../shared/types";

interface OnboardingDialogProps {
  state: OnboardingState;
  onComplete: (dataDirectory?: string | null) => Promise<void>;
}

export default function OnboardingDialog({ state, onComplete }: OnboardingDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [pendingRestartPath, setPendingRestartPath] = useState<string | null>(null);

  async function handleUseDefault() {
    setBusy(true);
    setError(null);
    try {
      await onComplete(null);
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "初始化失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleChooseDirectory() {
    setBusy(true);
    setError(null);
    try {
      const directory = await window.skillforge.chooseDataDirectory();
      if (!directory) {
        setBusy(false);
        return;
      }
      setSelectedDirectory(directory);
      const result = await window.skillforge.requestDataDirectoryChange(directory);
      if (result.requiresRestart) {
        setPendingRestartPath(result.targetPath);
      } else {
        await onComplete(directory);
      }
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "目录选择失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestart() {
    await window.skillforge.restartApp();
  }

  if (pendingRestartPath) {
    return (
      <div className="onboarding-overlay" role="presentation">
        <div className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-restart-title">
          <header className="onboarding-header">
            <div>
              <span className="eyebrow"><HardDrive size={13} /> 数据目录已更新</span>
              <h2 id="onboarding-restart-title">需要重启应用</h2>
            </div>
          </header>
          <div className="onboarding-body">
            <p>SkillForge 的数据将保存到以下目录。请重启后继续使用。</p>
            <code className="storage-path-code">{pendingRestartPath}</code>
          </div>
          <footer className="onboarding-actions">
            <button type="button" className="deploy-button" onClick={handleRestart}>立即重启</button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-overlay" role="presentation">
      <div className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> 欢迎使用</span>
            <h2 id="onboarding-title">选择 SkillForge 数据保存位置</h2>
          </div>
        </header>
        <div className="onboarding-body">
          <p>
            SkillForge 会在本地保存数据库、GitHub 克隆和主题配置。
            默认位置通常在系统盘用户目录；你可以在开始工作前选择其他磁盘。
          </p>
          <div className="onboarding-path-card">
            <strong>默认数据目录</strong>
            <code>{selectedDirectory ?? state.defaultUserDataPath}</code>
            <small>安装路径与数据目录相互独立；更改数据目录不会影响程序安装位置。</small>
          </div>
          <ul className="onboarding-points">
            <li>GitHub 导入会浅克隆仓库到数据目录下的 <code>skill-sources</code></li>
            <li>你可以在设置页查看占用空间、打开文件夹、清理未使用的克隆</li>
            <li>引导配置仅占用极小的本地配置文件（用于记住你的选择）</li>
          </ul>
          {error && <div className="skill-editor-error">{error}</div>}
        </div>
        <footer className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={handleChooseDirectory} disabled={busy}>
            <FolderOpen size={15} /> 选择其他目录
          </button>
          <button type="button" className="deploy-button" onClick={handleUseDefault} disabled={busy}>
            使用默认位置
          </button>
        </footer>
      </div>
    </div>
  );
}
