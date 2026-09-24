"use client";

import {
  Archive,
  ArrowDownUp,
  Boxes,
  Check,
  ChevronDown,
  ClipboardCheck,
  Edit3,
  Filter,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { formatRWF } from "@/config/business";
import type { InventoryItem, ItemCategory, ProductionStation } from "@/types/hospitality";

const categories: Array<{ value: ItemCategory; label: string }> = [
  { value: "BEER", label: "Beer" },
  { value: "LIQUOR", label: "Liquor" },
  { value: "SOFT_DRINK", label: "Soft drink" },
  { value: "FOOD", label: "Kitchen / Mucoma" },
];

const categoryLabels = Object.fromEntries(categories.map((item) => [item.value, item.label])) as Record<
  ItemCategory,
  string
>;

const categoryStyles: Record<ItemCategory, string> = {
  BEER: "bg-amber-50 text-amber-700",
  LIQUOR: "bg-violet-50 text-violet-700",
  SOFT_DRINK: "bg-sky-50 text-sky-700",
  FOOD: "bg-emerald-50 text-emerald-700",
};

function stationForCategory(category: ItemCategory): ProductionStation {
  return category === "FOOD" ? "KITCHEN_MUCOMA" : "BAR";
}

function normalizeItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}

function ProductEditor({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: (item: InventoryItem, message: string) => void;
}) {
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? "BEER");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      sku: formData.get("sku"),
      description: formData.get("description"),
      category,
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      lowStockThreshold: Number(formData.get("lowStockThreshold")),
      unit: formData.get("unit"),
      active: formData.get("active") === "on",
    };

    try {
      const response = await fetch(item ? `/api/items/${item.id}` : "/api/items", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { item?: InventoryItem; error?: string };
      if (!response.ok || !result.item) {
        throw new Error(result.error || "Unable to save product");
      }
      onSaved(normalizeItem(result.item), item ? "Product updated" : "Product registered");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save product");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-forest-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close product form" />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-gold-600">Product catalog</p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-forest-950">
              {item ? "Edit product" : "Register product"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Price and stock are saved in RWF.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">Product name</span>
            <input name="name" required defaultValue={item?.name} placeholder="e.g. Primus" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">SKU</span>
            <input name="sku" required defaultValue={item?.sku} placeholder="BEER-007" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm uppercase outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Category</span>
            <div className="relative mt-2">
              <select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-semibold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100">
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">Description</span>
            <input name="description" defaultValue={item?.description ?? ""} placeholder="Optional product details" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Unit price (RWF)</span>
            <input name="price" type="number" min="0" required defaultValue={item?.price ?? 0} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Unit</span>
            <input name="unit" required defaultValue={item?.unit ?? "item"} placeholder="bottle, plate, shot" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Opening stock</span>
            <input name="stock" type="number" min="0" required defaultValue={item?.stock ?? 0} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Low-stock alert</span>
            <input name="lowStockThreshold" type="number" min="0" required defaultValue={item?.lowStockThreshold ?? 5} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-forest-50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-forest-900">
            <ShieldCheck className="h-4 w-4" />
            Production station: {stationForCategory(category) === "BAR" ? "Bar" : "Mucoma"}
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input name="active" type="checkbox" defaultChecked={item?.active ?? true} className="h-4 w-4 accent-forest-700" />
            Active
          </label>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-black text-white shadow-lg disabled:opacity-50">
            {isSaving ? "Saving..." : item ? "Save changes" : "Register product"}
            {!isSaving && <Check className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function StockMovementDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: (item: InventoryItem, message: string) => void;
}) {
  const [type, setType] = useState<"REFILL" | "WASTE" | "ADJUSTMENT">("REFILL");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, type, quantity, notes }) });
      const result = (await response.json()) as { movement?: { itemId: string; stockAfter: number; type: string; quantity: number }; error?: string };
      if (!response.ok || !result.movement) throw new Error(result.error || "Unable to record stock movement");
      onSaved({ ...item, stock: result.movement.stockAfter }, `${item.name} ${type.toLowerCase()} recorded`);
    } catch (movementError) {
      setError(movementError instanceof Error ? movementError.message : "Unable to record movement");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[60] grid place-items-end bg-forest-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"><button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close stock movement" /><form onSubmit={submit} className="relative w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold-600">Stock movement</p><h2 className="mt-1.5 text-xl font-black text-forest-950">{item.name}</h2><p className="mt-1 text-xs text-slate-400">Current: {item.stock} {item.unit}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-5 grid grid-cols-3 gap-2">{(["REFILL", "WASTE", "ADJUSTMENT"] as const).map((option) => <button key={option} type="button" onClick={() => setType(option)} className={`rounded-xl border px-2 py-3 text-[10px] font-extrabold ${type === option ? "border-forest-300 bg-forest-50 text-forest-900" : "border-slate-200 text-slate-500"}`}>{option === "REFILL" ? "Refill" : option === "WASTE" ? "Waste" : "Adjust"}</button>)}</div><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Quantity {type === "ADJUSTMENT" ? "(use negative to reduce)" : ""}</span><input type="number" min={type === "ADJUSTMENT" ? undefined : 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Reason / supplier</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></label>{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</p>}<button type="submit" disabled={saving || !quantity} className="mt-5 h-12 w-full rounded-xl bg-forest-900 text-sm font-black text-white disabled:opacity-50">{saving ? "Recording..." : "Record movement"}</button></form></div>;
}

function StocktakeDialog({
  items,
  onClose,
  onComplete,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onComplete: (items: InventoryItem[]) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.id, item.stock])));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/stocktakes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes, lines: items.map((item) => ({ itemId: item.id, countedQuantity: counts[item.id] })) }) });
      const result = (await response.json()) as { items?: InventoryItem[]; error?: string };
      if (!response.ok || !result.items) throw new Error(result.error || "Unable to complete stocktake");
      onComplete(result.items);
    } catch (stocktakeError) {
      setError(stocktakeError instanceof Error ? stocktakeError.message : "Unable to complete stocktake");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[60] grid place-items-end bg-forest-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"><button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close stocktake" /><form onSubmit={submit} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold-600">Physical count</p><h2 className="mt-1.5 text-xl font-black text-forest-950">Run stocktake</h2><p className="mt-1 text-xs text-slate-400">Enter what is physically on hand.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-2">{items.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="min-w-0 text-xs font-bold text-forest-950">{item.name}<span className="ml-2 text-[10px] font-medium text-slate-400">System: {item.stock}</span></span><input type="number" min="0" value={counts[item.id]} onChange={(event) => setCounts((current) => ({ ...current, [item.id]: Number(event.target.value) }))} className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-right text-sm font-bold outline-none focus:border-forest-400" /></label>)}</div><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Notes</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional stocktake note" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-forest-400" /></label>{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</p>}<button type="submit" disabled={saving} className="mt-5 h-12 w-full rounded-xl bg-forest-900 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving count..." : "Complete stocktake"}</button></form></div>;
}

export function InventoryManager({
  initialItems,
  canManage,
  roleLabel,
}: {
  initialItems: InventoryItem[];
  canManage: boolean;
  roleLabel: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"ALL" | ItemCategory>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState<{ item: InventoryItem | null } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stocktakeOpen, setStocktakeOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "ALL" || item.category === category;
      const matchesStatus = showArchived || item.active;
      const matchesQuery = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.sku.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [category, items, query, showArchived]);

  const activeItems = items.filter((item) => item.active);
  const lowStock = activeItems.filter((item) => item.stock <= item.lowStockThreshold);
  const totalUnits = activeItems.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = activeItems.reduce((sum, item) => sum + item.stock * item.price, 0);

  function updateItem(updated: InventoryItem, message: string) {
    setItems((current) => current.some((item) => item.id === updated.id) ? current.map((item) => item.id === updated.id ? updated : item) : [updated, ...current]);
    setNotice(message);
    router.refresh();
  }

  async function adjustStock(item: InventoryItem, delta: number) {
    if (!canManage) return;
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, type: "ADJUSTMENT", quantity: delta, notes: "Quick inventory adjustment" }) });
      const result = (await response.json()) as { movement?: { itemId: string; stockAfter: number }; error?: string };
      if (!response.ok || !result.movement) throw new Error(result.error || "Unable to adjust stock");
      updateItem({ ...item, stock: result.movement.stockAfter }, `${item.name} stock updated`);
    } catch (adjustmentError) {
      setError(adjustmentError instanceof Error ? adjustmentError.message : "Unable to adjust stock");
    } finally {
      setBusyId("");
    }
  }

  async function toggleActive(item: InventoryItem) {
    if (!canManage) return;
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) });
      const result = (await response.json()) as { item?: InventoryItem; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error || "Unable to update product");
      updateItem(normalizeItem(result.item), item.active ? `${item.name} archived` : `${item.name} restored`);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update product");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Stock control · {roleLabel}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">Bar &amp; kitchen inventory</h1>
          <p className="mt-2 text-sm text-slate-500">Register products, update prices, and keep stock ready for service.</p>
        </div>
        {canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setStocktakeOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-sm font-extrabold text-forest-800"><ClipboardCheck className="h-4 w-4" />Stocktake</button><button type="button" onClick={() => setEditor({ item: null })} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(18,55,42,0.18)]"><Plus className="h-4 w-4" />Register product</button></div>}
      </section>

      {!canManage && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">Mucoma has kitchen-ticket access only. Product registration, pricing, and stock edits are reserved for Owner, Receptionist, or Waiter.</div>}
      {notice && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Active SKUs", value: activeItems.length.toString(), icon: Boxes, tone: "bg-forest-100 text-forest-800" },
          { label: "Units on hand", value: totalUnits.toString(), icon: PackageCheck, tone: "bg-sky-50 text-sky-700" },
          { label: "Low stock", value: lowStock.length.toString(), icon: Filter, tone: "bg-amber-50 text-amber-700" },
          { label: "Stock value", value: formatRWF(inventoryValue), icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" },
        ].map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-[22px] border border-white bg-white p-4 shadow-soft sm:p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.tone}`}><Icon className="h-5 w-5" /></div><p className="mt-4 truncate text-xl font-black tracking-tight text-forest-950">{stat.value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p></article>; })}
      </section>

      <section className="rounded-[26px] border border-white bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or SKU" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none focus:border-forest-400 focus:bg-white focus:ring-4 focus:ring-forest-100" />
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            <button type="button" onClick={() => setCategory("ALL")} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-extrabold ${category === "ALL" ? "bg-forest-900 text-white" : "bg-slate-50 text-slate-500"}`}>All</button>
            {categories.map((option) => <button key={option.value} type="button" onClick={() => setCategory(option.value)} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-extrabold ${category === option.value ? "bg-forest-900 text-white" : "bg-slate-50 text-slate-500"}`}>{option.label}</button>)}
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4 accent-forest-700" />Show archived</label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const isLow = item.stock <= item.lowStockThreshold;
            return <article key={item.id} className={`rounded-[22px] border p-4 ${item.active ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${categoryStyles[item.category]}`}><PackageCheck className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-sm font-extrabold text-forest-950">{item.name}</h2><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.sku}</p></div></div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{item.active ? "Active" : "Archived"}</span>
              </div>
              <div className="mt-4 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${categoryStyles[item.category]}`}>{categoryLabels[item.category]}</span><span className="text-[10px] font-semibold text-slate-400">{item.productionStation === "BAR" ? "Bar station" : "Mucoma station"}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price</p><p className="mt-1 text-sm font-black text-forest-950">{formatRWF(item.price)}</p></div><div className={`rounded-xl p-3 ${isLow ? "bg-amber-50" : "bg-emerald-50"}`}><p className={`text-[10px] font-bold uppercase tracking-wider ${isLow ? "text-amber-700" : "text-emerald-700"}`}>On hand</p><p className="mt-1 text-sm font-black text-forest-950">{item.stock} <span className="text-[10px] font-bold text-slate-500">{item.unit}</span></p></div></div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className={`text-[10px] font-extrabold ${isLow ? "text-amber-700" : "text-emerald-700"}`}>{isLow ? "Reorder soon" : "Stock healthy"}</span>{canManage && <div className="flex items-center gap-1"><button type="button" disabled={busyId === item.id} onClick={() => setStockItem(item)} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 disabled:opacity-40" aria-label={`Record stock movement for ${item.name}`}><ArrowDownUp className="h-3.5 w-3.5" /></button><button type="button" disabled={busyId === item.id || item.stock < 1} onClick={() => adjustStock(item, -1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40" aria-label={`Reduce ${item.name} stock`}><Minus className="h-3.5 w-3.5" /></button><button type="button" disabled={busyId === item.id} onClick={() => adjustStock(item, 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-forest-50 text-forest-800 disabled:opacity-40" aria-label={`Increase ${item.name} stock`}><Plus className="h-3.5 w-3.5" /></button><button type="button" disabled={busyId === item.id} onClick={() => setEditor({ item })} className="ml-1 grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40" aria-label={`Edit ${item.name}`}><Edit3 className="h-3.5 w-3.5" /></button><button type="button" disabled={busyId === item.id} onClick={() => toggleActive(item)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 disabled:opacity-40" aria-label={item.active ? `Archive ${item.name}` : `Restore ${item.name}`}>{item.active ? <Archive className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</button></div>}</div>
            </article>;
          })}
        </div>
        {filteredItems.length === 0 && <div className="py-14 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No products found</p><p className="mt-1 text-xs text-slate-400">Try another search or register a new product.</p></div>}
      </section>

      {editor && <ProductEditor item={editor.item} onClose={() => setEditor(null)} onSaved={(item, message) => { updateItem(item, message); setEditor(null); }} />}
      {stockItem && <StockMovementDialog item={stockItem} onClose={() => setStockItem(null)} onSaved={(item, message) => { updateItem(item, message); setStockItem(null); }} />}
      {stocktakeOpen && <StocktakeDialog items={activeItems} onClose={() => setStocktakeOpen(false)} onComplete={(updatedItems) => { setItems(updatedItems); setStocktakeOpen(false); setNotice("Stocktake completed"); router.refresh(); }} />}
    </div>
  );
}
