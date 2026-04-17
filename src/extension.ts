import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";

// 获取 portless 二进制路径：优先全局安装，fallback 到扩展内置
function getPortlessBin(context: vscode.ExtensionContext): string {
  try {
    return execSync("which portless", { encoding: "utf8" }).trim();
  } catch {
    return path.join(context.extensionPath, "node_modules", ".bin", "portless");
  }
}

// Strip JSONC 注释（单行 // 和块注释 /* */），避免引入额外依赖
function stripJsoncComments(content: string): string {
  // 移除块注释 /* ... */（跨行）
  let stripped = content.replace(/\/\*[\s\S]*?\*\//g, "");
  // 移除行注释 //...（不在字符串内的）
  stripped = stripped.replace(/\/\/[^\n]*/g, "");
  return stripped;
}

// 读取 devcontainer.json 并提取 forwardPorts 数组
function getDeclaredForwardPorts(workspaceRoot: string): number[] {
  const candidates = [
    path.join(workspaceRoot, ".devcontainer", "devcontainer.json"),
    path.join(workspaceRoot, "devcontainer.json"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      const stripped = stripJsoncComments(raw);
      const parsed = JSON.parse(stripped) as {
        forwardPorts?: Array<number | string>;
      };
      const ports: number[] = [];
      for (const entry of parsed.forwardPorts ?? []) {
        if (typeof entry === "number") {
          ports.push(entry);
        } else if (typeof entry === "string") {
          // 支持 "host:port" 格式，提取末尾端口号
          const match = /(\d+)$/.exec(entry);
          if (match) {
            ports.push(parseInt(match[1], 10));
          }
        }
      }
      return ports;
    } catch (err) {
      vscode.window.showWarningMessage(
        vscode.l10n.t("Failed to parse devcontainer.json: {0}", String(err))
      );
      return [];
    }
  }

  // devcontainer.json 不存在，静默返回空
  return [];
}

// 推断 portless alias 基础名称：package.json > git worktree branch + 基础名 > 目录名
function inferPortlessName(workspaceRoot: string): string {
  // 从 package.json 获取 name（去 @scope/ 前缀）
  let baseName: string;
  try {
    const pkgPath = path.join(workspaceRoot, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      name?: string;
    };
    const raw = pkg.name ?? "";
    // 去除 @scope/ 前缀
    baseName = raw.replace(/^@[^/]+\//, "");
    if (!baseName) {
      baseName = path.basename(workspaceRoot);
    }
  } catch {
    baseName = path.basename(workspaceRoot);
  }

  // 检测 git worktree
  try {
    const gitDir = execSync("git rev-parse --git-dir", {
      encoding: "utf8",
      cwd: workspaceRoot,
    }).trim();
    const gitCommonDir = execSync("git rev-parse --git-common-dir", {
      encoding: "utf8",
      cwd: workspaceRoot,
    }).trim();

    if (gitDir !== gitCommonDir) {
      // 是 worktree，加分支前缀
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        cwd: workspaceRoot,
      }).trim();
      // / → _，其他非法字符 → -
      const safeBranch = branch
        .replace(/\//g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "-");
      return `${safeBranch}_${baseName}`;
    }
  } catch {
    // 非 git 目录或命令失败，静默忽略
  }

  return baseName;
}

// 从 TunnelDescription 提取本机端口号
function extractLocalPort(tunnel: vscode.TunnelDescription): number {
  if (typeof tunnel.localAddress === "string") {
    // 格式："localhost:54321" 或 "127.0.0.1:54321"
    const match = /:(\d+)$/.exec(tunnel.localAddress);
    return match ? parseInt(match[1], 10) : 0;
  }
  return tunnel.localAddress.port;
}

// 处理 tunnels 列表：过滤声明端口，运行 portless alias
async function handleTunnels(
  tunnels: readonly vscode.TunnelDescription[],
  portlessBin: string,
  workspaceRoot: string
): Promise<void> {
  const declaredPorts = getDeclaredForwardPorts(workspaceRoot);
  if (declaredPorts.length === 0) {
    return;
  }

  // 过滤出声明端口对应的 tunnels（按容器端口匹配 remoteAddress.port）
  const relevant = tunnels.filter((t) =>
    declaredPorts.includes(t.remoteAddress.port)
  );

  if (relevant.length === 0) {
    return;
  }

  const baseName = inferPortlessName(workspaceRoot);
  const usePortSuffix = relevant.length > 1;

  for (const tunnel of relevant) {
    const localPort = extractLocalPort(tunnel);
    if (localPort === 0) {
      continue;
    }
    const aliasName = usePortSuffix
      ? `${baseName}_${tunnel.remoteAddress.port}`
      : baseName;

    await new Promise<void>((resolve) => {
      exec(`${portlessBin} alias ${aliasName} ${localPort}`, (error) => {
        if (error) {
          vscode.window.showWarningMessage(
            vscode.l10n.t(
              "portless alias failed for port {0}: {1}",
              String(tunnel.remoteAddress.port),
              error.message
            )
          );
        }
        // 无论成功失败，继续处理其他端口
        resolve();
      });
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";

  // 解析 portless 二进制路径（仅一次）
  const portlessBin = getPortlessBin(context);

  // 注册 onDidChangeTunnels 订阅（用于用户手动转发端口的后续变化）
  const disposable = vscode.workspace.onDidChangeTunnels(() => {
    void vscode.workspace.tunnels.then((tunnels) => {
      void handleTunnels(tunnels, portlessBin, workspaceRoot);
    });
  });
  context.subscriptions.push(disposable);

  // 主动读取一次当前 tunnels，处理激活前已存在的 devcontainer 环境端口
  // （onDidChangeTunnels 不会为 environment tunnels 触发，此路径是关键路径）
  void vscode.workspace.tunnels.then((tunnels) => {
    void handleTunnels(tunnels, portlessBin, workspaceRoot);
  });
}

export function deactivate(): void {
  // 不在 deactivate 时清理 portless alias（见 design.md Open Questions）
}
