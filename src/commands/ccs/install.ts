import { spawnSync } from "node:child_process";
import pc from "picocolors";
import { promptInput } from "../../utils/interactive.js";

type PackageManager = {
	name: string;
	displayCommand: string;
	command: string;
	args: string[];
};

const packageManagers: PackageManager[] = [
	{
		name: "bun",
		displayCommand: "bun add -g @kaitranntt/ccs",
		command: "bun",
		args: ["add", "-g", "@kaitranntt/ccs"],
	},
	{
		name: "npm",
		displayCommand: "npm install -g @kaitranntt/ccs",
		command: "npm",
		args: ["install", "-g", "@kaitranntt/ccs"],
	},
	{
		name: "pnpm",
		displayCommand: "pnpm add -g @kaitranntt/ccs",
		command: "pnpm",
		args: ["add", "-g", "@kaitranntt/ccs"],
	},
	{
		name: "yarn",
		displayCommand: "yarn global add @kaitranntt/ccs",
		command: "yarn",
		args: ["global", "add", "@kaitranntt/ccs"],
	},
];

const selectPackageManager = async (): Promise<PackageManager | undefined> => {
	const lines = packageManagers.map(
		(pm, index) => `${index + 1}. ${pm.name} (${pm.displayCommand})`,
	);
	console.log("Select package manager to install @kaitranntt/ccs:");
	console.log(lines.join("\n"));

	const input = await promptInput("Select option (1-4)");
	const index = Number.parseInt(input || "", 10);

	if (!Number.isFinite(index) || index < 1 || index > packageManagers.length) {
		console.log(pc.red("Invalid selection"));
		return undefined;
	}

	return packageManagers[index - 1];
};

const verifyInstallation = async (): Promise<string | null> => {
	const result = spawnSync("ccs", ["--version"], {
		stdio: ["ignore", "pipe", "pipe"],
		encoding: "utf8",
	});

	if (result.status !== 0) {
		return null;
	}

	const version = result.stdout?.trim();
	return version && version.length > 0 ? version : null;
};

const promptForSetup = async (): Promise<boolean> => {
	const response = await promptInput("Run ccs setup now? (y/n)");
	return response?.toLowerCase() === "y";
};

export const ccsInstallCommand = async (): Promise<void> => {
	// Step 1: Select package manager
	const selectedPm = await selectPackageManager();
	if (!selectedPm) {
		console.log(pc.dim("Installation cancelled"));
		return;
	}

	// Step 2: Execute installation
	console.log(
		pc.dim(
			`Installing @kaitranntt/ccs using ${selectedPm.name}... (this may take a moment)`,
		),
	);
	const installResult = spawnSync(selectedPm.command, selectedPm.args, {
		stdio: "inherit",
	});

	if (installResult.status !== 0) {
		console.log(
			pc.red(
				`Error: Installation failed with exit code ${installResult.status}`,
			),
		);
		return;
	}

	// Step 3: Verify installation
	console.log(pc.dim("Verifying installation..."));
	const version = await verifyInstallation();

	if (!version) {
		console.log(
			pc.yellow("Warning: ccs installed but could not verify installation"),
		);
		console.log(pc.dim("You may need to restart your terminal"));
		console.log(pc.dim("Try running 'which ccs' or 'ccs --version' manually"));
		return;
	}

	console.log(pc.green(`ccs installed successfully (${version})`));

	// Step 4: Ask if user wants to run setup
	const shouldRunSetup = await promptForSetup();
	if (shouldRunSetup) {
		console.log(pc.dim("Running ccs setup..."));
		const setupResult = spawnSync("ccs", ["setup"], { stdio: "inherit" });

		if (setupResult.status === 0) {
			console.log(pc.green("Setup completed successfully"));
		} else {
			console.log(
				pc.yellow(
					`Setup exited with code ${setupResult.status} (this may not be an error)`,
				),
			);
		}
	} else {
		console.log(pc.dim("You can run 'ccst ccs setup' later to configure ccs"));
	}
};
