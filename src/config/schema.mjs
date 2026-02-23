import { PARAMETER_TYPES } from "../constants.mjs";
import { ValidationError } from "../utils/errors.mjs";
import { extractTemplatePlaceholders } from "../utils/url-template.mjs";

export const CONFIG_JSON_SCHEMA = {
  type: "object",
  additionalProperties: {
    type: "object",
    required: ["description", "url", "parameters"],
    properties: {
      description: { type: "string" },
      url: { type: "string" },
      parameters: {
        type: "object",
        additionalProperties: {
          type: "object",
          required: ["type", "flag", "required"],
          properties: {
            type: { enum: PARAMETER_TYPES },
            flag: { type: "string", minLength: 1 },
            required: { type: "boolean" },
            defaultValue: {},
            values: { type: "array" },
          },
        },
      },
    },
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new ValidationError(message);
  }
}

function validateFlag(flag, location) {
  assert(typeof flag === "string" && flag.trim().length > 0, `${location}.flag must be a non-empty string`);
  const normalized = flag.replace(/^-+/, "").trim();
  assert(/^[a-zA-Z]$/.test(normalized), `${location}.flag must be a single alphabetic character`);
}

function validateTemplatePlaceholders(commandName, commandConfig) {
  const commandLocation = `Command "${commandName}"`;
  const parameterKeys = Object.keys(commandConfig.parameters);
  const parameterKeySet = new Set(parameterKeys);

  assert(
    !commandConfig.url.includes("%s"),
    `${commandLocation}.url uses deprecated "%s" placeholders. Use named placeholders like {query}.`,
  );

  const rawPlaceholderTokens = commandConfig.url.match(/{[^}]+}/g) ?? [];
  for (const rawToken of rawPlaceholderTokens) {
    const tokenBody = rawToken.slice(1, -1);
    assert(
      /^[a-zA-Z0-9_-]+$/.test(tokenBody),
      `${commandLocation}.url has invalid placeholder ${rawToken}. Use {parameter_key} with letters, numbers, _ or -.`,
    );
  }

  const placeholderNames = extractTemplatePlaceholders(commandConfig.url);
  const placeholderNameSet = new Set(placeholderNames);

  const unknownPlaceholders = [...placeholderNameSet].filter((name) => !parameterKeySet.has(name));
  assert(
    unknownPlaceholders.length === 0,
    `${commandLocation}.url has unknown placeholders: ${unknownPlaceholders.map((name) => `{${name}}`).join(", ")}`,
  );

  const missingPlaceholders = parameterKeys.filter((key) => !placeholderNameSet.has(key));
  assert(
    missingPlaceholders.length === 0,
    `${commandLocation}.url is missing placeholders for parameters: ${missingPlaceholders.map((name) => `{${name}}`).join(", ")}`,
  );
}

function validateSingleCommand(commandName, commandConfig) {
  const commandLocation = `Command "${commandName}"`;
  assert(isPlainObject(commandConfig), `${commandLocation} must be an object`);
  assert(typeof commandConfig.description === "string", `${commandLocation}.description must be a string`);
  assert(typeof commandConfig.url === "string", `${commandLocation}.url must be a string`);
  assert(isPlainObject(commandConfig.parameters), `${commandLocation}.parameters must be an object`);

  const seenFlags = new Set();

  for (const [paramName, paramDef] of Object.entries(commandConfig.parameters)) {
    const parameterLocation = `${commandLocation}.parameters.${paramName}`;
    assert(isPlainObject(paramDef), `${parameterLocation} must be an object`);
    assert(typeof paramDef.type === "string", `${parameterLocation}.type must be a string`);
    assert(PARAMETER_TYPES.includes(paramDef.type), `${parameterLocation}.type must be one of: ${PARAMETER_TYPES.join(", ")}`);
    validateFlag(paramDef.flag, parameterLocation);
    assert(typeof paramDef.required === "boolean", `${parameterLocation}.required must be a boolean`);

    const normalizedFlag = paramDef.flag.replace(/^-+/, "");
    assert(!seenFlags.has(normalizedFlag), `${commandLocation} has duplicated flag "-${normalizedFlag}"`);
    seenFlags.add(normalizedFlag);

    if (paramDef.type === "single-choice-list") {
      assert(Array.isArray(paramDef.values), `${parameterLocation}.values must be an array for single-choice-list`);
      assert(paramDef.values.length > 0, `${parameterLocation}.values must contain at least one value`);
      for (const value of paramDef.values) {
        assert(typeof value === "string" && value.length > 0, `${parameterLocation}.values must contain non-empty strings`);
      }
      if (paramDef.defaultValue !== undefined && paramDef.defaultValue !== null) {
        const defaultValue = String(paramDef.defaultValue);
        assert(paramDef.values.includes(defaultValue), `${parameterLocation}.defaultValue must be one of the allowed values`);
      }
    }

    if (paramDef.type === "integer" && paramDef.defaultValue !== undefined && paramDef.defaultValue !== null) {
      const integerPattern = /^-?\d+$/;
      assert(integerPattern.test(String(paramDef.defaultValue)), `${parameterLocation}.defaultValue must be an integer`);
    }

    if (paramDef.type === "boolean" && paramDef.defaultValue !== undefined && paramDef.defaultValue !== null) {
      const raw = String(paramDef.defaultValue).toLowerCase();
      const validBoolean = raw === "true" || raw === "false" || raw === "1" || raw === "0";
      assert(validBoolean, `${parameterLocation}.defaultValue must be a boolean (true/false/1/0)`);
    }
  }

  validateTemplatePlaceholders(commandName, commandConfig);
}

export function validateConfigSchema(config) {
  assert(isPlainObject(config), "Configuration root must be a JSON object");
  for (const [commandName, commandConfig] of Object.entries(config)) {
    validateSingleCommand(commandName, commandConfig);
  }
  return config;
}
