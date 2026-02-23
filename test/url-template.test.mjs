import test from "node:test";
import assert from "node:assert/strict";
import { interpolateUrlTemplate, extractTemplatePlaceholders } from "../src/utils/url-template.mjs";

test("extractTemplatePlaceholders returns parameter keys in order", () => {
  assert.deepEqual(
    extractTemplatePlaceholders("https://grafana.com/{environments}/{query}/{timeframe}"),
    ["environments", "query", "timeframe"],
  );
});

test("interpolateUrlTemplate replaces named placeholders by key", () => {
  const value = interpolateUrlTemplate(
    "https://grafana.com/{environments}/{query}/{timeframe}",
    {
      environments: "staging",
      query: "error signal",
      timeframe: "5m",
    },
  );

  assert.equal(value, "https://grafana.com/staging/error%20signal/5m");
});

test("interpolateUrlTemplate throws when placeholder has no matching value", () => {
  assert.throws(
    () => interpolateUrlTemplate("https://google.com/{query}/{scope}", { query: "k8s" }),
    /no matching parameter value/,
  );
});
