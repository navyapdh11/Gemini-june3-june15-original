import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  MapPin, 
  Percent, 
  HelpCircle, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Users, 
  Sparkles, 
  ChevronRight, 
  Layers, 
  BadgePercent,
  Sliders,
  Send,
  Plus,
  Minus,
  Check,
  ShieldAlert,
  SlidersHorizontal,
  Briefcase,
  Home,
  Wrench
} from "lucide-react";
import { allServices, demoPostcodes } from "../data";
import { ServiceItem, PostcodeCoverage, StateCoverage } from "../types";
import { subserviceRegistry, defaultSubservices, addonRegistry } from "../servicesCatalog";
import { SERVICE_METADATA } from "../config/ServiceCatalog";
import { calculateQuote } from "../utils/PricingCalculator";

interface PricingCalculatorProps {
  onOpenQuote: (service?: string) => void;
  onTriggerLog: (log: any) => void;
  services?: ServiceItem[];
  postcodes?: PostcodeCoverage[];
  states?: StateCoverage[];
  travelSurcharge?: number;
  isUrgentActive?: boolean;
  minHoursLimit?: number;
}

export default function PricingCalculator({ 
  onOpenQuote, 
  onTriggerLog,
  services = allServices,
  postcodes,
  states,
  travelSurcharge = 15,
  isUrgentActive = false,
  minHoursLimit = 3
}: PricingCalculatorProps) {
  const [selectedServiceSlug, setSelectedServiceSlug] = useState("end-of-lease-cleaning");
  
  // 🚀 Enterprise SERVICE_METADATA v4 Dynamic Engine States
  const [useMetadataEngine, setUseMetadataEngine] = useState<boolean>(true);
  const [selectedMetadataId, setSelectedMetadataId] = useState<string>("end-of-lease");
  const [metadataSubservice, setMetadataSubservice] = useState<string>("");
  const [metadataAddons, setMetadataAddons] = useState<string[]>([]);
  const [metadataHours, setMetadataHours] = useState<number>(4);
  const [metadataPropertyType, setMetadataPropertyType] = useState<string>("2br");
  const [metadataSqm, setMetadataSqm] = useState<number>(85);
  const [metadataRoomCounters, setMetadataRoomCounters] = useState<Record<string, number>>({
    bedroom: 3,
    livingRoom: 1,
    hallway: 1,
    staircase: 0
  });
  const [metadataItemCounters, setMetadataItemCounters] = useState<Record<string, number>>({
    armchair: 1,
    sofaSeat: 3,
    diningChair: 4,
    mattress: 1
  });

  // Automatically sync initial sub-services when switching main metadata services
  useEffect(() => {
    const serviceObj = SERVICE_METADATA[selectedMetadataId];
    if (serviceObj) {
      if (serviceObj.subservices && serviceObj.subservices.length > 0) {
        setMetadataSubservice(serviceObj.subservices[0]);
      } else {
        setMetadataSubservice("");
      }
      setMetadataAddons([]);
    }
  }, [selectedMetadataId]);

  const [customPostcode, setCustomPostcode] = useState("2000");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("aastaclean_recent_postcodes");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local storage read error in calculator:", e);
    }
  }, []);
  const [frequency, setFrequency] = useState<"once" | "weekly" | "fortnightly" | "monthly">("once");
  const [customHours, setCustomHours] = useState<number>(4);
  const [suburbInfo, setSuburbInfo] = useState({ 
    suburb: "Sydney CBD", 
    state: "NSW", 
    multiplier: 1.30, 
    isActive: true, 
    disabledServices: [] as string[] 
  });

  // Dynamic Size / Quantity Counters
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);

  const [deskCount, setDeskCount] = useState<number>(20);
  const [communalCount, setCommunalCount] = useState<number>(1);

  // Subservice Tiers & Add-ons
  const [selectedSubserviceSlug, setSelectedSubserviceSlug] = useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const activeService = services.find(s => s.slug === selectedServiceSlug) || services[0] || allServices[0];

  // Helper arrays for current context
  const activeSubservices = subserviceRegistry[selectedServiceSlug] || defaultSubservices;
  const currentSubservice = activeSubservices.find(s => s.slug === selectedSubserviceSlug) || activeSubservices[0];
  const activeAddons = addonRegistry.filter(a => a.categories.includes(activeService.category as any));

  // Auto-reset subservice and add-on states on service slug change
  useEffect(() => {
    if (activeSubservices && activeSubservices.length > 0) {
      setSelectedSubserviceSlug(activeSubservices[0].slug);
    } else {
      setSelectedSubserviceSlug("");
    }
    // De-select add-ons that aren't valid for the new service category
    setSelectedAddonIds([]);
  }, [selectedServiceSlug]);

  // Generate intelligent recommended duration & sync slider base hours
  useEffect(() => {
    let reHours = activeService.durationEstimateHours;

    if (activeService.category === "Domestic") {
      // Benchmark: Each extra bedroom (+0.5h) and extra bathroom (+0.75h) above 1 increases duration
      reHours += Math.max(0, (bedrooms - 1) * 0.5);
      reHours += Math.max(0, (bathrooms - 1) * 0.75);
    } else if (activeService.category === "Commercial") {
      // Benchmark: Every 10 desk stations adds 0.5h, each communal area adds 0.5h
      reHours += Math.max(0, Math.floor(deskCount / 10) * 0.5);
      reHours += Math.max(0, communalCount * 0.5);
    }

    // Include subservice multiplier/offset hours
    if (currentSubservice) {
      reHours += currentSubservice.hoursOffset;
    }

    const cleanHours = Math.round(Math.max(minHoursLimit, reHours) * 2) / 2; // Round to nearest 0.5
    setCustomHours(cleanHours);
  }, [selectedServiceSlug, bedrooms, bathrooms, deskCount, communalCount, selectedSubserviceSlug, minHoursLimit]);

  // Zipcode detection (Real-time and fallback state routers)
  useEffect(() => {
    const pc = customPostcode.trim();

    if (/^\d{4}$/.test(pc)) {
      try {
        const stored = localStorage.getItem("aastaclean_recent_postcodes");
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(pc)) {
          const updated = [pc, ...list.filter(p => p !== pc)].slice(0, 5);
          localStorage.setItem("aastaclean_recent_postcodes", JSON.stringify(updated));
          setRecentSearches(updated);
        }
      } catch (e) {
        console.error("Local storage update error in calculator:", e);
      }
    }

    if (postcodes) {
      const match = postcodes.find(p => p.code === pc);
      if (match) {
        const stateMatch = states?.find(s => s.code === match.state);
        const stateActive = stateMatch ? stateMatch.isActive : true;

        setSuburbInfo({
          suburb: match.suburb,
          state: match.state,
          multiplier: match.multiplier,
          isActive: match.isActive && stateActive,
          disabledServices: match.disabledServices || []
        });
        return;
      }
    }

    // Static lookup fallback
    let calculatedSuburb = "Metropolitan Ingress";
    let calculatedState = "National Network";
    let multiplier = 1.10;
    let isActive = true;

    if (pc.startsWith("2")) {
      calculatedSuburb = pc === "2000" ? "Sydney Central Corridor" : "New South Wales Metro Area";
      calculatedState = "NSW";
      multiplier = pc === "2000" ? 1.30 : 1.15;
    } else if (pc.startsWith("3")) {
      calculatedSuburb = pc === "3000" ? "Melbourne CBD Inner Loop" : "Victoria Greater Region";
      calculatedState = "VIC";
      multiplier = pc === "3000" ? 1.20 : 1.10;
    } else if (pc.startsWith("4")) {
      calculatedSuburb = pc === "4000" ? "Brisbane Waterfront Zone" : "Queensland Coastal Ingress";
      calculatedState = "QLD";
      multiplier = pc === "4000" ? 1.15 : 1.05;
    } else if (pc.startsWith("5")) {
      calculatedSuburb = "Adelaide Plains Transit";
      calculatedState = "SA";
      multiplier = 1.05;
    } else if (pc.startsWith("6")) {
      calculatedSuburb = pc === "6000" ? "Perth Inner Core Limit" : pc === "6007" ? "West Leederville Suburbs" : "Western Australia Hub";
      calculatedState = "WA";
      multiplier = pc === "6000" ? 1.15 : 1.00;
    } else if (pc.startsWith("7")) {
      calculatedSuburb = "Hobart Port Precinct";
      calculatedState = "TAS";
      multiplier = 1.05;
    } else if (pc.startsWith("0")) {
      calculatedSuburb = "Darwin Waterfront Dist.";
      calculatedState = "NT";
      multiplier = 1.25;
    } else if (pc.length === 4) {
      calculatedSuburb = "Regional Australian Segment";
      calculatedState = "MUNICIPAL";
      multiplier = 1.08;
    } else {
      isActive = false;
    }

    if (states) {
      const stateMatch = states.find(s => s.code === calculatedState);
      if (stateMatch && !stateMatch.isActive) {
        isActive = false;
      }
    }

    setSuburbInfo({
      suburb: calculatedSuburb,
      state: calculatedState,
      multiplier: multiplier,
      isActive: isActive && pc.length === 4,
      disabledServices: []
    });

  }, [customPostcode, postcodes, states]);

  // Frequency Loyalty Discounts
  const getFrequencyDiscount = () => {
    switch (frequency) {
      case "weekly":
        return { percent: 15, m: 0.85, label: "15% Weekly Eco-Frequency" };
      case "fortnightly":
        return { percent: 10, m: 0.90, label: "10% Fortnightly Upkeep" };
      case "monthly":
        return { percent: 5, m: 0.95, label: "5% Monthly Loyalty Squeeze" };
      default:
        return { percent: 0, m: 1.00, label: "Standard Single-Clean" };
    }
  };

  const discountVal = getFrequencyDiscount();

  // Pricing calculations
  const baseRate = activeService.baseRatePerHour;
  const rawSubtotal = baseRate * customHours;

  // Subservice flat-offset matching standards
  const subserviceOffset = currentSubservice ? currentSubservice.priceOffset : 0;

  // Property Size Extra Surcharges (Australian standard pricing guidelines)
  let roomSurcharge = 0;
  if (activeService.category === "Domestic") {
    roomSurcharge += Math.max(0, (bedrooms - 1) * 25); // $25 each additional bedroom above 1 (standard)
    roomSurcharge += Math.max(0, (bathrooms - 1) * 40); // $40 each additional bathroom above 1
  } else if (activeService.category === "Commercial") {
    roomSurcharge += Math.floor(deskCount / 10) * 50;   // $50 per 10 workstations/desks
    roomSurcharge += communalCount * 35;               // $35 per office meeting/lunchroom
  }

  // Addons calculations list
  const selectedAddonsDetails = activeAddons.filter(a => selectedAddonIds.includes(a.id));
  const addonsTotal = selectedAddonsDetails.reduce((sum, current) => sum + current.price, 0);

  // Metadata calculations
  let metaBaseAndAddonsTotal = 0;
  const activeMetadata = SERVICE_METADATA[selectedMetadataId];

  if (useMetadataEngine && activeMetadata) {
    let inputData: any = { addons: metadataAddons };
    if (activeMetadata.model === "hourly") {
      inputData.hours = metadataHours;
    } else if (activeMetadata.model === "fixed") {
      inputData.propertyType = metadataPropertyType;
    } else if (activeMetadata.model === "per_room") {
      inputData = { ...metadataRoomCounters, addons: metadataAddons };
    } else if (activeMetadata.model === "per_item") {
      inputData = { ...metadataItemCounters, addons: metadataAddons };
    } else if (activeMetadata.model === "sqm") {
      inputData.sqm = metadataSqm;
    }
    metaBaseAndAddonsTotal = calculateQuote(selectedMetadataId, inputData);
  }

  // Unified Merge
  const combinedRawCleanTotal = useMetadataEngine
    ? metaBaseAndAddonsTotal
    : (rawSubtotal + subserviceOffset + roomSurcharge + addonsTotal);

  const geoInflation = combinedRawCleanTotal * (suburbInfo.multiplier - 1);
  const subtotalAfterInflation = combinedRawCleanTotal + geoInflation;

  const frequencyReduction = subtotalAfterInflation * (discountVal.percent / 100);
  const subtotalAfterDiscount = subtotalAfterInflation - frequencyReduction;

  // Surcharges matching dynamic panels
  const priorityInflation = isUrgentActive ? subtotalAfterDiscount * 0.20 : 0;
  const calculatedTotal = Math.round(subtotalAfterDiscount + priorityInflation + travelSurcharge);

  const handlePostcodePreset = (pc: string) => {
    setCustomPostcode(pc);
    onTriggerLog({
      id: `price_calc_preset_${Date.now()}`,
      type: "api",
      status: "success",
      message: `🎯 [Price Calculator] Auto-queried dynamic rate multiplier maps for Postcode: ${pc}`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Toggle addons
  const handleToggleAddon = (id: string) => {
    let nextAddons = [...selectedAddonIds];
    if (nextAddons.includes(id)) {
      nextAddons = nextAddons.filter(a => a !== id);
    } else {
      nextAddons.push(id);
    }
    setSelectedAddonIds(nextAddons);

    const addon = activeAddons.find(a => a.id === id);
    onTriggerLog({
      id: `price_calc_addon_${id}_${Date.now()}`,
      type: "system",
      status: "info",
      message: `➕ Modified optional addon toggle: "${addon?.name}" ($${addon?.price} AUD) in selection roster`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Push draft clean details to localStorage on submit
  const handleLockInEstimate = () => {
    const draftBooking = useMetadataEngine && activeMetadata 
      ? {
          serviceSlug: selectedMetadataId,
          serviceName: activeMetadata.name,
          postcode: customPostcode,
          frequency: frequency,
          hours: activeMetadata.model === "hourly" ? metadataHours : undefined,
          subserviceName: metadataSubservice || "Standard",
          bedroomCount: activeMetadata.model === "per_room" ? metadataRoomCounters.bedroom : undefined,
          bathroomCount: activeMetadata.model === "per_room" ? (metadataRoomCounters.bathroom || 1) : undefined,
          selectedAddons: metadataAddons.map(addonName => ({ name: addonName, price: activeMetadata.addonPrices?.[addonName] || 0, icon: "✨" })),
          calculatedTotal: calculatedTotal,
          metadataModel: activeMetadata.model
        }
      : {
          serviceSlug: selectedServiceSlug,
          serviceName: activeService.name,
          postcode: customPostcode,
          frequency: frequency,
          hours: customHours,
          subserviceName: currentSubservice ? currentSubservice.name : "Premium General",
          bedroomCount: activeService.category === "Domestic" ? bedrooms : undefined,
          bathroomCount: activeService.category === "Domestic" ? bathrooms : undefined,
          deskCount: activeService.category === "Commercial" ? deskCount : undefined,
          communalCount: activeService.category === "Commercial" ? communalCount : undefined,
          selectedAddons: selectedAddonsDetails.map(a => ({ name: a.name, price: a.price, icon: a.icon })),
          calculatedTotal: calculatedTotal
        };

    localStorage.setItem("aastaclean_current_booking_draft", JSON.stringify(draftBooking));

    onTriggerLog({
      id: `price_calc_draft_save_${Date.now()}`,
      type: "api",
      status: "success",
      message: `💾 Handshake successful: Saved booking draft parameters to local storage registry. Transitioning customer details...`,
      payload: draftBooking,
      timestamp: new Date().toLocaleTimeString(),
    });

    onOpenQuote(useMetadataEngine && activeMetadata ? activeMetadata.name : activeService.name);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Block */}
        <div id="pricing-header-panel" className="text-center max-w-3xl mx-auto space-y-4">
          <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 select-none font-sans">
            <BadgePercent className="w-4 h-4 text-indigo-600 animate-pulse" /> COMPREHENSIVE AUSTRALIAN BOOKING ENGINE
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Clean Estimates, No Hidden Charges
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Real-time industry compliant pricing schemas factoring postcode transit times, size, specific subservices and custom add-ons. Fully integrated with standard service guarantees.
          </p>
        </div>

        {/* Dynamic Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Block: Configurator Controls (7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-7">
            
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-extrabold text-slate-800">Configure Service Parameters</h3>
            </div>

            {/* Engine Selector Tab block */}
            <div id="engine-selector-panel" className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setUseMetadataEngine(true);
                  onTriggerLog({
                    id: `engine_switch_meta_${Date.now()}`,
                    type: "system",
                    status: "success",
                    message: "💎 Multi-region engine selected: SOURCE of TRUTH Service Catalog (SERVICE_METADATA v4)",
                    timestamp: new Date().toLocaleTimeString()
                  });
                }}
                className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                  useMetadataEngine
                    ? "bg-slate-900 text-white shadow-md font-sans"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                💎 Enterprise Catalog (v4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseMetadataEngine(false);
                  onTriggerLog({
                    id: `engine_switch_legacy_${Date.now()}`,
                    type: "system",
                    status: "info",
                    message: "🛡️ Switched pricing mode down to: Legacy Dynamic Labor Rate Model (v3)",
                    timestamp: new Date().toLocaleTimeString()
                  });
                }}
                className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                  !useMetadataEngine
                    ? "bg-slate-900 text-white shadow-md font-sans"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ⚖️ Legacy Labor Rate (v3)
              </button>
            </div>

            {useMetadataEngine ? (
              <div id="metadata-pricing-flow" className="space-y-6">
                {/* METADATA SERVICE SELECTION GRID */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                    1. Select Catalog Service (v4 Source-of-Truth)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {Object.entries(SERVICE_METADATA).map(([key, item]) => {
                      const isSelected = selectedMetadataId === key;
                      const icon = key === "regular-cleaning" ? "🧹" : key === "end-of-lease" ? "🔑" : key === "carpet-cleaning" ? "🧹" : key === "pressure-cleaning" ? "💦" : key === "upholstery-furniture" ? "🛋️" : "🏗️";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedMetadataId(key)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 border-slate-205 min-h-[100px] ${
                            isSelected
                              ? "bg-slate-900 border-slate-950 text-white shadow-md font-sans animate-fade"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-800"
                          }`}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-[11px] font-extrabold tracking-tight leading-tight block">{item.name}</span>
                          <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase leading-none">{item.model.replace("_", " ")}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {activeMetadata?.description}
                  </p>
                </div>

                {/* METADATA SUB-SERVICES LIST (RADIO BUTTONS) */}
                {activeMetadata?.subservices && activeMetadata.subservices.length > 0 && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      2. Choose Sub-Service Level
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {activeMetadata.subservices.map((sub) => {
                        const isSelected = metadataSubservice === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setMetadataSubservice(sub)}
                            className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs scale-[1.02]"
                                : "bg-white border-slate-155 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="metadata-subservice"
                              checked={isSelected}
                              onChange={() => setMetadataSubservice(sub)}
                              className="accent-indigo-600 cursor-pointer text-xs"
                            />
                            <span className="text-[11px] font-bold text-slate-800">{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* METADATA MODEL SIZING CONTROLS */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between text-slate-800 font-black text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                    <span>📐 Dimension Sizing & Variable Constraints</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono uppercase tracking-normal">Model: {activeMetadata?.model}</span>
                  </div>

                  {activeMetadata?.model === "hourly" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Duration Roster Limit</span>
                        <span className="text-indigo-700 font-extrabold">{metadataHours} Hours</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={16}
                        step={1}
                        value={metadataHours}
                        onChange={(e) => setMetadataHours(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                        <span>MIN 2h (From: ${activeMetadata.basePrice}/hr)</span>
                        <span>MIN FEE: ${activeMetadata.minFee} AUD</span>
                      </div>
                    </div>
                  )}

                  {activeMetadata?.model === "fixed" && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700 block mb-1">
                        Select Sub-Market Property Configuration Level:
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.keys(activeMetadata.pricing || {}).map((prop) => {
                          const isSelected = metadataPropertyType === prop;
                          return (
                            <button
                              key={prop}
                              type="button"
                              onClick={() => setMetadataPropertyType(prop)}
                              className={`py-3.5 px-0.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer select-none uppercase ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-650 text-white shadow"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {prop}
                              <span className="block text-[8px] font-mono font-bold mt-0.5 text-indigo-500">
                                ${activeMetadata.pricing?.[prop]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeMetadata?.model === "per_room" && (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(activeMetadata.pricing || {}).map((room) => {
                        const count = metadataRoomCounters[room] || 0;
                        return (
                          <div key={room} className="bg-white p-3 rounded-2xl border border-slate-205 flex items-center justify-between shadow-xs">
                            <div className="min-w-0 pr-1">
                              <span className="text-[11px] font-extrabold text-slate-700 capitalize block truncate">{room.replace("Room", " Room")}</span>
                              <span className="block text-[9px] text-slate-400 font-mono font-semibold">+${activeMetadata.pricing?.[room]}/each</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setMetadataRoomCounters({ ...metadataRoomCounters, [room]: Math.max(0, count - 1) })}
                                className="w-6 h-6 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-slate-850 text-xs w-3 text-center">{count}</span>
                              <button
                                type="button"
                                onClick={() => setMetadataRoomCounters({ ...metadataRoomCounters, [room]: Math.min(10, count + 1) })}
                                className="w-6 h-6 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeMetadata?.model === "per_item" && (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(activeMetadata.pricing || {}).map((item) => {
                        const count = metadataItemCounters[item] || 0;
                        return (
                          <div key={item} className="bg-white p-3 rounded-2xl border border-slate-205 flex items-center justify-between shadow-xs">
                            <div className="min-w-0 pr-1">
                              <span className="text-[11px] font-extrabold text-slate-700 capitalize block truncate">{item.replace("Seat", " Seat")}</span>
                              <span className="block text-[9px] text-slate-400 font-mono font-semibold">+${activeMetadata.pricing?.[item]}/each</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setMetadataItemCounters({ ...metadataItemCounters, [item]: Math.max(0, count - 1) })}
                                className="w-6 h-6 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 text-xs font-semibold"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-slate-855 text-xs w-3 text-center">{count}</span>
                              <button
                                type="button"
                                onClick={() => setMetadataItemCounters({ ...metadataItemCounters, [item]: Math.min(15, count + 1) })}
                                className="w-6 h-6 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 text-xs font-semibold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeMetadata?.model === "sqm" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Total Surface Area Cover</span>
                        <span className="text-indigo-700 font-extrabold">{metadataSqm} sqm (Square Metres)</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={500}
                        step={10}
                        value={metadataSqm}
                        onChange={(e) => setMetadataSqm(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                        <span>Tier rates: &le;50sqm: $6 | &le;100sqm: $5.5 | &gt;100sqm: $5/sqm</span>
                      </div>
                    </div>
                  )}

                  {activeMetadata?.model === "quote_based" && (
                    <div className="bg-white p-3 px-3.5 rounded-2xl border border-red-200 border-dashed text-slate-600 space-y-1.5 shadow-xs">
                      <div className="font-bold text-[11px] text-red-600 uppercase flex items-center gap-1">
                        <span>⚠️</span> High-Tier Quote Requested
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        To calculate high-intensity, safety-critical deep cleaning (e.g. builders silica or commercial kitchens), the system registers an automatic senior surveyor dispatch review. Custom pricing rules are verified instantly on submission.
                      </p>
                    </div>
                  )}
                </div>

                {/* METADATA ADD-ONS AS CHECKBOXES */}
                {activeMetadata?.addons && activeMetadata.addons.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      3. Select Catalog Add-ons & Service Inclusions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeMetadata.addons.map((add) => {
                        const isSelected = metadataAddons.includes(add);
                        const price = activeMetadata.addonPrices?.[add] || 0;
                        return (
                          <button
                            key={add}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? metadataAddons.filter((a) => a !== add)
                                : [...metadataAddons, add];
                              setMetadataAddons(updated);
                              onTriggerLog({
                                id: `meta_addon_toggle_${add}_${Date.now()}`,
                                type: "system",
                                status: "info",
                                message: `➕ Swapped catalog addon toggle: "${add}" (+$${price} AUD)`,
                                timestamp: new Date().toLocaleTimeString(),
                              });
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer relative hover:border-slate-300 ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-400 shadow-xs"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-extrabold text-[11px] text-slate-800 leading-tight">
                                {add}
                              </div>
                              <span className="text-[9px] font-mono font-bold text-indigo-600 block mt-1">
                                +${price} AUD
                              </span>
                            </div>
                            <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all ${
                              isSelected ? "bg-indigo-600 border-indigo-650 text-white" : "border-slate-300 bg-slate-50"
                            }`}>
                              {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STANDARD INCLUSIONS BANNER */}
                {activeMetadata?.inclusions && activeMetadata.inclusions.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-2 text-white font-sans">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                      ✓ Included In General Rate Roster
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[10px] text-slate-300 font-semibold list-inside">
                      {activeMetadata.inclusions.map((inc) => (
                        <li key={inc} className="flex items-center gap-1.5 truncate">
                          <span className="text-emerald-400">✓</span> {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Field 2 Location mapping repeats inside the metadata container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      Target Area Postcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customPostcode}
                        maxLength={4}
                        onChange={(e) => setCustomPostcode(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 2000"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-800 font-black text-sm px-4 pl-10 py-3 rounded-xl outline-none"
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      Select Regional Multipliers
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["2000", "3000", "4000", "6007"].map((pc) => (
                        <button
                          key={pc}
                          type="button"
                          onClick={() => handlePostcodePreset(pc)}
                          className={`py-2 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                            customPostcode === pc
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {pc === "2000" ? "SYD" : pc === "3000" ? "MEL" : pc === "4000" ? "BNE" : "PER"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Repeat Frequency Discounts */}
                <div className="space-y-2.5 pt-4 border-t border-slate-150">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                    Repeat Frequency Discounts
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "once", title: "Single", discount: "0% off" },
                      { value: "weekly", title: "Weekly", discount: "15% off" },
                      { value: "fortnightly", title: "Fortnightly", discount: "10% off" },
                      { value: "monthly", title: "Monthly", discount: "5% off" }
                    ].map((f) => {
                      const isSelected = frequency === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFrequency(f.value as any)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-black text-white border-black"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="text-[10px] font-bold leading-none">{f.title}</div>
                          <span className="text-[8px] font-black font-mono tracking-wider block mt-1 uppercase text-emerald-500">{f.discount}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // LEGACY CONTROLS START
              <>
                {/* Field 1: Choose Service Item */}
                <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                1. Select Target Service
              </label>
              <select
                value={selectedServiceSlug}
                onChange={(e) => setSelectedServiceSlug(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-800 font-bold text-sm sm:text-base px-4 py-3.5 rounded-2xl outline-none transition-all cursor-pointer"
              >
                {services.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.icon} {service.name} (Base: ${service.baseRatePerHour}/hr) — [{service.category}]
                  </option>
                ))}
              </select>
            </div>

            {/* Field 2 & Presets: Postcode Detection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  2. Area Postcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customPostcode}
                    maxLength={4}
                    onChange={(e) => setCustomPostcode(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 2000"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white text-slate-800 font-black text-sm sm:text-base px-4 pl-12 py-3.5 rounded-2xl outline-none transition-all"
                  />
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                {recentSearches.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <span>🕒</span> Quick Recall:
                    </span>
                    {recentSearches.slice(0, 3).map((pc) => (
                      <button
                        key={pc}
                        type="button"
                        onClick={() => {
                          setCustomPostcode(pc);
                          onTriggerLog({
                            id: `calc_recall_pc_${Date.now()}`,
                            type: "api",
                            status: "info",
                            message: `🕒 [Calculator Recall] Restored postcode "${pc}" context from local search cache`,
                            timestamp: new Date().toLocaleTimeString()
                          });
                        }}
                        className="bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-600 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        📍 {pc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Postcode buttons */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Geo Multipliers presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["2000", "3000", "4000", "6007"].map((pc) => (
                    <button
                      key={pc}
                      type="button"
                      onClick={() => handlePostcodePreset(pc)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer select-none ${
                        customPostcode === pc
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pc === "2000" ? "SYD" : pc === "3000" ? "MEL" : pc === "4000" ? "BNE" : "PER"} ({pc})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 3: SERVICE CATEGORY SUB-FLOW DYNAMICS */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-5">
              <div className="flex items-center gap-2">
                {activeService.category === "Domestic" && <Home className="w-4 h-4 text-emerald-600" />}
                {activeService.category === "Commercial" && <Briefcase className="w-4 h-4 text-indigo-600" />}
                {activeService.category === "Specialised" && <Wrench className="w-4 h-4 text-purple-600" />}
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Dimension Sizing: {activeService.category} Parameters
                </span>
              </div>

              {/* Domestic flow - bedroom & bathroom multipliers (Maid2Match style) */}
              {activeService.category === "Domestic" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-extrabold text-slate-600">Bedrooms Count</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">+$25 each above 1 bedroom</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setBedrooms(b => Math.max(1, b - 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-black text-slate-800 text-base">{bedrooms}</span>
                      <button
                        type="button"
                        onClick={() => setBedrooms(b => Math.min(10, b + 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-extrabold text-slate-600">Bathrooms Count</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">+$40 each above 1 bathroom</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setBathrooms(b => Math.max(1, b - 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-black text-slate-800 text-base">{bathrooms}</span>
                      <button
                        type="button"
                        onClick={() => setBathrooms(b => Math.min(6, b + 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Commercial flow - Desk counts & Meeting rooms (Spotless style) */}
              {activeService.category === "Commercial" && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-extrabold text-slate-600">Workstation / Desk Count</span>
                        <p className="text-[10px] text-slate-400 font-semibold leading-tight">+$50 per block of 10 desks</p>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[11px] font-mono font-extrabold text-indigo-700">
                        {deskCount} Desks
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={10}
                      value={deskCount}
                      onChange={(e) => setDeskCount(parseInt(e.target.value))}
                      className="w-full h-1.5 accent-indigo-600 bg-slate-100 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-extrabold text-slate-600">Meeting Rooms & Communals</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">Kitchenettes, breakrooms (+$35 each)</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCommunalCount(c => Math.max(0, c - 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-black text-slate-800 text-base">{communalCount}</span>
                      <button
                        type="button"
                        onClick={() => setCommunalCount(c => Math.min(10, c + 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer active:scale-95 text-sm font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Specialised flow - Hazard / heavy rigging safeguards */}
              {activeService.category === "Specialised" && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600 shadow-sm">
                  <div className="flex items-center gap-2 text-purple-700 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Specialised Certifications Factored:</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 list-disc list-inside">
                    <li>WHS White Card Accredited Roster</li>
                    <li>SGI-Toxicity Environment Solvents</li>
                    <li>SWMS / High-Risk Risk Assessments</li>
                    <li>Double-Inspected Silica Control Compliance</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Field 4: Subservice Type Selectors (Tiers) */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                3. Choose Job Classification Level (Australian standard)
              </label>
              <div className="space-y-2">
                {activeSubservices.map((sub) => {
                  const isSelected = selectedSubserviceSlug === sub.slug;
                  return (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => setSelectedSubserviceSlug(sub.slug)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all hover:border-slate-300 cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-50/50 border-indigo-400/90 text-slate-900 shadow-sm"
                          : "bg-white border-slate-100 text-slate-600"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          {sub.name}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{sub.description}</p>
                      </div>
                      <span className={`text-xs font-black shrink-0 font-mono px-2 py-0.5 rounded leading-none ${
                        sub.priceOffset === 0 ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {sub.priceOffset === 0 ? "Included" : `+$${sub.priceOffset}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 5: Market Add-ons List */}
            {activeAddons.length > 0 && (
              <div className="space-y-3.5 pt-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  4. Select High-Conversion Extras & Add-ons
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {activeAddons.map((addon) => {
                    const isSelected = selectedAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => handleToggleAddon(addon.id)}
                        className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer hover:border-slate-300 relative ${
                          isSelected 
                            ? "bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border-indigo-500/80 shadow-sm text-slate-800"
                            : "bg-white border-slate-150 text-slate-600"
                        }`}
                      >
                        <span className="text-2xl mt-0.5 select-none">{addon.icon}</span>
                        <div className="space-y-1">
                          <div className="font-bold text-xs pr-12 text-slate-800 leading-snug">{addon.name}</div>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">{addon.description}</p>
                          <div className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-black text-[9px] font-mono rounded mt-1 border border-indigo-100">
                            +${addon.price} AUD
                          </div>
                        </div>

                        {/* Corner checkbox selector node */}
                        <div className={`w-5 h-5 rounded-full border absolute right-3 top-3.5 flex items-center justify-center transition-all ${
                          isSelected ? "bg-indigo-600 border-indigo-650 text-white" : "border-slate-200 bg-slate-50"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Field 6: Service Duration Slider */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  5. Estimated Clean Duration limit
                </label>
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{customHours} Operational Hours</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <input
                  type="range"
                  min={minHoursLimit}
                  max={24}
                  step={0.5}
                  value={customHours}
                  onChange={(e) => setCustomHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer animate-fade"
                />
                
                <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                  <span>WHS MIN: {minHoursLimit} HRS</span>
                  <span>PRESCRIBED RECOMMENDATION: {customHours} HOURS</span>
                  <span>CEILING: 24 HRS</span>
                </div>
              </div>
            </div>

            {/* Field 7: Recurring Operational Frequency Cards */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                6. Repeat Frequency Discounts
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "once", title: "Single Dispatch", discount: "0% off", text: "Standard trip" },
                  { value: "weekly", title: "Weekly Support", discount: "15% off", text: "Maximum tidy" },
                  { value: "fortnightly", title: "Fortnightly", discount: "10% off", text: "Wavering dust" },
                  { value: "monthly", title: "Monthly Cycle", discount: "5% off", text: "Regular maintenance" }
                ].map((f) => {
                  const isSelected = frequency === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                        isSelected 
                          ? "bg-indigo-900/10 border-indigo-500 text-indigo-950 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-900 leading-none">
                          {f.title}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-snug">{f.text}</p>
                      </div>
                      <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded font-mono inline-block self-start ${
                        f.value !== "once" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-zinc-200 text-zinc-650"
                      }`}>
                        {f.discount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            </>
            )}

          </div>

          {/* Right Block: Estimation Invoice Summary (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Invoice card */}
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
              
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase block mb-1">
                  National Rate Matrix v3
                </span>
                <h4 className="text-lg font-extrabold text-white">Interactive Invoice Estimate</h4>
              </div>

              {/* Dynamic Suburb Metadata Citation Badge */}
              <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl border border-slate-800 space-y-2 select-none">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Mapped Location:</span>
                  </div>
                  <span className={`text-[10px] font-black font-mono shrink-0 uppercase px-1.5 py-0.5 rounded ${
                    suburbInfo.isActive ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                  }`}>
                    {suburbInfo.state} {suburbInfo.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  📍 {suburbInfo.suburb} ({customPostcode})
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Reflects regional transit multipliers and WHS travel guidelines for this locality.
                </p>
              </div>

              {/* Inactive or Service-Excluded Warnings */}
              {!suburbInfo.isActive ? (
                <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-2xl space-y-1.5 text-red-200">
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-500" /> Coverage Suspended
                  </div>
                  <p className="text-[11px] text-red-300 leading-normal">
                    We do not currently service the postcode {customPostcode} or its surrounding state region directory.
                  </p>
                </div>
              ) : suburbInfo.disabledServices.includes(activeService.slug) ? (
                <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-2xl space-y-1.5 text-red-200">
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-500" /> Service Restricted
                  </div>
                  <p className="text-[11px] text-red-300 leading-normal">
                    The requested service ({activeService.name}) is temporarily deactivated in {suburbInfo.suburb} ({customPostcode}) due to zoning guidelines.
                  </p>
                </div>
              ) : (
                <>
                  {/* Calculations line-items */}
                  <div className="space-y-3.5 text-xs border-b border-slate-800 pb-5">
                    
                    {useMetadataEngine ? (
                      <>
                        <div className="flex justify-between text-slate-400 font-semibold">
                          <span>Base Service ({activeMetadata?.name})</span>
                          <span className="text-slate-205 font-mono font-bold">
                            {activeMetadata?.model === "hourly" && `$${activeMetadata.basePrice}.00 × ${metadataHours} hrs`}
                            {activeMetadata?.model === "fixed" && `Fixed Flat Rate [${metadataPropertyType}]`}
                            {activeMetadata?.model === "per_room" && "Unit Room Summation"}
                            {activeMetadata?.model === "per_item" && "Furniture Items Summation"}
                            {activeMetadata?.model === "sqm" && `Sqm Area Rate (${metadataSqm} sqm)`}
                            {activeMetadata?.model === "quote_based" && "Bespoke Builder Rate"}
                          </span>
                        </div>
                        {activeMetadata?.model === "fixed" && (
                          <div className="flex justify-between text-slate-500 text-[10px] pl-3">
                            <span>Selected Tier</span>
                            <span className="font-mono font-bold text-slate-305">${activeMetadata.pricing?.[metadataPropertyType]}.00</span>
                          </div>
                        )}
                        {activeMetadata?.model === "per_room" && (
                          <ul className="pl-3 border-l border-indigo-900/40 space-y-0.5 text-[10px] text-slate-500">
                            {Object.entries(metadataRoomCounters).map(([room, num]) => (num as number) > 0 && (
                              <li key={room} className="flex justify-between">
                                <span className="capitalize">{room.replace("Room", " Room")} × {num}</span>
                                <span className="font-mono">${((activeMetadata.pricing as any)?.[room] || 0) * (num as number)}.00</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {activeMetadata?.model === "per_item" && (
                          <ul className="pl-3 border-l border-indigo-900/40 space-y-0.5 text-[10px] text-slate-500">
                            {Object.entries(metadataItemCounters).map(([item, num]) => (num as number) > 0 && (
                              <li key={item} className="flex justify-between">
                                <span className="capitalize">{item.replace("Seat", " Seat")} × {num}</span>
                                <span className="font-mono">${((activeMetadata.pricing as any)?.[item] || 0) * (num as number)}.00</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {metadataSubservice && (
                          <div className="flex justify-between text-slate-400 font-semibold">
                            <span>Sub-service Level</span>
                            <span className="text-indigo-400 font-bold">{metadataSubservice}</span>
                          </div>
                        )}
                        {metadataAddons.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-400 font-semibold">
                              <span>Selected Add-ons ({metadataAddons.length})</span>
                              <span className="text-indigo-400 font-mono font-bold">
                                +${metadataAddons.reduce((sum, add) => sum + (activeMetadata.addonPrices?.[add] || 0), 0)}.00
                              </span>
                            </div>
                            <ul className="pl-3 border-l border-indigo-900/60 space-y-1">
                              {metadataAddons.map(add => (
                                <li key={add} className="flex justify-between text-[10px] text-slate-500">
                                  <span>• {add}</span>
                                  <span className="font-mono">${activeMetadata.addonPrices?.[add] || 0}.00</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 1. Base hourly cost */}
                        <div className="flex justify-between text-slate-400 font-semibold">
                          <span>Base Labor ({activeService.icon})</span>
                          <span className="text-slate-201 font-mono font-bold">${baseRate}.00 × {customHours} hrs</span>
                        </div>

                        {/* 2. Subservice Tier Offset */}
                        {currentSubservice && currentSubservice.priceOffset > 0 && (
                          <div className="flex justify-between text-slate-400 font-semibold">
                            <span>Classification Offsets ({currentSubservice.name})</span>
                            <span className="text-indigo-400 font-mono font-bold">
                              +${currentSubservice.priceOffset}.00
                            </span>
                          </div>
                        )}

                        {/* 3. Room size counters offset */}
                        {roomSurcharge > 0 && (
                          <div className="flex justify-between text-slate-400 font-semibold">
                            <span>
                              {activeService.category === "Domestic" 
                                ? `Domestic Rooms Size Surcharges (${bedrooms} beds / ${bathrooms} baths)`
                                : `Commercial Desks/Workspaces Surcharges (${deskCount} Desks / ${communalCount} Breaks)`
                              }
                            </span>
                            <span className="text-emerald-400 font-mono font-bold">
                              +${roomSurcharge}.00
                            </span>
                          </div>
                        )}

                        {/* 4. Add-ons itemised cost */}
                        {selectedAddonsDetails.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-400 font-semibold">
                              <span>Selected Add-ons ({selectedAddonsDetails.length})</span>
                              <span className="text-indigo-400 font-mono font-bold">+${addonsTotal}.00</span>
                            </div>
                            <ul className="pl-3 border-l border-indigo-900/60 space-y-1">
                              {selectedAddonsDetails.map(a => (
                                <li key={a.id} className="flex justify-between text-[10px] text-slate-500">
                                  <span>• {a.name}</span>
                                  <span className="font-mono">${a.price}.00</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {/* 5. Locality Factor */}
                    <div className="flex justify-between text-slate-400 font-semibold">
                      <span>Locality Freight Factor ({suburbInfo.multiplier.toFixed(2)}x)</span>
                      <span className="text-amber-500 font-mono font-bold">
                        +{suburbInfo.multiplier === 1 ? "$0.00" : `$${Math.round(geoInflation)}.00`}
                      </span>
                    </div>

                    {/* 6. Loyalty frequency discount */}
                    {discountVal.percent > 0 && (
                      <div className="flex justify-between text-slate-400 font-semibold">
                        <span className="text-emerald-400">{discountVal.label}</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          -${Math.round(frequencyReduction)}.00
                        </span>
                      </div>
                    )}

                    {/* 7. Travel and fuel dispatch modifiers */}
                    {travelSurcharge > 0 && (
                      <div className="flex justify-between text-slate-400 font-semibold">
                        <span>Fuel & Mobilisation Travel Offset</span>
                        <span className="text-indigo-400 font-mono font-bold">+${travelSurcharge}.00</span>
                      </div>
                    )}

                    {/* 8. Urgent Emergency modifier toggle */}
                    {isUrgentActive && (
                      <div className="flex justify-between text-slate-400 font-semibold">
                        <span className="text-purple-400">⚡ Emergency Priority dispatch (+20%)</span>
                        <span className="text-purple-400 font-mono font-bold">+${Math.round(priorityInflation)}.00</span>
                      </div>
                    )}
                  </div>

                  {/* Total Price Banner */}
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">
                        Calculated Est. Total (AUD)
                      </span>
                      <span className="text-slate-500 font-semibold text-[10px] leading-tight block mt-0.5">
                        GST and transport factored
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                        ${calculatedTotal}.00
                      </div>
                      {frequency !== "once" && (
                        <span className="text-[10px] text-emerald-400 font-black font-mono tracking-wide">
                          PER CLEAN / RECURRING
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Call to action book with params */}
              <button
                disabled={!suburbInfo.isActive || suburbInfo.disabledServices.includes(activeService.slug)}
                onClick={handleLockInEstimate}
                className={`w-full py-4 px-6 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  (suburbInfo.isActive && !suburbInfo.disabledServices.includes(activeService.slug))
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-98 text-white cursor-pointer"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {(suburbInfo.isActive && !suburbInfo.disabledServices.includes(activeService.slug))
                    ? "Lock in Estimate & Secure Booking"
                    : "Booking Currently Blocked (Invalid/Deactivated Area)"
                  }
                </span>
              </button>

            </div>

            {/* Explanatory notes */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                Billing Surcharge Transparency
              </h5>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed font-sans">
                  <Percent className="w-4 h-4 text-indigo-600 font-bold shrink-0 mt-0.5" />
                  <span><strong>Locality multipliers</strong> are governed automatically by distance thresholds from primary urban distribution centers.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed font-sans">
                  <Calendar className="w-4 h-4 text-purple-600 font-bold shrink-0 mt-0.5" />
                  <span><strong>Weekly & fortnightly schedules</strong> retain fixed pricing priorities. Cancel or reschedule anytime with 48h notice.</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Global base rates directory table for search compliance (AEO/SEO index mapping) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">National Base Service Classifications</h3>
            <p className="text-xs text-slate-500 mt-1">
              Detailed structural matrix compiled for transparent search indexation (AEO/SEO schema mapping compliant).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Service Descriptor</th>
                  <th className="pb-3 px-4">Base Rate</th>
                  <th className="pb-3 px-4">Standard size</th>
                  <th className="pb-3 px-4">Clean Quality Assurance</th>
                  <th className="pb-3 pl-4 text-right">Instant Inquest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 select-none">
                {services.map((srv) => (
                  <tr key={srv.slug} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pr-4 font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="text-base">{srv.icon.length > 2 ? "🧼" : srv.icon}</span>
                      <span>{srv.name}</span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-600">${srv.baseRatePerHour}.00 / hr</td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">{srv.durationEstimateHours} hours standard</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded text-[9px] uppercase tracking-wide">
                        ⭐ {srv.rating.toFixed(2)} Star Rating
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedServiceSlug(srv.slug);
                          const header = document.getElementById("pricing-header-panel");
                          if (header) header.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-black tracking-wide cursor-pointer"
                      >
                        Adjust Slider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
