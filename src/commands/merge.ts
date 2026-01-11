import type { ContextManager } from "../core/context-manager.js";

export const mergeCommand = async (
	manager: ContextManager,
	source?: string,
	target?: string,
	mergeFull?: boolean,
): Promise<void> => {
	if (!source) {
		throw new Error("error: source required for merge");
	}
	await manager.mergeFrom(target ?? "current", source, Boolean(mergeFull));
};

export const unmergeCommand = async (
	manager: ContextManager,
	source?: string,
	target?: string,
	mergeFull?: boolean,
): Promise<void> => {
	if (!source) {
		throw new Error("error: source required for unmerge");
	}
	await manager.unmergeFrom(target ?? "current", source, Boolean(mergeFull));
};

export const mergeHistoryCommand = async (
	manager: ContextManager,
	target?: string,
): Promise<void> => {
	await manager.showMergeHistory(target);
};
