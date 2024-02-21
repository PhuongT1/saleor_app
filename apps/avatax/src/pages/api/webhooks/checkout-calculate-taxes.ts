import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import {
  CalculateTaxesEventFragment,
  UntypedCalculateTaxesDocument,
} from "../../../../generated/graphql";
import { saleorApp } from "../../../../saleor-app";
import { WebhookResponse } from "../../../modules/app/webhook-response";
import {
  ActiveConnectionServiceErrors,
  ActiveConnectionServiceErrorsUnion,
  getActiveConnectionService,
} from "../../../modules/taxes/get-active-connection-service";
import { TaxIncompleteWebhookPayloadError } from "../../../modules/taxes/tax-error";
import { withOtel } from "@saleor/apps-otel";
import { createLogger } from "../../../logger";
import { err, ok } from "neverthrow";
import * as Sentry from "@sentry/nextjs";
import { Simulate } from "react-dom/test-utils";
import error = Simulate.error;
import { NextApiRequest, NextApiResponse } from "next";
import { BaseError } from "../../../error";

export const config = {
  api: {
    bodyParser: false,
  },
};

export type CalculateTaxesPayload = Extract<
  CalculateTaxesEventFragment,
  { __typename: "CalculateTaxes" }
>;

function verifyCalculateTaxesPayload(payload: CalculateTaxesPayload) {
  if (!payload.taxBase.lines.length) {
    return err(new TaxIncompleteWebhookPayloadError("No lines found in taxBase"));
  }

  if (!payload.taxBase.address) {
    return err(new TaxIncompleteWebhookPayloadError("No address found in taxBase"));
  }

  return ok(payload);
}

export const checkoutCalculateTaxesSyncWebhook = new SaleorSyncWebhook<CalculateTaxesPayload>({
  name: "CheckoutCalculateTaxes",
  apl: saleorApp.apl,
  event: "CHECKOUT_CALCULATE_TAXES",
  query: UntypedCalculateTaxesDocument,
  webhookPath: "/api/webhooks/checkout-calculate-taxes",
});

/**
 * Translate internal errors to responses back to Saleor
 */
const webhookErrorToResponseMapper = (req: NextApiRequest, res: NextApiResponse) => {
  return new Map([
    [
      ActiveConnectionServiceErrors.BrokenConfigurationError,
      () =>
        res
          .status(400)
          .send("App is not configured properly. Please verify configuration or reinstall the app"),
    ],
    [
      ActiveConnectionServiceErrors.MissingMetadataError,
      () => res.status(400).send("App is not configured properly. Configure the app first"),
    ],
    [ActiveConnectionServiceErrors.MissingChannelSlugError, () => res.status(400).send("??? TODO")],
    [ActiveConnectionServiceErrors.WrongChannelError, () => res.status(500).send("???")],
    [
      ActiveConnectionServiceErrors.ProviderNotAssignedToChannelError,
      () =>
        res
          .status(400)
          .send("App is not configured properly. Please verify configuration or reinstall the app"),
    ],
  ]);
};

export default withOtel(
  checkoutCalculateTaxesSyncWebhook.createHandler(async (req, res, ctx) => {
    const logger = createLogger("checkoutCalculateTaxesSyncWebhook");
    const { payload } = ctx;
    const webhookResponse = new WebhookResponse(res);

    logger.info("Handler for CHECKOUT_CALCULATE_TAXES webhook called");

    try {
      const payloadVerificationResult = verifyCalculateTaxesPayload(payload);

      payloadVerificationResult
        .mapErr((error) => {
          logger.error(`[${error.name}] ${error.message}`);
          // todo Sentry

          return webhookResponse.error(error);
        })
        .map(() => {
          logger.debug("Payload validated Successfully");
        });

      const appMetadata = payload.recipient?.privateMetadata ?? [];
      const channelSlug = payload.taxBase.channel.slug;
      const activeConnectionServiceResult = getActiveConnectionService(
        channelSlug,
        appMetadata,
        ctx.authData,
      );

      if (activeConnectionServiceResult.isErr()) {
        const err = activeConnectionServiceResult.error;

        logger.debug(`Error in taxes calculation occured: ${err.message}`, { error: err });

        const errorStrategy = webhookErrorToResponseMapper(req, res).get(err); // todo fix type

        if (errorStrategy) {
          return errorStrategy();
        } else {
          Sentry.captureException(err);
          logger.fatal(`UNHANDLED: ${error.name}`, {
            error: error,
          });

          return res.status(500).send("Error calculating taxes");
        }
      } else {
        logger.debug("Found active connection service. Calculating taxes...");
        // TODO: Improve errors handling like above
        const calculatedTaxes = await activeConnectionServiceResult.value.calculateTaxes(payload);

        logger.debug("Taxes calculated", { calculatedTaxes });
        return webhookResponse.success(ctx.buildResponse(calculatedTaxes));
      }
    } catch (error) {
      return webhookResponse.error(error);
    }
  }),
  "/api/webhooks/checkout-calculate-taxes",
);
