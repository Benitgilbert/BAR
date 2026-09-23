import { ItemCategory, Prisma, ProductionStation } from "@prisma/client";

import { canManageCatalog, getConfiguredRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const categories = new Set<string>(Object.values(ItemCategory));

function stationForCategory(category: ItemCategory) {
  return category === ItemCategory.FOOD
    ? ProductionStation.KITCHEN_MUCOMA
    : ProductionStation.BAR;
}

function nonNegativeInteger(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} must be a whole number`);
  }
  return number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!canManageCatalog(getConfiguredRole())) {
    return Response.json({ error: "Mucoma can update kitchen tickets, not products" }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const current = await prisma.item.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "Product not found" }, { status: 404 });

    const data: Prisma.ItemUpdateInput = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new Error("Product name is required");
      data.name = name;
    }
    if (body.sku !== undefined) {
      const sku = String(body.sku).trim().toUpperCase();
      if (!sku) throw new Error("SKU is required");
      data.sku = sku;
    }
    if (body.category !== undefined) {
      const category = body.category as ItemCategory;
      if (!categories.has(category)) throw new Error("Invalid category");
      data.category = category;
      data.productionStation = stationForCategory(category);
    }
    if (body.price !== undefined) data.price = nonNegativeInteger(body.price, "Price");
    if (body.stock !== undefined) data.stock = nonNegativeInteger(body.stock, "Stock");
    if (body.lowStockThreshold !== undefined) {
      data.lowStockThreshold = nonNegativeInteger(body.lowStockThreshold, "Low-stock threshold");
    }
    if (body.stockDelta !== undefined) {
      const delta = Number(body.stockDelta);
      if (!Number.isInteger(delta) || delta === 0) throw new Error("Stock adjustment is invalid");
      data.stock = current.stock + delta;
      if (data.stock < 0) throw new Error("Stock cannot be reduced below zero");
    }
    if (body.unit !== undefined) {
      const unit = String(body.unit).trim();
      if (!unit) throw new Error("Unit is required");
      data.unit = unit;
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null;
    }
    if (body.active !== undefined) data.active = Boolean(body.active);

    const item = await prisma.item.update({ where: { id }, data });
    return Response.json({ item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "That SKU is already registered" }, { status: 409 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update product" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!canManageCatalog(getConfiguredRole())) {
    return Response.json({ error: "Mucoma cannot archive products" }, { status: 403 });
  }

  const { id } = await params;
  try {
    // Archive instead of deleting so historical order items remain readable.
    const item = await prisma.item.update({ where: { id }, data: { active: false } });
    return Response.json({ item, archived: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to archive product" },
      { status: 404 },
    );
  }
}
