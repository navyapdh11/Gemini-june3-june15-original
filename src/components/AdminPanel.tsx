import React, { useState, FormEvent } from "react";
import { 
  UserCheck, 
  UserX, 
  Trash2, 
  Plus, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  DollarSign, 
  Compass, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Sliders,
  TrendingUp,
  Shield,
  PlusCircle,
  Hash,
  ToggleLeft,
  ToggleRight,
  Settings,
  Briefcase,
  Sparkles,
  MessageCircle,
  Smartphone
} from "lucide-react";
import { QuoteRequest, Cleaner, ServiceItem, PostcodeCoverage, StateCoverage } from "../types";
import { allServices } from "../data";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from "recharts";

interface AdminPanelProps {
  quotes: QuoteRequest[];
  cleaners: Cleaner[];
  onAddCleaner: (cleaner: Cleaner) => void;
  onRemoveCleaner: (id: string) => void;
  onUpdateQuote: (updated: QuoteRequest) => void;
  onRemoveQuote: (id: string) => void;
  onAddQuoteManually: (newQuote: QuoteRequest) => void;

  // Dynamic States
  services?: ServiceItem[];
  onUpdateServices?: (services: ServiceItem[]) => void;
  states?: StateCoverage[];
  onUpdateStates?: (states: StateCoverage[]) => void;
  postcodes?: PostcodeCoverage[];
  onUpdatePostcodes?: (postcodes: PostcodeCoverage[]) => void;

  // Extra guardrail states
  travelSurcharge?: number;
  onUpdateTravelSurcharge?: (val: number) => void;
  isUrgentActive?: boolean;
  onUpdateUrgentActive?: (val: boolean) => void;
  minHoursLimit?: number;
  onUpdateMinHoursLimit?: (val: number) => void;
}

export default function AdminPanel({
  quotes,
  cleaners,
  onAddCleaner,
  onRemoveCleaner,
  onUpdateQuote,
  onRemoveQuote,
  onAddQuoteManually,

  services = allServices,
  onUpdateServices,
  states = [],
  onUpdateStates,
  postcodes = [],
  onUpdatePostcodes,

  travelSurcharge = 15,
  onUpdateTravelSurcharge,
  isUrgentActive = false,
  onUpdateUrgentActive,
  minHoursLimit = 3,
  onUpdateMinHoursLimit
}: AdminPanelProps) {
  
  // Dashboard Sub-Tab
  const [activeTab, setActiveTab ] = useState<"operations" | "system" | "omnichannel" | "insights">("operations");

  // Expansion Strategy State
  const [expansionStates, setExpansionStates] = useState<Record<string, { active: boolean; loading: boolean; density: number; avgPrice: number; topCompetitor: string; postcodeFocus: string }>>({
    NSW: { active: false, loading: false, density: 145, avgPrice: 85, topCompetitor: "SydClean Commercial", postcodeFocus: "2000 (Sydney CBD)" },
    VIC: { active: false, loading: false, density: 121, avgPrice: 82, topCompetitor: "Melbourne Office Pros", postcodeFocus: "3000 (Melbourne Core)" },
    QLD: { active: false, loading: false, density: 94, avgPrice: 78, topCompetitor: "Brisbane General Cleaning", postcodeFocus: "4000 (Brisbane Center)" },
    SA: { active: false, loading: false, density: 48, avgPrice: 72, topCompetitor: "Adelaide Pure Space", postcodeFocus: "5000 (Adelaide Mall)" },
    TAS: { active: false, loading: false, density: 22, avgPrice: 68, topCompetitor: "Tasmanian Shine Co", postcodeFocus: "7000 (Hobart Battery Point)" }
  });

  const handleToggleExpansionState = (stateCode: string) => {
    setExpansionStates(prev => {
      const current = prev[stateCode];
      return {
        ...prev,
        [stateCode]: { ...current, active: !current.active, loading: !current.active }
      };
    });

    // Resolve loading after 600ms
    setTimeout(() => {
      setExpansionStates(prev => {
        if (prev[stateCode]?.active) {
          return {
            ...prev,
            [stateCode]: { ...prev[stateCode], loading: false }
          };
        }
        return prev;
      });
    }, 600);
  };

  // Local Search & Filter for Postcodes Management
  const [postcodeSearch, setPostcodeSearch] = useState("");

  // Add postcode Form state
  const [newPC, setNewPC] = useState("");
  const [newPCSuburb, setNewPCSuburb] = useState("");
  const [newPCState, setNewPCState] = useState("NSW");
  const [newPCMultiplier, setNewPCMultiplier] = useState("1.10");

  // Operational Crew inputs state
  const [newCleanerName, setNewCleanerName] = useState("");
  const [newCleanerPhone, setNewCleanerPhone] = useState("");
  const [newCleanerEmail, setNewCleanerEmail] = useState("");
  const [showRosterForm, setShowRosterForm] = useState(false);

  // Manual job creation state
  const [newJobName, setNewJobName] = useState("");
  const [newJobEmail, setNewJobEmail] = useState("");
  const [newJobPhone, setNewJobPhone] = useState("");
  const [newJobPostcode, setNewJobPostcode] = useState("");
  const [newJobService, setNewJobService] = useState(services[0]?.name || "Commercial Cleaning");
  const [newJobNotes, setNewJobNotes] = useState("");
  const [newJobPrice, setNewJobPrice] = useState("180");
  const [showJobForm, setShowJobForm] = useState(false);

  // Filtered operational quotes
  const unassignedQuotes = quotes.filter((q) => !q.assignedCleaner);
  const assignedQuotes = quotes.filter((q) => q.assignedCleaner);

  // Handlers for Staff Crew
  const handleCreateCleaner = (e: FormEvent) => {
    e.preventDefault();
    if (!newCleanerName.trim()) return;
    onAddCleaner({
      id: `cleaner_${Math.floor(Math.random() * 900 + 100)}`,
      name: newCleanerName,
      phone: newCleanerPhone || "0400 000 000",
      email: newCleanerEmail || "contact@aastaclean.com.au",
      status: "active",
      rating: 4.8
    });
    setNewCleanerName("");
    setNewCleanerPhone("");
    setNewCleanerEmail("");
    setShowRosterForm(false);
  };

  const handleAssignCleaner = (quoteId: string, cleanerName: string) => {
    const qObj = quotes.find((q) => q.id === quoteId);
    if (qObj) {
      onUpdateQuote({
        ...qObj,
        assignedCleaner: cleanerName,
        bookingStatus: "assigned"
      });
    }
  };

  const handleUnassignCleaner = (quoteId: string) => {
    const qObj = quotes.find((q) => q.id === quoteId);
    if (qObj) {
      onUpdateQuote({
        ...qObj,
        assignedCleaner: undefined,
        bookingStatus: "pending"
      });
    }
  };

  const handleCreateManualJob = (e: FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobPostcode.trim()) return;
    onAddQuoteManually({
      id: `manual_${Math.floor(Math.random() * 90000 + 10000)}`,
      postcode: newJobPostcode,
      serviceName: newJobService,
      name: newJobName,
      email: newJobEmail || "noreply@manual-jobs.com",
      phone: newJobPhone || "0400 000 000",
      notes: newJobNotes,
      status: "transmitted",
      estimatedTotal: Number(newJobPrice) || 180,
      timestamp: new Date().toISOString()
    });
    setNewJobName("");
    setNewJobEmail("");
    setNewJobPhone("");
    setNewJobPostcode("");
    setNewJobNotes("");
    setNewJobPrice("180");
    setShowJobForm(false);
  };

  // Systems Tab Toggles & Actions
  const handleToggleState = (code: string) => {
    if (!onUpdateStates) return;
    const nextStates = states.map(s => 
      s.code === code ? { ...s, isActive: !s.isActive } : s
    );
    onUpdateStates(nextStates);
  };

  const handleTogglePostcode = (code: string) => {
    if (!onUpdatePostcodes) return;
    const nextPcs = postcodes.map(p => 
      p.code === code ? { ...p, isActive: !p.isActive } : p
    );
    onUpdatePostcodes(nextPcs);
  };

  const handleUpdatePCMultiplier = (code: string, mult: number) => {
    if (!onUpdatePostcodes) return;
    const nextPcs = postcodes.map(p => 
      p.code === code ? { ...p, multiplier: mult } : p
    );
    onUpdatePostcodes(nextPcs);
  };

  const handleAddPostcode = (e: FormEvent) => {
    e.preventDefault();
    if (!newPC.trim() || !newPCSuburb.trim() || !onUpdatePostcodes) return;
    
    // Check if postcode already exists
    if (postcodes.some(p => p.code === newPC.trim())) {
      alert(`Postcode ${newPC} already exists in the system directory.`);
      return;
    }

    const item: PostcodeCoverage = {
      code: newPC.trim(),
      suburb: newPCSuburb.trim(),
      state: newPCState,
      isActive: true,
      multiplier: Number(newPCMultiplier) || 1.10,
      disabledServices: []
    };

    onUpdatePostcodes([...postcodes, item]);
    setNewPC("");
    setNewPCSuburb("");
    setNewPCMultiplier("1.10");
  };

  const handleRemovePostcode = (code: string) => {
    if (!onUpdatePostcodes) return;
    if (confirm(`Are you sure you want to delete postcode ${code}?`)) {
      onUpdatePostcodes(postcodes.filter(p => p.code !== code));
    }
  };

  const handleTogglePCService = (code: string, slug: string) => {
    if (!onUpdatePostcodes) return;
    const nextPcs = postcodes.map(p => {
      if (p.code === code) {
        const isRestricted = p.disabledServices.includes(slug);
        const disabledServices = isRestricted 
          ? p.disabledServices.filter(s => s !== slug)
          : [...p.disabledServices, slug];
        return { ...p, disabledServices };
      }
      return p;
    });
    onUpdatePostcodes(nextPcs);
  };

  const handleUpdateServiceRate = (slug: string, rate: number) => {
    if (!onUpdateServices) return;
    const nextSvcs = services.map(s => 
      s.slug === slug ? { ...s, baseRatePerHour: rate } : s
    );
    onUpdateServices(nextSvcs);
  };

  // Filter postcodes based on search
  const filteredPostcodes = postcodes.filter(p => 
    p.code.includes(postcodeSearch) || 
    p.suburb.toLowerCase().includes(postcodeSearch.toLowerCase()) ||
    p.state.toLowerCase().includes(postcodeSearch.toLowerCase())
  );

  return (
    <section id="admin-panel" className="py-20 bg-slate-950 border-t border-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Block with quick stats summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                AASTACLEAN Enterprise Suite
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2.5">
              <FileSpreadsheet className="w-7 h-7 text-purple-500" /> Dynamic Control Dashboard
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              National administration terminal. Instantly toggle geographic coverages, customise live rates per suburb, manage staff rosters, and allocate dispatches.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3 w-full md:w-auto shrink-0 text-center font-mono">
            <div className="bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Pending</span>
              <span className="text-lg font-black text-amber-400">{unassignedQuotes.length}</span>
            </div>
            <div className="bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Assigned</span>
              <span className="text-lg font-black text-indigo-400">{assignedQuotes.length}</span>
            </div>
            <div className="bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Postcodes</span>
              <span className="text-lg font-black text-purple-400">{postcodes.length}</span>
            </div>
            <div className="bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Crew Staff</span>
              <span className="text-lg font-black text-emerald-400">{cleaners.length}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Sub-Tabs Toggle */}
        <div className="flex border-b border-slate-850 p-1 gap-2 self-start select-none">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === "operations"
                ? "bg-purple-600/10 border border-purple-500/30 text-purple-400 font-extrabold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Operations & Dispatch Board</span>
          </button>
          <button
            onClick={() => setActiveTab("omnichannel")}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === "omnichannel"
                ? "bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Omnichannel Customer Sync Manager</span>
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === "system"
                ? "bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-extrabold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System & Global Config Panel</span>
          </button>
          <button
            id="tab-btn-insights"
            onClick={() => setActiveTab("insights")}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === "insights"
                ? "bg-purple-600/10 border border-purple-500/30 text-purple-400 font-extrabold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Market Benchmarks & Expansion</span>
          </button>
        </div>

        {/* View Switch */}
        {activeTab === "operations" ? (
          <div className="space-y-10">
            {/* Staff Management Roster section */}
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">Active Cleaners Staff Roster</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Standard national accredited team members available for service bookings dispatcher.</p>
                </div>
                <button
                  onClick={() => setShowRosterForm(!showRosterForm)}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all outline-none cursor-pointer border-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showRosterForm ? "Close Form" : "Add Accredited Cleaner"}</span>
                </button>
              </div>

              {/* New Cleaner Roster Form */}
              {showRosterForm && (
                <form onSubmit={handleCreateCleaner} className="bg-slate-950 p-5 rounded-2xl border border-purple-500/15 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam Vance"
                      value={newCleanerName}
                      onChange={(e) => setNewCleanerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0412 345 678"
                      value={newCleanerPhone}
                      onChange={(e) => setNewCleanerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="grow">
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Email address</label>
                      <input
                        type="email"
                        placeholder="e.g. liam@clean.com.au"
                        value={newCleanerEmail}
                        onChange={(e) => setNewCleanerEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold px-4 py-2.5 h-[34px] flex items-center justify-center outline-none cursor-pointer border-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Roster Badges / list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {cleaners.map((cleaner) => (
                  <div key={cleaner.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-start justify-between gap-3 font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <p className="font-bold text-white text-xs">{cleaner.name}</p>
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-600" /> {cleaner.phone}</p>
                        <p className="flex items-center gap-1 truncate max-w-[150px]"><Mail className="w-3 h-3 text-slate-600" /> {cleaner.email}</p>
                        <p className="text-purple-400 font-semibold mt-1">⭐️ {cleaner.rating.toFixed(1)} Crew Certified</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveCleaner(cleaner.id)}
                      className="text-slate-600 hover:text-red-400 hover:bg-slate-900 p-1 rounded-lg transition-colors outline-none cursor-pointer border-0"
                      title="De-register cleaner from roster"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Split: Dispatcher Creator on the Left, Core Dispatches List on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Creator Box: Left (4 columns) */}
              <div className="lg:col-span-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-white text-base">Direct Job Dispatcher</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Push manual bookings directly into the active staff directory telemetry streams.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/10">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    By submitting this manual entry, a synthetic lead will be instantiated on the telemetry stack. This allows direct assignment of cleaners without client-side interactive calculators.
                  </p>
                </div>

                <form onSubmit={handleCreateManualJob} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alice Sinclair"
                      value={newJobName}
                      onChange={(e) => setNewJobName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Phone *</label>
                      <input
                        type="text"
                        required
                        placeholder="0400 111 222"
                        value={newJobPhone}
                        onChange={(e) => setNewJobPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Postcode *</label>
                      <input
                        type="text"
                        required
                        placeholder="6007"
                        value={newJobPostcode}
                        onChange={(e) => setNewJobPostcode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Client Email</label>
                    <input
                      type="email"
                      placeholder="alice.s@example.com"
                      value={newJobEmail}
                      onChange={(e) => setNewJobEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Service Type</label>
                    <select
                      value={newJobService}
                      onChange={(e) => setNewJobService(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer font-mono"
                    >
                      {services.map((x) => (
                        <option key={x.name} value={x.name} className="bg-slate-950 text-slate-100">
                          {x.name} (${x.baseRatePerHour}/h)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Total Fee ($) *</label>
                      <input
                        type="number"
                        required
                        placeholder="180"
                        value={newJobPrice}
                        onChange={(e) => setNewJobPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Special dispatch notes</label>
                    <textarea
                      rows={2}
                      placeholder="HEPA micro vacuuming required..."
                      value={newJobNotes}
                      onChange={(e) => setNewJobNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.2 text-xs text-white placeholder-slate-750 outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-extrabold py-3.5 transition-all outline-none cursor-pointer hover:shadow-lg active:scale-95 border-0"
                  >
                    Transmit Dispatch Job Roster
                  </button>
                </form>
              </div>

              {/* Quotes Board List: Right (8 columns) */}
              <div className="lg:col-span-8 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
                <div>
                  <h3 className="font-extrabold text-white text-base">Unassigned Work orders</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Incoming leads generated. Match geographic locations and route to accredited crew members.</p>
                </div>

                {unassignedQuotes.length === 0 ? (
                  <div className="bg-slate-950 p-10 rounded-2xl border border-slate-850 text-center text-slate-500 text-xs">
                    <p className="font-semibold">🍵 All active orders are routed and dispatched!</p>
                    <p className="text-[10px] text-slate-600 mt-1">Telemetry buffer currently quiet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unassignedQuotes.map((quote) => (
                      <div key={quote.id} className="bg-slate-950 rounded-2xl border-l-[3px] border-l-amber-500 border-y border-r border-slate-850 p-4.5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-500 uppercase tracking-widest leading-none">
                              Pending matching
                            </span>
                            <h4 className="font-extrabold text-white text-xs mt-1">{quote.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {quote.serviceName}
                              {quote.propertyType && <span className="text-indigo-400 font-bold ml-2">🏡 {quote.propertyType}</span>}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-black text-white shrink-0 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            ${quote.estimatedTotal ?? 180}
                          </span>
                        </div>

                        {quote.notes && (
                          <p className="bg-slate-900 text-[10px] text-slate-400 p-2.5 rounded-lg border border-slate-850 leading-relaxed font-mono">
                            📝 {quote.notes}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 leading-none font-mono py-1">
                          <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> {quote.postcode}</p>
                          <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-400" /> {quote.timestamp}</p>
                        </div>

                        {/* Dispatch Match Selector drop */}
                        <div className="pt-2 border-t border-slate-850 space-y-2 font-mono">
                          <label className="block text-[9px] uppercase font-bold text-slate-500">Route Cleaner Crew</label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignCleaner(quote.id, e.target.value);
                              }
                            }}
                            defaultValue=""
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-[10px] text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="">-- Match available crew --</option>
                            {cleaners.map((cl) => (
                              <option key={cl.id} value={cl.name}>
                                {cl.name} (⭐{cl.rating.toFixed(1)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assigned dispatches Board */}
                <div className="pt-6 border-t border-slate-850 mt-6">
                  <div>
                    <h3 className="font-extrabold text-white text-base">Active Crew Assignments</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time status tracking of allocated cleans in the field.</p>
                  </div>

                  {assignedQuotes.length === 0 ? (
                    <div className="bg-slate-950 py-10 rounded-2xl border border-slate-850 text-center text-slate-500 text-xs mt-4">
                      <p className="font-semibold">🚨 No crew assignments presently active.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Assign cleaners using the pending routers above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {assignedQuotes.map((quote) => (
                        <div key={quote.id} className="bg-slate-950 rounded-2xl border-l-[3px] border-l-purple-500 border-y border-r border-slate-850 p-4.5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-purple-500/10 text-purple-400 uppercase tracking-widest leading-none">
                                  Crew Dispatched
                                </span>
                                <h4 className="font-extrabold text-white text-xs mt-1">{quote.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {quote.serviceName}
                                  {quote.propertyType && <span className="text-indigo-400 font-bold ml-2">🏡 {quote.propertyType}</span>}
                                </p>
                              </div>
                              <span className="font-mono text-xs font-black text-white shrink-0 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                ${quote.estimatedTotal ?? 180}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-400 font-mono py-1.5 border-y border-slate-850">
                              <span>Postcode: {quote.postcode}</span>
                              <span className="text-right">Roster: {quote.timestamp}</span>
                              <div className="col-span-2 text-purple-300 flex items-center gap-1 mt-1 leading-none">
                                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                <span><strong>Accredited Crew:</strong> {quote.assignedCleaner}</span>
                              </div>
                            </div>
                          </div>

                          {/* Unassign options */}
                          <div className="flex justify-between items-center gap-4 pt-1 font-mono">
                            <span className="text-[9px] text-slate-500 italic">
                              {quote.bookingStatus === "completed" ? "✅ Completed Successfully" : "📡 Syncing live telemetry..."}
                            </span>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUnassignCleaner(quote.id)}
                                className="bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold border border-slate-800 px-2.5 py-1.5 rounded-xl text-[9px] transition-colors outline-none cursor-pointer border-0"
                              >
                                Revoke Cleaner
                              </button>
                              <button
                                onClick={() => onRemoveQuote(quote.id)}
                                className="text-slate-600 hover:text-red-400 hover:bg-slate-900 p-1.5 rounded-xl transition-colors outline-none cursor-pointer border-0"
                                title="Delete specific job log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "omnichannel" ? (
          <div className="space-y-8">
            {/* Header / Intro Card */}
            <div className="bg-slate-900 bg-opacity-70 border border-emerald-500/10 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" /> Regional Omnichannel Support Management
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Synchronise live client variables, coordinate real-time Chatwoot REST broker dispatches, and trigger ISO inspection scores.
                  </p>
                </div>
                <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-450 flex items-center gap-1">
                  <span>DISCONNECT HOOK:</span> <strong className="text-emerald-400 animate-pulse">ACTIVE SYNC</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Sarah Reynolds Simulator Hooks */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Spotlight Sarah Reynolds Selector controls */}
                <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">👤</span>
                      <div>
                        <h4 className="font-extrabold text-white text-xs">Target Client: Sarah Reynolds</h4>
                        <p className="text-[9px] text-slate-500 font-mono">Job ID: booking_101 &bull; Postcode: 6007</p>
                      </div>
                    </div>
                    <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      Spotlight Account
                    </span>
                  </div>

                  {/* Core State Sync Toggles */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">1. Update Live Journey Status (Cascaded on customer dashboard)</span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { status: "pending", label: "Pending", bg: "hover:bg-amber-600/25" },
                          { status: "allocated", label: "Assigned", bg: "hover:bg-blue-600/25" },
                          { status: "en-route", label: "En Route", bg: "hover:bg-orange-600/25" },
                          { status: "completed", label: "Completed", bg: "hover:bg-emerald-600/25" }
                        ].map((btn) => {
                          const sarahBooking = quotes.find(q => q.id === "booking_101");
                          const isActive = sarahBooking?.bookingStatus === btn.status;
                          return (
                            <button
                              key={btn.status}
                              onClick={() => {
                                if (sarahBooking) {
                                  onUpdateQuote({
                                    ...sarahBooking,
                                    bookingStatus: btn.status as any
                                  });
                                }
                              }}
                              className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isActive 
                                  ? "bg-purple-600 border-purple-400 text-white font-extrabold shadow-md transform scale-102"
                                  : `bg-slate-900 border-slate-850 text-slate-400 ${btn.bg} hover:text-slate-200`
                              }`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-sans leading-normal">
                        Selecting any of these instantly pushes dynamic updates to Sarah's dashboard including live maps ETA and status chips.
                      </p>
                    </div>

                    {/* Quality Slide Preset upload simulated triggers */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">2. ISO clean inspections: Simulate before-after upload</span>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            alert("Before-after photo presets simulated on customer’s dashboard screen.");
                          }}
                          className="flex-1 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-indigo-450 hover:text-white text-[10px] font-extrabold rounded-lg tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Push Boardroom EXIF photos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert("Dynamic clean score validated and synchronized at 98%.");
                          }}
                          className="flex-1 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-450 hover:text-white text-[10px] font-extrabold rounded-lg tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Lock Standard at 98%
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Chatwoot Omnipanel CRM & Dispute desk */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Operations Dispute triage */}
                <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-1.5 text-zinc-350 font-extrabold text-xs">
                    <span className="p-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded">🚨</span>
                    <span>Direct client Escalations Triage</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal font-sans">
                    Operations monitoring for customer disputes. If a client objects to standard cleaning checklists, their file triage review queues here:
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-white">Sarah Reynolds</span>
                      <span className="text-[10px] text-rose-450 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded font-mono font-bold">
                        DISPUTE IN-QUEUE
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-sans">
                      Client initiated a checkmark conflict warning on booking #booking_101.
                    </p>
                    
                    <div className="flex gap-2 pt-2 uppercase text-[9px] font-black">
                      <button 
                        type="button"
                        onClick={() => {
                          alert("Granted promotional credits to customer's account.");
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer"
                      >
                        Grant Credits
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          alert("Re-routed team leader SMS dispatch triggers.");
                        }}
                        className="flex-1 py-2 bg-slate-900 border border-slate-800 hover:text-white text-slate-400 rounded-lg transition-all cursor-pointer"
                      >
                        Roster Team Leader
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulated SMS and WhatsApp dispatch logger */}
                <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800/85 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1">
                      <Smartphone className="w-4 h-4 text-emerald-400" /> WhatsApp & SMS broker streams
                    </span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 text-[10px] font-mono text-zinc-400 max-h-40 overflow-y-auto space-y-2.5">
                    <div>
                      <span className="text-purple-400 font-bold block">[WhatsApp Out]:</span>
                      <span className="text-slate-300">"Your regular specialist Liam Vance is 2.4 km away. Follow here: http://localhost:3000/dashboard"</span>
                      <span className="text-zinc-600 block text-[8px] mt-0.5">Time: 11:42 AM</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold block">[Chatwoot Reply In]:</span>
                      <span className="text-slate-350">"Thank you! Silca criteria checks successfully applied."</span>
                      <span className="text-zinc-600 block text-[8px] mt-0.5">Time: 11:44 AM</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : activeTab === "system" ? (
          /* SYSTEM CONFIG PANEL TAB */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Geographic covers (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* State switches */}
              <div className="bg-slate-905 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">State Coverage Posture</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Toggle states to instantly halt/enable all corresponding postcodes. Great for national blackout controls.</p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  {states.map((state) => (
                    <button
                      key={state.code}
                      onClick={() => handleToggleState(state.code)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                        state.isActive 
                          ? "bg-purple-950/20 border-purple-500/30 text-purple-400 shadow-inner" 
                          : "bg-slate-950 border-slate-850 text-slate-500 brightness-50"
                      }`}
                    >
                      <Globe className={`w-3.5 h-3.5 ${state.isActive ? "text-purple-400 animate-pulse" : "text-slate-605"}`} />
                      <span>{state.name} ({state.code})</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${state.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Add and Manage Postcodes */}
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-white text-base">Suburb & Postcode Router</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manage live localized postcodes, rate multipliers, and service exclusions.</p>
                  </div>
                </div>

                {/* Add postcode zone inline form */}
                <form onSubmit={handleAddPostcode} className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/10 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Postcode</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 6000"
                      maxLength={4}
                      value={newPC}
                      onChange={(e) => setNewPC(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Suburb / Zone Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Perth Inner Core"
                      value={newPCSuburb}
                      onChange={(e) => setNewPCSuburb(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">State</label>
                    <select
                      value={newPCState}
                      onChange={(e) => setNewPCState(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer font-mono"
                    >
                      {states.map(s => (
                        <option key={s.code} value={s.code}>{s.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Multiplier</label>
                    <input
                      type="text"
                      required
                      placeholder="1.15"
                      value={newPCMultiplier}
                      onChange={(e) => setNewPCMultiplier(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 sm:col-span-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold py-2 flex items-center justify-center gap-1 cursor-pointer transition-all border-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Postcode Surcharge Zone</span>
                  </button>
                </form>

                {/* Postcode list filter search bar */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search postcode code, name, or state..."
                      value={postcodeSearch}
                      onChange={(e) => setPostcodeSearch(e.target.value)}
                      className="grow bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-700 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* List of postcodes */}
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {filteredPostcodes.map((pc) => {
                      const stateParent = states.find(s => s.code === pc.state);
                      const isStateOff = stateParent ? !stateParent.isActive : false;
                      const totallyDisabled = !pc.isActive || isStateOff;

                      return (
                        <div 
                          key={pc.code} 
                          className={`bg-slate-950 p-4.5 rounded-2xl border transition-all ${
                            totallyDisabled 
                              ? "border-red-500/10 bg-red-950/5 relative" 
                              : "border-slate-850"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 font-mono">
                                <span className="bg-slate-900 border border-slate-850 text-white font-black text-xs px-2 py-0.5 rounded">
                                  {pc.code}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-extrabold">
                                  {pc.state}
                                </span>
                                <span className="text-white text-xs font-bold leading-none">{pc.suburb}</span>
                                {isStateOff && (
                                  <span className="text-[8px] bg-red-950 text-red-400 font-black tracking-widest px-1.5 py-0.5 border border-red-500/30 uppercase rounded leading-none">
                                    State deactivated
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Control switches */}
                            <div className="flex flex-wrap items-center gap-3.5">
                              {/* Price Multiplier */}
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-[10px] text-slate-500">Mult:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.5"
                                  max="3.0"
                                  value={pc.multiplier}
                                  onChange={(e) => handleUpdatePCMultiplier(pc.code, Number(e.target.value))}
                                  className="w-14 bg-slate-900 border border-slate-800 text-slate-200 text-xs text-center rounded py-1 font-bold outline-none"
                                />
                              </div>

                              {/* Toggle active / inactive */}
                              <button
                                onClick={() => handleTogglePostcode(pc.code)}
                                disabled={isStateOff}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold select-none cursor-pointer transition-all border ${
                                  pc.isActive && !isStateOff
                                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                                    : "bg-red-950/20 border-red-500/20 text-red-500 opacity-80"
                                }`}
                              >
                                {pc.isActive && !isStateOff ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                    <span>Active Coverage</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-red-400" />
                                    <span>Suspended</span>
                                  </>
                                )}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleRemovePostcode(pc.code)}
                                className="text-slate-650 hover:text-red-400 p-1 rounded-lg hover:bg-slate-900 outline-none cursor-pointer border-0"
                                title="Remove postcode from schema mapping list"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* In-Line service restrictions collapsible box */}
                          <div className="mt-3.5 pt-3.5 border-t border-slate-900/80 space-y-2">
                            <span className="block text-[8px] uppercase tracking-widest font-black text-slate-500">
                              Service Exclusion Guardrails (Uncheck to restrict in {pc.suburb})
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {services.map((svc) => {
                                const isAllowed = !pc.disabledServices.includes(svc.slug);
                                return (
                                  <label 
                                    key={svc.slug} 
                                    className={`flex items-center gap-1.5 text-[10px] font-mono cursor-pointer select-none py-1.5 px-2 rounded-lg border transition-all ${
                                      isAllowed 
                                        ? "bg-slate-900/60 border-slate-850 text-slate-300"
                                        : "bg-red-950/30 border-red-500/10 text-red-400/80 line-through decoration-red-500/40"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAllowed}
                                      onChange={() => handleTogglePCService(pc.code, svc.slug)}
                                      className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer w-3 h-3"
                                    />
                                    <span className="truncate">{svc.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Services Surcharges & Guardrails (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Service Price Manager */}
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
                <div>
                  <h3 className="font-extrabold text-white text-base">Service Hourly Base Rates</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Customize default hourly base charges for each catalog listing. Modifiers recalculate instantly.</p>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {services.map((svc) => (
                    <div key={svc.slug} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between gap-4 font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xl shrink-0">{svc.icon}</span>
                        <div className="truncate">
                          <p className="font-extrabold text-white text-xs leading-tight truncate">{svc.name}</p>
                          <span className="text-[9px] uppercase font-bold text-slate-500">
                            {svc.category} Rate
                          </span>
                        </div>
                      </div>

                      {/* Base Rate field setter */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-500 text-xs">$</span>
                        <input
                          type="number"
                          value={svc.baseRatePerHour}
                          onChange={(e) => handleUpdateServiceRate(svc.slug, Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-black text-center py-1.5 rounded-xl focus:border-indigo-500 outline-none"
                        />
                        <span className="text-slate-500 text-[10px]">/ hr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* suggested config guardrails */}
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-6">
                <div>
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[8px] uppercase font-mono font-black tracking-wider self-start inline-flex">
                    <Shield className="w-2.5 h-2.5" /> High Margin Safeguards
                  </div>
                  <h3 className="font-extrabold text-white text-base mt-2">Operational Surcharges & Guardrails</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Custom configurations designed to absorb logistics volatility and protect margins during high-intensity scenarios.</p>
                </div>

                {/* Travel surcharge */}
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1">
                        <MapPin className="text-indigo-400 w-3.5 h-3.5" /> Mobilisation Travel Fee
                      </label>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-slate-500 text-xs">$</span>
                        <input
                          type="number"
                          value={travelSurcharge}
                          onChange={(e) => onUpdateTravelSurcharge && onUpdateTravelSurcharge(Number(e.target.value))}
                          className="w-14 bg-slate-900 border border-slate-800 text-center py-1 rounded text-xs font-bold text-white outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Fixed logistics fuel and travel buffer applied to each dispatch to cover remote transit coordinates. Set to 0 to disable.
                    </p>
                  </div>

                  {/* Priority dispatch surcharge toggle */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1">
                        <TrendingUp className="text-purple-400 w-3.5 h-3.5 animate-bounce" /> Emergency Same-Day Priority Factor
                      </label>
                      <button
                        onClick={() => onUpdateUrgentActive && onUpdateUrgentActive(!isUrgentActive)}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black border cursor-pointer font-mono ${
                          isUrgentActive 
                            ? "bg-purple-950 bg-opacity-30 border-purple-500 text-purple-400" 
                            : "bg-slate-900 border-slate-800 text-slate-500"
                        }`}
                      >
                        {isUrgentActive ? "ACTIVE (+20%)" : "INACTIVE (1x)"}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Trigger flat 1.20x premium rate multi-factor globally. Enables rapid dispatch priority in under 180 minutes.
                    </p>
                  </div>

                  {/* Capacity Min Limit */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1">
                        <Sliders className="text-indigo-400 w-3.5 h-3.5" /> Minimum Booking Threshold
                      </label>
                      <select
                        value={minHoursLimit}
                        onChange={(e) => onUpdateMinHoursLimit && onUpdateMinHoursLimit(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-bold text-slate-200 cursor-pointer text-center"
                      >
                        <option value="2">2 Hrs Minimum</option>
                        <option value="3">3 Hrs Minimum</option>
                        <option value="4">4 Hrs Minimum</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Prevent micro-orders. Restricts client calculator from booking hours smaller than this limit to preserve team member WHS trip metrics.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* INSIGHTS & MARKET BENCHMARKS VIEW */
          <div id="admin-insights-tab" className="space-y-8 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-slate-900 border border-purple-500/10 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <p className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" /> Regional Market Expansion Radar
              </p>
              <h3 className="text-xl font-bold text-white mt-1">Competitor Benchmarks & Territory Strategy</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-4xl font-sans font-normal">
                Analyse cleaning agency densities across Western Australian councils, toggle expansion states, and trigger automatic analytical reports comparing AastaClean telemetry logs with regional baseline prices.
              </p>
            </div>

            {/* Section 1: Competitor Benchmarking Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left 7 Columns: Benchmarking View */}
              <div className="lg:col-span-7 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-5">
                <div>
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                    📊 Western Australian Competitor Rates Chart
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live comparative breakdown of average hourly rates between AastaClean's active services ($/{
                      (services.reduce((acc, s) => acc + s.baseRatePerHour, 0) / services.length).toFixed(0)
                    } hr baseline) versus established WA agencies.
                  </p>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { council: "Joondalup", AastaClean: 55, Competitors: 68, Gap: 13 },
                        { council: "Stirling", AastaClean: 58, Competitors: 70, Gap: 12 },
                        { council: "Perth City", AastaClean: 60, Competitors: 75, Gap: 15 },
                        { council: "Melville", AastaClean: 58, Competitors: 69, Gap: 11 },
                        { council: "Fremantle", AastaClean: 62, Competitors: 72, Gap: 10 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="council" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit=" $" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#f8fafc" }}
                        itemStyle={{ fontSize: "11px" }}
                        labelStyle={{ fontSize: "11px", fontWeight: "bold" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="AastaClean" fill="#6366f1" radius={[4, 4, 0, 0]} name="AastaClean Rate ($/hr)" />
                      <Bar dataKey="Competitors" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Local Competitor Mean ($/hr)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Suburbs Metrics List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Max Value Advantage</span>
                    <span className="text-sm font-black text-emerald-400 mt-1 block">Perth City +$15.00/hr margins</span>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">Optimised logistics give us maximum competitive traction here.</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Lowest Price Variance</span>
                    <span className="text-sm font-black text-indigo-400 mt-1 block">Fremantle +$10.00/hr gap</span>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">Tighter pool. Recommending organic loyalty rewards to guard retainers.</p>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Expansion Strategy Module (Toggle auxiliary states) */}
              <div className="lg:col-span-5 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/85 space-y-5">
                <div>
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                    🌏 Australian State Expansion strategy
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle target Australian states to simulate fetching local competitor density and average price models.
                  </p>
                </div>

                {/* State Toggles List */}
                <div className="space-y-4 pt-1">
                  {(Object.entries(expansionStates) as [string, any][]).map(([stateCode, info]) => (
                    <div key={stateCode} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                            {stateCode}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-300 block leading-tight">
                              {stateCode === "NSW" && "New South Wales"}
                              {stateCode === "VIC" && "Victoria"}
                              {stateCode === "QLD" && "Queensland"}
                              {stateCode === "SA" && "South Australia"}
                              {stateCode === "TAS" && "Tasmania"}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-mono">{info.postcodeFocus}</span>
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          onClick={() => handleToggleExpansionState(stateCode)}
                          className="focus:outline-none outline-none cursor-pointer border-0"
                        >
                          {info.active ? (
                            <ToggleRight className="w-8 h-8 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-600" />
                          )}
                        </button>
                      </div>

                      {/* Decoded regional competitor data details */}
                      {info.active && (
                        <div className="border-t border-slate-850/60 pt-2.5 pb-0.5 grid grid-cols-2 gap-2 text-[10px] font-mono">
                          {info.loading ? (
                            <div className="col-span-2 flex items-center gap-2 justify-center py-2 text-purple-400">
                              <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              <span>Acquiring local market vectors...</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-slate-500 block">COMPETITORS:</span>
                                <strong className="text-red-400">{info.density} agencies</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block">AVG PRICE:</span>
                                <strong className="text-slate-200">${info.avgPrice}.00 AUD</strong>
                              </div>
                              <div className="col-span-2 mt-1 bg-slate-900 px-2 py-1 rounded border border-slate-850/40 text-[9px]">
                                <span className="text-slate-500 font-bold mr-1">TOP REGIONAL RIVAL:</span>
                                <span className="text-purple-300">{info.topCompetitor}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Section 2: Weekly Automated Insights Analysis */}
            <div className="bg-slate-900 bg-opacity-70 border border-indigo-500/10 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  🛡️ Automated Weekly Expansion Advisor Report
                </h4>
                <div className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono font-bold px-2.5 py-0.5 rounded border border-indigo-500/20">
                  REF: AASTA-INSPECT-{new Date().getFullYear()}
                </div>
              </div>

              {/* Weekly insight report content computed dynamically */}
              <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed font-normal">
                <p>
                  AastaClean's automatic analytics engine has assessed **{quotes.length}** historical dispatch logs across Western Australia's active municipal postcodes, cross-correlating pricing factors against the current state expansion profile.
                </p>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Actionable Territory Intelligence</span>
                  
                  {/* Insight Bullet 1 */}
                  <div className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-200">Western Australia Price Protection:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Our current average service base rate is **${
                          (services.reduce((acc, s) => acc + s.baseRatePerHour, 0) / services.length).toFixed(2)
                        }/hr**. Compared to Fremantle's average alternative of **$72.00/hr**, AastaClean holds a cost superiority advantage. Keep WA prices fixed to scale penetration.
                      </p>
                    </div>
                  </div>

                  {/* Insight Bullet 2 */}
                  <div className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-200">Expansion Strategy Feasibility:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {(Object.values(expansionStates) as any[]).filter(v => v.active).length === 0 ? (
                          "No foreign states active yet. Toggle NSW or VIC in the state controller above to generate local competitive density profiles and comparative pricing charts."
                        ) : (
                          `You have activated ${(Object.entries(expansionStates) as [string, any][]).filter(([_, v]) => v.active).map(([k]) => k).join(", ")}. High yield average price targets of $85.00 exist in active states. Prepare to onboard first-wave accredited crew leaders.`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Insight Bullet 3 */}
                  <div className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-200">Recommended Allocation Priority:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {quotes.length > 3 ? (
                          `With ${quotes.length} active quotes parsed in WA, allocate travel surcharge reserves (${travelSurcharge ? `$${travelSurcharge}` : "N/A"}) dynamically into Joondalup and Stirling postcodes where competitor price variance is highest.`
                        ) : (
                          "Volume of quote dispatches is currently low. Simulate high-density postcodes queries inside the calculator widget to populate our weekly analytics model."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-[10px] text-slate-500 font-mono">
                  <span>Authorized Signature: Regional Admin Console</span>
                  <span>Confidence Index Score: {quotes.length > 5 ? "High (92%)" : "Medium-Low (74%)"}</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
