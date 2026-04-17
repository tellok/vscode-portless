## ADDED Requirements

### Requirement: 推断 portless alias 名称
扩展 SHALL 按以下优先级推断 alias 名称：
1. 工作区根目录 `package.json` 的 `name` 字段（去除 `@scope/` 前缀）
2. fallback：工作区根目录名（`path.basename(workspaceRoot)`）

#### Scenario: 从 package.json 读取名称
- **WHEN** 工作区根目录存在 `package.json` 且包含 `"name": "my-app"` 字段
- **THEN** 扩展 SHALL 使用 `my-app` 作为基础名称

#### Scenario: 去除 scoped package 前缀
- **WHEN** `package.json` 的 `name` 为 `"@myorg/my-app"`
- **THEN** 扩展 SHALL 使用 `my-app` 作为基础名称（去除 `@myorg/`）

#### Scenario: package.json 不存在时 fallback 到目录名
- **WHEN** 工作区根目录不存在 `package.json`
- **THEN** 扩展 SHALL 使用工作区根目录名称作为基础名称

### Requirement: git worktree 场景添加分支前缀
扩展 SHALL 检测当前工作区是否为 git worktree。若是，SHALL 在基础名称前添加分支名前缀（`<branch>_<baseName>`），其中：
- 分支名中的 `/` 替换为 `_`（如 `feat/auth` → `feat_auth`）
- 其他非字母数字、非连字符、非下划线字符替换为 `-`

#### Scenario: 普通 git 仓库不添加分支前缀
- **WHEN** 工作区是普通 git 仓库（非 worktree），`git rev-parse --git-dir` 等于 `--git-common-dir` 的结果
- **THEN** 扩展 SHALL 使用不带前缀的基础名称

#### Scenario: git worktree 添加分支前缀
- **WHEN** 工作区是 git worktree（`--git-dir` ≠ `--git-common-dir`），当前分支为 `feat/my-feature`
- **THEN** 扩展 SHALL 使用 `feat_my-feature_my-app` 作为 alias 名称

#### Scenario: 非 git 目录不添加前缀
- **WHEN** 工作区不是 git 仓库（`git rev-parse` 命令失败）
- **THEN** 扩展 SHALL 静默捕获异常，使用不带前缀的基础名称

### Requirement: 多端口工作区添加端口后缀
扩展 SHALL 检测过滤后的相关 tunnels 数量。当数量大于 1 时，SHALL 在 alias 名称后追加 `_<containerPort>` 后缀以区分不同端口。

#### Scenario: 单端口使用基础名称
- **WHEN** forwardPorts 中有且仅有 1 个端口有对应 tunnel
- **THEN** 扩展 SHALL 使用不带端口后缀的 alias 名称（如 `my-app`）

#### Scenario: 多端口各自追加端口后缀
- **WHEN** forwardPorts 中有 2 个端口（5173 和 3000）都有对应 tunnel
- **THEN** 扩展 SHALL 为两个端口分别使用 `my-app_5173` 和 `my-app_3000` 作为 alias 名称

### Requirement: 调用 portless alias 注册端口映射
扩展 SHALL 对每个相关 tunnel 执行 `<portlessBin> alias <aliasName> <localPort>` 命令，将稳定的 alias 名称映射到当前的本机转发端口。

#### Scenario: 成功注册 portless alias
- **WHEN** portless 二进制可用且守护进程正在运行
- **THEN** 扩展 SHALL 成功执行 `portless alias my-app 54321`，不显示任何通知

#### Scenario: portless 命令执行失败时提示用户
- **WHEN** `portless alias` 命令执行失败（非零退出码或抛出异常）
- **THEN** 扩展 SHALL 通过 `vscode.window.showWarningMessage` 显示错误信息，并继续处理其他端口（不中止整体流程）

### Requirement: 从 tunnel 对象提取本机端口号
扩展 SHALL 从 `TunnelDescription.localAddress` 字段提取本机端口号，支持字符串格式（`"localhost:54321"` → `54321`）和对象格式（`{ port: 54321 }` → `54321`）。

#### Scenario: 字符串格式的 localAddress
- **WHEN** `tunnel.localAddress` 为字符串 `"localhost:54321"`
- **THEN** 扩展 SHALL 提取端口号 `54321`

#### Scenario: 对象格式的 localAddress
- **WHEN** `tunnel.localAddress` 为对象 `{ host: "localhost", port: 54321 }`
- **THEN** 扩展 SHALL 提取端口号 `54321`
