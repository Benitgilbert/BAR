import { KitchenStatus, OrderStatus, ProductionStation } from "@prisma/client";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { orderDetailsInclude, serializeOrder } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";

interface KitchenUpdateRequest {
  itemId?: string;
  status?: KitchenStatus;
}

const statuses = new Set<string>(Object.values(KitchenStatus));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireCapability("kitchen.update");
  if (!actor) return Response.json({ error: "Kitchen access is required" }, { status: 403 });
  const { id } = await params;
  let body: KitchenUpdateRequest;
  try {
    body = (await request.json()) as KitchenUpdateRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.itemId || !body.status || !statuses.has(body.status)) return Response.json({ error: "Item and kitchen status are required" }, { status: 400 });

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: orderDetailsInclude });
    if (!order || order.status !== OrderStatus.OPEN) throw new Error("Open order not found");
    const item = order.items.find((orderItem) => orderItem.id === body.itemId);
    if (!item || item.station !== ProductionStation.KITCHEN_MUCOMA) throw new Error("Kitchen item not found");

    await prisma.orderItem.update({ where: { id: item.id }, data: { kitchenStatus: body.status } });
    await recordAuditEvent({ actorId: actor.id, action: "KITCHEN_STATUS_UPDATED", entityType: "OrderItem", entityId: item.id, metadata: { orderNumber: order.orderNumber, item: item.itemName, from: item.kitchenStatus, to: body.status } });
    const updatedOrder = await prisma.order.findUnique({ where: { id }, include: orderDetailsInclude });
    return Response.json({ order: updatedOrder ? serializeOrder(updatedOrder) : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update kitchen status" }, { status: 409 });
  }
}
