import pino from "pino";
import { Client } from "urql";
import { createLogger } from "../../lib/logger";
import { createSettingsManager } from "../app-configuration/metadata-manager";
import { CrudSettingsManager } from "../crud-settings/crud-settings.service";
import { providersSchema } from "../providers-configuration/providers-config";
import { TAX_PROVIDER_KEY } from "../providers-configuration/public-providers-configuration-service";
import { TaxJarClient } from "./taxjar-client";
import { TaxJarConfig, TaxJarInstanceConfig, taxJarInstanceConfigSchema } from "./taxjar-config";

const getSchema = taxJarInstanceConfigSchema;

export class TaxJarConfigurationService {
  private CrudSettingsManager: CrudSettingsManager;
  private logger: pino.Logger;
  constructor(client: Client, saleorApiUrl: string) {
    const settingsManager = createSettingsManager(client);
    this.CrudSettingsManager = new CrudSettingsManager(
      settingsManager,
      saleorApiUrl,
      TAX_PROVIDER_KEY
    );
    this.logger = createLogger({
      service: "TaxJarConfigurationService",
      metadataKey: TAX_PROVIDER_KEY,
    });
  }

  async getAll(): Promise<TaxJarInstanceConfig[]> {
    this.logger.debug(".getAll called");
    const { data } = await this.CrudSettingsManager.readAll();
    this.logger.debug(`Fetched settings from CrudSettingsManager`);
    const validation = providersSchema.safeParse(data);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while getAll");
      throw new Error(validation.error.message);
    }

    const instances = validation.data.filter(
      (instance) => instance.provider === "taxjar"
    ) as TaxJarInstanceConfig[];

    return instances;
  }

  async get(id: string): Promise<TaxJarInstanceConfig> {
    this.logger.debug(`.get called with id: ${id}`);
    const { data } = await this.CrudSettingsManager.read(id);
    this.logger.debug(`Fetched setting from CrudSettingsManager`);

    const validation = getSchema.safeParse(data);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while get");
      throw new Error(validation.error.message);
    }

    return validation.data;
  }

  async post(config: TaxJarConfig): Promise<{ id: string }> {
    this.logger.debug(`.post called with value: ${JSON.stringify(config)}`);
    const taxJarClient = new TaxJarClient(config);
    const validation = await taxJarClient.ping();

    if (!validation.authenticated) {
      this.logger.error({ error: validation.error }, "Validation error while post");
      throw new Error(validation.error);
    }
    const result = await this.CrudSettingsManager.create({
      provider: "taxjar",
      config: config,
    });

    return result.data;
  }

  async patch(id: string, config: Partial<TaxJarConfig>): Promise<void> {
    this.logger.debug(`.patch called with id: ${id} and value: ${JSON.stringify(config)}`);
    const data = await this.get(id);
    // omit the key "id"  from the result
    const { id: _, ...setting } = data;

    return this.CrudSettingsManager.update(id, {
      ...setting,
      config: { ...setting.config, ...config },
    });
  }

  async put(id: string, config: TaxJarConfig): Promise<void> {
    const data = await this.get(id);
    // omit the key "id"  from the result
    const { id: _, ...setting } = data;

    this.logger.debug(`.put called with id: ${id} and value: ${JSON.stringify(config)}`);
    return this.CrudSettingsManager.update(id, {
      ...setting,
      config: { ...config },
    });
  }

  async delete(id: string): Promise<void> {
    this.logger.debug(`.delete called with id: ${id}`);
    return this.CrudSettingsManager.delete(id);
  }
}
