# Contribution Guide

This document covers installation, local development, testing, and release flow for `launchr`.

## Prerequisites
- Node.js 20+
- npm

## Installation
From the repository root:

```bash
npm install
npm link
```

After linking, `launchr` is available in your shell.

## Local Development
Run the CLI directly from source:

```bash
npm start
```

Run with arguments:

```bash
npm start -- help
npm start -- list
```

Use the linked binary:

```bash
launchr help
```

## Configuration for Local Testing
The CLI reads commands from:

`~/.launchr-configurations/launchr-commands.json`

If the file is missing, run:

```bash
launchr init
```

or answer `yes` to the auto-create prompt.

## Running Tests
```bash
npm test
```

## Publish to npm (GitHub Actions)
The workflow is located at:

`.github/workflows/publish-npm.yml`

Publishing is triggered when you:
- push a tag matching `v*`
- publish a GitHub Release

Rules:
- tag must match package version in `package.json` (example: `v1.2.3`)
- tests must pass before publish
- if that version already exists on npm, publish is skipped

Required GitHub secret:
- `NPM_TOKEN` with npm publish access

Typical release flow:

```bash
npm version patch
git push origin main --follow-tags
```
