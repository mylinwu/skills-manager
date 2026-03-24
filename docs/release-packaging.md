# Release Packaging Guide

This project uses `package.json` as the canonical version source and builds desktop installers with Tauri.

## 1. What You Can Build Without Apple Credentials

- You can build a Windows `.exe` installer on Windows without any Apple account.
- You can build a macOS `.dmg` on macOS without any Apple account.
- You only need Apple credentials when you want the macOS app to be signed and notarized.

In other words: no Apple account does **not** block DMG packaging. It only blocks the trusted distribution path on macOS.

## 2. Host OS Limits

- Windows installers must be built on Windows.
- macOS DMG installers must be built on macOS.
- `pnpm tauri:build` auto-detects the current host and selects the matching bundle.

If you need both installers from one release, use GitHub Actions with both Windows and macOS runners.

## 3. Local Development Prerequisites

- Node.js 22+
- `pnpm` 10.x
- Rust stable
- Tauri system prerequisites for your OS

Install dependencies:

```bash
pnpm install
```

## 4. Version Management

The canonical release version lives in `package.json`.

These files are kept in sync:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Available commands:

```bash
pnpm release:validate
pnpm release:sync
pnpm release:prepare 0.1.1
```

Recommended flow:

1. Run `pnpm release:prepare <version>`.
2. Review the changed files.
3. Commit the version bump.
4. Build locally or push a release tag.

## 5. Local Packaging Commands

### Auto-select for the current machine

```bash
pnpm tauri:build
```

Behavior:

- On Windows: builds an NSIS `.exe`
- On macOS: builds a `.dmg`
- On other systems: exits with an error

### Force a Windows installer

```bash
pnpm tauri:build:windows
```

Only works on Windows.

### Force a macOS DMG

```bash
pnpm tauri:build:macos
```

Only works on macOS.

## 6. Unsigned vs Signed macOS Builds

### Unsigned DMG

If no Apple credentials are present, the build script will still produce a `.dmg`.

Typical result:

- the DMG is created successfully
- the app is not notarized
- macOS may show stronger security prompts when opening it

### Signed and notarized DMG

To support a smoother macOS install experience, configure:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`
- `APPLE_ID`
- `APPLE_PASSWORD`

Optional:

- `APPLE_API_ISSUER`
- `APPLE_API_KEY`

Without these values, the project can still ship unsigned DMG artifacts.

## 7. Local Output Locations

Typical Tauri output folders:

- Windows release bundle: `src-tauri/target/release/bundle/nsis/`
- macOS release bundle: `src-tauri/target/release/bundle/dmg/`

Debug builds may appear under `src-tauri/target/debug/bundle/`.

## 8. GitHub Release Workflow

The GitHub workflow lives in `.github/workflows/release.yml`.

Trigger:

- push a tag like `v0.1.1`

Workflow behavior:

1. Installs dependencies
2. Validates version alignment
3. Verifies the tag matches `package.json`
4. Builds Windows NSIS on `windows-latest`
5. Builds macOS DMG on `macos-latest`
6. Uploads both artifacts to GitHub Releases

Generated release notes are enabled.

## 9. Recommended Release Steps

### Maintainer release checklist

1. Run `pnpm release:prepare <version>`.
2. Run `pnpm release:validate`.
3. Optionally test a local installer build on your host OS.
4. Commit the release changes.
5. Push the commit.
6. Create and push tag `v<version>`.
7. Verify the GitHub Actions release job completes.
8. Check the uploaded assets in GitHub Releases.

## 10. Troubleshooting

### `Cannot build macos bundles on win32`

This is expected. Build the DMG on a macOS machine or let GitHub Actions produce it.

### `Cannot build windows bundles on darwin`

This is expected. Build the NSIS installer on Windows or let GitHub Actions produce it.

### Version drift detected

Run:

```bash
pnpm release:sync
```

Or re-run:

```bash
pnpm release:prepare <version>
```

### macOS build succeeds but opens with warnings

That usually means the build is unsigned or not notarized. Packaging is still valid; trust prompts are expected until Apple credentials are configured.
