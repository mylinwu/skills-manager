# Skills Manager

Skills Manager is a Tauri desktop app for managing local Codex/Claude-style skills from a native UI.

## Install

Download the latest desktop installer from the repository's GitHub Releases page.

- Windows: use the `.exe` installer from the latest release.
- macOS: use the `.dmg` from the latest release.

Early open source releases may be unsigned until signing credentials are configured in CI.

## Development

### Requirements

- Node.js 22+
- `pnpm` 10.x
- Rust stable

### Commands

```bash
pnpm install
pnpm tauri:dev
```

Other useful commands:

```bash
pnpm build
pnpm tauri:build
pnpm tauri:build:windows
pnpm tauri:build:macos
pnpm release:validate
pnpm release:sync
pnpm release:prepare 0.1.1
```

`pnpm tauri:build` will auto-select the correct installer type for the current host OS:

- Windows host: NSIS `.exe`
- macOS host: `.dmg`

You do not need an Apple account to build a `.dmg`. You only need Apple credentials if you want the macOS build to be signed and notarized.

## Versioning And Releases

`package.json` is the canonical version source. The release helper mirrors that version into:

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Release workflow:

1. Run `pnpm release:prepare <version>`.
2. Commit the version changes.
3. Push a Git tag in the format `v<version>`, for example `v0.1.1`.
4. GitHub Actions builds Windows and macOS installers and uploads them to GitHub Releases.

The release workflow validates that the tag version matches `package.json` and fails fast on version drift.

## Signing Secrets

The release workflow is ready for signed builds, but it can still publish unsigned artifacts when secrets are missing.

- Tauri updater signing: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- macOS signing/notarization: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_TEAM_ID`
- macOS notarization auth: `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- Optional App Store Connect auth: `APPLE_API_ISSUER`, `APPLE_API_KEY`

For a complete packaging guide, see [docs/release-packaging.md](./docs/release-packaging.md).

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
