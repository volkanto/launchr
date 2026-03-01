import { ValidationError } from "../utils/errors.mjs";

function parseInteger(rawValue, paramKey) {
  const normalized = String(rawValue);
  if (!/^-?\d+$/.test(normalized)) {
    throw new ValidationError(`Parameter "${paramKey}" must be an integer.`);
  }
  return Number.parseInt(normalized, 10);
}

function parseBoolean(rawValue, paramKey) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  const normalized = String(rawValue).toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "n") {
    return false;
  }

  throw new ValidationError(`Parameter "${paramKey}" must be boolean (true/false).`);
}

export function normalizeRuntimeParameterValue(rawValue, parameterKey, parameterDefinition) {
  switch (parameterDefinition.type) {
    case "string":
      return String(rawValue);
    case "integer":
      return parseInteger(rawValue, parameterKey);
    case "boolean":
      return parseBoolean(rawValue, parameterKey);
    case "single-choice-list": {
      const stringValue = String(rawValue);
      if (!parameterDefinition.values.includes(stringValue)) {
        throw new ValidationError(
          `Parameter "${parameterKey}" must be one of: ${parameterDefinition.values.join(", ")}`,
        );
      }
      return stringValue;
    }
    default:
      throw new ValidationError(`Unsupported parameter type: ${parameterDefinition.type}`);
  }
}

export function hasUsableDefault(definition) {
  return definition.defaultValue !== undefined && definition.defaultValue !== null && definition.defaultValue !== "";
}

export function resolveRuntimeParameters(commandName, commandConfig, valuesByFlag) {
  const parameterEntries = Object.entries(commandConfig.parameters);
  const allowedFlags = new Set(parameterEntries.map(([, definition]) => definition.flag.replace(/^-+/, "")));

  for (const incomingFlag of valuesByFlag.keys()) {
    if (!allowedFlags.has(incomingFlag)) {
      throw new ValidationError(`Unknown flag "-${incomingFlag}" for command "${commandName}".`);
    }
  }

  const valuesInOrder = [];
  const valuesByParameterKey = {};

  for (const [parameterKey, definition] of parameterEntries) {
    const normalizedFlag = definition.flag.replace(/^-+/, "");
    let rawValue = valuesByFlag.get(normalizedFlag);

    if (rawValue === true && definition.type !== "boolean") {
      throw new ValidationError(`Flag "-${normalizedFlag}" requires a value.`);
    }

    if (rawValue === undefined) {
      if (hasUsableDefault(definition)) {
        rawValue = definition.defaultValue;
      } else if (definition.required) {
        throw new ValidationError(`Missing required parameter "${parameterKey}" (-${normalizedFlag}).`);
      } else {
        valuesByParameterKey[parameterKey] = "";
        valuesInOrder.push("");
        continue;
      }
    }

    const normalizedValue = normalizeRuntimeParameterValue(rawValue, parameterKey, definition);
    valuesByParameterKey[parameterKey] = normalizedValue;
    valuesInOrder.push(normalizedValue);
  }

  return {
    valuesInOrder,
    valuesByParameterKey,
  };
}
