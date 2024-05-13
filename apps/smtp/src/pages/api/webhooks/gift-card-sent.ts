import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { gql } from "urql";
import { saleorApp } from "../../../saleor-app";
import { GiftCardSentWebhookPayloadFragment } from "../../../../generated/graphql";
import { withOtel } from "@saleor/apps-otel";
import { createLogger } from "../../../logger";
import { SendEventMessagesUseCaseFactory } from "../../../modules/event-handlers/send-event-messages.use-case.factory";

const GiftCardSentWebhookPayload = gql`
  fragment GiftCardSentWebhookPayload on GiftCardSent {
    giftCard {
      id
      code
      displayCode
      last4CodeChars
      created
      usedByEmail
      isActive
      metadata {
        key
        value
      }
      privateMetadata {
        key
        value
      }
      initialBalance {
        currency
        amount
      }
      currentBalance {
        currency
        amount
      }
      tags {
        id
        name
      }
      expiryDate
      lastUsedOn
      usedBy {
        firstName
        lastName
        email
      }
    }
    sentToEmail
    channel
  }
`;

const GiftCardSentGraphqlSubscription = gql`
  ${GiftCardSentWebhookPayload}
  subscription GiftCardSent {
    event {
      ...GiftCardSentWebhookPayload
    }
  }
`;

export const giftCardSentWebhook = new SaleorAsyncWebhook<GiftCardSentWebhookPayloadFragment>({
  name: "Gift card sent in Saleor",
  webhookPath: "api/webhooks/gift-card-sent",
  asyncEvent: "GIFT_CARD_SENT",
  apl: saleorApp.apl,
  query: GiftCardSentGraphqlSubscription,
});

const logger = createLogger(giftCardSentWebhook.webhookPath);

const useCaseFactory = new SendEventMessagesUseCaseFactory();

const handler: NextWebhookApiHandler<GiftCardSentWebhookPayloadFragment> = async (
  req,
  res,
  context,
) => {
  logger.debug("Webhook received");

  const { payload, authData } = context;
  const { giftCard } = payload;

  if (!giftCard) {
    logger.error("No gift card data payload");
    return res.status(200).end();
  }

  const recipientEmail = payload.sentToEmail;

  if (!recipientEmail?.length) {
    logger.error(`The gift card ${giftCard.id} had no email recipient set. Aborting.`);
    return res
      .status(200)
      .json({ error: "Email recipient has not been specified in the event payload." });
  }

  const channel = payload.channel;

  if (!channel) {
    logger.error("No channel specified in payload");
    return res.status(200).end();
  }

  const useCase = useCaseFactory.createFromAuthData(authData);

  await useCase.sendEventMessages({
    channelSlug: channel,
    event: "GIFT_CARD_SENT",
    payload,
    recipientEmail,
  });

  return res.status(200).json({ message: "The event has been handled" });
};

export default withOtel(giftCardSentWebhook.createHandler(handler), "/api/webhooks/gift-card-sent");

export const config = {
  api: {
    bodyParser: false,
  },
};
