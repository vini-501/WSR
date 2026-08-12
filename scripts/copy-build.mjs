import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const src = path.resolve(rootDir, 'artifacts/opshub/dist/public');

if (!fs.existsSync(src)) {
  console.error(`Source build directory does not exist: ${src}`);
  process.exit(1);
}

const targets = [
  path.resolve(rootDir, 'public'),
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'artifacts/api-server/public'),
  path.resolve(rootDir, 'artifacts/api-server/dist/public'),
];

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(src, target, { recursive: true });
  console.log(`✓ Copied build artifacts to ${target}`);
}
