import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { runCli } from "../src/cli.mjs";

function createMemoryStream() {
  let buffer = "";
  return {
    write(chunk) {
      buffer += String(chunk);
    },
    toString() {
      return buffer;
    },
  };
}

function createScriptedPrompter(answers) {
  const queue = [...answers];
  let closed = false;
  return {
    async ask() {
      if (queue.length === 0) {
        throw new Error("No more scripted answers");
      }
      return queue.shift();
    },
    write() {},
    close() {
      closed = true;
    },
    isClosed() {
      return closed;
    },
  };
}

function buildSampleConfig() {
  return {
    grafana: {
      description: "some useful information",
      url: "https://grafana.com/{environments}/{query}/{timeframe}",
      parameters: {
        environments: {
          type: "single-choice-list",
          flag: "e",
          defaultValue: "staging",
          required: true,
          values: ["staging", "production"],
        },
        query: {
          type: "string",
          flag: "q",
          defaultValue: "error",
          required: true,
        },
        timeframe: {
          type: "single-choice-list",
          flag: "t",
          defaultValue: "5m",
          required: true,
          values: ["5m", "10m", "1h", "6h"],
        },
      },
    },
  };
}

async function createHomeWithConfig(configObject) {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "launchr-cli-test-"));
  const configDir = path.join(homeDir, ".launchr-configurations");
  const configFile = path.join(configDir, "launchr-commands.json");
  await mkdir(configDir, { recursive: true });
  await writeFile(configFile, `${JSON.stringify(configObject, null, 2)}\n`, "utf8");
  return homeDir;
}

test("runCli list prints configured commands", async () => {
  const homeDir = await createHomeWithConfig(buildSampleConfig());
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["list"], { homeDir, stdout, stderr });
  assert.equal(code, 0);
  assert.match(stdout.toString(), /grafana\s+- some useful information/);
  assert.equal(stderr.toString(), "");
});

test("runCli with no command prints custom commands with descriptions", async () => {
  const config = {
    ...buildSampleConfig(),
    yutup: {
      description: "youtube ac",
      url: "https://youtube.com",
      parameters: {},
    },
  };

  const homeDir = await createHomeWithConfig(config);
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli([], { homeDir, stdout, stderr });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /Built-in Commands:/);
  assert.match(stdout.toString(), /Custom Commands:/);
  assert.match(stdout.toString(), /^\s{2}help\s{2,}Show manual$/m);
  assert.match(stdout.toString(), /^\s{2}list\s{2,}List available commands$/m);
  assert.match(stdout.toString(), /^\s{2}add\s{2,}Add command interactively$/m);
  assert.doesNotMatch(stdout.toString(), /^\s{2}completion\s{2,}Generate shell completion scripts$/m);
  assert.match(stdout.toString(), /^\s{2}grafana\s{2,}some useful information$/m);
  assert.match(stdout.toString(), /^\s{2}yutup\s{2,}youtube ac$/m);
  assert.equal(stderr.toString(), "");
});

test("runCli add creates command via interactive flow", async () => {
  const homeDir = await createHomeWithConfig({});
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
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

  const code = await runCli(["add"], {
    homeDir,
    stdout,
    stderr,
    createPrompterFn: () => prompter,
  });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /google\s+- search utility/);
  assert.equal(stderr.toString(), "");
  assert.equal(prompter.isClosed(), true);
});

test("runCli init remains alias for add and prints deprecation warning", async () => {
  const homeDir = await createHomeWithConfig({});
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
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

  const code = await runCli(["init"], {
    homeDir,
    stdout,
    stderr,
    createPrompterFn: () => prompter,
  });

  assert.equal(code, 0);
  assert.match(stderr.toString(), /"init" is deprecated\. Use "launchr add"\./);
  assert.match(stdout.toString(), /google\s+- search utility/);
  assert.equal(prompter.isClosed(), true);
});

test("runCli custom command validates params and opens URL", async () => {
  const homeDir = await createHomeWithConfig(buildSampleConfig());
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
  const openedUrls = [];

  const code = await runCli(
    ["grafana", "-e", "production", "-q", "error", "-t", "5m"],
    {
      homeDir,
      stdout,
      stderr,
      openUrlFn: async (url) => {
        openedUrls.push(url);
      },
    },
  );

  assert.equal(code, 0);
  assert.deepEqual(openedUrls, ["https://grafana.com/production/error/5m"]);
  assert.match(stdout.toString(), /Opening URL:/);
  assert.equal(stderr.toString(), "");
});

test("runCli command help prints dynamic options", async () => {
  const homeDir = await createHomeWithConfig(buildSampleConfig());
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["grafana", "help"], {
    homeDir,
    stdout,
    stderr,
  });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /launchr grafana -e <environments> -q <query> -t <timeframe>/);
  assert.equal(stderr.toString(), "");
});

test("runCli completion zsh prints installable completion function without requiring config", async () => {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "launchr-cli-test-"));
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["completion", "zsh"], {
    homeDir,
    stdout,
    stderr,
    promptYesNoFn: async () => {
      throw new Error("prompt should not be called for completion");
    },
  });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /#compdef launchr/);
  assert.match(stdout.toString(), /launchr __complete top/);
  assert.equal(stderr.toString(), "");
});

test("runCli __complete top returns built-ins and configured commands", async () => {
  const config = {
    ...buildSampleConfig(),
    youtube: {
      description: "video search",
      url: "https://youtube.com/results?search_query={query}",
      parameters: {
        query: {
          type: "string",
          flag: "q",
          required: true,
        },
      },
    },
  };

  const homeDir = await createHomeWithConfig(config);
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["__complete", "top"], { homeDir, stdout, stderr });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /^help:Show manual$/m);
  assert.doesNotMatch(stdout.toString(), /^completion:Generate shell completion scripts$/m);
  assert.match(stdout.toString(), /^grafana:some useful information$/m);
  assert.match(stdout.toString(), /^youtube:video search$/m);
  assert.equal(stderr.toString(), "");
});

test("runCli __complete top skips config bootstrap when config is missing", async () => {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "launchr-cli-test-"));
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["__complete", "top"], {
    homeDir,
    stdout,
    stderr,
    promptYesNoFn: async () => {
      throw new Error("prompt should not be called for shell completion");
    },
  });

  assert.equal(code, 0);
  assert.match(stdout.toString(), /^help:Show manual$/m);
  assert.doesNotMatch(stdout.toString(), /^completion:Generate shell completion scripts$/m);
  assert.equal(stderr.toString(), "");
});

test("runCli __complete args returns help, flags, and list values for configured command", async () => {
  const homeDir = await createHomeWithConfig(buildSampleConfig());
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const topLevelCode = await runCli(["__complete", "args", "grafana"], {
    homeDir,
    stdout,
    stderr,
  });

  assert.equal(topLevelCode, 0);
  assert.match(stdout.toString(), /^help:Show help for grafana$/m);
  assert.match(stdout.toString(), /^-e:environments$/m);
  assert.match(stdout.toString(), /^-q:query$/m);
  assert.match(stdout.toString(), /^-t:timeframe$/m);
  assert.equal(stderr.toString(), "");

  const valueStdout = createMemoryStream();
  const valueStderr = createMemoryStream();
  const valueCode = await runCli(["__complete", "args", "grafana", "-e"], {
    homeDir,
    stdout: valueStdout,
    stderr: valueStderr,
  });

  assert.equal(valueCode, 0);
  assert.match(valueStdout.toString(), /^staging:environments$/m);
  assert.match(valueStdout.toString(), /^production:environments$/m);
  assert.equal(valueStderr.toString(), "");
});

test("runCli exits with clear error when config creation is declined", async () => {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "launchr-cli-test-"));
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();

  const code = await runCli(["help"], {
    homeDir,
    stdout,
    stderr,
    promptYesNoFn: async () => false,
  });

  assert.equal(code, 1);
  assert.match(stderr.toString(), /Configuration file is required to use this CLI/);
});
