import { createAppRegisterHandler } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "../../../saleor-app";
import { gql } from "urql";
import { createClient } from "../../lib/graphql";
import { SaleorVersionQuery } from "../../../generated/graphql";

import { createLogger } from "../../lib/logger";
import { REQUIRED_SALEOR_VERSION } from "./manifest";

const semver = require("semver");

const allowedUrlsPattern = process.env.ALLOWED_DOMAIN_PATTERN;

const SaleorVersion = gql`
  query SaleorVersion {
    shop {
      version
    }
  }
`;

/**
 * Required endpoint, called by Saleor to install app.
 * It will exchange tokens with app, so saleorApp.apl will contain token
 */
export default createAppRegisterHandler({
  apl: saleorApp.apl,
  /**
   * Prohibit installation from Saleors other than specified by the regex.
   * Regex source is ENV so if ENV is not set, all installations will be allowed.
   */
  allowedSaleorUrls: [
    (url) => {
      if (allowedUrlsPattern) {
        const regex = new RegExp(allowedUrlsPattern);

        return regex.test(url);
      }

      return true;
    },
  ],
  /**
   * Check Saleor version and reject installation if it doesn't match
   *
   * TODO: Consider moving to app-sdk and do it under the hood
   *
   * Also, consume version, if possible, from the request directly
   * @see https://github.com/saleor/saleor/issues/12144
   */
  async onRequestVerified(req, { authData: { token, saleorApiUrl }, respondWithError }) {
    const logger = createLogger({
      context: "onRequestVerified",
    });

    try {
      const client = createClient(saleorApiUrl, async () => {
        return {
          token,
        };
      });

      const saleorVersion = await client
        .query<SaleorVersionQuery>(SaleorVersion, {})
        .toPromise()
        .then((res) => {
          return res.data?.shop.version;
        });

      logger.debug({ saleorVersion }, "Received saleor version from Shop query");

      if (!saleorVersion) {
        throw new Error("Saleor Version couldnt be fetched from the API");
      }

      const versionIsValid = semver.satisfies(
        semver.coerce(saleorVersion),
        REQUIRED_SALEOR_VERSION
      );

      logger.debug(
        { saleorVersion, REQUIRED_SALEOR_VERSION, coerced: semver.coerce(saleorVersion) },
        "Semver validation failed"
      );

      if (!versionIsValid) {
        throw new Error(`App requires Saleor matching semver: ${REQUIRED_SALEOR_VERSION}`);
      }
    } catch (e: unknown) {
      const message = (e as Error)?.message ?? "Unknown error";

      logger.debug({ message }, "Failed validating semver, will respond with error and status 400");

      throw respondWithError({
        message: message,
        status: 400,
      });
    }
  },
});
