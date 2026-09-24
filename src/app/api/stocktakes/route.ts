import { StockMovementType } from "@prisma/client";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface StocktakeRequest {
  notes?: string;
  lines?: Array<{ itemId?: string; countedQuantity?: number }>;
}

function createStocktakeCode() {
  return `STK-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
}

export async function GET() {
  if (!(await requireCapability("stock.manage"))) {
    return Response.json({ error: "Stock access is required" }, { status: 403 });
  }
  const stocktakes = await prisma.stocktake.findMany({
    include: { createdBy: { select: { fullName: true } }, lines: { include: { item: { select: { name: true, sku: true, unit: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return Response.json({ stocktakes });
}

export async function POST(request: Request) {
  const actor = await requireCapability("stock.manage");
  if (!actor) return Response.json({ error: "Stock access is required" }, { status: 403 });

  let body: StocktakeRequest;
  try {
    body = (await request.json()) as StocktakeRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return Response.json({ error: "Add at least one counted item" }, { status: 400 });
  }

  try {
    const stocktake = await prisma.$transaction(async (transaction) => {
      const created = await transaction.stocktake.create({
        data: { code: createStocktakeCode(), createdById: actor.id, notes: body.notes?.trim() || null, completedAt: new Date() },
      });

      for (const line of body.lines ?? []) {
        if (!line.itemId) throw new Error("Stocktake item is missing");
        const countedQuantity = Number(line.countedQuantity);
        if (!Number.isInteger(countedQuantity) || countedQuantity < 0) throw new Error("Counted quantity is invalid");
        const item = await transaction.item.findUnique({ where: { id: line.itemId } });
        if (!item) throw new Error("Product not found");
        const difference = countedQuantity - item.stock;
        await transaction.stocktakeLine.create({ data: { stocktakeId: created.id, itemId: item.id, systemQty: item.stock, countedQty: countedQuantity, difference } });
        if (difference !== 0) {
          await transaction.item.update({ where: { id: item.id }, data: { stock: countedQuantity } });
          await transaction.stockMovement.create({ data: { itemId: item.id, actorId: actor.id, type: StockMovementType.STOCKTAKE, quantity: difference, stockBefore: item.stock, stockAfter: countedQuantity, referenceType: "STOCKTAKE", referenceId: created.code, notes: `Stocktake ${created.code}` } });
        }
        await recordAuditEvent({ actorId: actor.id, action: "STOCKTAKE_LINE", entityType: "Item", entityId: item.id, metadata: { stocktake: created.code, systemQty: item.stock, countedQty: countedQuantity, difference } }, transaction);
      }
      await recordAuditEvent({ actorId: actor.id, action: "STOCKTAKE_COMPLETED", entityType: "Stocktake", entityId: created.id, metadata: { code: created.code, lineCount: body.lines?.length ?? 0 } }, transaction);
      const items = await transaction.item.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
      return { stocktake: created, items };
    }, { maxWait: 10_000, timeout: 30_000 });

    return Response.json(stocktake, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to complete stocktake" }, { status: 409 });
  }
}
