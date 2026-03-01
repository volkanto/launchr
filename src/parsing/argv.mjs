import { UsageError } from "../utils/errors.mjs";

export function parseArgv(argv) {
  const safeArgv = Array.isArray(argv) ? argv : [];
  let interactive = false;
  let commandIndex = 0;

  while (commandIndex < safeArgv.length) {
    const token = safeArgv[commandIndex];
    if (token === "-i" || token === "--interactive") {
      interactive = true;
      commandIndex += 1;
      continue;
    }

    if (typeof token === "string" && token.startsWith("-")) {
      throw new UsageError(`Unknown global option "${token}".`);
    }

    break;
  }

  return {
    command: safeArgv[commandIndex] ?? null,
    rest: safeArgv.slice(commandIndex + 1),
    options: {
      interactive,
    },
  };
}
