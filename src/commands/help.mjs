import { BUILTIN_COMMANDS } from "../constants.mjs";

function formatRequired(required) {
  return required ? "required" : "optional";
}

function formatParameterType(parameterDefinition) {
  if (parameterDefinition.type === "single-choice-list") {
    return `Allowed values: ${parameterDefinition.values.join(", ")}`;
  }
  return `Type: ${parameterDefinition.type}`;
}

function normalizeDescription(rawDescription) {
  if (typeof rawDescription !== "string") {
    return "No description";
  }

  const trimmed = rawDescription.trim();
  return trimmed.length > 0 ? trimmed : "No description";
}

function formatCommandRows(commandRows) {
  if (commandRows.length === 0) {
    return ["  (none)"];
  }

  const nameWidth = commandRows.reduce((maxWidth, row) => {
    return Math.max(maxWidth, row.name.length);
  }, 0);

  return commandRows.map((row) => {
    return `  ${row.name.padEnd(nameWidth)}  ${row.description}`;
  });
}

export function buildUsageText(config = {}) {
  const customCommandRows = Object.entries(config).map(([commandName, commandConfig]) => {
    return {
      name: commandName,
      description: normalizeDescription(commandConfig?.description),
    };
  });

  return [
    "Usage: launchr <command> [options]",
    "",
    "Built-in Commands:",
    ...formatCommandRows(BUILTIN_COMMANDS),
    "",
    "Custom Commands:",
    ...formatCommandRows(customCommandRows),
  ].join("\n");
}

export function buildGeneralHelp(config = {}) {
  const usageText = buildUsageText(config);
  return [
    usageText,
    "",
    "How to define commands:",
    "  Run `launchr add` and follow prompts to create command metadata, URL templates, and parameters.",
    "  `launchr init` is deprecated in v1.x and will be removed in v2.0.0.",
    "",
    "How parameters work:",
    "  Each parameter has a type, a short flag, required/default rules, and optional allowed values.",
    "  URL templates use named placeholders like `{query}` mapped by parameter key.",
    "",
    "Examples:",
    "  launchr list",
    "  launchr grafana help",
    "  launchr grafana -e production -q error -t 5m",
  ].join("\n");
}

export function buildCommandHelp(commandName, commandConfig) {
  const parameterEntries = Object.entries(commandConfig.parameters);

  const usageTokens = parameterEntries.map(([paramName, definition]) => {
    const token = `-${definition.flag.replace(/^-+/, "")} <${paramName}>`;
    return definition.required ? token : `[${token}]`;
  });

  const optionLines = [];
  for (const [parameterName, definition] of parameterEntries) {
    const normalizedFlag = definition.flag.replace(/^-+/, "");
    optionLines.push(`  -${normalizedFlag}   ${parameterName} (${formatRequired(definition.required)})`);
    optionLines.push(`       ${formatParameterType(definition)}`);
  }

  return [
    "Usage:",
    `  launchr ${commandName}${usageTokens.length > 0 ? ` ${usageTokens.join(" ")}` : ""}`,
    "",
    "Options:",
    ...(optionLines.length > 0 ? optionLines : ["  (No parameters defined)"]),
  ].join("\n");
}
