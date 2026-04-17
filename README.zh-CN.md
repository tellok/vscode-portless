# vscode-portless

一个 VS Code 扩展，自动为 devcontainer 转发端口注册 [portless](https://github.com/latel/portless) alias。

> **注意**：本扩展使用了 `tunnels` [Proposed API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api)，无法发布到 VS Code 插件市场，需通过 `.vsix` 手动安装。

## 工作原理

在 VS Code 中打开 devcontainer 时，转发端口会被映射到随机的本机端口，每次重连都会变化。本扩展会：

1. 读取 `.devcontainer/devcontainer.json` 中的 `forwardPorts`
2. 检测每个转发端口当前对应的本机端口
3. 自动调用 `portless alias <name> <localPort>` 完成注册

这样你就能通过稳定的 `<name>.localhost` URL 访问服务，不再需要手动查找变化的端口号。

## 前置条件

- 全局安装 [portless](https://github.com/latel/portless) 并启动守护进程（`portless start`）
- 以 `--enable-proposed-api=latel.vscode-portless` 参数启动 VS Code

## 安装方法

1. 从 [GitHub Releases](https://github.com/latel/vscode-portless/releases) 下载最新的 `.vsix` 文件
2. 在 VS Code 中执行命令：**扩展：从 VSIX 安装...**
3. 使用 proposed API 参数重启 VS Code：

```sh
code --enable-proposed-api=latel.vscode-portless /path/to/your/project
```

## 使用说明

扩展在 VS Code 启动时自动激活。当 devcontainer 端口被转发时：

- 若 `package.json` 有 `"name": "my-app"`，alias 名称为 `my-app`
- 在 `feat/auth` 分支的 git worktree 中，名称变为 `feat_auth_my-app`
- 若有多个 `forwardPorts`（5173 和 3000），分别为 `my-app_5173` 和 `my-app_3000`

之后可通过 `http://my-app.localhost` 访问服务，无需再关心 `http://localhost:54321` 这样变化的端口。

## 配置

无需任何配置。扩展会自动读取以下位置的 `forwardPorts`：

- `.devcontainer/devcontainer.json`
- `devcontainer.json`（项目根目录）

## 许可证

MIT
