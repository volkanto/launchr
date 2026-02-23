import { parseShortFlags } from "../parsing/flags.mjs";
import { interpolateUrlTemplate } from "../utils/url-template.mjs";
import { resolveRuntimeParameters } from "../validation/runtime-params.mjs";

export async function runCustomCommand({
  commandName,
  commandConfig,
  argv,
  openUrl,
}) {
  const valuesByFlag = parseShortFlags(argv);
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
