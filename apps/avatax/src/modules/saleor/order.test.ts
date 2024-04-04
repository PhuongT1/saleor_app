import { OrderCancelledPayload } from "../webhooks/payloads/order-cancelled-payload";
import { SaleorCancelledOrderEvent } from "./order";
import { expect, it, describe } from "vitest";
import { OrderCancelNoAvataxIdError, OrderCancelPayloadOrderError } from "./order-cancel-error";

describe("SaleorCancelledOrderEvent", () => {
  const validPayload = {
    order: {
      channel: {
        id: "channel-id",
        slug: "channel-slug",
      },
      id: "order-id",
      avataxId: "avatax-id",
    },
    recipient: {
      privateMetadata: [
        {
          key: "key",
          value: "value",
        },
      ],
    },
    __typename: "OrderCancelled",
  } as OrderCancelledPayload;

  it("should create a SaleorCancelledOrderEvent from a valid payload", () => {
    const result = SaleorCancelledOrderEvent.create(validPayload);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toBeInstanceOf(SaleorCancelledOrderEvent);
    }
  });

  it("should fail to create a SaleorCancelledOrderEvent when 'order' is missing", () => {
    const result = SaleorCancelledOrderEvent.create({
      ...validPayload,
      order: undefined,
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(OrderCancelPayloadOrderError);
    }
  });

  it("should fail to create a SaleorCancelledOrderEvent when 'order.avataxId' is missing", () => {
    const result = SaleorCancelledOrderEvent.create({
      ...validPayload,
      order: {
        ...validPayload.order,
        avataxId: undefined,
      },
    } as OrderCancelledPayload);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(OrderCancelNoAvataxIdError);
      expect(result.error.message).toBe(
        "No AvaTax id found in order (missing 'avataxId' in 'order')",
      );
    }
  });

  it("should throw an error when parsing fails", () => {
    const result = SaleorCancelledOrderEvent.create({
      ...validPayload,
      order: {
        ...validPayload.order,
        channel: "ERROR" as any,
      },
    } as OrderCancelledPayload);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SaleorCancelledOrderEvent.ParsingError);
    }
  });
});
