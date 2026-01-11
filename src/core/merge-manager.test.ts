import { test, expect } from "bun:test";
import { mergePermissions, mergeFull, unmergePermissions, unmergeFull } from "./merge-manager.js";

const base = () => ({ permissions: { allow: ["a"], deny: [] }, env: { A: "1" }, other: 1 });
const source = () => ({ permissions: { allow: ["b"], deny: ["x"] }, env: { B: "2" }, other2: true });

test("mergePermissions adds allow/deny and records items", () => {
  const target = base();
  const entry = mergePermissions(target, source(), "source");
  expect((target.permissions as { allow: string[] }).allow).toContain("b");
  expect((target.permissions as { deny: string[] }).deny).toContain("x");
  expect(entry.mergedItems.some((item) => item.includes("permissions.allow"))).toBe(true);
});

test("mergeFull merges env and top-level keys", () => {
  const target = base();
  const entry = mergeFull(target, source(), "source");
  expect((target.env as Record<string, string>).B).toBe("2");
  expect(target.other2).toBe(true);
  expect(entry.mergedItems.some((item) => item.startsWith("env:"))).toBe(true);
});

test("unmergePermissions removes merged items", () => {
  const target = base();
  const history = [mergePermissions(target, source(), "source")];
  const remaining = unmergePermissions(target, history, "source");
  expect(remaining.length).toBe(0);
  expect((target.permissions as { allow: string[] }).allow).not.toContain("b");
});

test("unmergeFull removes merged items and history", () => {
  const target = base();
  const history = [mergeFull(target, source(), "source")];
  const remaining = unmergeFull(target, history, "source");
  expect(remaining.length).toBe(0);
  expect((target.env as Record<string, string>).B).toBeUndefined();
  expect(target.other2).toBeUndefined();
});
