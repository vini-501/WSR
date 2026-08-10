import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('artifacts/opshub/dist/public');

if (!fs.existsSync(src)) {
  console.error(`Source build directory does not exist: ${src}`);
  process.exit(1);
}

const targets = [
  path.resolve('public'),
  path.resolve('dist'),
];

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(src, target, { recursive: true });
  console.log(`✓ Copied build artifacts to ${target}`);
}
