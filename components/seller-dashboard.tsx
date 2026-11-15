"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Package,
  ScanLine,
  QrCode,
  Plus,
  Search,
  Bell,
  ChevronRight,
  Leaf,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Menu,
  Upload,
  ImagePlus,
  Film,
  Sparkles,
  ShieldCheck,
  X,
  FileCheck2,
  MapPin,
  Calendar,
  Check,
  LayoutGrid,
  List,
  Trash2,
  FileJson,
  Download,
  Copy,
  AlertCircle,
  Timer,
  RefreshCw,
  Info,
} from "lucide-react";

type Tab =
  | "Overview"
  | "Harvest batches"
  | "Orders & packing"
  | "AI inspection"
  | "QR verification"
  | "Orchard media";

interface BatchItem {
  id: string;
  variety: string;
  orchard: string;
  harvest: string;
  quantity: string;
  status: "Available" | "In review" | "Sold out";
  price: string;
  image?: string;
  brix?: string;
  chemicalFree?: boolean;
}

export const varietyImageMap: Record<string, string> = {
  Himsagar:
    "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80",
  Langra:
    "https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=800&q=80",
  Amrapali:
    "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80",
  Haribhanga: "/assets/aistudio/harivanga_a1ed99b3.jpeg",
  Fazli:
    "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80",
};

export interface OrderItem {
  id: string;
  customer: string;
  mango: string;
  box: string;
  amount: string;
  status: "Ready to pack" | "Packing" | "Awaiting inspection" | "Dispatched" | "Delivered";
  address?: string;
  phone?: string;
  batchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function formatBoxLabel(box: any): string {
  if (!box) return "5 kg crate";
  if (typeof box === "string") return box;
  if (typeof box === "number") return `${box} kg`;
  if (typeof box === "object") {
    if (box.weightKg) return `${box.weightKg} kg`;
    if (box.boxSizeKg) return `${box.boxSizeKg} kg`;
    if (box.name) return String(box.name);
    return "5 kg crate";
  }
  return String(box);
}

export function normalizeOrder(raw: any): OrderItem {
  if (!raw) {
    return {
      id: "OR-" + Math.floor(1000 + Math.random() * 9000),
      customer: "Customer",
      mango: "Himsagar",
      box: "5 kg",
      amount: "৳850",
      status: "Ready to pack",
    };
  }

  const id = raw.id || "OR-" + Math.floor(1000 + Math.random() * 9000);
  const customer = raw.customer || raw.customerName || "Customer";
  const mango = raw.mango || raw.varietyName || "Himsagar";
  const box = formatBoxLabel(raw.box || raw.boxSizeKg || "5 kg");

  let amount = "৳0";
  if (typeof raw.amount === "string") {
    amount = raw.amount;
  } else if (typeof raw.totalPrice === "number") {
    amount = `৳${raw.totalPrice.toLocaleString()}`;
  } else if (typeof raw.amount === "number") {
    amount = `৳${raw.amount.toLocaleString()}`;
  }

  let status: OrderItem["status"] = "Ready to pack";
  if (raw.status === "PLACED") status = "Ready to pack";
  else if (raw.status === "PACKED") status = "Awaiting inspection";
  else if (raw.status === "DISPATCHED") status = "Dispatched";
  else if (raw.status === "DELIVERED") status = "Delivered";
  else if (
    raw.status === "Ready to pack" ||
    raw.status === "Packing" ||
    raw.status === "Awaiting inspection" ||
    raw.status === "Dispatched" ||
    raw.status === "Delivered"
  ) {
    status = raw.status;
  }

  return {
    id,
    customer,
    mango,
    box,
    amount,
    status,
    address: raw.address,
    phone: raw.phone || raw.customerPhone,
    batchId: raw.batchId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

const initialBatches: BatchItem[] = [
  {
    id: "MB-2026-041",
    variety: "Himsagar",
    orchard: "Kansat Heritage Groves (Rajshahi)",
    harvest: "05 Nov 2026",
    quantity: "240 kg",
    status: "Available",
    price: "৳120/kg",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80",
    brix: "21.4° Brix",
    chemicalFree: true,
  },
  {
    id: "MB-2026-042",
    variety: "Langra",
    orchard: "Chapainawabganj Farm",
    harvest: "04 Nov 2026",
    quantity: "180 kg",
    status: "Available",
    price: "৳100/kg",
    image: "https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=800&q=80",
    brix: "19.8° Brix",
    chemicalFree: true,
  },
  {
    id: "MB-2026-043",
    variety: "Amrapali",
    orchard: "Dinajpur Orchard",
    harvest: "03 Nov 2026",
    quantity: "95 kg",
    status: "In review",
    price: "৳140/kg",
    image: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80",
    brix: "22.6° Brix",
    chemicalFree: true,
  },
  {
    id: "MB-2026-044",
    variety: "Haribhanga",
    orchard: "Rangpur Mithapukur Grove",
    harvest: "02 Nov 2026",
    quantity: "310 kg",
    status: "Available",
    price: "৳130/kg",
    image: "/assets/aistudio/harivanga_a1ed99b3.jpeg",
    brix: "20.2° Brix",
    chemicalFree: true,
  },
];

// Orders will be fetched from database
export const initialOrders: OrderItem[] = [];

export interface PreHarvestVideoRecord {
  id: string;
  batchId: string;
  variety: string;
  orchardName: string;
  branchTag: string;
  videoTitle: string;
  videoUrl: string;
  videoFileName: string;
  fileSizeBytes: number;
  uploadedAt: string; // ISO string
  expiresAt: string;  // ISO string (+48 hours)
  ttlHours: number;   // 48
  status: "ACTIVE" | "EXPIRED" | "DELIVERY_COMPLETED";
  isDelivered: boolean;
  notes?: string;
}

// Videos will be fetched from database or uploaded via 2-day cache
export const initialPreHarvestVideos: PreHarvestVideoRecord[] = [];

export function formatVideoTimeRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      expired: true,
      label: "Expired (48h reached)",
      hoursRemaining: 0,
      percentRemaining: 0,
    };
  }
  const totalMs = 48 * 3600 * 1000;
  const hours = Math.floor(diffMs / (1000 * 3600));
  const minutes = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));
  const percent = Math.max(0, Math.min(100, Math.round((diffMs / totalMs) * 100)));
  return {
    expired: false,
    label: `${hours}h ${minutes}m left (max 2 days)`,
    hoursRemaining: hours,
    percentRemaining: percent,
  };
}

const nav: { name: Tab; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Harvest batches", icon: Sprout },
  { name: "Orders & packing", icon: Package },
  { name: "AI inspection", icon: ScanLine },
  { name: "QR verification", icon: QrCode },
  { name: "Orchard media", icon: Upload },
];

function Status({ value }: { value: string }) {
  const style =
    value === "Available" || value === "Dispatched"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : value === "In review" || value === "Awaiting inspection"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-blue-50 text-blue-700 border border-blue-200";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {value}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Package;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-[#f2f8f4] via-[#fafdfb] to-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-[#086e36]/40 hover:shadow-md">
      {/* Signature top accent bar in rgb(8, 110, 54) */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-200 group-hover:h-1.5"
        style={{ backgroundColor: "rgb(8, 110, 54)" }}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {label}
        </p>
        <span
          style={{ backgroundColor: "rgb(8, 110, 54)" }}
          className="rounded-xl p-2.5 text-white shadow-2xs transition duration-200 group-hover:scale-105"
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        style={{ color: "rgb(8, 110, 54)" }}
        className="mt-3 text-3xl font-extrabold tracking-tight"
      >
        {value}
      </p>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: "rgb(8, 110, 54)" }}
        />
        <span className="truncate">{note}</span>
      </div>
    </div>
  );
}

export interface SellerDashboardProps {
  sellerName?: string;
  batches?: any[];
  orders?: any[];
  onAddBatch?: (batchData: any) => void;
  onBoxPacked?: (orderId: string, box: any) => void;
  onDispatchOrder?: (orderId: string) => void;
  onOpenBoxProvenance?: (box: any) => void;
  onRefreshOrders?: () => Promise<void>;
  apiUrl?: string;
  onUpdateOrderStatusDb?: (orderId: string, status: OrderItem["status"]) => Promise<void>;
}

export function SellerDashboard({
  sellerName = "Haji Rafiqul Islam",
  orders,
  onRefreshOrders,
  apiUrl,
  onUpdateOrderStatusDb,
}: SellerDashboardProps) {
  const [active, setActive] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Batches state
  const [batchList, setBatchList] = useState<BatchItem[]>(initialBatches);
  const [batchViewMode, setBatchViewMode] = useState<"cards" | "table">("cards");
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newVariety, setNewVariety] = useState("Himsagar");
  const [newOrchard, setNewOrchard] = useState("Kansat Heritage Groves");
  const [newQuantity, setNewQuantity] = useState("200 kg");
  const [newPrice, setNewPrice] = useState("৳125/kg");

  // Orders state - initialized from database prop if provided, else fallback to initialOrders
  const [orderList, setOrderList] = useState<OrderItem[]>(() => {
    if (orders && orders.length > 0) return orders.map(normalizeOrder);
    return initialOrders.map(normalizeOrder);
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Sync state whenever parent database passes updated orders
  useEffect(() => {
    if (orders) {
      setOrderList(orders.map(normalizeOrder));
    }
  }, [orders]);

  const [packingModalOrder, setPackingModalOrder] = useState<OrderItem | null>(
    null
  );

  // AI Inspection state
  const [inspectionActive, setInspectionActive] = useState(false);
  const [inspectionStep, setInspectionStep] = useState<
    "idle" | "scanning" | "completed"
  >("idle");
  const [inspectionResult, setInspectionResult] = useState<{
    mangoesFound: number;
    anthracnose: number;
    scab: number;
    score: number;
    passed: boolean;
  } | null>(null);

  // QR Verification state
  const [qrCodeInput, setQrCodeInput] = useState("QR-MB2026-8819");
  const [verifiedBox, setVerifiedBox] = useState<any>(null);

  // Media upload previews state
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Next.js hydration guard
  const [isMounted, setIsMounted] = useState(false);

  // Pre-Harvest Orchard Videos (2-Day Max TTL & JSON storage)
  const [preHarvestVideos, setPreHarvestVideos] = useState<PreHarvestVideoRecord[]>(initialPreHarvestVideos);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("orchiva_preharvest_videos_json");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPreHarvestVideos(parsed);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [selectedBatchForVideo, setSelectedBatchForVideo] = useState("MB-2026-042");
  const [videoBranchTagInput, setVideoBranchTagInput] = useState("Branch #B-22: Ripened under sunshine, pesticide-free");
  const [videoTitleInput, setVideoTitleInput] = useState("Pre-Harvest Langra Orchard Inspection");
  const [videoFileInput, setVideoFileInput] = useState<File | null>(null);
  const [renewalNotice, setRenewalNotice] = useState<string | null>(null);
  const [copiedJsonToast, setCopiedJsonToast] = useState(false);

  // Sync JSON to localStorage (only client-side after mount)
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(
        "orchiva_preharvest_videos_json",
        JSON.stringify(preHarvestVideos, null, 2)
      );
    } catch {
      // Ignore quota/private mode errors
    }
  }, [preHarvestVideos, isMounted]);

  // Handler: Delete video post-delivery & enforce new video update for next batch
  const handleDeletePostDeliveryVideo = (videoId: string, batchId: string, variety: string) => {
    setPreHarvestVideos((prev) => prev.filter((v) => v.id !== videoId));
    setRenewalNotice(
      `Video for ${variety} (${batchId}) was deleted following completed delivery. Per 2-day policy, please upload a fresh pre-harvest video for the upcoming batch.`
    );
    setSelectedBatchForVideo(batchId);
    setShowVideoUploadModal(true);
  };

  // Handler: Simulate 48h expiration
  const handleSimulateFastForwardExpiry = (videoId: string) => {
    setPreHarvestVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
              status: "EXPIRED" as const,
            }
          : v
      )
    );
  };

  // Handler: Simulate marking delivery completed
  const handleMarkBatchDeliveryCompleted = (batchId: string) => {
    setPreHarvestVideos((prev) =>
      prev.map((v) =>
        v.batchId === batchId
          ? {
              ...v,
              status: "DELIVERY_COMPLETED" as const,
              isDelivered: true,
              notes: "Batch delivery completed! Must delete old pre-harvest video and upload a new video for the new batch.",
            }
          : v
      )
    );
  };

  // Handler: Upload new Pre-Harvest Video and serialize to JSON
  const handleSavePreHarvestVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batchList.find((b) => b.id === selectedBatchForVideo) || batchList[0];
    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 3600 * 1000); // exactly 48h (2 days)

    const newVideoRecord: PreHarvestVideoRecord = {
      id: `VID-2026-80${preHarvestVideos.length + 5}`,
      batchId: batch.id,
      variety: batch.variety,
      orchardName: batch.orchard,
      branchTag: videoBranchTagInput || `Branch #B-0${preHarvestVideos.length + 1}`,
      videoTitle: videoTitleInput || `Pre-Harvest ${batch.variety} Tree Inspection`,
      videoUrl: videoPreview || "https://assets.mixkit.co/videos/preview/mixkit-farmer-walking-through-a-sunny-field-42702-large.mp4",
      videoFileName: videoFileInput?.name || `preharvest_${batch.variety.toLowerCase()}_tree.mp4`,
      fileSizeBytes: videoFileInput?.size || 4950000,
      uploadedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      ttlHours: 48,
      status: "ACTIVE",
      isDelivered: false,
      notes: "Captured prior to harvesting. Stored as JSON with 48h expiration.",
    };

    setPreHarvestVideos([newVideoRecord, ...preHarvestVideos.filter((v) => v.batchId !== batch.id)]);
    setShowVideoUploadModal(false);
    setVideoPreview(null);
    setRenewalNotice(null);
  };

  useEffect(() => {
    if (!videoPreview) return;
    return () => {
      URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const handleVideoChange = (file: File | undefined) => {
    if (file) {
      setVideoFileInput(file);
      setVideoPreview(URL.createObjectURL(file));
    } else {
      setVideoFileInput(null);
      setVideoPreview(null);
    }
  };

  const handlePhotoChange = (files: FileList | null) => {
    const urls = files
      ? Array.from(files).map((file) => URL.createObjectURL(file))
      : [];
    setPhotoPreviews(urls);
  };

  // Add new batch handler
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `MB-2026-0${batchList.length + 42}`;
    const newBatch: BatchItem = {
      id: newId,
      variety: newVariety,
      orchard: newOrchard,
      harvest: "Today (Just Harvested)",
      quantity: newQuantity,
      status: "Available",
      price: newPrice,
      image: varietyImageMap[newVariety] || varietyImageMap["Himsagar"],
      brix: "21.0° Brix",
      chemicalFree: true,
    };
    setBatchList([newBatch, ...batchList]);
    setShowAddBatchModal(false);
    setActive("Harvest batches");
  };

  // Order status progression with database sync support
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderItem["status"]
  ) => {
    // 1. Optimistic UI state update
    setOrderList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (packingModalOrder && packingModalOrder.id === orderId) {
      setPackingModalOrder(null);
    }

    // 2. Persist to database if callback or apiUrl is configured
    if (onUpdateOrderStatusDb) {
      try {
        await onUpdateOrderStatusDb(orderId, newStatus);
      } catch (err) {
        console.error("Database update error:", err);
      }
    } else if (apiUrl) {
      try {
        await fetch(`${apiUrl}/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (err) {
        console.error("API update error:", err);
      }
    }
  };

  // Run AI Inspection simulator
  const handleRunInspection = () => {
    setInspectionStep("scanning");
    setTimeout(() => {
      setInspectionResult({
        mangoesFound: 12,
        anthracnose: 0,
        scab: 0,
        score: 99.2,
        passed: true,
      });
      setInspectionStep("completed");
    }, 1200);
  };

  // QR Lookup simulator
  const handleVerifyQR = () => {
    setVerifiedBox({
      qrId: qrCodeInput || "QR-MB2026-8819",
      boxNumber: "#BOX-772-KANSAT",
      variety: "Himsagar (GI Certified)",
      weight: "5.1 kg (12 Export Grade mangoes)",
      orchard: "Kansat Royal Heritage Groves, Chapainawabganj",
      farmer: sellerName,
      harvestTimestamp: "05 Nov 2026, 06:15 AM BST",
      packingTimestamp: "05 Nov 2026, 09:30 AM BST",
      aiInspectionScore: "99.4% (Anthracnose Free / Chemical Free)",
      courierTracking: "STEADFAST-EXP-88914",
    });
  };

  // Filtered batches
  const filteredBatches = batchList.filter(
    (b) =>
      b.variety.toLowerCase().includes(search.toLowerCase()) ||
      b.orchard.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? "block" : "hidden"
          } fixed inset-y-0 left-0 z-30 w-64 border-r border-stone-200 bg-white p-5 shadow-xl md:sticky md:top-0 md:block md:h-screen md:shadow-none`}
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500 p-2 text-white shadow-xs">
                <Leaf size={23} />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  orchiva<span className="text-amber-600">.</span>
                </p>
                <p className="text-xs text-stone-500">Mango seller portal</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-stone-400">
            Workspace
          </p>
          <nav className="space-y-1">
            {nav.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => {
                  setActive(name);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  active === name
                    ? "bg-amber-50 text-amber-800 shadow-xs"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                <Icon size={18} />
                {name}
                {active === name && (
                  <ChevronRight className="ml-auto" size={16} />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-stone-900 p-4 text-white shadow-md">
            <p className="text-sm font-semibold">Your orchard, your story.</p>
            <p className="mt-2 text-xs leading-5 text-stone-300">
              Help customers discover where their mangoes come from with video &
              AI inspection.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-300">
              <Leaf size={14} /> Orchiva harvest season 2026
            </div>
          </div>

          <div className="mt-8 border-t border-stone-100 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800">
                {sellerName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-900">
                  {sellerName}
                </p>
                <p className="text-xs text-stone-500">Verified Mango Grower</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg p-2 hover:bg-stone-100 md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu size={21} />
              </button>
              <div>
                <p className="text-xs text-stone-500">
                  Seller workspace / {active}
                </p>
                <p className="font-bold text-stone-900">{active}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-block">
                ● Live Harvest Season 2026
              </span>
              <button className="relative rounded-full border border-stone-200 p-2 text-stone-600 hover:bg-stone-50">
                <Bell size={18} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                {sellerName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {/* TAB 1: OVERVIEW */}
            {active === "Overview" && (
              <>
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      YOUR ORCHARD AT A GLANCE
                    </p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
                      Good day, {sellerName}!
                    </h1>
                    <p className="mt-1 text-sm text-stone-500">
                      Here is what's happening with your mango crops and packing
                      orders today.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddBatchModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-stone-950 shadow-sm transition hover:bg-amber-400"
                  >
                    <Plus size={17} /> New harvest batch
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Active batches"
                    value={batchList.length.toString()}
                    note="Across your orchards"
                    icon={Sprout}
                  />
                  <Metric
                    label="Orders received"
                    value={orderList.length.toString()}
                    note={`${orderList.filter((o) => o.status === "Ready to pack").length} need packing`}
                    icon={Package}
                  />
                  <Metric
                    label="Boxes to pack"
                    value={orderList
                      .filter((o) => o.status === "Ready to pack" || o.status === "Packing")
                      .length.toString()}
                    note="Ready for straw padding"
                    icon={Truck}
                  />
                  <Metric
                    label="Harvest available"
                    value="1,240 kg"
                    note="Tree-ripened, ready to cut"
                    icon={Leaf}
                  />
                </div>

                <div className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                  {/* Left column: Batches Cards */}
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-stone-900">
                          Recent harvest batches
                        </h2>
                        <p className="text-xs text-stone-500">
                          Tree-ripened picking batches ready for wooden crate packing
                        </p>
                      </div>
                      <button
                        onClick={() => setActive("Harvest batches")}
                        className="text-xs font-bold text-amber-700 hover:underline"
                      >
                        View all ({batchList.length}) →
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {batchList.slice(0, 4).map((b) => {
                        const bgImage =
                          b.image ||
                          varietyImageMap[b.variety] ||
                          varietyImageMap["Himsagar"];
                        const linkedVideo = preHarvestVideos.find((v) => v.batchId === b.id);
                        const linkedTimer = linkedVideo
                          ? formatVideoTimeRemaining(linkedVideo.expiresAt)
                          : null;
                        const isDeliveryDone =
                          linkedVideo?.status === "DELIVERY_COMPLETED" || linkedVideo?.isDelivered;

                        return (
                          <div
                            key={b.id}
                            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                          >
                            {/* Card Image Banner */}
                            <div className="relative h-36 w-full overflow-hidden bg-stone-100">
                              <img
                                src={bgImage}
                                alt={b.variety}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />

                              {/* Top Bar inside Image */}
                              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                                <span className="rounded-md bg-stone-900/75 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-100 backdrop-blur-xs">
                                  {b.id}
                                </span>
                                <Status value={b.status} />
                              </div>

                              {/* Bottom Details inside Image */}
                              <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-white">
                                <div>
                                  <h3 className="text-base font-extrabold tracking-tight drop-shadow-xs">
                                    {b.variety}
                                  </h3>
                                  <p className="flex items-center gap-1 text-[11px] text-stone-200">
                                    <MapPin size={11} className="text-amber-400 shrink-0" />
                                    <span className="truncate max-w-[140px]">{b.orchard}</span>
                                  </p>
                                </div>
                                <span className="rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-stone-950 backdrop-blur-xs">
                                  {b.brix || "21° Brix"}
                                </span>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="flex flex-1 flex-col justify-between p-4">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs text-stone-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={13} className="text-stone-400" />
                                    {b.harvest}
                                  </span>
                                  <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                    <Leaf size={12} /> Chemical-free
                                  </span>
                                </div>

                                {/* Stock & Price Panel */}
                                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-2.5">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                      Available
                                    </p>
                                    <p className="text-sm font-extrabold text-stone-900">
                                      {b.quantity}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                      Farm Price
                                    </p>
                                    <p className="text-sm font-extrabold text-amber-700">
                                      {b.price}
                                    </p>
                                  </div>
                                </div>

                                {/* 2-Day Pre-Harvest Video Status */}
                                <div className="rounded-lg bg-stone-50/80 p-2 border border-stone-100 flex items-center justify-between text-[11px]">
                                  <span className="text-stone-500 flex items-center gap-1">
                                    <Film size={12} className="text-amber-600" />
                                    Pre-Harvest Video:
                                  </span>
                                  {isMounted && linkedVideo ? (
                                    isDeliveryDone ? (
                                      <span className="font-bold text-amber-700">
                                        Delete & Renew Required
                                      </span>
                                    ) : linkedTimer?.expired ? (
                                      <span className="font-bold text-rose-600">
                                        Expired (48h max)
                                      </span>
                                    ) : (
                                      <span
                                        suppressHydrationWarning
                                        className="font-semibold text-emerald-700 flex items-center gap-1"
                                      >
                                        <Timer size={11} /> {linkedTimer?.hoursRemaining}h left
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-stone-400">None uploaded</span>
                                  )}
                                </div>
                              </div>

                              {/* Card Action Footer */}
                              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                                <button
                                  onClick={() => setActive("Orchard media")}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-amber-800"
                                >
                                  <Film size={13} className="text-amber-600" />
                                  <span>{linkedVideo ? "Watch Video" : "Add Video"}</span>
                                </button>
                                <button
                                  onClick={() => setActive("Orders & packing")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 transition hover:bg-amber-400 shadow-2xs"
                                >
                                  <Package size={13} />
                                  <span>Pack Box</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Right column: Orders queue */}
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-stone-900">
                          Packing Queue
                        </h2>
                        <p className="text-xs text-stone-500">
                          Customer boxes to pack & seal
                        </p>
                      </div>
                      <button
                        onClick={() => setActive("Orders & packing")}
                        className="text-xs font-bold text-amber-700 hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-3">
                      {orderList.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 py-10 px-4 text-center">
                          <Package className="mx-auto text-stone-300 mb-2" size={28} />
                          <p className="font-bold text-sm text-stone-700">No Orders in Packing Queue</p>
                          <p className="mt-1 text-xs text-stone-400 max-w-xs mx-auto">
                            Customer orders will automatically appear here once fetched from your database.
                          </p>
                        </div>
                      ) : (
                        orderList.map((o) => (
                          <div
                            key={o.id}
                            className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-stone-900">
                                  {o.customer}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {o.id} · {o.mango} ({formatBoxLabel(o.box)})
                                </p>
                              </div>
                              <Status value={o.status} />
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-stone-200/60 pt-2 text-xs">
                              <span className="font-bold text-stone-700">
                                {o.amount}
                              </span>
                              {o.status === "Ready to pack" && (
                                <button
                                  onClick={() => setPackingModalOrder(o)}
                                  className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-stone-950 hover:bg-amber-400"
                                >
                                  Pack Box
                                </button>
                              )}
                              {o.status === "Packing" && (
                                <button
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      o.id,
                                      "Awaiting inspection"
                                    )
                                  }
                                  className="rounded-lg bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-500"
                                >
                                  Send to AI Scan
                                </button>
                              )}
                              {o.status === "Awaiting inspection" && (
                                <button
                                  onClick={() => {
                                    setActive("AI inspection");
                                  }}
                                  className="rounded-lg bg-purple-600 px-3 py-1 font-bold text-white hover:bg-purple-500"
                                >
                                  Run YOLO Scan
                                </button>
                              )}
                              {o.status === "Dispatched" && (
                                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                  <Check size={14} /> Ready for delivery
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* TAB 2: HARVEST BATCHES */}
            {active === "Harvest batches" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
                      Harvest Batches
                    </h1>
                    <p className="text-xs text-stone-500">
                      Manage picking records, kg available, pricing, and 360°
                      inspection links.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100 p-1">
                      <button
                        onClick={() => setBatchViewMode("cards")}
                        className={`rounded-lg p-1.5 transition ${
                          batchViewMode === "cards"
                            ? "bg-white text-amber-700 shadow-xs"
                            : "text-stone-500 hover:text-stone-900"
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        onClick={() => setBatchViewMode("table")}
                        className={`rounded-lg p-1.5 transition ${
                          batchViewMode === "table"
                            ? "bg-white text-amber-700 shadow-xs"
                            : "text-stone-500 hover:text-stone-900"
                        }`}
                        title="Table View"
                      >
                        <List size={15} />
                      </button>
                    </div>

                    <div className="relative">
                      <Search
                        className="absolute left-3 top-2.5 text-stone-400"
                        size={17}
                      />
                      <input
                        type="text"
                        placeholder="Search variety, orchard..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddBatchModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                    >
                      <Plus size={15} /> Add Harvest Batch
                    </button>
                  </div>
                </div>

                {batchViewMode === "cards" ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {filteredBatches.map((b) => {
                      const bgImage =
                        b.image ||
                        varietyImageMap[b.variety] ||
                        varietyImageMap["Himsagar"];
                      return (
                        <div
                          key={b.id}
                          className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                        >
                          <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                            <img
                              src={bgImage}
                              alt={b.variety}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />

                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                              <span className="rounded-md bg-stone-900/80 px-2 py-0.5 font-mono text-xs font-bold text-stone-100 backdrop-blur-xs">
                                {b.id}
                              </span>
                              <Status value={b.status} />
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                              <div>
                                <h3 className="text-lg font-extrabold tracking-tight drop-shadow-xs">
                                  {b.variety}
                                </h3>
                                <p className="flex items-center gap-1 text-xs text-stone-200">
                                  <MapPin size={12} className="text-amber-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{b.orchard}</span>
                                </p>
                              </div>
                              <span className="rounded-md bg-amber-500/95 px-2 py-0.5 text-xs font-extrabold text-stone-950">
                                {b.brix || "21° Brix"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col justify-between p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-stone-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={13} className="text-stone-400" />
                                  {b.harvest}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                                  <Leaf size={12} /> Chemical-free
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-center">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Stock Left
                                  </p>
                                  <p className="text-sm font-extrabold text-stone-900">
                                    {b.quantity}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Price / kg
                                  </p>
                                  <p className="text-sm font-extrabold text-amber-700">
                                    {b.price}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                              <button
                                onClick={() => setActive("Orchard media")}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-800"
                              >
                                <Film size={14} className="text-amber-600" />
                                <span>360° Media</span>
                              </button>
                              <button
                                onClick={() => setActive("Orders & packing")}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 transition hover:bg-amber-400 shadow-2xs"
                              >
                                <Package size={14} />
                                <span>Pack Crate</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Batch ID</th>
                          <th className="p-4">Variety</th>
                          <th className="p-4">Orchard Grove</th>
                          <th className="p-4">Harvest Date</th>
                          <th className="p-4">Quantity</th>
                          <th className="p-4">Price / kg</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredBatches.map((b) => (
                          <tr key={b.id} className="hover:bg-stone-50/70">
                            <td className="p-4 font-mono font-bold text-stone-900">
                              {b.id}
                            </td>
                            <td className="p-4 font-bold text-stone-900">
                              {b.variety}
                            </td>
                            <td className="p-4 text-stone-600">{b.orchard}</td>
                            <td className="p-4 text-stone-500">{b.harvest}</td>
                            <td className="p-4 font-extrabold text-stone-900">
                              {b.quantity}
                            </td>
                            <td className="p-4 font-bold text-amber-700">
                              {b.price}
                            </td>
                            <td className="p-4">
                              <Status value={b.status} />
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setActive("Orchard media");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                              >
                                <Film size={13} /> Media
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ORDERS & PACKING */}
            {active === "Orders & packing" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
                      Orders & Wooden Box Packing
                    </h1>
                    <p className="text-xs text-stone-500">
                      Pack heritage mangoes in ventilated pinewood boxes with
                      paddy straw cushion.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {orderList.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
                      <div className="rounded-2xl bg-amber-50 p-4 text-amber-600 mb-3">
                        <Package size={34} />
                      </div>
                      <h3 className="text-base font-bold text-stone-900">No Orders in Database</h3>
                      <p className="mt-1 text-xs text-stone-500 max-w-md">
                        Your database has no pending orders right now. When customer orders are fetched from your database, they will appear here with pine crate size, customer destination, and packaging workflow.
                      </p>
                    </div>
                  ) : (
                    orderList.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-stone-400">
                            {o.id}
                          </span>
                          <h3 className="text-base font-bold text-stone-900">
                            {o.customer}
                          </h3>
                          <p className="mt-0.5 text-xs text-stone-500">
                            Destination: {o.address || "Dhaka Metropolitan Area"}
                          </p>
                        </div>
                        <Status value={o.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 text-center">
                        <div>
                          <p className="text-[10px] uppercase text-stone-400 font-bold">
                            Variety
                          </p>
                          <p className="text-xs font-bold text-stone-800">
                            {o.mango}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-stone-400 font-bold">
                            Crate Size
                          </p>
                          <p className="text-xs font-bold text-stone-800">
                            {formatBoxLabel(o.box)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-stone-400 font-bold">
                            Total Value
                          </p>
                          <p className="text-xs font-bold text-amber-700">
                            {o.amount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <Package size={15} /> Pinewood Crate + Straw
                        </div>
                        <div className="flex gap-2">
                          {o.status === "Ready to pack" && (
                            <button
                              onClick={() => setPackingModalOrder(o)}
                              className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                            >
                              Pack Box
                            </button>
                          )}
                          {o.status === "Packing" && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(
                                  o.id,
                                  "Awaiting inspection"
                                )
                              }
                              className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
                            >
                              Send to AI Scan
                            </button>
                          )}
                          {o.status === "Awaiting inspection" && (
                            <button
                              onClick={() => {
                                setActive("AI inspection");
                              }}
                              className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                            >
                              Run YOLO Scan
                            </button>
                          )}
                          {o.status === "Dispatched" && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-emerald-700">
                                ✓ Dispatched
                              </span>
                              <button
                                onClick={() => {
                                  handleUpdateOrderStatus(o.id, "Delivered" as any);
                                  const matchingBatch = batchList.find((b) =>
                                    b.variety.toLowerCase().includes(o.mango.toLowerCase())
                                  );
                                  if (matchingBatch) {
                                    handleMarkBatchDeliveryCompleted(matchingBatch.id);
                                    setRenewalNotice(
                                      `Delivery completed for ${matchingBatch.variety} (${matchingBatch.id})! Under our 2-day policy, delete the pre-harvest video and upload a new video for the upcoming batch.`
                                    );
                                  }
                                }}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 shadow-2xs"
                                title="Mark delivered and trigger 2-day video renewal policy"
                              >
                                Mark Delivered
                              </button>
                            </div>
                          )}
                          {o.status === ("Delivered" as any) && (
                            <span className="text-xs font-bold text-stone-500">
                              ✓ Delivered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            )}

            {/* TAB 4: AI INSPECTION */}
            {active === "AI inspection" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
                    AI Defect Inspection (YOLOv8)
                  </h1>
                  <p className="text-xs text-stone-500">
                    Automated defect detection for open crates. Flags
                    Anthracnose, Scab, or bruising before the box is sealed.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  {/* Left: Box Scanner viewport */}
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 text-white p-6 shadow-md relative">
                    <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <ScanLine className="text-amber-400" size={18} />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                          YOLOv8 Crate Scanner v2.4
                        </span>
                      </div>
                      <span className="rounded-full bg-stone-800 px-3 py-0.5 text-[10px] font-mono text-stone-300">
                        Crate #BX-K72-04
                      </span>
                    </div>

                    <div className="my-6 relative flex flex-col items-center justify-center rounded-xl bg-stone-950/80 p-8 border border-stone-800">
                      {/* Simulated Crate Photo */}
                      <div className="relative w-full max-w-md aspect-4/3 rounded-lg overflow-hidden border border-stone-700">
                        <img
                          src="https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=700&q=80"
                          alt="Open Crate Mangoes"
                          className="w-full h-full object-cover"
                        />

                        {/* YOLO Bounding Box Overlays */}
                        {inspectionStep !== "idle" && (
                          <>
                            <div className="absolute top-[20%] left-[15%] w-[35%] h-[35%] border-2 border-emerald-400 rounded-md bg-emerald-500/15 flex items-start p-1">
                              <span className="bg-emerald-500 text-stone-950 font-mono text-[9px] font-bold px-1 rounded">
                                Mango 99.4% [Clear]
                              </span>
                            </div>
                            <div className="absolute top-[30%] right-[15%] w-[38%] h-[40%] border-2 border-emerald-400 rounded-md bg-emerald-500/15 flex items-start p-1">
                              <span className="bg-emerald-500 text-stone-950 font-mono text-[9px] font-bold px-1 rounded">
                                Mango 98.9% [Clear]
                              </span>
                            </div>
                          </>
                        )}

                        {inspectionStep === "scanning" && (
                          <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                            <div className="animate-pulse flex flex-col items-center gap-2">
                              <Sparkles className="animate-spin text-amber-400" size={32} />
                              <span className="text-xs font-mono font-bold text-amber-300">
                                Scanning pixels for fungal spots...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-stone-400">
                        Takes 12 MP photo upon straw placement.
                      </p>
                      <button
                        onClick={handleRunInspection}
                        disabled={inspectionStep === "scanning"}
                        className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                      >
                        {inspectionStep === "scanning"
                          ? "Scanning Box..."
                          : "Run YOLOv8 Scan"}
                      </button>
                    </div>
                  </div>

                  {/* Right: Inspection Report */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                    <h2 className="text-lg font-bold text-stone-900">
                      Defect Diagnostic Report
                    </h2>
                    <p className="text-xs text-stone-500">
                      Standardized threshold checks per Bangladesh Agricultural
                      Research Council (BARC).
                    </p>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3.5">
                        <span className="text-xs font-semibold text-stone-700">
                          Fruit count in crate
                        </span>
                        <span className="font-mono text-sm font-bold text-stone-900">
                          {inspectionResult ? `${inspectionResult.mangoesFound} units` : "12 units"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3.5">
                        <span className="text-xs font-semibold text-stone-700">
                          Anthracnose (Black Spots)
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={14} /> 0.0% (Zero Detected)
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3.5">
                        <span className="text-xs font-semibold text-stone-700">
                          Scab / Skin Blemish
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={14} /> 0.0% (Clean Peel)
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3.5">
                        <span className="text-xs font-semibold text-stone-700">
                          Quality Purity Score
                        </span>
                        <span className="font-mono text-sm font-extrabold text-amber-700">
                          {inspectionResult ? `${inspectionResult.score}%` : "99.2%"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <ShieldCheck size={18} />
                        <span className="text-xs font-bold">
                          AI Inspection Passed
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-700">
                        This box meets Export Grade A standard. Safe to seal
                        with tamper-evident QR provenance sticker.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        handleUpdateOrderStatus("OR-2083", "Dispatched");
                        alert("Box #BX-K72-04 approved and marked for dispatch!");
                      }}
                      className="mt-6 w-full rounded-xl bg-stone-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800"
                    >
                      Sign Inspection & Print QR Label
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: QR VERIFICATION */}
            {active === "QR verification" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
                    QR Provenance Verification
                  </h1>
                  <p className="text-xs text-stone-500">
                    Scan or enter the unique QR code affixed on each crate to
                    inspect its farm-to-door timeline.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                  {/* Left: Input */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                    <h2 className="text-base font-bold text-stone-900">
                      Scan or Lookup Crate QR
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Simulate scanning the QR code printed on the wooden box.
                    </p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Box QR Identifier
                        </label>
                        <input
                          type="text"
                          value={qrCodeInput}
                          onChange={(e) => setQrCodeInput(e.target.value)}
                          placeholder="e.g. QR-MB2026-8819"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-mono font-bold text-stone-900 focus:border-amber-500 focus:outline-hidden"
                        />
                      </div>

                      <button
                        onClick={handleVerifyQR}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                      >
                        <QrCode size={16} /> Verify Provenance Record
                      </button>
                    </div>

                    <div className="mt-6 border-t border-stone-100 pt-5 text-center">
                      <div className="inline-flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-stone-300 bg-stone-50 p-3">
                        <QrCode size={80} className="text-stone-800" />
                      </div>
                      <p className="mt-2 text-[11px] font-mono text-stone-500">
                        {qrCodeInput}
                      </p>
                    </div>
                  </div>

                  {/* Right: Certificate */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Orchiva Provenance Certificate
                        </span>
                        <h2 className="text-lg font-bold text-stone-900">
                          {verifiedBox ? verifiedBox.boxNumber : "#BOX-772-KANSAT"}
                        </h2>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        Authentic Harvest
                      </span>
                    </div>

                    <div className="mt-5 space-y-3.5 text-xs">
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">Mango Variety:</span>
                        <span className="font-bold text-stone-900">
                          {verifiedBox ? verifiedBox.variety : "Himsagar (GI Certified)"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">Weight & Pack:</span>
                        <span className="font-bold text-stone-900">
                          {verifiedBox ? verifiedBox.weight : "5.1 kg (12 Export Grade mangoes)"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">Orchard Location:</span>
                        <span className="font-bold text-stone-900 text-right">
                          {verifiedBox ? verifiedBox.orchard : "Kansat Heritage Groves, Chapainawabganj"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">Grower / Master Farmer:</span>
                        <span className="font-bold text-stone-900">
                          {verifiedBox ? verifiedBox.farmer : sellerName}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">Harvest Timestamp:</span>
                        <span className="font-mono font-medium text-stone-800">
                          {verifiedBox ? verifiedBox.harvestTimestamp : "05 Nov 2026, 06:15 AM BST"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-500">AI Inspection Rating:</span>
                        <span className="font-bold text-emerald-700">
                          {verifiedBox ? verifiedBox.aiInspectionScore : "99.4% (Anthracnose Free)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Courier Dispatch ID:</span>
                        <span className="font-mono font-bold text-stone-800">
                          {verifiedBox ? verifiedBox.courierTracking : "STEADFAST-EXP-88914"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ORCHARD MEDIA (2-DAY MAX JSON STORAGE & POST-DELIVERY RENEWAL) */}
            {active === "Orchard media" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
                      Pre-Harvest Orchard Videos & 360° Media
                    </h1>
                    <p className="text-xs text-stone-500">
                      Pre-harvest videos stay for maximum 2 days (48h TTL) stored in JSON format. Once delivery completes, the video must be deleted and replaced for the new batch.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowJsonModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-50"
                    >
                      <FileJson size={15} className="text-amber-600" />
                      <span>View JSON Storage</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBatchForVideo(batchList[0]?.id || "MB-2026-041");
                        setShowVideoUploadModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                    >
                      <Plus size={15} />
                      <span>Input Pre-Harvest Video</span>
                    </button>
                  </div>
                </div>

                {/* Renewal Alert Banner */}
                {renewalNotice && (
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-700 mt-0.5 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Fresh Harvest Video Required
                        </p>
                        <p className="mt-0.5 text-xs text-amber-800">
                          {renewalNotice}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowVideoUploadModal(true);
                      }}
                      className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-500"
                    >
                      Upload Now →
                    </button>
                  </div>
                )}

                {/* Storage Engine Status Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-stone-600">
                    <span className="flex items-center gap-1.5 font-bold text-stone-900">
                      <Film size={15} className="text-amber-600" />
                      {preHarvestVideos.length} Stored Pre-Harvest Videos
                    </span>
                    <span className="hidden sm:inline text-stone-300">|</span>
                    <span className="flex items-center gap-1">
                      <Timer size={14} className="text-stone-400" />
                      Max 2 Days (48 Hours TTL)
                    </span>
                    <span className="hidden sm:inline text-stone-300">|</span>
                    <span className="font-mono text-stone-500">
                      JSON Payload: ~{Math.max(1, Math.round(JSON.stringify(preHarvestVideos).length / 102.4) / 10)} KB
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-[11px] border border-emerald-200">
                    ● JSON Storage Active
                  </span>
                </div>

                {/* Active Pre-Harvest Videos Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {preHarvestVideos.map((video) => {
                    const timer = formatVideoTimeRemaining(video.expiresAt);
                    const isDeliveryDone = video.status === "DELIVERY_COMPLETED" || video.isDelivered;

                    return (
                      <div
                        key={video.id}
                        className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition hover:shadow-md ${
                          isDeliveryDone
                            ? "border-amber-300 ring-2 ring-amber-400/20"
                            : timer.expired
                            ? "border-rose-300"
                            : "border-stone-200"
                        }`}
                      >
                        {/* Video Player Header */}
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          <video
                            src={video.videoUrl}
                            controls
                            className="h-full w-full object-contain"
                          />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                            <span className="rounded-md bg-stone-900/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs">
                              {video.batchId} · {video.variety}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs ${
                                isDeliveryDone
                                  ? "bg-amber-500 text-stone-950 font-extrabold"
                                  : timer.expired
                                  ? "bg-rose-500 text-white"
                                  : "bg-emerald-500 text-white"
                              }`}
                            >
                              {isDeliveryDone
                                ? "DELIVERY COMPLETED (DELETE REQUIRED)"
                                : timer.expired
                                ? "EXPIRED (48h reached)"
                                : "ACTIVE PRE-HARVEST VIDEO"}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                          <div>
                            <h3 className="text-base font-bold text-stone-900">
                              {video.videoTitle}
                            </h3>
                            <p className="mt-1 text-xs text-stone-500 flex items-center gap-1">
                              <MapPin size={12} className="text-amber-500 shrink-0" />
                              {video.orchardName}
                            </p>
                            <p className="mt-1 rounded-lg bg-stone-50 p-2 text-xs font-medium text-stone-700 border border-stone-100">
                              🌿 {video.branchTag}
                            </p>
                          </div>

                          {/* 2-Day Countdown Timer Bar */}
                          <div className="space-y-1.5 rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 font-semibold text-stone-700">
                                <Clock size={13} className="text-amber-600" />
                                2-Day Lifespan (48h max):
                              </span>
                              <span
                                suppressHydrationWarning
                                className={`font-mono text-xs font-bold ${
                                  timer.expired ? "text-rose-600" : "text-amber-800"
                                }`}
                              >
                                {timer.label}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  timer.expired
                                    ? "bg-rose-500"
                                    : timer.percentRemaining < 25
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${timer.percentRemaining}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-stone-400" suppressHydrationWarning>
                              <span>Uploaded: {new Date(video.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>Expires: {new Date(video.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Mandatory Post-Delivery Action Notification */}
                          {isDeliveryDone ? (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-amber-900">
                                    Delivery Completed — Mandatory Video Deletion
                                  </p>
                                  <p className="text-[11px] leading-relaxed text-amber-800 mt-0.5">
                                    Customer delivery for this batch is complete. Per policy, delete this video from the 2-day JSON cache and upload a new orchard picking video for the next batch.
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleDeletePostDeliveryVideo(
                                    video.id,
                                    video.batchId,
                                    video.variety
                                  )
                                }
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-500"
                              >
                                <Trash2 size={14} />
                                <span>Delete Video & Upload Next Batch Video</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleMarkBatchDeliveryCompleted(video.batchId)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                  title="Simulate delivery completion to trigger post-delivery deletion"
                                >
                                  <Check size={12} className="text-emerald-600" />
                                  <span>Mark Delivered</span>
                                </button>
                                <button
                                  onClick={() => handleSimulateFastForwardExpiry(video.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                  title="Fast forward timer past 48 hours to test 2-day auto-expiry"
                                >
                                  <Timer size={12} className="text-stone-500" />
                                  <span>Simulate 48h Expiry</span>
                                </button>
                              </div>
                              <button
                                onClick={() =>
                                  handleDeletePostDeliveryVideo(
                                    video.id,
                                    video.batchId,
                                    video.variety
                                  )
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {preHarvestVideos.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center bg-white">
                    <Film className="text-stone-300" size={48} />
                    <h3 className="mt-3 text-base font-bold text-stone-900">
                      No Pre-Harvest Videos in 2-Day JSON Cache
                    </h3>
                    <p className="mt-1 max-w-md text-xs text-stone-500">
                      Sellers must record and input orchard videos before cutting each batch. The video will be serialized into JSON and stored for a maximum of 2 days.
                    </p>
                    <button
                      onClick={() => setShowVideoUploadModal(true)}
                      className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                    >
                      <Plus size={15} />
                      Input Pre-Harvest Video for Upcoming Batch
                    </button>
                  </div>
                )}

                {/* 360° Rotational Photos Section */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="text-amber-600" size={20} />
                    <h2 className="text-base font-bold text-stone-900">
                      Packed Crate 360° Rotational Photos
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    Upload multiple angles of the packed open crate for 3D photogrammetry and customer box provenance.
                  </p>

                  <div className="mt-4">
                    {photoPreviews.length > 0 ? (
                      <div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {photoPreviews.map((url, i) => (
                            <div
                              key={i}
                              className="aspect-square overflow-hidden rounded-xl border border-stone-200"
                            >
                              <img
                                src={url}
                                alt={`Crate angle ${i + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setPhotoPreviews([])}
                          className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Clear all photos
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-8 text-center bg-stone-50/50">
                        <ImagePlus className="text-stone-400" size={32} />
                        <p className="mt-2 text-xs font-semibold text-stone-700">
                          Upload 3 to 12 crate angles
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          Top angle, 45-degree angle, and side profiles
                        </p>
                        <label className="mt-4 cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400">
                          Select Crate Photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handlePhotoChange(e.target.files)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: ADD NEW HARVEST BATCH */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-lg font-bold text-stone-900">
                New Harvest Batch
              </h3>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700">
                  Mango Variety
                </label>
                <select
                  value={newVariety}
                  onChange={(e) => setNewVariety(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800"
                >
                  <option value="Himsagar">Himsagar</option>
                  <option value="Langra">Langra</option>
                  <option value="Amrapali">Amrapali</option>
                  <option value="Fazli">Fazli</option>
                  <option value="Haribhanga">Haribhanga</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">
                  Orchard Name
                </label>
                <input
                  type="text"
                  value={newOrchard}
                  onChange={(e) => setNewOrchard(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="250 kg"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">
                    Price per kg
                  </label>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="৳120/kg"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
                >
                  Publish Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PACKING WORKFLOW */}
      {packingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Pack Box for {packingModalOrder.customer}
                </h3>
                <p className="text-xs text-stone-500">
                  Order {packingModalOrder.id} · {packingModalOrder.mango} (
                  {formatBoxLabel(packingModalOrder.box)})
                </p>
              </div>
              <button
                onClick={() => setPackingModalOrder(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span className="text-xs font-medium text-stone-800">
                  Step 1: Inspect wooden crate & dry paddy straw lining
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span className="text-xs font-medium text-stone-800">
                  Step 2: Place tree-ripened {packingModalOrder.mango} gently with stem cushion
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span className="text-xs font-medium text-stone-800">
                  Step 3: Capture open crate photo for YOLO disease check
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span className="text-xs font-medium text-stone-800">
                  Step 4: Seal with tamper-evident QR provenance sticker
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPackingModalOrder(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600"
              >
                Close
              </button>
              <button
                onClick={() =>
                  handleUpdateOrderStatus(packingModalOrder.id, "Packing")
                }
                className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Confirm Packed & Ready for Scan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: INPUT PRE-HARVEST ORCHARD VIDEO (2-DAY MAX JSON STORAGE) */}
      {showVideoUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Film className="text-amber-600" size={20} />
                  Input Pre-Harvest Orchard Video
                </h3>
                <p className="text-xs text-stone-500">
                  Serialized into JSON format with a strict 48-hour (2-day) time-to-live.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideoUploadModal(false);
                  setVideoPreview(null);
                }}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreHarvestVideo} className="mt-4 space-y-4">
              {/* Batch selection */}
              <div>
                <label className="text-xs font-bold text-stone-700">
                  Target Harvest Batch
                </label>
                <select
                  value={selectedBatchForVideo}
                  onChange={(e) => setSelectedBatchForVideo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800"
                >
                  {batchList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.variety} ({b.orchard})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch tag */}
              <div>
                <label className="text-xs font-bold text-stone-700">
                  Tree Branch Tag / Inspection Notes
                </label>
                <input
                  type="text"
                  value={videoBranchTagInput}
                  onChange={(e) => setVideoBranchTagInput(e.target.value)}
                  placeholder="e.g. Branch #B-14: Tree-ripening, zero chemical spray"
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              {/* Video Title */}
              <div>
                <label className="text-xs font-bold text-stone-700">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  placeholder="e.g. Pre-Harvest Himsagar Tree Inspection"
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              {/* Video file input or preview */}
              <div>
                <label className="text-xs font-bold text-stone-700">
                  Orchard Video Recording (MP4/MOV)
                </label>
                {videoPreview ? (
                  <div className="mt-2 space-y-2">
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black border border-stone-200">
                      <video src={videoPreview} controls className="h-full w-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPreview(null);
                        setVideoFileInput(null);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Change video file
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-6 text-center bg-stone-50/50">
                    <Film className="text-stone-400" size={32} />
                    <p className="mt-2 text-xs font-semibold text-stone-700">
                      Upload pre-harvest video from phone or camera
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Recommended: 10-30s morning branch clip
                    </p>
                    <div className="mt-3 flex gap-2">
                      <label className="cursor-pointer rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400">
                        Choose Video File
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleVideoChange(e.target.files?.[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setVideoPreview(
                            "https://assets.mixkit.co/videos/preview/mixkit-farmer-walking-through-a-sunny-field-42702-large.mp4"
                          )
                        }
                        className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Use Demo Orchard Clip
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2-Day Policy Callout */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Timer size={14} className="text-amber-700" />
                  2-Day Max JSON Storage Policy
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This video will be serialized into JSON and set to expire in 48 hours (2 days). When your customer deliveries for this batch are completed, you will be prompted to delete this video and upload a new one for the next batch.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoUploadModal(false);
                    setVideoPreview(null);
                  }}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400"
                >
                  Serialize to JSON & Save (48h TTL)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: JSON STORAGE INSPECTOR */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <FileJson className="text-amber-600" size={20} />
                  Orchiva JSON Video Storage Document
                </h3>
                <p className="text-xs text-stone-500">
                  Direct JSON payload stored in client storage for 2 days (48-hour time-to-live).
                </p>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="my-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-700">
                  Records: <span className="font-mono font-bold text-stone-900">{preHarvestVideos.length}</span>
                </span>
                <span className="text-stone-300">|</span>
                <span className="font-semibold text-stone-700">
                  TTL Policy: <span className="font-mono font-bold text-amber-700">48 Hours (2 Days)</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(preHarvestVideos, null, 2));
                    setCopiedJsonToast(true);
                    setTimeout(() => setCopiedJsonToast(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <Copy size={13} />
                  <span>{copiedJsonToast ? "Copied JSON!" : "Copy JSON"}</span>
                </button>
                <button
                  onClick={() => {
                    const dataStr =
                      "data:text/json;charset=utf-8," +
                      encodeURIComponent(JSON.stringify(preHarvestVideos, null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute(
                      "download",
                      `orchiva_preharvest_videos_${new Date().toISOString().slice(0, 10)}.json`
                    );
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 font-bold text-white hover:bg-stone-800"
                >
                  <Download size={13} />
                  <span>Download .json</span>
                </button>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-stone-900 p-4 text-xs font-mono text-emerald-400">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(
                  {
                    storageProtocol: "ORCHIVA_PREHARVEST_VIDEOS_V2",
                    ttlPolicyHours: 48,
                    maxDaysAllowed: 2,
                    postDeliveryPolicy: "DELETE_AFTER_DELIVERY_AND_UPDATE_FOR_NEW_BATCH",
                    lastSynced: new Date().toISOString(),
                    totalRecords: preHarvestVideos.length,
                    videos: preHarvestVideos,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowJsonModal(false)}
                className="rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerDashboard;
