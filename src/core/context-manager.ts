import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { SettingsLevel } from "../types/index.js";
import { colors } from "../utils/colors.js";
import { readJson, writeJson } from "../utils/json.js";
import type { Paths } from "../utils/paths.js";
import {
	formatHistory,
	loadHistory,
	mergeFull,
	mergePermissions,
	saveHistory,
	unmergeFull,
	unmergePermissions,
} from "./merge-manager.js";
import { loadState } from "./state.js";

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

	public async getCurrentContext(): Promise<string | undefined> {
		const state = await loadState(this.statePath);
		return state.current;
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
		_source: string,
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
}
