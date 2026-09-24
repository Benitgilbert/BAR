import type { Metadata } from "next";
import { connection } from "next/server";

import { KitchenBoard } from "@/components/kitchen-board";
import { requirePageCapability } from "@/lib/auth";
import { orderDetailsInclude, serializeOrder } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mucoma Kitchen", description: "Prepare Umugano kitchen orders." };

export default async function KitchenPage() {
  await connection();
  await requirePageCapability("kitchen.view");
  const orders = await prisma.order.findMany({ where: { status: "OPEN", items: { some: { station: "KITCHEN_MUCOMA", kitchenStatus: { not: "SERVED" } } } }, include: orderDetailsInclude, orderBy: { lastRoundAt: "asc" } });
  return <KitchenBoard orders={orders.map(serializeOrder)} />;
}
