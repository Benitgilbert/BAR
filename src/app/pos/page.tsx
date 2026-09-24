import type { Metadata } from "next";
import { connection } from "next/server";

import { MobilePos } from "@/components/mobile-pos";
import { orderDetailsInclude, serializeOrder } from "@/lib/order-service";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OpenPosOrder, PosBooking, PosItem, PosTable } from "@/types/hospitality";

export const metadata: Metadata = {
  title: "Point of Sale",
  description: "Mobile bar and kitchen point of sale for Umugano.",
};

export default async function PosPage() {
  await connection();
  await requirePageCapability("pos.use");

  const [items, tables, bookings, openOrders] = await Promise.all([
    prisma.item.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.table.findMany({
      where: { active: true },
      orderBy: [{ section: "asc" }, { name: "asc" }],
    }),
    prisma.booking.findMany({
      where: { status: "CHECKED_IN" },
      include: { room: true },
      orderBy: { guestName: "asc" },
    }),
    prisma.order.findMany({
      where: { status: "OPEN" },
      include: orderDetailsInclude,
      orderBy: { lastRoundAt: "desc" },
    }),
  ]);

  const posItems: PosItem[] = items.map((item) => ({
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
  }));

  const posTables: PosTable[] = tables.map((table) => ({
    id: table.id,
    name: table.name,
    section: table.section,
    capacity: table.capacity,
  }));

  const posBookings: PosBooking[] = bookings.map((booking) => ({
    id: booking.id,
    bookingCode: booking.bookingCode,
    guestName: booking.guestName,
    roomNumber: booking.room.number,
    settlementStatus: booking.settlementStatus,
  }));

  const posOpenOrders: OpenPosOrder[] = openOrders.map(serializeOrder);

  return (
    <MobilePos
      items={posItems}
      tables={posTables}
      bookings={posBookings}
      openOrders={posOpenOrders}
    />
  );
}
