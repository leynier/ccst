import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Daemon directory inside CCS home
export const getDaemonDir = (): string => join(homedir(), ".ccs", "daemon");

// PID file path
export const getPidPath = (): string => join(getDaemonDir(), "ccs-config.pid");

// Log file path
export const getLogPath = (): string => join(getDaemonDir(), "ccs-config.log");

// Ensure daemon directory exists
export const ensureDaemonDir = (): void => {
	const dir = getDaemonDir();
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
};

// Read PID from file
export const readPid = async (): Promise<number | null> => {
	const pidPath = getPidPath();
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

// Write PID to file
export const writePid = async (pid: number): Promise<void> => {
	ensureDaemonDir();
	await Bun.write(getPidPath(), String(pid));
};

// Remove PID file
export const removePid = (): void => {
	const pidPath = getPidPath();
	if (existsSync(pidPath)) {
		unlinkSync(pidPath);
	}
};

// Check if process is running using kill(pid, 0)
export const isProcessRunning = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// EPERM = permission denied (but process exists)
		if ((error as NodeJS.ErrnoException).code === "EPERM") {
			return true;
		}
		return false;
	}
};

// Get running daemon PID (validates process is actually running)
export const getRunningDaemonPid = async (): Promise<number | null> => {
	const pid = await readPid();
	if (pid === null) {
		return null;
	}
	if (!isProcessRunning(pid)) {
		// Stale PID file - clean it up
		removePid();
		return null;
	}
	return pid;
};

// Locate ccs executable
export const getCcsExecutable = (): string => {
	// Use 'ccs' from PATH - it should be globally installed
	return "ccs";
};
