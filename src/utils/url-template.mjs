import { ValidationError } from "./errors.mjs";

const PLACEHOLDER_PATTERN = /{([a-zA-Z0-9_-]+)}/g;

export function extractTemplatePlaceholders(template) {
  const text = String(template);
  const placeholders = [];

  PLACEHOLDER_PATTERN.lastIndex = 0;
  let match = PLACEHOLDER_PATTERN.exec(text);
  while (match !== null) {
    placeholders.push(match[1]);
    match = PLACEHOLDER_PATTERN.exec(text);
  }

  return placeholders;
}

function hasOwnKey(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function encodeTemplateValue(value) {
  return encodeURIComponent(String(value));
}

export function interpolateUrlTemplate(template, valuesByParameterKey) {
  const text = String(template);
  return text.replace(PLACEHOLDER_PATTERN, (fullMatch, parameterKey) => {
    if (!hasOwnKey(valuesByParameterKey, parameterKey)) {
      throw new ValidationError(`URL placeholder "{${parameterKey}}" has no matching parameter value.`);
    }

    return encodeTemplateValue(valuesByParameterKey[parameterKey]);
  });
}
