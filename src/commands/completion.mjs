import { BUILTIN_COMMANDS } from "../constants.mjs";
import { UsageError } from "../utils/errors.mjs";

function normalizeDescription(rawDescription) {
  if (typeof rawDescription !== "string") {
    return "No description";
  }

  const trimmed = rawDescription.trim();
  return trimmed.length > 0 ? trimmed : "No description";
}

function escapeZshDescription(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll(":", "\\:");
}

function formatEntries(entries) {
  return entries
    .map((entry) => `${entry.value}:${escapeZshDescription(entry.description)}`)
    .join("\n");
}

function matchesPrefix(value, prefix) {
  if (!prefix) {
    return true;
  }
  return String(value).startsWith(prefix);
}

function getExactFlagName(token) {
  if (typeof token !== "string" || !/^-[a-zA-Z]$/.test(token)) {
    return null;
  }

  return token.slice(1);
}

function getParameterEntries(commandConfig) {
  return Object.entries(commandConfig?.parameters ?? {}).map(([parameterKey, definition]) => {
    return {
      parameterKey,
      definition,
      flag: definition.flag.replace(/^-+/, ""),
    };
  });
}

function buildValueEntries(parameterEntry, prefix) {
  if (!parameterEntry) {
    return [];
  }

  if (parameterEntry.definition.type === "single-choice-list") {
    return parameterEntry.definition.values
      .filter((value) => matchesPrefix(value, prefix))
      .map((value) => ({ value, description: parameterEntry.parameterKey }));
  }

  if (parameterEntry.definition.type === "boolean") {
    return ["true", "false"]
      .filter((value) => matchesPrefix(value, prefix))
      .map((value) => ({ value, description: parameterEntry.parameterKey }));
  }

  return [];
}

function collectUsedFlags(tokens, parameterEntriesByFlag) {
  const usedFlags = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const flag = getExactFlagName(token);
    if (!flag) {
      continue;
    }

    if (index === tokens.length - 1) {
      break;
    }

    usedFlags.add(flag);
    const parameterEntry = parameterEntriesByFlag.get(flag);
    if (!parameterEntry) {
      continue;
    }

    const nextToken = tokens[index + 1];
    if (parameterEntry.definition.type !== "boolean" && getExactFlagName(nextToken) === null) {
      index += 1;
    }
  }

  return usedFlags;
}

export function buildTopLevelCompletionEntries(config = {}) {
  const customCommandEntries = Object.entries(config).map(([commandName, commandConfig]) => {
    return {
      value: commandName,
      description: normalizeDescription(commandConfig?.description),
    };
  });

  return [
    ...BUILTIN_COMMANDS.map((command) => ({
      value: command.name,
      description: command.description,
    })),
    ...customCommandEntries,
  ];
}

export function buildCommandArgumentCompletionEntries(commandName, commandConfig, tokens = []) {
  if (!commandConfig) {
    return [];
  }

  const safeTokens = Array.isArray(tokens) ? tokens.filter((token) => typeof token === "string") : [];
  const parameterEntries = getParameterEntries(commandConfig);
  const parameterEntriesByFlag = new Map(parameterEntries.map((entry) => [entry.flag, entry]));

  if (safeTokens.length === 0) {
    return [
      { value: "help", description: `Show help for ${commandName}` },
      ...parameterEntries.map((entry) => ({
        value: `-${entry.flag}`,
        description: entry.parameterKey,
      })),
    ];
  }

  const lastToken = safeTokens[safeTokens.length - 1];
  const lastExactFlag = getExactFlagName(lastToken);
  if (lastExactFlag) {
    return formatArgumentEntriesForFlag(parameterEntriesByFlag, lastExactFlag, "");
  }

  const previousExactFlag = getExactFlagName(safeTokens[safeTokens.length - 2]);
  if (previousExactFlag) {
    return formatArgumentEntriesForFlag(parameterEntriesByFlag, previousExactFlag, lastToken);
  }

  if (lastToken.startsWith("-")) {
    const usedFlags = collectUsedFlags(safeTokens.slice(0, -1), parameterEntriesByFlag);
    return parameterEntries
      .filter((entry) => !usedFlags.has(entry.flag))
      .map((entry) => ({
        value: `-${entry.flag}`,
        description: entry.parameterKey,
      }))
      .filter((entry) => matchesPrefix(entry.value, lastToken));
  }

  if (safeTokens.length === 1) {
    return [{ value: "help", description: `Show help for ${commandName}` }]
      .filter((entry) => matchesPrefix(entry.value, lastToken));
  }

  return [];
}

function formatArgumentEntriesForFlag(parameterEntriesByFlag, flag, prefix) {
  const parameterEntry = parameterEntriesByFlag.get(flag);
  if (!parameterEntry) {
    return [];
  }

  return buildValueEntries(parameterEntry, prefix);
}

export function renderZshCompletionEntries(entries) {
  return formatEntries(entries);
}

export function buildZshCompletionScript() {
  return `#compdef launchr

local context state
typeset -A opt_args

_arguments -C \\
  '(-i --interactive)'{-i,--interactive}'[Prompt for missing required parameters]' \\
  '1:command:->command' \\
  '*::argument:->args'

case "$state" in
  command)
    local -a commands
    commands=("\${(@f)\$(launchr __complete top)}")
    _describe -t commands 'launchr command' commands
    return
    ;;
  args)
    local selected_command=""
    local -a command_args
    local word_index
    local arg_index

    for (( word_index = 2; word_index <= \${#words}; word_index += 1 )); do
      case "\${words[word_index]}" in
        -i|--interactive)
          continue
          ;;
        *)
          selected_command="\${words[word_index]}"
          for (( arg_index = word_index + 1; arg_index <= \${#words}; arg_index += 1 )); do
            command_args+=("\${words[arg_index]}")
          done
          break
          ;;
      esac
    done

    if [[ -z "$selected_command" ]]; then
      return
    fi

    local -a args
    args=("\${(@f)\$(launchr __complete args "$selected_command" "\${command_args[@]}")}")
    if (( \${#args[@]} > 0 )); then
      _describe -t arguments "$selected_command arguments" args
    fi
    return
    ;;
esac
`;
}

export function resolveCompletionResponse(config, argv = []) {
  const [scope, commandName, ...tokens] = Array.isArray(argv) ? argv : [];

  if (scope === "top") {
    return renderZshCompletionEntries(buildTopLevelCompletionEntries(config));
  }

  if (scope === "args") {
    if (!commandName) {
      return "";
    }

    const commandConfig = config[commandName];
    return renderZshCompletionEntries(
      buildCommandArgumentCompletionEntries(commandName, commandConfig, tokens),
    );
  }

  throw new UsageError('Unknown completion scope. Supported scopes: "top", "args".');
}
