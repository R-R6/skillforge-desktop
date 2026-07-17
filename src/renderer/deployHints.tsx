/* eslint-disable react-refresh/only-export-components */
import { Info } from "lucide-react";
import type { AgentTool } from "../shared/types";

export const PROJECT_SKILL_PATHS: Record<AgentTool, string> = {
  codex: ".codex/skills",
  cursor: ".cursor/skills",
  "claude-code": ".claude/skills",
  hermes: ".agents/skills",
};

export function buildDeploySuccessNotice(fileCount: number, projectName: string, tools: AgentTool[]) {
  const codexNote = tools.includes("codex")
    ? " Codex 请先在该项目下新开一个会话；若斜杠菜单未更新，再完全退出并重启 Codex。"
    : "";
  const cursorNote = tools.includes("cursor")
    ? " Cursor 新开 Agent 对话通常即可识别。"
    : "";
  const claudeNote = tools.includes("claude-code")
    ? " Claude Code 桌面端需重启后斜杠命令才会出现；终端新开会话即可。"
    : "";
  const hermesNote = tools.includes("hermes")
    ? " Hermes Desktop 需完全退出并重启；Hermes 终端新开会话或执行 /reload-skills 即可。"
    : "";
  return `已部署 ${fileCount} 个文件到 ${projectName}（项目级）。部署后可在该项目中用 /skill-name 调用。${codexNote}${cursorNote}${claudeNote}${hermesNote}`;
}

interface DeployScopeHintsProps {
  selectedTools?: AgentTool[];
}

export function DeployScopeHints({ selectedTools = [] }: DeployScopeHintsProps) {
  const showCodexRefresh = selectedTools.includes("codex");
  const showCursorRefresh = selectedTools.includes("cursor");
  const showClaudeRestart = selectedTools.includes("claude-code");
  const showHermesRestart = selectedTools.includes("hermes");

  return (
    <div className="deploy-hints" role="note" aria-label="部署说明">
      <Info size={14} aria-hidden="true" />
      <div className="deploy-hints-copy">
        <p>
          <strong>项目级部署</strong>
          {" "}
          Skill 会写入当前项目目录（如
          {" "}
          <code>.codex/skills</code>
          、
          <code>.cursor/skills</code>
          ），不会安装到
          {" "}
          <code>~/.codex</code>
          、
          <code>~/.cursor</code>
          等全局目录。仅在该项目中可用
          {" "}
          <code>/skill-name</code>
          调用。
        </p>
        {showCodexRefresh && (
          <p className="deploy-hint-emphasis">
            已选择 Codex：部署后请先在该项目下新开一个会话试用斜杠命令；若菜单仍未出现，请完全退出并重启 Codex 应用。终端 CLI 通常新开会话即可。
          </p>
        )}
        {showCursorRefresh && (
          <p className="deploy-hint-emphasis">
            已选择 Cursor：新开 Agent 对话后，斜杠菜单通常会立即识别项目内新部署的 Skill。
          </p>
        )}
        {showClaudeRestart && (
          <p className="deploy-hint-emphasis">
            已选择 Claude Code：桌面端部署后需重启 Claude Code 应用，斜杠命令才会出现；终端通常新开会话即可，无需重启整个应用。
          </p>
        )}
        {showHermesRestart && (
          <p className="deploy-hint-emphasis">
            已选择 Hermes：会同步到终端 <code>HERMES_HOME/config.yaml</code> 与 Hermes Desktop 独立数据目录。终端用 <code>/code-reviewer</code>，桌面端用 <code>/skill code-reviewer</code>。Hermes Desktop 部署后需完全退出并重启；Hermes 终端新开会话或执行 <code>/reload-skills</code> 即可，无需重启应用。
          </p>
        )}
      </div>
    </div>
  );
}
