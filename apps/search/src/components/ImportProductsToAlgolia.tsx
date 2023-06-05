import { Box, Button, Text } from "@saleor/macaw-ui/next";
import React, { useEffect, useMemo, useState } from "react";
import { AlgoliaSearchProvider } from "../lib/algolia/algoliaSearchProvider";
import { useConfiguration } from "../lib/configuration";
import { Products } from "./useQueryAllProducts";
import { useAuthenticatedFetch } from "@saleor/app-sdk/app-bridge";

export const ImportProductsToAlgolia = () => {
  const fetch = useAuthenticatedFetch();

  const [algoliaConfigured, setAlgoliaConfigured] = useState<null | boolean>(null);

  const algoliaConfiguration = useConfiguration();

  const searchProvider = useMemo(() => {
    if (!algoliaConfiguration.data?.appId || !algoliaConfiguration.data.secretKey) {
      return null;
    }
    return new AlgoliaSearchProvider({
      appId: algoliaConfiguration.data.appId,
      apiKey: algoliaConfiguration.data.secretKey,
      indexNamePrefix: algoliaConfiguration.data.indexNamePrefix,
    });
  }, [
    algoliaConfiguration?.data?.appId,
    algoliaConfiguration?.data?.indexNamePrefix,
    algoliaConfiguration?.data?.secretKey,
  ]);

  useEffect(() => {
    if (searchProvider) {
      searchProvider
        .ping()
        .then(() => setAlgoliaConfigured(true))
        .catch(() => setAlgoliaConfigured(false));
    }
  }, [searchProvider]);

  return (
    <Box>
      {searchProvider && algoliaConfigured ? (
        <Box>
          <Text variant={"heading"} as={"p"} marginBottom={4}>
            Importing products & variants
          </Text>
          <Text as={"p"}>
            Trigger initial indexing for products catalogue. It can take few minutes and will run in
            the background
          </Text>
          <Box display={"flex"} justifyContent={"flex-end"} marginTop={13}>
            <Button onClick={() => fetch("/api/index-products")}>Start importing</Button>
            <Button
              onClick={() =>
                fetch("/api/jobs")
                  .then((r: any) => r.json())
                  .then((jobs: unknown) => {
                    console.log(jobs);
                  })
              }
            >
              Check status
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text variant={"heading"} as={"p"} color={"textCriticalDefault"} marginBottom={4}>
            App not configured
          </Text>
          <Text>Configure Algolia first</Text>
        </Box>
      )}
    </Box>
  );
};

const countVariants = (products: Products, index: number) =>
  products.slice(0, index).reduce((acc, p) => acc + (p.variants?.length ?? 0), 0);
