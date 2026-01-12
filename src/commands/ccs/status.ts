import { existsSync, statSync } from "node:fs";
import pc from "picocolors";
import {
	getLogPath,
	getPidPath,
	getRunningDaemonPid,
} from "../../utils/daemon.js";
import {
	getRunningWatcherPid,
	getWatcherLogPath,
} from "../../utils/watcher-daemon.js";

export const ccsStatusCommand = async (): Promise<void> => {
	// Show daemon status
	const pid = await getRunningDaemonPid();
	if (pid === null) {
		console.log(pc.yellow("CCS config daemon is not running"));
	} else {
		console.log(pc.green(`CCS config daemon is running (PID: ${pid})`));
		const pidPath = getPidPath();
		const logPath = getLogPath();
		console.log(pc.dim(`PID file: ${pidPath}`));
		if (existsSync(logPath)) {
			const stats = statSync(logPath);
			const sizeKb = (stats.size / 1024).toFixed(2);
			console.log(pc.dim(`Log file: ${logPath} (${sizeKb} KB)`));
		}
		// Try to get process uptime (Unix only)
		if (process.platform !== "win32") {
			try {
				const proc = Bun.spawn(["ps", "-p", String(pid), "-o", "etime="], {
					stdout: "pipe",
					stderr: "ignore",
				});
				const output = await new Response(proc.stdout).text();
				const uptime = output.trim();
				if (uptime) {
					console.log(pc.dim(`Uptime: ${uptime}`));
				}
			} catch {
				// ps command not available or failed
			}
		}
	}

	// Show watcher status
	console.log();
	const watcherPid = await getRunningWatcherPid();
	if (watcherPid !== null) {
		console.log(pc.green(`File watcher is running (PID: ${watcherPid})`));
		const watcherLogPath = getWatcherLogPath();
		if (existsSync(watcherLogPath)) {
			const stats = statSync(watcherLogPath);
			const sizeKb = (stats.size / 1024).toFixed(2);
			console.log(pc.dim(`Watcher log: ${watcherLogPath} (${sizeKb} KB)`));
		}
	} else {
		console.log(pc.yellow("File watcher is not running"));
	}
};
