# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-17

### Added

- Initial release
- Automatically register portless aliases for devcontainer forwarded ports
- Reads `forwardPorts` from `.devcontainer/devcontainer.json` or `devcontainer.json`
- Infers alias name from `package.json` `name` field (strips `@scope/` prefix)
- Detects git worktree and prefixes alias with branch name
- Supports multiple forwarded ports with `_<port>` suffix
- Prefers globally installed `portless` binary
- i18n support: English and Simplified Chinese
