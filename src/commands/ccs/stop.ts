import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import {
	getDaemonDir,
	getPortsToKill,
	getRunningDaemonPid,
	isProcessRunning,
	killProcessByPort,
	killProcessTree,
	removePid,
	removePorts,
} from "../../utils/daemon.js";

export type StopOptions = {
	force?: boolean;
};

// Helper to clean up orphaned watcher from v1.x upgrades
const cleanupLegacyWatcher = async (force?: boolean): Promise<boolean> => {
	const watcherPidPath = join(getDaemonDir(), "watcher.pid");
	if (!existsSync(watcherPidPath)) {
		return false;
	}

	try {
		const content = await Bun.file(watcherPidPath).text();
		const pid = Number.parseInt(content.trim(), 10);

		if (Number.isFinite(pid) && pid > 0 && isProcessRunning(pid)) {
			await killProcessTree(pid, force);
			// Wait for process to terminate
			const maxWait = force ? 1000 : 3000;
			const startTime = Date.now();
			while (Date.now() - startTime < maxWait) {
				if (!isProcessRunning(pid)) {
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			unlinkSync(watcherPidPath);
			console.log(pc.dim(`Cleaned up legacy file watcher (PID: ${pid})`));
			return true;
		}
		// Stale PID file - just remove it
		unlinkSync(watcherPidPath);
		return false;
	} catch {
		// Failed to read or parse - try to remove the file anyway
		try {
			unlinkSync(watcherPidPath);
		} catch {
			// Ignore cleanup errors
		}
		return false;
	}
};

export const ccsStopCommand = async (options?: StopOptions): Promise<void> => {
	const pid = await getRunningDaemonPid();
	let stopped = false;
	// Phase 1: Kill by PID if exists
	if (pid !== null) {
		await killProcessTree(pid, options?.force);
		// Wait for process to terminate (with timeout)
		const maxWait = options?.force ? 1000 : 5000;
		const startTime = Date.now();
		while (Date.now() - startTime < maxWait) {
			if (!isProcessRunning(pid)) {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		removePid();
		console.log(pc.green(`CCS config daemon stopped (PID: ${pid})`));
		stopped = true;
	}
	// Phase 2: Kill processes by port (especially important on Windows)
	// Use saved ports or fallback to defaults
	const ports = await getPortsToKill();
	for (const port of ports) {
		const killed = await killProcessByPort(port, options?.force ?? true);
		if (killed) {
			console.log(pc.dim(`Cleaned up process on port ${port}`));
			stopped = true;
		}
	}
	// Clean up ports file
	removePorts();

	// Phase 3: Clean up any orphaned watcher from v1.x upgrades
	const watcherStopped = await cleanupLegacyWatcher(options?.force);
	if (watcherStopped) {
		stopped = true;
	}

	if (!stopped) {
		console.log(pc.yellow("CCS config daemon is not running"));
	}
};
