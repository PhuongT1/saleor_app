import { Client } from "urql";
import {
  CategoryWithMappingFragmentFragment,
  FetchCategoriesWithMappingDocument,
} from "../../../generated/graphql";
import { createLogger } from "../../logger";

const logger = createLogger("CategoriesFetcher");

export class CategoriesFetcher {
  constructor(private apiClient: Pick<Client, "query">) {}

  private async fetchRecursivePage(
    accumulator: CategoryWithMappingFragmentFragment[],
    cursor?: string,
  ): Promise<CategoryWithMappingFragmentFragment[]> {
    const result = await this.apiClient
      .query(FetchCategoriesWithMappingDocument, {
        cursor,
      })
      .toPromise();

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      // todo sentry
      throw new Error("Empty categories data");
    }

    accumulator = [...accumulator, ...(result.data.categories?.edges.map((c) => c.node) ?? [])];

    const hasNextPage = result.data.categories?.pageInfo.hasNextPage;
    const endCursor = result.data.categories?.pageInfo.endCursor;

    if (hasNextPage && endCursor) {
      return this.fetchRecursivePage(accumulator, endCursor);
    } else {
      return accumulator;
    }
  }

  /**
   * Fetches all categories pages - standard page is max 100 items
   */
  async fetchAllCategories(): Promise<CategoryWithMappingFragmentFragment[]> {
    let categories: CategoryWithMappingFragmentFragment[] = [];

    logger.debug("Fetching attributes");

    await this.fetchRecursivePage(categories, undefined);

    logger.info("Categories fetched successfully", {
      first: categories[0],
      totalLength: categories.length,
    });

    return categories;
  }
}
