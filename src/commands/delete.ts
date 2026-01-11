import type { ContextManager } from "../core/context-manager.js";

export const deleteCommand = async (manager: ContextManager, name?: string): Promise<void> => {
  if (name) {
    await manager.deleteContext(name);
    return;
  }
  await manager.interactiveDelete();
};
