import {
  KitchenStatus,
  OrderStatus,
  PaymentMethod,
  ProductionStation,
} from "@prisma/client";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  ChevronRight,
  CircleAlert,
  Clock3,
  PackageOpen,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";

import { formatRWF } from "@/config/business";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KIGALI_OFFSET = "+02:00";
const DAY_IN_MS = 24 * 60 * 60 * 1_000;

const roomStatusStyles = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  OCCUPIED: "bg-amber-50 text-amber-700",
  CLEANING: "bg-sky-50 text-sky-700",
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  ROOM_FOLIO: "Room folio",
  OTHER: "Other",
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(value);
}

function getKigaliDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Kigali",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getKigaliDayStart(value = new Date()) {
  return new Date(`${getKigaliDateKey(value)}T00:00:00${KIGALI_OFFSET}`);
}

function formatCompactRWF(value: number) {
  if (value === 0) return "0";
  return `${new Intl.NumberFormat("en-RW", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)} RWF`;
}

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "Africa/Kigali",
  }).format(value);
}

function formatAction(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-white bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
      </div>
      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-black tracking-[-0.04em] text-forest-950 sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-500">{note}</p>
    </article>
  );
}

export default async function DashboardPage() {
  await connection();
  await requirePageCapability("dashboard.view");

  const now = new Date();
  const todayStart = getKigaliDayStart(now);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_IN_MS);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * DAY_IN_MS);
  const todayKey = getKigaliDateKey(now);

  const [
    rooms,
    items,
    tables,
    activeBookings,
    openOrders,
    todayOrderCount,
    paidOrdersWindow,
    todayItemsSold,
    kitchenQueueCount,
    activeStaffCount,
    recentActivity,
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
    prisma.order.count({ where: { status: OrderStatus.OPEN } }),
    prisma.order.count({
      where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        paidAt: { gte: sevenDaysAgo, lt: tomorrowStart },
      },
      select: {
        paidAt: true,
        total: true,
        amountPaid: true,
        paymentMethod: true,
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        createdAt: { gte: todayStart, lt: tomorrowStart },
        order: { status: OrderStatus.PAID },
      },
      _sum: { quantity: true },
    }),
    prisma.orderItem.count({
      where: {
        station: ProductionStation.KITCHEN_MUCOMA,
        kitchenStatus: { not: KitchenStatus.SERVED },
        order: { status: OrderStatus.OPEN },
      },
    }),
    prisma.user.count({ where: { active: true } }),
    prisma.auditEvent.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { fullName: true } } },
    }),
  ]);

  const availableRooms = rooms.filter((room) => room.status === "AVAILABLE").length;
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED").length;
  const cleaningRooms = rooms.filter((room) => room.status === "CLEANING").length;
  const lowStockItems = items.filter((item) => item.stock <= item.lowStockThreshold);
  const checkoutDueSoon = activeBookings.filter(
    (booking) => booking.expectedCheckoutAt.getTime() <= now.getTime() + 2 * 60 * 60 * 1_000,
  ).length;
  const occupancyRate = rooms.length
    ? Math.round((occupiedRooms / rooms.length) * 100)
    : 0;

  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart.getTime() - (6 - index) * DAY_IN_MS);
    return {
      key: getKigaliDateKey(date),
      label: formatDayLabel(date),
    };
  });
  const revenueByDay = new Map(sevenDays.map((day) => [day.key, 0]));
  for (const order of paidOrdersWindow) {
    if (!order.paidAt) continue;
    const key = getKigaliDateKey(order.paidAt);
    if (revenueByDay.has(key)) {
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.total);
    }
  }

  const todayPaidOrders = paidOrdersWindow.filter(
    (order) => order.paidAt && getKigaliDateKey(order.paidAt) === todayKey,
  );
  const todayRevenue = todayPaidOrders.reduce((sum, order) => sum + order.total, 0);
  const todayItemsSoldCount = todayItemsSold._sum.quantity ?? 0;
  const todayPaymentTotals = new Map<PaymentMethod, number>();
  for (const order of todayPaidOrders) {
    const method = order.paymentMethod ?? PaymentMethod.OTHER;
    todayPaymentTotals.set(method, (todayPaymentTotals.get(method) ?? 0) + order.total);
  }
  const previousRevenue = sevenDays
    .slice(0, 6)
    .reduce((sum, day) => sum + (revenueByDay.get(day.key) ?? 0), 0);
  const revenueDelta = previousRevenue
    ? Math.round(((todayRevenue - previousRevenue) / previousRevenue) * 100)
    : null;
  const maxRevenue = Math.max(...sevenDays.map((day) => revenueByDay.get(day.key) ?? 0), 1);
  const averagePaidOrder = todayPaidOrders.length
    ? Math.round(todayRevenue / todayPaidOrders.length)
    : 0;

  const attentionItems = [
    {
      label: "Open orders",
      value: openOrders,
      detail: openOrders ? "Active tabs need attention" : "No active tabs",
      href: "/orders",
      icon: ShoppingCart,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Checkout due soon",
      value: checkoutDueSoon,
      detail: checkoutDueSoon ? "Within the next 2 hours" : "No departures due",
      href: "/rooms",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Kitchen queue",
      value: kitchenQueueCount,
      detail: kitchenQueueCount ? "Tickets waiting for Mucoma" : "Kitchen is clear",
      href: "/kitchen",
      icon: UtensilsCrossed,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Low stock",
      value: lowStockItems.length,
      detail: lowStockItems.length ? "Items need refilling" : "Stock is healthy",
      href: "/inventory",
      icon: PackageOpen,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];
  const attentionCount = attentionItems.reduce((sum, item) => sum + item.value, 0);
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Kigali",
  }).format(now);

  return (
    <div className="space-y-4 pb-28 lg:space-y-5 lg:pb-8">
      <section className="flex flex-col justify-between gap-4 rounded-[22px] border border-white bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-600">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live business view</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{todayLabel}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-forest-950 sm:text-4xl">Owner overview</h1>
          <p className="mt-1.5 text-sm text-slate-500">A clear view of today&apos;s money, operations, and next actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/rooms" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-sm font-bold text-forest-900 transition hover:border-forest-300 hover:bg-forest-50">
            <Plus className="h-4 w-4" />New booking
          </Link>
          <Link href="/pos" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(18,55,42,0.16)] transition hover:bg-forest-800">
            <ShoppingCart className="h-4 w-4" />Start order
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Today&apos;s income" value={formatRWF(todayRevenue)} note={`${todayPaidOrders.length} paid orders`} icon={WalletCards} tone="bg-forest-100 text-forest-800" />
        <MetricCard label="Orders today" value={todayOrderCount.toString()} note={`${openOrders} currently open`} icon={ShoppingCart} tone="bg-sky-100 text-sky-800" />
        <MetricCard label="Average paid order" value={formatRWF(averagePaidOrder)} note={`${todayItemsSoldCount} items sold`} icon={BarChart3} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Rooms occupied" value={`${occupiedRooms} / ${rooms.length}`} note={`${occupancyRate}% occupancy`} icon={BedDouble} tone="bg-violet-100 text-violet-800" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-600"><TrendingUp className="h-3.5 w-3.5" />Revenue performance</div>
              <p className="mt-2 text-xs text-slate-400">Paid sales for the last seven days</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-black tracking-[-0.04em] text-forest-950">{formatRWF(todayRevenue)}</p>
              <p className={`mt-1 flex items-center gap-1 text-[10px] font-extrabold sm:justify-end ${revenueDelta !== null && revenueDelta < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {revenueDelta !== null && revenueDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {revenueDelta === null ? "No previous sales to compare" : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}% vs previous 6 days`}
              </p>
            </div>
          </div>
          <div className="mt-7 flex h-40 items-end gap-2 sm:gap-3">
            {sevenDays.map((day, index) => {
              const value = revenueByDay.get(day.key) ?? 0;
              const height = value ? Math.max((value / maxRevenue) * 100, 8) : 3;
              const isToday = index === sevenDays.length - 1;
              return (
                <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="truncate text-[9px] font-bold text-slate-400">{value ? formatCompactRWF(value) : "—"}</span>
                  <div className="flex h-28 w-full items-end rounded-t-lg bg-slate-50 p-1">
                    <div className={`w-full rounded-md transition-all ${isToday ? "bg-gold-400" : "bg-forest-200"}`} style={{ height: `${height}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold ${isToday ? "text-forest-950" : "text-slate-400"}`}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-600"><CircleAlert className="h-3.5 w-3.5" />Needs attention</div>
              <p className="mt-2 text-xs text-slate-400">Items that may need a decision today</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${attentionCount ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{attentionCount ? `${attentionCount} open` : "All clear"}</span>
          </div>
          <div className="mt-5 space-y-2">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-forest-200 hover:bg-forest-50/50">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-forest-950">{item.label}</p><p className="mt-1 truncate text-[10px] text-slate-400">{item.detail}</p></div>
                <span className="text-lg font-black text-forest-950">{item.value}</span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
              </Link>;
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-forest-950">Payment mix</h2><p className="mt-1 text-[10px] text-slate-400">Today&apos;s paid sales</p></div><WalletCards className="h-4 w-4 text-gold-600" /></div>
          <div className="mt-5 space-y-3">
            {Object.values(PaymentMethod).map((method) => {
              const value = todayPaymentTotals.get(method) ?? 0;
              const percentage = todayRevenue ? Math.round((value / todayRevenue) * 100) : 0;
              return <div key={method}><div className="flex items-center justify-between gap-3 text-[10px] font-bold"><span className="text-slate-600">{paymentLabels[method]}</span><span className="text-slate-400">{percentage ? `${percentage}% · ${formatCompactRWF(value)}` : "—"}</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-forest-700" style={{ width: `${percentage}%` }} /></div></div>;
            })}
          </div>
          {!todayPaidOrders.length && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-[10px] text-slate-400">No payments recorded today.</p>}
        </article>

        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-forest-950">Live operations</h2><p className="mt-1 text-[10px] text-slate-400">Current business state</p></div><Activity className="h-4 w-4 text-gold-600" /></div>
          <div className="mt-4 divide-y divide-slate-100">{[
            { label: "Rooms", value: `${occupiedRooms} / ${rooms.length}`, note: `${availableRooms} available · ${cleaningRooms} cleaning`, icon: BedDouble },
            { label: "Service points", value: tables.toString(), note: "Bar, garden and VIP", icon: UtensilsCrossed },
            { label: "Kitchen queue", value: kitchenQueueCount.toString(), note: kitchenQueueCount ? "Tickets need service" : "Queue is clear", icon: UtensilsCrossed },
            { label: "Active team", value: activeStaffCount.toString(), note: "Owner-created accounts", icon: Users },
          ].map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-forest-700"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-forest-950">{item.label}</p><p className="mt-1 truncate text-[10px] text-slate-400">{item.note}</p></div><span className="text-sm font-black text-forest-950">{item.value}</span></div>; })}</div>
        </article>

        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-forest-950">Recent activity</h2><p className="mt-1 text-[10px] text-slate-400">Latest audited actions</p></div><Link href="/activity" className="text-[10px] font-extrabold text-forest-700 hover:text-forest-950">View all</Link></div>
          <div className="mt-4 space-y-3">{recentActivity.length ? recentActivity.map((event) => <div key={event.id} className="flex items-start gap-2.5"><div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Activity className="h-3 w-3" /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-extrabold text-forest-950">{formatAction(event.action)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{event.actor?.fullName ?? "System"} · {formatTime(event.createdAt)}</p></div></div>) : <p className="py-5 text-center text-xs text-slate-400">No recent activity.</p>}</div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-forest-950">Room status</h2><p className="mt-1 text-[10px] text-slate-400">A quick view of accommodation</p></div><Link href="/rooms" className="flex items-center gap-1 text-[10px] font-extrabold text-forest-700">Manage rooms<ChevronRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{rooms.slice(0, 4).map((room) => { const booking = room.bookings[0]; return <Link href="/rooms" key={room.id} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-forest-200 hover:bg-forest-50/40"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${room.status === "OCCUPIED" ? "bg-amber-50 text-amber-700" : room.status === "CLEANING" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{room.number.replace("Room ", "")}</div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-forest-950">Room {room.number}</p><p className="mt-1 truncate text-[10px] text-slate-400">{booking?.guestName ?? `${room.capacity} guests`}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${roomStatusStyles[room.status]}`}>{room.status}</span><ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-forest-600" /></Link>; })}</div>
        </article>

        <article className="rounded-[22px] border border-white bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-forest-950">Arrivals &amp; departures</h2><p className="mt-1 text-[10px] text-slate-400">Guests with the nearest checkout</p></div><Clock3 className="h-4 w-4 text-gold-600" /></div>
          <div className="mt-4 space-y-2">{activeBookings.length ? activeBookings.slice(0, 4).map((booking) => <Link href="/rooms" key={booking.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-forest-50"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[10px] font-black text-forest-800">{booking.room.number.replace("Room ", "")}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-forest-950">{booking.guestName}</p><p className="mt-1 truncate text-[10px] text-slate-400">{booking.bookingCode}</p></div><div className="text-right"><p className="text-[10px] font-extrabold text-forest-950">{formatTime(booking.expectedCheckoutAt)}</p><p className="mt-1 text-[9px] text-slate-400">Checkout</p></div></Link>) : <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">No active guest stays.</p>}</div>
        </article>
      </section>
    </div>
  );
}
