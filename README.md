# vscode-portless

A VS Code extension that automatically registers [portless](https://github.com/latel/portless) aliases for devcontainer forwarded ports.

> **Note**: This extension uses the `tunnels` [proposed API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api) and cannot be published to the VS Code Marketplace. Install manually via `.vsix`.

## How It Works

When you open a devcontainer in VS Code, forwarded ports are mapped to random local ports that change on every reconnect. This extension:

1. Reads `forwardPorts` from your `.devcontainer/devcontainer.json`
2. Detects the current local port for each forwarded port
3. Calls `portless alias <name> <localPort>` automatically

This gives you a stable `<name>.localhost` URL that always points to the correct local port.

## Prerequisites

- [portless](https://github.com/latel/portless) installed globally and the daemon running (`portless start`)
- VS Code with `--enable-proposed-api=latel.vscode-portless` flag

## Installation

1. Download the latest `.vsix` from [GitHub Releases](https://github.com/latel/vscode-portless/releases)
2. Install via VS Code command: **Extensions: Install from VSIX...**
3. Restart VS Code with the proposed API flag:

```sh
code --enable-proposed-api=latel.vscode-portless /path/to/your/project
```

## Usage

The extension activates automatically on startup. When a devcontainer port is forwarded:

- If your `package.json` has `"name": "my-app"`, the alias will be `my-app`
- In a git worktree on branch `feat/auth`, it becomes `feat_auth_my-app`
- With multiple `forwardPorts` (5173 and 3000), they become `my-app_5173` and `my-app_3000`

Access your service at `http://my-app.localhost` instead of `http://localhost:54321`.

## Configuration

No configuration required. The extension reads `forwardPorts` from:

- `.devcontainer/devcontainer.json`
- `devcontainer.json` (root)

## License

MIT
