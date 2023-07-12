import { BulkImportProductFragment } from "../../../generated/graphql";
import { AnyProviderConfigSchemaType } from "../configuration";
import { ContentfulBulkSyncProcessor } from "../contentful/contentful-bulk-sync-processor";
import { DatocmsBulkSyncProcessor } from "../datocms/datocms-bulk-sync-processor";
import { StrapiBulkSyncProcessor } from "../strapi/strapi-bulk-sync-processor";

export type BulkSyncProcessorHooks = {
  onUploadStart?: (context: { variantId: string }) => void;
  onUploadSuccess?: (context: { variantId: string }) => void;
  onUploadError?: (context: { variantId: string; error: Error }) => void;
};

export interface BulkSyncProcessor {
  uploadProducts(products: BulkImportProductFragment[], hooks: Hooks): Promise<void>;
}

export const BulkSyncProcessorFactory = {
  create(config: AnyProviderConfigSchemaType): BulkSyncProcessor {
    switch (config.type) {
      case "contentful":
        return new ContentfulBulkSyncProcessor(config);
      case "datocms":
        return new DatocmsBulkSyncProcessor(config);
      case "strapi":
        return new StrapiBulkSyncProcessor(config);
      default:
        throw new Error(`Unknown provider`);
    }
  },
};
