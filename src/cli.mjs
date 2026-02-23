#!/usr/bin/env node

import os from "node:os";
import { realpathSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildGeneralHelp, buildCommandHelp, buildUsageText } from "./commands/help.mjs";
import { runInitFlow } from "./commands/init.mjs";
import { buildCommandList } from "./commands/list.mjs";
import { runCustomCommand } from "./commands/run-custom.mjs";
import { getConfigDirPath, getConfigFilePath } from "./config/paths.mjs";
import {
  ensureConfigExistsOrPromptCreate,
  loadConfiguration,
  saveConfiguration,
} from "./config/store.mjs";
import { parseArgv } from "./parsing/argv.mjs";
import { promptYesNo, createPrompter } from "./utils/prompt.mjs";
import { UsageError } from "./utils/errors.mjs";
import { openInBrowser } from "./utils/browser.mjs";

function writeLine(stream, message = "") {
  stream.write(`${message}\n`);
}

export async function runCli(argv = process.argv.slice(2), options = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const input = options.input ?? process.stdin;
  const homeDir = options.homeDir ?? os.homedir();
  const promptYesNoFn = options.promptYesNoFn ?? promptYesNo;
  const createPrompterFn = options.createPrompterFn ?? createPrompter;
  const openUrlFn = options.openUrlFn ?? openInBrowser;

  const configDirPath = getConfigDirPath(homeDir);
  const configFilePath = getConfigFilePath(homeDir);

  try {
    await ensureConfigExistsOrPromptCreate({
      configDirPath,
      configFilePath,
      promptYesNo: (question) => promptYesNoFn(question, { input, output: stdout }),
    });

    let config = await loadConfiguration(configFilePath);
    const parsed = parseArgv(argv);

    if (!parsed.command) {
      writeLine(stdout, buildUsageText(config));
      return 0;
    }

    if (parsed.command === "help") {
      writeLine(stdout, buildGeneralHelp(config));
      return 0;
    }

    if (parsed.command === "list") {
      writeLine(stdout, buildCommandList(config));
      return 0;
    }

    if (parsed.command === "init") {
      const prompter = createPrompterFn({ input, output: stdout });
      try {
        config = await runInitFlow({
          config,
          prompter,
          saveConfig: (nextConfig) => saveConfiguration(configFilePath, nextConfig),
        });
        if (Object.keys(config).length > 0) {
          writeLine(stdout, buildCommandList(config));
        }
      } finally {
        prompter.close();
      }
      return 0;
    }

    const commandConfig = config[parsed.command];
    if (!commandConfig) {
      throw new UsageError(`Unknown command "${parsed.command}". Run "launchr list" to see available commands.`);
    }

    if (parsed.rest[0] === "help") {
      writeLine(stdout, buildCommandHelp(parsed.command, commandConfig));
      return 0;
    }

    const result = await runCustomCommand({
      commandName: parsed.command,
      commandConfig,
      argv: parsed.rest,
      openUrl: openUrlFn,
    });
    writeLine(stdout, `Opening URL: ${result.finalUrl}`);
    return 0;
  } catch (error) {
    writeLine(stderr, error.message);
    return 1;
  }
}

function isDirectInvocation() {
  if (!process.argv[1]) {
    return false;
  }

  const argvPath = process.argv[1];
  const argvHref = pathToFileURL(argvPath).href;
  if (import.meta.url === argvHref) {
    return true;
  }

  try {
    const resolvedArgvPath = realpathSync(argvPath);
    const resolvedArgvHref = pathToFileURL(resolvedArgvPath).href;
    return import.meta.url === resolvedArgvHref;
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  const code = await runCli();
  process.exitCode = code;
}
