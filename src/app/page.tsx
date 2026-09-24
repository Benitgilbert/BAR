import { OrderStatus } from "@prisma/client";
import {
  ArrowUpRight,
  BarChart3,
  BedDouble,
  ChevronRight,
  Clock3,
  PackageOpen,
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";

import { requirePageCapability } from "@/lib/auth";
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

function getKigaliDayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Kigali",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const start = new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00+02:00`);

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1_000),
  };
}

export default async function DashboardPage() {
  await connection();
  await requirePageCapability("dashboard.view");

  const { start: todayStart, end: tomorrowStart } = getKigaliDayRange();
  const [
    rooms,
    items,
    tables,
    activeBookings,
    openOrders,
    todayOrderCount,
    todayPaidStats,
    todayItemsSold,
  ] = await Promise.all([
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
    prisma.order.count({
      where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.order.aggregate({
      where: {
        status: OrderStatus.PAID,
        paidAt: { gte: todayStart, lt: tomorrowStart },
      },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.orderItem.aggregate({
      where: {
        createdAt: { gte: todayStart, lt: tomorrowStart },
        order: { status: OrderStatus.PAID },
      },
      _sum: { quantity: true },
    }),
  ]);

  const availableRooms = rooms.filter((room) => room.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED").length;
  const cleaningRooms = rooms.filter((room) => room.status === "CLEANING").length;
  const lowStockItems = items.filter(
    (item) => item.stock <= item.lowStockThreshold,
  );
  const todayRevenue = todayPaidStats._sum.total ?? 0;
  const todayPaidOrders = todayPaidStats._count._all;
  const todayItemsSoldCount = todayItemsSold._sum.quantity ?? 0;
  const averagePaidOrder = todayPaidOrders
    ? Math.round(todayRevenue / todayPaidOrders)
    : 0;
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
      label: "Rooms occupied",
      value: `${occupiedRooms} / ${rooms.length}`,
      note: `${occupancyRate}% occupancy`,
      icon: BedDouble,
      tone: "bg-forest-100 text-forest-800",
    },
    {
      label: "Open orders",
      value: openOrders.toString(),
      note: `${todayOrderCount} orders today`,
      icon: ShoppingCart,
      tone: "bg-sky-100 text-sky-800",
    },
    {
      label: "Available rooms",
      value: availableRooms.toString(),
      note: `${cleaningRooms} cleaning`,
      icon: BedDouble,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Low stock",
      value: lowStockItems.length.toString(),
      note: lowStockItems.length ? "Needs attention" : "Stock is healthy",
      icon: PackageOpen,
      tone: "bg-violet-100 text-violet-800",
    },
  ];

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-600">
            <BarChart3 className="h-3.5 w-3.5" />
            Business overview
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">
            Today at Umugano
          </h1>
          <p className="mt-2 text-sm text-slate-500">{today}</p>
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

      <section className="overflow-hidden rounded-[24px] bg-forest-950 text-white shadow-[0_18px_45px_rgba(9,39,29,0.14)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              <WalletCards className="h-3.5 w-3.5" />
              Today&apos;s income
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {formatRWF(todayRevenue)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {todayPaidOrders} paid order{todayPaidOrders === 1 ? "" : "s"} · Average {formatRWF(averagePaidOrder)}
            </p>
          </div>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-white/10 px-4 text-xs font-extrabold text-white transition hover:bg-white/15 sm:self-auto"
          >
            View orders
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
          <div className="border-r border-white/10 px-5 py-4 sm:px-6">
            <p className="text-xl font-black">{todayOrderCount}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Orders today</p>
          </div>
          <div className="px-5 py-4 sm:border-r sm:border-white/10 sm:px-6">
            <p className="text-xl font-black">{todayPaidOrders}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Paid today</p>
          </div>
          <div className="border-r border-white/10 px-5 py-4 sm:px-6">
            <p className="text-xl font-black">{todayItemsSoldCount}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Items sold</p>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <p className="text-xl font-black">{activeBookings.length}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Active guests</p>
          </div>
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
