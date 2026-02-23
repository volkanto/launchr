import { PARAMETER_TYPES } from "../constants.mjs";
import { ValidationError } from "../utils/errors.mjs";

function normalizeFlag(rawFlag) {
  const flag = rawFlag.replace(/^-+/, "").trim();
  if (!/^[a-zA-Z]$/.test(flag)) {
    throw new ValidationError('Flag must be a single alphabetic character (example: "q" for "-q").');
  }
  return flag;
}

function parseBooleanStrict(rawValue, fieldName) {
  const normalized = rawValue.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "n", "0"].includes(normalized)) {
    return false;
  }
  throw new ValidationError(`${fieldName} must be true/false.`);
}

function parseIntegerStrict(rawValue, fieldName) {
  if (!/^-?\d+$/.test(rawValue.trim())) {
    throw new ValidationError(`${fieldName} must be an integer.`);
  }
  return Number.parseInt(rawValue.trim(), 10);
}

async function askNonEmpty(prompter, question) {
  while (true) {
    const answer = await prompter.ask(question);
    if (answer.length > 0) {
      return answer;
    }
  }
}

async function askParameterType(prompter) {
  while (true) {
    const answer = (await askNonEmpty(prompter, "What type? (string/integer/boolean/single-choice-list): ")).toLowerCase();
    if (PARAMETER_TYPES.includes(answer)) {
      return answer;
    }
    prompter.write(`Invalid type. Allowed values: ${PARAMETER_TYPES.join(", ")}\n`);
  }
}

async function askRequired(prompter) {
  while (true) {
    const answer = (await askNonEmpty(prompter, "Is it required? (true/false): ")).toLowerCase();
    if (answer === "true" || answer === "false") {
      return answer === "true";
    }
    prompter.write("Please answer true or false.\n");
  }
}

function parseDefaultValue(rawDefault, type, values) {
  const trimmed = rawDefault.trim();
  if (trimmed === "") {
    return null;
  }

  switch (type) {
    case "string":
      return trimmed;
    case "integer":
      return parseIntegerStrict(trimmed, "Default value");
    case "boolean":
      return parseBooleanStrict(trimmed, "Default value");
    case "single-choice-list":
      if (!values.includes(trimmed)) {
        throw new ValidationError(`Default value must be one of: ${values.join(", ")}`);
      }
      return trimmed;
    default:
      return trimmed;
  }
}

async function collectParameterDefinition(prompter, parameterKeys, flagsInUse) {
  const parameterKey = await askNonEmpty(prompter, "What parameter key do you want? (type done to finish): ");
  if (parameterKey.toLowerCase() === "done") {
    return null;
  }
  if (parameterKeys.has(parameterKey)) {
    throw new ValidationError(`Parameter "${parameterKey}" already exists for this command.`);
  }

  const type = await askParameterType(prompter);
  const rawFlag = await askNonEmpty(prompter, "What flag should be used? (example: q): ");
  const flag = normalizeFlag(rawFlag);
  if (flagsInUse.has(flag)) {
    throw new ValidationError(`Flag "-${flag}" is already in use for this command.`);
  }

  const required = await askRequired(prompter);
  const rawDefault = await prompter.ask("Default value? (leave empty for none): ");

  let values = undefined;
  if (type === "single-choice-list") {
    const rawValues = await askNonEmpty(prompter, "Enter allowed values (comma separated): ");
    values = rawValues
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new ValidationError("Single-choice-list requires at least one allowed value.");
    }
  }

  const defaultValue = parseDefaultValue(rawDefault, type, values ?? []);
  return {
    parameterKey,
    parameterDefinition: {
      type,
      flag,
      required,
      defaultValue,
      ...(values ? { values } : {}),
    },
  };
}

async function askAddAnotherCommand(prompter) {
  while (true) {
    const answer = (await askNonEmpty(prompter, "Do you want to add another command? (yes/no): ")).toLowerCase();
    if (answer === "yes" || answer === "y") {
      return true;
    }
    if (answer === "no" || answer === "n") {
      return false;
    }
    prompter.write("Please answer yes or no.\n");
  }
}

export async function runInitFlow({ config, prompter, saveConfig }) {
  const updatedConfig = { ...config };

  while (true) {
    const commandName = await askNonEmpty(
      prompter,
      "What command do you want to create? (example: grafana, google, or finish): ",
    );

    if (commandName.toLowerCase() === "finish") {
      break;
    }

    if (updatedConfig[commandName]) {
      prompter.write(`Command "${commandName}" already exists.\n`);
      continue;
    }

    const description = await askNonEmpty(prompter, "What description do you want to add? ");
    const url = await askNonEmpty(
      prompter,
      "What URL template do you want to use? (example: https://grafana.com/{environments}/{query}/{timeframe}) ",
    );

    const parameterKeys = new Set();
    const flagsInUse = new Set();
    const parameters = {};

    while (true) {
      try {
        const parameter = await collectParameterDefinition(prompter, parameterKeys, flagsInUse);
        if (parameter === null) {
          break;
        }

        parameterKeys.add(parameter.parameterKey);
        flagsInUse.add(parameter.parameterDefinition.flag);
        parameters[parameter.parameterKey] = parameter.parameterDefinition;
      } catch (error) {
        prompter.write(`${error.message}\n`);
      }
    }

    updatedConfig[commandName] = {
      description,
      url,
      parameters,
    };

    const addAnother = await askAddAnotherCommand(prompter);
    if (!addAnother) {
      break;
    }
  }

  await saveConfig(updatedConfig);
  prompter.write("Configuration updated.\n");
  return updatedConfig;
}
