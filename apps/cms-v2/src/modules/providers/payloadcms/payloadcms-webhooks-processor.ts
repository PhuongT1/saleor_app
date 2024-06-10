import {
  WebhookProductFragment,
  WebhookProductVariantFragment,
} from "../../../../generated/graphql";

import { PayloadCmsProviderConfig } from "@/modules/configuration/schemas/payloadcms-provider.schema";
import { createLogger } from "@/logger";
import { ProductWebhooksProcessor } from "../../webhooks-operations/product-webhooks-processor";
import { PayloadCMSClient } from "./payloadcms-client";

/*
 * todo error handling
 */
export class PayloadCmsWebhooksProcessor implements ProductWebhooksProcessor {
  private client = new PayloadCMSClient();

  constructor(private providerConfig: PayloadCmsProviderConfig.FullShape) {}

  async onProductVariantUpdated(productVariant: WebhookProductVariantFragment): Promise<void> {
    const logger = createLogger("PayloadCmsWebhooksProcessor.onProductVariantUpdated", {
      productVariantId: productVariant.id,
      productId: productVariant.product.id,
    });

    logger.debug("Calling product variant updated");

    await this.client.upsertProductVariant({
      configuration: this.providerConfig,
      variant: productVariant,
    });

    logger.info("Product variant updated");
  }

  async onProductVariantCreated(productVariant: WebhookProductVariantFragment): Promise<void> {
    const logger = createLogger("PayloadCmsWebhooksProcessor.onProductVariantCreated", {
      productVariantId: productVariant.id,
      productId: productVariant.product.id,
    });

    logger.debug("Calling product variant created");

    await this.client.uploadProductVariant({
      configuration: this.providerConfig,
      variant: productVariant,
    });

    logger.info("Product variant created");
  }
  async onProductVariantDeleted(productVariant: WebhookProductVariantFragment): Promise<void> {
    const logger = createLogger("PayloadCmsWebhooksProcessor.onProductVariantDeleted", {
      variantId: productVariant.id,
      productId: productVariant.product.id,
    });

    logger.debug("Calling product variant deleted");

    await this.client.deleteProductVariant({
      configuration: this.providerConfig,
      variant: productVariant,
    });

    logger.info("Product variant deleted");
  }

  async onProductUpdated(product: WebhookProductFragment): Promise<void> {
    const logger = createLogger("PayloadCmsWebhooksProcessor.onProductUpdated", {
      productId: product.id,
      variantsLength: product.variants?.length,
    });

    logger.debug("Calling product updated");

    const client = new PayloadCMSClient();

    await Promise.all(
      (product.variants ?? []).map((variant) => {
        return client.upsertProductVariant({
          configuration: this.providerConfig,
          variant: {
            id: variant.id,
            name: variant.name,
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
            },
          },
        });
      }),
    );

    logger.info("Product updated");
  }
}
