import { buildClient, Client, SimpleSchemaTypes } from "@datocms/cma-client-browser";
import { DatocmsProviderConfig } from "../../configuration/schemas/datocms-provider.schema";
import { WebhookProductVariantFragment } from "../../../../generated/graphql";

type Context = {
  configuration: DatocmsProviderConfig.FullShape;
  variant: WebhookProductVariantFragment;
};

/*
 * todo error handling
 * todo maybe shared operations between clients can be used
 */
export class DatoCMSClientBrowser {
  private client: Client;

  constructor(opts: { apiToken: string }) {
    this.client = buildClient({ apiToken: opts.apiToken });
  }

  private mapVariantToDatoCMSFields({
    configuration,
    variant,
  }: Context): SimpleSchemaTypes.ItemCreateSchema {
    const fieldsMap = configuration.productVariantFieldsMapping;

    return {
      item_type: { type: "item_type", id: configuration.itemType },
      // todo rename to variantNAme
      [fieldsMap.variantName]: variant.name,
      [fieldsMap.productId]: variant.product.id,
      [fieldsMap.productName]: variant.product.name,
      [fieldsMap.productSlug]: variant.product.slug,
      [fieldsMap.variantId]: variant.id,
      [fieldsMap.channels]: JSON.stringify(variant.channelListings),
    };
  }

  uploadProduct(context: Context) {
    return this.client.items.create(this.mapVariantToDatoCMSFields(context));
  }

  async updateProduct({ configuration, variant }: Context) {
    const products = await this.getItemBySaleorVariantId({
      variantFieldName: configuration.productVariantFieldsMapping.variantId, // todo rename to variantName
      variantID: variant.id,
      contentType: configuration.itemType,
    });

    const product = products[0]; // todo throw otherwise

    this.client.items.update(
      product.id,
      this.mapVariantToDatoCMSFields({
        configuration,
        variant,
      })
    );
  }

  private getItemBySaleorVariantId({
    variantFieldName,
    variantID,
    contentType,
  }: {
    variantFieldName: string;
    variantID: string;
    contentType: string;
  }) {
    return this.client.items.list({
      filter: {
        type: contentType,
        fields: {
          [variantFieldName]: {
            eq: variantID,
          },
        },
      },
    });
  }

  upsertProduct({ configuration, variant }: Context) {
    return this.uploadProduct({ configuration, variant }).catch((err) => {
      const isUniqueIdError = err.response.body.data.find(
        (validation: any) => validation.attributes.details.code === "VALIDATION_UNIQUE"
      ); // todo parse error with zod

      if (isUniqueIdError) {
        return this.updateProduct({ configuration, variant });
      } else {
        throw new Error(err);
      }
    });
  }
}

// todo docs & description - dato must have unique Variant ID field
