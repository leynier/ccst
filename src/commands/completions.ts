export const completionsCommand = (shell: string | undefined): void => {
	if (!shell) {
		throw new Error("error: shell required for completions");
	}
	const available = ["bash", "zsh", "fish", "powershell", "elvish"];
	if (!available.includes(shell)) {
		throw new Error(`error: unsupported shell ${shell}`);
	}
	const commands = [
		"install",
		"setup",
		"start",
		"stop",
		"status",
		"logs",
		"config",
	].join(" ");
	const options = ["--completions", "--help", "--version"].join(" ");
	const allCompletions = `${commands} ${options}`;

	if (shell === "bash") {
		process.stdout.write(
			`# ccst bash completions\ncomplete -W "${allCompletions}" ccst\n`,
		);
		return;
	}
	if (shell === "zsh") {
		process.stdout.write(
			`#compdef ccst\n_arguments '*::options:(${allCompletions})'\n`,
		);
		return;
	}
	if (shell === "fish") {
		process.stdout.write(`complete -c ccst -f -a "${allCompletions}"\n`);
		return;
	}
	process.stdout.write(
		`# ${shell} completions not implemented; use bash/zsh/fish output\n`,
	);
};
