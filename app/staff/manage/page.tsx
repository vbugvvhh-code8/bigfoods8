"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type StaffRow = { id:string; email:string; display_name:string; role:string; permissions:string[]; is_active:boolean; must_change_password:boolean; phone?:string|null; job_title?:string|null; start_date?:string|null; monthly_salary?:number|null; last_login_at:string|null; created_at:string };
const roles = ["admin","manager","inventory","pos","support","auditor"];
export const dynamic = "force-dynamic";
export default function StaffManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const inAdmin = pathname.startsWith("/admin/staff");
  const [rows,setRows] = useState<StaffRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");
  const [role,setRole] = useState("inventory");
  const [temporaryPassword,setTemporaryPassword] = useState("");
  const [phone,setPhone] = useState("");
  const [jobTitle,setJobTitle] = useState("");
  const [startDate,setStartDate] = useState("");
  const [monthlySalary,setMonthlySalary] = useState("");
  const [editingId,setEditingId] = useState<string|null>(null);
  const [canManage,setCanManage] = useState(false);
  const call = useCallback(async (body:Record<string,unknown>) => {
    const res = await fetch("/api/bigfoods-staff/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },[]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const sessionRes = await fetch("/api/bigfoods-staff/session",{cache:"no-store"});
      const session = await sessionRes.json();
      if (!sessionRes.ok) { router.replace("/staff/login"); return; }
      const staffRole = session.staff?.role;
      const permissions = session.staff?.permissions;
      if (!["owner","admin"].includes(staffRole) && !(Array.isArray(permissions) && permissions.includes("staff.manage"))) {
        setError("Your account does not have permission to manage staff."); setLoading(false); return;
      }
      setCanManage(true);
      const data = await call({action:"list"});
      setRows(data.staff ?? []);
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load staff"); }
    finally { setLoading(false); }
  },[call,router]);
  useEffect(()=>{void load();},[load]);
  function resetForm() {
    setEmail(""); setName(""); setTemporaryPassword(""); setPhone(""); setJobTitle(""); setStartDate(""); setMonthlySalary(""); setRole("inventory"); setEditingId(null);
  }
  function editRow(row:StaffRow) {
    setEditingId(row.id); setEmail(row.email); setName(row.display_name); setRole(row.role);
    setPhone(row.phone ?? ""); setJobTitle(row.job_title ?? ""); setStartDate(row.start_date ?? "");
    setMonthlySalary(row.monthly_salary == null ? "" : String(row.monthly_salary)); setTemporaryPassword("");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function create(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const profile = {email,display_name:name,role,phone,job_title:jobTitle,start_date:startDate,monthly_salary:monthlySalary === "" ? null : Number(monthlySalary)};
      if (editingId) {
        await call({action:"update",staff_id:editingId,...profile});
        setNotice("Staff profile updated.");
      } else {
        if (temporaryPassword.length < 14) throw new Error("Temporary password must contain at least 14 characters.");
        await call({action:"create",...profile,password:temporaryPassword});
        setNotice("Staff account created. Share the temporary password securely; the staff member must change it.");
      }
      resetForm();
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to save staff account"); }
    finally { setBusy(false); }
  }
  async function toggle(row:StaffRow) {
    setBusy(true); setError(""); setNotice("");
    try { if (row.is_active) await call({action:"deactivate",staff_id:row.id}); else await call({action:"update",staff_id:row.id,is_active:true}); setNotice(row.is_active?"Account deactivated and active sessions revoked.":"Account activated."); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to update account"); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#F7F4F0]">
    <header className="flex items-center justify-between border-b bg-white px-5 py-4 md:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-orange-700">BigFoods central operations</p><h1 className="mt-1 text-xl font-semibold">Staff management</h1></div><button onClick={()=>router.push(inAdmin ? "/admin/dashboard" : "/staff")} className="rounded-lg border px-4 py-2 text-sm">Back to workspace</button></header>
    <section className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {canManage && <form onSubmit={create} className="rounded-xl border bg-white p-5 md:p-6"><h2 className="text-lg font-semibold">{editingId ? "Edit staff profile" : "Add staff member"}</h2><p className="mt-1 text-sm text-gray-500">Manage the staff member’s account, employment details and monthly salary. New accounts must change their temporary password after first sign-in.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Full name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="text-sm font-medium">Work email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="text-sm font-medium">Role<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal">{roles.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label><label className="text-sm font-medium">Phone (optional)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="text-sm font-medium">Job title (optional)<input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="text-sm font-medium">Employment start date<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="text-sm font-medium">Monthly salary (₦)<input type="number" min="0" step="0.01" value={monthlySalary} onChange={e=>setMonthlySalary(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label>{!editingId && <label className="text-sm font-medium">Temporary password<input required minLength={14} type="password" autoComplete="new-password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2.5 font-normal"/></label>}</div>
        <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{busy?"Saving…":editingId?"Save changes":"Create staff account"}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-lg border px-5 py-2.5">Cancel edit</button>}</div>
      </form>}
      <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Staff accounts</h2><p className="mt-1 text-sm text-gray-500">Deactivation revokes active sessions immediately.</p></div>
        {loading?<p className="p-6 text-sm text-gray-500">Loading staff…</p>:rows.length===0?<p className="p-6 text-sm text-gray-500">No staff accounts found.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Staff member</th><th className="p-4">Role / Job title</th><th className="p-4">Monthly salary</th><th className="p-4">Status</th><th className="p-4">Last sign in</th><th className="p-4">Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="p-4"><p className="font-medium">{row.display_name}</p><p className="text-gray-500">{row.email}</p></td><td className="p-4 capitalize">{row.role}{row.job_title&&<p className="text-xs text-gray-500 normal-case">{row.job_title}</p>}</td><td className="p-4">{row.monthly_salary==null?"—":new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:2}).format(row.monthly_salary)}</td><td className="p-4"><span className={row.is_active?"rounded-full bg-green-50 px-2.5 py-1 text-green-700":"rounded-full bg-gray-100 px-2.5 py-1 text-gray-600"}>{row.is_active?"Active":"Inactive"}</span>{row.must_change_password&&<p className="mt-1 text-xs text-amber-700">Password change required</p>}</td><td className="p-4 text-gray-600">{row.last_login_at?new Date(row.last_login_at).toLocaleString():"Never"}</td><td className="p-4"><div className="flex gap-2"><button disabled={busy} onClick={()=>editRow(row)} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">Edit</button><button disabled={busy} onClick={()=>void toggle(row)} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">{row.is_active?"Deactivate":"Activate"}</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </section>
  </main>;
}
