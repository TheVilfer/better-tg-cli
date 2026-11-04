import { inject } from 'vitest';

/** Node arguments that run the CLI from src/ in a child process (see test/global-setup.ts). */
export function cliArgs(): string[] {
  const entry = inject('cliEntry');
  return entry ? [entry] : ['--import', 'tsx', 'src/index.ts'];
}
