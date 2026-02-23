# launchr CLI

![launchr](assets/launchr-logo.png)

`launchr` is a configuration-driven CLI that turns typed flags into URLs and opens them in your default browser.

Installation and local development instructions are in [CONTRIBUTION.md](CONTRIBUTION.md).

## Product Features
- Configuration-driven custom commands defined in JSON.
- Interactive command creation with `launchr init` for command metadata, URL template, and parameter definitions.
- Typed runtime parameters with support for `string`, `integer`, `boolean`, and `single-choice-list`.
- Short-flag interface for all parameters (for example `-q`, `-e`, `-t`).
- Dynamic help and usage output for both built-in and custom commands.
- URL templating with named placeholders (for example `{query}`) mapped to parameter keys.
- Automatic config bootstrap prompt when the config file does not exist.
- Strong validation for config schema, placeholder integrity, unknown flags, required values, types, and allowed values.

## Built-in Commands
```bash
launchr
launchr help
launchr list
launchr init
launchr <custom-command> help
launchr <custom-command> [flags]
```

## Configuration
Configuration is stored at:

`~/.launchr-configurations/launchr-commands.json`

If the file is missing, `launchr` prompts to create it. If you decline, the CLI exits with:

`Configuration file is required to use this CLI.`

## Command Definition Example
```json
{
  "grafana": {
    "description": "some useful information",
    "url": "https://grafana.com/{environments}/{query}/{timeframe}",
    "parameters": {
      "environments": {
        "type": "single-choice-list",
        "flag": "e",
        "defaultValue": "staging",
        "required": true,
        "values": ["staging", "production"]
      },
      "query": {
        "type": "string",
        "flag": "q",
        "defaultValue": "error",
        "required": true
      },
      "timeframe": {
        "type": "single-choice-list",
        "flag": "t",
        "defaultValue": "5m",
        "required": true,
        "values": ["5m", "10m", "1h", "6h"]
      }
    }
  }
}
```

## Usage Example
```bash
launchr list
launchr grafana help
launchr grafana -e production -q error -t 5m
```
