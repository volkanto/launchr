import test from "node:test";
import assert from "node:assert/strict";
import { parseArgv } from "../src/parsing/argv.mjs";

test("parseArgv parses command without global options", () => {
  const parsed = parseArgv(["grafana", "-e", "production"]);

  assert.equal(parsed.command, "grafana");
  assert.deepEqual(parsed.rest, ["-e", "production"]);
  assert.equal(parsed.options.interactive, false);
});

test("parseArgv parses interactive global options before command", () => {
  const parsed = parseArgv(["--interactive", "grafana", "-e", "production"]);

  assert.equal(parsed.command, "grafana");
  assert.deepEqual(parsed.rest, ["-e", "production"]);
  assert.equal(parsed.options.interactive, true);
});

test("parseArgv rejects unknown global options before command", () => {
  assert.throws(() => parseArgv(["--verbose", "grafana"]), /Unknown global option "--verbose"/);
});
