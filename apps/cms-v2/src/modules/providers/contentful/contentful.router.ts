import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppConfigMetadataManager } from "../../configuration/app-config-metadata-manager";

import { createSettingsManager } from "../../configuration/metadata-manager";
import { protectedClientProcedure } from "../../trpc/protected-client-procedure";
import { router } from "../../trpc/trpc-server";

import { ContentfulClient } from "./contentful-client";

const procedure = protectedClientProcedure.use(({ ctx, next }) => {
  const settingsManager = createSettingsManager(ctx.apiClient, ctx.appId!);

  return next({
    ctx: {
      settingsManager,
      appConfigService: new AppConfigMetadataManager(settingsManager),
    },
  });
});

/**
 * Operations specific for Contentful service.
 *
 * For configruration see providers-list.router.ts
 */
export const contentfulRouter = router({
  fetchEnvironmentsFromApi: procedure
    .input(
      z.object({
        contentfulToken: z.string(),
        contentfulSpace: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const client = new ContentfulClient({
        accessToken: input.contentfulToken,
        space: input.contentfulSpace,
      });

      return client.getEnvironments();
    }),
  fetchContentTypesFromApi: procedure
    .input(
      z.object({
        contentfulToken: z.string(),
        contentfulSpace: z.string(),
        contentfulEnv: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const client = new ContentfulClient({
        accessToken: input.contentfulToken,
        space: input.contentfulSpace,
      });

      return client.getContentTypes(input.contentfulEnv).catch((e) => {
        console.error(e);

        throw new TRPCError({ code: "BAD_REQUEST" });
      });
    }),
});
