import type { State } from "../types/index.js";
import { readJsonIfExists, writeJson } from "../utils/json.js";

export const loadState = async (statePath: string): Promise<State> => {
	return readJsonIfExists<State>(statePath, {});
};

export const saveState = async (
	statePath: string,
	state: State,
): Promise<void> => {
	await writeJson(statePath, state);
};
