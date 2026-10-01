// `npm pack` / `npm publish` hook: ships a lockfile in the npm package. The package has no runtime
// dependencies, so the lockfile only states that; the Claude plugin directory holds plugins that
// run a pinned npx package without one. `postpack` removes the file again, because at the repo
// root npm-shrinkwrap.json would take precedence over package-lock.json for `npm ci`.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const file = new URL('../npm-shrinkwrap.json', import.meta.url);

if (process.argv[2] === 'clean') {
  rmSync(file, { force: true });
} else {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  if (Object.keys(pkg.dependencies ?? {}).length) {
    throw new Error('shrinkwrap.mjs assumes zero runtime dependencies; generate it with npm instead');
  }
  const root = { name: pkg.name, version: pkg.version, license: pkg.license, bin: pkg.bin, engines: pkg.engines };
  const lock = { name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: { '': root } };
  writeFileSync(file, `${JSON.stringify(lock, null, 2)}\n`);
}
