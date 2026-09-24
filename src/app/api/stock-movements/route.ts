import { StockMovementType } from "@prisma/client";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface StockMovementRequest {
  itemId?: string;
  type?: StockMovementType;
  quantity?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
}

const movementTypes = new Set<string>(Object.values(StockMovementType));

export async function GET(request: Request) {
  if (!(await requireCapability("stock.manage"))) {
    return Response.json({ error: "Stock access is required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId") ?? undefined;
  const movements = await prisma.stockMovement.findMany({
    where: itemId ? { itemId } : undefined,
    include: { item: { select: { name: true, sku: true, unit: true } }, actor: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({ movements });
}

export async function POST(request: Request) {
  const actor = await requireCapability("stock.manage");
  if (!actor) return Response.json({ error: "Stock access is required" }, { status: 403 });

  let body: StockMovementRequest;
  try {
    body = (await request.json()) as StockMovementRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.itemId || !body.type || !movementTypes.has(body.type)) {
    return Response.json({ error: "Item and movement type are required" }, { status: 400 });
  }
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity === 0) {
    return Response.json({ error: "Quantity must be a non-zero whole number" }, { status: 400 });
  }

  try {
    const movement = await prisma.$transaction(async (transaction) => {
      const item = await transaction.item.findUnique({ where: { id: body.itemId } });
      if (!item || !item.active) throw new Error("Product not found");

      const signedQuantity = body.type === StockMovementType.SALE || body.type === StockMovementType.WASTE
        ? -Math.abs(quantity)
        : body.type === StockMovementType.ADJUSTMENT
          ? quantity
          : Math.abs(quantity);
      const stockAfter = item.stock + signedQuantity;
      if (stockAfter < 0) throw new Error(`${item.name} has only ${item.stock} ${item.unit}(s)`);

      await transaction.item.update({ where: { id: item.id }, data: { stock: stockAfter } });
      const createdMovement = await transaction.stockMovement.create({
        data: {
          itemId: item.id,
          actorId: actor.id,
          type: body.type!,
          quantity: signedQuantity,
          stockBefore: item.stock,
          stockAfter,
          referenceType: body.referenceType?.trim() || null,
          referenceId: body.referenceId?.trim() || null,
          notes: body.notes?.trim() || null,
        },
        include: { item: { select: { name: true, sku: true, unit: true } } },
      });
      await recordAuditEvent(
        {
          actorId: actor.id,
          action: `STOCK_${body.type}`,
          entityType: "Item",
          entityId: item.id,
          metadata: { sku: item.sku, quantity: signedQuantity, stockBefore: item.stock, stockAfter },
        },
        transaction,
      );
      return createdMovement;
    });

    return Response.json({ movement }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to record stock movement" }, { status: 409 });
  }
}
