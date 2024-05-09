import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "../../../saleor-app";
import { SendEventMessagesUseCase } from "../../../modules/event-handlers/send-event-messages";
import { notifyEventMapping, NotifySubscriptionPayload } from "../../../lib/notify-event-types";
import { withOtel } from "@saleor/apps-otel";
import { createLogger } from "../../../logger";
import { createInstrumentedGraphqlClient } from "../../../lib/create-instrumented-graphql-client";
import { SmtpConfigurationService } from "../../../modules/smtp/configuration/smtp-configuration.service";
import { FeatureFlagService } from "../../../modules/feature-flag-service/feature-flag-service";
import { SmtpMetadataManager } from "../../../modules/smtp/configuration/smtp-metadata-manager";
import { createSettingsManager } from "../../../lib/metadata-manager";

/*
 * The Notify webhook is triggered on multiple Saleor events.
 * Type of the message is determined by `notify_event` field in the payload.
 */

export const notifyWebhook = new SaleorAsyncWebhook<NotifySubscriptionPayload>({
  name: "notify",
  webhookPath: "api/webhooks/notify",
  asyncEvent: "NOTIFY_USER",
  apl: saleorApp.apl,
  query: "{}", // We are using the default payload instead of subscription
});

const logger = createLogger(notifyWebhook.webhookPath);

const handler: NextWebhookApiHandler<NotifySubscriptionPayload> = async (req, res, context) => {
  logger.debug("Webhook received");

  const { payload, authData } = context;

  const { channel_slug: channel, recipient_email: recipientEmail } = payload.payload;

  if (!recipientEmail?.length) {
    logger.error(`The email recipient has not been specified in the event payload.`);
    return res
      .status(200)
      .json({ error: "Email recipient has not been specified in the event payload." });
  }

  /**
   * Since NOTIFY can be send on events unrelated to this app, lack of mapping means the App does not support it
   */
  const event = notifyEventMapping[payload.notify_event];

  if (!event) {
    logger.debug(`The type of received notify event (${payload.notify_event}) is not supported.`);
    return res.status(200).json({ message: `${payload.notify_event} event is not supported.` });
  }

  const client = createInstrumentedGraphqlClient({
    saleorApiUrl: authData.saleorApiUrl,
    token: authData.token,
  });

  const useCase = new SendEventMessagesUseCase({
    smtpConfigurationService: new SmtpConfigurationService({
      featureFlagService: new FeatureFlagService({ client }),
      metadataManager: new SmtpMetadataManager(
        createSettingsManager(client, authData.appId),
        authData.saleorApiUrl,
      ),
    }),
  });

  await useCase.sendEventMessages({
    channel,
    event,
    payload: payload.payload,
    recipientEmail,
  });

  return res.status(200).json({ message: "The event has been handled" });
};

export default withOtel(notifyWebhook.createHandler(handler), "api/webhooks/notify");

export const config = {
  api: {
    bodyParser: false,
  },
};
