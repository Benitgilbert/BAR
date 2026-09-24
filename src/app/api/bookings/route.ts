import { RentalType } from "@prisma/client";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BookingRequest {
  roomId?: string;
  guestName?: string;
  guestPhone?: string;
  rentalType?: RentalType;
  numberOfUnits?: number;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to create booking";
}

export async function POST(request: Request) {
  const actor = await requireCapability("rooms.manage");
  if (!actor) {
    return Response.json({ error: "Rooms access is required" }, { status: 403 });
  }

  let body: BookingRequest;

  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const guestName = body.guestName?.trim();
  const guestPhone = body.guestPhone?.trim();
  const numberOfUnits = Number(body.numberOfUnits ?? 1);

  if (!body.roomId || !guestName || !guestPhone) {
    return Response.json(
      { error: "Room, guest name, and guest phone are required" },
      { status: 400 },
    );
  }

  if (!Object.values(RentalType).includes(body.rentalType as RentalType)) {
    return Response.json({ error: "Invalid rental type" }, { status: 400 });
  }

  if (!Number.isInteger(numberOfUnits) || numberOfUnits < 1 || numberOfUnits > 30) {
    return Response.json(
      { error: "Rental duration must be between 1 and 30" },
      { status: 400 },
    );
  }

  try {
    const booking = await prisma.$transaction(async (transaction) => {
      const room = await transaction.room.findUnique({
        where: { id: body.roomId },
      });

      if (!room) {
        throw new Error("Room not found");
      }

      if (room.status !== "AVAILABLE") {
        throw new Error("Room is no longer available");
      }

      const rentalType = body.rentalType as RentalType;
      const hours = rentalType === RentalType.HOURLY ? 2 * numberOfUnits : 24 * numberOfUnits;
      const checkedInAt = new Date();
      const expectedCheckoutAt = new Date(checkedInAt.getTime() + hours * 60 * 60 * 1_000);
      const bookingCode = `UMG-${room.number.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()
        .toString()
        .slice(-6)}`;

      const createdBooking = await transaction.booking.create({
        data: {
          bookingCode,
          roomId: room.id,
          guestName,
          guestPhone,
          rentalType,
          rateAmount: rentalType === RentalType.HOURLY ? room.hourlyRate : room.dailyRate,
          numberOfUnits,
          status: "CHECKED_IN",
          checkedInAt,
          expectedCheckoutAt,
          createdById: actor.id,
        },
      });

      await transaction.room.update({
        where: { id: room.id },
        data: { status: "OCCUPIED" },
      });
      await recordAuditEvent({ actorId: actor.id, action: "BOOKING_CREATED", entityType: "Booking", entityId: createdBooking.id, metadata: { bookingCode, room: room.number, guestName, rentalType } }, transaction);

      return createdBooking;
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 409 });
  }
}
