import { OrderStatus, OrderType, PaymentMethod } from "@prisma/client";

import {
  buildReceiptPayload,
  buildStationTickets,
  createOrderRound,
  dispatchPendingRounds,
  getOrderDestination,
  normalizePaymentMethod,
  orderDetailsInclude,
  resolveWaiter,
  serializeOrder,
  type RequestedOrderLine,
} from "@/lib/order-service";
import { requireCapability } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

interface OrderLineRequest {
  itemId?: unknown;
  quantity?: unknown;
}

interface OrderRequest {
  type?: OrderType | string | null;
  orderId?: string | null;
  tableId?: string | null;
  bookingId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  cashierId?: string | null;
  waiterId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  dispatch?: boolean;
  instantPay?: boolean;
  items?: OrderLineRequest[];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save order";
}

function createOrderNumber() {
  return `UMG-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now()
    .toString()
    .slice(-4)}`;
}

function parseRequestedLines(lines: OrderLineRequest[] | undefined) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Add at least one menu item");
  }

  const quantities = new Map<string, number>();
  for (const line of lines) {
    const itemId = typeof line.itemId === "string" ? line.itemId : "";
    const quantity = Number(line.quantity);
    if (!itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Invalid order item");
    }
    quantities.set(itemId, (quantities.get(itemId) ?? 0) + quantity);
  }
  return quantities;
}

export async function POST(request: Request) {
  const actor = await requireCapability("orders.create");
  if (!actor) {
    return Response.json({ error: "POS order access is required" }, { status: 403 });
  }

  let body: OrderRequest;

  try {
    body = (await request.json()) as OrderRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const requestedQuantities = parseRequestedLines(body.items);
    const shouldDispatch = body.dispatch !== false;
    const instantPay = body.instantPay === true;
    const notes = body.notes?.trim() || null;

    if (instantPay && !shouldDispatch) {
      return Response.json(
        { error: "Instant Pay orders must dispatch their round" },
        { status: 400 },
      );
    }

    const paymentMethod = body.paymentMethod
      ? normalizePaymentMethod(body.paymentMethod)
      : PaymentMethod.CASH;
    if (body.paymentMethod && !paymentMethod) {
      return Response.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      let order = body.orderId
        ? await transaction.order.findUnique({ where: { id: body.orderId } })
        : null;
      const inferredType = body.type ?? (body.tableId ? OrderType.TABLE : body.bookingId ? OrderType.ROOM : null);
      const orderType = order?.type ?? (inferredType as OrderType | null);

      if (!orderType || !Object.values(OrderType).includes(orderType)) {
        throw new Error("Choose a table or active room booking");
      }

      if (order && order.status !== OrderStatus.OPEN) {
        throw new Error("This order is already settled or cancelled");
      }

      if (!order && orderType === OrderType.TABLE && !body.tableId) {
        throw new Error("Choose a table for this order");
      }

      if (!order && orderType === OrderType.ROOM && !body.bookingId) {
        throw new Error("Choose an active room booking");
      }

      if (order?.type === OrderType.TABLE && body.tableId && order.tableId !== body.tableId) {
        throw new Error("The selected table does not match this open tab");
      }
      if (order?.type === OrderType.ROOM && body.bookingId && order.bookingId !== body.bookingId) {
        throw new Error("The selected room does not match this open folio");
      }

      if (orderType === OrderType.TABLE) {
        const table = await transaction.table.findUnique({
          where: { id: body.tableId ?? order?.tableId ?? "" },
        });
        if (!table || !table.active) throw new Error("The selected table is unavailable");
      } else {
        const booking = await transaction.booking.findUnique({
          where: { id: body.bookingId ?? order?.bookingId ?? "" },
        });
        if (!booking || booking.status !== "CHECKED_IN") {
          throw new Error("The selected room booking is no longer active");
        }
      }

      if (!order) {
        order = await transaction.order.findFirst({
          where:
            orderType === OrderType.TABLE
              ? { type: OrderType.TABLE, tableId: body.tableId ?? "", status: OrderStatus.OPEN }
              : { type: OrderType.ROOM, bookingId: body.bookingId ?? "", status: OrderStatus.OPEN },
          orderBy: { createdAt: "desc" },
        });
      }

      const waiter = await resolveWaiter(transaction, body.waiterId);
      const itemIds = [...requestedQuantities.keys()];
      const items = await transaction.item.findMany({
        where: { id: { in: itemIds }, active: true },
      });
      const itemsById = new Map(items.map((item) => [item.id, item]));

      if (items.length !== itemIds.length) {
        throw new Error("One or more menu items are unavailable");
      }

      const lines: RequestedOrderLine[] = itemIds.map((itemId) => {
        const item = itemsById.get(itemId);
        if (!item) throw new Error("Menu item not found");
        return {
          itemId,
          quantity: requestedQuantities.get(itemId) ?? 0,
          item: {
            id: item.id,
            name: item.name,
            price: item.price,
            stock: item.stock,
            unit: item.unit,
            productionStation: item.productionStation,
          },
        };
      });

      const addedSubtotal = lines.reduce(
        (total, line) => total + line.item.price * line.quantity,
        0,
      );
      const now = new Date();
      let isNewOrder = false;

      if (!order) {
        isNewOrder = true;
        order = await transaction.order.create({
          data: {
            orderNumber: createOrderNumber(),
            type: orderType,
            status: OrderStatus.OPEN,
            settlementStatus: instantPay ? "PAID" : "PENDING",
            tableId: orderType === OrderType.TABLE ? body.tableId : null,
            bookingId: orderType === OrderType.ROOM ? body.bookingId : null,
            cashierId: body.cashierId,
            waiterId: waiter.id,
            customerName: body.customerName?.trim() || null,
            customerPhone: body.customerPhone?.trim() || null,
            subtotal: addedSubtotal,
            discount: 0,
            total: addedSubtotal,
            openedAt: now,
            notes,
          },
        });
      } else if (!order.waiterId) {
        order = await transaction.order.update({
          where: { id: order.id },
          data: { waiterId: waiter.id, notes: notes ?? order.notes },
        });
      }

      const lastRound = await transaction.orderRound.aggregate({
        where: { orderId: order.id },
        _max: { roundNumber: true },
      });
      const roundNumber = (lastRound._max.roundNumber ?? 0) + 1;
      await createOrderRound(transaction, {
        orderId: order.id,
        roundNumber,
        waiterName: waiter.fullName,
        notes,
        lines,
      });

      const nextSubtotal = order.subtotal + addedSubtotal;
      order = await transaction.order.update({
        where: { id: order.id },
        data: {
          subtotal: nextSubtotal,
          total: Math.max(0, nextSubtotal - order.discount),
          ...(body.customerName ? { customerName: body.customerName.trim() } : {}),
          ...(body.customerPhone ? { customerPhone: body.customerPhone.trim() } : {}),
        },
      });

      let dispatchedRoundIds: string[] = [];
      if (shouldDispatch) {
        dispatchedRoundIds = await dispatchPendingRounds(transaction, order.id, actor.id, now);
      }

      if (instantPay) {
        const finalTotal = Math.max(0, order.subtotal - order.discount);
        order = await transaction.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            settlementStatus: "PAID",
            paymentMethod,
            amountPaid: finalTotal,
            changeDue: 0,
            settledAt: now,
            paidAt: now,
          },
        });
      }

      return { orderId: order.id, dispatchedRoundIds, isNewOrder };
    }, { maxWait: 10_000, timeout: 30_000 });

    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: orderDetailsInclude,
    });
    if (!order) throw new Error("Order could not be loaded after saving");

    await recordAuditEvent({
      actorId: actor.id,
      action: order.status === OrderStatus.PAID ? "ORDER_PAID" : result.dispatchedRoundIds.length ? "ROUND_DISPATCHED" : "ORDER_OPENED",
      entityType: "Order",
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, type: order.type, total: order.total, appended: !result.isNewOrder },
    });

    return Response.json(
      {
        order: serializeOrder(order),
        appended: !result.isNewOrder,
        dispatched: result.dispatchedRoundIds.length > 0,
        tickets: buildStationTickets(order, result.dispatchedRoundIds),
        receipt: order.status === OrderStatus.PAID ? buildReceiptPayload(order) : null,
        destination: getOrderDestination(order),
      },
      { status: result.isNewOrder ? 201 : 200 },
    );
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 409 });
  }
}
