export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? "APP_ERROR";
    this.cause = options.cause;
  }
}

export class UsageError extends AppError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "USAGE_ERROR" });
  }
}

export class ConfigError extends AppError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "CONFIG_ERROR" });
  }
}

export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "VALIDATION_ERROR" });
  }
}
