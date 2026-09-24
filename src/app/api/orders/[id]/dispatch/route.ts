import { OrderStatus } from "@prisma/client";

import {
  buildStationTickets,
  dispatchPendingRounds,
  orderDetailsInclude,
  serializeOrder,
} from "@/lib/order-service";
import { requireCapability } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

interface DispatchRequest {
  notes?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await requireCapability("orders.dispatch");
  if (!actor) {
    return Response.json({ error: "Order dispatch access is required" }, { status: 403 });
  }
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

      const roundIds = await dispatchPendingRounds(transaction, id, actor.id);
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

    await recordAuditEvent({ actorId: actor.id, action: "ROUND_DISPATCHED", entityType: "Order", entityId: order.id, metadata: { roundIds: dispatchedRoundIds, ticketCount: buildStationTickets(order, dispatchedRoundIds).length } });
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
