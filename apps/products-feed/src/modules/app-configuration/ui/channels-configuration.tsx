import { trpcClient } from "../../trpc/trpc-client";
import { LinearProgress, Paper } from "@material-ui/core";
import React, { useEffect, useMemo, useState } from "react";
import { makeStyles } from "@saleor/macaw-ui";
import { AppConfigContainer } from "../app-config-container";
import { UrlConfigurationForm } from "./url-configuration-form";
import { ChannelsList } from "./channels-list";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { AppColumnsLayout } from "../../ui/app-columns-layout";
import { FeedPreviewCard } from "./feed-preview-card";
import { Instructions } from "./instructions";

const useStyles = makeStyles((theme) => {
  return {
    header: { marginBottom: 20 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "start", gap: 40 },
    formContainer: {
      top: 0,
      position: "sticky",
    },
    instructionsContainer: {
      padding: 15,
    },
    configurationColumn: {
      display: "flex",
      flexDirection: "column",
      gap: 20,
    },
  };
});

export const ChannelsConfiguration = () => {
  const styles = useStyles();

  const { appBridge } = useAppBridge();

  const { data: configurationData, refetch: refetchConfig } =
    trpcClient.appConfiguration.fetch.useQuery();

  const channels = trpcClient.channels.fetch.useQuery();

  const [activeChannelSlug, setActiveChannelSlug] = useState<string | null>(null);

  const { mutate, error: saveError } = trpcClient.appConfiguration.setAndReplace.useMutation({
    onSuccess() {
      refetchConfig();
      appBridge?.dispatch(
        actions.Notification({
          title: "Success",
          text: "Saved app configuration",
          status: "success",
        })
      );
    },
  });

  useEffect(() => {
    if (channels.isSuccess) {
      setActiveChannelSlug(channels.data![0].slug ?? null);
    }
  }, [channels.isSuccess, channels.data]);

  const activeChannel = useMemo(() => {
    try {
      return channels.data!.find((c) => c.slug === activeChannelSlug)!;
    } catch (e) {
      return null;
    }
  }, [channels.data, activeChannelSlug]);

  if (channels.isLoading || !channels.data) {
    return <LinearProgress />;
  }

  if (!activeChannel) {
    return <div>Error. No channel available</div>;
  }

  return (
    <AppColumnsLayout>
      <ChannelsList
        channels={channels.data}
        activeChannelSlug={activeChannel.slug}
        onChannelClick={setActiveChannelSlug}
      />

      {activeChannel ? (
        <div className={styles.configurationColumn}>
          <FeedPreviewCard channelSlug={activeChannel.slug} />
          <Paper elevation={0} className={styles.formContainer}>
            <UrlConfigurationForm
              channelID={activeChannel.id}
              key={activeChannelSlug}
              channelSlug={activeChannel.slug}
              onSubmit={async (data) => {
                const newConfig = AppConfigContainer.setChannelUrlConfiguration(configurationData)(
                  activeChannel.slug
                )(data);

                mutate(newConfig);
              }}
              initialData={AppConfigContainer.getChannelUrlConfiguration(configurationData)(
                activeChannel.slug
              )}
              channelName={activeChannel?.name ?? activeChannelSlug}
            />
            {saveError && <span>{saveError.message}</span>}
          </Paper>
        </div>
      ) : null}
      <Instructions />
    </AppColumnsLayout>
  );
};
