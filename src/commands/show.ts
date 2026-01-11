import type { ContextManager } from "../core/context-manager.js";

export const showCommand = async (manager: ContextManager, name?: string): Promise<void> => {
  if (name) {
    await manager.showContext(name);
    return;
  }
  const current = await manager.getCurrentContext();
  if (!current) {
    throw new Error("error: no current context set");
  }
  await manager.showContext(current);
};
