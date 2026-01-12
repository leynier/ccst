import { existsSync, openSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
	ensureDaemonDir,
	getDaemonDir,
	isProcessRunning,
	killProcessTree,
	truncateFile,
} from "./daemon.js";

// Watcher PID file path
export const getWatcherPidPath = (): string =>
	join(getDaemonDir(), "watcher.pid");

// Watcher log file path
export const getWatcherLogPath = (): string =>
	join(getDaemonDir(), "watcher.log");

// Read watcher PID from file
export const readWatcherPid = async (): Promise<number | null> => {
	const pidPath = getWatcherPidPath();
	if (!existsSync(pidPath)) {
		return null;
	}
	try {
		const content = await Bun.file(pidPath).text();
		const pid = parseInt(content.trim(), 10);
		return Number.isFinite(pid) ? pid : null;
	} catch {
		return null;
	}
};

// Write watcher PID to file
export const writeWatcherPid = async (pid: number): Promise<void> => {
	ensureDaemonDir();
	await Bun.write(getWatcherPidPath(), String(pid));
};

// Remove watcher PID file
export const removeWatcherPid = (): void => {
	const pidPath = getWatcherPidPath();
	if (existsSync(pidPath)) {
		unlinkSync(pidPath);
	}
};

// Get running watcher PID (validates process is actually running)
export const getRunningWatcherPid = async (): Promise<number | null> => {
	const pid = await readWatcherPid();
	if (pid === null) {
		return null;
	}
	if (!isProcessRunning(pid)) {
		// Stale PID file - clean it up
		removeWatcherPid();
		return null;
	}
	return pid;
};

// Get watcher script path
const getWatcherScriptPath = (): string => {
	// The script is in src/scripts/watcher.ts relative to the package
	// When running as installed package, we need to find it
	const scriptPath = join(import.meta.dir, "..", "scripts", "watcher.ts");
	return scriptPath;
};

// Start watcher process
export const startWatcher = async (): Promise<number | null> => {
	const existingPid = await getRunningWatcherPid();
	if (existingPid !== null) {
		return existingPid;
	}

	ensureDaemonDir();
	const logPath = getWatcherLogPath();
	const scriptPath = getWatcherScriptPath();

	// Truncate log file
	await truncateFile(logPath);

	if (process.platform === "win32") {
		return startWatcherWindows(scriptPath, logPath);
	}
	return startWatcherUnix(scriptPath, logPath);
};

// Start watcher on Windows using VBScript to hide console
const startWatcherWindows = async (
	scriptPath: string,
	logPath: string,
): Promise<number | null> => {
	const vbsPath = join(getDaemonDir(), "start-watcher.vbs");
	const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c bun run ""${scriptPath}"" >> ""${logPath}"" 2>&1", 0, False
`.trim();

	await Bun.write(vbsPath, vbsContent);

	const proc = Bun.spawn(["wscript", "//Nologo", vbsPath], {
		detached: true,
		stdio: ["ignore", "ignore", "ignore"],
	});
	proc.unref();

	// Clean up VBS file after short delay
	setTimeout(() => {
		try {
			unlinkSync(vbsPath);
		} catch {
			// Ignore cleanup errors
		}
	}, 1000);

	// Poll for log file to have content (indicating process started)
	const maxWait = 5000;
	const interval = 200;
	let waited = 0;

	while (waited < maxWait) {
		await new Promise((resolve) => setTimeout(resolve, interval));
		waited += interval;

		// Check if log file has content
		if (existsSync(logPath)) {
			const file = Bun.file(logPath);
			const size = file.size;
			if (size > 0) {
				// Try to find the PID by reading the log
				const content = await file.text();
				const match = content.match(/PID:\s*(\d+)/);
				if (match?.[1]) {
					const pid = Number.parseInt(match[1], 10);
					if (Number.isFinite(pid) && pid > 0) {
						await writeWatcherPid(pid);
						return pid;
					}
				}
			}
		}
	}

	return null;
};

// Start watcher on Unix
const startWatcherUnix = async (
	scriptPath: string,
	logPath: string,
): Promise<number | null> => {
	const logFd = openSync(logPath, "a");

	const child = Bun.spawn(["bun", "run", scriptPath], {
		detached: true,
		stdio: ["ignore", logFd, logFd],
	});
	child.unref();

	const pid = child.pid;
	if (pid) {
		await writeWatcherPid(pid);
	}

	return pid;
};

// Stop watcher process
export const stopWatcher = async (force?: boolean): Promise<boolean> => {
	const pid = await readWatcherPid();
	if (pid === null) {
		return false;
	}

	const killed = await killProcessTree(pid, force);

	// Wait for process to terminate
	const maxWait = force ? 1000 : 5000;
	const interval = 100;
	let waited = 0;

	while (waited < maxWait && isProcessRunning(pid)) {
		await new Promise((resolve) => setTimeout(resolve, interval));
		waited += interval;
	}

	removeWatcherPid();
	return killed || !isProcessRunning(pid);
};
