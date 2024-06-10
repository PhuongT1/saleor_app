import { createLogger } from "@/logger";
import { WebhookProductVariantFragment } from "../../../../generated/graphql";

import { PayloadCmsProviderConfig } from "@/modules/configuration/schemas/payloadcms-provider.schema";
import { FieldsMapper } from "../fields-mapper";

import qs from "qs";
import { z } from "zod";

type Context = {
  configuration: PayloadCmsProviderConfig.FullShape;
  variant: WebhookProductVariantFragment;
};

/**
 * Client uses REST API with built-in query language
 * https://payloadcms.com/docs/queries/overview#rest-queries
 */
export class PayloadCMSClient {
  private mapVariantToPayloadFields({ configuration, variant }: Context) {
    const fields = FieldsMapper.mapProductVariantToConfigurationFields({
      variant,
      configMapping: configuration.productVariantFieldsMapping,
    });

    return fields;
  }

  private constructCollectionUrl(config: PayloadCmsProviderConfig.FullShape) {
    return `${config.payloadApiUrl}/${config.collectionName}`;
  }

  getItemsBySaleorVariantId(context: Context) {
    const queryString = qs.stringify(
      {
        where: {
          [context.configuration.productVariantFieldsMapping.variantId]: {
            equals: context.variant.id,
          },
        },
      },
      {
        addQueryPrefix: true,
      },
    );

    return fetch(`${this.constructCollectionUrl(context.configuration)}${queryString}`, {
      headers: this.getHeaders(context),
    }).then((r) => r.json());
  }

  async deleteProductVariant(context: Context) {
    const logger = createLogger("PayloadCMSClient.deleteProductVariant", {
      variantId: context.variant.id,
      productId: context.variant.product.id,
      configId: context.configuration.id,
    });

    logger.debug("Calling delete product variant");

    const queryString = qs.stringify(
      {
        where: {
          [context.configuration.productVariantFieldsMapping.variantId]: {
            equals: context.variant.id,
          },
        },
      },
      {
        addQueryPrefix: true,
      },
    );

    logger.debug("Deleting product variant", { queryString });

    try {
      const response = await fetch(
        this.constructCollectionUrl(context.configuration) + queryString,
        {
          method: "DELETE",
          headers: this.getHeaders(context),
        },
      );

      if (response.status >= 400) {
        logger.error("Error while deleting product variant");
        throw new Error("Error while deleting product variant");
      }
    } catch (e) {
      logger.error("Failed to delete variant", { error: e });

      throw e;
    }
  }

  private getHeaders(context: Context) {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    /**
     * https://payloadcms.com/docs/authentication/config#api-keys
     */
    if (
      context.configuration.authToken.length > 0 &&
      context.configuration.authenticatedUserSlug.length > 0
    ) {
      headers.append(
        "Authorization",
        `${context.configuration.authenticatedUserSlug} API-Key ${context.configuration.authToken}`,
      );
    }

    return headers;
  }

  uploadProductVariant(context: Context) {
    const logger = createLogger("PayloadCMSClient.uploadProductVariant", {
      variantId: context.variant.id,
      productId: context.variant.product.id,
      configId: context.configuration.id,
    });

    logger.debug("Calling upload product variant");

    return fetch(this.constructCollectionUrl(context.configuration), {
      method: "POST",
      body: JSON.stringify(this.mapVariantToPayloadFields(context)),
      headers: this.getHeaders(context),
    })
      .then((r) => {
        if (r.status >= 400) {
          logger.error("Error while uploading product variant");
          throw new Error(`Error while uploading product variant: ${r.statusText}`);
        }
      })
      .catch((e) => {
        logger.error("Failed to upload product variant", { error: e });

        throw e;
      });
  }

  async updateProductVariant({ configuration, variant }: Context) {
    const logger = createLogger("PayloadCMSClient.updateProductVariant", {
      variantId: variant.id,
      productId: variant.product.id,
      configId: configuration.id,
    });

    logger.debug("Calling update product variant");

    const queryString = qs.stringify(
      {
        where: {
          [configuration.productVariantFieldsMapping.variantId]: {
            equals: variant.id,
          },
        },
      },
      {
        addQueryPrefix: true,
      },
    );

    logger.debug("Updating product variant", { queryString });

    try {
      const response = await fetch(this.constructCollectionUrl(configuration) + queryString, {
        method: "PATCH",
        body: JSON.stringify(this.mapVariantToPayloadFields({ configuration, variant })),
        headers: this.getHeaders({ configuration, variant }),
      });

      if (response.status >= 400) {
        logger.error("Error while updating product variant");
        throw new Error("Error while updating product variant");
      }
    } catch (e) {
      logger.error("Failed to update product variant", { error: e });

      throw e;
    }
  }

  async upsertProductVariant(context: Context) {
    const logger = createLogger("PayloadCMSClient.updateProductVariant", {
      variantId: context.variant.id,
      productId: context.variant.product.id,
      configId: context.configuration.id,
    });

    logger.debug("Calling upsert product variant");

    try {
      await this.uploadProductVariant(context);
    } catch (e) {
      logger.info("Failed to upload, will try to update", { error: e });

      await this.updateProductVariant(context);
    }
  }
}
