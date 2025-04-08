"server-only";

import { log } from "@logtail/next";
import { logger as triggerLogger } from "@trigger.dev/sdk/v3";

import { env } from "~/env";

const _logger = log.with({
  environment: env.NODE_ENV,
  source: "server",
});

const createLogger = (
  baseLogger: typeof _logger,
  options: { withTrigger?: boolean } = {},
) => {
  const logger = {
    ...baseLogger,
    info: (...args: Parameters<typeof baseLogger.info>) => {
      console.info(...args);
      baseLogger.info(...args);
      if (options.withTrigger) {
        triggerLogger.info(...args);
      }
    },
    debug: (...args: Parameters<typeof baseLogger.debug>) => {
      console.debug(...args);
      baseLogger.debug(...args);
      if (options.withTrigger) {
        triggerLogger.debug(...args);
      }
    },
    warn: (...args: Parameters<typeof baseLogger.warn>) => {
      console.warn(...args);
      baseLogger.warn(...args);
      if (options.withTrigger) {
        triggerLogger.warn(...args);
      }
    },
    error: (...args: Parameters<typeof baseLogger.error>) => {
      console.error(...args);
      baseLogger.error(...args);
      if (options.withTrigger) {
        triggerLogger.error(...args);
      }
    },
    withTrigger: () => createLogger(baseLogger, { withTrigger: true }),
  };

  return logger;
};

export const logger = createLogger(_logger);
