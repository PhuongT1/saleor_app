import { attachLoggerConsoleTransport, createLogger, logger } from "@saleor/apps-logger";
import { addBreadcrumb } from "@sentry/nextjs";
import packageJson from "../package.json";

logger.settings.maskValuesOfKeys = ["metadata", "username", "password", "apiKey"];

if (process.env.NODE_ENV !== "production") {
  attachLoggerConsoleTransport(logger);
}

if (typeof window === "undefined") {
  import("@saleor/apps-logger/node").then(
    ({ attachLoggerOtelTransport, attachLoggerSentryTransport }) => {
      attachLoggerSentryTransport(logger, addBreadcrumb);
      attachLoggerOtelTransport(logger, packageJson.version);
    },
  );
}

export { createLogger, logger };
