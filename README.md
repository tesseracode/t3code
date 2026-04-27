# T3 Code

T3 Code is a minimal web GUI for coding agents (currently Codex and Claude, more coming soon).

> [!CAUTION]
> **This is a fork of [pingdotgg/t3code](https://github.com/pingdotgg/t3code)** with experimental GitHub Copilot provider support.
>
> Sessions created with the Copilot provider use a different internal schema and **are not backward-compatible** with upstream t3code. If you switch back to the upstream version, any threads that used the Copilot provider will fail to load.
>
> The Copilot integration uses `@github/copilot-sdk` and requires a GitHub Copilot subscription. This feature is experimental and may change without notice.

## Installation

> [!WARNING]
> T3 Code currently supports Codex, Claude, and GitHub Copilot (experimental, this fork only).
> Install and authenticate at least one provider before use:
>
> - Codex: install [Codex CLI](https://github.com/openai/codex) and run `codex login`
> - Claude: install Claude Code and run `claude auth login`
> - Copilot: install [GitHub CLI](https://cli.github.com/) and run `gh auth login` (requires Copilot subscription)

### Run without installing

```bash
npx t3
```

### Desktop app

Install the latest version of the desktop app from [GitHub Releases](https://github.com/pingdotgg/t3code/releases), or from your favorite package registry:

#### Windows (`winget`)

```bash
winget install T3Tools.T3Code
```

#### macOS (Homebrew)

```bash
brew install --cask t3-code
```

#### Arch Linux (AUR)

```bash
yay -S t3code-bin
```

## Some notes

We are very very early in this project. Expect bugs.

We are not accepting contributions yet.

Observability guide: [docs/observability.md](./docs/observability.md)

## If you REALLY want to contribute still.... read this first

Before local development, prepare the environment and install dependencies:

```bash
# Optional: only needed if you use mise for dev tool management.
mise install
bun install .
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or PR.

Need support? Join the [Discord](https://discord.gg/jn4EGJjrvv).
