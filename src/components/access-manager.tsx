"use client";

import { Check, Clock3, KeyRound, ShieldCheck, UserPlus, X } from "lucide-react";
import { useState } from "react";

import type { Capability } from "@/lib/permissions";

interface UserRow { id: string; fullName: string; email: string; role: string; }
interface GrantRow { id: string; capability: string; expiresAt: string | null; reason: string | null; recipient: UserRow; grantedBy: { fullName: string }; }

const capabilityLabels: Record<Capability, string> = {
  "dashboard.view": "View dashboard",
  "pos.use": "Use POS",
  "orders.create": "Create orders",
  "orders.dispatch": "Dispatch rounds",
  "orders.settle": "Settle payments",
  "rooms.manage": "Manage rooms",
  "products.manage": "Manage products",
  "stock.manage": "Manage stock",
  "kitchen.view": "View kitchen",
  "kitchen.update": "Update kitchen",
  "users.manage": "Manage users",
  "access.manage": "Manage access",
  "audit.view": "View audit",
};

export function AccessManager({
  initialUsers,
  initialGrants,
  initialCapabilities,
}: {
  initialUsers: UserRow[];
  initialGrants: GrantRow[];
  initialCapabilities: Capability[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [grants, setGrants] = useState(initialGrants);
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const [recipientId, setRecipientId] = useState(initialUsers.find((user) => user.role !== "OWNER")?.id ?? "");
  const [capability, setCapability] = useState<Capability>("pos.use");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/access/grants");
    const result = (await response.json()) as { users?: UserRow[]; grants?: GrantRow[]; capabilities?: Capability[]; error?: string };
    if (response.ok && result.users && result.grants && result.capabilities) {
      setUsers(result.users);
      setGrants(result.grants);
      setCapabilities(result.capabilities);
      if (!recipientId && result.users[0]) setRecipientId(result.users[0].id);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/access/grants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId, capability, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, reason }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to grant access");
      setReason("");
      setExpiresAt("");
      setNotice("Access granted and recorded in the audit log");
      await load();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Unable to grant access");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/access/grants/${id}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Unable to revoke access");
      return;
    }
    setNotice("Access revoked");
    await load();
  }

  return <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0"><section><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Owner controls</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">Access &amp; delegation</h1><p className="mt-2 text-sm text-slate-500">Grant temporary or permanent capabilities when another worker covers a shift.</p></section>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p>}{notice && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><Check className="h-4 w-4" />{notice}</p>}<section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={submit} className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-forest-100 text-forest-800"><UserPlus className="h-5 w-5" /></div><div><h2 className="text-sm font-extrabold text-forest-950">Grant capability</h2><p className="text-[10px] text-slate-400">Assigned to one worker</p></div></div><label className="mt-5 block"><span className="text-xs font-bold text-slate-700">Worker</span><select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-forest-400"><option value="">Choose worker</option>{users.filter((user) => user.role !== "OWNER").map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>)}</select></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Capability</span><select value={capability} onChange={(event) => setCapability(event.target.value as Capability)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-forest-400">{capabilities.map((item) => <option key={item} value={item}>{capabilityLabels[item] ?? item}</option>)}</select></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Expires <span className="font-normal text-slate-400">(leave blank for permanent)</span></span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-forest-400" /></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. covering absent waiter" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-forest-400" /></label><button type="submit" disabled={saving || !recipientId} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-black text-white disabled:opacity-50"><KeyRound className="h-4 w-4" />{saving ? "Granting..." : "Grant access"}</button></form><section className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-600" /><h2 className="text-sm font-extrabold text-forest-950">Active grants</h2></div><span className="rounded-full bg-forest-50 px-2.5 py-1 text-[10px] font-extrabold text-forest-800">{grants.length}</span></div>{grants.length === 0 ? <p className="mt-8 text-center text-sm text-slate-400">No temporary grants active.</p> : <div className="mt-4 space-y-2">{grants.map((grant) => <div key={grant.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5"><div className="min-w-0"><p className="text-xs font-extrabold text-forest-950">{grant.recipient.fullName}</p><p className="mt-1 text-[10px] text-slate-500">{capabilityLabels[grant.capability as Capability] ?? grant.capability}</p><p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400"><Clock3 className="h-3 w-3" />{grant.expiresAt ? `Expires ${new Date(grant.expiresAt).toLocaleString()}` : "Permanent"}</p></div><button type="button" onClick={() => revoke(grant.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-400 hover:text-red-600" aria-label={`Revoke access for ${grant.recipient.fullName}`}><X className="h-4 w-4" /></button></div>)}</div>}</section></section></div>;
}
