import type { ContextManager } from "../core/context-manager.js";

export const editCommand = async (
	manager: ContextManager,
	name?: string,
): Promise<void> => {
	if (name) {
		await manager.editContext(name);
		return;
	}
	const current = await manager.getCurrentContext();
	if (!current) {
		throw new Error("error: no current context set");
	}
	await manager.editContext(current);
};
