import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import type { SettingsLevel } from "../types/index.js";
import { colors } from "../utils/colors.js";
import { readJson, writeJson } from "../utils/json.js";
import type { Paths } from "../utils/paths.js";
import { hasLocalContexts, hasProjectContexts } from "../utils/paths.js";
import {
	formatHistory,
	loadHistory,
	mergeFull,
	mergePermissions,
	saveHistory,
	unmergeFull,
	unmergePermissions,
} from "./merge-manager.js";
import { loadState, saveState, setCurrent, unsetCurrent } from "./state.js";

export class ContextManager {
	public readonly contextsDir: string;
	public readonly settingsPath: string;
	public readonly statePath: string;
	public readonly settingsLevel: SettingsLevel;

	public constructor(paths: Paths) {
		this.contextsDir = paths.contextsDir;
		this.settingsPath = paths.settingsPath;
		this.statePath = paths.statePath;
		this.settingsLevel = paths.settingsLevel;
		mkdirSync(this.contextsDir, { recursive: true });
	}

	public contextPath(name: string): string {
		return path.join(this.contextsDir, `${name}.json`);
	}

	public async listContexts(): Promise<string[]> {
		let entries: string[] = [];
		try {
			entries = readdirSync(this.contextsDir);
		} catch {
			entries = [];
		}
		const contexts = entries
			.filter((name) => name.endsWith(".json") && !name.startsWith("."))
			.map((name) => name.replace(/\.json$/u, ""));
		contexts.sort();
		return contexts;
	}

	public async getCurrentContext(): Promise<string | undefined> {
		const state = await loadState(this.statePath);
		return state.current;
	}

	public async switchContext(name: string): Promise<void> {
		const contexts = await this.listContexts();
		if (!contexts.includes(name)) {
			throw new Error(`error: no context exists with the name "${name}"`);
		}
		const state = await loadState(this.statePath);
		const nextState = setCurrent(state, name);
		const content = await Bun.file(this.contextPath(name)).text();
		mkdirSync(path.dirname(this.settingsPath), { recursive: true });
		await Bun.write(this.settingsPath, content);
		await saveState(this.statePath, nextState);
		console.log(`Switched to context "${colors.bold(colors.green(name))}"`);
	}

	public async switchToPrevious(): Promise<void> {
		const state = await loadState(this.statePath);
		if (!state.previous) {
			throw new Error("error: no previous context");
		}
		await this.switchContext(state.previous);
	}

	public async createContext(name: string): Promise<void> {
		this.validateContextName(name);
		const contexts = await this.listContexts();
		if (contexts.includes(name)) {
			throw new Error(`error: context "${name}" already exists`);
		}
		const contextPath = this.contextPath(name);
		if (existsSync(this.settingsPath)) {
			await Bun.write(contextPath, await Bun.file(this.settingsPath).text());
			console.log(
				`Context "${colors.bold(colors.green(name))}" created from current settings`,
			);
			return;
		}
		await writeJson(contextPath, {});
		console.log(`Context "${colors.bold(colors.green(name))}" created (empty)`);
	}

	public async deleteContext(name: string): Promise<void> {
		const state = await loadState(this.statePath);
		if (state.current === name) {
			throw new Error(`error: cannot delete the active context "${name}"`);
		}
		const contextPath = this.contextPath(name);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${name}"`);
		}
		await Bun.remove(contextPath);
		if (state.previous === name) {
			const next = { ...state };
			delete next.previous;
			await saveState(this.statePath, next);
		}
		console.log(`Context "${colors.red(name)}" deleted`);
	}

	public async renameContext(oldName: string, newName: string): Promise<void> {
		this.validateContextName(newName);
		const contexts = await this.listContexts();
		if (!contexts.includes(oldName)) {
			throw new Error(`error: no context exists with the name "${oldName}"`);
		}
		if (contexts.includes(newName)) {
			throw new Error(`error: context "${newName}" already exists`);
		}
		const oldPath = this.contextPath(oldName);
		const newPath = this.contextPath(newName);
		await Bun.rename(oldPath, newPath);
		const state = await loadState(this.statePath);
		let updated = false;
		const next: typeof state = { ...state };
		if (next.current === oldName) {
			next.current = newName;
			updated = true;
		}
		if (next.previous === oldName) {
			next.previous = newName;
			updated = true;
		}
		if (updated) {
			await saveState(this.statePath, next);
		}
		console.log(
			`Context "${oldName}" renamed to "${colors.bold(colors.green(newName))}"`,
		);
	}

	public async showContext(name: string): Promise<void> {
		const contextPath = this.contextPath(name);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${name}"`);
		}
		const json = await readJson<Record<string, unknown>>(contextPath);
		console.log(JSON.stringify(json, null, 2));
	}

	public async editContext(name: string): Promise<void> {
		const contextPath = this.contextPath(name);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${name}"`);
		}
		const editor = process.env.EDITOR || process.env.VISUAL || "vi";
		const status = spawnSync(editor, [contextPath], { stdio: "inherit" });
		if (status.status !== 0) {
			throw new Error("error: editor exited with non-zero status");
		}
	}

	public async exportContext(name: string): Promise<void> {
		const contextPath = this.contextPath(name);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${name}"`);
		}
		const content = await Bun.file(contextPath).text();
		process.stdout.write(content);
	}

	public async importContext(name: string): Promise<void> {
		const input = await new Response(process.stdin).text();
		await this.importContextFromString(name, input);
	}

	public async importContextFromString(
		name: string,
		input: string,
	): Promise<void> {
		this.validateContextName(name);
		const contexts = await this.listContexts();
		if (contexts.includes(name)) {
			throw new Error(`error: context "${name}" already exists`);
		}
		try {
			JSON.parse(input);
		} catch {
			throw new Error("error: invalid JSON input");
		}
		await Bun.write(this.contextPath(name), input);
		console.log(`Context "${colors.bold(colors.green(name))}" imported`);
	}

	public async unsetContext(): Promise<void> {
		if (existsSync(this.settingsPath)) {
			await Bun.remove(this.settingsPath);
		}
		const state = await loadState(this.statePath);
		const { state: next } = unsetCurrent(state);
		await saveState(this.statePath, next);
		console.log("Unset current context");
	}

	public async listContextsWithCurrent(quiet: boolean): Promise<void> {
		const contexts = await this.listContexts();
		const current = await this.getCurrentContext();
		if (quiet) {
			if (current) {
				console.log(current);
			}
			return;
		}
		if (this.settingsLevel === "user") {
			if (hasProjectContexts()) {
				console.log(
					`💡 Project contexts available: run 'ccst --in-project' to manage`,
				);
			}
			if (hasLocalContexts()) {
				console.log(
					`💡 Local contexts available: run 'ccst --local' to manage`,
				);
			}
		}
		if (contexts.length === 0) {
			const label =
				this.settingsLevel === "user"
					? "👤 User"
					: this.settingsLevel === "project"
						? "📁 Project"
						: "💻 Local";
			console.log(
				`${label} contexts: No contexts found. Create one with: ccst -n <name>`,
			);
			return;
		}
		const label =
			this.settingsLevel === "user"
				? "👤 User"
				: this.settingsLevel === "project"
					? "📁 Project"
					: "💻 Local";
		console.log(`${colors.bold(colors.cyan(label))} contexts:`);
		for (const ctx of contexts) {
			if (ctx === current) {
				console.log(
					`  ${colors.bold(colors.green(ctx))} ${colors.dim("(current)")}`,
				);
			} else {
				console.log(`  ${ctx}`);
			}
		}
	}

	public async interactiveSelect(): Promise<void> {
		const { selectContext } = await import("../utils/interactive.js");
		const contexts = await this.listContexts();
		if (contexts.length === 0) {
			console.log("No contexts found");
			return;
		}
		const current = await this.getCurrentContext();
		const selected = await selectContext(contexts, current);
		if (!selected || selected === current) {
			return;
		}
		await this.switchContext(selected);
	}

	public async interactiveDelete(): Promise<void> {
		const { selectContext } = await import("../utils/interactive.js");
		const contexts = await this.listContexts();
		if (contexts.length === 0) {
			console.log("No contexts found");
			return;
		}
		const current = await this.getCurrentContext();
		const selected = await selectContext(contexts, current);
		if (!selected) {
			return;
		}
		await this.deleteContext(selected);
	}

	public async interactiveRename(): Promise<void> {
		const { selectContext, promptInput } = await import(
			"../utils/interactive.js"
		);
		const contexts = await this.listContexts();
		if (contexts.length === 0) {
			console.log("No contexts found");
			return;
		}
		const current = await this.getCurrentContext();
		const selected = await selectContext(contexts, current);
		if (!selected) {
			return;
		}
		const newName = await promptInput("New name");
		if (!newName) {
			return;
		}
		await this.renameContext(selected, newName);
	}

	public async interactiveCreateContext(): Promise<void> {
		const { promptInput } = await import("../utils/interactive.js");
		const name = await promptInput("Context name");
		if (!name) {
			return;
		}
		await this.createContext(name);
	}

	public async mergeFrom(
		target: string,
		source: string,
		mergeFullFlag: boolean,
	): Promise<void> {
		if (mergeFullFlag) {
			await this.mergeFromFull(target, source);
			return;
		}
		const { targetPath, targetJson, sourceJson } = await this.getMergePayload(
			target,
			source,
		);
		const entry = mergePermissions(targetJson, sourceJson, source);
		await writeJson(targetPath, targetJson);
		await this.appendHistory(target, entry);
		console.log(
			`✅ Merged ${entry.mergedItems.length} permissions from '${colors.green(source)}' into '${colors.bold(colors.green(target))}'`,
		);
	}

	public async mergeFromFull(target: string, source: string): Promise<void> {
		const { targetPath, targetJson, sourceJson } = await this.getMergePayload(
			target,
			source,
		);
		const entry = mergeFull(targetJson, sourceJson, source);
		await writeJson(targetPath, targetJson);
		await this.appendHistory(target, entry);
		console.log(
			`✅ Full merge completed: ${entry.mergedItems.length} items from '${colors.green(source)}' into '${colors.bold(colors.green(target))}'`,
		);
	}

	public async unmergeFrom(
		target: string,
		source: string,
		mergeFullFlag: boolean,
	): Promise<void> {
		if (mergeFullFlag) {
			await this.unmergeFromFull(target, source);
			return;
		}
		const { targetPath, targetJson, contextName } =
			await this.getUnmergePayload(target, source);
		const entries = await loadHistory(this.contextsDir, contextName);
		const nextEntries = unmergePermissions(targetJson, entries, source);
		await writeJson(targetPath, targetJson);
		await saveHistory(this.contextsDir, contextName, nextEntries);
		console.log(
			`✅ Removed permissions previously merged from '${colors.red(source)}' in '${colors.bold(colors.green(target))}'`,
		);
	}

	public async unmergeFromFull(target: string, source: string): Promise<void> {
		const { targetPath, targetJson, contextName } =
			await this.getUnmergePayload(target, source);
		const entries = await loadHistory(this.contextsDir, contextName);
		const nextEntries = unmergeFull(targetJson, entries, source);
		await writeJson(targetPath, targetJson);
		await saveHistory(this.contextsDir, contextName, nextEntries);
		console.log(
			`✅ Removed all settings previously merged from '${colors.red(source)}' in '${colors.bold(colors.green(target))}'`,
		);
	}

	public async showMergeHistory(name?: string): Promise<void> {
		const contextName = name ?? (await this.getCurrentContext());
		if (!contextName) {
			throw new Error("error: no current context set");
		}
		const entries = await loadHistory(this.contextsDir, contextName);
		console.log(formatHistory(contextName, entries));
	}

	private async getMergePayload(
		target: string,
		source: string,
	): Promise<{
		targetPath: string;
		targetJson: Record<string, unknown>;
		sourceJson: Record<string, unknown>;
	}> {
		const targetPath = await this.resolveTargetPath(target);
		const targetJson = await readJson<Record<string, unknown>>(targetPath);
		const sourceJson = await this.resolveSourceJson(source);
		return { targetPath, targetJson, sourceJson };
	}

	private async getUnmergePayload(
		target: string,
		source: string,
	): Promise<{
		targetPath: string;
		targetJson: Record<string, unknown>;
		contextName: string;
	}> {
		const targetPath = await this.resolveTargetPath(target);
		const targetJson = await readJson<Record<string, unknown>>(targetPath);
		const contextName =
			target === "current"
				? ((await this.getCurrentContext()) ?? "current")
				: target;
		return { targetPath, targetJson, contextName };
	}

	private async resolveTargetPath(target: string): Promise<string> {
		if (target === "current") {
			if (!existsSync(this.settingsPath)) {
				throw new Error("error: no current context is set");
			}
			return this.settingsPath;
		}
		const contextPath = this.contextPath(target);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${target}"`);
		}
		return contextPath;
	}

	private async resolveSourceJson(
		source: string,
	): Promise<Record<string, unknown>> {
		if (source === "user") {
			const homeSettings = path.join(
				path.dirname(path.dirname(this.contextsDir)),
				"settings.json",
			);
			if (!existsSync(homeSettings)) {
				throw new Error(
					`error: user settings file not found at ${homeSettings}`,
				);
			}
			return readJson<Record<string, unknown>>(homeSettings);
		}
		if (source.endsWith(".json")) {
			if (!existsSync(source)) {
				throw new Error(`error: source file not found at ${source}`);
			}
			return readJson<Record<string, unknown>>(source);
		}
		const contextPath = this.contextPath(source);
		if (!existsSync(contextPath)) {
			throw new Error(`error: no context exists with the name "${source}"`);
		}
		return readJson<Record<string, unknown>>(contextPath);
	}

	private async appendHistory(
		target: string,
		entry: ReturnType<typeof mergePermissions>,
	): Promise<void> {
		const contextName =
			target === "current"
				? ((await this.getCurrentContext()) ?? "current")
				: target;
		const history = await loadHistory(this.contextsDir, contextName);
		history.push(entry);
		await saveHistory(this.contextsDir, contextName, history);
	}

	private validateContextName(name: string): void {
		if (
			!name ||
			name === "-" ||
			name === "." ||
			name === ".." ||
			name.includes("/")
		) {
			throw new Error(`error: invalid context name "${name}"`);
		}
	}
}
