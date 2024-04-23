import { AvataxWebhookService } from "../avatax/avatax-webhook.service";
import { err, ok } from "neverthrow";
import { AvataxClient } from "../avatax/avatax-client";
import { AvataxSdkClientFactory } from "../avatax/avatax-sdk-client-factory";
import { AppConfig } from "../../lib/app-config";
import { BaseError } from "../../error";

// todo rename file
export class AvataxWebhookServiceFactory {
  static BrokenConfigurationError = BaseError.subclass("BrokenConfigurationError");

  static createFromConfig(config: AppConfig, channelSlug: string) {
    const channelConfig = config.getConfigForChannelSlug(channelSlug);

    if (channelConfig.isErr()) {
      return err(
        new this.BrokenConfigurationError(
          `Channel config was not found for channel ${channelSlug}`,
          {
            props: {
              channelSlug,
            },
          },
        ),
      );
    }

    const taxProvider = new AvataxWebhookService(
      new AvataxClient(
        new AvataxSdkClientFactory().createClient(channelConfig.value.avataxConfig.config),
      ),
    );

    /**
     * Adding config here, to have single place where its resolved.
     * TODO: Extract this
     */
    return ok({ taxProvider, config: channelConfig.value.avataxConfig.config });
  }
}
