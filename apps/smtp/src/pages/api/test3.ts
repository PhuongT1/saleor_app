import { NextApiHandler } from "next";
import { createLogger } from "../../logger";
import { wrapWithLoggerContext } from "@saleor/apps-logger/node";
import { loggerContext } from "../../logger-context";
import { withOtel } from "@saleor/apps-otel";
import { captureException } from "@sentry/nextjs";

const handler: NextApiHandler = async (req, res) => {
  createLogger("logger test3").info("log test3");

  captureException(new Error("testing sentry"));

  res.status(200).send("ok");
};

export default wrapWithLoggerContext(withOtel(handler, "test3"), loggerContext);
