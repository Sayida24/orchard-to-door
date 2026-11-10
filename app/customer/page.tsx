'use client';

import mangoBackground from "./mango-bg.jpeg";
import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  RotateCw,
  Play,
  Pause,
  ShieldCheck,
  Truck,
  Gift,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Scale,
  BookOpen,
  ArrowRight,
  Compass,
  Video,
  Image as ImageIcon,
  Trees,
} from 'lucide-react';

// ==========================================
// 1. DATA MODELS & INITIAL CATALOG DATA
// ==========================================

interface Batch {
  id: string;
  varietyName: string;
  banglaName: string;
  orchardName: string;
  district: string;
  harvestDate: string;
  totalKg: number;
  availableKg: number;
  pricePerKg: number;
  harvestVideoUrl: string;
  spinImages: string[];
  sweetnessBrix: string;
  status: 'OPEN' | 'SOLD_OUT';
}

interface Order {
  id: string;
  varietyName: string;
  orchardName: string;
  boxSizeKg: number;
  isGiftBox: boolean;
  totalPrice: number;
  address: string;
  city: string;
  deliverySlot: string;
  status: 'PLACED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED';
  createdAt: string;
  boxQr: string;
}

const INITIAL_BATCHES: Batch[] = [
  {
    id: 'batch_har_01',
    varietyName: 'Haribhanga',
    banglaName: 'হাঁড়িভাঙ্গা',
    orchardName: 'Padma Riverside Organic Orchards',
    district: 'Rajshahi & Rangpur',
    harvestDate: 'Today, 06:30 AM',
    totalKg: 500,
    availableKg: 380,
    pricePerKg: 155,
    harvestVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wind-blowing-the-leaves-of-a-tall-tree-42523-large.mp4',
    spinImages: [
      '/images/mangoes.png',
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    ],
    sweetnessBrix: '20° - 21° Brix',
    status: 'OPEN',
  },
  {
    id: 'batch_him_02',
    varietyName: 'Himsagar',
    banglaName: 'হিমসাগর',
    orchardName: 'Kansat Royal Heritage Groves',
    district: 'Chapainawabganj',
    harvestDate: 'Yesterday, 07:15 AM',
    totalKg: 800,
    availableKg: 420,
    pricePerKg: 140,
    harvestVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-farmer-walking-through-a-sunny-field-42702-large.mp4',
    spinImages: [
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
    ],
    sweetnessBrix: '19° - 22° Brix',
    status: 'OPEN',
  },
  {
    id: 'batch_lan_03',
    varietyName: 'Langra (Benarasi)',
    banglaName: 'ল্যাংড়া',
    orchardName: 'Padma Riverside Organic Orchards',
    district: 'Rajshahi',
    harvestDate: '2 Days ago',
    totalKg: 650,
    availableKg: 190,
    pricePerKg: 160,
    harvestVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-sun-beams-through-the-branches-of-a-tree-41315-large.mp4',
    spinImages: [
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    ],
    sweetnessBrix: '18° - 20° Brix',
    status: 'OPEN',
  },
  {
    id: 'batch_amr_04',
    varietyName: 'Amrapali',
    banglaName: 'আম্রপালি',
    orchardName: 'Sundarban Coastal Breezes Farm',
    district: 'Satkhira',
    harvestDate: 'Today, 08:00 AM',
    totalKg: 450,
    availableKg: 450,
    pricePerKg: 175,
    harvestVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-wind-blowing-the-leaves-of-a-tall-tree-42523-large.mp4',
    spinImages: [
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    ],
    sweetnessBrix: '22° - 24° Brix',
    status: 'OPEN',
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-8941',
    varietyName: 'Himsagar',
    orchardName: 'Kansat Royal Heritage Groves',
    boxSizeKg: 5,
    isGiftBox: true,
    totalPrice: 820,
    address: 'House 42, Road 11, Block D, Banani',
    city: 'Dhaka',
    deliverySlot: 'Today Evening (6:00 PM - 9:00 PM)',
    status: 'PACKED',
    createdAt: '2026-11-06T07:45:00Z',
    boxQr: 'X7K2P9',
  },
  {
    id: 'ORD-8933',
    varietyName: 'Langra (Benarasi)',
    orchardName: 'Padma Riverside Organic Orchards',
    boxSizeKg: 10,
    isGiftBox: false,
    totalPrice: 1660,
    address: 'Apt 5B, Concord Tower, Gulshan-2',
    city: 'Dhaka',
    deliverySlot: 'Tomorrow Morning (8:00 AM - 11:00 AM)',
    status: 'DISPATCHED',
    createdAt: '2026-11-05T11:20:00Z',
    boxQr: 'M4V9T2',
  },
];

// ==========================================
// 2. MAIN CUSTOMER FRONTEND COMPONENT
// ==========================================

export default function CustomerPage() {
  const [activeTab, setActiveTab] = useState<'batches' | 'guide' | 'orchards' | 'orders'>('batches');
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [filterVariety, setFilterVariety] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Interactive Viewers
  const [inspectBatch, setInspectBatch] = useState<Batch | null>(null);
  const [inspectBoxQr, setInspectBoxQr] = useState<string | null>(null);
  const [showProblemModal, setShowProblemModal] = useState<string | null>(null);
  const [problemSuccess, setProblemSuccess] = useState(false);

  // Ordering Form State
  const [boxSizeKg, setBoxSizeKg] = useState<5 | 10>(5);
  const [isGiftBox, setIsGiftBox] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [customerName, setCustomerName] = useState('Tanvir Hossain');
  const [customerPhone, setCustomerPhone] = useState('+880 1712-345678');
  const [address, setAddress] = useState('House 24, Road 7, Sector 4, Uttara');
  const [city, setCity] = useState('Dhaka');
  const [deliverySlot, setDeliverySlot] = useState('Tomorrow Morning (8:00 AM - 11:00 AM)');
  const [orderSuccessBanner, setOrderSuccessBanner] = useState(false);

  // 360 Spin Viewer State inside Order Modal
  const [spinFrame, setSpinFrame] = useState(0);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const isDragging360 = useRef(false);
  const startX360 = useRef(0);

  // Auto-spin timer
  useEffect(() => {
    if (!isAutoSpin || !inspectBatch) return;
    const interval = setInterval(() => {
      setSpinFrame((prev) => (prev + 1) % inspectBatch.spinImages.length);
    }, 300);
    return () => clearInterval(interval);
  }, [isAutoSpin, inspectBatch]);

  // Handle Order Placement (FR-09 to FR-11)
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectBatch) return;

    const fruitPrice = boxSizeKg * inspectBatch.pricePerKg;
    const giftFee = isGiftBox ? 120 : 0;
    const deliveryFee = 60;
    const grandTotal = fruitPrice + giftFee + deliveryFee;

    const newOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomQr = 'X7K' + Math.floor(100 + Math.random() * 900);

    const newOrder: Order = {
      id: newOrderId,
      varietyName: inspectBatch.varietyName,
      orchardName: inspectBatch.orchardName,
      boxSizeKg,
      isGiftBox,
      totalPrice: grandTotal,
      address,
      city,
      deliverySlot,
      status: 'PLACED',
      createdAt: new Date().toISOString(),
      boxQr: randomQr,
    };

    // Decrement stock (FR-08)
    setBatches((prev) =>
      prev.map((b) =>
        b.id === inspectBatch.id ? { ...b, availableKg: Math.max(0, b.availableKg - boxSizeKg) } : b
      )
    );

    setOrders((prev) => [newOrder, ...prev]);
    setInspectBatch(null);
    setOrderSuccessBanner(true);
    setActiveTab('orders');
    setTimeout(() => setOrderSuccessBanner(false), 5000);
  };

  const filteredBatches = batches.filter((b) => {
    if (filterVariety !== 'all' && b.varietyName.toLowerCase() !== filterVariety.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.varietyName.toLowerCase().includes(q) || b.orchardName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 text-stone-300 text-xs py-2 px-4 border-b border-stone-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Today's harvest picked from Chapainawabganj & Rajshahi orchards</span>
          </div>
          <span className="font-mono text-amber-400 font-bold hidden sm:inline">100% Carbide-Free · YOLOv8 AI Inspected</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <button
            onClick={() => setActiveTab('batches')}
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-stone-950"
          >
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm">
              🥭
            </span>
            <span>Orchard to Door</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'batches' ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Fresh Batches
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'guide' ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Mango Guide
            </button>
            <button
              onClick={() => setActiveTab('orchards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'orchards' ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Orchards
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'orders' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              My Orders ({orders.length})
            </button>
          </nav>
        </div>
      </header>

      {/* Success Banner */}
      {orderSuccessBanner && (
        <div className="bg-emerald-600 text-white px-4 py-3 text-center text-xs font-bold shadow-md flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Order placed successfully! The orchard is now packing your box and preparing the YOLO AI scan.</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ========================================== */}
        {/* VIEW 1: BROWSE FRESH BATCHES (Storefront) */}
        {/* ========================================== */}
        {activeTab === 'batches' && (
          <div className="space-y-10">
            {/* Fancy Hero Banner */}
            <div
              className="relative overflow-hidden rounded-3xl bg-cover bg-center text-white p-8 sm:p-12 border border-amber-900/40 shadow-xl"
              style={{
                backgroundImage: `linear-gradient(rgba(20, 15, 5, 0.58), rgba(20, 15, 5, 0.58)), url(${mangoBackground.src})`,
              }}
            >
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-semibold border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Direct-to-Customer Heritage Mangoes
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  See your mangoes before you buy, and your own box before it ships.
                </h1>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Watch harvest picking videos, spin the fresh batch in 360°, and inspect your packed box with YOLOv8 AI disease verification.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                  >
                    Browse Today's Batches <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInspectBoxQr('X7K2P9')}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-white/20 transition-all"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    Inspect Box #X7K2P9 (3D & AI)
                  </button>
                </div>
              </div>

              {/* 3 Trust Markers */}
              <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>360° Batch Spin before ordering</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>YOLOv8 AI checks every mango</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Doorstep delivery across Dhaka</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div id="catalog" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-600 font-bold">In Season Now</div>
                  <h2 className="text-2xl font-bold text-stone-900">Fresh Harvest Batches</h2>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search variety, orchard..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: 'All Varieties', value: 'all' },
                  { label: 'Haribhanga (হাঁড়িভাঙ্গা)', value: 'Haribhanga' },
                  { label: 'Himsagar (হিমসাগর)', value: 'Himsagar' },
                  { label: 'Langra (ল্যাংড়া)', value: 'Langra (Benarasi)' },
                  { label: 'Amrapali (আম্রপালি)', value: 'Amrapali' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilterVariety(item.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      filterVariety === item.value
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-stone-200/60 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Photo with Media Badges */}
                  <div
                    onClick={() => setInspectBatch(batch)}
                    className="relative aspect-4/3 bg-stone-100 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={batch.spinImages[0]}
                      alt={batch.varietyName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-amber-400 text-[11px] px-2.5 py-1 rounded-md font-mono flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> 360° Spinnable
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white flex justify-between items-center text-xs">
                      <span className="font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" /> {batch.district}
                      </span>
                      <span className="bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded text-[11px]">
                        {batch.sweetnessBrix}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
                            {batch.varietyName}
                          </h3>
                          <p className="text-xs text-stone-500">{batch.orchardName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold font-mono text-stone-900">৳{batch.pricePerKg}</span>
                          <span className="text-xs text-stone-500"> / kg</span>
                        </div>
                      </div>

                      {/* Stock Progress */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-stone-500">
                          <span>Harvested {batch.harvestDate}</span>
                          <span className="font-bold text-stone-700">{batch.availableKg} kg left</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${(batch.availableKg / batch.totalKg) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order Button */}
                    <button
                      onClick={() => setInspectBatch(batch)}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      Spin 360° & Configure Box <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 2: MANGO GUIDE & RIPENING (FR-04)    */}
        {/* ========================================== */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-600 font-bold">Almanac & Profiles</div>
              <h2 className="text-2xl font-bold text-stone-900">The Bengal Mango Calendar</h2>
              <p className="text-xs text-stone-600 mt-1">Discover harvest windows, sugar Brix levels, and ideal pairings for authentic heritage varieties.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  name: 'Haribhanga (হাঁড়িভাঙ্গা)',
                  months: 'June – July',
                  brix: '20° – 21° Brix',
                  taste: 'Virtually stringless silky pulp with tiny flat stone. Savor fresh.',
                  origin: 'Rangpur & Rajshahi',
                  img: '/images/mangoes.png',
                },
                {
                  name: 'Himsagar (হিমসাগর)',
                  months: 'May – June',
                  brix: '19° – 22° Brix',
                  taste: 'The King of early summer. Buttery, fiberless, sweet honeysuckle aroma.',
                  origin: 'Chapainawabganj',
                  img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
                },
                {
                  name: 'Langra (ল্যাংড়া)',
                  months: 'June – July',
                  brix: '18° – 20° Brix',
                  taste: 'Bold sweet-tangy punch, stays light greenish even at full ripeness.',
                  origin: 'Padma Riverside, Rajshahi',
                  img: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=600&q=80',
                },
                {
                  name: 'Amrapali (আম্রপালি)',
                  months: 'June – July',
                  brix: '22° – 24° Brix',
                  taste: 'Highest natural sugar concentration, deep saffron-red velvety flesh.',
                  origin: 'Satkhira & Chapai',
                  img: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex gap-4 items-center">
                  <img src={item.img} alt={item.name} className="w-24 h-24 rounded-xl object-cover border border-stone-200 shrink-0" />
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-stone-900 text-sm">{item.name}</div>
                    <div className="text-amber-700 font-semibold font-mono">{item.months} · {item.brix}</div>
                    <p className="text-stone-600 leading-snug">{item.taste}</p>
                    <div className="text-[11px] text-stone-400">Origin: {item.origin}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 3: ORCHARDS EXPLORER (FR-03)         */}
        {/* ========================================== */}
        {activeTab === 'orchards' && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-600 font-bold">Partner Groves</div>
              <h2 className="text-2xl font-bold text-stone-900">Our Heritage Orchards</h2>
              <p className="text-xs text-stone-600 mt-1">Direct from 40-year-old heritage trees nurtured along the Padma and Pagla rivers.</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="relative aspect-video sm:aspect-21/9 bg-stone-900 flex items-center justify-center">
                <video
                  src="/videos/orchard.mp4"
                  controls
              
                  muted
                  
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kansat Royal Heritage Groves · Chapainawabganj</span>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-stone-900">Kansat Heritage Preserve (65 Acres)</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                    Chemical Ripener Free
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Situated along the Pagla River basin, featuring over 1,450 heritage mango trees. Every single crate shipped to your door is picked tree-ripe and packed with organic paddy straw.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 4: MY ORDERS & TIMELINE (FR-19, 20)  */}
        {/* ========================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-600 font-bold">Trace & Verification</div>
              <h2 className="text-2xl font-bold text-stone-900">Your Mango Orders</h2>
              <p className="text-xs text-stone-600 mt-1">Track packing progress, inspect 3D crates, and view YOLO AI quality scan results.</p>
            </div>

            <div className="space-y-4">
              {orders.map((order) => {
                const stepNum = order.status === 'PLACED' ? 1 : order.status === 'PACKED' ? 2 : order.status === 'DISPATCHED' ? 3 : 4;
                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-stone-900">#{order.id}</span>
                          <span>·</span>
                          <span className="text-stone-500">{order.varietyName} ({order.boxSizeKg} kg crate)</span>
                        </div>
                        <div className="text-sm font-bold text-stone-900 mt-0.5">{order.orchardName}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInspectBoxQr(order.boxQr)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          View Box Provenance & 3D
                        </button>
                        <button
                          onClick={() => setShowProblemModal(order.id)}
                          className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Report Issue (FR-21)
                        </button>
                      </div>
                    </div>

                    {/* 4-Step Progress Indicator (FR-19) */}
                    <div className="p-5">
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className={stepNum >= 1 ? 'text-amber-600 font-bold' : 'text-stone-400'}>
                          <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1 text-xs ${stepNum >= 1 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>1</div>
                          <div>Placed</div>
                        </div>
                        <div className={stepNum >= 2 ? 'text-amber-600 font-bold' : 'text-stone-400'}>
                          <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1 text-xs ${stepNum >= 2 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>2</div>
                          <div>Packed & AI Checked</div>
                        </div>
                        <div className={stepNum >= 3 ? 'text-amber-600 font-bold' : 'text-stone-400'}>
                          <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1 text-xs ${stepNum >= 3 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>3</div>
                          <div>Dispatched</div>
                        </div>
                        <div className={stepNum >= 4 ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                          <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1 text-xs ${stepNum >= 4 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>4</div>
                          <div>Delivered</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
                        <span>Delivery: {order.address}, {order.city}</span>
                        <span className="font-bold text-stone-900">৳{order.totalPrice} (Cash on Delivery)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: 360° SPINNING BATCH & ORDER CONFIGURATOR (FR-07) */}
      {/* ======================================================== */}
      {inspectBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-b flex justify-between items-center">
              <div>
                <span className="text-xs font-mono text-amber-600 uppercase font-bold">Direct Harvest Batch</span>
                <h2 className="text-xl font-bold text-stone-900">{inspectBatch.varietyName} ({inspectBatch.banglaName})</h2>
              </div>
              <button onClick={() => setInspectBatch(null)} className="p-1.5 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
              {/* Left Column: 360 Spin Viewer */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-stone-900 border border-stone-200 shadow-inner select-none cursor-ew-resize">
                  <img
                    src={inspectBatch.spinImages[spinFrame] || inspectBatch.spinImages[0]}
                    alt="360 harvest frame"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-amber-400 text-xs px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>{Math.round((spinFrame / inspectBatch.spinImages.length) * 360)}°</span>
                  </div>
                  <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>Drag horizontally or scrub below to spin batch 360°</span>
                    </div>
                  </div>
                </div>

                {/* 360 Controls */}
                <div className="p-2.5 bg-stone-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => setIsAutoSpin(!isAutoSpin)}
                    className="px-3 py-1.5 bg-stone-900 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    {isAutoSpin ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAutoSpin ? 'Pause' : 'Auto Spin'}</span>
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={inspectBatch.spinImages.length - 1}
                    value={spinFrame}
                    onChange={(e) => setSpinFrame(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-stone-500">Frame {spinFrame + 1} / {inspectBatch.spinImages.length}</span>
                </div>
              </div>

              {/* Right Column: Order Form (FR-09, FR-10) */}
              <div className="lg:col-span-5">
                <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
                  {/* Crate Size */}
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1.5">1. Select Crate Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBoxSizeKg(5)}
                        className={`p-3 rounded-xl border text-left ${boxSizeKg === 5 ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500' : 'border-stone-200'}`}
                      >
                        <div className="font-bold text-sm text-stone-900">5 kg Crate</div>
                        <div className="text-stone-500">~10-12 mangoes</div>
                        <div className="text-amber-700 font-bold mt-1">৳{5 * inspectBatch.pricePerKg}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoxSizeKg(10)}
                        className={`p-3 rounded-xl border text-left ${boxSizeKg === 10 ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500' : 'border-stone-200'}`}
                      >
                        <div className="font-bold text-sm text-stone-900">10 kg Crate</div>
                        <div className="text-stone-500">~20-24 mangoes</div>
                        <div className="text-amber-700 font-bold mt-1">৳{10 * inspectBatch.pricePerKg}</div>
                      </button>
                    </div>
                  </div>

                  {/* Gift Box Option */}
                  <div className="p-3 bg-stone-50 rounded-xl border space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-600" /> Premium Festive Gift Wrap (+৳120)
                      </span>
                      <input
                        type="checkbox"
                        checked={isGiftBox}
                        onChange={(e) => setIsGiftBox(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </label>
                    {isGiftBox && (
                      <input
                        type="text"
                        value={giftNote}
                        onChange={(e) => setGiftNote(e.target.value)}
                        placeholder="Greeting message on crate card..."
                        className="w-full p-2 bg-white border rounded-lg text-xs"
                      />
                    )}
                  </div>

                  {/* Address & Slot */}
                  <div className="space-y-2">
                    <label className="block font-bold text-stone-700 uppercase">2. Delivery Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, sector"
                      required
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                    <select
                      value={deliverySlot}
                      onChange={(e) => setDeliverySlot(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    >
                      <option>Tomorrow Morning (8:00 AM - 11:00 AM)</option>
                      <option>Tomorrow Afternoon (2:00 PM - 5:00 PM)</option>
                      <option>Tomorrow Evening (6:00 PM - 9:00 PM)</option>
                    </select>
                  </div>

                  {/* Price Summary */}
                  <div className="p-3 bg-stone-50 rounded-xl border space-y-1">
                    <div className="flex justify-between text-stone-500">
                      <span>{boxSizeKg} kg Mangoes:</span>
                      <span>৳{boxSizeKg * inspectBatch.pricePerKg}</span>
                    </div>
                    {isGiftBox && (
                      <div className="flex justify-between text-stone-500">
                        <span>Gift Packaging:</span>
                        <span>+৳120</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-500">
                      <span>Express Delivery ({city}):</span>
                      <span>+৳60</span>
                    </div>
                    <div className="border-t pt-1.5 flex justify-between font-bold text-stone-900 text-sm">
                      <span>Total (Cash on Delivery):</span>
                      <span className="text-amber-700 font-mono">
                        ৳{boxSizeKg * inspectBatch.pricePerKg + (isGiftBox ? 120 : 0) + 60}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
                  >
                    Confirm Order (Cash on Delivery)
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: 3D CRATE & YOLO AI PROVENANCE DOSSIER (FR-20)   */}
      {/* ======================================================== */}
      {inspectBoxQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Box Provenance #{inspectBoxQr}</h3>
                  <p className="text-xs text-stone-500">YOLOv8 AI Checked · Direct from Orchard</p>
                </div>
              </div>
              <button onClick={() => setInspectBoxQr(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated 3D Crate Visual */}
            <div className="p-6 bg-stone-900 rounded-2xl text-white text-center space-y-3 relative overflow-hidden">
              <div className="text-6xl animate-bounce">📦🥭</div>
              <div className="font-bold text-base text-amber-400">Ventilated Pine Wood Crate (5.2 kg Net)</div>
              <p className="text-xs text-stone-300 max-w-sm mx-auto">
                Packed in organic paddy straw. Photographed from 4 angles and verified 100% defect-free before sealing.
              </p>
            </div>

            {/* YOLO AI Inspection Summary */}
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                YOLOv8 AI Scan: Verified Clean (12/12 Fruits Healthy)
              </div>
              <div className="grid grid-cols-2 gap-2 text-emerald-900 pt-1">
                <div className="p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="text-stone-500">Healthy Mangoes:</span> <strong className="font-mono text-emerald-700">12 (100%)</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="text-stone-500">Anthracnose / Scab:</span> <strong className="font-mono text-emerald-700">0 Detected</strong>
                </div>
              </div>
            </div>

            {/* Ripening Guide */}
            <div className="p-4 bg-stone-50 rounded-2xl border text-xs space-y-1.5">
              <div className="font-bold text-stone-900">Farmer Ripening Instructions:</div>
              <p className="text-stone-600 leading-relaxed">
                Allow 2-3 days at ambient room temperature (24°C–28°C) in the open crate. When the stem exudes sweet mango perfume and the shoulder yields gently to soft touch, immerse in cold water for 25 minutes before slicing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: REPORT A PROBLEM (FR-21)                       */}
      {/* ======================================================== */}
      {showProblemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Report a Problem (#{showProblemModal})
              </h3>
              <button onClick={() => setShowProblemModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {problemSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl text-center">
                Problem report submitted! Our admin will review and issue your refund or replacement crate within 24 hours.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProblemSuccess(true);
                  setTimeout(() => {
                    setProblemSuccess(false);
                    setShowProblemModal(null);
                  }, 2000);
                }}
                className="space-y-3 text-xs"
              >
                <p className="text-stone-600">
                  Our promise is 100% undamaged tree-ripened fruit. Describe the issue and upload a picture for an instant refund or replacement review.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. One mango arrived with transit pressure bruise..."
                  required
                  className="w-full p-2.5 border rounded-xl"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
                >
                  Submit Photo Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-stone-200 bg-white py-8 text-stone-500 text-xs text-center">
        <div className="max-w-6xl mx-auto space-y-1">
          <p className="font-bold text-stone-900">Orchard to Door — Direct Bengal Mango Marketplace</p>
          <p>“See your mangoes before you buy, and your own box before it ships.”</p>
          <p className="text-stone-400 pt-2">Chapainawabganj · Rajshahi · Satkhira · Rangpur</p>
        </div>
      </footer>
    </div>
  );
}