## ADDED Requirements

### Requirement: CI 在每次 PR 和主分支 push 时运行 lint 和 build
`.github/workflows/ci.yml` SHALL 在 `push` 到 `master`/`main` 以及 `pull_request` 时触发，执行以下步骤：pnpm install → lint → build（`pnpm run package`）。

#### Scenario: CI 在 PR 时自动触发
- **WHEN** 有新的 Pull Request 针对 master/main 分支
- **THEN** CI workflow SHALL 自动运行，lint 和 build 失败时阻止合并

#### Scenario: CI 无需 xvfb（不运行 vscode-test）
- **WHEN** CI 执行时
- **THEN** 不 SHALL 运行 `vscode-test` 相关测试（proposed tunnels API 无法在 headless 环境中测试）

### Requirement: changeset-version workflow 自动创建版本 PR
`.github/workflows/changeset-version.yml` SHALL 在 `.changeset/*.md` 文件变化时触发，自动运行 `changeset version` 更新 `package.json` 和 `CHANGELOG.md`，并创建标题为 `chore: version packages` 的 PR，将 PR 分配给触发者。

#### Scenario: 添加 changeset 文件后自动创建版本 PR
- **WHEN** `.changeset/` 目录下有新的 `.md` 文件被推送到 master
- **THEN** workflow SHALL 使用 `changesets/action` 创建包含版本更新的 PR

#### Scenario: PR 分配给触发者
- **WHEN** 版本 PR 被创建时
- **THEN** workflow SHALL 将 PR 分配给 `github.actor`

### Requirement: changeset-publish workflow 检测版本变化并发布
`.github/workflows/changeset-publish.yml` SHALL 在 `package.json` 变化时触发，比较当前 commit 与上一 commit 的版本号，版本有变化时执行：lint → build → `pnpm vsce package --no-dependencies` → 上传 .vsix artifact → 创建 GitHub Release（附带 .vsix 文件）。

#### Scenario: 版本变化时发布 GitHub Release
- **WHEN** `package.json` version 字段从 `0.1.0` 变更为 `0.1.1` 并推送到 master
- **THEN** workflow SHALL 创建名为 `v0.1.1` 的 GitHub Release，并将 `.vsix` 文件作为 Release asset 上传

#### Scenario: 版本无变化时跳过发布
- **WHEN** `package.json` 有变化但 version 字段未改变
- **THEN** workflow SHALL 跳过 publish job，不创建 Release

#### Scenario: 不发布到 VS Code Marketplace
- **WHEN** 版本发布流程执行时
- **THEN** workflow SHALL NOT 调用 `vsce publish` 或 `ovsx publish`（因 proposed API 限制）

### Requirement: .vsix 打包时使用 --no-dependencies 标志
`pnpm vsce package` 命令 SHALL 添加 `--no-dependencies` 标志，以使用 vite bundle 输出的单文件形式打包，避免将 node_modules 打入 .vsix。

#### Scenario: .vsix 体积最小化
- **WHEN** 执行 `pnpm vsce package --no-dependencies`
- **THEN** 生成的 .vsix SHALL 不包含 `node_modules/`，仅包含 `dist/`、`l10n/`、`package.nls*.json` 等声明文件

### Requirement: Changeset 配置使用 restricted access 和 master baseBranch
`.changeset/config.json` SHALL 配置 `"access": "restricted"`（私有发布）和 `"baseBranch": "master"`。

#### Scenario: changeset 配置正确
- **WHEN** 运行 `pnpm changeset version` 时
- **THEN** changeset SHALL 基于 master 分支计算版本变化
