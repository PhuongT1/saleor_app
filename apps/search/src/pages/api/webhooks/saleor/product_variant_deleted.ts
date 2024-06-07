import { NextWebhookApiHandler } from "@saleor/app-sdk/handlers/next";
import { ProductVariantDeleted } from "../../../../../generated/graphql";
import { WebhookActivityTogglerService } from "../../../../domain/WebhookActivityToggler.service";
import { createLogger } from "../../../../lib/logger";
import { webhookProductVariantDeleted } from "../../../../webhooks/definitions/product-variant-deleted";
import { createWebhookContext } from "../../../../webhooks/webhook-context";
import { withOtel } from "@saleor/apps-otel";
import { AlgoliaErrorParser } from "../../../../lib/algolia/algolia-error-parser";

export const config = {
  api: {
    bodyParser: false,
  },
};

const logger = createLogger("webhookProductVariantDeletedWebhookHandler");

export const handler: NextWebhookApiHandler<ProductVariantDeleted> = async (req, res, context) => {
  const { event, authData } = context;

  logger.info(`New event received: ${event} (${context.payload?.__typename})`, {
    saleorApiUrl: authData.saleorApiUrl,
  });

  const { productVariant } = context.payload;

  if (!productVariant) {
    logger.error("Webhook did not received expected product data in the payload.");
    return res.status(200).end();
  }

  try {
    const { algoliaClient, apiClient } = await createWebhookContext({ authData });

    try {
      await algoliaClient.deleteProductVariant(productVariant);

      res.status(200).end();
      return;
    } catch (e) {
      logger.error("Algolia deleteProductVariant failed.", { error: e });

      if (AlgoliaErrorParser.isAuthError(e)) {
        logger.warn("Detect Auth error from Algolia. Webhooks will be disabled", { error: e });

        const webhooksToggler = new WebhookActivityTogglerService(authData.appId, apiClient);

        logger.info("Will disable webhooks");

        await webhooksToggler.disableOwnWebhooks(
          context.payload.recipient?.webhooks?.map((w) => w.id),
        );

        logger.info("Webhooks disabling operation finished");
      }

      logger.error("Failed to execute product_variant_deleted webhook", { error: e });

      return res.status(500).send("Operation failed due to error");
    }
  } catch (e) {
    logger.error("Failed to execute product_variant_deleted webhook", { error: e });

    return res.status(400).json({
      message: (e as Error).message,
    });
  }
};

export default withOtel(
  webhookProductVariantDeleted.createHandler(handler),
  "api/webhooks/saleor/product_variant_deleted",
);
