"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export const dynamic = "force-dynamic";
export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/bigfoods-staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to sign in");
      router.replace("/staff"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in"); }
    finally { setLoading(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-[#F7F4F0] px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
    <div className="mb-6"><div className="mb-3 inline-flex rounded-xl bg-orange-100 p-3 text-orange-700">BF</div><h1 className="text-2xl font-semibold">BigFoods Staff</h1><p className="mt-1 text-sm text-gray-500">Sign in to central operations</p></div>
    <label className="mb-1 block text-sm font-medium" htmlFor="email">Work email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2.5" />
    <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2.5" />
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
    <p className="mt-4 text-xs text-gray-500">Access is limited to authorized BigFoods personnel.</p>
  </form></main>;
}