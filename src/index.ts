#!/usr/bin/env bun
import { Command } from "commander";
import { getPaths } from "./utils/paths.js";
import { ContextManager } from "./core/context-manager.js";
import { resolveSettingsLevel } from "./core/settings-level.js";
import { listCommand } from "./commands/list.js";
import { switchCommand, switchPreviousCommand } from "./commands/switch.js";
import { createCommand } from "./commands/create.js";
import { deleteCommand } from "./commands/delete.js";
import { renameCommand } from "./commands/rename.js";
import { editCommand } from "./commands/edit.js";
import { showCommand } from "./commands/show.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { unsetCommand } from "./commands/unset.js";
import { mergeCommand, mergeHistoryCommand, unmergeCommand } from "./commands/merge.js";
import { completionsCommand } from "./commands/completions.js";
import { importFromCcs } from "./commands/import-profiles/ccs.js";
import { importFromConfigs } from "./commands/import-profiles/configs.js";

export const program = new Command();

const main = async (): Promise<void> => {
  program
    .name("ccst")
    .description("Claude Code Switch Tools")
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
    .allowExcessArguments(false);
  const importCommandGroup = program.command("import").description("import profiles");
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
  try {
    await program.parseAsync(process.argv);
  } catch {
    return;
  }
  const options = program.opts();
  const [context] = program.args as [string | undefined];
  if (context === "import") {
    return;
  }
  if (options.completions) {
    completionsCommand(options.completions);
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
    await mergeCommand(manager, options.mergeFrom, context, options.mergeFull);
    return;
  }
  if (options.unmerge) {
    await unmergeCommand(manager, options.unmerge, context, options.mergeFull);
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
  await listCommand(manager, options.quiet);
};

await main();
