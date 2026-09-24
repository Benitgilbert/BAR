import type { Metadata } from "next";
import { connection } from "next/server";

import { InventoryManager } from "@/components/inventory-manager";
import { roleLabels } from "@/lib/permissions";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InventoryItem } from "@/types/hospitality";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage Umugano product catalog, prices, and stock.",
};

export default async function InventoryPage() {
  await connection();
  const user = await requirePageCapability("products.manage");

  const role = user.role;
  const [items] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
    }),
  ]);

  const inventoryItems: InventoryItem[] = items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description,
    category: item.category,
    productionStation: item.productionStation,
    price: item.price,
    stock: item.stock,
    lowStockThreshold: item.lowStockThreshold,
    unit: item.unit,
    active: item.active,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <InventoryManager
      initialItems={inventoryItems}
      canManage={user.capabilities.has("products.manage")}
      roleLabel={roleLabels[role]}
    />
  );
}
