export function buildCommandList(config = {}) {
  const entries = Object.entries(config);
  if (entries.length === 0) {
    return "No commands configured yet. Run `launchr init` to add commands.";
  }

  return entries
    .map(([name, definition]) => `${name}  - ${definition.description}`)
    .join("\n");
}
