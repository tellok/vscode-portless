## Why

在 devcontainer 环境中，VS Code 将容器端口转发到本机随机端口（每次重连都会变化），导致无法直接使用 `portless run` 建立稳定的 `.localhost` URL。当前唯一选项 `portless alias <name> <port>` 需要用户手动获取转发后的本机端口，极为繁琐。此扩展在 VS Code UI 侧自动监听端口转发事件，免去手动操作，使 portless 在 devcontainer 场景无缝可用。

## What Changes

- **新增** VS Code 扩展 `vscode-portless`，运行于 UI 侧（`extensionKind: ["ui"]`）
- **新增** 监听 `vscode.workspace.onDidChangeTunnels`（proposed API），当 devcontainer 端口转发变化时自动触发
- **新增** 从 `devcontainer.json` 的 `forwardPorts` 字段读取已声明端口，仅管理这些端口（避免干扰其他转发端口）
- **新增** 名称推断逻辑：从工作区 `package.json` 的 `name` 字段提取基础名称，git worktree 场景下自动添加分支前缀
- **新增** 调用本机 `portless alias <name> <localPort>` 完成注册，优先使用系统全局安装的 `portless` 二进制
- **新增** 多端口场景自动追加 `_<containerPort>` 后缀区分不同路由
- **新增** 多语言支持（英文 + 简体中文），参考 vscode-paste-s3 方案（`package.nls.json` + `l10n/`）
- **新增** 基于 Changeset + GitHub Actions 的发布流（不发布 Marketplace，仅分发 `.vsix` + GitHub Release）

## Capabilities

### New Capabilities

- `tunnel-listener`: 监听 VS Code 转发端口变化事件，从 devcontainer.json 读取声明端口，过滤出相关 tunnel
- `portless-alias-registrar`: 推断 portless alias 名称（package.json + git worktree 分支），调用 `portless alias` 二进制执行注册
- `portless-bin-resolver`: 解析本机可用的 portless 二进制路径（优先 global，fallback 扩展内置）
- `i18n`: VS Code 扩展多语言支持（package.nls.json + l10n/ bundle），支持英文和简体中文
- `release-pipeline`: Changeset 版本管理 + GitHub Actions CI/CD，仅生成 `.vsix` 和 GitHub Release

### Modified Capabilities

## Impact

- **新增文件**：`src/extension.ts`（主逻辑），`package.json`（扩展清单），`vite.config.mts`（构建），`tsconfig.json`，`eslint.config.mjs`，`.vscodeignore`
- **新增多语言文件**：`package.nls.json`，`package.nls.zh-cn.json`，`l10n/bundle.l10n.json`，`l10n/bundle.l10n.zh-cn.json`
- **新增 CI/CD**：`.github/workflows/ci.yml`，`.github/workflows/changeset-version.yml`，`.github/workflows/changeset-publish.yml`，`.changeset/config.json`
- **依赖**：`typescript`、`vite`、`@vscode/vsce`、`@changesets/cli`、`@types/vscode`（devDependencies 仅）；运行时零依赖
- **VS Code 版本要求**：≥ 1.97.0（proposed tunnels API 需要）
- **分发限制**：因使用 `enabledApiProposals: ["tunnels"]`，不能发布到 VS Code Marketplace，通过 GitHub Release 分发 `.vsix`
