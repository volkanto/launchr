import test from "node:test";
import assert from "node:assert/strict";
import { resolveRuntimeParameters } from "../src/validation/runtime-params.mjs";

const commandConfig = {
  description: "search",
  url: "https://google.com?query={query}&limit={limit}&debug={debug}",
  parameters: {
    query: {
      type: "string",
      flag: "q",
      required: true,
    },
    limit: {
      type: "integer",
      flag: "l",
      required: false,
      defaultValue: 10,
    },
    debug: {
      type: "boolean",
      flag: "d",
      required: false,
      defaultValue: false,
    },
  },
};

test("resolveRuntimeParameters validates required fields", () => {
  const flags = new Map();
  assert.throws(
    () => resolveRuntimeParameters("google", commandConfig, flags),
    /Missing required parameter/,
  );
});

test("resolveRuntimeParameters uses defaults and normalizes types", () => {
  const flags = new Map([["q", "error"]]);
  const result = resolveRuntimeParameters("google", commandConfig, flags);
  assert.deepEqual(result.valuesInOrder, ["error", 10, false]);
});

test("resolveRuntimeParameters rejects unknown flags", () => {
  const flags = new Map([
    ["q", "error"],
    ["x", "1"],
  ]);

  assert.throws(
    () => resolveRuntimeParameters("google", commandConfig, flags),
    /Unknown flag/,
  );
});

test("resolveRuntimeParameters parses boolean true flag without explicit value", () => {
  const flags = new Map([
    ["q", "error"],
    ["d", true],
  ]);

  const result = resolveRuntimeParameters("google", commandConfig, flags);
  assert.deepEqual(result.valuesInOrder, ["error", 10, true]);
});
