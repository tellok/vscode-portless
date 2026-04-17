## ADDED Requirements

### Requirement: 优先使用系统全局安装的 portless 二进制
扩展 SHALL 首先尝试通过 `which portless`（macOS/Linux）或 `where portless`（Windows）定位系统全局安装的 portless 二进制。若找到，SHALL 使用该路径。

#### Scenario: 系统已安装 portless 时使用全局版本
- **WHEN** 系统 PATH 中存在 `portless` 可执行文件
- **THEN** 扩展 SHALL 使用全局 portless 路径，不使用扩展内置版本

#### Scenario: which portless 抛出异常时静默捕获
- **WHEN** `which portless` 命令执行失败或抛出异常
- **THEN** 扩展 SHALL 捕获异常并继续尝试 fallback 路径

### Requirement: fallback 到扩展内置的 portless 二进制
扩展 SHALL 在全局 portless 不可用时，fallback 使用扩展目录下 `node_modules/.bin/portless` 路径（`path.join(context.extensionPath, "node_modules", ".bin", "portless")`）。

#### Scenario: 系统无 portless 时使用扩展内置版本
- **WHEN** 系统 PATH 中不存在 `portless` 可执行文件
- **THEN** 扩展 SHALL 使用 `<extensionPath>/node_modules/.bin/portless` 作为二进制路径

### Requirement: 解析逻辑在 activate() 时执行一次
portless 二进制路径 SHALL 在扩展 `activate()` 时解析一次并缓存，不在每次事件触发时重复解析。

#### Scenario: 路径仅解析一次
- **WHEN** `activate()` 被调用时
- **THEN** 扩展 SHALL 调用一次 `getPortlessBin(context)` 并将结果缓存于变量中，后续所有事件处理复用该缓存值
