import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SettingsLevel } from "../types/index.js";

export type Paths = {
	contextsDir: string;
	settingsPath: string;
	statePath: string;
	settingsLevel: SettingsLevel;
};

export const getPaths = (level: SettingsLevel): Paths => {
	const homeDir = homedir();
	const currentDir = process.cwd();
	if (level === "user") {
		const claudeDir = path.join(homeDir, ".claude");
		const contextsDir = path.join(claudeDir, "settings");
		return {
			contextsDir,
			settingsPath: path.join(claudeDir, "settings.json"),
			statePath: path.join(contextsDir, ".cctx-state.json"),
			settingsLevel: level,
		};
	}
	if (level === "project") {
		const claudeDir = path.join(currentDir, ".claude");
		const contextsDir = path.join(claudeDir, "settings");
		return {
			contextsDir,
			settingsPath: path.join(claudeDir, "settings.json"),
			statePath: path.join(contextsDir, ".cctx-state.json"),
			settingsLevel: level,
		};
	}
	const claudeDir = path.join(currentDir, ".claude");
	const contextsDir = path.join(claudeDir, "settings");
	return {
		contextsDir,
		settingsPath: path.join(claudeDir, "settings.local.json"),
		statePath: path.join(contextsDir, ".cctx-state.local.json"),
		settingsLevel: level,
	};
};

export const hasProjectContexts = (): boolean => {
	const contextsDir = path.join(process.cwd(), ".claude", "settings");
	try {
		const entries = readdirSync(contextsDir);
		return entries.some(
			(name) => name.endsWith(".json") && !name.startsWith("."),
		);
	} catch {
		return false;
	}
};

export const hasLocalContexts = (): boolean => {
	return existsSync(path.join(process.cwd(), ".claude", "settings.local.json"));
};
