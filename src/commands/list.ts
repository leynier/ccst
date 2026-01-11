import type { ContextManager } from "../core/context-manager.js";

export const listCommand = async (manager: ContextManager, quiet: boolean): Promise<void> => {
  await manager.listContextsWithCurrent(quiet);
};
