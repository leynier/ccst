import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import pc from "picocolors";
import {
	ensureDaemonDir,
	getCcsExecutable,
	getLogPath,
	getRunningDaemonPid,
	isProcessRunning,
	killProcessTree,
	writePid,
} from "../../utils/daemon.js";

export type StartOptions = {
	force?: boolean;
};

export const ccsStartCommand = async (
	options?: StartOptions,
): Promise<void> => {
	// Check if already running
	const existingPid = await getRunningDaemonPid();
	if (existingPid !== null && !options?.force) {
		console.log(
			pc.yellow(`CCS config daemon is already running (PID: ${existingPid})`),
		);
		console.log(pc.dim("Use --force to restart"));
		return;
	}
	// If force and running, stop first
	if (existingPid !== null && options?.force) {
		console.log(pc.dim(`Stopping existing daemon (PID: ${existingPid})...`));
		await killProcessTree(existingPid, true);
		// Wait for process to terminate
		const maxWait = 3000;
		const startTime = Date.now();
		while (Date.now() - startTime < maxWait) {
			if (!isProcessRunning(existingPid)) {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	ensureDaemonDir();
	const logPath = getLogPath();
	const ccsPath = getCcsExecutable();
	// Open log file for writing (append mode)
	const logFd = openSync(logPath, "a");
	// Spawn detached process
	// On Windows, use "start /B" to run without a visible console window
	const child =
		process.platform === "win32"
			? spawn("cmd", ["/c", "start", "/B", ccsPath, "config"], {
					detached: true,
					stdio: ["ignore", logFd, logFd],
					windowsHide: true,
				})
			: spawn(ccsPath, ["config"], {
					detached: true,
					stdio: ["ignore", logFd, logFd],
				});
	if (!child.pid) {
		console.log(pc.red("Failed to start CCS config daemon"));
		return;
	}
	await writePid(child.pid);
	// Unref to allow parent to exit independently
	child.unref();
	console.log(pc.green(`CCS config daemon started (PID: ${child.pid})`));
	console.log(pc.dim(`Logs: ${logPath}`));
	console.log(pc.dim("Run 'ccst ccs status' to check status"));
	console.log(pc.dim("Run 'ccst ccs logs' to view logs"));
};
