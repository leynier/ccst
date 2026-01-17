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

export const program = new Command();

const main = async (): Promise<void> => {
	program
		.name("ccst")
		.description("Claude Code Switch Tools - CCS daemon and config management")
		.version(pkg.version)
		.option("--completions <shell>", "generate completions")
		.allowExcessArguments(false)
		.action(async (_options: Record<string, unknown>) => {
			if (_options.completions) {
				completionsCommand(_options.completions as string);
				return;
			}
			program.help();
		});

	program
		.command("install")
		.description("Install CCS CLI tool")
		.action(async () => {
			await ccsInstallCommand();
		});

	program
		.command("setup")
		.description("Run CCS initial setup")
		.option("-f, --force", "Force setup even if already configured")
		.action(async (options) => {
			await ccsSetupCommand(options);
		});

	program
		.command("start")
		.description("Start CCS daemon")
		.option("-f, --force", "Force restart if already running")
		.option("--keep-logs", "Keep existing log file (append)")
		.option(
			"-p, --port <number>",
			"Dashboard port (auto-detect if not specified)",
		)
		.option(
			"-t, --timeout <seconds>",
			"Timeout in seconds for daemon startup (Windows only)",
			"150",
		)
		.action(async (options) => {
			await ccsStartCommand({
				force: options.force,
				keepLogs: options.keepLogs,
				port: options.port ? Number.parseInt(options.port, 10) : undefined,
				timeout: Number.parseInt(options.timeout, 10) * 1000,
			});
		});

	program
		.command("stop")
		.description("Stop CCS daemon")
		.option("-f, --force", "Force kill (SIGKILL)")
		.action(async (options) => {
			await ccsStopCommand(options);
		});

	program
		.command("status")
		.description("Check CCS daemon status")
		.action(async () => {
			await ccsStatusCommand();
		});

	program
		.command("logs")
		.description("View CCS daemon logs")
		.option("-f, --follow", "Follow log output")
		.option("-n, --lines <number>", "Number of lines", "50")
		.action(async (options) => {
			await ccsLogsCommand({
				follow: options.follow,
				lines: parseInt(options.lines, 10),
			});
		});

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

	try {
		await program.parseAsync(process.argv);
	} catch {
		return;
	}
};

await main();
