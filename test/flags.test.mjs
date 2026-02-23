import test from "node:test";
import assert from "node:assert/strict";
import { parseShortFlags } from "../src/parsing/flags.mjs";

test("parseShortFlags parses key-value pairs", () => {
  const parsed = parseShortFlags(["-e", "production", "-q", "error"]);
  assert.equal(parsed.get("e"), "production");
  assert.equal(parsed.get("q"), "error");
});

test("parseShortFlags treats missing value as boolean true", () => {
  const parsed = parseShortFlags(["-d"]);
  assert.equal(parsed.get("d"), true);
});

test("parseShortFlags rejects invalid token", () => {
  assert.throws(() => parseShortFlags(["query"]), /Unexpected token/);
});
