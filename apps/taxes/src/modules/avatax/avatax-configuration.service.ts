import pino from "pino";
import { Client } from "urql";
import { createLogger } from "../../lib/logger";
import { isObfuscated, obfuscateSecret } from "../../lib/utils";
import { createSettingsManager } from "../app-configuration/metadata-manager";
import { CrudSettingsConfigurator } from "../crud-settings/crud-settings.service";
import { providersSchema } from "../providers-configuration/providers-config";
import { TAX_PROVIDER_KEY } from "../providers-configuration/providers-configuration-service";
import { AvataxClient } from "./avatax-client";
import {
  AvataxConfig,
  avataxConfigSchema,
  AvataxInstanceConfig,
  avataxInstanceConfigSchema,
} from "./avatax-config";

const obfuscateConfig = (config: AvataxConfig) => ({
  ...config,
  username: obfuscateSecret(config.username),
  password: obfuscateSecret(config.password),
});

const obfuscateProvidersConfig = (instances: AvataxInstanceConfig[]) =>
  instances.map((instance) => ({
    ...instance,
    config: obfuscateConfig(instance.config),
  }));

const getSchema = avataxInstanceConfigSchema.transform((instance) => ({
  ...instance,
  config: obfuscateConfig(instance.config),
}));

const patchSchema = avataxConfigSchema.partial().transform((c) => {
  const { username, password, ...config } = c ?? {};
  return {
    ...config,
    ...(username && !isObfuscated(username) && { username }),
    ...(password && !isObfuscated(password) && { password }),
  };
});

const putSchema = avataxConfigSchema.transform((c) => {
  const { username, password, ...config } = c;
  return {
    ...config,
    ...(!isObfuscated(username) && { username }),
    ...(!isObfuscated(password) && { password }),
  };
});

export class AvataxConfigurationService {
  private crudSettingsConfigurator: CrudSettingsConfigurator;
  private logger: pino.Logger;
  constructor(client: Client, saleorApiUrl: string) {
    const settingsManager = createSettingsManager(client);
    this.crudSettingsConfigurator = new CrudSettingsConfigurator(
      settingsManager,
      saleorApiUrl,
      TAX_PROVIDER_KEY
    );
    this.logger = createLogger({
      service: "AvataxConfigurationService",
      metadataKey: TAX_PROVIDER_KEY,
    });
  }

  async getAll() {
    this.logger.debug(".getAll called");
    const { data } = await this.crudSettingsConfigurator.readAll();
    const validation = providersSchema.safeParse(data);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while getAll");
      throw new Error(validation.error.message);
    }

    const instances = validation.data.filter(
      (instance) => instance.provider === "avatax"
    ) as AvataxInstanceConfig[];

    return obfuscateProvidersConfig(instances);
  }

  async get(id: string) {
    this.logger.debug(`.get called with id: ${id}`);
    const { data } = await this.crudSettingsConfigurator.read(id);
    this.logger.debug({ setting: data }, `Fetched setting from crudSettingsConfigurator`);

    const validation = getSchema.safeParse(data);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while get");
      throw new Error(validation.error.message);
    }

    return validation.data;
  }

  async post(config: AvataxConfig) {
    this.logger.debug(`.post called with value: ${JSON.stringify(config)}`);
    const avataxClient = new AvataxClient(config);
    const validation = await avataxClient.ping();

    if (!validation.authenticated) {
      this.logger.error(validation.error);
      throw new Error(validation.error);
    }
  }

  async patch(id: string, config: Partial<AvataxConfig>) {
    this.logger.debug(`.patch called with id: ${id} and value: ${JSON.stringify(config)}`);
    const result = await this.get(id);
    // omit the key "id"  from the result
    const { id: _, ...setting } = result;
    const validation = patchSchema.safeParse(config);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while patch");
      throw new Error(validation.error.message);
    }

    return this.crudSettingsConfigurator.update(id, {
      ...setting,
      config: { ...setting.config, ...validation.data },
    });
  }

  async put(id: string, config: AvataxConfig) {
    const result = await this.get(id);
    // omit the key "id"  from the result
    const { id: _, ...setting } = result;
    const validation = putSchema.safeParse(config);

    if (!validation.success) {
      this.logger.error({ error: validation.error.format() }, "Validation error while patch");
      throw new Error(validation.error.message);
    }

    this.logger.debug(`.put called with id: ${id} and value: ${JSON.stringify(config)}`);
    return this.crudSettingsConfigurator.update(id, {
      ...setting,
      config: { ...validation.data },
    });
  }

  async delete(id: string) {
    this.logger.debug(`.delete called with id: ${id}`);
    return this.crudSettingsConfigurator.delete(id);
  }
}
