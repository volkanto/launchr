import test from "node:test";
import assert from "node:assert/strict";
import { validateConfigSchema } from "../src/config/schema.mjs";

test("validateConfigSchema accepts valid config", () => {
  const config = {
    grafana: {
      description: "some useful information",
      url: "https://grafana.com/{environments}/{query}/{timeframe}",
      parameters: {
        environments: {
          type: "single-choice-list",
          flag: "e",
          defaultValue: "as01-prd01",
          required: true,
          values: ["as01-prd01", "eu01-prd01"],
        },
        query: {
          type: "string",
          flag: "q",
          defaultValue: "error",
          required: true,
        },
        timeframe: {
          type: "single-choice-list",
          flag: "t",
          defaultValue: "5m",
          required: true,
          values: ["5m", "10m", "1h", "6h"],
        },
      },
    },
  };

  assert.equal(validateConfigSchema(config), config);
});

test("validateConfigSchema rejects unknown placeholders", () => {
  const config = {
    google: {
      description: "search",
      url: "https://google.com/{query}/{scope}",
      parameters: {
        query: {
          type: "string",
          flag: "q",
          required: true,
        },
      },
    },
  };

  assert.throws(() => validateConfigSchema(config), /unknown placeholders/);
});

test("validateConfigSchema rejects missing placeholders", () => {
  const config = {
    google: {
      description: "search",
      url: "https://google.com/{query}",
      parameters: {
        query: {
          type: "string",
          flag: "q",
          required: true,
        },
        scope: {
          type: "string",
          flag: "s",
          required: false,
          defaultValue: "all",
        },
      },
    },
  };

  assert.throws(() => validateConfigSchema(config), /missing placeholders/);
});

test("validateConfigSchema rejects duplicated flags", () => {
  const config = {
    google: {
      description: "search",
      url: "https://google.com/{query}/{term}",
      parameters: {
        query: {
          type: "string",
          flag: "q",
          required: true,
        },
        term: {
          type: "string",
          flag: "q",
          required: true,
        },
      },
    },
  };

  assert.throws(() => validateConfigSchema(config), /duplicated flag/);
});
