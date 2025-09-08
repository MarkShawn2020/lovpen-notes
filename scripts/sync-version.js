#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json if not provided as argument
let version = process.argv[2];
if (!version) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version;
}

console.log(`Syncing version to ${version}...`);

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('✓ Updated tauri.conf.json');

// Update Cargo.toml
const cargoTomlPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
fs.writeFileSync(cargoTomlPath, cargoToml);
console.log('✓ Updated Cargo.toml');

console.log('Version sync complete!');