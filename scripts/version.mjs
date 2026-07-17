// Bump the version of BOTH package.json files (root workspace + library) at once.
//
// Usage:
//   npm run version major     -> 1.0.0 -> 2.0.0
//   npm run version minor     -> 1.0.0 -> 1.1.0
//   npm run version fix       -> 1.0.0 -> 1.0.1   (alias of "patch")
//   npm run version 0.4.2     -> set an explicit version
//
// It only rewrites the "version" fields. The published version still comes from
// the git tag via .github/workflows/publish.yml — this just keeps the repo in sync.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// The two package.json files that must always share the same version.
const FILES = [
  resolve(root, 'package.json'),
  resolve(root, 'projects/snackng/package.json'),
];

const arg = process.argv[2];

if (!arg) {
  console.error('Missing argument. Usage: npm run version <major|minor|fix|x.y.z>');
  process.exit(1);
}

// Current version is read from the root package.json (single source of truth).
const current = JSON.parse(readFileSync(FILES[0], 'utf8')).version;

function bump(version, kind) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Current version "${version}" is not a plain x.y.z semver.`);
  }
  const [major, minor, patch] = parts;
  switch (kind) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'fix':
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump "${kind}".`);
  }
}

let next;
if (/^\d+\.\d+\.\d+/.test(arg)) {
  // Explicit version (allows pre-release / build metadata, e.g. 1.2.0-beta.1).
  next = arg;
} else {
  next = bump(current, arg);
}

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  const pkg = JSON.parse(raw);
  pkg.version = next;
  // Preserve trailing newline if the file had one.
  const newline = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(file, JSON.stringify(pkg, null, 2) + newline);
}

console.log(`\n  ${current}  ->  ${next}   (updated ${FILES.length} package.json files)\n`);
console.log('  Next steps to release:');
console.log(`    git commit -am "${next}"`);
console.log(`    git tag -a v${next} -m "v${next}"`);
console.log('    git push --follow-tags');
console.log('    # then create a GitHub Release from the tag to trigger publish.yml\n');
