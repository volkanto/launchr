export function parseArgv(argv) {
  const safeArgv = Array.isArray(argv) ? argv : [];
  return {
    command: safeArgv[0] ?? null,
    rest: safeArgv.slice(1),
  };
}
