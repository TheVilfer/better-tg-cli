// Works out the release level from the squash-merged PR titles since the last tag, so nobody
// picks a version by hand. `Add …` (a feature) or a breaking marker (`!`, `BREAKING`) → minor
// (breaking is still minor before 1.0); anything else → patch; only `Release v…` commits → nothing.
// Usage: node scripts/next-version.mjs   → prints minor | patch, or nothing when there's nothing to release
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function bumpFor(subjects) {
  const changes = subjects.map(s => s.trim()).filter(s => s && !/^Release v\d/.test(s));
  if (!changes.length) return null;
  return changes.some(s => /^Add\b/.test(s) || /^[\w-]+(\([^)]*\))?!:/.test(s) || /\bBREAKING\b/.test(s)) ? 'minor' : 'patch';
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const last = git('describe', '--tags', '--abbrev=0', '--match', 'v*');
  const bump = bumpFor(git('log', '--format=%s', `${last}..HEAD`).split('\n'));
  if (bump) console.log(bump);
}
