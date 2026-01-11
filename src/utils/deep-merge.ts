export const deepMerge = (
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const baseValue = result[key];
		if (isPlainObject(baseValue) && isPlainObject(value)) {
			result[key] = deepMerge(baseValue, value);
		} else {
			result[key] = value;
		}
	}
	return result;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== "object") {
		return false;
	}
	if (Array.isArray(value)) {
		return false;
	}
	return Object.getPrototypeOf(value) === Object.prototype;
};
