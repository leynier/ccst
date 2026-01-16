# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Format code
bun run format

# Lint code (with auto-fix)
bun run lint

# Run both format and lint
bun run validate

# Run CLI locally during development
bun src/index.ts [args]
```

## Architecture Overview

**ccst** (Claude Code Switch Tools) is a CLI tool that provides utilities for CCS daemon management and configuration backup/restore.

### Core Components

- **`src/index.ts`** - Main CLI entry point using Commander.js. Defines all commands and routes to handlers.
- **`src/utils/daemon.ts`** - Cross-platform daemon process management (Windows/Unix). Critical for CCS daemon commands.

### Command Structure

Commands in `src/commands/` are organized by function:

- `ccs/` - CCS daemon management (start, stop, status, logs, setup, install)
- `config/` - Configuration backup/restore (dump, load)

## Development Guidelines

- **Use Bun, not Node.js** - All file operations use `Bun.file()`, `Bun.write()`, `Bun.remove()`.
- **Use `Bun.$` for shell commands** - Not execa or child_process.
- **Cross-platform handling** - `src/utils/daemon.ts` has separate code paths for Windows (taskkill, netstat) and Unix (lsof, kill signals). Test both when modifying.
- **Formatting/Linting** - Uses Biome. Run `bun run validate` before committing.

## Commit Message Pattern

Follow existing commit prefixes: `feat:`, `fix:`, `chore:`
