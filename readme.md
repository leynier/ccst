# ccst - Claude Code Switch Tools

> Fast and predictable way to manage Claude Code contexts (`~/.claude/settings.json`)

**ccst** (Claude Code Switch Tools) is inspired by [cctx](https://github.com/nwiizo/cctx), which is itself inspired by kubectx, and ports the cctx experience to TypeScript with additional capabilities. Switch between permission sets, environments, and settings with a single command.

## Features

- Instant context switching
- Predictable UX with user-level defaults
- Security-first separation of work, personal, and project contexts
- Shell completions for major shells
- Previous context quick switch with `ccst -`
- File-based JSON contexts you can edit manually

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

### 30-Second Setup

```bash
# 1. Create your first context from current settings
ccst -n personal

# 2. Create a restricted work context
ccst -n work

# 3. Switch between contexts
ccst work      # Switch to work
ccst personal  # Switch to personal
ccst -         # Switch back to previous
```

## Usage

### Basic Commands

```bash
# List all contexts
ccst

# Switch to a context
ccst work

# Switch to previous context
ccst -

# Show current context
ccst -c
```

### Settings Level Management

ccst respects Claude Code's settings hierarchy with explicit flags:

```bash
# Default: always uses user-level contexts
ccst                       # Manages ~/.claude/settings.json

# Explicit flags for project/local contexts
ccst --in-project          # Manages ./.claude/settings.json
ccst --local               # Manages ./.claude/settings.local.json

# All commands work with any level
ccst --in-project work     # Switch to 'work' in project contexts
ccst --local staging       # Switch to 'staging' in local contexts
```

### Context Management

```bash
# Create new context from current settings
ccst -n project-alpha

# Delete a context
ccst -d old-project

# Rename a context (prompts for new name)
ccst -r old-name

# Edit context with $EDITOR
ccst -e work

# Show context content (JSON)
ccst -s production

# Unset current context
ccst -u
```

### Import/Export

```bash
# Export context to file
ccst --export production > prod-settings.json

# Import context from file
ccst --import staging < staging-settings.json

# Share contexts between machines
ccst --export work | ssh remote-host 'ccst --import work'
```

### Merge Permissions

Merge permissions from other contexts or files to build complex configurations:

```bash
# Merge user settings into current context
ccst --merge-from user

# Merge from another context
ccst --merge-from personal work

# Merge from a specific file
ccst --merge-from /path/to/permissions.json staging

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

### Importing Profiles

ccst includes importer commands to migrate existing profiles:

```bash
# Import from CCS profiles (~/.ccs/*.settings.json)
ccst import ccs

# Import from configs directory (default: ~/.ccst)
ccst import configs

# Use a custom configs directory
ccst import configs -d /path/to/configs
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

Contexts are stored as individual JSON files at different levels:

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

## Interactive Mode

When no arguments are provided, ccst can enter interactive mode:

- fzf integration when available
- Built-in fallback selector when fzf is not installed
- Current context highlighted in the list

```bash
# Interactive context selection
CCTX_INTERACTIVE=1 ccst
```

## Common Workflows

### Professional Setup

```bash
# Create restricted work context for safer collaboration
ccst -n work
ccst -e work  # Edit to add restrictions
```

### Project-Based Contexts

```bash
# Create project-specific contexts
ccst -n client-alpha
ccst -n side-project
ccst -n experiments

# Switch based on current work
ccst client-alpha
ccst experiments
```

### Daily Context Switching

```bash
# Morning: start with work context
ccst work

# Need full access for personal project
ccst personal

# Quick switch back to work
ccst -

# Check current context anytime
ccst -c
```

## Complete Command Reference

### Basic Operations

- `ccst` - List contexts (defaults to user-level)
- `ccst <name>` - Switch to context
- `ccst -` - Switch to previous context
- `ccst -c` - Show current context name
- `ccst -q` - Quiet mode (only show current context)

### Context Management Reference

- `ccst -n <name>` - Create new context from current settings
- `ccst -d <name>` - Delete context (interactive if no name)
- `ccst -r <name>` - Rename context (prompts for new name)
- `ccst -e [name]` - Edit context with $EDITOR
- `ccst -s [name]` - Show context content (JSON)
- `ccst -u` - Unset current context (removes settings file)

### Import/Export Reference

- `ccst --export [name]` - Export context to stdout
- `ccst --import <name>` - Import context from stdin

### Importer Commands

- `ccst import ccs` - Import from CCS settings (~/.ccs)
- `ccst import configs` - Import from configs directory (default: ~/.ccst)
- `ccst import configs -d <dir>` - Import from a custom configs directory
- `ccst import ccs -d <dir>` - Use custom configs directory for default.json

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

### Other Options

- `ccst --completions <shell>` - Generate shell completions
- `ccst --help` - Show help information
- `ccst --version` - Show version

## Compatibility Note

ccst is a TypeScript port of cctx with some differences. Behavior and output are intentionally close to cctx, but there may be small UX or implementation differences.
