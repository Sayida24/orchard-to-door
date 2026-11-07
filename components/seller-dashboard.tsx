"use client";

import { useState } from "react";
import {
  LayoutDashboard, Sprout, Package, ScanLine, QrCode,
  Plus, Search, Bell, ChevronRight, Leaf, Truck,
  CheckCircle2, Clock, AlertTriangle, Eye, Menu,
} from "lucide-react";

type Tab = "Overview" | "Harvest batches" | "Orders & packing" | "AI inspection" | "QR verification";

const batches = [
  { id: "MB-2026-041", variety: "Himsagar", orchard: "Rajshahi Orchard", harvest: "05 Nov 2026", quantity: "240 kg", status: "Available", price: "৳120/kg" },
  { id: "MB-2026-042", variety: "Langra", orchard: "Chapainawabganj Farm", harvest: "04 Nov 2026", quantity: "180 kg", status: "Available", price: "৳100/kg" },
  { id: "MB-2026-043", variety: "Amrapali", orchard: "Dinajpur Orchard", harvest: "03 Nov 2026", quantity: "95 kg", status: "In review", price: "৳140/kg" },
];

const orders = [
  { id: "OR-2081", customer: "Nusrat Jahan", mango: "Himsagar", box: "5 kg", amount: "৳850", status: "Ready to pack" },
  { id: "OR-2082", customer: "Arif Rahman", mango: "Langra", box: "10 kg", amount: "৳1,250", status: "Packing" },
  { id: "OR-2083", customer: "Maliha Ahmed", mango: "Amrapali", box: "5 kg", amount: "৳950", status: "Awaiting inspection" },
];

const nav: { name: Tab; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Harvest batches", icon: Sprout },
  { name: "Orders & packing", icon: Package },
  { name: "AI inspection", icon: ScanLine },
  { name: "QR verification", icon: QrCode },
];

function Status({ value }: { value: string }) {
  const style = value === "Available" || value === "Delivered"
    ? "bg-emerald-50 text-emerald-700"
    : value === "In review" || value === "Awaiting inspection"
    ? "bg-amber-50 text-amber-700"
    : "bg-blue-50 text-blue-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{value}</span>;
}

function Metric({ label, value, note, icon: Icon }: {
  label: string; value: string; note: string; icon: typeof Package;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{label}</p>
        <span className="rounded-xl bg-amber-50 p-2 text-amber-700"><Icon size={19} /></span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </div>
  );
}

export function SellerDashboard({ sellerName }: { sellerName: string }) {
  const [active, setActive] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [inspection, setInspection] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 border-r border-stone-200 bg-white p-5 md:sticky md:top-0 md:block md:h-screen`}>
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white"><Leaf size={23} /></div>
            <div><p className="text-xl font-extrabold tracking-tight">orchiva<span className="text-amber-600">.</span></p><p className="text-xs text-stone-500">Mango seller portal</p></div>
          </div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-stone-400">Workspace</p>
          <nav className="space-y-1">
            {nav.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => { setActive(name); setMenuOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active === name ? "bg-amber-50 text-amber-800" : "text-stone-600 hover:bg-stone-50"}`}>
                <Icon size={18} />{name}
                {active === name && <ChevronRight className="ml-auto" size={16} />}
              </button>
            ))}
          </nav>
          <div className="mt-12 rounded-2xl bg-stone-900 p-4 text-white">
            <p className="text-sm font-semibold">Your orchard, your story.</p>
            <p className="mt-2 text-xs leading-5 text-stone-300">Help customers discover where their mangoes come from.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-300"><Leaf size={14} /> Orchiva harvest season</div>
          </div>
          <div className="absolute bottom-5 left-5 right-5 border-t border-stone-100 pt-4">
            <p className="text-sm font-semibold">{sellerName}</p>
            <p className="text-xs text-stone-500">Mango seller account</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 hover:bg-stone-100 md:hidden" onClick={() => setMenuOpen(!menuOpen)}><Menu size={21} /></button>
              <div><p className="text-xs text-stone-500">Seller workspace / {active}</p><p className="font-semibold">{active}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-stone-500 sm:block">Mango season 2026</span>
              <button className="relative rounded-full border border-stone-200 p-2"><Bell size={18} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" /></button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{sellerName.slice(0, 1).toUpperCase()}</div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {active === "Overview" && <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm font-medium text-amber-700">YOUR ORCHARD AT A GLANCE</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Good day, {sellerName}!</h1><p className="mt-2 text-sm text-stone-500">Here is what's happening with your mangoes today.</p></div>
                <button onClick={() => setActive("Harvest batches")} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400"><Plus size={17} /> New harvest batch</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Active batches" value="12" note="Across 4 mango varieties" icon={Sprout} />
                <Metric label="Orders received" value="38" note="8 need your attention" icon={Package} />
                <Metric label="Boxes to pack" value="14" note="Ready for packing" icon={Truck} />
                <Metric label="Harvest available" value="1,240 kg" note="Across your orchards" icon={Leaf} />
              </div>
              <div className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <section className="rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Recent harvest batches</h2><p className="mt-1 text-xs text-stone-500">Your latest mango harvest records</p></div><button onClick={() => setActive("Harvest batches")} className="text-sm font-semibold text-amber-700">View all</button></div>
                  <div className="space-y-4">{batches.slice(0, 3).map(b => <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4 last:border-0"><div><p className="font-semibold">{b.variety} <span className="text-xs font-normal text-stone-400">· {b.id}</span></p><p className="mt-1 text-xs text-stone-500">{b.orchard} · {b.quantity}</p></div><Status value={b.status} /></div>)}</div>
                </section>
                <section className="rounded-2xl border border-stone-200 bg-white p-5">
                  <h2 className="font-bold">Today's priorities</h2><p className="mt-1 text-xs text-stone-500">A few things to take care of</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3"><span className="rounded-xl bg-amber-50 p-2 text-amber-700"><Package size={18} /></span><div><p className="text-sm font-semibold">8 orders need attention</p><p className="text-xs text-stone-500">Review and prepare mango boxes</p></div></div>
                    <div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><ScanLine size={18} /></span><div><p className="text-sm font-semibold">3 boxes awaiting inspection</p><p className="text-xs text-stone-500">Complete the demo inspection workflow</p></div></div>
                    <div className="flex gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><QrCode size={18} /></span><div><p className="text-sm font-semibold">QR labels ready</p><p className="text-xs text-stone-500">Link boxes to their harvest batches</p></div></div>
                  </div>
                </section>
              </div>
            </>}

            {active === "Harvest batches" && <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Harvest batches</h1><p className="mt-1 text-sm text-stone-500">Track mango varieties, orchard origins and harvest quantities.</p></div><button className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold"><Plus size={17} /> Add batch</button></div>
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2"><Search size={17} className="text-stone-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search variety, orchard or batch ID..." className="w-full bg-transparent text-sm outline-none" /></div>
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500"><tr>{["Batch ID","Mango variety","Orchard","Harvest date","Quantity","Price","Status"].map(x => <th key={x} className="px-4 py-4 font-semibold">{x}</th>)}</tr></thead><tbody>{batches.filter(b => `${b.id} ${b.variety} ${b.orchard}`.toLowerCase().includes(search.toLowerCase())).map(b => <tr key={b.id} className="border-t border-stone-100"><td className="px-4 py-4 font-medium">{b.id}</td><td className="px-4 py-4 font-semibold">{b.variety}</td><td className="px-4 py-4">{b.orchard}</td><td className="px-4 py-4">{b.harvest}</td><td className="px-4 py-4">{b.quantity}</td><td className="px-4 py-4">{b.price}</td><td className="px-4 py-4"><Status value={b.status} /></td></tr>)}</tbody></table></div>
              <p className="mt-3 text-xs text-stone-400">Sample demonstration records — not connected to your database.</p>
            </>}

            {active === "Orders & packing" && <>
              <div className="mb-6"><h1 className="text-2xl font-bold">Orders & packing</h1><p className="mt-1 text-sm text-stone-500">Prepare 5 kg and 10 kg mango boxes for customers.</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><Metric label="New orders" value="8" note="Ready to review" icon={Package} /><Metric label="Packing in progress" value="6" note="Being prepared" icon={Clock} /><Metric label="Ready to dispatch" value="4" note="Awaiting pickup" icon={Truck} /></div>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500"><tr>{["Order","Customer","Mango","Box size","Amount","Status"].map(x => <th key={x} className="px-4 py-4">{x}</th>)}</tr></thead><tbody>{orders.map(o => <tr key={o.id} className="border-t border-stone-100"><td className="px-4 py-4 font-semibold">{o.id}</td><td className="px-4 py-4">{o.customer}</td><td className="px-4 py-4">{o.mango}</td><td className="px-4 py-4">{o.box}</td><td className="px-4 py-4">{o.amount}</td><td className="px-4 py-4"><Status value={o.status} /></td></tr>)}</tbody></table></div>
              <p className="mt-3 text-xs text-stone-400">Sample orders only. No real customer orders or payments are processed.</p>
            </>}

            {active === "AI inspection" && <>
              <div className="mb-6"><h1 className="text-2xl font-bold">Mango quality inspection</h1><p className="mt-1 text-sm text-stone-500">A visual preview of the future mango defect-check workflow.</p></div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-6"><div className="flex items-center gap-2"><ScanLine className="text-amber-700" /><h2 className="font-bold">Inspection demo</h2></div><div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-stone-100"><div className="text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-200 text-5xl">🥭</div><p className="mt-3 text-sm font-semibold text-stone-700">Mango sample preview</p><p className="text-xs text-stone-500">Demo image placeholder</p></div></div><button onClick={() => setInspection(true)} className="mt-5 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white hover:bg-stone-700">Run demo inspection</button>{inspection && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2" size={20} /><p className="font-bold">Demo inspection complete</p><p className="mt-1">Sample result: 8 healthy mangoes, 2 flagged for review.</p></div>}</div>
                <div className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="font-bold">Mango quality classes</h2><p className="mt-1 text-xs text-stone-500">Categories planned for the real inspection system</p><div className="mt-5 space-y-3">{["Healthy mango","Anthracnose","Scab","Alternaria"].map((x,i) => <div key={x} className="flex items-center justify-between rounded-xl bg-stone-50 p-4"><span className="text-sm font-medium">{x}</span><span className="text-xs text-stone-400">{i===0?"Accept":"Flag for review"}</span></div>)}</div><div className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={17} className="shrink-0" />This is a simulated frontend demonstration, not a real AI model or actual mango diagnosis.</div></div>
              </div>
            </>}

            {active === "QR verification" && <>
              <div className="mb-6"><h1 className="text-2xl font-bold">QR box verification</h1><p className="mt-1 text-sm text-stone-500">Preview the provenance details customers will see on their mango box.</p></div>
              <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                <div className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-7 text-center"><div className="rounded-2xl bg-stone-100 p-6"><QrCode size={120} strokeWidth={1.3} /></div><p className="mt-5 text-xs font-bold uppercase tracking-widest text-stone-400">Sample box code</p><p className="mt-1 text-2xl font-extrabold">ORC-HIM-2081</p><p className="mt-2 text-xs text-stone-500">Illustrative QR preview — not scannable</p></div>
                <div className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="font-bold">Box journey</h2><div className="mt-5 space-y-5"><div className="flex gap-3"><CheckCircle2 className="text-emerald-600" /><div><p className="text-sm font-semibold">Orchard origin</p><p className="text-xs text-stone-500">Rajshahi Orchard · Himsagar mangoes</p></div></div><div className="flex gap-3"><CheckCircle2 className="text-emerald-600" /><div><p className="text-sm font-semibold">Harvest batch</p><p className="text-xs text-stone-500">MB-2026-041 · 05 November 2026</p></div></div><div className="flex gap-3"><Clock className="text-amber-600" /><div><p className="text-sm font-semibold">Quality inspection</p><p className="text-xs text-stone-500">Awaiting real inspection integration</p></div></div><div className="flex gap-3"><Package className="text-stone-400" /><div><p className="text-sm font-semibold">Box packing</p><p className="text-xs text-stone-500">5 kg mango box · Sample record</p></div></div></div></div>
              </div>
            </>}
            <footer className="mt-10 border-t border-stone-200 pt-5 text-xs text-stone-400">Orchiva · Mangoes straight from the orchard · Seller dashboard demo</footer>
          </div>
        </main>
      </div>
    </div>
  );
}