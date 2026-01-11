export const completionsCommand = (shell: string | undefined): void => {
	if (!shell) {
		throw new Error("error: shell required for completions");
	}
	const available = ["bash", "zsh", "fish", "powershell", "elvish"];
	if (!available.includes(shell)) {
		throw new Error(`error: unsupported shell ${shell}`);
	}
	const options = [
		"-d",
		"--delete",
		"-c",
		"--current",
		"-r",
		"--rename",
		"-n",
		"--new",
		"-e",
		"--edit",
		"-s",
		"--show",
		"--export",
		"--import",
		"-u",
		"--unset",
		"--completions",
		"-q",
		"--quiet",
		"--in-project",
		"--local",
		"--merge-from",
		"--unmerge",
		"--merge-history",
		"--merge-full",
	].join(" ");
	if (shell === "bash") {
		process.stdout.write(
			`# ccst bash completions\ncomplete -W "${options}" ccst\n`,
		);
		return;
	}
	if (shell === "zsh") {
		process.stdout.write(
			`#compdef ccst\n_arguments '*::options:(${options})'\n`,
		);
		return;
	}
	if (shell === "fish") {
		process.stdout.write(`complete -c ccst -f -a "${options}"\n`);
		return;
	}
	process.stdout.write(
		`# ${shell} completions not implemented; use bash/zsh/fish output\n`,
	);
};
