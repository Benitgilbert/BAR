"use client";

import {
  Banknote,
  BedDouble,
  Beer,
  Check,
  ChefHat,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  GlassWater,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { MobilePosHeader } from "@/components/mobile-pos-header";
import { ThermalReceipt } from "@/components/thermal-receipt";
import { formatRWF } from "@/config/business";
import type {
  CartLine,
  ItemCategory,
  OpenPosOrder,
  OrderType,
  PosBooking,
  PosItem,
  PosTable,
  SettlementReceipt,
  StationTicket,
} from "@/types/hospitality";

const categoryOptions: Array<{
  id: "ALL" | ItemCategory;
  shortLabel: string;
  icon: typeof Beer;
}> = [
  { id: "ALL", shortLabel: "All", icon: Sparkles },
  { id: "BEER", shortLabel: "Beer", icon: Beer },
  { id: "SOFT_DRINK", shortLabel: "Drinks", icon: GlassWater },
  { id: "LIQUOR", shortLabel: "Liquor", icon: Sparkles },
  { id: "FOOD", shortLabel: "Kitchen", icon: Utensils },
];

const categoryStyles: Record<ItemCategory, string> = {
  BEER: "bg-amber-50 text-amber-700",
  LIQUOR: "bg-violet-50 text-violet-700",
  SOFT_DRINK: "bg-sky-50 text-sky-700",
  FOOD: "bg-emerald-50 text-emerald-700",
};

const categoryLabels: Record<ItemCategory, string> = {
  BEER: "Beer",
  LIQUOR: "Liquor",
  SOFT_DRINK: "Soft drink",
  FOOD: "Kitchen",
};

const tableSectionLabels = {
  BAR_COUNTER: "Bar counter",
  GARDEN: "Garden section",
  VIP_LOUNGE: "VIP lounge",
} as const;

type PaymentChoice = "CASH" | "MOMO" | "CARD" | "ROOM_FOLIO";

function timeAgo(value: string | null) {
  if (!value) return "No round sent";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function countItems(order: OpenPosOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function receiptFromOrder(order: OpenPosOrder, proforma: boolean): SettlementReceipt {
  return {
    orderNumber: order.orderNumber,
    destination: order.tableName
      ? `Table ${order.tableName}`
      : order.bookingLabel ?? "Room folio",
    issuedAt: new Date().toISOString(),
    openedAt: order.openedAt,
    lines: order.items.map((item) => ({
      name: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      roundNumber: item.roundNumber,
      station: item.station,
      dispatched: Boolean(item.dispatchedAt),
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    total: Math.max(0, order.subtotal - order.discount),
    amountPaid: proforma ? 0 : order.total,
    changeDue: 0,
    paymentLabel: proforma ? "Proforma · Balance due" : "Paid",
    roundCount: order.roundCount,
  };
}

function ActiveTabs({
  orders,
  onSelect,
}: {
  orders: OpenPosOrder[];
  onSelect: (order: OpenPosOrder) => void;
}) {
  const tableOrders = orders.filter((order) => order.type === "TABLE");

  return (
    <section className="rounded-[24px] border border-white bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-gold-600" />
            <h2 className="text-sm font-extrabold text-forest-950">Active tabs</h2>
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-700">
              {tableOrders.length} open
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            Select a tab to add another round or settle its bill.
          </p>
        </div>
        <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">
          Running bills · RWF
        </span>
      </div>

      {tableOrders.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-400">
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-xs text-slate-500">No open table tabs yet.</p>
        </div>
      ) : (
        <div className="scrollbar-none mt-4 flex gap-3 overflow-x-auto pb-1">
          {tableOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelect(order)}
              className="group min-w-[220px] flex-1 rounded-2xl border border-amber-200/70 bg-amber-50/45 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-forest-950">
                    Table {order.tableName}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-700/65">
                    {order.orderNumber}
                  </p>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/75 text-amber-700">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-slate-500">
                    {countItems(order)} items · {order.roundCount} rounds
                  </p>
                  <p suppressHydrationWarning className="mt-1 text-[10px] text-slate-400">
                    Last round {timeAgo(order.lastRoundAt)}
                  </p>
                </div>
                <p className="text-sm font-black text-forest-950">
                  {formatRWF(Math.max(0, order.subtotal - order.discount))}
                </p>
              </div>
              {order.pendingItemCount > 0 && (
                <p className="mt-3 rounded-lg bg-white/80 px-2 py-1.5 text-[9px] font-extrabold text-amber-700">
                  {order.pendingItemCount} pending items · Send round
                </p>
              )}
              <p className="mt-3 text-[10px] font-extrabold text-forest-700 opacity-0 transition group-hover:opacity-100">
                Add more items →
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SettlementDialog({
  orderType,
  orderNumber,
  subtotal,
  initialDiscount,
  onClose,
  onConfirm,
}: {
  orderType: OrderType;
  orderNumber: string;
  subtotal: number;
  initialDiscount: number;
  onClose: () => void;
  onConfirm: (input: {
    paymentMethod: PaymentChoice;
    amountPaid: number;
    discount: number;
  }) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>("CASH");
  const [discount, setDiscount] = useState(initialDiscount);
  const [amountPaid, setAmountPaid] = useState(Math.max(0, subtotal - initialDiscount));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const total = Math.max(0, subtotal - discount);
  const changeDue = paymentMethod === "CASH" ? Math.max(0, amountPaid - total) : 0;
  const paymentOptions: Array<{ value: PaymentChoice; label: string; icon: typeof Banknote }> = [
    { value: "CASH", label: "Cash", icon: Banknote },
    { value: "MOMO", label: "MTN MoMo / Airtel", icon: Smartphone },
    { value: "CARD", label: "Card", icon: CreditCard },
  ];
  if (orderType === "ROOM") {
    paymentOptions.push({ value: "ROOM_FOLIO", label: "Room folio", icon: BedDouble });
  }

  function updateDiscount(value: number) {
    const nextDiscount = Math.max(0, Math.min(subtotal, Number.isFinite(value) ? value : 0));
    setDiscount(nextDiscount);
    setAmountPaid(Math.max(0, subtotal - nextDiscount));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm({ paymentMethod, amountPaid, discount });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to settle this bill",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-forest-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close settlement" />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-gold-600">
              Final checkout
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-forest-950">
              Settle {orderNumber}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Capture payment and close this tab.</p>
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

        <div className="mt-5 rounded-2xl bg-forest-950 p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
            Amount due
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-gold-300">{formatRWF(total)}</p>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-[10px] text-white/55">
            <span>Subtotal {formatRWF(subtotal)}</span>
            <span>Discount {formatRWF(discount)}</span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
            Payment method
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(option.value);
                    if (option.value === "ROOM_FOLIO") setAmountPaid(0);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-extrabold transition ${
                    paymentMethod === option.value
                      ? "border-forest-300 bg-forest-50 text-forest-900"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {orderType === "TABLE" && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Discount (RWF)
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={(event) => updateDiscount(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Amount paid
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={amountPaid}
                onChange={(event) => setAmountPaid(Math.max(0, Number(event.target.value)))}
                disabled={paymentMethod === "ROOM_FOLIO"}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100 disabled:bg-slate-50"
              />
            </label>
          </div>
        )}

        {paymentMethod === "CASH" && (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-800">Change calculator</span>
              <span className="font-black text-emerald-900">{formatRWF(changeDue)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {[500, 1_000, 5_000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setAmountPaid((current) => current + amount)}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-800 shadow-sm"
                >
                  +{formatRWF(amount)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountPaid(total)}
                className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-800 shadow-sm"
              >
                Exact
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (paymentMethod !== "ROOM_FOLIO" && amountPaid < total)}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-black text-white shadow-[0_12px_26px_rgba(18,55,42,0.2)] transition hover:bg-forest-800 disabled:opacity-50"
        >
          {isSubmitting ? "Settling..." : "Confirm payment & print receipt"}
          {!isSubmitting && <ReceiptText className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function CartPanel({
  cart,
  activeOrder,
  subtotal,
  runningTotal,
  destination,
  notes,
  isSubmitting,
  error,
  onNotesChange,
  onChangeQuantity,
  onRemove,
  onSave,
  onSend,
  onPrint,
  onSettle,
  onPayNow,
}: {
  cart: CartLine[];
  activeOrder: OpenPosOrder | null;
  subtotal: number;
  runningTotal: number;
  destination: string;
  notes: string;
  isSubmitting: boolean;
  error: string;
  onNotesChange: (value: string) => void;
  onChangeQuantity: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
  onSave: () => void;
  onSend: () => void;
  onPrint: () => void;
  onSettle: () => void;
  onPayNow: () => void;
}) {
  const newItemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const existingItemCount = activeOrder ? countItems(activeOrder) : 0;
  const hasPending = Boolean(activeOrder?.pendingItemCount);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-gold-600" />
              <h2 className="text-base font-extrabold text-forest-950">
                {activeOrder ? "Add another round" : "Current order"}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {newItemCount} new {newItemCount === 1 ? "item" : "items"} · {destination}
            </p>
          </div>
          {activeOrder && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold text-amber-700">
              Open tab
            </span>
          )}
        </div>

        {activeOrder && (
          <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/55 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700/70">
                  {activeOrder.orderNumber}
                </p>
                <p className="mt-1 text-xs font-black text-forest-950">
                  {activeOrder.roundCount} rounds served · {existingItemCount} items
                </p>
              </div>
              <p className="text-sm font-black text-forest-950">
                {formatRWF(Math.max(0, activeOrder.subtotal - activeOrder.discount))}
              </p>
            </div>
            {activeOrder.pendingItemCount > 0 && (
              <p className="mt-2 text-[10px] font-bold text-amber-700">
                {activeOrder.pendingItemCount} saved items are waiting for dispatch.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="scrollbar-none flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {activeOrder && activeOrder.items.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
              Already on this tab
            </p>
            {activeOrder.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px]">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-600">
                    R{item.roundNumber} · {item.itemName} × {item.quantity}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-400">
                    {item.dispatchedAt ? item.station : "Pending dispatch"}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-slate-500">{formatRWF(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        )}

        {cart.length === 0 && !activeOrder ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-600">
              <ReceiptText className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-extrabold text-forest-950">Start an order</p>
            <p className="mt-1 max-w-[190px] text-xs leading-5 text-slate-400">
              Tap a menu item, then open a tab or pay instantly.
            </p>
          </div>
        ) : (
          cart.map((line) => (
            <div key={line.item.id} className="rounded-2xl bg-forest-50/70 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-extrabold text-forest-950">{line.item.name}</p>
                    {line.item.productionStation === "KITCHEN_MUCOMA" ? (
                      <ChefHat className="h-3 w-3 shrink-0 text-emerald-600" />
                    ) : (
                      <GlassWater className="h-3 w-3 shrink-0 text-sky-600" />
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {line.item.productionStation === "KITCHEN_MUCOMA" ? "Mucoma" : "Bar"} · {formatRWF(line.item.price)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-black text-forest-950">
                  {formatRWF(line.item.price * line.quantity)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(line.item.id, -1)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                    aria-label={`Remove one ${line.item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-xs font-black text-forest-950">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(line.item.id, 1)}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-forest-100 text-forest-800 transition hover:bg-forest-200"
                    aria-label={`Add one ${line.item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.item.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${line.item.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <label className="block">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
            Round notes · optional
          </span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={2}
            placeholder="e.g. no pili-pili / with pili-pili"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-medium outline-none transition placeholder:text-slate-400 focus:border-forest-400 focus:bg-white focus:ring-4 focus:ring-forest-100"
          />
        </label>

        <div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>New round</span>
            <span>{formatRWF(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Running tab</span>
            <span>{formatRWF(Math.max(0, runningTotal - subtotal))}</span>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
            <span className="font-extrabold text-forest-950">Running total</span>
            <span className="text-xl font-black tracking-tight text-forest-950">{formatRWF(runningTotal)}</span>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[10px] font-semibold leading-4 text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!cart.length || isSubmitting}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-forest-200 bg-forest-50 px-2 text-[10px] font-extrabold text-forest-800 transition hover:bg-forest-100 disabled:opacity-40"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Open Tab / Save
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={(!cart.length && !hasPending) || isSubmitting}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-[10px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Send Round
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={(!cart.length && !activeOrder) || isSubmitting}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Bill / Fagitire
          </button>
          <button
            type="button"
            onClick={onSettle}
            disabled={!activeOrder || Boolean(cart.length) || hasPending || isSubmitting}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 text-[10px] font-extrabold text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Settle Bill
          </button>
        </div>

        <button
          type="button"
          onClick={onPayNow}
          disabled={(!cart.length && !activeOrder) || isSubmitting}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-400 text-sm font-black text-forest-950 shadow-[0_10px_24px_rgba(229,173,61,0.2)] transition hover:bg-gold-300 disabled:opacity-40"
        >
          <Banknote className="h-4 w-4" />
          Pay Now · Instant
        </button>
      </div>
    </div>
  );
}

export function MobilePos({
  items,
  tables,
  bookings,
  openOrders,
}: {
  items: PosItem[];
  tables: PosTable[];
  bookings: PosBooking[];
  openOrders: OpenPosOrder[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<"ALL" | ItemCategory>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [type, setType] = useState<OrderType>("TABLE");
  const [tableId, setTableId] = useState(tables[0]?.id ?? "");
  const [bookingId, setBookingId] = useState(bookings[0]?.id ?? "");
  const [activeOrder, setActiveOrder] = useState<OpenPosOrder | null>(null);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tickets, setTickets] = useState<StationTicket[]>([]);
  const [settlement, setSettlement] = useState<{
    orderId: string;
    orderType: OrderType;
    orderNumber: string;
    subtotal: number;
    discount: number;
    instant: boolean;
  } | null>(null);
  const [receipt, setReceipt] = useState<(SettlementReceipt & { proforma: boolean }) | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "ALL" || item.category === category;
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sku.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, items, query]);

  const selectedTable = tables.find((table) => table.id === tableId);
  const selectedBooking = bookings.find((booking) => booking.id === bookingId);
  const destination =
    type === "TABLE"
      ? selectedTable ? `Table ${selectedTable.name}` : "Choose a table"
      : selectedBooking
        ? `Room ${selectedBooking.roomNumber} · ${selectedBooking.guestName}`
        : "Choose a room";
  const newSubtotal = cart.reduce(
    (total, line) => total + line.item.price * line.quantity,
    0,
  );
  const runningTotal = Math.max(
    0,
    (activeOrder?.subtotal ?? 0) - (activeOrder?.discount ?? 0) + newSubtotal,
  );
  const newItemCount = cart.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function loadOpenOrder(order: OpenPosOrder) {
    setActiveOrder(order);
    setType(order.type);
    setTableId(order.tableId ?? "");
    setBookingId(order.bookingId ?? "");
    setCart([]);
    setNotes("");
    setError("");
    setNotice(`Loaded ${order.tableName ? `Table ${order.tableName}` : order.bookingLabel ?? "open order"}`);
  }

  function selectDestination(nextType: OrderType, value: string) {
    if (nextType === "TABLE") {
      setType(nextType);
      setTableId(value);
      const existing = openOrders.find(
        (order) => order.type === "TABLE" && order.tableId === value,
      );
      if (existing) loadOpenOrder(existing);
      else {
        setActiveOrder(null);
        setCart([]);
        setNotes("");
      }
    } else {
      setType(nextType);
      setBookingId(value);
      const existing = openOrders.find(
        (order) => order.type === "ROOM" && order.bookingId === value,
      );
      if (existing) loadOpenOrder(existing);
      else {
        setActiveOrder(null);
        setCart([]);
        setNotes("");
      }
    }
    setError("");
  }

  function addItem(item: PosItem) {
    if (item.stock < 1) return;
    setCart((currentCart) => {
      const existing = currentCart.find((line) => line.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) return currentCart;
        return currentCart.map((line) =>
          line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...currentCart, { item, quantity: 1 }];
    });
    setError("");
  }

  function changeQuantity(itemId: string, delta: number) {
    setCart((currentCart) =>
      currentCart
        .map((line) => {
          if (line.item.id !== itemId) return line;
          const nextQuantity = Math.max(0, Math.min(line.item.stock, line.quantity + delta));
          return { ...line, quantity: nextQuantity };
        })
        .filter((line) => line.quantity > 0),
    );
    setError("");
  }

  function removeItem(itemId: string) {
    setCart((currentCart) => currentCart.filter((line) => line.item.id !== itemId));
    setError("");
  }

  async function persistOrder(dispatch: boolean) {
    if (!cart.length) {
      throw new Error("Add at least one item before saving a round");
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        orderId: activeOrder?.id ?? null,
        tableId: type === "TABLE" ? tableId : null,
        bookingId: type === "ROOM" ? bookingId : null,
        waiterId: "staff-waiter",
        paymentMethod: "CASH",
        notes: notes.trim() || null,
        dispatch,
        items: cart.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
      }),
    });
    const result = (await response.json()) as {
      order?: OpenPosOrder;
      tickets?: StationTicket[];
      error?: string;
    };
    if (!response.ok || !result.order) {
      throw new Error(result.error || "Unable to save this order");
    }

    setActiveOrder(result.order);
    setCart([]);
    setNotes("");
    setTickets(result.tickets ?? []);
    router.refresh();
    return result.order;
  }

  async function dispatchExistingOrder() {
    if (!activeOrder) throw new Error("Choose an open tab first");
    if (cart.length) return persistOrder(true);

    const response = await fetch(`/api/orders/${activeOrder.id}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null }),
    });
    const result = (await response.json()) as {
      order?: OpenPosOrder;
      tickets?: StationTicket[];
      error?: string;
    };
    if (!response.ok || !result.order) {
      throw new Error(result.error || "Unable to dispatch this round");
    }

    setActiveOrder(result.order);
    setNotes("");
    setTickets(result.tickets ?? []);
    router.refresh();
    return result.order;
  }

  async function saveOrder() {
    setIsSubmitting(true);
    setError("");
    try {
      await persistOrder(false);
      setNotice("Open tab saved. Send the round when the kitchen or bar is ready.");
      setCartOpen(false);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save tab");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendRound() {
    setIsSubmitting(true);
    setError("");
    try {
      await dispatchExistingOrder();
      setNotice("Round dispatched to the bar / Mucoma station.");
      setCartOpen(false);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to dispatch round");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function printBill() {
    setIsSubmitting(true);
    setError("");
    try {
      const order = cart.length ? await persistOrder(false) : activeOrder;
      if (!order) throw new Error("Save an order before printing a bill");
      setReceipt({ ...receiptFromOrder(order, true), proforma: true });
      setCartOpen(false);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to print bill");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function prepareSettlement() {
    let order = activeOrder;
    if (cart.length) {
      order = await persistOrder(true);
    }
    if (!order) {
      throw new Error("Save or dispatch an order before settling");
    }
    if (order.pendingItemCount > 0) {
      throw new Error("Send the pending round before settling");
    }
    setSettlement({
      orderId: order.id,
      orderType: order.type,
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      discount: order.discount,
      instant: true,
    });
  }

  async function beginPayNow() {
    setIsSubmitting(true);
    setError("");
    try {
      await prepareSettlement();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to prepare payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmSettlement(input: {
    paymentMethod: PaymentChoice;
    amountPaid: number;
    discount: number;
  }) {
    if (!settlement) return;
    const response = await fetch(`/api/orders/${settlement.orderId}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_method: input.paymentMethod,
        amount_paid: input.amountPaid,
        discount: input.discount,
      }),
    });
    const result = (await response.json()) as {
      order?: OpenPosOrder;
      receipt?: SettlementReceipt;
      error?: string;
    };
    if (!response.ok || !result.receipt) {
      throw new Error(result.error || "Unable to settle this bill");
    }

    setReceipt({ ...result.receipt, proforma: false });
    setSettlement(null);
    setActiveOrder(null);
    setCart([]);
    setError("");
    router.refresh();
    if (settlement.instant) {
      window.setTimeout(() => window.print(), 250);
    }
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      activeOrder={activeOrder}
      subtotal={newSubtotal}
      runningTotal={runningTotal}
      destination={destination}
      notes={notes}
      isSubmitting={isSubmitting}
      error={error}
      onNotesChange={setNotes}
      onChangeQuantity={changeQuantity}
      onRemove={removeItem}
      onSave={saveOrder}
      onSend={sendRound}
      onPrint={printBill}
      onSettle={beginPayNow}
      onPayNow={beginPayNow}
    />
  );

  return (
    <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
      <MobilePosHeader />
      <ActiveTabs orders={openOrders} onSelect={loadOpenOrder} />

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          <Check className="h-4 w-4" />
          {notice}
        </div>
      )}

      {tickets.length > 0 && (
        <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-emerald-700" />
            <h2 className="text-xs font-extrabold text-emerald-900">Dispatch tickets ready</h2>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <div key={ticket.ticketNumber} className="rounded-xl bg-white/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-extrabold text-forest-950">
                    {ticket.station === "BAR" ? "Bar ticket" : "Mucoma ticket"} · {ticket.ticketNumber}
                  </p>
                  <span className="text-[9px] text-slate-400">{ticket.tableName}</span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-600">
                  {ticket.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                </p>
                {ticket.notes && <p className="mt-1 text-[9px] italic text-slate-500">Note: {ticket.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-gold-600">Order desk</p>
              <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em] text-forest-950 sm:text-2xl">Build an order</h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {items.filter((item) => item.stock > 0).length} available items
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-white p-2 shadow-soft sm:max-w-md">
            <button
              type="button"
              onClick={() => selectDestination("TABLE", tableId)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold transition ${type === "TABLE" ? "bg-forest-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ShoppingBag className="h-4 w-4" />
              Table / Tab
            </button>
            <button
              type="button"
              onClick={() => selectDestination("ROOM", bookingId)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold transition ${type === "ROOM" ? "bg-forest-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <BedDouble className="h-4 w-4" />
              Room folio
            </button>
          </div>

          <div className="rounded-[22px] border border-white bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-forest-950">{type === "TABLE" ? "Choose a service point" : "Choose an active room"}</p>
                <p className="mt-1 text-[10px] text-slate-400">{type === "TABLE" ? "Bar, garden, or VIP lounge" : "Bill directly to a checked-in guest"}</p>
              </div>
              {type === "TABLE" ? <ShoppingBag className="h-4 w-4 text-gold-600" /> : <BedDouble className="h-4 w-4 text-gold-600" />}
            </div>

            <div className="relative mt-4">
              <select
                value={type === "TABLE" ? tableId : bookingId}
                onChange={(event) => selectDestination(type, event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-xs font-bold text-forest-950 outline-none transition focus:border-forest-400 focus:bg-white focus:ring-4 focus:ring-forest-100"
              >
                {type === "TABLE" ? (
                  <>
                    <option value="">Select a table or counter tab</option>
                    {Object.entries(tableSectionLabels).map(([section, label]) => (
                      <optgroup key={section} label={label}>
                        {tables.filter((table) => table.section === section).map((table) => (
                          <option key={table.id} value={table.id}>{table.name} · {table.capacity} seats</option>
                        ))}
                      </optgroup>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="">Select an active room</option>
                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>{booking.roomNumber} · {booking.guestName} · {booking.bookingCode}</option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {type === "ROOM" && bookings.length === 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-semibold text-amber-800">No active room bookings yet. Check a guest in from Rooms first.</p>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Primus, brochettes, SKU..."
              className="h-12 w-full rounded-2xl border border-white bg-white pl-11 pr-4 text-xs font-medium shadow-soft outline-none transition placeholder:text-slate-400 focus:border-forest-300 focus:ring-4 focus:ring-forest-100"
            />
          </div>

          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = category === option.id;
              return (
                <button key={option.id} type="button" onClick={() => setCategory(option.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${isSelected ? "bg-forest-900 text-white shadow-md" : "bg-white text-slate-500 shadow-sm hover:bg-forest-50 hover:text-forest-900"}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {option.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {filteredItems.map((item) => {
              const isLowStock = item.stock <= item.lowStockThreshold;
              const isKitchen = item.productionStation === "KITCHEN_MUCOMA";
              return (
                <button key={item.id} type="button" onClick={() => addItem(item)} disabled={item.stock < 1} className="group relative min-h-[158px] overflow-hidden rounded-[20px] border border-white bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-[0_16px_34px_rgba(18,55,42,0.12)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0">
                  <span className={`inline-flex rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${categoryStyles[item.category]}`}>{categoryLabels[item.category]}</span>
                  <span className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] font-extrabold uppercase ${isKitchen ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
                    {isKitchen ? <ChefHat className="h-2.5 w-2.5" /> : <GlassWater className="h-2.5 w-2.5" />}
                    {isKitchen ? "Mucoma" : "Bar"}
                  </span>
                  <h3 className="mt-4 line-clamp-2 max-w-[75%] text-sm font-extrabold leading-5 text-forest-950">{item.name}</h3>
                  {item.description && <p className="mt-1.5 line-clamp-1 text-[10px] text-slate-400">{item.description}</p>}
                  <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-2">
                    <span className="text-sm font-black text-forest-950">{formatRWF(item.price)}</span>
                    <span className={`text-[9px] font-bold ${isLowStock ? "text-amber-600" : "text-emerald-600"}`}>{item.stock} {item.unit}</span>
                  </div>
                  <span className="absolute bottom-3 right-3 grid h-7 w-7 translate-y-1 place-items-center rounded-lg bg-forest-900 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"><Plus className="h-4 w-4" /></span>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-[22px] border border-white bg-white py-14 text-center shadow-soft"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No menu items found</p><p className="mt-1 text-xs text-slate-400">Try another category or search term.</p></div>
          )}
        </section>

        <aside className="sticky top-[100px] hidden max-h-[calc(100vh-125px)] overflow-hidden rounded-[26px] border border-white bg-white shadow-soft xl:block">{cartPanel}</aside>
      </div>

      {newItemCount > 0 && (
        <div className="fixed inset-x-3 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-forest-950 px-4 py-3 text-white shadow-[0_18px_50px_rgba(9,39,29,0.3)] xl:hidden">
          <button type="button" onClick={() => setCartOpen(true)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-300"><ShoppingBag className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block truncate text-xs font-extrabold">{activeOrder ? `Add to ${destination}` : "View current order"}</span><span className="mt-1 block text-[10px] text-white/50">{newItemCount} new items · {formatRWF(runningTotal)}</span></span>
          </button>
          <span className="shrink-0 text-sm font-black text-gold-300">{formatRWF(runningTotal)}</span>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[55] flex items-end bg-forest-950/55 backdrop-blur-sm xl:hidden">
          <button type="button" className="absolute inset-0" onClick={() => setCartOpen(false)} aria-label="Close order" />
          <div className="relative max-h-[92vh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="flex justify-end px-4 pt-3"><button type="button" onClick={() => setCartOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label="Close order"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[calc(92vh-52px)] overflow-y-auto">{cartPanel}</div>
          </div>
        </div>
      )}

      {settlement && (
        <SettlementDialog
          orderType={settlement.orderType}
          orderNumber={settlement.orderNumber}
          subtotal={settlement.subtotal}
          initialDiscount={settlement.discount}
          onClose={() => setSettlement(null)}
          onConfirm={confirmSettlement}
        />
      )}

      {receipt && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-forest-950/60 p-4 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" onClick={() => setReceipt(null)} aria-label="Close receipt" />
          <div className="relative my-5 w-full max-w-sm">
            <ThermalReceipt
              orderNumber={receipt.orderNumber}
              issuedAt={receipt.issuedAt}
              openedAt={receipt.openedAt}
              destination={receipt.destination}
              lines={receipt.lines}
              subtotal={receipt.subtotal}
              discount={receipt.discount}
              total={receipt.total}
              amountPaid={receipt.amountPaid}
              changeDue={receipt.changeDue}
              paymentLabel={receipt.paymentLabel}
              roundCount={receipt.roundCount}
              proforma={receipt.proforma}
              onClose={() => setReceipt(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
