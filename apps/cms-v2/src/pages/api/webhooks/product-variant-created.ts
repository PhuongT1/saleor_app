import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { gql } from "urql";
import {
  ProductVariantCreatedWebhookPayloadFragment,
  WebhookProductVariantFragmentDoc,
  ProductVariantCreatedWebhookPayloadFragmentDoc,
} from "../../../../generated/graphql";

import { saleorApp } from "@/saleor-app";
import { ContentfulSettingsManager } from "@/modules/contentful/config/contentful-settings-manager";
import { createSettingsManager } from "@/modules/configuration/metadata-manager";
import { createGraphQLClient } from "@saleor/apps-shared";
import { ContentfulClient } from "@/modules/contentful/contentful-client";
import { ChannelProviderConnectionSettingsManager } from "@/modules/channel-provider-connection/config/channel-provider-connection-settings-manager";

export const config = {
  api: {
    bodyParser: false,
  },
};

gql`
  ${WebhookProductVariantFragmentDoc}
  fragment ProductVariantCreatedWebhookPayload on ProductVariantCreated {
    productVariant {
      ...WebhookProductVariant
    }
  }
`;

const Subscription = gql`
  ${ProductVariantCreatedWebhookPayloadFragmentDoc}
  subscription ProductVariantCreated {
    event {
      ...ProductVariantCreatedWebhookPayload
    }
  }
`;

export const productVariantCreatedWebhook =
  new SaleorAsyncWebhook<ProductVariantCreatedWebhookPayloadFragment>({
    name: "CMS App - Product Variant Created",
    webhookPath: "api/webhooks/product-variant-created",
    event: "PRODUCT_VARIANT_CREATED",
    apl: saleorApp.apl,
    query: Subscription,
  });

/*
 * todo extract services, delegate to providers
 * todo document that fields in contetnful should be unique
 * todo fetch metadata end decode it with payload
 */
const handler: NextWebhookApiHandler<ProductVariantCreatedWebhookPayloadFragment> = async (
  req,
  res,
  context
) => {
  const { authData, payload } = context;

  const { productVariant } = payload;

  if (!productVariant) {
    // todo Sentry - should not happen
    return res.status(500).end();
  }

  const settingsManager = createSettingsManager(
    createGraphQLClient({
      saleorApiUrl: authData.saleorApiUrl,
      token: authData.token,
    }),
    authData.appId
  );

  const contentfulSettingsManager = new ContentfulSettingsManager(settingsManager);

  const config = await contentfulSettingsManager.get();
  const providers = config.getProviders();

  const connections = await (
    await new ChannelProviderConnectionSettingsManager(settingsManager).get()
  ).getConnections();

  connections.map(async (conn) => {
    const isEnabled = productVariant.channelListings?.find(
      (listing) => listing.channel.slug === conn.channelSlug
    );

    if (!isEnabled) {
      return res.status(200).end();
    }

    if (conn.providerType === "contentful") {
      const contentfulConfig = providers.find((p) => p.id === conn.providerId)!;

      const contentfulCLient = new ContentfulClient({
        accessToken: contentfulConfig.authToken,
        space: contentfulConfig.spaceId,
      });

      await contentfulCLient.uploadProduct({
        configuration: contentfulConfig,
        variant: productVariant,
      });
    }
  });

  return res.status(200).end();
};

export default productVariantCreatedWebhook.createHandler(handler);

// todo remove connection when provider removed
