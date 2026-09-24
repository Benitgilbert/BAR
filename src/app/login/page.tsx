"use client";

import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { BrandMark } from "@/components/brand-logo";
import { businessConfig } from "@/config/business";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string; user?: { role?: string } };
      if (!response.ok) throw new Error(result.error || "Unable to sign in");
      router.push(result.user?.role === "MUCOMA" ? "/kitchen" : "/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_80px_rgba(18,55,42,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-forest-950 p-7 text-white sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full border-[32px] border-white/[0.04]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gold-400/[0.08]" />
          <div className="relative">
            <BrandMark inverse className="h-14 w-14" />
            <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold-300">Secure team access</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Run Umugano with clarity.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">One account for every worker. Your role determines the tools and actions available to you.</p>
            <div className="mt-10 space-y-3 text-xs font-semibold text-white/65">
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-300" />Owner, Front Desk, and Mucoma access</p>
              <p className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-gold-300" />Every action is recorded for accountability</p>
            </div>
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3 lg:hidden"><BrandMark className="h-11 w-11" /><div><p className="text-sm font-extrabold text-forest-950">Umugano</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bar &amp; Guest House</p></div></div>
          <div className="mt-8 lg:mt-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-600">Welcome back</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-forest-950">Sign in to your workspace</h2>
            <p className="mt-2 text-sm text-slate-500">Use the email and password assigned by the Owner.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Email address</span>
              <div className="relative mt-2"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@umugano.rw" className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></div>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Password</span>
              <div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-forest-400 focus:ring-4 focus:ring-forest-100" /></div>
            </label>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</p>}
            <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-900 text-sm font-black text-white shadow-[0_12px_26px_rgba(18,55,42,0.2)] transition hover:bg-forest-800 disabled:opacity-50">{isLoading ? "Signing in..." : "Sign in"}{!isLoading && <ArrowRight className="h-4 w-4" />}</button>
          </form>
          <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">{businessConfig.slogan}<br />{businessConfig.location}</p>
        </section>
      </div>
    </main>
  );
}
