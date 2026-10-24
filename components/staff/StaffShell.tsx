"use client";
import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, Menu, X, LogOut, ChevronRight, Bell } from "lucide-react";

export default function StaffShell({children, title, subtitle, staffName}:{children:ReactNode;title:string;subtitle?:string;staffName?:string}) {
  const pathname=usePathname(); const router=useRouter(); const [drawer,setDrawer]=useState(false);
  async function logout(){await fetch("/api/bigfoods-staff/session",{method:"DELETE"});router.replace("/staff/login");router.refresh();}
  const links=[{href:"/staff",label:"My dashboard",icon:LayoutDashboard},{href:"/staff/attendance",label:"Attendance & schedule",icon:CalendarCheck}];
  const nav=(mobile=false)=><nav className="space-y-1">{links.map(item=>{const active=pathname===item.href;const Icon=item.icon;return <button key={item.href} onClick={()=>{router.push(item.href);if(mobile)setDrawer(false);}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${active?"bg-orange-600 text-white shadow-sm":"text-[#D4CEC7] hover:bg-white/10 hover:text-white"}`}><Icon className="h-[18px] w-[18px]"/><span className="flex-1">{item.label}</span>{active&&<ChevronRight className="h-4 w-4"/>}</button>})}</nav>;
  return <div className="min-h-screen bg-[#F7F4F0] text-[#28231F]" style={{fontFamily:"Inter, ui-sans-serif, system-ui"}}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#211A17] px-4 py-6 md:flex">
      <div className="flex items-center gap-3 px-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 text-sm font-black text-white">B</div><div><p className="font-bold tracking-tight text-white">BigFoods</p><p className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-[#A99D93]">Staff workspace</p></div></div>
      <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8D8178]">Workspace</div>{nav()}
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.04] p-3"><p className="truncate text-sm font-semibold text-white">{staffName||"Team member"}</p><p className="mt-1 text-xs text-[#A99D93]">Employee account</p><button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[#D4CEC7] hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4"/>Sign out</button></div>
      <p className="px-2 pt-4 text-[10px] text-[#776C64]">BigFoods · Staff tools</p>
    </aside>
    <div className="md:pl-[248px]">
      <header className="sticky top-0 z-20 border-b border-[#E8E0D8] bg-white/95 backdrop-blur">
        <div className="flex h-[68px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3"><button className="grid h-10 w-10 place-items-center rounded-xl border border-[#E8E0D8] md:hidden" aria-label="Open navigation" onClick={()=>setDrawer(true)}><Menu className="h-5 w-5"/></button><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-700">BigFoods / Staff</p><h1 className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">{title}</h1></div></div>
          <div className="flex items-center gap-2"><div className="hidden rounded-xl bg-[#F7F4F0] px-3 py-2 text-xs text-[#786E66] sm:block">{staffName||"Staff account"}</div><button onClick={()=>router.push("/staff/attendance")} aria-label="Open attendance" className="grid h-10 w-10 place-items-center rounded-xl border border-[#E8E0D8] hover:bg-[#F7F4F0]"><Bell className="h-[18px] w-[18px] text-[#5E534B]"/></button><button onClick={logout} className="hidden rounded-xl border border-[#E8E0D8] px-3 py-2 text-sm font-semibold hover:bg-[#F7F4F0] sm:block">Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-7 sm:py-8"><div className="mb-6"><p className="text-sm text-[#81766D]">{subtitle||"Your workday, schedule and attendance in one place."}</p></div>{children}<footer className="mt-10 border-t border-[#E8E0D8] py-5 text-xs text-[#91867D]">BigFoods Staff Workspace <span className="mx-1">·</span> Secure employee access</footer></main>
    </div>
    {drawer&&<div className="fixed inset-0 z-50 flex md:hidden"><button aria-label="Close navigation" onClick={()=>setDrawer(false)} className="absolute inset-0 bg-black/45"/><aside className="relative flex h-full w-[290px] flex-col bg-[#211A17] px-4 py-6 shadow-2xl"><div className="mb-8 flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 font-black text-white">B</div><div><p className="font-bold text-white">BigFoods</p><p className="text-[10px] uppercase tracking-widest text-[#A99D93]">Staff workspace</p></div></div><button onClick={()=>setDrawer(false)} aria-label="Close menu" className="text-white"><X className="h-5 w-5"/></button></div><div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-[#8D8178]">Workspace</div>{nav(true)}<div className="mt-auto border-t border-white/10 pt-4"><p className="truncate px-2 text-sm font-semibold text-white">{staffName||"Team member"}</p><button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-3 text-sm text-[#D4CEC7]"><LogOut className="h-4 w-4"/>Sign out</button></div></aside></div>}
  </div>;
}