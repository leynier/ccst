import path from "node:path";
import { homedir } from "node:os";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import type { ContextManager } from "../../core/context-manager.js";
import { deepMerge } from "../../utils/deep-merge.js";
import { readJson, readJsonIfExists } from "../../utils/json.js";
import { colors } from "../../utils/colors.js";

const defaultConfigsDir = (): string => path.join(homedir(), ".ccst");

const ensureDefaultConfig = async (manager: ContextManager, configsDir: string): Promise<boolean> => {
  const defaultPath = path.join(configsDir, "default.json");
  if (existsSync(defaultPath)) {
    return false;
  }
  const currentContext = await manager.getCurrentContext();
  if (currentContext) {
    return false;
  }
  const claudeSettings = path.join(homedir(), ".claude", "settings.json");
  if (!existsSync(claudeSettings)) {
    return false;
  }
  mkdirSync(configsDir, { recursive: true });
  const content = await Bun.file(claudeSettings).text();
  await Bun.write(defaultPath, content);
  return true;
};

const loadDefaultConfig = async (configsDir: string): Promise<Record<string, unknown>> => {
  const defaultPath = path.join(configsDir, "default.json");
  return readJsonIfExists<Record<string, unknown>>(defaultPath, {});
};

const importProfile = async (manager: ContextManager, profileName: string, merged: Record<string, unknown>): Promise<void> => {
  await manager.deleteContext(profileName).catch(() => undefined);
  const input = `${JSON.stringify(merged, null, 2)}\n`;
  await manager.importContextFromString(profileName, input);
};

export const importFromConfigs = async (manager: ContextManager, configsDir?: string): Promise<void> => {
  const dir = configsDir ?? defaultConfigsDir();
  console.log(`📥 Importing profiles from configs directory...`);
  const created = await ensureDefaultConfig(manager, dir);
  const defaultConfig = await loadDefaultConfig(dir);
  const defaultProfile = await readJsonIfExists<Record<string, unknown>>(path.join(dir, "default.json"), defaultConfig);
  const currentContext = await manager.getCurrentContext();
  let entries: string[] = [];
  try {
    entries = readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch {
    entries = [];
  }
  let importedCount = 0;
  for (const fileName of entries) {
    const configPath = path.join(dir, fileName);
    const profileName = path.basename(fileName, ".json");
    const config = await readJson<Record<string, unknown>>(configPath);
    const merged = fileName === "default.json" ? config : deepMerge(defaultConfig, config);
    if (currentContext && currentContext === profileName) {
      await manager.unsetContext();
    }
    await importProfile(manager, profileName, merged);
    importedCount++;
  }
  if (created) {
    await importProfile(manager, "default", defaultProfile);
  }
  if (currentContext) {
    await manager.switchContext(currentContext);
  }
  console.log(`✅ Imported ${colors.bold(colors.green(String(importedCount)))} profiles from configs`);
};
