import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_PROMPT_TEXT, CONFIG_REQUIRED_MESSAGE } from "../constants.mjs";
import { ConfigError } from "../utils/errors.mjs";
import { validateConfigSchema } from "./schema.mjs";

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function createEmptyConfiguration(configDirPath, configFilePath) {
  await mkdir(configDirPath, { recursive: true });
  await writeFile(configFilePath, "{}\n", "utf8");
}

export async function ensureConfigExistsOrPromptCreate(options) {
  const {
    configDirPath,
    configFilePath,
    promptYesNo,
    promptText = CONFIG_PROMPT_TEXT,
  } = options;

  const exists = await pathExists(configFilePath);
  if (exists) {
    return;
  }

  const shouldCreate = await promptYesNo(promptText);
  if (!shouldCreate) {
    throw new ConfigError(CONFIG_REQUIRED_MESSAGE);
  }

  await createEmptyConfiguration(configDirPath, configFilePath);
}

export async function loadConfiguration(configFilePath) {
  let rawText;
  try {
    rawText = await readFile(configFilePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new ConfigError(`Configuration file not found at ${configFilePath}`);
    }
    throw new ConfigError(`Unable to read configuration file at ${configFilePath}`, { cause: error });
  }

  let parsed;
  try {
    parsed = rawText.trim().length === 0 ? {} : JSON.parse(rawText);
  } catch (error) {
    throw new ConfigError(`Configuration file is corrupted JSON: ${configFilePath}`, { cause: error });
  }

  try {
    return validateConfigSchema(parsed);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`Configuration schema validation failed: ${error.message}`, { cause: error });
  }
}

export async function saveConfiguration(configFilePath, configObject) {
  validateConfigSchema(configObject);
  const tempFilePath = path.join(
    path.dirname(configFilePath),
    `${path.basename(configFilePath)}.tmp`,
  );
  const payload = `${JSON.stringify(configObject, null, 2)}\n`;
  await writeFile(tempFilePath, payload, "utf8");
  await rename(tempFilePath, configFilePath);
}
