import { Activity, ShieldCheck } from "lucide-react";
import { connection } from "next/server";

import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kigali" }).format(value);
}

export default async function ActivityPage() {
  await connection();
  await requirePageCapability("audit.view");
  const events = await prisma.auditEvent.findMany({ include: { actor: { select: { fullName: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Accountability</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">Activity &amp; audit log</h1>
        <p className="mt-2 text-sm text-slate-500">Append-only record of who did what and when.</p>
      </section>
      <section className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><ShieldCheck className="h-4 w-4 text-gold-600" /><p className="text-sm font-extrabold text-forest-950">Latest activity</p><span className="ml-auto text-[10px] font-bold text-slate-400">{events.length} events</span></div>
        {events.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No audited activity yet.</p> : <div className="mt-4 space-y-2">{events.map((event) => <div key={event.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-forest-700"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-forest-950">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-slate-500">{event.actor?.fullName ?? "System"} · {event.entityType}{event.entityId ? ` · ${event.entityId.slice(0, 10)}` : ""}</p>{event.metadata && <p className="mt-1 truncate text-[9px] text-slate-400">{JSON.stringify(event.metadata)}</p>}</div><time className="shrink-0 text-[10px] font-semibold text-slate-400">{formatDate(event.createdAt)}</time></div>)}</div>}
      </section>
    </div>
  );
}
