import {
  ArrowUpRight,
  BedDouble,
  ChevronRight,
  Clock3,
  PackageOpen,
  Plus,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatRWF } from "@/config/business";

const roomStatusStyles = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  OCCUPIED: "bg-amber-50 text-amber-700",
  CLEANING: "bg-sky-50 text-sky-700",
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(value);
}

export default async function DashboardPage() {
  await connection();

  const [rooms, items, tables, activeBookings, openOrders] = await Promise.all([
    prisma.room.findMany({
      orderBy: [{ type: "asc" }, { number: "asc" }],
      include: {
        bookings: {
          where: { status: "CHECKED_IN" },
          orderBy: { checkedInAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.item.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.table.count({ where: { active: true } }),
    prisma.booking.findMany({
      where: { status: "CHECKED_IN" },
      include: { room: true },
      orderBy: { expectedCheckoutAt: "asc" },
    }),
    prisma.order.count({ where: { status: "OPEN" } }),
  ]);

  const availableRooms = rooms.filter((room) => room.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED").length;
  const cleaningRooms = rooms.filter((room) => room.status === "CLEANING").length;
  const lowStockItems = items.filter(
    (item) => item.stock <= item.lowStockThreshold,
  );
  const inventoryValue = items.reduce(
    (total, item) => total + item.stock * item.price,
    0,
  );
  const occupancyRate = rooms.length
    ? Math.round((occupiedRooms / rooms.length) * 100)
    : 0;

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Kigali",
  }).format(new Date());

  const metrics = [
    {
      label: "Occupied rooms",
      value: `${occupiedRooms} / ${rooms.length}`,
      note: `${occupancyRate}% occupancy`,
      icon: BedDouble,
      tone: "bg-forest-100 text-forest-800",
    },
    {
      label: "Active guests",
      value: activeBookings.length.toString(),
      note: `${availableRooms} rooms ready`,
      icon: Users,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      label: "Open orders",
      value: openOrders.toString(),
      note: `${tables} service points`,
      icon: ShoppingCart,
      tone: "bg-sky-100 text-sky-800",
    },
    {
      label: "Inventory value",
      value: formatRWF(inventoryValue),
      note: `${lowStockItems.length} low-stock items`,
      icon: PackageOpen,
      tone: "bg-violet-100 text-violet-800",
    },
  ];

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-600">
            <Sparkles className="h-3.5 w-3.5" />
            {today}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">
            Good afternoon, Alice.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Here&apos;s what&apos;s happening at Umugano today.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/rooms"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-sm font-bold text-forest-900 shadow-sm transition hover:border-forest-300"
          >
            <Plus className="h-4 w-4" />
            New booking
          </Link>
          <Link
            href="/pos"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-extrabold text-forest-950 shadow-[0_10px_24px_rgba(229,173,61,0.22)] transition hover:bg-gold-300"
          >
            <ShoppingCart className="h-4 w-4" />
            Start order
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-[22px] border border-white bg-white p-4 shadow-soft sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${metric.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {metric.label}
              </p>
              <p className="mt-1.5 truncate text-xl font-black tracking-[-0.035em] text-forest-950 sm:text-2xl">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <article className="overflow-hidden rounded-[26px] border border-white bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-forest-950">Room overview</h2>
              <p className="mt-1 text-xs text-slate-400">Live accommodation status</p>
            </div>
            <Link
              href="/rooms"
              className="flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-950"
            >
              Manage rooms
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {rooms.map((room) => {
              const activeBooking = room.bookings[0];

              return (
                <div
                  key={room.id}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/65 p-4 transition hover:border-forest-200 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-forest-950">{room.number}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {room.type === "VIP" ? "VIP suite" : "Standard room"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold tracking-wide ${roomStatusStyles[room.status]}`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] text-slate-400">
                        {activeBooking ? activeBooking.guestName : `${room.capacity} guests`}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-600">
                        {activeBooking
                          ? `Out ${formatTime(activeBooking.expectedCheckoutAt)}`
                          : `${formatRWF(room.dailyRate)} / night`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[26px] bg-forest-950 p-5 text-white shadow-[0_20px_50px_rgba(9,39,29,0.16)] sm:p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-gold-300">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-400/12 px-3 py-1.5 text-[10px] font-extrabold text-emerald-300">
                KITCHEN READY
              </span>
            </div>
            <h2 className="mt-6 font-display text-2xl font-semibold">Bar &amp; kitchen</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {items.length} active menu items ready for mobile ordering and table service.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
              <div>
                <p className="text-lg font-black">{items.filter((item) => item.category === "BEER").length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Beers</p>
              </div>
              <div>
                <p className="text-lg font-black">{items.filter((item) => item.category === "FOOD").length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Kitchen</p>
              </div>
              <div>
                <p className="text-lg font-black">{lowStockItems.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Low stock</p>
              </div>
            </div>
            <Link
              href="/inventory"
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-extrabold text-forest-950 transition hover:bg-gold-100"
            >
              <PackageOpen className="h-4 w-4" />
              View inventory
            </Link>
          </article>

          <article className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-forest-950">Arrivals &amp; departures</h2>
              <Clock3 className="h-4 w-4 text-gold-600" />
            </div>
            <div className="mt-4 space-y-3">
              {activeBookings.length ? (
                activeBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-100 text-xs font-black text-forest-800">
                        {booking.room.number.replace("Room ", "")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-forest-950">
                          {booking.guestName}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">{booking.bookingCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-600">
                        {formatTime(booking.expectedCheckoutAt)}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">Checkout</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  No active guest stays.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-forest-950">{availableRooms} available</p>
            <p className="text-[10px] text-slate-400">Ready for walk-ins</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-forest-950">{cleaningRooms} cleaning</p>
            <p className="text-[10px] text-slate-400">Housekeeping queue</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-forest-950">{tables} service points</p>
            <p className="text-[10px] text-slate-400">Bar, garden &amp; VIP lounge</p>
          </div>
        </div>
      </section>
    </div>
  );
}
