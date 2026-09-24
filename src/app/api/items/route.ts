import { ItemCategory, Prisma, ProductionStation } from "@prisma/client";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const categories = new Set<string>(Object.values(ItemCategory));

function stationForCategory(category: ItemCategory) {
  return category === ItemCategory.FOOD
    ? ProductionStation.KITCHEN_MUCOMA
    : ProductionStation.BAR;
}

function parseItemInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : "";
  const category = body.category as ItemCategory;
  const price = Number(body.price);
  const stock = Number(body.stock ?? 0);
  const lowStockThreshold = Number(body.lowStockThreshold ?? 5);
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : "item";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  if (!name || !sku || !categories.has(category)) {
    throw new Error("Name, SKU, and category are required");
  }
  if (!Number.isInteger(price) || price < 0) throw new Error("Price must be a whole RWF amount");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be a whole number");
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
    throw new Error("Low-stock threshold must be a whole number");
  }

  return {
    name,
    sku,
    category,
    productionStation: stationForCategory(category),
    price,
    stock,
    lowStockThreshold,
    unit,
    description,
    active: body.active !== false,
  };
}

export async function GET(request: Request) {
  if (!(await requireCapability("products.manage"))) {
    return Response.json({ error: "Catalog access is required" }, { status: 403 });
  }
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const category = url.searchParams.get("category") as ItemCategory | null;

  const items = await prisma.item.findMany({
    where: {
      ...(category && categories.has(category) ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  return Response.json({ items });
}

export async function POST(request: Request) {
  const actor = await requireCapability("products.manage");
  if (!actor) {
    return Response.json({ error: "Sign in with catalog access to register products" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const item = await prisma.item.create({ data: parseItemInput(body) });
    await recordAuditEvent({
      actorId: actor.id,
      action: "PRODUCT_CREATED",
      entityType: "Item",
      entityId: item.id,
      metadata: { sku: item.sku, name: item.name, price: item.price, stock: item.stock },
    });
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "That SKU is already registered" }, { status: 409 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to register product" },
      { status: 400 },
    );
  }
}
