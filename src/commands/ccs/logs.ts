import { existsSync, unwatchFile, watchFile } from "node:fs";
import pc from "picocolors";
import { getLogPath } from "../../utils/daemon.js";

export type LogsOptions = {
	follow?: boolean;
	lines?: number;
};

export const ccsLogsCommand = async (options?: LogsOptions): Promise<void> => {
	const logPath = getLogPath();
	if (!existsSync(logPath)) {
		console.log(pc.yellow("No log file found"));
		console.log(pc.dim(`Expected at: ${logPath}`));
		return;
	}
	const lines = options?.lines ?? 50;
	const follow = options?.follow ?? false;
	// On Unix, use native tail for better performance
	if (process.platform !== "win32" && follow) {
		const tailProcess = Bun.spawn(
			["tail", "-f", "-n", String(lines), logPath],
			{
				stdout: "inherit",
				stderr: "inherit",
			},
		);
		// Handle cleanup on Ctrl+C
		const cleanup = () => {
			tailProcess.kill();
			process.exit(0);
		};
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		await tailProcess.exited;
		return;
	}
	// Read last N lines
	const content = await Bun.file(logPath).text();
	const allLines = content.split("\n");
	const lastLines = allLines.slice(-lines).join("\n");
	console.log(lastLines);
	if (!follow) {
		return;
	}
	// Follow mode for Windows: watch for changes
	console.log(pc.dim("--- Following log file (Ctrl+C to stop) ---"));
	let lastSize = (await Bun.file(logPath).stat()).size;
	// Handle graceful shutdown
	const cleanup = () => {
		unwatchFile(logPath);
		process.exit(0);
	};
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
	// Watch file for changes
	watchFile(logPath, { interval: 500 }, async (curr) => {
		if (curr.size > lastSize) {
			// Read new content
			const file = Bun.file(logPath);
			const newContent = await file.slice(lastSize).text();
			process.stdout.write(newContent);
			lastSize = curr.size;
		} else if (curr.size < lastSize) {
			// File was truncated/rotated
			console.log(pc.dim("--- Log file rotated ---"));
			const newContent = await Bun.file(logPath).text();
			process.stdout.write(newContent);
			lastSize = curr.size;
		}
	});
	// Keep process alive
	await new Promise(() => {});
};
