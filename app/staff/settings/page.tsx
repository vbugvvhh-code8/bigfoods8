"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, UserRound, ArrowUpRight, LockKeyhole, Percent, Save } from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";

type Staff = { id:string; email:string; display_name:string; role:string; permissions:unknown; is_active?:boolean; must_change_password?:boolean };
type Pricing = { tax_enabled:boolean; tax_rate:number; discount_enabled:boolean; discount_allowed_roles:string[]; discount_max_percent:number };
const roleOptions = ["owner","admin","manager","supervisor","cashier"];
export const dynamic = "force-dynamic";

export default function StaffSettingsPage() {
  const router = useRouter();
  const [staff,setStaff] = useState<Staff|null>(null);
  const [error,setError] = useState("");
  const [pricing,setPricing] = useState<Pricing|null>(null);
  const [pricingBusy,setPricingBusy] = useState(false);
  const [pricingError,setPricingError] = useState("");
  const [pricingNotice,setPricingNotice] = useState("");
  const isAdmin = !!staff && ["owner","admin"].includes(staff.role.toLowerCase());
  useEffect(() => { if (!staff) return; let live=true; fetch("/api/bigfoods-pos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"settings_get"}),cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load POS settings");return d.settings as Pricing;}).then(v=>{if(live)setPricing(v);}).catch(e=>{if(live)setPricingError(e instanceof Error?e.message:"Unable to load POS settings");});return()=>{live=false;};},[staff]);
  async function savePricing(){if(!pricing)return;setPricingBusy(true);setPricingError("");setPricingNotice("");try{const r=await fetch("/api/bigfoods-pos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"settings_save",...pricing}),cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save settings");setPricing(d.settings);setPricingNotice("POS pricing settings saved.");}catch(e){setPricingError(e instanceof Error?e.message:"Unable to save settings");}finally{setPricingBusy(false);}}
  useEffect(() => {
    let live = true;
    fetch("/api/bigfoods-staff/session",{cache:"no-store"}).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Session expired");
      return data.staff as Staff;
    }).then(value => { if(live) setStaff(value); }).catch(() => {
      if(live) { setError("Your session has expired. Please sign in again."); router.replace("/staff/login"); }
    });
    return () => { live = false; };
  },[router]);

  if (!staff) return <main className="grid min-h-screen place-items-center bg-[#F7F4F0]"><p className="text-sm text-[#81766D]">{error || "Loading account settings…"}</p></main>;
  const permissions = Array.isArray(staff.permissions) ? staff.permissions.filter((p): p is string => typeof p === "string") : [];
  return <StaffShell title="Settings" subtitle="Manage your account security and review your access." staffName={staff.display_name} staffRole={staff.role} staffPermissions={staff.permissions}>
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-[#E8E0D8] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><UserRound className="h-5 w-5"/></span><div><h2 className="text-base font-bold text-[#30261F]">Your account</h2><p className="mt-1 text-sm text-[#81766D]">These details identify your staff login. Contact a staff administrator if your name or email needs to be corrected.</p></div></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F8F6F3] p-4"><dt className="text-xs font-medium text-[#81766D]">Full name</dt><dd className="mt-1 font-semibold text-[#30261F]">{staff.display_name || "Not provided"}</dd></div>
          <div className="rounded-xl bg-[#F8F6F3] p-4"><dt className="text-xs font-medium text-[#81766D]">Staff email</dt><dd className="mt-1 break-all font-semibold text-[#30261F]">{staff.email}</dd></div>
          <div className="rounded-xl bg-[#F8F6F3] p-4"><dt className="text-xs font-medium text-[#81766D]">Assigned role</dt><dd className="mt-1 font-semibold capitalize text-[#30261F]">{staff.role.replace(/[_-]/g," ")}</dd></div>
          <div className="rounded-xl bg-[#F8F6F3] p-4"><dt className="text-xs font-medium text-[#81766D]">Account status</dt><dd className="mt-1 font-semibold text-emerald-700">{staff.is_active === false ? "Inactive" : "Active"}</dd></div>
        </dl>
      </section>
      <section className="rounded-2xl border border-[#E8E0D8] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><KeyRound className="h-5 w-5"/></span><div className="flex-1"><h2 className="text-base font-bold text-[#30261F]">Password & security</h2><p className="mt-1 text-sm text-[#81766D]">Use a strong password that you do not reuse on other websites.</p></div></div>
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#EEE6DE] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#30261F]">Change password</p><p className="mt-1 text-xs leading-5 text-[#81766D]">You will need your current password. You will be asked to sign in again after changing it.</p></div><button onClick={()=>router.push("/staff/change-password")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500">Change password <ArrowUpRight className="h-4 w-4"/></button></div>
        {staff.must_change_password && <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>Password update required.</strong> Change your temporary password before using other staff tools.</div>}
      </section>
      {isAdmin && <section className="rounded-2xl border border-[#E8E0D8] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><Percent className="h-5 w-5"/></span><div><h2 className="text-base font-bold text-[#30261F]">POS pricing & discounts</h2><p className="mt-1 text-sm text-[#81766D]">Set VAT and control which staff roles may apply discounts.</p></div></div>
        {pricingError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{pricingError}</p>}
        {pricingNotice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{pricingNotice}</p>}
        {!pricing ? <p className="mt-4 text-sm text-[#81766D]">Loading POS settings…</p> : <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-semibold">Enable VAT<input type="checkbox" checked={pricing.tax_enabled} onChange={e=>setPricing(v=>v?{...v,tax_enabled:e.target.checked}:v)} className="h-5 w-5 accent-orange-600"/></label>
          <label className="block text-xs font-semibold">VAT rate (%)<input type="number" min="0" max="30" step="0.01" value={pricing.tax_rate} onChange={e=>setPricing(v=>v?{...v,tax_rate:Number(e.target.value)}:v)} disabled={!pricing.tax_enabled} className="mt-2 w-full rounded-xl border px-3 py-2.5 sm:max-w-xs"/></label>
          <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-semibold">Enable discounts<input type="checkbox" checked={pricing.discount_enabled} onChange={e=>setPricing(v=>v?{...v,discount_enabled:e.target.checked}:v)} className="h-5 w-5 accent-orange-600"/></label>
          <label className="block text-xs font-semibold">Maximum discount (%)<input type="number" min="0" max="100" step="0.01" value={pricing.discount_max_percent} onChange={e=>setPricing(v=>v?{...v,discount_max_percent:Number(e.target.value)}:v)} disabled={!pricing.discount_enabled} className="mt-2 w-full rounded-xl border px-3 py-2.5 sm:max-w-xs"/></label>
          <div><p className="text-xs font-semibold">Roles allowed to apply discounts</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{roleOptions.map(role=><label key={role} className="flex items-center gap-2 rounded-lg bg-[#F8F6F3] p-3 text-sm capitalize"><input type="checkbox" checked={pricing.discount_allowed_roles.includes(role)} disabled={!pricing.discount_enabled} onChange={e=>setPricing(v=>v?{...v,discount_allowed_roles:e.target.checked?[...v.discount_allowed_roles,role]:v.discount_allowed_roles.filter(x=>x!==role)}:v)} className="h-4 w-4 accent-orange-600"/>{role}</label>)}</div></div>
          <div className="flex items-center justify-between gap-3"><p className="text-xs text-[#81766D]">Only owners and administrators can edit these settings.</p><button onClick={()=>void savePricing()} disabled={pricingBusy||!pricing.discount_allowed_roles.length} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{pricingBusy?"Saving…":"Save settings"}</button></div>
        </div>}
      </section>}
      <section className="rounded-2xl border border-[#E8E0D8] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F7F4F0] text-[#65584F]"><ShieldCheck className="h-5 w-5"/></span><div><h2 className="text-base font-bold text-[#30261F]">Role & permissions</h2><p className="mt-1 text-sm text-[#81766D]">Your assigned permissions control which tools you can access. Only authorized administrators can change them.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#F8F6F3] px-3 py-1.5 text-xs font-semibold capitalize text-[#51463D]">{staff.role.replace(/[_-]/g," ")}</span>{permissions.length ? permissions.map(permission => <span key={permission} className="rounded-full border border-[#E8E0D8] px-3 py-1.5 text-xs text-[#65584F]">{permission}</span>) : <span className="text-sm text-[#81766D]">No additional permissions assigned.</span>}</div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#F8F6F3] p-3 text-xs leading-5 text-[#81766D]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/> This page is read-only for role and permission settings to prevent staff from granting themselves extra access.</div>
      </section>
    </div>
  </StaffShell>;
}
