import { existsSync } from "node:fs";
import path from "node:path";
import type { MergeHistory, MergeHistoryEntry } from "../types/index.js";

const ensurePermissions = (
	json: Record<string, unknown>,
): { allow: string[]; deny: string[] } => {
	const permissions =
		(json.permissions as Record<string, unknown> | undefined) ?? {};
	const allow = Array.isArray(permissions.allow)
		? permissions.allow.slice()
		: [];
	const deny = Array.isArray(permissions.deny) ? permissions.deny.slice() : [];
	json.permissions = { ...permissions, allow, deny };
	return { allow, deny };
};

export const mergePermissions = (
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	sourceLabel: string,
): MergeHistoryEntry => {
	const { allow, deny } = ensurePermissions(target);
	const sourcePermissions =
		(source.permissions as Record<string, unknown> | undefined) ?? {};
	const sourceAllow = Array.isArray(sourcePermissions.allow)
		? sourcePermissions.allow
		: [];
	const sourceDeny = Array.isArray(sourcePermissions.deny)
		? sourcePermissions.deny
		: [];
	const mergedItems: string[] = [];
	const allowSet = new Set(allow);
	const denySet = new Set(deny);
	for (const item of sourceAllow) {
		if (!allowSet.has(item)) {
			allowSet.add(item);
			mergedItems.push(`permissions.allow:${item}`);
		}
	}
	for (const item of sourceDeny) {
		if (!denySet.has(item)) {
			denySet.add(item);
			mergedItems.push(`permissions.deny:${item}`);
		}
	}
	(target.permissions as Record<string, unknown>).allow = Array.from(allowSet);
	(target.permissions as Record<string, unknown>).deny = Array.from(denySet);
	return {
		source: sourceLabel,
		mergedItems,
		timestamp: new Date().toISOString(),
	};
};

export const mergeFull = (
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	sourceLabel: string,
): MergeHistoryEntry => {
	const mergedItems: string[] = [];
	const permEntry = mergePermissions(target, source, sourceLabel);
	mergedItems.push(...permEntry.mergedItems);
	const targetEnv = (target.env as Record<string, unknown> | undefined) ?? {};
	const sourceEnv = (source.env as Record<string, unknown> | undefined) ?? {};
	const nextEnv: Record<string, unknown> = { ...targetEnv };
	for (const [key, value] of Object.entries(sourceEnv)) {
		if (!(key in nextEnv)) {
			nextEnv[key] = value;
			mergedItems.push(`env:${key}`);
		}
	}
	if (Object.keys(nextEnv).length > 0) {
		target.env = nextEnv;
	}
	for (const [key, value] of Object.entries(source)) {
		if (key === "permissions" || key === "env") {
			continue;
		}
		if (!(key in target)) {
			target[key] = value;
			mergedItems.push(key);
		}
	}
	return {
		source: sourceLabel,
		mergedItems,
		timestamp: permEntry.timestamp,
	};
};

export const unmergePermissions = (
	target: Record<string, unknown>,
	history: MergeHistory,
	sourceLabel: string,
): MergeHistory => {
	const { allow, deny } = ensurePermissions(target);
	const allowSet = new Set(allow);
	const denySet = new Set(deny);
	const remainingHistory = history.filter(
		(entry) => entry.source !== sourceLabel,
	);
	const removedEntries = history.filter(
		(entry) => entry.source === sourceLabel,
	);
	for (const entry of removedEntries) {
		for (const item of entry.mergedItems) {
			if (item.startsWith("permissions.allow:")) {
				allowSet.delete(item.replace("permissions.allow:", ""));
			}
			if (item.startsWith("permissions.deny:")) {
				denySet.delete(item.replace("permissions.deny:", ""));
			}
		}
	}
	(target.permissions as Record<string, unknown>).allow = Array.from(allowSet);
	(target.permissions as Record<string, unknown>).deny = Array.from(denySet);
	return remainingHistory;
};

export const unmergeFull = (
	target: Record<string, unknown>,
	history: MergeHistory,
	sourceLabel: string,
): MergeHistory => {
	const remainingHistory = history.filter(
		(entry) => entry.source !== sourceLabel,
	);
	const removedEntries = history.filter(
		(entry) => entry.source === sourceLabel,
	);
	const targetEnv = (target.env as Record<string, unknown> | undefined) ?? {};
	for (const entry of removedEntries) {
		for (const item of entry.mergedItems) {
			if (
				item.startsWith("permissions.allow:") ||
				item.startsWith("permissions.deny:")
			) {
				continue;
			}
			if (item.startsWith("env:")) {
				const key = item.replace("env:", "");
				delete targetEnv[key];
				continue;
			}
			delete target[item];
		}
	}
	if (Object.keys(targetEnv).length > 0) {
		target.env = targetEnv;
	} else {
		delete target.env;
	}
	return unmergePermissions(target, remainingHistory, sourceLabel);
};

export const historyPath = (
	contextsDir: string,
	contextName: string,
): string => {
	return path.join(contextsDir, `.${contextName}-merge-history.json`);
};

export const loadHistory = async (
	contextsDir: string,
	contextName: string,
): Promise<MergeHistory> => {
	const filePath = historyPath(contextsDir, contextName);
	if (!existsSync(filePath)) {
		return [];
	}
	const text = await Bun.file(filePath).text();
	return JSON.parse(text) as MergeHistory;
};

export const saveHistory = async (
	contextsDir: string,
	contextName: string,
	history: MergeHistory,
): Promise<void> => {
	const filePath = historyPath(contextsDir, contextName);
	await Bun.write(filePath, `${JSON.stringify(history, null, 2)}\n`);
};

export const formatHistory = (
	contextName: string,
	history: MergeHistory,
): string => {
	if (history.length === 0) {
		return `No merge history for ${contextName}`;
	}
	const lines: string[] = [];
	lines.push(`📋 Merge history for context '${contextName}':`);
	lines.push("");
	for (const entry of history) {
		lines.push(`  📅 ${entry.timestamp}`);
		lines.push(`  📁 Source: ${entry.source}`);
		lines.push(`  📝 Merged ${entry.mergedItems.length} items`);
		lines.push("");
	}
	return lines.join("\n");
};
