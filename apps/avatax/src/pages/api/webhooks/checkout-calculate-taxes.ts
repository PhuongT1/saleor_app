import { withOtel } from "@saleor/apps-otel";
import * as Sentry from "@sentry/nextjs";
import { captureException } from "@sentry/nextjs";
import { createLogger } from "../../../logger";

import { wrapWithLoggerContext } from "@saleor/apps-logger/node";
import { ObservabilityAttributes } from "@saleor/apps-otel/src/lib/observability-attributes";
import { metadataCache, wrapWithMetadataCache } from "../../../lib/app-metadata-cache";
import { loggerContext } from "../../../logger-context";
import { MissingAddressAvataxWebhookService } from "../../../modules/avatax/calculate-taxes/missing-address-avatax-webhook-service";
import {
  InvalidAppAddressError,
  TaxIncompletePayloadErrors,
} from "../../../modules/taxes/tax-error";
import { checkoutCalculateTaxesSyncWebhook } from "../../../modules/webhooks/definitions/checkout-calculate-taxes";
import { verifyCalculateTaxesPayload } from "../../../modules/webhooks/validate-webhook-payload";
import { AppConfigurationLogger } from "../../../lib/app-configuration-logger";
import { AppConfigExtractor } from "../../../lib/app-config-extractor";

export const config = {
  api: {
    bodyParser: false,
  },
};

const withMetadataCache = wrapWithMetadataCache(metadataCache);

/**
 * TODO: Add tests to handler
 */
export default wrapWithLoggerContext(
  withOtel(
    withMetadataCache(
      checkoutCalculateTaxesSyncWebhook.createHandler(async (req, res, ctx) => {
        const logger = createLogger("checkoutCalculateTaxesSyncWebhook");

        try {
          const { payload } = ctx;

          loggerContext.set("channelSlug", ctx.payload.taxBase.channel.slug);
          loggerContext.set("checkoutId", ctx.payload.taxBase.sourceObject.id);
          if (payload.version) {
            Sentry.setTag(ObservabilityAttributes.SALEOR_VERSION, payload.version);
            loggerContext.set(ObservabilityAttributes.SALEOR_VERSION, payload.version);
          }

          logger.info("Handler for CHECKOUT_CALCULATE_TAXES webhook called");

          const payloadVerificationResult = verifyCalculateTaxesPayload(payload);

          if (payloadVerificationResult.isErr()) {
            const error = payloadVerificationResult.error;

            switch (true) {
              case error instanceof TaxIncompletePayloadErrors.MissingAddressError:
                logger.info(
                  "Missing address in the payload. Returning totalPrice and shippingPrice as a fallback.",
                );
                const calculatedTaxes =
                  MissingAddressAvataxWebhookService.calculateTaxesNoop(payload);

                return res.status(200).send(ctx.buildResponse(calculatedTaxes));
              default:
                logger.warn("Failed to calculate taxes, due to incomplete payload", {
                  error: payloadVerificationResult.error,
                });
                return res.status(400).send(error.message);
            }
          }

          const appMetadata = payload.recipient?.privateMetadata ?? [];
          const channelSlug = payload.taxBase.channel.slug;

          const configExtractor = new AppConfigExtractor();

          const config = configExtractor
            .extractAppConfigFromPrivateMetadata(appMetadata)
            .map((config) => {
              try {
                new AppConfigurationLogger(logger).logConfiguration(config, channelSlug);
              } catch (e) {
                captureException(
                  new AppConfigExtractor.LogConfigurationMetricError(
                    "Failed to log configuration metric",
                    {
                      cause: e,
                    },
                  ),
                );
              }

              return config;
            });

          if (config.isErr()) {
            logger.warn("Failed to extract app config from metadata", { error: config.error });

            return res.status(400).send("App configuration is broken");
          }

          metadataCache.setMetadata(appMetadata);

          const AvataxWebhookServiceFactory = await import(
            "../../../modules/taxes/avatax-webhook-service-factory"
          ).then((m) => m.AvataxWebhookServiceFactory);

          const webhookServiceResult = AvataxWebhookServiceFactory.createFromConfig(
            config.value,
            channelSlug,
          );

          if (webhookServiceResult.isErr()) {
            const err = webhookServiceResult.error;

            logger.warn(`Error in taxes calculation occurred: ${err.name} ${err.message}`, {
              error: err,
            });

            switch (err["constructor"]) {
              case AvataxWebhookServiceFactory.BrokenConfigurationError: {
                return res.status(400).send("App is not configured properly.");
              }
              default: {
                Sentry.captureException(webhookServiceResult.error);
                logger.fatal("Unhandled error", { error: err });

                return res.status(500).send("Unhandled error");
              }
            }
          } else {
            logger.info("Found active connection service. Calculating taxes...");

            const { taxProvider } = webhookServiceResult.value;
            const providerConfig = config.value.getConfigForChannelSlug(channelSlug);

            if (providerConfig.isErr()) {
              return res.status(400).send("App is not configured properly.");
            }

            // TODO: Improve errors handling like above
            const calculatedTaxes = await taxProvider.calculateTaxes(
              payload,
              providerConfig.value.avataxConfig.config,
              ctx.authData,
            );

            logger.info("Taxes calculated", { calculatedTaxes });

            return res.status(200).json(ctx.buildResponse(calculatedTaxes));
          }
        } catch (error) {
          if (error instanceof InvalidAppAddressError) {
            logger.warn(
              "InvalidAppAddressError: App returns status 400 due to broken address configuration",
              { error },
            );

            return res.status(400).json({
              message: "InvalidAppAddressError: Check address in app configuration",
            });
          }

          Sentry.captureException(error);

          return res.status(500).send("Unhandled error");
        }
      }),
    ),
    "/api/webhooks/checkout-calculate-taxes",
  ),
  loggerContext,
);
