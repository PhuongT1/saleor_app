import pino from "pino";
import {
  OrderCreatedSubscriptionFragment,
  OrderFulfilledSubscriptionFragment,
  TaxBaseFragment,
} from "../../../generated/graphql";
import { createLogger } from "../../lib/logger";
import { ChannelConfig } from "../channels-configuration/channels-config";
import { ProviderWebhookService } from "../taxes/tax-provider-webhook";
import { avataxCalculateTaxes } from "./maps/avatax-calculate-taxes-map";
import { AvataxClient } from "./avatax-client";
import { AvataxConfig, defaultAvataxConfig } from "./avatax-config";
import { avataxOrderCreated } from "./maps/avatax-order-created-map";
import { avataxOrderFulfilled } from "./maps/avatax-order-fulfilled-map";

export class AvataxWebhookService implements ProviderWebhookService {
  config = defaultAvataxConfig;
  client: AvataxClient;
  private logger: pino.Logger;

  constructor(config: AvataxConfig) {
    this.logger = createLogger({
      service: "AvataxWebhookService",
    });
    const avataxClient = new AvataxClient(config);
    this.logger.trace({ client: avataxClient }, "Internal Avatax client created");

    this.config = config;
    this.client = avataxClient;
  }

  async calculateTaxes(payload: TaxBaseFragment, channel: ChannelConfig) {
    this.logger.debug({ payload, channel }, "calculateTaxes called with:");
    const args = avataxCalculateTaxes.mapPayload({
      taxBase: payload,
      channel,
      config: this.config,
    });
    const result = await this.client.createTransaction(args);
    this.logger.debug({ result }, "calculateTaxes response");
    return avataxCalculateTaxes.mapResponse(result);
  }

  async createOrder(order: OrderCreatedSubscriptionFragment, channel: ChannelConfig) {
    this.logger.debug({ order, channel }, "createOrder called with:");
    const model = avataxOrderCreated.mapPayload(order, channel, this.config);
    this.logger.debug({ model }, "will call createTransaction with");
    const result = await this.client.createTransaction(model);
    this.logger.debug({ result }, "createOrder response");
    return avataxOrderCreated.mapResponse(result);
  }

  async fulfillOrder(order: OrderFulfilledSubscriptionFragment, channel: ChannelConfig) {
    this.logger.debug({ order, channel }, "fulfillOrder called with:");
    const args = avataxOrderFulfilled.mapPayload(order, this.config);
    this.logger.debug({ args }, "will call commitTransaction with");
    const result = await this.client.commitTransaction(args);
    this.logger.debug({ result }, "fulfillOrder response");
    return { ok: true };
  }
}
