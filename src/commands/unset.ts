import type { ContextManager } from "../core/context-manager.js";

export const unsetCommand = async (manager: ContextManager): Promise<void> => {
  await manager.unsetContext();
};
