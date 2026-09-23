import { OrderStatus, PaymentMethod } from "@prisma/client";

import {
  buildReceiptPayload,
  normalizePaymentMethod,
  orderDetailsInclude,
  serializeOrder,
} from "@/lib/order-service";
import { prisma } from "@/lib/prisma";

interface SettleRequest {
  payment_method?: unknown;
  amount_paid?: unknown;
  discount?: unknown;
}

function parseAmount(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Amount paid must be a whole RWF amount");
  }
  return amount;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: SettleRequest;

  try {
    body = (await request.json()) as SettleRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const paymentMethod = normalizePaymentMethod(body.payment_method);
    if (!paymentMethod) {
      return Response.json({ error: "Choose Cash, MoMo, Card, or Room Folio" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderDetailsInclude,
    });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    if (order.status === OrderStatus.PAID) {
      return Response.json({
        order: serializeOrder(order),
        receipt: buildReceiptPayload(order),
        alreadySettled: true,
      });
    }
    if (order.status === OrderStatus.CANCELLED) {
      return Response.json({ error: "Cancelled orders cannot be settled" }, { status: 409 });
    }
    if (order.items.some((item) => !item.dispatchedAt)) {
      return Response.json(
        { error: "Dispatch all pending rounds before settling this bill" },
        { status: 409 },
      );
    }
    if (paymentMethod === PaymentMethod.ROOM_FOLIO && order.type !== "ROOM") {
      return Response.json(
        { error: "Room Folio can only settle a room charge" },
        { status: 400 },
      );
    }

    const discount = parseAmount(body.discount, order.discount);
    if (discount > order.subtotal) {
      return Response.json({ error: "Discount cannot exceed the subtotal" }, { status: 400 });
    }

    const finalTotal = Math.max(0, order.subtotal - discount);
    const amountPaid =
      paymentMethod === PaymentMethod.ROOM_FOLIO
        ? 0
        : parseAmount(body.amount_paid, finalTotal);

    if (paymentMethod !== PaymentMethod.ROOM_FOLIO && amountPaid < finalTotal) {
      return Response.json(
        { error: `Amount paid must cover at least ${finalTotal} RWF` },
        { status: 400 },
      );
    }

    const changeDue =
      paymentMethod === PaymentMethod.CASH ? Math.max(0, amountPaid - finalTotal) : 0;
    const settledAt = new Date();

    const settledOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.PAID,
        settlementStatus: "PAID",
        discount,
        total: finalTotal,
        paymentMethod,
        amountPaid,
        changeDue,
        settledAt,
        paidAt: settledAt,
      },
      include: orderDetailsInclude,
    });

    return Response.json({
      order: serializeOrder(settledOrder),
      receipt: buildReceiptPayload(settledOrder),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to settle order" },
      { status: 409 },
    );
  }
}
