import { AuthData } from "@saleor/app-sdk/APL";
import { AppConfigMetadataManager } from "../app-configuration/app-config-metadata-manager";
import { GraphqlClientFactory } from "../../lib/create-graphq-client";
import { createSettingsManager } from "../../lib/metadata-manager";
import { AppConfig } from "../app-configuration/app-config";

interface GetGoogleFeedSettingsArgs {
  authData: AuthData;
  channel: string;
}

/**
 * TODO Test
 */
export const getGoogleFeedSettings = async ({ authData, channel }: GetGoogleFeedSettingsArgs) => {
  const client = GraphqlClientFactory.fromAuthData(authData);

  const metadataManager = new AppConfigMetadataManager(createSettingsManager(client));

  const configString = await metadataManager.get();

  if (!configString) {
    throw new Error("App is not configured");
  }

  const appConfig = AppConfig.parse(configString);
  const channelConfig = appConfig.getUrlsForChannel(channel);

  if (!channelConfig) {
    throw new Error("App is not configured");
  }

  const storefrontUrl = channelConfig.storefrontUrl;
  const productStorefrontUrl = channelConfig.productStorefrontUrl;

  if (!storefrontUrl.length || !productStorefrontUrl.length) {
    throw new Error("The application has not been configured");
  }

  return {
    storefrontUrl,
    productStorefrontUrl,
    s3BucketConfiguration: appConfig.getS3Config(),
  };
};
