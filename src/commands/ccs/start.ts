import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import pc from "picocolors";
import {
	ensureDaemonDir,
	getCcsExecutable,
	getLogPath,
	getProcessByPort,
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
	let pid: number | undefined;
	if (process.platform === "win32") {
		// On Windows, use cmd /c start /B to launch without creating a new window
		// This works with npm-installed .cmd wrappers that create their own console
		const proc = spawn("cmd", ["/c", `start /B "" "${ccsPath}" config`], {
			stdio: "ignore",
			windowsHide: true,
			detached: true,
		});
		proc.unref();

		// Wait for the process to start, then find it by port
		console.log(pc.dim("Starting CCS config daemon..."));
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Find the process by port 3000 (dashboard port)
		const foundPid = await getProcessByPort(3000);
		if (foundPid === null) {
			console.log(pc.red("Failed to start CCS config daemon"));
			console.log(
				pc.dim("Check if ccs is installed: npm install -g @anthropic/ccs"),
			);
			return;
		}
		pid = foundPid;
	} else {
		// On Unix, use regular spawn with detached mode
		const logFd = openSync(logPath, "a");
		const child = spawn(ccsPath, ["config"], {
			detached: true,
			stdio: ["ignore", logFd, logFd],
		});
		if (!child.pid) {
			console.log(pc.red("Failed to start CCS config daemon"));
			return;
		}
		pid = child.pid;
		child.unref();
	}
	await writePid(pid);
	console.log(pc.green(`CCS config daemon started (PID: ${pid})`));
	console.log(pc.dim(`Logs: ${logPath}`));
	console.log(pc.dim("Run 'ccst ccs status' to check status"));
	console.log(pc.dim("Run 'ccst ccs logs' to view logs"));
};
