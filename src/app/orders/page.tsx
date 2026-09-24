import {
  ArrowUpRight,
  Banknote,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";

import { formatRWF } from "@/config/business";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(value);
}

const orderStatusStyles = {
  PAID: "bg-emerald-50 text-emerald-700",
  OPEN: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default async function OrdersPage() {
  await connection();
  await requirePageCapability("dashboard.view");

  const orders = await prisma.order.findMany({
    include: {
      items: true,
      table: true,
      booking: { include: { room: true } },
      cashier: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const paidOrders = orders.filter((order) => order.status === "PAID");
  const openOrders = orders.filter((order) => order.status === "OPEN");
  const revenue = paidOrders.reduce((total, order) => total + order.total, 0);
  const servedRounds = orders.reduce((total, order) => total + order.roundCount, 0);
  const openValue = openOrders.reduce(
    (total, order) => total + Math.max(0, order.subtotal - order.discount),
    0,
  );

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Sales ledger</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">
            Orders &amp; billing
          </h1>
          <p className="mt-2 text-sm text-slate-500">Track table orders, room charges, and settlement status.</p>
        </div>
        <Link
          href="/pos"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-extrabold text-forest-950 shadow-[0_10px_24px_rgba(229,173,61,0.2)]"
        >
          <ShoppingCart className="h-4 w-4" />
          New order
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total orders", value: orders.length.toString(), icon: FileText, tone: "bg-forest-100 text-forest-800" },
          { label: "Paid revenue", value: formatRWF(revenue), icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Open tab value", value: formatRWF(openValue), icon: Clock3, tone: "bg-amber-50 text-amber-700" },
          { label: "Rounds served", value: servedRounds.toString(), icon: CircleCheck, tone: "bg-sky-50 text-sky-700" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-[22px] border border-white bg-white p-4 shadow-soft sm:p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 truncate text-xl font-black tracking-tight text-forest-950">{stat.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[26px] border border-white bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-extrabold text-forest-950">Recent orders</h2>
            <p className="mt-1 text-xs text-slate-400">Every order is timestamped in Rwanda time.</p>
          </div>
          <span className="rounded-full bg-forest-50 px-3 py-1.5 text-[10px] font-extrabold text-forest-800">
            {orders.length} records
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-600">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-extrabold text-forest-950">No orders yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
              Start from the mobile POS and your table sales will appear here.
            </p>
            <Link href="/pos" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-forest-700">
              Open point of sale <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 sm:px-6">Order</th>
                  <th className="px-5 py-3.5">Destination</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Rounds</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const destination =
                    order.type === "TABLE"
                      ? order.table?.name ?? "Table order"
                      : order.booking?.room.number ?? "Room charge";
                  return (
                    <tr key={order.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="text-xs font-extrabold text-forest-950">{order.orderNumber}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-700">{destination}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {order.type === "ROOM" ? "Room charge" : order.cashier?.fullName ?? "Cashier"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-700">{order.items.length} line items</p>
                        <p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400">
                          {order.items.map((item) => item.itemName).join(", ")}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-extrabold text-slate-700">{order.roundCount} rounds</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {order.lastRoundAt ? `Last ${formatDate(order.lastRoundAt)}` : "Not dispatched"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide ${orderStatusStyles[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-black text-forest-950">{formatRWF(Math.max(0, order.subtotal - order.discount))}</p>
                        {order.status === "OPEN" ? (
                          <Link href="/pos" className="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-700">
                            Open tab <ChevronRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <p className="mt-1 text-[9px] text-slate-400">{order.amountPaid ? `Paid ${formatRWF(order.amountPaid)}` : "No payment"}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
