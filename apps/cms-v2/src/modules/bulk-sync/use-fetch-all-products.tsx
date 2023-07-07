import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { useEffect, useState } from "react";

import { createGraphQLClient } from "@saleor/apps-shared";
import {
  BulkImportProductFragment,
  FetchProductsPaginatedDocument,
} from "../../../generated/graphql";

/**
 * Original source - apps/search
 */
export const useFetchAllProducts = (
  started: boolean,
  channelSlug: string,
  hooks: {
    onFinished(): void;
    onBatchFetched(batch: BulkImportProductFragment[]): void;
    onPageStart(cursor?: string): void;
  }
) => {
  const { appBridgeState } = useAppBridge();
  const saleorApiUrl = appBridgeState?.saleorApiUrl!;

  const [products, setProducts] = useState<BulkImportProductFragment[]>([]);

  useEffect(() => {
    if (!started) {
      return;
    }

    if (!appBridgeState?.token) {
      return;
    }

    const token = appBridgeState.token;
    const client = createGraphQLClient({ saleorApiUrl, token });

    if (!client) {
      return;
    }

    const getProducts = async (cursor?: string): Promise<void> => {
      hooks.onPageStart(cursor);

      const response = await client
        .query(FetchProductsPaginatedDocument, {
          after: cursor,
          channel: channelSlug,
        })
        .toPromise();

      const newProducts = response?.data?.products?.edges.map((e) => e.node) ?? [];

      hooks.onBatchFetched(newProducts);

      if (newProducts.length > 0) {
        setProducts((ps) => [...ps, ...newProducts]);
      }
      if (
        response?.data?.products?.pageInfo.hasNextPage &&
        response?.data?.products?.pageInfo.endCursor
      ) {
        return getProducts(response.data.products?.pageInfo.endCursor);
      } else {
        hooks.onFinished();

        return;
      }
    };

    getProducts(undefined);
  }, [appBridgeState?.token, saleorApiUrl, started, channelSlug]);

  return { products };
};
