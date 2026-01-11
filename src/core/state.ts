import type { State } from "../types/index.js";
import { readJsonIfExists, writeJson } from "../utils/json.js";

export const loadState = async (statePath: string): Promise<State> => {
  return readJsonIfExists<State>(statePath, {});
};

export const saveState = async (statePath: string, state: State): Promise<void> => {
  await writeJson(statePath, state);
};

export const setCurrent = (state: State, context: string): State => {
  const next: State = { ...state };
  if (next.current && next.current !== context) {
    next.previous = next.current;
  }
  next.current = context;
  return next;
};

export const unsetCurrent = (state: State): { state: State; previous?: string } => {
  const next: State = { ...state };
  const current = next.current;
  delete next.current;
  if (current) {
    next.previous = current;
  }
  return { state: next, previous: current };
};
