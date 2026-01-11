import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ContextManager } from "../../core/context-manager.js";
import { colors } from "../../utils/colors.js";
import { deepMerge } from "../../utils/deep-merge.js";
import { readJson, readJsonIfExists } from "../../utils/json.js";

const defaultConfigsDir = (): string => path.join(homedir(), ".ccst");
const ccsDir = (): string => path.join(homedir(), ".ccs");

const ensureDefaultConfig = async (
	manager: ContextManager,
	configsDir: string,
): Promise<{ created: boolean; defaultPath: string }> => {
	const defaultPath = path.join(configsDir, "default.json");
	if (existsSync(defaultPath)) {
		return { created: false, defaultPath };
	}
	const currentContext = await getCurrentContext(manager);
	if (currentContext) {
		return { created: false, defaultPath };
	}
	const claudeSettings = path.join(homedir(), ".claude", "settings.json");
	if (!existsSync(claudeSettings)) {
		return { created: false, defaultPath };
	}
	mkdirSync(configsDir, { recursive: true });
	const content = await Bun.file(claudeSettings).text();
	await Bun.write(defaultPath, content);
	return { created: true, defaultPath };
};

const getCurrentContext = async (
	manager: ContextManager,
): Promise<string | undefined> => {
	return manager.getCurrentContext();
};

const loadDefaultConfig = async (
	configsDir: string,
): Promise<Record<string, unknown>> => {
	const defaultPath = path.join(configsDir, "default.json");
	return readJsonIfExists<Record<string, unknown>>(defaultPath, {});
};

const importProfile = async (
	manager: ContextManager,
	profileName: string,
	merged: Record<string, unknown>,
): Promise<void> => {
	await manager.deleteContext(profileName).catch(() => undefined);
	const input = `${JSON.stringify(merged, null, 2)}\n`;
	await manager.importContextFromString(profileName, input);
};

const createDefaultProfileIfNeeded = async (
	manager: ContextManager,
	created: boolean,
	defaultProfile: Record<string, unknown>,
): Promise<void> => {
	if (!created) {
		return;
	}
	await importProfile(manager, "default", defaultProfile);
};

export const importFromCcs = async (
	manager: ContextManager,
	configsDir?: string,
): Promise<void> => {
	const ccsPath = ccsDir();
	if (!existsSync(ccsPath)) {
		throw new Error(`CCS directory not found: ${ccsPath}`);
	}
	console.log(`📥 Importing profiles from CCS settings...`);
	const dir = configsDir ?? defaultConfigsDir();
	const { created } = await ensureDefaultConfig(manager, dir);
	const defaultConfig = await loadDefaultConfig(dir);
	const defaultProfile = await readJsonIfExists<Record<string, unknown>>(
		path.join(dir, "default.json"),
		defaultConfig,
	);
	await createDefaultProfileIfNeeded(manager, created, defaultProfile);
	const currentContext = await manager.getCurrentContext();
	let entries: string[] = [];
	try {
		entries = readdirSync(ccsPath).filter((name) =>
			name.endsWith(".settings.json"),
		);
	} catch {
		entries = [];
	}
	let importedCount = 0;
	for (const fileName of entries) {
		const settingsPath = path.join(ccsPath, fileName);
		const profileName = fileName.replace(/\.settings\.json$/u, "");
		console.log(`  📦 Importing '${colors.cyan(profileName)}'...`);
		const settings = await readJson<Record<string, unknown>>(settingsPath);
		const merged = deepMerge(defaultConfig, settings);
		if (currentContext && currentContext === profileName) {
			await manager.unsetContext();
		}
		await importProfile(manager, profileName, merged);
		importedCount++;
	}
	if (currentContext) {
		await manager.switchContext(currentContext);
	}
	console.log(
		`✅ Imported ${colors.bold(colors.green(String(importedCount)))} profiles from CCS`,
	);
};
