import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  Prisma,
  ProductionStation,
  StaffRole,
} from "@prisma/client";

import type {
  PosOrderItem,
  PosOrderRound,
  ReceiptLine,
  SettlementReceipt,
  StationTicket,
} from "@/types/hospitality";

export const orderDetailsInclude = {
  items: {
    orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }],
  },
  rounds: {
    orderBy: { roundNumber: "asc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  table: true,
  booking: { include: { room: true } },
  waiter: true,
  cashier: true,
} satisfies Prisma.OrderInclude;

export type OrderDetails = Prisma.OrderGetPayload<{
  include: typeof orderDetailsInclude;
}>;

export interface RequestedOrderLine {
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    price: number;
    stock: number;
    unit: string;
    productionStation: ProductionStation;
  };
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== "string") return null;

  switch (value.toUpperCase()) {
    case "CASH":
      return PaymentMethod.CASH;
    case "MOMO":
    case "MTN_MOMO":
    case "MOBILE_MONEY":
    case "AIRTEL":
    case "AIRTEL_MONEY":
      return PaymentMethod.MOBILE_MONEY;
    case "CARD":
      return PaymentMethod.CARD;
    case "ROOM_FOLIO":
    case "ROOM":
      return PaymentMethod.ROOM_FOLIO;
    case "OTHER":
      return PaymentMethod.OTHER;
    default:
      return null;
  }
}

export function paymentMethodLabel(method: PaymentMethod | null) {
  switch (method) {
    case PaymentMethod.CASH:
      return "Paid · Cash";
    case PaymentMethod.MOBILE_MONEY:
      return "Paid · Mobile Money";
    case PaymentMethod.CARD:
      return "Paid · Card";
    case PaymentMethod.ROOM_FOLIO:
      return "Charged to room folio";
    case PaymentMethod.OTHER:
      return "Paid · Other";
    default:
      return "Payment pending";
  }
}

export function getOrderDestination(order: {
  type: OrderType;
  table: { name: string } | null;
  booking: { room: { number: string }; guestName: string } | null;
}) {
  if (order.type === OrderType.TABLE) {
    return order.table ? `Table ${order.table.name}` : "Table order";
  }

  return order.booking
    ? `Room ${order.booking.room.number} · ${order.booking.guestName}`
    : "Room folio";
}

export function createTicketNumber(roundNumber: number) {
  return `RT-${roundNumber}-${Date.now().toString().slice(-6)}`;
}

export async function resolveWaiter(
  transaction: Prisma.TransactionClient,
  waiterId?: string | null,
) {
  const waiter = waiterId
    ? await transaction.user.findFirst({
        where: { id: waiterId, active: true },
      })
    : await transaction.user.findFirst({
        where: { role: StaffRole.WAITER, active: true },
        orderBy: { createdAt: "asc" },
      });

  if (!waiter) {
    throw new Error("No active waiter is configured");
  }

  return waiter;
}

export async function createOrderRound(
  transaction: Prisma.TransactionClient,
  input: {
    orderId: string;
    roundNumber: number;
    waiterName: string;
    notes: string | null;
    lines: RequestedOrderLine[];
  },
) {
  return transaction.orderRound.create({
    data: {
      orderId: input.orderId,
      roundNumber: input.roundNumber,
      ticketNumber: createTicketNumber(input.roundNumber),
      waiterName: input.waiterName,
      notes: input.notes,
      items: {
        create: input.lines.map((line) => ({
          orderId: input.orderId,
          roundNumber: input.roundNumber,
          itemId: line.itemId,
          itemName: line.item.name,
          station: line.item.productionStation,
          unitPrice: line.item.price,
          quantity: line.quantity,
          lineTotal: line.item.price * line.quantity,
          notes: input.notes,
        })),
      },
    },
    include: { items: true },
  });
}

export async function dispatchPendingRounds(
  transaction: Prisma.TransactionClient,
  orderId: string,
  dispatchedAt = new Date(),
) {
  const pendingRounds = await transaction.orderRound.findMany({
    where: { orderId, dispatchedAt: null },
    include: { items: true },
    orderBy: { roundNumber: "asc" },
  });

  if (pendingRounds.length === 0) {
    return [];
  }

  const quantities = new Map<string, number>();
  for (const round of pendingRounds) {
    for (const item of round.items) {
      quantities.set(
        item.itemId,
        (quantities.get(item.itemId) ?? 0) + item.quantity,
      );
    }
  }

  const inventoryItems = await transaction.item.findMany({
    where: { id: { in: [...quantities.keys()] }, active: true },
  });
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));

  for (const [itemId, quantity] of quantities) {
    const item = inventoryById.get(itemId);
    if (!item) throw new Error("A menu item is no longer available");
    if (item.stock < quantity) {
      throw new Error(`${item.name} has only ${item.stock} ${item.unit}(s) in stock`);
    }
  }

  for (const [itemId, quantity] of quantities) {
    await transaction.item.update({
      where: { id: itemId },
      data: { stock: { decrement: quantity } },
    });
  }

  const roundIds = pendingRounds.map((round) => round.id);
  await transaction.orderItem.updateMany({
    where: { roundId: { in: roundIds }, dispatchedAt: null },
    data: { dispatchedAt },
  });
  await transaction.orderRound.updateMany({
    where: { id: { in: roundIds }, dispatchedAt: null },
    data: { dispatchedAt },
  });
  await transaction.order.update({
    where: { id: orderId },
    data: {
      lastRoundAt: dispatchedAt,
      roundCount: { increment: pendingRounds.length },
    },
  });

  return roundIds;
}

export function buildStationTickets(
  order: OrderDetails,
  dispatchedRoundIds: string[],
): StationTicket[] {
  const rounds = order.rounds.filter((round) =>
    dispatchedRoundIds.includes(round.id),
  );

  return rounds.flatMap((round) => {
    const byStation = new Map<
      ProductionStation,
      Map<string, { name: string; quantity: number; notes: string | null }>
    >();

    for (const item of round.items) {
      const stationItems =
        byStation.get(item.station) ??
        new Map<string, { name: string; quantity: number; notes: string | null }>();
      const key = `${item.itemName}:${item.notes ?? ""}`;
      const existing = stationItems.get(key);

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        stationItems.set(key, {
          name: item.itemName,
          quantity: item.quantity,
          notes: item.notes,
        });
      }
      byStation.set(item.station, stationItems);
    }

    const dispatchedAt = round.dispatchedAt?.toISOString() ?? new Date().toISOString();

    return [...byStation.entries()].map(([station, stationItems]) => ({
      station,
      ticketNumber: `${station === "BAR" ? "BAR" : "MUC"}-${round.ticketNumber}`,
      orderId: order.id,
      tableName: getOrderDestination(order),
      waiterName: round.waiterName,
      dispatchedAt,
      notes: round.notes,
      items: [...stationItems.values()],
    }));
  });
}

export function buildReceiptPayload(order: OrderDetails): SettlementReceipt {
  const finalTotal = Math.max(0, order.subtotal - order.discount);
  const lines: ReceiptLine[] = order.items.map((item) => ({
    name: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    roundNumber: item.roundNumber,
    station: item.station,
    dispatched: Boolean(item.dispatchedAt),
  }));

  return {
    orderNumber: order.orderNumber,
    destination: getOrderDestination(order),
    issuedAt: new Date().toISOString(),
    openedAt: order.openedAt.toISOString(),
    lines,
    subtotal: order.subtotal,
    discount: order.discount,
    total: finalTotal,
    amountPaid: order.amountPaid,
    changeDue: order.changeDue,
    paymentLabel:
      order.status === OrderStatus.OPEN
        ? "Proforma · Balance due"
        : paymentMethodLabel(order.paymentMethod),
    roundCount: order.roundCount,
  };
}

export function serializeOrder(order: OrderDetails) {
  const items: PosOrderItem[] = order.items.map((item) => ({
    id: item.id,
    itemId: item.itemId,
    itemName: item.itemName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    roundNumber: item.roundNumber,
    station: item.station,
    dispatchedAt: item.dispatchedAt?.toISOString() ?? null,
    notes: item.notes,
  }));
  const rounds: PosOrderRound[] = order.rounds.map((round) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    ticketNumber: round.ticketNumber,
    waiterName: round.waiterName,
    notes: round.notes,
    dispatchedAt: round.dispatchedAt?.toISOString() ?? null,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    tableId: order.tableId,
    tableName: order.table?.name ?? null,
    bookingId: order.bookingId,
    bookingLabel: order.booking
      ? `Room ${order.booking.room.number} · ${order.booking.guestName}`
      : null,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    roundCount: order.roundCount,
    pendingItemCount: order.items
      .filter((item) => !item.dispatchedAt)
      .reduce((total, item) => total + item.quantity, 0),
    lastRoundAt: order.lastRoundAt?.toISOString() ?? null,
    openedAt: order.openedAt.toISOString(),
    items,
    rounds,
  };
}
