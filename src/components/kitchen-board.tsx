"use client";

import { Check, ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatRWF } from "@/config/business";
import type { OpenPosOrder } from "@/types/hospitality";

const statuses = [
  { value: "QUEUED", label: "Received" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "SERVED", label: "Served" },
] as const;

export function KitchenBoard({ orders }: { orders: OpenPosOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const kitchenOrders = useMemo(() => orders.filter((order) => order.items.some((item) => item.station === "KITCHEN_MUCOMA" && item.kitchenStatus !== "SERVED")), [orders]);

  async function updateStatus(orderId: string, itemId: string, status: (typeof statuses)[number]["value"]) {
    setBusy(itemId);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/kitchen`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, status }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update ticket");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update ticket");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
      <section className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Production station</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">Mucoma kitchen</h1><p className="mt-2 text-sm text-slate-500">Prepare food orders dispatched by Front Desk.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ChefHat className="h-6 w-6" /></div></section>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p>}
      {kitchenOrders.length === 0 ? <div className="rounded-[26px] border border-white bg-white py-20 text-center shadow-soft"><Check className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-4 text-sm font-extrabold text-forest-950">Kitchen is clear</p><p className="mt-1 text-xs text-slate-400">New Mucoma tickets will appear here.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{kitchenOrders.map((order) => { const items = order.items.filter((item) => item.station === "KITCHEN_MUCOMA" && item.kitchenStatus !== "SERVED"); return <article key={order.id} className="rounded-[26px] border border-white bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-lg font-black text-forest-950">{order.tableName ? `Table ${order.tableName}` : order.bookingLabel}</p><p className="mt-1 text-xs font-semibold text-slate-400">{order.orderNumber} · {items.length} kitchen items</p></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold text-amber-700">{formatRWF(order.subtotal)}</span></div><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-forest-950">{item.quantity}× {item.itemName}</p>{item.notes && <p className="mt-1 text-[10px] italic text-slate-500">{item.notes}</p>}</div><span className="rounded-lg bg-white px-2 py-1 text-[9px] font-extrabold uppercase text-slate-500">{item.kitchenStatus ?? "QUEUED"}</span></div><div className="mt-3 grid grid-cols-4 gap-1.5">{statuses.map((status) => <button key={status.value} type="button" disabled={busy === item.id} onClick={() => updateStatus(order.id, item.id, status.value)} className={`min-h-10 rounded-lg px-1 py-2 text-[9px] font-extrabold transition ${item.kitchenStatus === status.value ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"}`}>{status.label}</button>)}</div></div>)}</div></article>; })}</div>}
    </div>
  );
}
