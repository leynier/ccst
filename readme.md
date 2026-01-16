# ccst - Claude Code Switch Tools

> Tools for managing Claude Code settings and CCS daemon

**ccst** (Claude Code Switch Tools) provides utilities for managing Claude Code configurations, including permission merging, CCS daemon management, and configuration backup/restore.

## Features

- Permission merging with history tracking
- CCS daemon management
- Configuration backup and restore
- Settings level management (user/project/local)
- Shell completions for major shells

## Quick Start

### Installation

Install globally with npm (default):

```bash
npm install -g @leynier/ccst
```

Alternative package managers:

```bash
# bun
bun add -g @leynier/ccst

# pnpm
pnpm add -g @leynier/ccst

# yarn
yarn global add @leynier/ccst
```

## Usage

### Merge Permissions

Merge permissions from other contexts or files to build complex configurations:

```bash
# Merge user settings into current context
ccst --merge-from user

# Merge from another context
ccst --merge-from personal work

# Merge from a specific file
ccst --merge-from /path/to/permissions.json staging

# Merge full settings (not just permissions)
ccst --merge-from user --merge-full

# Remove previously merged permissions
ccst --unmerge user

# View merge history
ccst --merge-history

# Merge into a specific context (default is current)
ccst --merge-from user production
```

Merge features:

- Smart deduplication
- History tracking
- Reversible unmerge
- Targeted merges

### Settings Level Management

ccst respects Claude Code's settings hierarchy with explicit flags:

```bash
# Default: always uses user-level contexts
ccst --merge-from user              # Manages ~/.claude/settings.json

# Explicit flags for project/local contexts
ccst --in-project --merge-from user # Manages ./.claude/settings.json
ccst --local --merge-from user      # Manages ./.claude/settings.local.json
```

## CCS Daemon Management

ccst can manage the CCS (Claude Code Server) daemon for background processing:

### Installation & Setup

```bash
# Install CCS CLI tool (interactive package manager selection)
ccst ccs install

# Run initial setup
ccst ccs setup

# Force setup even if already configured
ccst ccs setup -f
```

### Starting & Stopping

```bash
# Start daemon
ccst ccs start

# Start with specific dashboard port
ccst ccs start -p 3001

# Skip file watcher
ccst ccs start -W

# Set startup timeout (Windows only, default: 30 seconds)
ccst ccs start -t 60

# Force restart if already running
ccst ccs start -f

# Keep existing logs (append instead of truncate)
ccst ccs start --keep-logs

# Stop daemon
ccst ccs stop

# Force kill daemon
ccst ccs stop -f
```

### Monitoring

```bash
# Check daemon status
ccst ccs status

# View logs (last 50 lines by default)
ccst ccs logs

# View more lines
ccst ccs logs -n 100

# Follow logs in real-time
ccst ccs logs -f
```

## Configuration Backup

Backup and restore all CCS configuration:

```bash
# Export configuration to ZIP file
ccst config dump

# Export to custom path
ccst config dump my-backup.zip

# Import configuration from ZIP
ccst config load

# Import from custom path
ccst config load my-backup.zip

# Replace all existing files during import
ccst config load -r

# Skip confirmation prompt
ccst config load -y
```

## File Structure

User level (`~/.claude/`):

```text
~/.claude/
├── settings.json           # Active user context
└── settings/
    ├── work.json           # Work context
    ├── personal.json       # Personal context
    └── .cctx-state.json    # State tracking
```

Project level (`./.claude/`):

```text
./.claude/
├── settings.json           # Shared project context
├── settings.local.json     # Local project context (gitignored)
└── settings/
    ├── staging.json        # Staging context
    ├── production.json     # Production context
    ├── .cctx-state.json    # Project state
    └── .cctx-state.local.json # Local state
```

CCS daemon files (`~/.ccs/`):

```text
~/.ccs/
├── .daemon.pid            # Daemon process ID
├── .daemon.log            # Daemon log file
└── .daemon.ports          # Dashboard port tracking
```

## Complete Command Reference

### Merge Operations

- `ccst --merge-from <source> [target]` - Merge permissions from source into target (default: current)
  - Source can be: `user`, another context name, or file path
- `ccst --merge-from <source> --merge-full [target]` - Merge ALL settings (not just permissions)
- `ccst --unmerge <source> [target]` - Remove previously merged permissions
- `ccst --unmerge <source> --merge-full [target]` - Remove ALL previously merged settings
- `ccst --merge-history [name]` - Show merge history for context

### Settings Levels

- `ccst` - User-level contexts (default: `~/.claude/settings.json`)
- `ccst --in-project` - Project-level contexts (`./.claude/settings.json`)
- `ccst --local` - Local project contexts (`./.claude/settings.local.json`)

### CCS Daemon Commands

- `ccst ccs install` - Install CCS CLI tool (interactive package manager selection)
- `ccst ccs setup` - Run CCS initial setup
- `ccst ccs setup -f` - Force setup even if already configured
- `ccst ccs start` - Start CCS daemon
- `ccst ccs start -f` - Force restart if already running
- `ccst ccs start -p <port>` - Start with specific dashboard port
- `ccst ccs start -W` - Start without file watcher
- `ccst ccs start -t <seconds>` - Set startup timeout (Windows only)
- `ccst ccs start --keep-logs` - Keep existing logs (append instead of truncate)
- `ccst ccs stop` - Stop CCS daemon
- `ccst ccs stop -f` - Force kill daemon (SIGKILL)
- `ccst ccs status` - Show daemon status, PID, and log info
- `ccst ccs logs` - View daemon logs (last 50 lines)
- `ccst ccs logs -n <lines>` - View specified number of lines
- `ccst ccs logs -f` - Follow log output in real-time

### Configuration Commands

- `ccst config dump [output]` - Export CCS config to ZIP (default: ccs-config.zip)
- `ccst config load [input]` - Import CCS config from ZIP (default: ccs-config.zip)
- `ccst config load -r` - Replace all existing files during import
- `ccst config load -y` - Skip confirmation prompt

### Shell Completions

Enable tab completion for faster workflow:

```bash
# Bash
ccst --completions bash > ~/.local/share/bash-completion/completions/ccst

# Zsh
ccst --completions zsh > /usr/local/share/zsh/site-functions/_ccst

# Fish
ccst --completions fish > ~/.config/fish/completions/ccst.fish

# PowerShell
ccst --completions powershell > ccst.ps1
```

### Other Options

- `ccst --completions <shell>` - Generate shell completions
- `ccst --help` - Show help information
- `ccst --version` - Show version

## Note

Profile switching functionality has been removed from ccst as it is now natively supported by CCS. This tool now focuses on permission merging, daemon management, and configuration backup/restore operations.
