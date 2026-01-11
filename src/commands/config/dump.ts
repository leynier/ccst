import { resolve } from "node:path";
import JSZip from "jszip";
import pc from "picocolors";
import {
	getAllBackupFilePaths,
	getRelativePath,
} from "../../utils/ccs-paths.js";

const DEFAULT_OUTPUT = "ccs-config.zip";

export const configDumpCommand = async (outputPath?: string): Promise<void> => {
	const output = resolve(outputPath ?? DEFAULT_OUTPUT);
	const files = getAllBackupFilePaths();
	if (files.length === 0) {
		console.log(pc.yellow("No CCS configuration files found to backup"));
		return;
	}
	const zip = new JSZip();
	for (const filePath of files) {
		try {
			const relativePath = getRelativePath(filePath);
			const content = await Bun.file(filePath).arrayBuffer();
			zip.file(relativePath, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to read ${filePath}: ${message}`);
		}
	}
	try {
		const zipContent = await zip.generateAsync({ type: "uint8array" });
		await Bun.write(output, zipContent);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to write ${output}: ${message}`);
	}
	console.log(pc.green(`Exported ${files.length} files to ${output}`));
	for (const filePath of files) {
		console.log(pc.dim(`  - ${getRelativePath(filePath)}`));
	}
};
