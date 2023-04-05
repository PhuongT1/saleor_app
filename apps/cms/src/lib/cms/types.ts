import { z } from "zod";
import { providersConfig } from "./config";

export type ProductInput = Record<string, any> & {
  saleorId: string;
  name: string;
  productId: string;
  productName: string;
  productSlug: string;
  channels: string[];
  image?: string;
};

export type ProductResponseSuccess = { ok: true; data: { id: string; saleorId: string } };
export type ProductResponseError = { ok: false; error: string };
export type ProductResponse = ProductResponseSuccess | ProductResponseError;

export type CmsOperations = {
  getProduct?: ({ id }: { id: string }) => Promise<Response>;
  createProduct: ({ input }: { input: ProductInput }) => Promise<ProductResponse>;
  updateProduct: ({ id, input }: { id: string; input: ProductInput }) => Promise<Response | void>;
  deleteProduct: ({ id }: { id: string }) => Promise<Response | void>;
};

export type CmsBatchOperations = {
  getAllProducts?: () => Promise<Response>;
  createBatchProducts: ({ input }: { input: ProductInput[] }) => Promise<ProductResponse[]>;
  deleteBatchProducts: ({ ids }: { ids: string[] }) => Promise<Response[] | void>;
};

export type CmsClientOperations = {
  cmsProviderInstanceId: string;
  operations: CmsOperations;
  operationType: keyof CmsOperations;
};

export type CmsClientBatchOperations = {
  cmsProviderInstanceId: string;
  operations: CmsBatchOperations;
  operationType: keyof CmsBatchOperations;
};

export type GetProviderTokens<TProviderName extends keyof typeof providersConfig> =
  (typeof providersConfig)[TProviderName]["tokens"][number];

export type BaseConfig = {
  name: string;
};

// * Generates the config based on the data supplied in the `providersConfig` variable.
export type CreateProviderConfig<TProviderName extends keyof typeof providersConfig> = Record<
  GetProviderTokens<TProviderName>["name"],
  string
> &
  BaseConfig;

export type CreateOperations<TConfig extends BaseConfig> = (
  config: TConfig
) => CmsOperations & CmsBatchOperations;

export type Provider<TConfig extends BaseConfig> = {
  create: CreateOperations<TConfig>;
  schema: z.ZodType<TConfig>;
};
