import { CalculateTaxesPayload } from "../../modules/webhooks/calculate-taxes-payload";
import {
  ActiveConnectionServiceErrors,
  ActiveConnectionServiceResolver,
} from "../../modules/taxes/get-active-connection-service";
import { AuthData } from "@saleor/app-sdk/APL";
import { BaseError } from "../../error";
import { err, fromPromise } from "neverthrow";
import { createLogger } from "../../logger";

const CalculateTaxesUseCaseError = BaseError.subclass("CalculateTaxesUseCaseError");

export const CalculateTaxesUseCaseErrors = {
  AppMisconfiguredError: CalculateTaxesUseCaseError.subclass("AppMisconfiguredError"),
  WrongChannelError: CalculateTaxesUseCaseError.subclass("WrongChannelError"),
  UnknownError: CalculateTaxesUseCaseError.subclass("UnknownError"),
};

export class CalculateTaxesUseCase {
  private logger = createLogger("CalculateTaxesUseCase");

  private constructor(private avataxResolver: ActiveConnectionServiceResolver) {}

  static create(dependencies: { avataxResolver: ActiveConnectionServiceResolver }) {
    return new CalculateTaxesUseCase(dependencies.avataxResolver);
  }

  calculateTaxes(payload: CalculateTaxesPayload, authData: AuthData) {
    const appMetadata = payload.recipient?.privateMetadata ?? [];
    const channelSlug = payload.taxBase.channel.slug;

    const service = this.avataxResolver.resolve(channelSlug, appMetadata, authData);

    if (service.isErr()) {
      const error = service.error;

      this.logger.debug("Error retrieving taxes calculation service", { error });

      switch (true) {
        case error instanceof ActiveConnectionServiceErrors.ProviderNotAssignedToChannelError:
        case error instanceof ActiveConnectionServiceErrors.BrokenConfigurationError:
        case error instanceof ActiveConnectionServiceErrors.MissingMetadataError: {
          return err(
            new CalculateTaxesUseCaseErrors.AppMisconfiguredError("App misconfigured error", {
              errors: [error],
            }),
          );
        }
        case error instanceof ActiveConnectionServiceErrors.WrongChannelError: {
          return err(
            new CalculateTaxesUseCaseErrors.WrongChannelError(
              "Webhook executed for the wrong channel",
              {
                errors: [error],
              },
            ),
          );
        }
        default: {
          return err(
            new CalculateTaxesUseCaseErrors.UnknownError(
              "UNHANDLED Error retrieving taxes calculation service",
              { errors: [error] },
            ),
          );
        }
      }
    }

    return fromPromise(service.value.calculateTaxes(payload), (error) =>
      err(
        new CalculateTaxesUseCaseErrors.UnknownError("UNHANDLED Failed to calculate taxes", {
          errors: [error],
        }),
      ),
    );
  }
}
