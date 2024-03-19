import { LineItemModel } from "avatax/lib/models/LineItemModel";
import { AvataxConfig } from "../avatax-connection-schema";
import { avataxProductLine } from "../calculate-taxes/avatax-product-line";
import { avataxShippingLine } from "../calculate-taxes/avatax-shipping-line";
import { AvataxAppOrder, DeprecatedOrderConfirmedSubscriptionFragment } from "../order-parser";
import { AvataxTaxCodeMatches } from "../tax-code/avatax-tax-code-match-repository";
import { AvataxOrderConfirmedTaxCodeMatcher } from "./avatax-order-confirmed-tax-code-matcher";

export class AvataxOrderConfirmedPayloadLinesTransformer {
  transform(
    order: DeprecatedOrderConfirmedSubscriptionFragment,
    avataxAppOrder: AvataxAppOrder,
    config: AvataxConfig,
    matches: AvataxTaxCodeMatches,
  ): LineItemModel[] {
    const isDiscounted = order.discounts.length > 0;

    const productLines: LineItemModel[] = order.lines.map((line) => {
      const matcher = new AvataxOrderConfirmedTaxCodeMatcher();
      const taxCode = matcher.match(line, matches);

      return avataxProductLine.create({
        amount: line.totalPrice.gross.amount,
        taxIncluded: avataxAppOrder.taxIncluded,
        taxCode,
        quantity: line.quantity,
        discounted: isDiscounted,
        itemCode: avataxProductLine.getItemCode(line.productSku, line.productVariantId),
        description: line.productName,
      });
    });

    if (order.shippingPrice.net.amount !== 0) {
      const shippingLine = avataxShippingLine.create({
        amount: order.shippingPrice.gross.amount,
        taxIncluded: avataxAppOrder.taxIncluded,
        /**
         * * Different shipping methods can have different tax codes.
         * https://developer.avalara.com/ecommerce-integration-guide/sales-tax-badge/designing/non-standard-items/
         */
        taxCode: config.shippingTaxCode,
        discounted: isDiscounted,
      });

      return [...productLines, shippingLine];
    }

    return productLines;
  }
}
