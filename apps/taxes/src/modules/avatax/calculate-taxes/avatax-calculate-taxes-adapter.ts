import { TaxBaseFragment } from "../../../../generated/graphql";
import { Logger, createLogger } from "../../../lib/logger";
import { ChannelConfig } from "../../channels-configuration/channels-config";
import { CalculateTaxesResponse } from "../../taxes/tax-provider-webhook";
import { WebhookAdapter } from "../../taxes/tax-webhook-adapter";
import { AvataxClient, CreateTransactionArgs } from "../avatax-client";
import { AvataxConfig } from "../avatax-config";
import { AvataxCalculateTaxesPayloadTransformer } from "./avatax-calculate-taxes-payload-transformer";
import { AvataxCalculateTaxesResponseTransformer } from "./avatax-calculate-taxes-response-transformer";

export const SHIPPING_ITEM_CODE = "Shipping";

export type Payload = {
  taxBase: TaxBaseFragment;
  channelConfig: ChannelConfig;
  config: AvataxConfig;
};

export type Target = CreateTransactionArgs;
export type Response = CalculateTaxesResponse;

export class AvataxCalculateTaxesAdapter implements WebhookAdapter<Payload, Response> {
  private logger: Logger;
  constructor(private readonly config: AvataxConfig) {
    this.logger = createLogger({ service: "AvataxCalculateTaxesAdapter" });
  }

  async send(payload: Pick<Payload, "channelConfig" | "taxBase">): Promise<Response> {
    this.logger.debug({ payload }, "send called with:");
    const payloadTransformer = new AvataxCalculateTaxesPayloadTransformer();
    const target = payloadTransformer.transform({ ...payload, config: this.config });

    const client = new AvataxClient(this.config);
    const response = await client.createTransaction(target);

    this.logger.debug({ response }, "Avatax createTransaction response:");

    const responseTransformer = new AvataxCalculateTaxesResponseTransformer();
    const transformedResponse = responseTransformer.transform(response);

    this.logger.debug({ transformedResponse }, "Transformed Avatax createTransaction response to:");

    return transformedResponse;
  }
}
