import { ProviderInstanceConfiguration } from "./provider-instance-configuration";
import { SingleProviderSchema } from "../../../lib/cms/config";
import { useEffect, useState } from "react";
import { useProviderInstances } from "./hooks/useProviderInstances";
import { AppTabs } from "../../ui/app-tabs";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Button, makeStyles } from "@saleor/macaw-ui";
import { ProviderInstancesSelect } from "./provider-instances-list";
import { Add } from "@material-ui/icons";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
});

export const ProviderInstances = () => {
  const styles = useStyles();
  const { appBridge } = useAppBridge();
  const { providerInstances, saveProviderInstance, deleteProviderInstance, loading, errors } =
    useProviderInstances();

  const [activeProviderInstanceId, setActiveProviderInstanceId] = useState<string | null>(null);
  const [newProviderInstance, setNewProviderInstance] = useState<SingleProviderSchema | null>(null);

  useEffect(() => {
    if (providerInstances.length) {
      setActiveProviderInstanceId(providerInstances[0].id);
    }
  }, [providerInstances]);

  const handleSetActiveProviderInstance = (providerInstance: SingleProviderSchema | null) => {
    setActiveProviderInstanceId(providerInstance?.id || null);

    if (newProviderInstance) {
      setNewProviderInstance(null);
    }
  };
  const handleAddNewProviderInstance = () => {
    setNewProviderInstance({} as SingleProviderSchema);

    if (activeProviderInstanceId) {
      setActiveProviderInstanceId(null);
    }
  };
  const handleSaveProviderInstance = async (providerInstance: SingleProviderSchema) => {
    const savedProviderInstance = await saveProviderInstance(providerInstance);

    appBridge?.dispatch(
      actions.Notification({
        title: "Success",
        status: "success",
        text: "Configuration saved",
      })
    );

    if (newProviderInstance) {
      setNewProviderInstance(null);
    }
    if (newProviderInstance && savedProviderInstance) {
      setActiveProviderInstanceId(savedProviderInstance.id);
    }
  };
  const handleDeleteProviderInstance = async (providerInstance: SingleProviderSchema) => {
    await deleteProviderInstance(providerInstance);

    if (activeProviderInstanceId === providerInstance.id) {
      setActiveProviderInstanceId(null);
    }
  };

  const activeProviderInstance = providerInstances.find(
    (providerInstance) => providerInstance.id === activeProviderInstanceId
  );

  return (
    <>
      <AppTabs activeTab="providers" />

      <div className={styles.wrapper}>
        {!newProviderInstance && (
          <ProviderInstancesSelect
            providerInstances={providerInstances}
            activeProviderInstance={activeProviderInstance}
            newProviderInstance={newProviderInstance}
            setActiveProviderInstance={handleSetActiveProviderInstance}
            requestAddProviderInstance={handleAddNewProviderInstance}
            loading={loading}
            errors={errors}
          />
        )}
        <ProviderInstanceConfiguration
          activeProviderInstance={activeProviderInstance}
          newProviderInstance={newProviderInstance}
          saveProviderInstance={handleSaveProviderInstance}
          deleteProviderInstance={handleDeleteProviderInstance}
          loading={loading}
          errors={errors}
          onNewProviderRequest={handleAddNewProviderInstance}
        />
      </div>
      <div>
        {providerInstances.length > 0 && (
          <Button
            size="medium"
            startIcon={<Add />}
            fullWidth
            onClick={handleAddNewProviderInstance}
          >
            Add configuration
          </Button>
        )}
      </div>
    </>
  );
};
