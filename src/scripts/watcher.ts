#!/usr/bin/env bun
import { existsSync, watch } from "node:fs";
import { ccsDir, performCcsImport } from "../commands/import-profiles/ccs.js";
import { ContextManager } from "../core/context-manager.js";
import { getPaths } from "../utils/paths.js";

const DEBOUNCE_MS = 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isImporting = false;

const log = (message: string): void => {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] ${message}`);
};

const runImport = async (): Promise<void> => {
	if (isImporting) {
		log("Import already in progress, skipping");
		return;
	}
	isImporting = true;
	try {
		const manager = new ContextManager(getPaths("user"));
		const result = await performCcsImport(manager);
		if (result.importedCount > 0) {
			log(
				`Imported ${result.importedCount} profiles: ${result.profileNames.join(", ")}`,
			);
		} else {
			log("No profiles to import");
		}
	} catch (error) {
		log(`Import error: ${error}`);
	} finally {
		isImporting = false;
	}
};

const handleFileChange = (eventType: string, filename: string | null): void => {
	if (!filename || !filename.endsWith(".settings.json")) {
		return;
	}
	log(`Detected ${eventType} on ${filename}`);

	// Debounce
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	debounceTimer = setTimeout(runImport, DEBOUNCE_MS);
};

const main = async (): Promise<void> => {
	const ccsPath = ccsDir();

	log(`CCS Settings Watcher - PID: ${process.pid}`);
	log(`Watching directory: ${ccsPath}`);

	if (!existsSync(ccsPath)) {
		log(`ERROR: CCS directory not found: ${ccsPath}`);
		log("Please run 'ccs setup' first to initialize CCS");
		process.exit(1);
	}

	// Run initial import
	log("Running initial import...");
	await runImport();

	// Start watching
	const watcher = watch(ccsPath, { persistent: true }, handleFileChange);

	// Graceful shutdown
	const cleanup = (): void => {
		log("Shutting down watcher");
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		watcher.close();
		process.exit(0);
	};

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	log("Watcher started successfully");
};

await main();
