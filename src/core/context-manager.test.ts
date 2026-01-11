import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SettingsLevel } from "../types/index.js";
import { ContextManager } from "./context-manager.js";

const tempRoot = path.join(tmpdir(), "ccst-tests");

const makePaths = (root: string, level: SettingsLevel) => {
	const claudeDir = path.join(root, ".claude");
	const contextsDir = path.join(claudeDir, "settings");
	if (level === "user") {
		return {
			contextsDir,
			settingsPath: path.join(claudeDir, "settings.json"),
			statePath: path.join(contextsDir, ".cctx-state.json"),
			settingsLevel: level,
		};
	}
	if (level === "project") {
		return {
			contextsDir,
			settingsPath: path.join(claudeDir, "settings.json"),
			statePath: path.join(contextsDir, ".cctx-state.json"),
			settingsLevel: level,
		};
	}
	return {
		contextsDir,
		settingsPath: path.join(claudeDir, "settings.local.json"),
		statePath: path.join(contextsDir, ".cctx-state.local.json"),
		settingsLevel: level,
	};
};

const createManager = (root: string): ContextManager => {
	return new ContextManager(makePaths(root, "user"));
};

beforeEach(() => {
	rmSync(tempRoot, { recursive: true, force: true });
	mkdirSync(tempRoot, { recursive: true });
});

afterEach(() => {
	rmSync(tempRoot, { recursive: true, force: true });
});

test("creates context from empty when no settings.json", async () => {
	const manager = createManager(tempRoot);
	await manager.createContext("alpha");
	const contextPath = path.join(tempRoot, ".claude", "settings", "alpha.json");
	const content = await Bun.file(contextPath).text();
	expect(content.trim()).toBe("{}");
});

test("switches context and updates settings.json", async () => {
	const manager = createManager(tempRoot);
	const contextPath = path.join(tempRoot, ".claude", "settings", "beta.json");
	writeFileSync(contextPath, '{"name":"beta"}');
	await manager.switchContext("beta");
	const settingsPath = path.join(tempRoot, ".claude", "settings.json");
	const settings = await Bun.file(settingsPath).text();
	expect(settings).toContain("beta");
});

test("importContextFromString validates json", async () => {
	const manager = createManager(tempRoot);
	await expect(manager.importContextFromString("gamma", "{")).rejects.toThrow(
		"invalid JSON",
	);
	await manager.importContextFromString("gamma", '{"ok":true}\n');
	const contextPath = path.join(tempRoot, ".claude", "settings", "gamma.json");
	expect(await Bun.file(contextPath).exists()).toBe(true);
});
