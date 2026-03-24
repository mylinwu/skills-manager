import { spawnSync } from "node:child_process";
import process from "node:process";

const target = process.argv[2] ?? "auto";

const platformConfig = {
  windows: {
    platform: "win32",
    bundle: "nsis",
    outputDir: "src-tauri/target/release/bundle/nsis",
    signingKeys: ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"],
    label: "Windows NSIS installer",
  },
  macos: {
    platform: "darwin",
    bundle: "dmg",
    outputDir: "src-tauri/target/release/bundle/dmg",
    signingKeys: ["APPLE_SIGNING_IDENTITY", "APPLE_TEAM_ID"],
    notarizationKeys: ["APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"],
    label: "macOS DMG installer",
  },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolveTarget(name) {
  if (name === "auto") {
    if (process.platform === "win32") {
      return "windows";
    }
    if (process.platform === "darwin") {
      return "macos";
    }
    fail("Automatic bundle selection is only supported on Windows or macOS hosts.");
  }

  if (!platformConfig[name]) {
    fail("Usage: pnpm tauri:build[:auto|:windows|:macos]");
  }

  return name;
}

function hasEnvKeys(keys) {
  return keys.every((key) => Boolean(process.env[key]));
}

function run(command, args) {
  const result =
    process.platform === "win32"
      ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], {
          stdio: "inherit",
          shell: false,
          env: process.env,
        })
      : spawnSync(command, args, {
          stdio: "inherit",
          shell: false,
          env: process.env,
        });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const resolvedTarget = resolveTarget(target);
const config = platformConfig[resolvedTarget];

if (process.platform !== config.platform) {
  fail(`Cannot build ${resolvedTarget} bundles on ${process.platform}. Use a ${resolvedTarget} host or GitHub Actions.`);
}

console.log(`Preparing ${config.label} on ${process.platform}`);

if (resolvedTarget === "windows") {
  const signed = hasEnvKeys(config.signingKeys);
  console.log(
    signed
      ? "Windows signing secrets detected. The installer build will use them if the release workflow requires signing."
      : "Windows signing secrets not detected. Building an unsigned installer.",
  );
}

if (resolvedTarget === "macos") {
  const canSign = hasEnvKeys(config.signingKeys);
  const canNotarize = hasEnvKeys(config.notarizationKeys);

  console.log(
    canSign
      ? "macOS signing information detected."
      : "No Apple signing information detected. Building an unsigned DMG.",
  );

  console.log(
    canNotarize
      ? "Apple notarization credentials detected."
      : "No Apple notarization credentials detected. The DMG will not be notarized.",
  );
}

run("pnpm", ["run", "release:validate"]);
run("pnpm", ["exec", "tauri", "build", "--bundles", config.bundle]);

console.log(`Bundle build complete. Expected output directory: ${config.outputDir}`);
