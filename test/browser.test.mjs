import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeUrlTarget,
  assertValidAbsoluteUrl,
  openInBrowser,
} from "../src/utils/browser.mjs";

test("normalizeUrlTarget adds https to scheme-less host paths", () => {
  assert.equal(normalizeUrlTarget("test.com/asd"), "https://test.com/asd");
  assert.equal(normalizeUrlTarget("localhost:3000/docs"), "https://localhost:3000/docs");
});

test("normalizeUrlTarget preserves explicit schemes", () => {
  assert.equal(normalizeUrlTarget("https://test.com/asd"), "https://test.com/asd");
  assert.equal(normalizeUrlTarget("mailto:user@example.com"), "mailto:user@example.com");
  assert.equal(normalizeUrlTarget("//cdn.example.com/lib.js"), "https://cdn.example.com/lib.js");
});

test("normalizeUrlTarget rejects empty input", () => {
  assert.throws(() => normalizeUrlTarget("   "), /URL is empty/);
});

test("assertValidAbsoluteUrl rejects malformed URLs", () => {
  assert.throws(() => assertValidAbsoluteUrl("http://"), /Invalid URL/);
});

test("openInBrowser invokes platform opener with normalized URL", async () => {
  const calls = [];

  await openInBrowser("test.com/asd", {
    platform: "darwin",
    runCommand: async (command, url) => {
      calls.push({ command, url });
    },
  });

  assert.deepEqual(calls, [{ command: "open", url: "https://test.com/asd" }]);
});
