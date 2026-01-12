import pc from "picocolors";
import {
	getPortsToKill,
	getRunningDaemonPid,
	isProcessRunning,
	killProcessByPort,
	killProcessTree,
	removePid,
	removePorts,
} from "../../utils/daemon.js";
import {
	getRunningWatcherPid,
	stopWatcher,
} from "../../utils/watcher-daemon.js";

export type StopOptions = {
	force?: boolean;
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

	// Stop file watcher
	const watcherPid = await getRunningWatcherPid();
	if (watcherPid !== null) {
		const watcherStopped = await stopWatcher(options?.force);
		if (watcherStopped) {
			console.log(pc.dim(`File watcher stopped (PID: ${watcherPid})`));
		}
	}

	if (!stopped) {
		console.log(pc.yellow("CCS config daemon is not running"));
	}
};
