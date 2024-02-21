import * as trpcNext from "@trpc/server/adapters/next";
import { appRouter } from "../../../modules/trpc/trpc-app-router";
import { createTrpcContext } from "../../../modules/trpc/trpc-context";
import { withOtel } from "@saleor/apps-otel";
import { createLogger } from "../../../logger";

const logger = createLogger("tRPC error");

export default withOtel(
  trpcNext.createNextApiHandler({
    /**
     * TODO: Add middleware that verifies permissions
     */
    router: appRouter,
    createContext: createTrpcContext,
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        logger.error(`${path} returned error:`, error);
        return;
      }
      logger.debug(`${path} returned error:`, error);
    },
  }),
  "api/trpc",
);
