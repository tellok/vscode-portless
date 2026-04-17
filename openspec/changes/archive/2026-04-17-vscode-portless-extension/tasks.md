## 1. 项目脚手架与构建配置

- [x] 1.1 初始化 `package.json`：配置 `extensionKind: ["ui"]`、`enabledApiProposals: ["tunnels"]`、`"l10n": "./l10n"`、`engines.vscode: "^1.97.0"`、scripts（compile/package/lint/changeset/changeset:version）及 devDependencies（typescript、vite、@vscode/vsce、@changesets/cli、@types/vscode、eslint、@typescript-eslint/*）
- [x] 1.2 创建 `tsconfig.json`：`module: "Node16"`、`target: "ES2022"`、`strict: true`、`rootDir: "src"`，`include` 中引用 `vscode.proposed.tunnels.d.ts`
- [x] 1.3 创建 `vite.config.mts`：构建 CJS 格式 `dist/extension.js`，externalize `vscode` 和所有 Node.js 内置模块，`target: "node20"`
- [x] 1.4 创建 `.vscodeignore`：排除 `src/`、`node_modules/`，保留 `dist/`、`l10n/`、`package.nls*.json`、`assets/`、`LICENSE`、`README*.md`、`CHANGELOG.md`
- [x] 1.5 创建 `eslint.config.mjs`：基于 `@typescript-eslint` 的 ESLint 配置
- [x] 1.6 创建 `.npmrc`：`shamefully-hoist=true`（与 vscode-paste-s3 一致）
- [x] 1.7 创建 `.gitignore`：排除 `dist/`、`node_modules/`、`*.vsix`、`.vscode-test`
- [x] 1.8 运行 `pnpm install` 验证依赖安装无报错
- [x] 1.9 运行 `npx @vscode/dts dev` 下载 `vscode.proposed.tunnels.d.ts` 到项目根目录（开发时 proposed API 类型定义来源；文件需加入版本控制但排除在 `.vscodeignore` 外以避免打包进 .vsix）

## 2. 多语言文件（i18n）

- [x] 2.1 创建 `package.nls.json`（英文）：包含 `displayName`、`description` 的翻译 key
- [x] 2.2 创建 `package.nls.zh-cn.json`（简体中文）：对应中文翻译
- [x] 2.3 创建 `l10n/bundle.l10n.json`（英文）：运行时字符串的英文版本（portless 未找到、命令失败、devcontainer.json 解析失败等提示）
- [x] 2.4 创建 `l10n/bundle.l10n.zh-cn.json`（简体中文）：对应中文翻译
- [x] 2.5 确认 `package.json` 中 `displayName` 和 `description` 使用 `%key%` 格式

## 3. 核心扩展逻辑

- [x] 3.1 创建 `src/extension.ts` 骨架：`activate(context)` 和 `deactivate()` 导出，引入 `vscode`、`fs`、`path`、`child_process`
- [x] 3.2 实现 `getPortlessBin(context: vscode.ExtensionContext): string`：`execSync("which portless")` 优先，fallback 到 `context.extensionPath/node_modules/.bin/portless`
- [x] 3.3 实现 `getDeclaredForwardPorts(workspaceRoot: string): number[]`：读取 `.devcontainer/devcontainer.json` 或 `devcontainer.json`，strip JSONC 注释后解析，提取 `forwardPorts` 数组（支持数字和 `host:port` 字符串格式），异常时返回 `[]` 并 `showWarningMessage`
- [x] 3.4 实现 `inferPortlessName(workspaceRoot: string): string`：从 `package.json` 读取 `name`（去 scope），git worktree 场景加分支前缀，fallback 目录名
- [x] 3.5 实现 `handleTunnels(tunnels: readonly vscode.TunnelDescription[], portlessBin: string, workspaceRoot: string): Promise<void>`：过滤 `declaredPorts`，推断名称，多端口加 `_<port>` 后缀，`exec` 调用 `portless alias`，失败时 `showWarningMessage`
- [x] 3.6 在 `activate()` 中：解析 `portlessBin`，注册 `vscode.workspace.onDidChangeTunnels` 订阅（事件触发时 `await vscode.workspace.tunnels`），并在注册后**主动调用一次** `await vscode.workspace.tunnels` 处理激活前已存在的 devcontainer 端口（`onDidChangeTunnels` 不会为 environment tunnels 触发）
- [x] 3.7 在 `vscode.l10n.t()` 包装所有用户可见的字符串，并同步更新 `l10n/bundle.l10n.json` 和 `bundle.l10n.zh-cn.json`
- [x] 3.8 运行 `pnpm run compile`（`tsc --noEmit` 或 vite build）验证无 TypeScript 错误
- [x] 3.9 运行 `pnpm run lint` 验证无 lint 错误

## 4. 发布流配置

- [x] 4.1 创建 `.changeset/config.json`：`"access": "restricted"`、`"baseBranch": "master"`
- [x] 4.2 创建 `.github/workflows/ci.yml`：push/PR 时触发，步骤：checkout → setup pnpm → install → lint → build（无 vscode-test）
- [x] 4.3 创建 `.github/workflows/changeset-version.yml`：监听 `.changeset/*.md` 变化，运行 `changeset version` 创建版本 PR，分配给 `github.actor`
- [x] 4.4 创建 `.github/workflows/changeset-publish.yml`：监听 `package.json` 变化，比较版本，版本变更时：lint → build → `pnpm vsce package --no-dependencies` → 上传 artifact → 创建 GitHub Release（不含 `vsce publish` / `ovsx publish`）
- [x] 4.5 运行 `pnpm vsce package --no-dependencies` 验证 .vsix 可成功生成
- [x] 4.6 检查 .vsix 内容：包含 `dist/extension.js`、`l10n/`、`package.nls*.json`，不包含 `src/` 和 `node_modules/`

## 5. 文档

- [x] 5.1 创建 `README.md`（英文）：功能说明、前置条件（全局安装 portless）、安装方法（手动安装 .vsix）、使用说明
- [x] 5.2 创建 `README.zh-CN.md`（简体中文）：对应中文文档
- [x] 5.3 创建 `CHANGELOG.md`：初始版本条目（0.1.0）
- [x] 5.4 确认 `LICENSE`（MIT）文件存在
