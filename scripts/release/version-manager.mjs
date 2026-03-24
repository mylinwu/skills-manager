import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");
const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");

const args = process.argv.slice(2);
const command = args[0];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value);
}

function getCanonicalVersion() {
  return readJson(packageJsonPath).version;
}

function getVersions() {
  const packageJson = readJson(packageJsonPath);
  const tauriConfig = readJson(tauriConfigPath);
  const cargoToml = readText(cargoTomlPath);
  const cargoVersionMatch = cargoToml.match(/^version = "([^"]+)"$/m);

  if (!cargoVersionMatch) {
    throw new Error("Could not find version field in src-tauri/Cargo.toml");
  }

  return {
    packageVersion: packageJson.version,
    tauriVersion: tauriConfig.version,
    cargoVersion: cargoVersionMatch[1],
  };
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
}

function setPackageVersion(version) {
  const packageJson = readJson(packageJsonPath);
  packageJson.version = version;
  writeJson(packageJsonPath, packageJson);
}

function syncMirrors(version) {
  const tauriConfig = readJson(tauriConfigPath);
  tauriConfig.version = version;
  writeJson(tauriConfigPath, tauriConfig);

  const cargoToml = readText(cargoTomlPath);
  const hasVersionField = /^version = "([^"]+)"$/m.test(cargoToml);
  if (!hasVersionField) {
    throw new Error("Could not find version field in src-tauri/Cargo.toml");
  }

  const nextCargoToml = cargoToml.replace(/^version = "([^"]+)"$/m, `version = "${version}"`);
  writeText(cargoTomlPath, nextCargoToml);
}

function validateVersions() {
  const { packageVersion, tauriVersion, cargoVersion } = getVersions();
  const versions = [
    ["package.json", packageVersion],
    ["src-tauri/tauri.conf.json", tauriVersion],
    ["src-tauri/Cargo.toml", cargoVersion],
  ];

  const mismatches = versions.filter(([, value]) => value !== packageVersion);
  if (mismatches.length > 0) {
    const details = versions.map(([file, value]) => `${file}: ${value}`).join("\n");
    throw new Error(
      `Version drift detected. package.json is the canonical source of truth.\n${details}\nRun: pnpm release:sync`,
    );
  }

  return packageVersion;
}

function prepareRelease(version) {
  assertSemver(version);
  setPackageVersion(version);
  syncMirrors(version);
  validateVersions();
  console.log(`Prepared release version ${version}`);
}

switch (command) {
  case "validate": {
    const version = validateVersions();
    console.log(`Version check passed for ${version}`);
    break;
  }
  case "sync": {
    const version = getCanonicalVersion();
    assertSemver(version);
    syncMirrors(version);
    validateVersions();
    console.log(`Synchronized release version ${version}`);
    break;
  }
  case "prepare": {
    const version = args[1];
    if (!version) {
      throw new Error("Usage: pnpm release:prepare <version>");
    }
    prepareRelease(version);
    break;
  }
  default:
    throw new Error("Usage: pnpm release:validate | pnpm release:sync | pnpm release:prepare <version>");
}
