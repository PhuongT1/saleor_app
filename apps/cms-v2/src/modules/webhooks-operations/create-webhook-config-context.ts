import { AuthData } from "@saleor/app-sdk/APL";
import { AppConfigMetadataManager, RootConfigSchemaType } from "../configuration";

export type WebhookContext = {
  providers: RootConfigSchemaType["providers"];
  connections: RootConfigSchemaType["connections"];
};

export const createWebhookConfigContext = async ({
  authData,
}: {
  authData: AuthData;
}): Promise<WebhookContext> => {
  const configManager = AppConfigMetadataManager.createFromAuthData(authData);
  const appConfig = await configManager.get();

  const providers = appConfig.providers.getProviders();
  const connections = appConfig.connections.getConnections();

  return {
    providers,
    connections,
  };
};
