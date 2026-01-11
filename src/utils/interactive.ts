import { spawnSync } from "node:child_process";

const hasFzf = (): boolean => {
  const which = spawnSync("which", ["fzf"], { stdio: "ignore" });
  return which.status === 0 && Boolean(process.env.TERM);
};

export const selectContext = async (contexts: string[], current?: string): Promise<string | undefined> => {
  if (contexts.length === 0) {
    return undefined;
  }
  if (hasFzf()) {
    const input = contexts.join("\n");
    const result = spawnSync("fzf", [], { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
    if (result.status !== 0) {
      return undefined;
    }
    const selected = String(result.stdout).trim();
    return selected.length > 0 ? selected : undefined;
  }
  return promptSelect(contexts, current);
};

const promptSelect = async (contexts: string[], current?: string): Promise<string | undefined> => {
  const lines = contexts.map((ctx, index) => {
    const marker = current && ctx === current ? " (current)" : "";
    return `${index + 1}. ${ctx}${marker}`;
  });
  process.stdout.write(`${lines.join("\n")}\nSelect a context (number): `);
  const input = await readStdinLine();
  const index = Number.parseInt(input, 10);
  if (!Number.isFinite(index) || index < 1 || index > contexts.length) {
    return undefined;
  }
  return contexts[index - 1];
};

export const promptInput = async (label: string): Promise<string | undefined> => {
  process.stdout.write(`${label}: `);
  const input = await readStdinLine();
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readStdinLine = async (): Promise<string> => {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      if (chunk.includes(10)) {
        cleanup();
        resolve(Buffer.concat(chunks).toString("utf8").trim());
      }
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks).toString("utf8").trim());
    };
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.off("end", onEnd);
    };
    if (process.stdin.isTTY) {
      process.stdin.resume();
    }
    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
  });
};
