#!/usr/bin/env bun
import { Command } from "commander";
import pkg from "../package.json";
import { ccsInstallCommand } from "./commands/ccs/install.js";
import { ccsLogsCommand } from "./commands/ccs/logs.js";
import { ccsSetupCommand } from "./commands/ccs/setup.js";
import { ccsStartCommand } from "./commands/ccs/start.js";
import { ccsStatusCommand } from "./commands/ccs/status.js";
import { ccsStopCommand } from "./commands/ccs/stop.js";
import { completionsCommand } from "./commands/completions.js";
import { configDumpCommand } from "./commands/config/dump.js";
import { configLoadCommand } from "./commands/config/load.js";
import {
	mergeCommand,
	mergeHistoryCommand,
	unmergeCommand,
} from "./commands/merge.js";
import { ContextManager } from "./core/context-manager.js";
import { resolveSettingsLevel } from "./core/settings-level.js";
import { getPaths } from "./utils/paths.js";

export const program = new Command();

const main = async (): Promise<void> => {
	program
		.name("ccst")
		.description("Claude Code Switch Tools")
		.version(pkg.version)
		.argument("[context]", "context name for merge operations")
		.option("--completions <shell>", "generate completions")
		.option("--in-project", "use project settings level")
		.option("--local", "use local settings level")
		.option("--merge-from <source>", "merge permissions from source")
		.option("--unmerge <source>", "remove permissions merged from source")
		.option("--merge-history", "show merge history")
		.option("--merge-full", "merge full settings")
		.allowExcessArguments(false)
		.action(
			async (context: string | undefined, options: Record<string, unknown>) => {
				if (options.completions) {
					completionsCommand(options.completions as string);
					return;
				}
				const level = resolveSettingsLevel(options);
				const manager = new ContextManager(getPaths(level));
				if (options.mergeFrom) {
					await mergeCommand(
						manager,
						options.mergeFrom as string,
						context,
						options.mergeFull as boolean,
					);
					return;
				}
				if (options.unmerge) {
					await unmergeCommand(
						manager,
						options.unmerge as string,
						context,
						options.mergeFull as boolean,
					);
					return;
				}
				if (options.mergeHistory) {
					await mergeHistoryCommand(manager, context);
					return;
				}
				program.help();
			},
		);
	const configCommandGroup = program
		.command("config")
		.description("CCS config backup/restore");
	configCommandGroup
		.command("dump")
		.description("export CCS config to zip")
		.argument("[output]", "output path", "ccs-config.zip")
		.action(async (output) => {
			await configDumpCommand(output);
		});
	configCommandGroup
		.command("load")
		.description("import CCS config from zip")
		.argument("[input]", "input path", "ccs-config.zip")
		.option("-r, --replace", "replace all existing files")
		.option("-y, --yes", "skip confirmation prompt")
		.action(async (input, options) => {
			await configLoadCommand(input, options);
		});
	const ccsCommandGroup = program
		.command("ccs")
		.description("CCS daemon management");
	ccsCommandGroup
		.command("start")
		.description("Start CCS config as background daemon")
		.option("-f, --force", "Force restart if already running")
		.option("--keep-logs", "Keep existing log file (append)")
		.option(
			"-p, --port <number>",
			"Dashboard port (auto-detect if not specified)",
		)
		.option("-W, --no-watch", "Skip file watcher")
		.option(
			"-t, --timeout <seconds>",
			"Timeout in seconds for daemon startup (Windows only)",
			"30",
		)
		.action(async (options) => {
			await ccsStartCommand({
				force: options.force,
				keepLogs: options.keepLogs,
				port: options.port ? Number.parseInt(options.port, 10) : undefined,
				noWatch: options.watch === false,
				timeout: Number.parseInt(options.timeout, 10) * 1000,
			});
		});
	ccsCommandGroup
		.command("stop")
		.description("Stop the CCS config daemon")
		.option("-f, --force", "Force kill (SIGKILL)")
		.action(async (options) => {
			await ccsStopCommand(options);
		});
	ccsCommandGroup
		.command("status")
		.description("Check CCS config daemon status")
		.action(async () => {
			await ccsStatusCommand();
		});
	ccsCommandGroup
		.command("logs")
		.description("View CCS config daemon logs")
		.option("-f, --follow", "Follow log output")
		.option("-n, --lines <number>", "Number of lines", "50")
		.action(async (options) => {
			await ccsLogsCommand({
				follow: options.follow,
				lines: parseInt(options.lines, 10),
			});
		});
	ccsCommandGroup
		.command("setup")
		.description("Run CCS initial setup")
		.option("-f, --force", "Force setup even if already configured")
		.action(async (options) => {
			await ccsSetupCommand(options);
		});
	ccsCommandGroup
		.command("install")
		.description("Install CCS CLI tool")
		.action(async () => {
			await ccsInstallCommand();
		});
	try {
		await program.parseAsync(process.argv);
	} catch {
		return;
	}
};

await main();
