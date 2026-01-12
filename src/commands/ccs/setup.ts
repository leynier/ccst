import { spawnSync } from "node:child_process";
import pc from "picocolors";

export type SetupOptions = {
	force?: boolean;
};

export const ccsSetupCommand = async (
	options?: SetupOptions,
): Promise<void> => {
	// Check if ccs is installed
	const which = spawnSync("which", ["ccs"], { stdio: "ignore" });
	if (which.status !== 0) {
		console.log(pc.red("Error: ccs command not found"));
		console.log(pc.dim("Run 'ccst ccs install' to install it"));
		return;
	}

	// Build arguments
	const args = ["setup"];
	if (options?.force) {
		args.push("--force");
	}

	// Execute ccs setup with real-time output
	const result = spawnSync("ccs", args, {
		stdio: "inherit",
	});

	// Check exit code
	if (result.status !== 0) {
		console.log(
			pc.red(`Error: ccs setup failed with exit code ${result.status}`),
		);
		return;
	}

	console.log(pc.green("Setup completed successfully"));
};
