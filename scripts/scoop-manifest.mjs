#!/usr/bin/env node
// Print the Scoop manifest for a release from its SHA256SUMS file.
// Usage: node scripts/scoop-manifest.mjs <version> <SHA256SUMS path>
import { readFileSync } from 'node:fs';

export function scoopManifest(version, sumsText) {
  const sums = Object.fromEntries(
    sumsText.trim().split('\n')
      .map(line => line.trim().split(/\s+/))
      .map(([sha, file]) => [file.replace(/^\*/, ''), sha])
  );
  const file = `better-tg-cli-${version}-windows-x64.zip`;
  if (!sums[file]) throw new Error(`No checksum for ${file}`);
  const url = v => `https://github.com/TheVilfer/better-tg-cli/releases/download/v${v}/better-tg-cli-${v}-windows-x64.zip`;
  return {
    version,
    description: 'Telegram on your own account for the terminal and AI agents (unofficial client)',
    homepage: 'https://better-tg-cli.com',
    license: 'MIT',
    architecture: { '64bit': { url: url(version), hash: sums[file] } },
    bin: 'telegram.exe',
    checkver: { github: 'https://github.com/TheVilfer/better-tg-cli' },
    autoupdate: {
      architecture: {
        '64bit': { url: url('$version'), hash: { url: 'https://github.com/TheVilfer/better-tg-cli/releases/download/v$version/SHA256SUMS' } },
      },
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scoop-manifest.mjs')) {
  const [version, sumsPath] = process.argv.slice(2);
  if (!version || !sumsPath) {
    console.error('Usage: scoop-manifest.mjs <version> <SHA256SUMS>');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(scoopManifest(version, readFileSync(sumsPath, 'utf8')), null, 2) + '\n');
}
