import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs script without types
import { bumpFor } from '../scripts/next-version.mjs';

describe('next-version', () => {
  it('is minor when a PR adds something, patch otherwise, nothing after only a release', () => {
    expect(bumpFor(['Fix the QR timeout (#20)', 'Add Spanish to the onboard page (#12)'])).toBe('minor');
    expect(bumpFor(['Fix the QR timeout (#20)', 'Update README (#21)', 'Wait longer for npm (#11)'])).toBe('patch');
    expect(bumpFor(['feat!: drop Node 18', 'Fix typo'])).toBe('minor');
    expect(bumpFor(['Change the config format (BREAKING)'])).toBe('minor');
    expect(bumpFor(['Addendum to docs'])).toBe('patch');
    expect(bumpFor(['Release v0.30.0 (#13)', ''])).toBeNull();
    expect(bumpFor([])).toBeNull();
  });
});
