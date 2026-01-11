import pc from "picocolors";
import {
	getRunningDaemonPid,
	isProcessRunning,
	removePid,
} from "../../utils/daemon.js";

export type StopOptions = {
	force?: boolean;
};

export const ccsStopCommand = async (options?: StopOptions): Promise<void> => {
	const pid = await getRunningDaemonPid();
	if (pid === null) {
		console.log(pc.yellow("CCS config daemon is not running"));
		return;
	}
	try {
		// Send SIGTERM for graceful shutdown, SIGKILL if --force
		const signal = options?.force ? "SIGKILL" : "SIGTERM";
		process.kill(pid, signal);
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
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ESRCH") {
			// Process doesn't exist - clean up stale PID file
			removePid();
			console.log(pc.yellow("Process not found, cleaned up stale PID file"));
		} else if (err.code === "EPERM") {
			console.log(
				pc.red("Permission denied. Try running with elevated privileges."),
			);
		} else {
			console.log(pc.red(`Failed to stop daemon: ${err.message}`));
		}
	}
};
