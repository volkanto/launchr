import test from "node:test";
import assert from "node:assert/strict";
import { runInitFlow } from "../src/commands/init.mjs";

function createScriptedPrompter(answers) {
  const queue = [...answers];
  const writes = [];
  return {
    async ask() {
      if (queue.length === 0) {
        throw new Error("No more scripted answers");
      }
      return queue.shift();
    },
    write(message) {
      writes.push(message);
    },
    close() {},
    getWrites() {
      return writes;
    },
  };
}

test("runInitFlow collects command definitions and saves config", async () => {
  const prompter = createScriptedPrompter([
    "google",
    "search utility",
    "https://google.com?q={query}",
    "query",
    "string",
    "q",
    "true",
    "",
    "done",
    "no",
  ]);

  let savedConfig;
  const result = await runInitFlow({
    config: {},
    prompter,
    saveConfig: async (config) => {
      savedConfig = config;
    },
  });

  assert.equal(result.google.description, "search utility");
  assert.equal(result.google.url, "https://google.com?q={query}");
  assert.equal(result.google.parameters.query.flag, "q");
  assert.equal(savedConfig.google.parameters.query.required, true);
});
