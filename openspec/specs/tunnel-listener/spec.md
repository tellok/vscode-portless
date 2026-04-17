## ADDED Requirements

### Requirement: 监听端口转发变化事件
扩展 SHALL 通过 `vscode.workspace.onDidChangeTunnels` 订阅 VS Code 端口转发变化事件，每次事件触发时读取当前所有 tunnels 并执行处理逻辑。

#### Scenario: 用户手动转发端口时触发处理
- **WHEN** 用户在 VS Code Ports 面板手动添加或关闭端口转发时
- **THEN** 扩展 SHALL 接收到 `onDidChangeTunnels` 事件，调用 `await vscode.workspace.tunnels` 读取最新 tunnels 列表并执行处理逻辑
- **NOTE**：`onDidChangeTunnels` 仅在用户/扩展通过 `openTunnel()` 触发的端口变化时才会触发（对应 `tunnelService.onTunnelOpened` / `onTunnelClosed`）；devcontainer `forwardPorts` 声明的环境端口通过 `setEnvironmentTunnel()` 写入（不经过 `openTunnel()`），因此**不会**触发此事件

#### Scenario: 初始激活时读取现有 tunnels（关键路径）
- **WHEN** 扩展 `activate()` 被调用时
- **THEN** 扩展 SHALL 主动执行 `const tunnels = await vscode.workspace.tunnels` 读取当前所有 tunnels（包括已存在的 devcontainer 环境端口），无需等待 `onDidChangeTunnels` 事件
- **NOTE**：这是处理 devcontainer `forwardPorts` 的**主要路径**。devcontainer 在扩展激活前已完成端口转发初始化，环境端口已存在于 `workspace.tunnels` 但不会触发 `onDidChangeTunnels`，必须主动读取

### Requirement: 按 devcontainer.json forwardPorts 过滤 tunnels
扩展 SHALL 从工作区根目录的 `.devcontainer/devcontainer.json` 或 `devcontainer.json` 中读取 `forwardPorts` 字段，仅处理其中声明的容器端口对应的 tunnels。

#### Scenario: 只处理声明端口
- **WHEN** tunnels 列表中包含容器端口 5173 和 8080，但 forwardPorts 只声明了 5173
- **THEN** 扩展 SHALL 只处理端口 5173 对应的 tunnel，忽略 8080

#### Scenario: devcontainer.json 不存在时不处理任何端口
- **WHEN** 工作区中不存在 devcontainer.json 文件
- **THEN** 扩展 SHALL 不处理任何 tunnel，静默退出

#### Scenario: devcontainer.json 解析失败时不处理任何端口
- **WHEN** devcontainer.json 文件存在但内容无法解析（格式错误）
- **THEN** 扩展 SHALL 捕获异常，不处理任何端口，并通过 `vscode.window.showWarningMessage` 提示用户

#### Scenario: forwardPorts 支持数字和 "host:port" 格式
- **WHEN** forwardPorts 包含 `5173`（数字）或 `"0.0.0.0:5173"`（字符串）等格式
- **THEN** 扩展 SHALL 正确提取端口号 5173

### Requirement: 解析 JSONC 格式的 devcontainer.json
扩展 SHALL 在解析 devcontainer.json 前去除单行注释（`//`）和多行注释（`/* */`），因为 devcontainer.json 规范允许注释。

#### Scenario: 带注释的 devcontainer.json 可正常解析
- **WHEN** devcontainer.json 包含 `// 注释` 行或 `/* 块注释 */`
- **THEN** 扩展 SHALL 去除注释后成功解析 JSON 内容

### Requirement: 按 devcontainer.json forwardPorts 过滤 tunnels
扩展 SHALL 从工作区根目录的 `.devcontainer/devcontainer.json` 或 `devcontainer.json` 中读取 `forwardPorts` 字段，仅处理其中声明的容器端口对应的 tunnels。

#### Scenario: 只处理声明端口
- **WHEN** tunnels 列表中包含容器端口 5173 和 8080，但 forwardPorts 只声明了 5173
- **THEN** 扩展 SHALL 只处理端口 5173 对应的 tunnel，忽略 8080

#### Scenario: devcontainer.json 不存在时不处理任何端口
- **WHEN** 工作区中不存在 devcontainer.json 文件
- **THEN** 扩展 SHALL 不处理任何 tunnel，静默退出

#### Scenario: devcontainer.json 解析失败时不处理任何端口
- **WHEN** devcontainer.json 文件存在但内容无法解析（格式错误）
- **THEN** 扩展 SHALL 捕获异常，不处理任何端口，并通过 `vscode.window.showWarningMessage` 提示用户

#### Scenario: forwardPorts 支持数字和 "host:port" 格式
- **WHEN** forwardPorts 包含 `5173`（数字）或 `"0.0.0.0:5173"`（字符串）等格式
- **THEN** 扩展 SHALL 正确提取端口号 5173

### Requirement: 解析 JSONC 格式的 devcontainer.json
扩展 SHALL 在解析 devcontainer.json 前去除单行注释（`//`）和多行注释（`/* */`），因为 devcontainer.json 规范允许注释。

#### Scenario: 带注释的 devcontainer.json 可正常解析
- **WHEN** devcontainer.json 包含 `// 注释` 行或 `/* 块注释 */`
- **THEN** 扩展 SHALL 去除注释后成功解析 JSON 内容
