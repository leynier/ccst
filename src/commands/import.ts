import type { ContextManager } from "../core/context-manager.js";

export const importCommand = async (manager: ContextManager, name?: string): Promise<void> => {
  if (!name) {
    throw new Error("error: context name required for import");
  }
  await manager.importContext(name);
};
