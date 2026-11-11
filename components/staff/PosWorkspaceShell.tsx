"use client";

import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardList, FileText, Menu, Package, Settings, ShoppingCart, Store, Users, X } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { LOGO_URL } from "@/lib/brandImages";

type Props = { children: ReactNode; title: string; staffName?: string; staffRole?: string; toolbar?: ReactNode };

const links = [
  { href: "/staff/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/staff/pos/orders", label: "Orders", icon: ClipboardList },
  { href: "/staff/pos-catalogue", label: "Menu & Catalogue", icon: Package },
  { href: "/staff/inventory", label: "Inventory", icon: Store },
  { href: "#", label: "Customers", icon: Users },
  { href: "/staff/pos/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/staff/pos/reports", label: "Reports", icon: FileText },
  { href: "/staff/settings", label: "Settings", icon: Settings },
];

export default function PosWorkspaceShell({ children, title, staffName, staffRole, toolbar }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (mobile = false) => (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-[#211A17] px-3.5 py-5 text-[#D8D2CB]">
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <SafeImage src={LOGO_URL} alt="BigFoods" className="h-9 w-9 rounded-lg object-cover" />
        <div><p className="text-[17px] font-bold tracking-tight text-white">BigFoods</p><p className="mt-0.5 text-[9px] uppercase tracking-[.2em] text-[#A79B91]">Point of Sale</p></div>
      </div>
      <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.18em] text-[#8D8178]">Workspace</p>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/staff/pos" && pathname.startsWith(href + "/"));
          return <button key={label} disabled={href === "#"} onClick={() => { if (href !== "#") router.push(href); if (mobile) setMobileOpen(false); }} aria-current={active ? "page" : undefined}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12.5px] font-medium transition"
            style={{ background: active ? "rgba(255,106,0,.16)" : "transparent", color: active ? "#FFFFFF" : "#C0B5AC", borderLeft: active ? "3px solid #FF6A00" : "3px solid transparent" }}>
            <Icon size={17} strokeWidth={active ? 2.4 : 1.9} /><span>{label}</span>{href === "#" && <span className="ml-auto text-[9px] text-[#857970]">Soon</span>}
          </button>;
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 px-2 pt-4">
        <p className="truncate text-[11px] font-semibold text-white">{staffName || "Staff account"}</p>
        <p className="mt-1 text-[10px] capitalize text-[#A79B91]">{(staffRole || "POS staff").replace(/[_-]/g, " ")}</p>
      </div>
    </aside>
  );

  return <div className="min-h-screen bg-[#F7F4F0] text-[#29221E]">
    <div className="fixed inset-y-0 left-0 z-30 hidden md:flex">{sidebar()}</div>
    <div className="min-h-screen md:pl-[232px]">
      <header className="sticky top-0 z-20 flex min-h-[66px] flex-wrap items-center gap-3 border-b border-[#493A32] bg-[#211A17] px-3 py-2.5 text-white shadow-sm sm:px-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <button onClick={() => setMobileOpen(true)} aria-label="Open POS navigation" className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"><Menu size={19}/></button>
          <div><p className="text-[9px] uppercase tracking-[.2em] text-[#B7A99F]">BigFoods / POS</p><h1 className="mt-0.5 text-[14px] font-semibold">{title}</h1></div>
        </div>
        {toolbar && <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{toolbar}</div>}
        <div className="hidden shrink-0 text-right xl:block"><p className="max-w-[150px] truncate text-[11px] font-semibold">{staffName || "Staff account"}</p><p className="mt-0.5 text-[10px] capitalize text-[#B7A99F]">{(staffRole || "POS staff").replace(/[_-]/g, " ")}</p></div>
      </header>
      {children}
    </div>
    {mobileOpen && <div className="fixed inset-0 z-50 flex md:hidden"><button aria-label="Close POS navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/55"/><div className="relative h-full">{sidebar(true)}<button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="absolute right-3 top-5 rounded-lg p-2 text-white hover:bg-white/10"><X size={18}/></button></div></div>}
  </div>;
}
