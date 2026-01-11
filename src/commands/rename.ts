import type { ContextManager } from "../core/context-manager.js";

export const renameCommand = async (
	manager: ContextManager,
	name?: string,
): Promise<void> => {
	if (name) {
		const { promptInput } = await import("../utils/interactive.js");
		const input = await promptInput("New name");
		if (!input) {
			throw new Error("error: new name required");
		}
		await manager.renameContext(name, input);
		return;
	}
	await manager.interactiveRename();
};
