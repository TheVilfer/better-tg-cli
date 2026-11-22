import { vi } from "vitest";

/**
 * How long a test (or hook) that starts processes may take: the CLI, node, PowerShell, `telegram
 * mcp`, sh. A CLI start costs about 0.4 s on a CI runner and PowerShell about 3 s cold (once more
 * than 20 s on windows-latest), and one test often starts ten of them; Vitest's 5 s default stays
 * for unit tests.
 */
export const SPAWN_TIMEOUT = process.platform === "win32" ? 60_000 : 30_000;

/**
 * Gives every test and hook of the calling file SPAWN_TIMEOUT. Called once at the top of each test
 * file that starts processes; `vi.setConfig` lasts for that file only.
 */
export function useSpawnTimeout(): void {
  vi.setConfig({ testTimeout: SPAWN_TIMEOUT, hookTimeout: SPAWN_TIMEOUT });
}
