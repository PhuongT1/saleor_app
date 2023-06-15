import { EncryptedMetadataManager } from "@saleor/app-sdk/settings-manager";
import { z } from "zod";
import { Logger, createLogger } from "../../../lib/logger";
import { createRepositoryEntitySchema } from "../../app/repository-utils";
import { CrudSettingsManager } from "../../crud-settings/crud-settings.service";
import { saleorTaxClassSchema, taxCodeSchema } from "../../tax-codes/tax-code-match-schema";

const taxJarTaxCodeMatchSchema = createRepositoryEntitySchema(
  z.object({
    saleorTaxClass: saleorTaxClassSchema.or(z.null()),
    taxJarTaxCode: taxCodeSchema,
  })
);

const taxJarTaxCodeMatchesSchema = z.array(taxJarTaxCodeMatchSchema);

export type TaxJarTaxCodeMatches = z.infer<typeof taxJarTaxCodeMatchesSchema>;

const metadataKey = "taxjar-tax-code-map";

export class TaxJarTaxCodeMatchRepository {
  private crudSettingsManager: CrudSettingsManager;
  private logger: Logger;
  constructor(settingsManager: EncryptedMetadataManager, saleorApiUrl: string) {
    this.crudSettingsManager = new CrudSettingsManager(settingsManager, saleorApiUrl, metadataKey);
    this.logger = createLogger({
      location: "TaxJarTaxCodeMatchRepository",
      metadataKey,
    });
  }

  async getAll(): Promise<TaxJarTaxCodeMatches> {
    const data = await this.crudSettingsManager.readAll();

    return taxJarTaxCodeMatchesSchema.parse(data);
  }

  async updateMany(nextData: TaxJarTaxCodeMatches): Promise<void> {
    await this.crudSettingsManager.updateMany(nextData);
  }
}
