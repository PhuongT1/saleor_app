import { DocumentType } from "avatax/lib/enums/DocumentType";
import { LineItemModel } from "avatax/lib/models/LineItemModel";
import { TransactionModel } from "avatax/lib/models/TransactionModel";
import { OrderCreatedSubscriptionFragment } from "../../../../generated/graphql";
import { ChannelConfig } from "../../channels-configuration/channels-config";
import { CreateOrderResponse } from "../../taxes/tax-provider-webhook";
import { CreateTransactionArgs } from "../avatax-client";
import { AvataxConfig } from "../avatax-config";
import { mapChannelAddressToAvataxAddress, mapSaleorAddressToAvataxAddress } from "./address-map";

const mapLines = (order: OrderCreatedSubscriptionFragment): LineItemModel[] => {
  const productLines = order.lines.map((line) => ({
    amount: line.unitPrice.net.amount,
    quantity: line.quantity,
    itemCode: "Product",
  }));

  return productLines;
};

const mapPayload = (
  order: OrderCreatedSubscriptionFragment,
  channel: ChannelConfig,
  config: AvataxConfig
): CreateTransactionArgs => {
  return {
    model: {
      type: DocumentType.SalesInvoice,
      customerCode: "0", // todo: replace with customer code
      companyCode: config.companyCode,
      // * commit: If true, the transaction will be committed immediately after it is created. See: https://developer.avalara.com/communications/dev-guide_rest_v2/commit-uncommit
      commit: config.isAutocommit,
      addresses: {
        shipFrom: mapChannelAddressToAvataxAddress(channel.address),
        // billing or shipping address?
        shipTo: mapSaleorAddressToAvataxAddress(order.billingAddress!),
      },
      // todo: add currency code
      currencyCode: "",
      lines: mapLines(order),
      // todo: replace date with order/checkout date
      date: new Date(),
    },
  };
};

const mapResponse = (response: TransactionModel): CreateOrderResponse => {
  return {
    id: response.code ?? "",
  };
};

export const avataxOrderCreated = {
  mapPayload,
  mapResponse,
};
