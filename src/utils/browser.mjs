import process from "node:process";
import { ValidationError } from "./errors.mjs";

const SPECIAL_SCHEMES = ["mailto:", "tel:", "sms:", "data:"];

function hasExplicitScheme(value) {
  return value.includes("://") || SPECIAL_SCHEMES.some((scheme) => value.toLowerCase().startsWith(scheme));
}

export function normalizeUrlTarget(rawUrl) {
  const value = String(rawUrl ?? "").trim();

  if (value.length === 0) {
    throw new ValidationError("URL is empty after interpolation.");
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (hasExplicitScheme(value)) {
    return value;
  }

  return `https://${value}`;
}

export function assertValidAbsoluteUrl(url) {
  try {
    // URL constructor enforces absolute URL validity.
    // Relative or malformed targets should fail fast with a clear error.
    new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }
}

async function runWithZx(command, url) {
  const { $ } = await import("zx");
  if (command === "open") {
    await $`open ${url}`;
    return;
  }
  if (command === "cmd") {
    await $`cmd /c start "" ${url}`;
    return;
  }
  await $`xdg-open ${url}`;
}

export async function openInBrowser(url, options = {}) {
  const platform = options.platform ?? process.platform;
  const runCommand = options.runCommand ?? runWithZx;

  const normalizedUrl = normalizeUrlTarget(url);
  assertValidAbsoluteUrl(normalizedUrl);

  if (platform === "darwin") {
    await runCommand("open", normalizedUrl);
    return;
  }

  if (platform === "win32") {
    await runCommand("cmd", normalizedUrl);
    return;
  }

  await runCommand("xdg-open", normalizedUrl);
}
