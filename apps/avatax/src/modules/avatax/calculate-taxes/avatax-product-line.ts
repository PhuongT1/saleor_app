import { LineItemModel } from "avatax/lib/models/LineItemModel";

export const avataxProductLine = {
  create({
    amount,
    taxCode,
    taxIncluded,
    discounted,
    quantity,
    itemCode,
    description,
  }: {
    amount: number;
    taxCode: string;
    taxIncluded: boolean;
    discounted: boolean;
    quantity: number;
    itemCode?: string;
    description?: string;
  }): LineItemModel {
    return {
      amount,
      taxIncluded,
      taxCode,
      quantity,
      discounted,
      itemCode,
      description,
    };
  },

  getItemCode(sku: string | null | undefined, variantId: string | null | undefined) {
    return sku ?? variantId ?? "";
  },
};
