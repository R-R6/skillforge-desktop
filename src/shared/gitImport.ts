import crypto from "node:crypto";
import path from "node:path";

export interface GitImportPlan {
  normalizedUrl: string;
  owner: string;
  repository: string;
  cloneUrl: string;
  branch?: string;
  subPath: string[];
  sourceId: string;
}

export function parseGitHubImportUrl(repositoryUrl: string): GitImportPlan {
  const normalizedUrl = repositoryUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error("请输入有效的 GitHub HTTPS 仓库地址");
  }
  if (
    parsedUrl.protocol !== "https:"
    || !["github.com", "www.github.com"].includes(parsedUrl.hostname.toLowerCase())
    || parsedUrl.username
    || parsedUrl.password
  ) {
    throw new Error("目前只支持不带账号信息的 GitHub HTTPS 地址");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments.length < 2) throw new Error("GitHub 地址需要包含 owner 和仓库名");

  const owner = segments[0];
  const repository = segments[1].replace(/\.git$/i, "");
  let cloneUrl = normalizedUrl;
  let branch: string | undefined;
  let subPath: string[] = [];

  if (segments.length > 2) {
    if (segments[2].toLowerCase() !== "tree" || !segments[3]) {
      throw new Error("GitHub 地址只支持仓库根目录或 /tree/分支/子目录格式");
    }
    branch = segments[3];
    subPath = segments.slice(4);
    cloneUrl = `https://github.com/${owner}/${repository}.git`;
  }

  const sourceId = crypto.createHash("sha1").update(normalizedUrl).digest("hex");
  return {
    normalizedUrl,
    owner,
    repository,
    cloneUrl,
    branch,
    subPath,
    sourceId,
  };
}

export function getGitImportDirectory(sourceId: string, skillSourcesRoot: string): string {
  return path.join(skillSourcesRoot, sourceId);
}
