import { parseShortFlags } from "../parsing/flags.mjs";
import { interpolateUrlTemplate } from "../utils/url-template.mjs";
import { ValidationError } from "../utils/errors.mjs";
import {
  hasUsableDefault,
  normalizeRuntimeParameterValue,
  resolveRuntimeParameters,
} from "../validation/runtime-params.mjs";

function shouldPromptForValue(definition, rawValue) {
  if (rawValue === true && definition.type !== "boolean") {
    return true;
  }

  return rawValue === undefined && definition.required && !hasUsableDefault(definition);
}

function buildPromptQuestion(parameterKey, definition) {
  switch (definition.type) {
    case "integer":
      return `Enter ${parameterKey} (integer): `;
    case "boolean":
      return `Enter ${parameterKey} (true/false): `;
    case "single-choice-list":
      return `Enter ${parameterKey} (${definition.values.join("/")}): `;
    default:
      return `Enter ${parameterKey}: `;
  }
}

async function promptForMissingParameters(commandConfig, valuesByFlag, prompter) {
  for (const [parameterKey, definition] of Object.entries(commandConfig.parameters)) {
    const normalizedFlag = definition.flag.replace(/^-+/, "");
    const rawValue = valuesByFlag.get(normalizedFlag);
    if (!shouldPromptForValue(definition, rawValue)) {
      continue;
    }

    while (true) {
      const answer = await prompter.ask(buildPromptQuestion(parameterKey, definition));
      if (answer.length === 0) {
        prompter.write(`Parameter "${parameterKey}" is required.\n`);
        continue;
      }

      try {
        const normalizedValue = normalizeRuntimeParameterValue(answer, parameterKey, definition);
        valuesByFlag.set(normalizedFlag, normalizedValue);
        break;
      } catch (error) {
        if (error instanceof ValidationError) {
          prompter.write(`${error.message}\n`);
          continue;
        }
        throw error;
      }
    }
  }
}

export async function runCustomCommand({
  commandName,
  commandConfig,
  argv,
  interactive = false,
  prompter = null,
  openUrl,
}) {
  const valuesByFlag = parseShortFlags(argv);
  if (interactive) {
    await promptForMissingParameters(commandConfig, valuesByFlag, prompter);
  }
  const { valuesByParameterKey } = resolveRuntimeParameters(
    commandName,
    commandConfig,
    valuesByFlag,
  );
  const finalUrl = interpolateUrlTemplate(commandConfig.url, valuesByParameterKey);
  await openUrl(finalUrl);

  return {
    finalUrl,
    valuesByParameterKey,
  };
}
