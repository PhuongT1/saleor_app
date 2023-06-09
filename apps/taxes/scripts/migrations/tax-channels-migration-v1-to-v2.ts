import { SettingsManager } from "@saleor/app-sdk/settings-manager";
import { Logger, createLogger } from "../../src/lib/logger";
import { TaxChannelsPrivateMetadataManagerV1 } from "./tax-channels-metadata-manager-v1";
import { TaxChannelsPrivateMetadataManagerV2 } from "./tax-channels-metadata-manager-v2";
import { TaxChannelsTransformV1toV2 } from "./tax-channels-transform-v1-to-v2";

export class TaxChannelsMigrationV1toV2Manager {
  private logger: Logger;
  constructor(private metadataManager: SettingsManager, private saleorApiUrl: string) {
    this.logger = createLogger({
      location: "MigrationMetadataManager",
    });
  }

  async migrateIfNeeded() {
    const taxChannelsManagerV1 = new TaxChannelsPrivateMetadataManagerV1(
      this.metadataManager,
      this.saleorApiUrl
    );

    const taxChannelsManagerV2 = new TaxChannelsPrivateMetadataManagerV2(
      this.metadataManager,
      this.saleorApiUrl
    );

    const currentConfig = await taxChannelsManagerV2.getConfig();

    if (currentConfig) {
      this.logger.info("Migration is not necessary, we have current config.");
      return currentConfig;
    }

    const previousChannelConfig = await taxChannelsManagerV1.getConfig();

    if (!previousChannelConfig) {
      throw new Error("Previous config not found. Migration not possible.");
    }

    this.logger.info("Previous config found. Migrating...");

    const transformer = new TaxChannelsTransformV1toV2();
    const nextConfig = transformer.transform(previousChannelConfig);

    await taxChannelsManagerV2.setConfig(nextConfig);
  }
}
