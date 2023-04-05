import { createProvider } from "./create";
import { CreateOperations, ProductInput, ProductResponse } from "../types";
import { logger as pinoLogger } from "../../logger";

import { ApiError, buildClient, SimpleSchemaTypes } from "@datocms/cma-client-node";
import { DatocmsConfig, datocmsConfigSchema } from "../config";

const datocmsClient = (config: DatocmsConfig, options?: RequestInit) => {
  const { baseUrl, token, environment } = config;

  const clientEnvironment = environment ? { environment } : {};
  const clientBaseUrl = baseUrl ? { baseUrl } : {};

  return buildClient({
    apiToken: token,
    ...clientEnvironment,
    ...clientBaseUrl,
  });
};

const transformResponseError = (error: unknown): ProductResponse => {
  if (error instanceof ApiError) {
    return {
      ok: false,
      error: error.message,
    };
  } else {
    return {
      ok: false,
      error: "Something went wrong!",
    };
  }
};

const transformResponseItem = (
  item: SimpleSchemaTypes.Item,
  input: ProductInput
): ProductResponse => {
  return {
    ok: true,
    data: {
      id: item.id,
      saleorId: input.saleorId,
    },
  };
};

const datocmsOperations: CreateOperations<DatocmsConfig> = (config) => {
  const logger = pinoLogger.child({ cms: "strapi" });

  const client = datocmsClient(config);

  const createProductInCMS = async (input: ProductInput) =>
    client.items.create({
      item_type: {
        id: config.itemTypeId,
        type: "item_type",
      },
      saleor_id: input.saleorId,
      name: input.name,
      channels: JSON.stringify(input.channels),
      product_id: input.productId,
      product_name: input.productName,
      product_slug: input.productSlug,
    });

  const updateProductInCMS = async (id: string, input: ProductInput) =>
    client.items.update(id, {
      saleor_id: input.saleorId,
      name: input.name,
      channels: JSON.stringify(input.channels),
      product_id: input.productId,
      product_name: input.productName,
      product_slug: input.productSlug,
    });

  const deleteProductInCMS = async (id: string) => client.items.destroy(id);

  const createBatchProductsInCMS = async (input: ProductInput[]) =>
    // DatoCMS doesn't support batch creation of items, so we need to create them one by one
    Promise.all(
      input.map(async (item) => ({
        id: await createProductInCMS(item),
        input: item,
      }))
    );

  const deleteBatchProductsInCMS = async (ids: string[]) =>
    client.items.bulkDestroy({
      items: ids.map((id) => ({ id, type: "item" })),
    });

  return {
    createProduct: async ({ input }) => {
      try {
        const item = await createProductInCMS(input);
        logger.debug("createProduct response", { item });

        return transformResponseItem(item, input);
      } catch (error) {
        return transformResponseError(error);
      }
    },
    updateProduct: async ({ id, input }) => {
      const item = await updateProductInCMS(id, input);
      logger.debug("updateProduct response", { item });
    },
    deleteProduct: async ({ id }) => {
      const item = await deleteProductInCMS(id);
      logger.debug("deleteProduct response", { item });
    },
    createBatchProducts: async ({ input }) => {
      const items = await createBatchProductsInCMS(input);
      logger.debug("createBatchProducts response", { items });

      return items.map((item) => transformResponseItem(item.id, item.input));
    },
    deleteBatchProducts: async ({ ids }) => {
      const items = await deleteBatchProductsInCMS(ids);
      logger.debug("deleteBatchProducts response", { items });
    },
  };
};

export const datoCmsProvider = createProvider(datocmsOperations, datocmsConfigSchema);
