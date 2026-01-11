import type { SettingsLevel } from "../types/index.js";

export const resolveSettingsLevel = (opts: { local?: boolean; inProject?: boolean }): SettingsLevel => {
  if (opts.local) {
    return "local";
  }
  if (opts.inProject) {
    return "project";
  }
  return "user";
};
