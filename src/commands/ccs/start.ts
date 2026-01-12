import { spawn } from "node:child_process";
import { openSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import {
	ensureDaemonDir,
	getCcsExecutable,
	getLogPath,
	getProcessByPort,
	getRunningDaemonPid,
	isProcessRunning,
	killProcessTree,
	truncateFile,
	writePid,
} from "../../utils/daemon.js";

export type StartOptions = {
	force?: boolean;
	keepLogs?: boolean;
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
	if (!options?.keepLogs) {
		try {
			await truncateFile(logPath);
		} catch {
			console.warn(
				pc.yellow(
					`Warning: could not truncate log; continuing (logs will be appended): ${logPath}`,
				),
			);
		}
	}
	const ccsPath = getCcsExecutable();
	let pid: number | undefined;
	if (process.platform === "win32") {
		// VBScript is the ONLY reliable way to run a process completely hidden on Windows
		// WScript.Shell.Run with 0 = hidden window, False = don't wait
		// Redirect output to log file using cmd /c with shell redirection
		const escapedLogPath = logPath.replace(/\\/g, "\\\\");
		const vbsContent = `CreateObject("WScript.Shell").Run "cmd /c ${ccsPath} config >> ${escapedLogPath} 2>&1", 0, False`;
		const vbsPath = join(tmpdir(), `ccs-start-${Date.now()}.vbs`);
		await Bun.write(vbsPath, vbsContent);

		// Run the vbs file (wscript itself doesn't show a window)
		const proc = spawn("wscript", [vbsPath], {
			detached: true,
			stdio: "ignore",
			windowsHide: true,
		});
		proc.unref();

		// Clean up the vbs file after a short delay
		setTimeout(() => {
			try {
				unlinkSync(vbsPath);
			} catch { }
		}, 1000);

		// Poll for the port to become available
		// ccs config takes ~6s to start (5s CLIProxy timeout + dashboard startup)
		console.log(
			pc.dim("Starting CCS config daemon (this may take a few seconds)..."),
		);

		const maxWaitMs = 15000; // 15 seconds max
		const pollIntervalMs = 500;
		const startTime = Date.now();
		let foundPid: number | null = null;

		while (Date.now() - startTime < maxWaitMs) {
			foundPid = await getProcessByPort(3000);
			if (foundPid !== null) break;
			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		}

		if (foundPid === null) {
			console.log(pc.red("Failed to start CCS config daemon"));
			console.log(
				pc.dim("Check if ccs is installed: npm install -g @kaitranntt/ccs"),
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
