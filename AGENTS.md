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

# Run tests
bun test

# Run a single test file
bun test src/core/context-manager.test.ts

# Run CLI locally during development
bun src/index.ts [args]
```

## Architecture Overview

**ccst** (Claude Code Switch Tools) is a CLI tool that manages Claude Code IDE contexts and configurations. It allows users to switch between different permission sets, environments, and settings at user, project, and local levels.

### Core Components

- **`src/index.ts`** - Main CLI entry point using Commander.js. Defines all commands and routes to handlers.
- **`src/core/context-manager.ts`** - Central class for all context operations (CRUD, switching, merging). All operations flow through this class.
- **`src/core/merge-manager.ts`** - Handles permission merging with history tracking and smart deduplication.
- **`src/utils/daemon.ts`** - Cross-platform daemon process management (Windows/Unix). Critical for CCS daemon commands.
- **`src/utils/paths.ts`** - Resolves paths for all three settings levels (user/project/local).

### Settings Levels

The tool operates at three hierarchical levels:

- **User:** `~/.claude/settings.json` and `~/.claude/settings/`
- **Project:** `./.claude/settings.json` and `./.claude/settings/`
- **Local:** `./.claude/settings.local.json` and `./.claude/settings/`

### Command Structure

Commands in `src/commands/` are organized by function:

- `ccs/` - CCS daemon management (start, stop, status, logs, setup, install)
- `config/` - Configuration backup/restore (dump, load)
- `import-profiles/` - Profile importers (ccs, configs)

## Development Guidelines

- **Use Bun, not Node.js** - All file operations use `Bun.file()`, `Bun.write()`, `Bun.remove()`. See `AGENTS.md` for Bun API patterns.
- **Use `Bun.$` for shell commands** - Not execa or child_process.
- **Cross-platform handling** - `src/utils/daemon.ts` has separate code paths for Windows (taskkill, netstat) and Unix (lsof, kill signals). Test both when modifying.
- **Formatting/Linting** - Uses Biome. Run `bun run validate` before committing.

## Commit Message Pattern

Follow existing commit prefixes: `feat:`, `fix:`, `chore:`
