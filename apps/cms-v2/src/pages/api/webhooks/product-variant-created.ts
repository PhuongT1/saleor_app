import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { gql } from "urql";
import {
  ProductVariantCreatedWebhookPayloadFragment,
  ProductVariantCreatedWebhookPayloadFragmentDoc,
  WebhookProductVariantFragmentDoc,
} from "../../../../generated/graphql";

import { saleorApp } from "@/saleor-app";

import { ContentfulClient } from "@/modules/contentful/contentful-client";
import { createWebhookConfigContext } from "@/modules/webhooks-operations/create-webhook-config-context";

import { WebhooksProcessorsDelegator } from "@/modules/webhooks-operations/webhooks-processors-delegator";
import { DatocmsWebhooksProcessor } from "@/modules/datocms/datocms-webhooks-processor";

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

  if (!payload.productVariant) {
    // todo Sentry - should not happen
    return res.status(500).end();
  }

  const configContext = await createWebhookConfigContext({ authData });

  await new WebhooksProcessorsDelegator({
    context: configContext,
  }).delegateVariantCreatedOperations(payload.productVariant);

  return res.status(200).end();
};

export default productVariantCreatedWebhook.createHandler(handler);
