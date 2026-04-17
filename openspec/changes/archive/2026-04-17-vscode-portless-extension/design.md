## Context

VS Code 在连接 devcontainer 时，会将容器内的端口（如 Vite dev server 的 5173）转发到宿主机的随机端口（如 54321）。这个随机端口每次重连都会变化，导致用户无法用固定 URL 访问服务。

`portless` 工具通过在宿主机维护一个反向代理守护进程，将 `<name>.localhost` 映射到 `localhost:<port>`，提供稳定 URL。其 `portless run <cmd>` 子命令适用于本地开发，但在 devcontainer 中 dev server 已经在容器内运行，无法被 wrap。唯一的替换方案是 `portless alias <name> <port>`，但需要用户每次手动查询并输入变化的本机转发端口。

本扩展运行于 VS Code UI 侧，利用 `vscode.proposed.tunnels` API 监听端口转发事件，自动完成 `portless alias` 的调用，彻底消除手动操作。

**约束**：
- `vscode.proposed.tunnels` 是 proposed API，扩展必须声明 `enabledApiProposals: ["tunnels"]`，这会导致无法发布到 VS Code Marketplace
- 扩展只能运行于 UI 侧（`extensionKind: ["ui"]`），不能在 remote 侧运行，因为 `portless` 二进制和守护进程只在宿主机上运行
- 为了与已运行的 portless 守护进程版本兼容，**优先**使用系统全局安装的 `portless`，而不是扩展自带版本
- **API 类型**：`vscode.workspace.tunnels` 返回 `Thenable<TunnelDescription[]>`（异步，必须 `await`）；`onDidChangeTunnels` 事件载荷为 `void`
- **开发环境**：proposed API 开发需要 VS Code Insiders；项目须包含 `vscode.proposed.tunnels.d.ts`（运行 `npx @vscode/dts dev` 下载）；终端用户需以 `--enable-proposed-api=<extension-id>` 参数启动 VS Code

## Goals / Non-Goals

**Goals:**
- 监听 VS Code devcontainer 端口转发变化，自动调用 `portless alias <name> <localPort>`
- 仅管理 `devcontainer.json` 中 `forwardPorts` 声明的端口（不干扰其他端口）
- 从 `package.json` name 字段 + git worktree 分支推断稳定的 alias 名称
- 支持多端口工作区（追加 `_<containerPort>` 后缀）
- 多语言 UI（英文 + 简体中文）
- 基于 Changeset + GitHub Actions 的发布流，输出 `.vsix` + GitHub Release

**Non-Goals:**
- 发布到 VS Code Marketplace 或 Open VSX（proposed API 限制）
- 管理未在 `devcontainer.json` 中声明的端口（避免干扰用户手动转发的端口）
- 监控 portless 守护进程健康状态或自动启动守护进程
- 提供 `portless run` 的包装功能（只做 alias 注册）
- 跨平台二进制分发（不打包 portless 二进制到扩展内）

## Decisions

### D1：仅在 UI 侧运行（`extensionKind: ["ui"]`）

**决策**：将 `extensionKind` 设为 `["ui"]`，强制在宿主机 VS Code 进程中运行。

**理由**：`portless` 守护进程和二进制只存在于宿主机，必须在 UI 侧执行。如果扩展在 remote 侧运行，`exec("portless alias ...")` 会在容器内找不到二进制。VS Code 的 `ui` kind 保证无论连接到多远的 remote，代码仍在本机执行。

**备选方案**：`["ui", "workspace"]` — 拒绝，因为在无 portless 的远端运行会静默失败，产生误导。

---

### D2：使用 `vscode.workspace.onDidChangeTunnels` proposed API

**决策**：使用 `enabledApiProposals: ["tunnels"]` 接入 `onDidChangeTunnels` 事件和 `workspace.tunnels` 属性。

**理由**：这是 VS Code 官方提供的唯一获取转发端口实时变化的方式。无 proposed API 的替代方案（如轮询 `localhost` 端口、解析 VS Code 日志文件）极不可靠且有延迟。

**代价**：扩展不能发布到 Marketplace，只能通过 `.vsix` 手动安装。这对本工具的目标用户（开发者）完全可接受。

**已验证的 API 行为（基于 VS Code 源码 `tunnel.ts` / `mainThreadTunnelService.ts`）**：

1. **devcontainer `forwardPorts` 可见**：devcontainer 端口通过 `TunnelModel.addEnvironmentTunnels()` → `AbstractTunnelService.setEnvironmentTunnel()` → `addTunnelToMap()` 被写入 `_tunnels` Map；`workspace.tunnels` 经由 `$getTunnels()` 遍历该 Map，因此 devcontainer 端口**确实出现**在 `workspace.tunnels` 返回值中。注意：`.d.ts` 注释"`does not include environment tunnels`"与实现不符，实际会包含。

2. **`onDidChangeTunnels` 不覆盖 environment tunnels**：`setEnvironmentTunnel()` 绕过了 `openTunnel()` 流程，不触发 `onTunnelOpened`，因此 `onDidChangeTunnels` **不会**在 devcontainer 端口初始建立时触发。扩展**必须**在 `activate()` 中主动 `await vscode.workspace.tunnels` 处理激活前已存在的端口；`onDidChangeTunnels` 仅用于监听用户在 Ports 面板手动添加/关闭端口的后续变化。

3. **正确 API 签名**：
   - `vscode.workspace.tunnels: Thenable<vscode.TunnelDescription[]>` — 异步，必须 `await`
   - `vscode.workspace.onDidChangeTunnels: vscode.Event<void>` — 事件载荷为 `void`
   - `vscode.TunnelDescription.remoteAddress: { port: number; host: string }`
   - `vscode.TunnelDescription.localAddress: { port: number; host: string } | string`
   - `vscode.Tunnel extends TunnelDescription`（添加 `onDidDispose` / `dispose()`）是 `openTunnel()` 的返回类型，不是 `workspace.tunnels` 的元素类型

4. **开发环境要求**：
   - 开发时需 VS Code Insiders（proposed API 仅在 Insiders 中可开发/调试）
   - 需运行 `npx @vscode/dts dev` 下载 `vscode.proposed.tunnels.d.ts` 到项目根目录，并在 `tsconfig.json` 的 `include` 中引用
   - 终端用户需以 `code --enable-proposed-api=<publisher.extensionName>` 启动 VS Code（stable 和 Insiders 均支持此 flag）

---

### D3：从 `devcontainer.json` 读取 `forwardPorts` 作为过滤白名单

**决策**：只处理 `devcontainer.json` 中 `forwardPorts` 声明的容器端口，忽略其他 tunnels。

**理由**：
1. VS Code 可能会转发用户手动添加的端口或其他扩展添加的端口，贸然为所有端口创建 portless alias 会污染路由表
2. `forwardPorts` 是 devcontainer 规范的明确意图，代表"这些端口在开发时需要访问"

**JSONC 解析**：`devcontainer.json` 是 JSONC 格式（支持注释），需去除注释后再 `JSON.parse`。用正则 strip `//` 行注释和 `/* */` 块注释（足够鲁棒，避免引入额外依赖）。

---

### D4：alias 名称推断策略

**决策**：按优先级尝试：
1. `package.json` 的 `name` 字段（去除 scoped package 前缀 `@scope/`）
2. 如果当前是 git worktree（`git rev-parse --git-dir` ≠ `--git-common-dir`），在名称前加 `<branch>_` 前缀，分支名 `/` 替换为 `_`，其他非法字符替换为 `-`
3. fallback：工作区目录名

**多端口处理**：当 `forwardPorts` 包含多个端口时，在基础名称后追加 `_<containerPort>`（如 `my-app_5173`、`my-app_3000`），避免路由冲突。

---

### D5：portless 二进制解析策略

**决策**：`getPortlessBin(context)` 按顺序：
1. `execSync("which portless", { encoding: "utf8" }).trim()` — 使用全局安装版本
2. fallback：`path.join(context.extensionPath, "node_modules", ".bin", "portless")` — 扩展内置版本

**理由**：portless 守护进程是全局单例，若使用与守护进程不同版本的 CLI，可能因协议差异导致命令失败。优先使用全局版本确保 CLI 与守护进程版本一致。

---

### D6：构建工具选用 Vite（CJS 输出）

**决策**：使用 `vite` + `vite.config.mts` 构建，输出 CommonJS 格式的 `dist/extension.js`。

**理由**：VS Code 扩展 `main` 字段指向的文件必须是 CJS（VS Code 用 `require()` 加载）。Vite 的配置已在 vscode-paste-s3 中验证可用，直接复用降低配置风险。

---

### D7：发布流使用 Changeset（不发布 Marketplace）

**决策**：复用 vscode-paste-s3 的三段式 workflow：
- `ci.yml`：PR/push 时跑 lint + build（无 `xvfb` test）
- `changeset-version.yml`：`.changeset/*.md` 变更时创建版本 PR
- `changeset-publish.yml`：版本变更时发布 GitHub Release + 上传 `.vsix` artifact

**去掉**的步骤：`pnpm vsce publish`（Marketplace）、`ovsx publish`（Open VSX）

---

### D8：多语言方案复用 vscode-paste-s3

**决策**：
- `package.json` 中的字符串用 `%key%` 引用，对应 `package.nls.json`（英文）和 `package.nls.zh-cn.json`（中文）
- 运行时字符串（通知、日志）使用 `vscode.l10n.t()` API，对应 `l10n/bundle.l10n.json` 和 `l10n/bundle.l10n.zh-cn.json`
- `package.json` 中声明 `"l10n": "./l10n"`

## Risks / Trade-offs

- **[Risk] proposed API 稳定性** → VS Code 升级可能改变 tunnels API 行为（字段名、事件语义）。缓解：锁定最低 VS Code 版本（1.97.0），在 CHANGELOG 中记录 API 变化。
- **[Risk] portless 守护进程未运行** → 用户未启动 portless 时，`portless alias` 命令会失败。缓解：捕获 `exec` 错误，通过 `vscode.window.showWarningMessage` 提示用户，不中止后续端口处理。
- **[Risk] devcontainer.json 解析失败** → JSONC strip 正则不能覆盖所有边缘情况（如字符串内含 `//`）。缓解：用 try-catch 包裹，解析失败时 fallback 到空数组（不处理任何端口），避免误操作。
- **[Risk] 多 VS Code 窗口并发写入 routes.json** → portless 通过文件锁保证原子写入（issue #1 Notes 已说明），扩展层无需额外处理。
- **[Trade-off] 不打包 portless 二进制** → 用户必须提前全局安装 portless。换取：扩展体积小、无版本冲突风险。

## Open Questions

- `vscode.workspace.tunnels` 在初次激活时是否会触发 `onDidChangeTunnels`，还是需要额外在 `activate()` 中主动读取一次当前 tunnels？→ 需要在集成测试中验证，若不触发，则 `activate()` 中需要主动调用一次处理逻辑。
- 扩展是否应该在 `deactivate()` 时调用 `portless alias --remove <name>` 清理路由？→ 暂定不清理（portless 守护进程重启后会丢失路由，重连时会重新注册；主动清理可能在用户只是关闭 VS Code 窗口时意外删除仍需要的路由）。
