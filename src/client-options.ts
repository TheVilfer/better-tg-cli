import { Logger, LogLevel } from 'teleproto/extensions/Logger.js';
import { loadConfig } from './config.js';

const LEVELS: Record<string, LogLevel> = {
  none: LogLevel.NONE, error: LogLevel.ERROR, warn: LogLevel.WARN, info: LogLevel.INFO, debug: LogLevel.DEBUG,
};

/**
 * teleproto's logger prints to stdout, which would corrupt --json and `watch --json`;
 * every line goes to stderr instead. TG_LOG_LEVEL=debug shows the MTProto traffic.
 */
export function createLogger(level = process.env.TG_LOG_LEVEL?.toLowerCase()): Logger {
  const logger = new Logger(LEVELS[level ?? ''] ?? LogLevel.ERROR);
  logger.log = (lvl, message, error) => {
    process.stderr.write(`[${lvl}] ${message}\n`);
    if (error !== undefined) process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  };
  return logger;
}

/**
 * Options for every TelegramClient. `testServers` comes from the profile's config
 * (set by `telegram auth --test-dc`): a session belongs to one environment.
 */
export function clientParams(testServers = !!loadConfig(() => {}).testServers) {
  return { connectionRetries: 5, baseLogger: createLogger(), testServers };
}
