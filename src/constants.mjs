export const BUILTIN_COMMANDS = [
  { name: "help", description: "Show manual" },
  { name: "list", description: "List available commands" },
  { name: "add", description: "Add command interactively" },
];

export const HIDDEN_COMMANDS = ["__complete"];

export const PARAMETER_TYPES = [
  "string",
  "integer",
  "boolean",
  "single-choice-list",
];

export const CONFIG_PROMPT_TEXT =
  "No configuration found. Do you want to create one? (yes/no)";

export const CONFIG_REQUIRED_MESSAGE =
  "Configuration file is required to use this CLI.";
