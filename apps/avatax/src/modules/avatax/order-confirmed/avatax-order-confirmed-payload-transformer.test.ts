import { DocumentType } from "avatax/lib/enums/DocumentType";
import { describe, expect, it } from "vitest";
import { SaleorMockOrderFactory } from "../../saleor/mock-order-factory";
import { AvataxOrderConfirmedMockGenerator } from "./avatax-order-confirmed-mock-generator";
import { AvataxOrderConfirmedPayloadTransformer } from "./avatax-order-confirmed-payload-transformer";

const mockGenerator = new AvataxOrderConfirmedMockGenerator();
const saleorOrderMock = SaleorMockOrderFactory.create({ pricesEnteredWithTax: true });

const orderMock = mockGenerator.generateOrder();
const discountedOrderMock = mockGenerator.generateOrder({
  discounts: [
    {
      amount: {
        amount: 10,
      },
      id: "RGlzY291bnREaXNjb3VudDox",
    },
  ],
});

const transformer = new AvataxOrderConfirmedPayloadTransformer();

export const avataxConfigMock = mockGenerator.generateAvataxConfig();

describe("AvataxOrderConfirmedPayloadTransformer", () => {
  it("returns document type of SalesInvoice when isDocumentRecordingEnabled is true", async () => {
    const payload = await transformer.transform(orderMock, saleorOrderMock, avataxConfigMock, []);

    expect(payload.model.type).toBe(DocumentType.SalesInvoice);
  }),
    it("returns document type of SalesOrder when isDocumentRecordingEnabled is false", async () => {
      const payload = await transformer.transform(
        orderMock,
        saleorOrderMock,
        {
          ...avataxConfigMock,
          isDocumentRecordingEnabled: false,
        },
        [],
      );

      expect(payload.model.type).toBe(DocumentType.SalesOrder);
    });
  it("returns lines with discounted: true when there are discounts", async () => {
    const payload = await transformer.transform(
      discountedOrderMock,
      saleorOrderMock,
      avataxConfigMock,
      [],
    );

    const linesWithoutShipping = payload.model.lines.slice(0, -1);
    const check = linesWithoutShipping.every((line) => line.discounted === true);

    expect(check).toBe(true);
  });
  it("returns lines with discounted: false when there are no discounts", async () => {
    const transformer = new AvataxOrderConfirmedPayloadTransformer();
    const payload = await transformer.transform(orderMock, saleorOrderMock, avataxConfigMock, []);

    const linesWithoutShipping = payload.model.lines.slice(0, -1);
    const check = linesWithoutShipping.every((line) => line.discounted === false);

    expect(check).toBe(true);
  });
});
