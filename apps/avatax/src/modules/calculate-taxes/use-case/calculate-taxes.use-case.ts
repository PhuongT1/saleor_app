import { createLogger } from "@saleor/apps-logger";
import { BaseError } from "../../../error";
import { AppConfigExtractor } from "../../../lib/app-config-extractor";
import { CalculateTaxesPayload } from "../../webhooks/payloads/calculate-taxes-payload";
import { AuthData } from "@saleor/app-sdk/APL";
import { verifyCalculateTaxesPayload } from "../../webhooks/validate-webhook-payload";
import { TaxIncompletePayloadErrors } from "../../taxes/tax-error";
import { err, fromPromise, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { AppConfigurationLogger } from "../../../lib/app-configuration-logger";
import { captureException } from "@sentry/nextjs";
import { metadataCache } from "../../../lib/app-metadata-cache";
import * as Sentry from "@sentry/nextjs";
import { AvataxCalculateTaxesResponse } from "../../avatax/calculate-taxes/avatax-calculate-taxes-adapter";

export class CalculateTaxesUseCase {
  private logger = createLogger("CalculateTaxesUseCase");

  static CalculateTaxesUseCaseError = BaseError.subclass("CalculateTaxesUseCaseError");
  static ExpectedIncompletePayloadError = this.CalculateTaxesUseCaseError.subclass(
    "ExpectedIncompletePayloadError",
  );
  static ConfigBrokenError = this.CalculateTaxesUseCaseError.subclass("ConfigBrokenError");
  static UnhandledError = this.CalculateTaxesUseCaseError.subclass("UnhandledError");
  static FailedCalculatingTaxesError = this.CalculateTaxesUseCaseError.subclass(
    "FailedCalculatingTaxesError",
  );

  constructor(
    private deps: {
      configExtractor: AppConfigExtractor;
    },
  ) {}

  async calculateTaxes(
    payload: CalculateTaxesPayload,
    authData: AuthData,
  ): Promise<Result<AvataxCalculateTaxesResponse, any>> {
    const payloadVerificationResult = verifyCalculateTaxesPayload(payload);

    const mappedError = payloadVerificationResult.mapErr((innerError) => {
      switch (innerError["constructor"]) {
        case TaxIncompletePayloadErrors.MissingLinesError:
        case TaxIncompletePayloadErrors.MissingAddressError: {
          return err(
            new CalculateTaxesUseCase.ExpectedIncompletePayloadError(
              "Payload is incomplete and taxes cant be calculated. This is expected",
              {
                errors: [innerError],
              },
            ),
          );
        }
      }
    });

    if (mappedError.isErr()) {
      return mappedError;
    }

    const appMetadata = payload.recipient?.privateMetadata ?? [];
    const channelSlug = payload.taxBase.channel.slug;

    const config = this.deps.configExtractor
      .extractAppConfigFromPrivateMetadata(appMetadata)
      .map((config) => {
        try {
          new AppConfigurationLogger(this.logger).logConfiguration(config, channelSlug);
        } catch (e) {
          captureException(
            new AppConfigExtractor.LogConfigurationMetricError(
              "Failed to log configuration metric",
              {
                cause: e,
              },
            ),
          );
        }

        return config;
      });

    if (config.isErr()) {
      this.logger.warn("Failed to extract app config from metadata", { error: config.error });

      return err(
        new CalculateTaxesUseCase.ConfigBrokenError("Failed to extract app config from metadata", {
          errors: [config.error],
        }),
      );
    }

    metadataCache.setMetadata(appMetadata);

    const AvataxWebhookServiceFactory = await import(
      "../../../modules/taxes/avatax-webhook-service-factory"
    ).then((m) => m.AvataxWebhookServiceFactory);

    const webhookServiceResult = AvataxWebhookServiceFactory.createFromConfig(
      config.value,
      channelSlug,
    );

    if (webhookServiceResult.isErr()) {
      const error = webhookServiceResult.error;

      this.logger.warn(`Error in taxes calculation occurred: ${error.name} ${error.message}`, {
        error,
      });

      switch (error["constructor"]) {
        case AvataxWebhookServiceFactory.BrokenConfigurationError: {
          return err(
            new CalculateTaxesUseCase.ConfigBrokenError(
              "Failed to create instance of Avatax connection due to invalid config",
              {
                errors: [error],
              },
            ),
          );
        }
        default: {
          Sentry.captureException(webhookServiceResult.error);
          this.logger.fatal("Unhandled error", { error: err });

          return err(
            new CalculateTaxesUseCase.UnhandledError("Unhandled error", { errors: [error] }),
          );
        }
      }
    } else {
      this.logger.info("Found active connection service. Calculating taxes...");

      const { taxProvider } = webhookServiceResult.value;
      const providerConfig = config.value.getConfigForChannelSlug(channelSlug);

      if (providerConfig.isErr()) {
        return err(
          new CalculateTaxesUseCase.ConfigBrokenError(
            "Failed to create instance of Avatax connection due to invalid config",
            {
              errors: [providerConfig.error],
            },
          ),
        );
      }

      const calculatedTaxes = await fromPromise(
        taxProvider.calculateTaxes(payload, providerConfig.value.avataxConfig.config, authData),
        (err) =>
          new CalculateTaxesUseCase.FailedCalculatingTaxesError("Failed to calculate taxes", {
            errors: [err],
          }),
      ).map((results) => {
        this.logger.info("Taxes calculated", { calculatedTaxes: results });

        return results;
      });

      return calculatedTaxes;
    }
  }
}
