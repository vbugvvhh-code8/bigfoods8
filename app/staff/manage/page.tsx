"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Users, UserPlus, Search, Pencil, UserCheck, UserX, RefreshCw, ShieldCheck, Clock3 } from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader";

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
  const [formOpen,setFormOpen] = useState(false);
  const [canManage,setCanManage] = useState(false);
  const [search,setSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState("all");
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
    setEmail(""); setName(""); setTemporaryPassword(""); setPhone(""); setJobTitle(""); setStartDate(""); setMonthlySalary(""); setRole("inventory"); setEditingId(null); setFormOpen(false);
  }
  function editRow(row:StaffRow) {
    setEditingId(row.id); setEmail(row.email); setName(row.display_name); setRole(row.role);
    setPhone(row.phone ?? ""); setJobTitle(row.job_title ?? ""); setStartDate(row.start_date ?? "");
    setMonthlySalary(row.monthly_salary == null ? "" : String(row.monthly_salary)); setTemporaryPassword("");
    setFormOpen(true);
  }
  async function create(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const profile = {email,display_name:name,...(role === "owner" ? {} : {role}),phone,job_title:jobTitle,start_date:startDate,monthly_salary:monthlySalary === "" ? null : Number(monthlySalary)};
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
  const filteredRows = rows.filter(row => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [row.display_name,row.email,row.role,row.job_title ?? ""].some(value => value.toLowerCase().includes(query));
    return matchesQuery && (statusFilter === "all" || (statusFilter === "active" ? row.is_active : !row.is_active));
  });
  const activeCount = rows.filter(row => row.is_active).length;
  const inactiveCount = rows.length - activeCount;
  return <div className="space-y-5">
    <PageHeader title="Staff management" subtitle="Manage BigFoods team accounts, roles and employment details." pill={<span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium" style={{borderColor:"var(--line)",color:"var(--gray)"}}><ShieldCheck className="h-3.5 w-3.5"/> Central operations</span>} />
    {error && <div role="alert" className="rounded-lg border px-4 py-3 text-[12px]" style={{borderColor:"#E8B4A8",background:"#FFF3F0",color:"#9B3020"}}>{error}</div>}
    {notice && <div role="status" className="rounded-lg border px-4 py-3 text-[12px]" style={{borderColor:"#B8D8C2",background:"#F0FAF2",color:"#23643B"}}>{notice}</div>}

    {formOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)resetForm();}}>
      <section role="dialog" aria-modal="true" aria-labelledby="staff-form-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-white shadow-2xl" style={{borderColor:"var(--line)"}}>
        <header className="flex items-start gap-3 border-b px-5 py-4 sm:px-6" style={{borderColor:"var(--line)"}}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{background:"#FFF0E5",color:"var(--orange)"}}>{editingId?<Pencil className="h-4 w-4"/>:<UserPlus className="h-4 w-4"/>}</div>
          <div className="min-w-0 flex-1"><h2 id="staff-form-title" className="text-[15px] font-semibold">{editingId?"Edit staff member":"Add staff member"}</h2><p className="mt-1 text-[11px]" style={{color:"var(--gray)"}}>{editingId?"Update employment details and access role.":"Create a staff login and set employment details. New staff must change their temporary password at first sign-in."}</p></div>
          <button type="button" aria-label="Close form" disabled={busy} onClick={resetForm} className="rounded-md border px-2.5 py-1.5 text-[11px]" style={{borderColor:"var(--line)"}}>Close</button>
        </header>
        <form onSubmit={create} className="min-h-0 overflow-y-auto">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className="text-[11px] font-medium">Full name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="e.g. Ada Okafor"/></label>
            <label className="text-[11px] font-medium">Work email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="name@example.com"/></label>
            <label className="text-[11px] font-medium">Access role<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1.5 block w-full rounded-md border bg-white px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}}>{editingId&&role==="owner"&&<option value="owner">Owner</option>}{roles.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label>
            <label className="text-[11px] font-medium">Phone (optional)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="Phone number"/></label>
            <label className="text-[11px] font-medium">Job title (optional)<input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="e.g. Store manager"/></label>
            <label className="text-[11px] font-medium">Start date<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}}/></label>
            <label className="text-[11px] font-medium sm:col-span-2">Monthly salary (₦)<input type="number" min="0" step="0.01" value={monthlySalary} onChange={e=>setMonthlySalary(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="0.00"/></label>
            {!editingId&&<label className="text-[11px] font-medium sm:col-span-2">Temporary password<input required minLength={14} type="password" autoComplete="new-password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)} className="mt-1.5 block w-full rounded-md border px-3 py-2.5 text-[12px] font-normal outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}} placeholder="At least 14 characters"/><span className="mt-1 block text-[10px] font-normal" style={{color:"var(--gray)"}}>Share this password privately. Never reuse it for another account.</span></label>}
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4 sm:px-6" style={{borderColor:"var(--line)",background:"#FCFAF7"}}><button type="button" disabled={busy} onClick={resetForm} className="rounded-md border px-4 py-2.5 text-[11.5px]" style={{borderColor:"var(--line)"}}>Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[11.5px] font-semibold text-white disabled:opacity-60" style={{background:"var(--orange)"}}>{busy?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:editingId?<Pencil className="h-3.5 w-3.5"/>:<UserPlus className="h-3.5 w-3.5"/>}{busy?"Saving…":editingId?"Save changes":"Create staff account"}</button></footer>
        </form>
      </section>
    </div>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4 sm:p-5" style={{borderColor:"var(--line)"}}><div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{color:"var(--gray)"}}>Total staff</span><Users className="h-4 w-4" style={{color:"var(--orange)"}}/></div><p className="mt-2 text-[26px] font-semibold" style={{fontFamily:"'Space Grotesk', sans-serif"}}>{rows.length}</p><p className="mt-1 text-[10.5px]" style={{color:"var(--gray)"}}>All staff accounts</p></div>
      <div className="rounded-xl border bg-white p-4 sm:p-5" style={{borderColor:"var(--line)"}}><div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{color:"var(--gray)"}}>Active accounts</span><UserCheck className="h-4 w-4 text-green-700"/></div><p className="mt-2 text-[26px] font-semibold" style={{fontFamily:"'Space Grotesk', sans-serif"}}>{activeCount}</p><p className="mt-1 text-[10.5px]" style={{color:"var(--gray)"}}>Can access assigned modules</p></div>
      <div className="rounded-xl border bg-white p-4 sm:p-5" style={{borderColor:"var(--line)"}}><div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{color:"var(--gray)"}}>Inactive accounts</span><UserX className="h-4 w-4" style={{color:"var(--gray)"}}/></div><p className="mt-2 text-[26px] font-semibold" style={{fontFamily:"'Space Grotesk', sans-serif"}}>{inactiveCount}</p><p className="mt-1 text-[10.5px]" style={{color:"var(--gray)"}}>Access disabled</p></div>
    </section>

    <section className="overflow-hidden rounded-xl border bg-white" style={{borderColor:"var(--line)"}}>
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor:"var(--line)"}}><div><h2 className="text-[14px] font-semibold">Team directory</h2><p className="mt-1 text-[11px]" style={{color:"var(--gray)"}}>{filteredRows.length} {filteredRows.length === 1 ? "staff member" : "staff members"} shown · Manage access and review staff account details.</p></div><div className="flex flex-wrap items-center gap-2">{canManage&&<><button type="button" onClick={()=>void load()} disabled={loading||busy} className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-[11px] disabled:opacity-50" style={{borderColor:"var(--line)",color:"var(--ink)"}}><RefreshCw className={`h-3.5 w-3.5 ${loading?"animate-spin":""}`}/>{loading?"Refreshing…":"Refresh"}</button><button type="button" onClick={()=>{resetForm();setFormOpen(true);}} className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:opacity-90" style={{background:"var(--orange)"}}><UserPlus className="h-3.5 w-3.5"/> Add staff member</button></>}</div></div>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row" style={{borderColor:"var(--line)",background:"#FCFAF7"}}><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{color:"var(--gray)"}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, role or job title…" className="w-full rounded-md border bg-white py-2.5 pl-9 pr-3 text-[11.5px] outline-none focus:border-orange-400" style={{borderColor:"var(--line)"}}/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-md border bg-white px-3 py-2.5 text-[11.5px]" style={{borderColor:"var(--line)"}}><option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></div>
      {loading?<div className="space-y-3 p-5">{[1,2,3].map(n=><div key={n} className="h-12 animate-pulse rounded-md" style={{background:"#F5F1EC"}}/>)}</div>:filteredRows.length===0?<div className="flex flex-col items-center px-5 py-12 text-center"><Users className="h-8 w-8" style={{color:"#C9BFB4"}}/><p className="mt-3 text-[13px] font-medium">{rows.length===0?"No staff accounts yet":"No matching staff found"}</p><p className="mt-1 max-w-sm text-[11px]" style={{color:"var(--gray)"}}>{rows.length===0?"Use “Add staff member” to create the first staff account.":"Try another search term or change the status filter."}</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead style={{background:"#F8F5F1"}}><tr className="text-[9.5px] uppercase tracking-wider" style={{color:"var(--gray)"}}>{["Staff member","Role / job title","Start date","Monthly salary","Status","Last sign in","Actions"].map(label=><th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{filteredRows.map(row=><tr key={row.id} className="border-t transition-colors hover:bg-[#FFFCF8]" style={{borderColor:"var(--line)"}}><td className="px-4 py-3.5"><p className="text-[11.5px] font-semibold">{row.display_name}</p><p className="mt-0.5 text-[10.5px]" style={{color:"var(--gray)"}}>{row.email}</p>{row.phone&&<p className="mt-0.5 text-[10px]" style={{color:"var(--gray)"}}>{row.phone}</p>}</td><td className="px-4 py-3.5"><span className="text-[11px] font-medium capitalize">{row.role}</span>{row.job_title&&<p className="mt-0.5 text-[10px]" style={{color:"var(--gray)"}}>{row.job_title}</p>}</td><td className="px-4 py-3.5 text-[11px]">{row.start_date?new Date(`${row.start_date}T00:00:00`).toLocaleDateString("en-NG",{day:"2-digit",month:"short",year:"numeric"}):"—"}</td><td className="px-4 py-3.5 text-[11px]">{row.monthly_salary==null?"—":new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:2}).format(row.monthly_salary)}</td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium" style={row.is_active?{background:"#EAF6ED",color:"#286B3B"}:{background:"#F0EEEB",color:"#756E67"}}><span className="h-1.5 w-1.5 rounded-full" style={{background:row.is_active?"#2D8A48":"#8B8178"}}/>{row.is_active?"Active":"Inactive"}</span>{row.must_change_password&&<p className="mt-1 text-[9.5px]" style={{color:"#A05B00"}}>Password change required</p>}</td><td className="px-4 py-3.5 text-[10.5px]" style={{color:"var(--gray)"}}>{row.last_login_at?new Date(row.last_login_at).toLocaleString():"Never"}</td><td className="px-4 py-3.5"><div className="flex items-center gap-1.5"><button disabled={busy} onClick={()=>editRow(row)} title="Edit staff profile" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-[10.5px] disabled:opacity-50" style={{borderColor:"var(--line)"}}><Pencil className="h-3 w-3"/> Edit</button><button disabled={busy} onClick={()=>void toggle(row)} title={row.is_active?"Deactivate account":"Activate account"} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-[10.5px] disabled:opacity-50" style={{borderColor:"var(--line)",color:row.is_active?"#A33B2B":"#286B3B"}}>{row.is_active?<UserX className="h-3 w-3"/>:<UserCheck className="h-3 w-3"/>}{row.is_active?"Disable":"Enable"}</button></div></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t px-5 py-3 text-[10px]" style={{borderColor:"var(--line)",color:"var(--gray)"}}><span>Showing {filteredRows.length} of {rows.length} staff accounts</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3"/> Account changes are audited</span></div>
    </section>
  </div>;
}
