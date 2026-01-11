import type { ContextManager } from "../core/context-manager.js";

export const createCommand = async (
	manager: ContextManager,
	name: string,
): Promise<void> => {
	await manager.createContext(name);
};
