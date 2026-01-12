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

// Known CCS daemon ports
export const CCS_PORTS = [3000, 8317];

// Kill process tree (on Windows, kills all child processes)
export const killProcessTree = async (
	pid: number,
	force?: boolean,
): Promise<boolean> => {
	if (process.platform === "win32") {
		const args = ["/PID", String(pid), "/T"];
		if (force) args.push("/F");
		const proc = Bun.spawn(["taskkill", ...args], {
			stdout: "ignore",
			stderr: "ignore",
		});
		await proc.exited;
		return proc.exitCode === 0;
	}
	const signal = force ? "SIGKILL" : "SIGTERM";
	try {
		process.kill(pid, signal);
		return true;
	} catch {
		return false;
	}
};

// Get PID of process listening on a port
export const getProcessByPort = async (
	port: number,
): Promise<number | null> => {
	if (process.platform === "win32") {
		// Run netstat directly and parse ourselves for exact port matching
		const proc = Bun.spawn(["netstat", "-ano", "-p", "tcp"], {
			stdout: "pipe",
			stderr: "ignore",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;

		const lines = output.split("\n");
		for (const line of lines) {
			// Format: Proto  Local Address          Foreign Address        State           PID
			// TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
			const parts = line.trim().split(/\s+/);
			if (parts.length < 5) continue;

			const state = parts[3];
			const localAddr = parts[1];
			const pidStr = parts[4];
			if (state !== "LISTENING" || !localAddr || !pidStr) continue;

			// Extract port from local address (last part after colon)
			const portMatch = localAddr.match(/:(\d+)$/);
			if (!portMatch?.[1]) continue;

			const localPort = Number.parseInt(portMatch[1], 10);
			if (localPort !== port) continue;

			const pid = Number.parseInt(pidStr, 10);
			if (Number.isFinite(pid) && pid > 0) {
				return pid;
			}
		}
		return null;
	}
	// Unix: use lsof
	const proc = Bun.spawn(["lsof", "-ti", `:${port}`], {
		stdout: "pipe",
		stderr: "ignore",
	});
	const output = await new Response(proc.stdout).text();
	await proc.exited;
	const pid = Number.parseInt(output.trim(), 10);
	return Number.isFinite(pid) ? pid : null;
};

// Kill process by port
export const killProcessByPort = async (
	port: number,
	force?: boolean,
): Promise<boolean> => {
	const pid = await getProcessByPort(port);
	if (pid === null) return false;
	return killProcessTree(pid, force);
};
