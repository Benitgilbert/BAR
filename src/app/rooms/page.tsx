import type { Metadata } from "next";
import { connection } from "next/server";

import { RoomDashboard } from "@/components/room-dashboard";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoomSummary } from "@/types/hospitality";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Manage Umugano guest house rooms and bookings.",
};

export default async function RoomsPage() {
  await connection();
  await requirePageCapability("rooms.manage");

  const rooms = await prisma.room.findMany({
    orderBy: [{ type: "asc" }, { number: "asc" }],
    include: {
      bookings: {
        where: { status: "CHECKED_IN" },
        orderBy: { checkedInAt: "desc" },
        take: 1,
      },
    },
  });

  const roomData: RoomSummary[] = rooms.map((room) => {
    const activeBooking = room.bookings[0];

    return {
      id: room.id,
      number: room.number,
      name: room.name,
      type: room.type,
      hourlyRate: room.hourlyRate,
      dailyRate: room.dailyRate,
      minimumHours: room.minimumHours,
      capacity: room.capacity,
      status: room.status,
      amenities: room.amenities,
      notes: room.notes,
      activeBooking: activeBooking
        ? {
            bookingCode: activeBooking.bookingCode,
            guestName: activeBooking.guestName,
            guestPhone: activeBooking.guestPhone,
            rentalType: activeBooking.rentalType,
            checkedInAt: activeBooking.checkedInAt.toISOString(),
            expectedCheckoutAt: activeBooking.expectedCheckoutAt.toISOString(),
            settlementStatus: activeBooking.settlementStatus,
          }
        : null,
    };
  });

  return <RoomDashboard rooms={roomData} />;
}
