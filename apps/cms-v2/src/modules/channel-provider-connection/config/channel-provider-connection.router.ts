import { AppConfigMetadataManager } from "@/modules/configuration/app-config-metadata-manager";
import { createSettingsManager } from "@/modules/configuration/metadata-manager";
import { ChannelProviderConnectionConfigSchema } from "@/modules/configuration/schemas/channel-provider-connection.schema";
import { protectedClientProcedure } from "@/modules/trpc/protected-client-procedure";
import { router } from "@/modules/trpc/trpc-server";
import { z } from "zod";
import { FetchChannelsDocument } from "../../../../generated/graphql";

const procedure = protectedClientProcedure.use(({ ctx, next }) => {
  const settingsManager = createSettingsManager(ctx.apiClient, ctx.appId!);

  return next({
    ctx: {
      appConfigService: new AppConfigMetadataManager(settingsManager),
    },
  });
});

export const channelProviderConnectionRouter = router({
  fetchAllChannels: protectedClientProcedure.query(async ({ ctx }) => {
    const channels = await ctx.apiClient.query(FetchChannelsDocument, {});

    return channels.data?.channels ?? [];
  }),
  fetchConnections: procedure.query(async ({ ctx }) => {
    return (await ctx.appConfigService.get()).connections.getConnections();
  }),
  addConnection: procedure
    .input(ChannelProviderConnectionConfigSchema.NewConnectionInput)
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.appConfigService.get();

      config.connections.addConnection(input);

      ctx.appConfigService.set(config);
    }),
  removeConnection: procedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.appConfigService.get();

      config.connections.deleteConnection(input.id);

      ctx.appConfigService.set(config);
    }),
});
