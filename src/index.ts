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
import { createCommand } from "./commands/create.js";
import { deleteCommand } from "./commands/delete.js";
import { editCommand } from "./commands/edit.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { importFromCcs } from "./commands/import-profiles/ccs.js";
import { importFromConfigs } from "./commands/import-profiles/configs.js";
import { listCommand } from "./commands/list.js";
import {
	mergeCommand,
	mergeHistoryCommand,
	unmergeCommand,
} from "./commands/merge.js";
import { renameCommand } from "./commands/rename.js";
import { showCommand } from "./commands/show.js";
import { switchCommand, switchPreviousCommand } from "./commands/switch.js";
import { unsetCommand } from "./commands/unset.js";
import { ContextManager } from "./core/context-manager.js";
import { resolveSettingsLevel } from "./core/settings-level.js";
import { getPaths } from "./utils/paths.js";

export const program = new Command();

const main = async (): Promise<void> => {
	program
		.name("ccst")
		.description("Claude Code Switch Tools")
		.version(pkg.version)
		.argument("[context]", "context name")
		.option("-d, --delete", "delete context")
		.option("-c, --current", "print current context")
		.option("-r, --rename", "rename context")
		.option("-n, --new", "create new context")
		.option("-e, --edit", "edit context")
		.option("-s, --show", "show context")
		.option("--export", "export context to stdout")
		.option("--import", "import context from stdin")
		.option("-u, --unset", "unset current context")
		.option("--completions <shell>", "generate completions")
		.option("-q, --quiet", "show only current context")
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
				if (options.current) {
					const current = await manager.getCurrentContext();
					if (current) {
						console.log(current);
					}
					return;
				}
				if (options.unset) {
					await unsetCommand(manager);
					return;
				}
				if (options.delete) {
					await deleteCommand(manager, context);
					return;
				}
				if (options.rename) {
					await renameCommand(manager, context);
					return;
				}
				if (options.new) {
					if (!context) {
						await manager.interactiveCreateContext();
						return;
					}
					await createCommand(manager, context);
					return;
				}
				if (options.edit) {
					await editCommand(manager, context);
					return;
				}
				if (options.show) {
					await showCommand(manager, context);
					return;
				}
				if (options.export) {
					await exportCommand(manager, context);
					return;
				}
				if (options.import) {
					await importCommand(manager, context);
					return;
				}
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
				if (context === "-") {
					await switchPreviousCommand(manager);
					return;
				}
				if (context) {
					await switchCommand(manager, context);
					return;
				}
				if (process.env.CCTX_INTERACTIVE === "1") {
					await manager.interactiveSelect();
					return;
				}
				await listCommand(manager, options.quiet as boolean);
			},
		);
	const importCommandGroup = program
		.command("import")
		.description("import profiles");
	importCommandGroup
		.command("ccs")
		.description("import from CCS settings")
		.option("-d, --configs-dir <dir>", "configs directory")
		.action(async (options) => {
			const manager = new ContextManager(getPaths("user"));
			await importFromCcs(manager, options.configsDir);
		});
	importCommandGroup
		.command("configs")
		.description("import from configs directory")
		.option("-d, --configs-dir <dir>", "configs directory")
		.action(async (options) => {
			const manager = new ContextManager(getPaths("user"));
			await importFromConfigs(manager, options.configsDir);
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
	const ccsCommandGroup = program
		.command("ccs")
		.description("CCS daemon management");
	ccsCommandGroup
		.command("start")
		.description("Start CCS config as background daemon")
		.option("-f, --force", "Force restart if already running")
		.action(async (options) => {
			await ccsStartCommand(options);
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
