# ccst - Claude Code Switch Tools

> Tools for managing CCS daemon and configuration

**ccst** (Claude Code Switch Tools) provides utilities for CCS daemon management and configuration backup/restore.

## Features

- CCS daemon management
- Configuration backup and restore
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

## CCS Daemon Management

### Installation & Setup

```bash
# Install CCS CLI tool (interactive package manager selection)
ccst install

# Run initial setup
ccst setup

# Force setup even if already configured
ccst setup -f
```

### Starting & Stopping

```bash
# Start daemon
ccst start

# Start with specific dashboard port
ccst start -p 3001

# Set startup timeout (Windows only, default: 30 seconds)
ccst start -t 60

# Force restart if already running
ccst start -f

# Keep existing logs (append instead of truncate)
ccst start --keep-logs

# Stop daemon
ccst stop

# Force kill daemon
ccst stop -f
```

### Monitoring

```bash
# Check daemon status
ccst status

# View logs (last 50 lines by default)
ccst logs

# View more lines
ccst logs -n 100

# Follow logs in real-time
ccst logs -f
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

CCS daemon files (`~/.ccs/`):

```text
~/.ccs/
├── .daemon.pid            # Daemon process ID
├── .daemon.log            # Daemon log file
└── .daemon.ports          # Dashboard port tracking
```

## Complete Command Reference

### Daemon Commands

- `ccst install` - Install CCS CLI tool (interactive package manager selection)
- `ccst setup` - Run CCS initial setup
- `ccst setup -f` - Force setup even if already configured
- `ccst start` - Start CCS daemon
- `ccst start -f` - Force restart if already running
- `ccst start -p <port>` - Start with specific dashboard port
- `ccst start -t <seconds>` - Set startup timeout (Windows only)
- `ccst start --keep-logs` - Keep existing logs (append instead of truncate)
- `ccst stop` - Stop CCS daemon
- `ccst stop -f` - Force kill daemon (SIGKILL)
- `ccst status` - Show daemon status, PID, and log info
- `ccst logs` - View daemon logs (last 50 lines)
- `ccst logs -n <lines>` - View specified number of lines
- `ccst logs -f` - Follow log output in real-time

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

This tool has been simplified to focus exclusively on CCS daemon management and configuration backup/restore. Profile switching and permission merging features have been removed as they are now natively supported by CCS.
