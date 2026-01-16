import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";

// Cross-platform CCS home directory
export const getCcsHome = (): string => join(homedir(), ".ccs");

// File patterns to backup
export type CcsBackupFiles = {
	config: string | null;
	settingsProfiles: string[];
	cliproxyAccounts: string | null;
	cliproxyConfig: string | null;
	cliproxyAuthFiles: string[];
};

// Helper to safely read directory contents
const safeReaddirSync = (dirPath: string): string[] => {
	try {
		return readdirSync(dirPath);
	} catch {
		return [];
	}
};

// Get all files to backup from CCS directory
export const getCcsBackupFiles = (): CcsBackupFiles => {
	const ccsHome = getCcsHome();
	const result: CcsBackupFiles = {
		config: null,
		settingsProfiles: [],
		cliproxyAccounts: null,
		cliproxyConfig: null,
		cliproxyAuthFiles: [],
	};
	if (!existsSync(ccsHome)) {
		return result;
	}
	// config.yaml
	const configPath = join(ccsHome, "config.yaml");
	if (existsSync(configPath)) {
		result.config = configPath;
	}
	// *.settings.json profiles
	const rootFiles = safeReaddirSync(ccsHome);
	for (const file of rootFiles) {
		if (file.endsWith(".settings.json")) {
			result.settingsProfiles.push(join(ccsHome, file));
		}
	}
	// cliproxy files
	const cliproxyDir = join(ccsHome, "cliproxy");
	if (existsSync(cliproxyDir)) {
		const accountsPath = join(cliproxyDir, "accounts.json");
		if (existsSync(accountsPath)) {
			result.cliproxyAccounts = accountsPath;
		}
		const configPath = join(cliproxyDir, "config.yaml");
		if (existsSync(configPath)) {
			result.cliproxyConfig = configPath;
		}
		// cliproxy/auth/*.json
		const authDir = join(cliproxyDir, "auth");
		if (existsSync(authDir)) {
			const authFiles = safeReaddirSync(authDir);
			for (const file of authFiles) {
				if (file.endsWith(".json")) {
					result.cliproxyAuthFiles.push(join(authDir, file));
				}
			}
		}
	}
	return result;
};

// Get relative path from CCS home for zip storage (always use forward slashes)
export const getRelativePath = (absolutePath: string): string => {
	const ccsHome = getCcsHome();
	const relativePath = relative(ccsHome, absolutePath);
	// Convert to forward slashes for zip compatibility (works on all platforms)
	return relativePath.replace(/\\/g, "/");
};

// Ensure directory exists for a file path (cross-platform)
export const ensureDirectoryExists = (filePath: string): void => {
	const dir = dirname(filePath);
	// Skip if directory is current directory or already exists
	if (!dir || dir === "." || dir === filePath) {
		return;
	}
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
};

// Get all backup file paths as a flat array
export const getAllBackupFilePaths = (): string[] => {
	const files = getCcsBackupFiles();
	const paths: string[] = [];
	if (files.config) {
		paths.push(files.config);
	}
	paths.push(...files.settingsProfiles);
	if (files.cliproxyAccounts) {
		paths.push(files.cliproxyAccounts);
	}
	if (files.cliproxyConfig) {
		paths.push(files.cliproxyConfig);
	}
	paths.push(...files.cliproxyAuthFiles);
	return paths;
};

// Get files that would be deleted in replace mode
export const getFilesToDelete = (): {
	profiles: string[];
	authFiles: string[];
} => {
	const files = getCcsBackupFiles();
	return {
		profiles: files.settingsProfiles,
		authFiles: files.cliproxyAuthFiles,
	};
};
