import { Client } from "urql";
import { Logger, createLogger } from "../../../lib/logger";
import { TaxJarConnectionRepository } from "./taxjar-connection-repository";
import { TaxJarConfig, TaxJarConnection } from "../taxjar-connection-schema";
import { TaxJarValidationService } from "./taxjar-validation.service";
import { DeepPartial } from "@trpc/server";
import { PatchInputTransformer } from "../../provider-connections/patch-input-transformer";

export class TaxJarConnectionService {
  private logger: Logger;
  private taxJarConnectionRepository: TaxJarConnectionRepository;
  constructor(client: Client, appId: string, saleorApiUrl: string) {
    this.logger = createLogger({
      location: "TaxJarConnectionService",
    });

    this.taxJarConnectionRepository = new TaxJarConnectionRepository(client, appId, saleorApiUrl);
  }

  getAll(): Promise<TaxJarConnection[]> {
    return this.taxJarConnectionRepository.getAll();
  }

  getById(id: string): Promise<TaxJarConnection> {
    return this.taxJarConnectionRepository.get(id);
  }

  async create(config: TaxJarConfig): Promise<{ id: string }> {
    const validationService = new TaxJarValidationService();

    await validationService.validate(config);

    return await this.taxJarConnectionRepository.post(config);
  }

  async update(id: string, nextConfigPartial: DeepPartial<TaxJarConfig>): Promise<void> {
    const data = await this.getById(id);

    // omit the key "id"  from the result
    const { id: _, ...setting } = data;
    const prevConfig = setting.config;

    const inputTransformer = new PatchInputTransformer();

    const input = inputTransformer.transform(nextConfigPartial, prevConfig);

    const validationService = new TaxJarValidationService();

    await validationService.validate(input);

    return this.taxJarConnectionRepository.patch(id, input);
  }

  async delete(id: string): Promise<void> {
    return this.taxJarConnectionRepository.delete(id);
  }
}
