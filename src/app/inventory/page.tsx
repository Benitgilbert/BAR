import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  PackageCheck,
  PackageOpen,
  TrendingUp,
} from "lucide-react";
import { connection } from "next/server";

import { formatRWF } from "@/config/business";
import { prisma } from "@/lib/prisma";

const categoryLabels = {
  BEER: "Beer",
  LIQUOR: "Liquor",
  SOFT_DRINK: "Soft drink",
  FOOD: "Kitchen",
} as const;

const categoryStyles = {
  BEER: "bg-amber-50 text-amber-700",
  LIQUOR: "bg-violet-50 text-violet-700",
  SOFT_DRINK: "bg-sky-50 text-sky-700",
  FOOD: "bg-emerald-50 text-emerald-700",
} as const;

export default async function InventoryPage() {
  await connection();

  const items = await prisma.item.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const lowStock = items.filter((item) => item.stock <= item.lowStockThreshold);
  const inventoryValue = items.reduce((total, item) => total + item.stock * item.price, 0);
  const totalUnits = items.reduce((total, item) => total + item.stock, 0);

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Stock control</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">
          Bar &amp; kitchen inventory
        </h1>
        <p className="mt-2 text-sm text-slate-500">Monitor RWF menu pricing, stock levels, and reorder signals.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Active SKUs", value: items.length.toString(), icon: Boxes, tone: "bg-forest-100 text-forest-800" },
          { label: "Units on hand", value: totalUnits.toString(), icon: PackageCheck, tone: "bg-sky-50 text-sky-700" },
          { label: "Low stock", value: lowStock.length.toString(), icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
          { label: "Stock value", value: formatRWF(inventoryValue), icon: TrendingUp, tone: "bg-emerald-50 text-emerald-700" },
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
            <h2 className="text-base font-extrabold text-forest-950">Menu stock ledger</h2>
            <p className="mt-1 text-xs text-slate-400">Prices are stored in Rwandan Francs (RWF).</p>
          </div>
          <PackageOpen className="h-5 w-5 text-gold-600" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-5 py-3.5 sm:px-6">Item</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Unit price</th>
                <th className="px-5 py-3.5">On hand</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.stock <= item.lowStockThreshold;
                return (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 sm:px-6">
                      <p className="text-xs font-extrabold text-forest-950">{item.name}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-400">{item.sku}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide ${categoryStyles[item.category]}`}>
                        {categoryLabels[item.category]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-extrabold text-forest-950">{formatRWF(item.price)}</td>
                    <td className="px-5 py-4">
                      <p className={`text-xs font-extrabold ${isLow ? "text-amber-700" : "text-slate-700"}`}>
                        {item.stock} {item.unit}
                      </p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${isLow ? "bg-amber-400" : "bg-forest-500"}`}
                          style={{ width: `${Math.min(100, Math.max(8, (item.stock / Math.max(item.lowStockThreshold * 3, 1)) * 100))}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${isLow ? "text-amber-700" : "text-emerald-700"}`}>
                        {isLow ? "Reorder" : "Healthy"}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
