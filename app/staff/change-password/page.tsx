"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export const dynamic = "force-dynamic";
export default function StaffChangePasswordPage() {
  const router = useRouter();
  const [currentPassword,setCurrentPassword] = useState("");
  const [newPassword,setNewPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(()=>{fetch("/api/bigfoods-staff/session",{cache:"no-store"}).then(async r=>{if(!r.ok) router.replace("/staff/login");}).catch(()=>router.replace("/staff/login"));},[router]);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if(newPassword.length<14){setError("Choose a password with at least 14 characters.");return;}
    if(newPassword!==confirmPassword){setError("The new passwords do not match.");return;}
    setBusy(true);
    try {
      const response=await fetch("/api/bigfoods-staff/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"change_password",current_password:currentPassword,new_password:newPassword})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Unable to change password");
      await fetch("/api/bigfoods-staff/session",{method:"DELETE"});
      router.replace("/staff/login");
      router.refresh();
    } catch(err) {setError(err instanceof Error?err.message:"Unable to change password");}
    finally {setBusy(false);}
  }
  return <main className="min-h-screen flex items-center justify-center bg-[#F7F4F0] px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">BigFoods central operations</p>
    <h1 className="mt-2 text-2xl font-semibold">Change your password</h1>
    <p className="mt-2 mb-6 text-sm text-gray-600">For security, staff accounts must use a new password of at least 14 characters.</p>
    <label className="mb-1 block text-sm font-medium">Temporary/current password</label><input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2.5"/>
    <label className="mb-1 block text-sm font-medium">New password</label><input required minLength={14} type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2.5"/>
    <label className="mb-1 block text-sm font-medium">Confirm new password</label><input required minLength={14} type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2.5"/>
    {error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Updating…":"Update password"}</button>
  </form></main>;
}
