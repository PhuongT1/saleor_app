import React from "react";
import { AvataxConfigurationForm } from "./avatax-configuration-form";
import { AvataxConfig, BaseAvataxConfig, defaultAvataxConfig } from "../avatax-connection-schema";
import { trpcClient } from "../../trpc/trpc-client";
import { useDashboardNotification } from "@saleor/apps-shared";
import { useRouter } from "next/router";
import { Button } from "@saleor/macaw-ui/next";

export const CreateAvataxConfiguration = () => {
  const router = useRouter();
  const { notifySuccess, notifyError } = useDashboardNotification();

  const { refetch: refetchProvidersConfigurationData } =
    trpcClient.providersConfiguration.getAll.useQuery();

  const { mutate: createMutation, isLoading: isCreateLoading } =
    trpcClient.avataxConnection.create.useMutation({
      async onSuccess() {
        notifySuccess("Success", "Provider created");
        await refetchProvidersConfigurationData();
        router.push("/configuration");
      },
      onError(error) {
        notifyError("Error", error.message);
      },
    });

  const validateAddressMutation = trpcClient.avataxConnection.createValidateAddress.useMutation({});

  const validateAddressHandler = React.useCallback(
    async (config: AvataxConfig) => {
      return validateAddressMutation.mutateAsync({ value: config });
    },
    [validateAddressMutation]
  );

  const validateCredentialsMutation =
    trpcClient.avataxConnection.createValidateCredentials.useMutation({});

  const validateCredentialsHandler = React.useCallback(
    async (config: BaseAvataxConfig) => {
      return validateCredentialsMutation.mutateAsync({ value: config });
    },
    [validateCredentialsMutation]
  );

  const submitHandler = React.useCallback(
    (data: AvataxConfig) => {
      createMutation({ value: data });
    },
    [createMutation]
  );

  return (
    <AvataxConfigurationForm
      submit={{
        isLoading: isCreateLoading,
        handleFn: submitHandler,
      }}
      validateAddress={{
        isLoading: validateAddressMutation.isLoading,
        handleFn: validateAddressHandler,
      }}
      validateCredentials={{
        isLoading: validateCredentialsMutation.isLoading,
        handleFn: validateCredentialsHandler,
      }}
      defaultValues={defaultAvataxConfig}
      leftButton={
        <Button
          onClick={() => router.push("/configuration")}
          variant="tertiary"
          data-testid="create-avatax-cancel-button"
        >
          Cancel
        </Button>
      }
    />
  );
};
