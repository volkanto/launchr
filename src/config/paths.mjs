import os from "node:os";
import path from "node:path";

export function getConfigDirPath(homeDir = os.homedir()) {
  return path.join(homeDir, ".launchr-configurations");
}

export function getConfigFilePath(homeDir = os.homedir()) {
  return path.join(getConfigDirPath(homeDir), "launchr-commands.json");
}
