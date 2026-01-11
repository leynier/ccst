import { existsSync } from "node:fs";

export const readJson = async <T>(filePath: string): Promise<T> => {
	const text = await Bun.file(filePath).text();
	return JSON.parse(text) as T;
};

export const readJsonIfExists = async <T>(
	filePath: string,
	fallback: T,
): Promise<T> => {
	if (!existsSync(filePath)) {
		return fallback;
	}
	const text = await Bun.file(filePath).text();
	return JSON.parse(text) as T;
};

export const writeJson = async (
	filePath: string,
	value: unknown,
): Promise<void> => {
	const payload = `${JSON.stringify(value, null, 2)}\n`;
	await Bun.write(filePath, payload);
};
