"use client";

import {
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Hotel,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { formatRWF } from "@/config/business";
import type { RoomStatus, RoomSummary } from "@/types/hospitality";

const filters: Array<"ALL" | RoomStatus> = [
  "ALL",
  "AVAILABLE",
  "OCCUPIED",
  "CLEANING",
];

const statusConfig = {
  AVAILABLE: {
    label: "Available",
    card: "border-emerald-200/70 hover:border-emerald-300",
    badge: "bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-50 text-emerald-700",
  },
  OCCUPIED: {
    label: "Occupied",
    card: "border-amber-200/70 hover:border-amber-300",
    badge: "bg-amber-50 text-amber-700",
    icon: "bg-amber-50 text-amber-700",
  },
  CLEANING: {
    label: "Cleaning",
    card: "border-sky-200/70 hover:border-sky-300",
    badge: "bg-sky-50 text-sky-700",
    icon: "bg-sky-50 text-sky-700",
  },
};

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(new Date(value));
}

function BookingModal({
  room,
  onClose,
}: {
  room: RoomSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rentalType, setRentalType] = useState<"HOURLY" | "DAILY">("HOURLY");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          guestName: formData.get("guestName"),
          guestPhone: formData.get("guestPhone"),
          rentalType,
          numberOfUnits: Number(formData.get("numberOfUnits")),
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to check in guest");
      }

      onClose();
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to check in guest",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const rate = rentalType === "HOURLY" ? room.hourlyRate : room.dailyRate;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-forest-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close booking form"
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-100 text-sm font-black text-forest-900">
              {room.number.replace("Room ", "")}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold-600">
                New check-in
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-forest-950">{room.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setRentalType("HOURLY")}
              className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                rentalType === "HOURLY"
                  ? "bg-white text-forest-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Hourly · 2 hrs
            </button>
            <button
              type="button"
              onClick={() => setRentalType("DAILY")}
              className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                rentalType === "DAILY"
                  ? "bg-white text-forest-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Daily
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Guest name</span>
            <input
              name="guestName"
              required
              autoFocus
              placeholder="e.g. Jean Pierre Nshimiyimana"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Phone number</span>
            <input
              name="guestPhone"
              type="tel"
              required
              placeholder="+250 78X XXX XXX"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              {rentalType === "HOURLY" ? "Number of 2-hour blocks" : "Number of nights"}
            </span>
            <input
              name="numberOfUnits"
              type="number"
              min="1"
              max="30"
              defaultValue="1"
              required
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            />
          </label>

          <div className="flex items-center justify-between rounded-2xl bg-forest-50 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-700/60">
                Rate
              </p>
              <p className="mt-1 text-sm font-extrabold text-forest-950">
                {formatRWF(rate)} {rentalType === "HOURLY" ? "/ 2 hours" : "/ night"}
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-gold-600" />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(18,55,42,0.2)] transition hover:bg-forest-800 disabled:opacity-60"
          >
            {isSubmitting ? "Checking in..." : `Check in to ${room.number}`}
            {!isSubmitting && <ChevronRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function RoomDetails({ room, onClose }: { room: RoomSummary; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-forest-950/45 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close room details" />
      <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-600">
              Room details
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-forest-950">{room.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`mt-6 rounded-2xl p-4 ${statusConfig[room.status].badge}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider">{room.status}</span>
            <span className="text-xs font-bold">{formatRWF(room.dailyRate)} / night</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 p-4">
            <Clock3 className="h-4 w-4 text-forest-600" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hourly</p>
            <p className="mt-1 text-sm font-extrabold text-forest-950">{formatRWF(room.hourlyRate)} / 2 hrs</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4">
            <Users className="h-4 w-4 text-forest-600" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity</p>
            <p className="mt-1 text-sm font-extrabold text-forest-950">Up to {room.capacity} guests</p>
          </div>
        </div>

        <section className="mt-7">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Amenities</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {room.amenities.split(",").filter(Boolean).map((amenity) => (
              <span key={amenity} className="rounded-full bg-forest-50 px-3 py-1.5 text-[11px] font-bold text-forest-800">
                {amenity.trim()}
              </span>
            ))}
          </div>
        </section>

        {room.activeBooking && (
          <section className="mt-7 rounded-[22px] bg-forest-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/8">
                <UserRound className="h-5 w-5 text-gold-300" />
              </div>
              <span className="rounded-full bg-white/8 px-3 py-1.5 text-[9px] font-extrabold text-white/60">
                {room.activeBooking.bookingCode}
              </span>
            </div>
            <h3 className="mt-5 text-base font-extrabold">{room.activeBooking.guestName}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
              <Phone className="h-3.5 w-3.5" />
              {room.activeBooking.guestPhone}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Checked in</p>
                <p className="mt-1 font-bold">{formatStayDate(room.activeBooking.checkedInAt)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Expected out</p>
                <p className="mt-1 font-bold">{formatStayDate(room.activeBooking.expectedCheckoutAt)}</p>
              </div>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

export function RoomDashboard({ rooms }: { rooms: RoomSummary[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [bookingRoom, setBookingRoom] = useState<RoomSummary | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);

  const counts = useMemo(
    () => ({
      ALL: rooms.length,
      AVAILABLE: rooms.filter((room) => room.status === "AVAILABLE").length,
      OCCUPIED: rooms.filter((room) => room.status === "OCCUPIED").length,
      CLEANING: rooms.filter((room) => room.status === "CLEANING").length,
    }),
    [rooms],
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesStatus = filter === "ALL" || room.status === filter;
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        room.number.toLowerCase().includes(normalizedQuery) ||
        room.name.toLowerCase().includes(normalizedQuery) ||
        room.activeBooking?.guestName.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, query, rooms]);

  return (
    <div className="space-y-6 pb-24 lg:space-y-7 lg:pb-0">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Accommodation</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">
            Room management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Check guests in, monitor availability, and manage room readiness.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const firstAvailable = rooms.find((room) => room.status === "AVAILABLE");
            if (firstAvailable) setBookingRoom(firstAvailable);
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(18,55,42,0.18)]"
        >
          <Plus className="h-4 w-4" />
          New booking
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "All rooms", value: counts.ALL, icon: Hotel, tone: "bg-forest-100 text-forest-800" },
          { label: "Available", value: counts.AVAILABLE, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Occupied", value: counts.OCCUPIED, icon: BedDouble, tone: "bg-amber-50 text-amber-700" },
          { label: "Cleaning", value: counts.CLEANING, icon: Wrench, tone: "bg-sky-50 text-sky-700" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-soft">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight text-forest-950">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[26px] border border-white bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {filters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  filter === status
                    ? "bg-forest-900 text-white"
                    : "bg-slate-50 text-slate-500 hover:bg-forest-50 hover:text-forest-900"
                }`}
              >
                {status === "ALL" ? "All rooms" : statusConfig[status].label}
                <span className={`ml-2 ${filter === status ? "text-white/55" : "text-slate-300"}`}>{counts[status]}</span>
              </button>
            ))}
          </div>
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search room or guest"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-forest-400 focus:bg-white focus:ring-4 focus:ring-forest-100"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const status = statusConfig[room.status];
            const StatusIcon =
              room.status === "AVAILABLE"
                ? DoorOpen
                : room.status === "OCCUPIED"
                  ? BedDouble
                  : Wrench;

            return (
              <article
                key={room.id}
                className={`group rounded-[22px] border bg-white p-4 transition ${status.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${status.icon}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight text-forest-950">{room.number}</h2>
                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                        {room.type === "VIP" ? "VIP room" : "Standard room"}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${status.badge}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 min-h-[66px] rounded-2xl bg-slate-50 p-3.5">
                  {room.activeBooking ? (
                    <>
                      <p className="truncate text-xs font-extrabold text-forest-950">{room.activeBooking.guestName}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <CalendarClock className="h-3 w-3" />
                        Out {formatStayDate(room.activeBooking.expectedCheckoutAt)}
                      </p>
                    </>
                  ) : room.status === "CLEANING" ? (
                    <>
                      <p className="text-xs font-extrabold text-sky-800">Housekeeping in progress</p>
                      <p className="mt-1.5 text-[10px] text-slate-500">Not available for check-in</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-extrabold text-emerald-800">Ready for guests</p>
                      <p className="mt-1.5 text-[10px] text-slate-500">Up to {room.capacity} guests</p>
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-sm font-black text-forest-950">{formatRWF(room.dailyRate)}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Per night</p>
                  </div>
                  {room.status === "AVAILABLE" ? (
                    <button
                      type="button"
                      onClick={() => setBookingRoom(room)}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-forest-900 px-3 text-[10px] font-extrabold text-white transition hover:bg-forest-800"
                    >
                      Check in
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[10px] font-extrabold text-slate-700 transition hover:bg-slate-200"
                    >
                      View stay
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {filteredRooms.length === 0 && (
          <div className="mt-5 rounded-2xl bg-slate-50 py-12 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-600">No rooms match your search</p>
          </div>
        )}
      </section>

      {bookingRoom && <BookingModal room={bookingRoom} onClose={() => setBookingRoom(null)} />}
      {selectedRoom && <RoomDetails room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
    </div>
  );
}
