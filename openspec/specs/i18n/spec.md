## ADDED Requirements

### Requirement: package.json 中的字符串使用 %key% 引用
扩展的 `package.json` 中 `displayName`、`description`、所有 `contributes` 下的用户可见字符串 SHALL 使用 `%key%` 格式引用，对应的翻译分别存放于 `package.nls.json`（默认英文）和 `package.nls.<locale>.json`（各语言翻译）。

#### Scenario: 描述字段使用占位符
- **WHEN** VS Code 加载扩展
- **THEN** `package.json` 中的 `displayName` 和 `description` SHALL 显示为 `package.nls.json` 中对应 key 的翻译值

### Requirement: 支持英文和简体中文两种语言
扩展 SHALL 提供以下翻译文件：
- `package.nls.json`：English（默认，所有 key 必须包含）
- `package.nls.zh-cn.json`：简体中文

#### Scenario: 中文环境显示中文
- **WHEN** VS Code 界面语言设置为 `zh-cn`
- **THEN** 扩展的 displayName、description 等字符串 SHALL 显示中文翻译

#### Scenario: 非支持语言 fallback 到英文
- **WHEN** VS Code 界面语言为不支持的语言（如日文）
- **THEN** 扩展 SHALL 显示 `package.nls.json` 中的英文字符串

### Requirement: 运行时字符串使用 vscode.l10n.t() API
扩展代码中所有用户可见的运行时字符串（通知、警告、错误消息）SHALL 使用 `vscode.l10n.t()` 包装，并在 `package.json` 中声明 `"l10n": "./l10n"` 指向翻译目录。

#### Scenario: 运行时通知显示正确语言
- **WHEN** 扩展调用 `vscode.window.showWarningMessage(vscode.l10n.t("some message"))`
- **THEN** 消息内容 SHALL 根据 VS Code UI 语言显示相应翻译

### Requirement: l10n 目录包含运行时字符串翻译文件
`l10n/` 目录 SHALL 包含：
- `bundle.l10n.json`：英文默认运行时字符串
- `bundle.l10n.zh-cn.json`：简体中文运行时字符串翻译

#### Scenario: l10n 目录结构正确
- **WHEN** 扩展被打包为 .vsix
- **THEN** .vsix 内容 SHALL 包含 `l10n/bundle.l10n.json` 和 `l10n/bundle.l10n.zh-cn.json`
