export type SettingsLevel = "user" | "project" | "local";

export type State = {
	current?: string;
	previous?: string;
};

export type MergeHistoryEntry = {
	source: string;
	mergedItems: string[];
	timestamp: string;
};

export type MergeHistory = MergeHistoryEntry[];
