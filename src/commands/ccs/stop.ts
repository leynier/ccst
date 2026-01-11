import pc from "picocolors";
import {
	CCS_PORTS,
	getRunningDaemonPid,
	isProcessRunning,
	killProcessByPort,
	killProcessTree,
	removePid,
} from "../../utils/daemon.js";

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
	for (const port of CCS_PORTS) {
		const killed = await killProcessByPort(port, options?.force ?? true);
		if (killed) {
			console.log(pc.dim(`Cleaned up process on port ${port}`));
			stopped = true;
		}
	}
	if (!stopped) {
		console.log(pc.yellow("CCS config daemon is not running"));
	}
};
