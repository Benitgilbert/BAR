import { ChevronRight, MapPin, Radio, Wifi } from "lucide-react";

import { BrandMark } from "@/components/brand-logo";
import { businessConfig } from "@/config/business";

export function MobilePosHeader() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-forest-950 px-5 py-5 text-white shadow-[0_18px_50px_rgba(9,39,29,0.2)] sm:px-7 sm:py-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />
      <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-gold-400/[0.06]" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <BrandMark inverse className="h-12 w-12" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-gold-300">
              Mobile point of sale
            </p>
            <h1 className="mt-1.5 truncate text-lg font-extrabold tracking-[-0.025em] sm:text-xl">
              {businessConfig.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-white/55">
              <MapPin className="h-3 w-3" />
              {businessConfig.location}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/8 py-2 pl-3 pr-2.5 text-left"
          aria-label="Open shift details"
        >
          <span>
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-300">
              <Radio className="h-3 w-3" />
              SHIFT OPEN
            </span>
            <span className="mt-0.5 block text-[9px] text-white/45">Till 01</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-white/45" />
        </button>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-semibold text-white/55">
        <span className="flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-emerald-300" />
          Synced just now
        </span>
        <span>Cashier · Grace M.</span>
      </div>
    </section>
  );
}
