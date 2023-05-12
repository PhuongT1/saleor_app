import { SendgridConfiguration } from "../configuration/sendgrid-config-schema";
import { BoxWithBorder } from "../../../components/box-with-border";
import { Box, Button, ProductsIcons, Switch, TableEditIcon, Text } from "@saleor/macaw-ui/next";
import { defaultPadding } from "../../../components/ui-defaults";
import { useDashboardNotification } from "@saleor/apps-shared";
import { trpcClient } from "../../trpc/trpc-client";
import {
  SendgridUpdateChannels,
  sendgridUpdateChannelsSchema,
} from "../configuration/sendgrid-config-input-schema";
import { Controller, useForm } from "react-hook-form";
import { BoxFooter } from "../../../components/box-footer";
import { SectionWithDescription } from "../../../components/section-with-description";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChannelConfiguration } from "../../../lib/channel-assignment/channel-configuration-schema";
import { setBackendErrors } from "../../../lib/set-backend-errors";
import { Multiselect } from "../../../components/react-hook-form-macaw/Multiselect";

interface ChannelsSectionProps {
  configuration: SendgridConfiguration;
}

interface OverrideMessageArgs {
  availableChannels: string[];
  channelConfiguration: ChannelConfiguration;
}

// TODO: Move to a separate component
const overrideMessage = ({
  availableChannels,
  channelConfiguration: { channels, mode, override },
}: OverrideMessageArgs) => {
  if (!override) {
    return (
      <Text>
        Configuration will be used with <Text variant="bodyStrong"> all</Text> channels.
      </Text>
    );
  }

  if (mode === "exclude") {
    const leftChannels = availableChannels.filter((channel) => !channels.includes(channel));

    if (!leftChannels.length) {
      return <Text>Theres no channel which will be used with this configuration.</Text>;
    }
    return (
      <Text>
        Configuration will be used with channels:
        <Text variant="bodyStrong">{leftChannels.join(", ")}</Text>.
      </Text>
    );
  }
  return (
    <Text>
      Configuration will be used with channels:{" "}
      <Text variant="bodyStrong">{channels.join(", ")}</Text>.
    </Text>
  );
};

export const ChannelsSection = ({ configuration }: ChannelsSectionProps) => {
  const { notifySuccess, notifyError } = useDashboardNotification();

  const { handleSubmit, control, setError, setValue, getValues, register } =
    useForm<SendgridUpdateChannels>({
      defaultValues: {
        id: configuration.id,
        ...configuration.channels,
      },
      resolver: zodResolver(sendgridUpdateChannelsSchema),
    });

  const { data: channels } = trpcClient.channels.fetch.useQuery();

  const trpcContext = trpcClient.useContext();
  const { mutate } = trpcClient.sendgridConfiguration.updateChannels.useMutation({
    onSuccess: async (data, variables) => {
      notifySuccess("Configuration saved");
      trpcContext.sendgridConfiguration.invalidate();
    },
    onError(error) {
      setBackendErrors<SendgridUpdateChannels>({ error, setError, notifyError });
    },
  });

  return (
    <SectionWithDescription
      title="Channels"
      description={
        <>
          <Text as="p">
            By default, provider will work for every channel. You can change this behavior with
            excluding or including strategy.
          </Text>
          <Text as="p">
            <Text variant="bodyStrong">Excluding</Text> - all current channels and new created
            channels will work, excluding selected
          </Text>
          <Text as="p">
            <Text variant="bodyStrong">Including</Text> - only selected channels will work, new
            created channels will not work
          </Text>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((data, event) => {
          mutate({
            ...data,
          });
        })}
      >
        <BoxWithBorder>
          <Box
            padding={defaultPadding}
            display={"flex"}
            flexDirection={"column"}
            gap={defaultPadding}
          >
            <Box display={"flex"} flexDirection={"column"} gap={defaultPadding}>
              <Text variant="heading">Current behaviour</Text>
              {overrideMessage({
                availableChannels: channels?.map((channel) => channel.slug) || [],
                channelConfiguration: configuration.channels,
              })}
              <Text variant="heading">Settings</Text>
              <label>
                <input type="checkbox" {...register("override")} />
                <Text paddingLeft={defaultPadding}>Override channels</Text>
              </label>
              <Controller
                name="mode"
                control={control}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                  formState: { errors },
                }) => (
                  <Switch
                    defaultValue={configuration.channels.mode}
                    __maxWidth={"max-content"}
                    onValueChange={onChange}
                  >
                    <Switch.Item id="1" value="restrict">
                      <TableEditIcon size="medium" />
                      <Text>Include</Text>
                    </Switch.Item>
                    <Switch.Item id="2" value="exclude">
                      <ProductsIcons size="medium" />
                      <Text>Exclude</Text>
                    </Switch.Item>
                  </Switch>
                )}
              />
              <Multiselect
                control={control}
                label="Channels"
                size="large"
                name={"channels"}
                options={
                  channels?.map((channel) => ({
                    label: channel.name,
                    value: channel.slug,
                  })) || []
                }
              />
            </Box>
          </Box>
          <BoxFooter>
            <Button type="submit">Save provider</Button>
          </BoxFooter>
        </BoxWithBorder>
      </form>
    </SectionWithDescription>
  );
};
