# launchr v1.1.0

Command naming transition release.

## Highlights

- Added `launchr add` as the canonical interactive command-definition flow.
- Kept `launchr init` as a backward-compatible alias in v1.x.
- Added deprecation warning when alias is used: `"init" is deprecated. Use "launchr add".`
- Updated help output and documentation to guide users to `launchr add`.

## Transition Policy

- v1.x: `add` is canonical; `init` remains available as deprecated alias.
- v2.0.0: `init` alias is removed; `add` is the only interactive entrypoint.
