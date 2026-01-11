import type { ContextManager } from "../core/context-manager.js";

export const switchCommand = async (manager: ContextManager, name: string): Promise<void> => {
  await manager.switchContext(name);
};

export const switchPreviousCommand = async (manager: ContextManager): Promise<void> => {
  await manager.switchToPrevious();
};
