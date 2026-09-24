"use client";

import { Check, KeyRound, Plus, ShieldCheck, UserRound, UserX } from "lucide-react";
import { useState } from "react";

import type { StaffRoleName } from "@/lib/permissions";

interface UserRow { id: string; fullName: string; email: string; phone: string | null; role: string; active: boolean; }

export function TeamManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Exclude<StaffRoleName, "OWNER">>("FRONT_DESK");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("create");
    setError("");
    setTemporaryPassword("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, email, phone, role }) });
      const result = (await response.json()) as { user?: UserRow; temporaryPassword?: string; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Unable to create user");
      setUsers((current) => [result.user!, ...current]);
      setTemporaryPassword(result.temporaryPassword ?? "");
      setFullName(""); setEmail(""); setPhone("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user");
    } finally {
      setSaving("");
    }
  }

  async function toggleUser(user: UserRow) {
    setSaving(user.id);
    setError("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: user.active ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: user.active ? undefined : JSON.stringify({ active: true }) });
      const result = (await response.json()) as { user?: UserRow; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Unable to update user");
      setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update user");
    } finally {
      setSaving("");
    }
  }

  async function resetPassword(user: UserRow) {
    const password = window.prompt(`New password for ${user.fullName} (minimum 8 characters):`);
    if (!password) return;
    setSaving(user.id);
    setError("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = (await response.json()) as { user?: UserRow; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Unable to reset password");
      setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
      setNotice("Password reset. Share the new password securely.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to reset password");
    } finally {
      setSaving("");
    }
  }

  return <div className="space-y-6 pb-24 lg:space-y-8 lg:pb-0"><section><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Owner controls</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-forest-950 sm:text-4xl">Team &amp; hiring</h1><p className="mt-2 text-sm text-slate-500">Create worker accounts and control who can access Umugano.</p></section>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p>}{notice && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><Check className="h-4 w-4" />{notice}</p>}{temporaryPassword && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><p className="font-extrabold">Temporary password created</p><p className="mt-1 font-mono font-bold">{temporaryPassword}</p><p className="mt-1 text-[10px]">Share it securely. It is shown only once.</p></div>}<section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={createUser} className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-forest-100 text-forest-800"><UserRound className="h-5 w-5" /></div><div><h2 className="text-sm font-extrabold text-forest-950">Hire a worker</h2><p className="text-[10px] text-slate-400">Owner creates the account</p></div></div><label className="mt-5 block"><span className="text-xs font-bold text-slate-700">Full name</span><input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Grace Mukamana" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="worker@umugano.rw" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+250 ..." className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></label><label className="mt-4 block"><span className="text-xs font-bold text-slate-700">Role</span><select value={role} onChange={(event) => setRole(event.target.value as Exclude<StaffRoleName, "OWNER">)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-forest-400"><option value="FRONT_DESK">Front Desk · Waiter/Receptionist</option><option value="MUCOMA">Mucoma · Kitchen</option></select></label><button type="submit" disabled={saving === "create"} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving === "create" ? "Creating account..." : "Create worker account"}</button></form><section className="rounded-[26px] border border-white bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-600" /><h2 className="text-sm font-extrabold text-forest-950">Current team</h2></div><span className="rounded-full bg-forest-50 px-2.5 py-1 text-[10px] font-extrabold text-forest-800">{users.filter((user) => user.active).length} active</span></div><div className="mt-4 space-y-2">{users.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-forest-800">{user.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold text-forest-950">{user.fullName}</p><p className="mt-1 truncate text-[10px] text-slate-400">{user.email} · {user.role}</p></div></div><div className="flex items-center gap-2"><span className={`hidden rounded-full px-2 py-1 text-[9px] font-extrabold sm:inline ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{user.active ? "Active" : "Inactive"}</span><button type="button" disabled={saving === user.id} onClick={() => resetPassword(user)} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-400 hover:text-forest-700 disabled:opacity-40" aria-label={`Reset password for ${user.fullName}`}><KeyRound className="h-3.5 w-3.5" /></button>{user.role !== "OWNER" && <button type="button" disabled={saving === user.id} onClick={() => toggleUser(user)} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-400 hover:text-red-600 disabled:opacity-40" aria-label={user.active ? `Deactivate ${user.fullName}` : `Reactivate ${user.fullName}`}>{user.active ? <UserX className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</button>}</div></div>)}</div></section></section></div>;
}
