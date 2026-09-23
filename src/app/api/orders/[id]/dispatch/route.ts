import { OrderStatus } from "@prisma/client";

import {
  buildStationTickets,
  dispatchPendingRounds,
  orderDetailsInclude,
  serializeOrder,
} from "@/lib/order-service";
import { prisma } from "@/lib/prisma";

interface DispatchRequest {
  notes?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: DispatchRequest = {};

  try {
    body = (await request.json()) as DispatchRequest;
  } catch {
    // An empty body is valid when dispatching an already-saved round.
  }

  const notes = body.notes?.trim() || null;

  try {
    const dispatchedRoundIds = await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({ where: { id } });
      if (!order) throw new Error("Order not found");
      if (order.status !== OrderStatus.OPEN) {
        throw new Error("Only open orders can dispatch a round");
      }

      if (notes) {
        await transaction.orderRound.updateMany({
          where: { orderId: id, dispatchedAt: null },
          data: { notes },
        });
        await transaction.orderItem.updateMany({
          where: { orderId: id, dispatchedAt: null },
          data: { notes },
        });
      }

      const roundIds = await dispatchPendingRounds(transaction, id);
      if (roundIds.length === 0) {
        throw new Error("There are no pending items to dispatch");
      }
      return roundIds;
    }, { maxWait: 10_000, timeout: 30_000 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderDetailsInclude,
    });
    if (!order) throw new Error("Order could not be loaded after dispatch");

    return Response.json({
      order: serializeOrder(order),
      tickets: buildStationTickets(order, dispatchedRoundIds),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to dispatch round" },
      { status: 409 },
    );
  }
}
