# launchr CLI

<p align="center">
  <img src="assets/launchr-logo.png" alt="launchr logo" width="420">
</p>

`launchr` is a configuration-driven CLI to build URLs from typed parameters and open them in your default browser.

Built with:
- Node.js (ESM)
- `zx`
- `fs/promises`

## Requirements
- Node.js 20+

## Install
```bash
npm install
npm link
```

After linking, `launchr` is available in your shell.

## Configuration Location
`launchr` uses:

`~/.launchr-configurations/launchr-commands.json`

If the file is missing, the CLI prompts:

`No configuration found. Do you want to create one? (yes/no)`

If declined, the CLI exits with:

`Configuration file is required to use this CLI.`

## Commands
```bash
launchr
launchr help
launchr list
launchr init
launchr <custom-command> help
launchr <custom-command> [flags]
```

## Interactive Setup
Run:
```bash
launchr init
```

You will be asked for:
- command name
- description
- URL template (with named placeholders like `{query}`)
- parameters (loop until `done`)
  - key
  - type (`string`, `integer`, `boolean`, `single-choice-list`)
  - flag (`q` means `-q`)
  - required (`true/false`)
  - default value
  - allowed values (for `single-choice-list`)

Type `finish` when asked for command name to stop immediately.

## JSON Example
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
        "values": [
          "staging",
          "production"
        ]
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
        "values": [
          "5m",
          "10m",
          "1h",
          "6h"
        ]
      }
    }
  }
}
```

## Usage Examples
```bash
launchr list
launchr grafana help
launchr grafana -e production -q error -t 5m
```

## Validation and Errors
- schema validation on config load
- malformed JSON detection
- required parameter checks
- type checks (`string`, `integer`, `boolean`, `single-choice-list`)
- allowed-value checks for `single-choice-list`
- URL placeholder count checks

## Tests
```bash
npm test
```
