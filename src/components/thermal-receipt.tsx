"use client";

import { Printer, X } from "lucide-react";

import { BrandMark } from "@/components/brand-logo";
import { businessConfig, formatRWF } from "@/config/business";
import type { ReceiptLine } from "@/types/hospitality";

export type { ReceiptLine } from "@/types/hospitality";

interface ThermalReceiptProps {
  orderNumber: string;
  issuedAt: string;
  openedAt?: string;
  destination: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  changeDue?: number;
  paymentLabel: string;
  roundCount?: number;
  proforma?: boolean;
  onClose?: () => void;
}

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  }).format(new Date(value));
}

export function ThermalReceipt({
  orderNumber,
  issuedAt,
  openedAt,
  destination,
  lines,
  subtotal,
  discount = 0,
  total,
  amountPaid,
  changeDue = 0,
  paymentLabel,
  roundCount = 0,
  proforma = false,
  onClose,
}: ThermalReceiptProps) {
  return (
    <div className="receipt-print mx-auto w-full max-w-[360px] bg-white p-5 text-[#171717] shadow-[0_20px_60px_rgba(15,23,42,0.22)] sm:p-6">
      <div className="receipt-actions mb-4 flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
          {proforma ? "Proforma bill" : "Thermal receipt"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-forest-900 px-3 text-xs font-bold text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"
              aria-label="Close receipt"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <header className="text-center">
        <BrandMark inverse className="mx-auto h-14 w-14" />
        <h2 className="mt-3 text-[15px] font-black tracking-[0.04em]">
          {businessConfig.legalName}
        </h2>
        <p className="mt-1 text-[10px] font-medium">{businessConfig.location}</p>
        <p className="mt-0.5 text-[10px]">Tel: {businessConfig.receipt.phone}</p>
        <p className="text-[10px]">TIN: {businessConfig.receipt.tin}</p>
        <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em]">
          {businessConfig.slogan}
        </p>
      </header>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-3">
          <span>Order</span>
          <span className="font-bold">{orderNumber}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{proforma ? "Printed" : "Paid"}</span>
          <span>{formatReceiptDate(issuedAt)}</span>
        </div>
        {openedAt && (
          <div className="flex justify-between gap-3">
            <span>Opened</span>
            <span>{formatReceiptDate(openedAt)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span>Bill to</span>
          <span className="text-right font-bold">{destination}</span>
        </div>
        {roundCount > 0 && (
          <div className="flex justify-between gap-3">
            <span>Rounds served</span>
            <span className="font-bold">{roundCount}</span>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={`${line.name}-${line.roundNumber ?? 0}-${index}`} className="text-[10px]">
            <div className="flex items-start justify-between gap-3 font-bold">
              <span>{line.name}</span>
              <span>{formatRWF(line.lineTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-slate-500">
              <span>
                {line.roundNumber ? `Round ${line.roundNumber} · ` : ""}
                {line.quantity} × {formatRWF(line.unitPrice)}
              </span>
              <span>
                {line.dispatched === false ? "PENDING" : line.station === "KITCHEN_MUCOMA" ? "MUCOMA" : "BAR"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRWF(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span>-{formatRWF(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatRWF(0)}</span>
        </div>
        <div className="flex items-end justify-between border-t border-slate-300 pt-3 text-base font-black">
          <span>{proforma ? "TOTAL DUE" : "TOTAL PAID"}</span>
          <span>{formatRWF(total)}</span>
        </div>
        {!proforma && amountPaid !== undefined && amountPaid !== total && (
          <div className="flex justify-between text-xs font-bold text-forest-800">
            <span>Amount paid</span>
            <span>{formatRWF(amountPaid)}</span>
          </div>
        )}
        {!proforma && changeDue > 0 && (
          <div className="flex justify-between text-sm font-black text-forest-800">
            <span>Change due</span>
            <span>{formatRWF(changeDue)}</span>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="text-center text-[10px]">
        <p className="font-bold uppercase">{paymentLabel}</p>
        <p className="mt-3 text-[9px]">Prices include all applicable charges.</p>
        <div className="mt-3 rounded-lg border border-slate-200 p-2.5">
          <p className="font-bold uppercase tracking-wider">Mobile Money</p>
          <p className="mt-1 font-black">Merchant: {businessConfig.receipt.momoMerchantCode}</p>
          <p>Phone: {businessConfig.receipt.momoPhone}</p>
        </div>
        <p className="mt-3 font-semibold">{businessConfig.receipt.footer}</p>
        <p className="mt-1 text-slate-500">Murakaza Neza!</p>
        <div className="mt-5 flex justify-center gap-[2px]" aria-hidden="true">
          {Array.from({ length: 34 }, (_, index) => (
            <span
              key={index}
              className="h-5 w-px bg-slate-900"
              style={{ opacity: index % 3 === 0 ? 1 : 0.55 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
