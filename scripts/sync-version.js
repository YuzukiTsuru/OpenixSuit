import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const tauriConfPath = join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));

tauriConf.version = packageJson.version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
console.log(`Synced version ${packageJson.version} to tauri.conf.json`);

const cargoTomlPath = join(__dirname, '..', 'src-tauri', 'Cargo.toml');
let cargoToml = readFileSync(cargoTomlPath, 'utf-8');
cargoToml = cargoToml.replace(
  /^(version\s*=\s*)"[^"]*"/m,
  `$1"${packageJson.version}"`
);
writeFileSync(cargoTomlPath, cargoToml);
console.log(`Synced version ${packageJson.version} to Cargo.toml`);
