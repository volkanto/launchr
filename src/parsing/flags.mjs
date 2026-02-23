import { UsageError } from "../utils/errors.mjs";

function isFlagToken(token) {
  return typeof token === "string" && /^-[a-zA-Z]$/.test(token);
}

export function parseShortFlags(tokens) {
  const providedTokens = Array.isArray(tokens) ? tokens : [];
  const valuesByFlag = new Map();

  for (let index = 0; index < providedTokens.length; index += 1) {
    const token = providedTokens[index];
    if (!isFlagToken(token)) {
      throw new UsageError(`Unexpected token: "${token}". Only short flags like -q are supported.`);
    }

    const flag = token.slice(1);
    if (valuesByFlag.has(flag)) {
      throw new UsageError(`Flag "-${flag}" was provided more than once.`);
    }

    const nextToken = providedTokens[index + 1];
    if (nextToken === undefined || isFlagToken(nextToken)) {
      valuesByFlag.set(flag, true);
      continue;
    }

    valuesByFlag.set(flag, nextToken);
    index += 1;
  }

  return valuesByFlag;
}
