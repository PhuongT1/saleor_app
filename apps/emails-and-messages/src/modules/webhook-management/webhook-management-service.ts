import { invoiceSentWebhook } from "../../pages/api/webhooks/invoice-sent";
import { orderCancelledWebhook } from "../../pages/api/webhooks/order-cancelled";
import { orderConfirmedWebhook } from "../../pages/api/webhooks/order-confirmed";
import { orderCreatedWebhook } from "../../pages/api/webhooks/order-created";
import { orderFulfilledWebhook } from "../../pages/api/webhooks/order-fulfilled";
import { orderFullyPaidWebhook } from "../../pages/api/webhooks/order-fully-paid";
import { Client } from "urql";
import { createAppWebhook, deleteAppWebhook, fetchAppWebhooks } from "./api-operations";
import { notifyWebhook } from "../../pages/api/webhooks/notify";
import { MessageEventTypes } from "../event-handlers/message-event-types";
import { createLogger } from "@saleor/apps-shared";
import { WebhookEventTypeAsyncEnum } from "../../../generated/graphql";

export const AppWebhooks = {
  orderCreatedWebhook,
  orderFulfilledWebhook,
  orderConfirmedWebhook,
  orderCancelledWebhook,
  orderFullyPaidWebhook,
  invoiceSentWebhook,
  notifyWebhook,
};

export type AppWebhook = keyof typeof AppWebhooks;

export const eventToWebhookMapping: Record<MessageEventTypes, AppWebhook> = {
  ACCOUNT_CONFIRMATION: "notifyWebhook",
  ACCOUNT_DELETE: "notifyWebhook",
  ACCOUNT_PASSWORD_RESET: "notifyWebhook",
  ACCOUNT_CHANGE_EMAIL_REQUEST: "notifyWebhook",
  ACCOUNT_CHANGE_EMAIL_CONFIRM: "notifyWebhook",
  INVOICE_SENT: "invoiceSentWebhook",
  ORDER_CANCELLED: "orderCancelledWebhook",
  ORDER_CONFIRMED: "orderConfirmedWebhook",
  ORDER_CREATED: "orderCreatedWebhook",
  ORDER_FULFILLED: "orderFulfilledWebhook",
  ORDER_FULLY_PAID: "orderFullyPaidWebhook",
};

const logger = createLogger({
  name: "WebhookManagementService",
});

export class WebhookManagementService {
  constructor(private appBaseUrl: string, private client: Client) {}

  // Returns list of webhooks registered for the App in the Saleor instance
  public async getWebhooks() {
    logger.debug("Fetching webhooks");
    return await fetchAppWebhooks({ client: this.client });
  }

  /**
   * Returns a dictionary with webhooks status.
   * Status equal to true means that webhook is created and active.
   */
  public async getWebhooksStatus() {
    logger.debug("Fetching webhooks status");
    const webhooks = await this.getWebhooks();

    return Object.fromEntries(
      Object.keys(AppWebhooks).map((webhook) => {
        const webhookData = webhooks.find(
          (w) => w.name === AppWebhooks[webhook as AppWebhook].name
        );

        return [webhook as AppWebhook, Boolean(webhookData?.isActive)];
      })
    );
  }

  public async createWebhook({ webhook }: { webhook: AppWebhook }) {
    const webhookManifest = AppWebhooks[webhook].getWebhookManifest(this.appBaseUrl);

    const asyncWebhooks = webhookManifest.asyncEvents;

    if (!asyncWebhooks?.length) {
      logger.warn(`Webhook ${webhook} has no async events`);
      throw new Error("Only the webhooks with async events can be registered");
    }

    await createAppWebhook({
      client: this.client,
      variables: {
        asyncEvents: asyncWebhooks as WebhookEventTypeAsyncEnum[],
        isActive: true,
        name: webhookManifest.name,
        targetUrl: webhookManifest.targetUrl,
        // Override empty queries to handle NOTIFY webhook
        query: webhookManifest.query === "{}" ? undefined : webhookManifest.query,
      },
    });
  }

  public async deleteWebhook({ webhook }: { webhook: AppWebhook }): Promise<void> {
    logger.debug(`Deleting webhook ${webhook}`);
    logger.debug(`Fetching existing webhooks`);
    const webhookData = await this.getWebhooks();

    const id = webhookData.find((w) => w.name === AppWebhooks[webhook].name)?.id;

    if (!id) {
      logger.error(`Webhook ${AppWebhooks[webhook].name} was not registered yet`);
      throw new Error(`Webhook ${AppWebhooks[webhook].name} was not registered yet`);
    }

    logger.debug(`Running delete mutation`);
    await deleteAppWebhook({
      client: this.client,
      id,
    });
  }
}
