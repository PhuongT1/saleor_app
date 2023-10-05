import { AuthData } from "@saleor/app-sdk/APL";
import { Logger, createLogger } from "../../../lib/logger";
import { CalculateTaxesPayload } from "../../../pages/api/webhooks/checkout-calculate-taxes";
import { CalculateTaxesResponse } from "../../taxes/tax-provider-webhook";
import { WebhookAdapter } from "../../taxes/tax-webhook-adapter";
import { AvataxClient, CreateTransactionArgs } from "../avatax-client";
import { AvataxConfig } from "../avatax-connection-schema";
import { ClientLogger } from "../../logs/client-logger";
import { AvataxCalculateTaxesPayloadService } from "./avatax-calculate-taxes-payload.service";
import { AvataxCalculateTaxesResponseTransformer } from "./avatax-calculate-taxes-response-transformer";

export const SHIPPING_ITEM_CODE = "Shipping";

export type AvataxCalculateTaxesTarget = CreateTransactionArgs;
export type AvataxCalculateTaxesResponse = CalculateTaxesResponse;

export class AvataxCalculateTaxesAdapter
  implements WebhookAdapter<CalculateTaxesPayload, AvataxCalculateTaxesResponse>
{
  private logger: Logger;
  private readonly config: AvataxConfig;
  private readonly authData: AuthData;
  private readonly clientLogger: ClientLogger;

  constructor({
    config,
    authData,
    clientLogger,
  }: {
    config: AvataxConfig;
    clientLogger: ClientLogger;
    authData: AuthData;
  }) {
    this.logger = createLogger({ name: "AvataxCalculateTaxesAdapter" });
    this.config = config;
    this.clientLogger = clientLogger;
    this.authData = authData;
  }

  async send(payload: CalculateTaxesPayload): Promise<AvataxCalculateTaxesResponse> {
    this.logger.debug("Transforming the Saleor payload for calculating taxes with AvaTax...");
    const payloadService = new AvataxCalculateTaxesPayloadService(this.authData);
    const target = await payloadService.getPayload(payload, this.config);

    this.logger.debug("Calling AvaTax createTransaction with transformed payload...");

    const client = new AvataxClient(this.config);

    try {
      const response = await client.createTransaction(target);

      this.logger.debug("AvaTax createTransaction successfully responded");

      const responseTransformer = new AvataxCalculateTaxesResponseTransformer();
      const transformedResponse = responseTransformer.transform(response);

      this.logger.debug("Transformed AvaTax createTransaction response");

      return transformedResponse;
    } catch (error) {
      this.clientLogger.push({
        event: "[CalculateTaxes] createTransaction",
        status: "error",
        payload: {
          input: target,
          output: error,
        },
      });
      throw error;
    }
  }
}
