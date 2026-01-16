import { existsSync, unlinkSync } from "node:fs";
import path, { join, normalize, resolve } from "node:path";
import JSZip from "jszip";
import pc from "picocolors";
import {
	ensureDirectoryExists,
	getCcsHome,
	getFilesToDelete,
} from "../../utils/ccs-paths.js";

const DEFAULT_INPUT = "ccs-config.zip";

type LoadOptions = {
	replace?: boolean;
	yes?: boolean;
};

const confirmReplace = async (
	profiles: string[],
	authFiles: string[],
): Promise<boolean> => {
	const totalFiles = profiles.length + authFiles.length;
	if (totalFiles === 0) {
		return true;
	}
	console.log(pc.yellow("\nThe following files will be deleted:"));
	if (profiles.length > 0) {
		console.log(pc.dim("\nProfiles:"));
		for (const file of profiles) {
			console.log(pc.red(`  - ${file}`));
		}
	}
	if (authFiles.length > 0) {
		console.log(pc.dim("\nAuth files:"));
		for (const file of authFiles) {
			console.log(pc.red(`  - ${file}`));
		}
	}
	console.log();
	// Dynamic import for interactive prompt
	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolvePromise) => {
		rl.question(
			pc.yellow(`Delete ${totalFiles} files and replace? [y/N] `),
			(answer) => {
				rl.close();
				resolvePromise(answer.toLowerCase() === "y");
			},
		);
	});
};

export const configLoadCommand = async (
	inputPath?: string,
	options?: LoadOptions,
): Promise<void> => {
	const input = resolve(inputPath ?? DEFAULT_INPUT);
	if (!existsSync(input)) {
		throw new Error(`File not found: ${input}`);
	}
	const zipData = await Bun.file(input).arrayBuffer();
	const zip = await JSZip.loadAsync(zipData);
	const fileEntries = Object.keys(zip.files).filter((name) => {
		const file = zip.files[name];
		return file && !file.dir;
	});
	if (fileEntries.length === 0) {
		console.log(pc.yellow("No files found in zip archive"));
		return;
	}
	const ccsHome = getCcsHome();
	// Handle replace mode
	if (options?.replace) {
		const { profiles, authFiles } = getFilesToDelete();
		if (!options.yes) {
			const confirmed = await confirmReplace(profiles, authFiles);
			if (!confirmed) {
				console.log(pc.dim("Operation cancelled"));
				return;
			}
		}
		// Delete existing files
		for (const file of [...profiles, ...authFiles]) {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		}
		if (profiles.length + authFiles.length > 0) {
			console.log(
				pc.dim(`Deleted ${profiles.length + authFiles.length} existing files`),
			);
		}
	}
	// Extract files
	let extractedCount = 0;
	for (const relativePath of fileEntries) {
		// Normalize path: zip files always use forward slashes
		// Convert to platform-specific separators for Windows compatibility
		const normalizedPath = relativePath.replace(/\//g, path.sep);
		const absolutePath = join(ccsHome, normalizedPath);
		// Validate path is within ccsHome (prevent path traversal attacks)
		// Normalize both paths for consistent comparison on Windows
		const normalizedAbsolute = normalize(absolutePath);
		const normalizedCcsHome = normalize(ccsHome);
		if (!normalizedAbsolute.startsWith(normalizedCcsHome)) {
			console.warn(pc.yellow(`Skipping suspicious path: ${relativePath}`));
			continue;
		}
		const zipFile = zip.files[relativePath];
		if (!zipFile) {
			continue;
		}
		const fileData = await zipFile.async("uint8array");
		ensureDirectoryExists(normalizedAbsolute);
		await Bun.write(normalizedAbsolute, fileData);
		extractedCount++;
	}
	console.log(pc.green(`Imported ${extractedCount} files from ${input}`));
	for (const relativePath of fileEntries) {
		console.log(pc.dim(`  - ${relativePath}`));
	}
};
