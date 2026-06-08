import React, { useState, useEffect } from "react";
import { 
  X, 
  Send, 
  Calculator, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Copy, 
  CreditCard, 
  Link, 
  Mail, 
  CheckCircle, 
  Share2,
  Plus,
  Minus,
  Briefcase,
  Home,
  Wrench,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { allServices } from "../data";
import { QuoteRequest, ServiceItem, PostcodeCoverage, StateCoverage, SelectedAddon } from "../types";
import { jsPDF } from "jspdf";
import { subserviceRegistry, defaultSubservices, addonRegistry } from "../servicesCatalog";
import { traceCDPInteraction, identifyCDPUser } from "../utils/analytics";
import { safeLocalStorage as localStorage } from "../utils/storageFallback";
import { SERVICE_METADATA } from "../config/ServiceCatalog";
import { calculateQuote } from "../utils/PricingCalculator";

const formatMetaItemName = (item: string) => {
  const overrides: Record<string, { label: string; icon: string }> = {
    armchair: { label: "Armchair", icon: "🛋️" },
    sofaSeat: { label: "Sofa Seat", icon: "🛋️" },
    diningChair: { label: "Dining Chair", icon: "🪑" },
    mattress: { label: "Mattress" , icon: "🛏️" },
    singlePane: { label: "Single Pane", icon: "🪟" },
    doublePane: { label: "Double Pane", icon: "🪟" },
    slidingDoor: { label: "Sliding Door", icon: "🚪" },
    glassBalustrade: { label: "Glass Balustrade", icon: "💎" },
    skylight: { label: "Skylight Panel", icon: "☀️" },
    flyScreen: { label: "Fly Screen", icon: "🕸️" },
    bedroom: { label: "Bedroom Space", icon: "🛏️" },
    livingRoom: { label: "Living Room", icon: "📺" },
    hallway: { label: "Hallway", icon: "🚪" },
    staircase: { label: "Staircase Flight", icon: "🪜" },
  };

  if (overrides[item]) {
    return overrides[item];
  }

  const spaced = item.replace(/([A-Z])/g, " $1");
  const capitalized = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return { label: capitalized, icon: "✨" };
};

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: string;
  onQuoteSubmit: (quote: QuoteRequest) => void;
  onTriggerLog: (log: any) => void;
  cleaners: any[];
  onUpdateQuote: (quote: QuoteRequest) => void;
  services?: ServiceItem[];
  postcodes?: PostcodeCoverage[];
  states?: StateCoverage[];
}

export default function QuoteModal({
  isOpen,
  onClose,
  selectedService,
  onQuoteSubmit,
  onTriggerLog,
  cleaners,
  onUpdateQuote,
  services = allServices,
  postcodes,
  states,
}: QuoteModalProps) {
  // Create a combined list of standard services and metadata services to ensure coverage of both
  const combinedServices = React.useMemo(() => {
    const list = [...services];
    Object.entries(SERVICE_METADATA).forEach(([key, value]) => {
      if (!list.some(s => s.name === value.name)) {
        list.push({
          name: value.name,
          slug: key,
          icon: key === "regular-cleaning" ? "🧹" : key === "end-of-lease" ? "🔑" : "💎",
          category: value.model === "hourly" || value.model === "fixed" || value.model === "per_room" ? "Domestic" : "Specialised",
          description: value.description,
          baseRatePerHour: value.basePrice || 45,
          rating: 4.9,
          durationEstimateHours: 4
        });
      }
    });
    return list;
  }, [services]);

  // Modal Fields State
  const [postcode, setPostcode] = useState("");
  const [propertyType, setPropertyType] = useState("Standalone House");
  const [serviceName, setServiceName] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // New Phase 2 coordinates
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("Corporate Office");

  // New Phase 2 Structural Specifier / Asset Counters
  const [meetingRooms, setMeetingRooms] = useState<number>(1);
  const [workingDesks, setWorkingDesks] = useState<number>(10);
  const [kitchenettes, setKitchenettes] = useState<number>(1);
  const [bathroomStalls, setBathroomStalls] = useState<number>(2);
  const [heavyCarpetZones, setHeavyCarpetZones] = useState<number>(1);

  // New Phase 2 SLA & Certifications tier
  const [slaTier, setSlaTier] = useState<string>("Standard");

  // New Phase 2 Shift Preference & Key Exchange
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState<string>("Day Shift (Standard)");
  const [keyExchange, setKeyExchange] = useState<string>("Lockbox PIN");

  // Local storage postcode recall state
  const [recentPostcodes, setRecentPostcodes] = useState<string[]>([]);

  // Stepper sub-steps for specs entry
  const [currentFormStep, setCurrentFormStep] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem("aastaclean_recent_postcodes");
        if (stored) {
          setRecentPostcodes(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Local storage read error", e);
      }
    }
  }, [isOpen]);
  
  // Custom interactive parameters (or initialized from draft)
  const [hours, setHours] = useState(4);
  const [estimateTotal, setEstimateTotal] = useState(0);

  // Expanded variables matching Australian dynamic standards
  const [bedroomCount, setBedroomCount] = useState<number>(3);
  const [bathroomCount, setBathroomCount] = useState<number>(2);
  const [deskCount, setDeskCount] = useState<number>(20);
  const [communalCount, setCommunalCount] = useState<number>(1);
  const [subserviceName, setSubserviceName] = useState<string>("Premium Standard");
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Metadata dynamic model states for deep-dive spec accuracy in booking flow
  const [modalSqm, setModalSqm] = useState<number>(100);
  const [modalItemCounters, setModalItemCounters] = useState<Record<string, number>>({
    armchair: 1,
    sofaSeat: 3,
    diningChair: 4,
    mattress: 1,
    singlePane: 10,
    doublePane: 4,
    slidingDoor: 2,
    glassBalustrade: 0,
    skylight: 0,
    flyScreen: 0,
  });
  const [modalRoomCounters, setModalRoomCounters] = useState<Record<string, number>>({
    bedroom: 3,
    livingRoom: 1,
    hallway: 1,
    staircase: 0,
  });
  const [modalPropertyType, setModalPropertyType] = useState<string>("2br");

  // Status UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<QuoteRequest | null>(null);

  // Checkout & Payment State
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ndis" | "corporate">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [ndisId, setNdisId] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [dispatchedCleaner, setDispatchedCleaner] = useState<any>(null);

  // Share & Email feed animation triggers
  const [emailQuoteStatus, setEmailQuoteStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [emailInvoiceStatus, setEmailInvoiceStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedReceiptLink, setCopiedReceiptLink] = useState(false);

  // 7-min Capacity Spot Lock countdown timer state (CRO Trigger)
  const [spotLockTimer, setSpotLockTimer] = useState<number>(420); // 7 minutes * 60 seconds

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen) {
      interval = setInterval(() => {
        setSpotLockTimer((prev) => (prev > 0 ? prev - 1 : 420));
      }, 1000);
    } else {
      setSpotLockTimer(420);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Dynamic Promo Code and Coupon states (Enhancement 3)
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [discountRate, setDiscountRate] = useState(0); 
  const [discountFlat, setDiscountFlat] = useState(0); 
  const [promoFeedback, setPromoFeedback] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "success" | "error">("idle");

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    if (code === "AASTA20" || code === "SAVE20") {
      setAppliedPromo(code);
      setDiscountRate(0.20);
      setDiscountFlat(0);
      setPromoStatus("success");
      setPromoFeedback("🎉 Success! 20% Premium Discount applied correctly.");
      onTriggerLog({
        id: `promo_applied_${Date.now()}`,
        type: "api",
        status: "success",
        message: `🏷️ Promo applied: "${code}" saving 20% on overall cleaning matrix estimate.`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else if (code === "FIRST10") {
      setAppliedPromo(code);
      setDiscountRate(0.10);
      setDiscountFlat(0);
      setPromoStatus("success");
      setPromoFeedback("🎉 Success! 10% First Booking discount applied.");
      onTriggerLog({
        id: `promo_applied_${Date.now()}`,
        type: "api",
        status: "success",
        message: `🏷️ Promo applied: "${code}" saving 10% on first-time customer roster.`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else if (code === "NDISFREE") {
      setAppliedPromo(code);
      setDiscountRate(0);
      setDiscountFlat(25);
      setPromoStatus("success");
      setPromoFeedback("🎉 Success! Flat $25.00 NDIS allowance applied.");
      onTriggerLog({
        id: `promo_applied_${Date.now()}`,
        type: "api",
        status: "success",
        message: `🏷️ Promo applied: "${code}" saving flat $25.00 for NDIS/Caregivers.`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      setPromoStatus("error");
      setPromoFeedback("❌ Error: Invalid promotional voucher code.");
    }
  };

  // Sync service selection and load draft state upon modal activation
  useEffect(() => {
    if (selectedService) {
      setServiceName(selectedService);
    } else if (combinedServices.length > 0) {
      setServiceName(combinedServices[0].name);
    }
  }, [selectedService, combinedServices]);

  // Load draft configuration from localStorage if available upon trigger
  useEffect(() => {
    if (isOpen) {
      // Trace CDP Estimator Opened Interaction
      traceCDPInteraction("Estimator Opened", {
        context_service: selectedService || serviceName,
        current_postcode: postcode || "pending",
        has_local_draft: !!localStorage.getItem("aastaclean_current_booking_draft")
      }, onTriggerLog);

      const savedDraft = localStorage.getItem("aastaclean_current_booking_draft");
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.postcode) setPostcode(draft.postcode);
          if (draft.propertyType) setPropertyType(draft.propertyType);
          if (draft.serviceName) setServiceName(draft.serviceName);
          if (draft.hours) setHours(draft.hours);
          if (draft.calculatedTotal) setEstimateTotal(draft.calculatedTotal);
          
          if (draft.bedroomCount !== undefined) setBedroomCount(draft.bedroomCount);
          if (draft.bathroomCount !== undefined) setBathroomCount(draft.bathroomCount);
          if (draft.deskCount !== undefined) setDeskCount(draft.deskCount);
          if (draft.communalCount !== undefined) setCommunalCount(draft.communalCount);
          if (draft.subserviceName) setSubserviceName(draft.subserviceName);
          if (draft.selectedAddons) setSelectedAddons(draft.selectedAddons);

          setCurrentFormStep(2);

          onTriggerLog({
            id: `quote_modal_load_draft_${Date.now()}`,
            type: "system",
            status: "success",
            message: `📡 [Secure Handshake] Transferred draft parameters. Prefilled service: "${draft.serviceName}" ($${draft.calculatedTotal} AUD)`,
            timestamp: new Date().toLocaleTimeString(),
            payload: draft
          });

          // Delete draft to prevent collision on next empty click
          localStorage.removeItem("aastaclean_current_booking_draft");
          return;
        } catch (e) {
          console.error("Failed parsing booking draft", e);
        }
      }

      // No draft available - Reset parameters to standard defaults
      setSelectedAddons([]);
      setSubserviceName("Premium Standard");
      setBedroomCount(3);
      setBathroomCount(2);
      setDeskCount(20);
      setCommunalCount(1);
      setCurrentFormStep(1);
    }
  }, [isOpen]);

  // Handle live calculation fallback inside modal if inputs change
  useEffect(() => {
    const serviceObj = combinedServices.find((s) => s.name === serviceName);
    if (!serviceObj) return;

    let multiplier = 1.0;
    if (postcodes) {
      const pcMatch = postcodes.find((p) => p.code === postcode.trim());
      if (pcMatch) multiplier = pcMatch.multiplier;
    }

    let rawTotal = 0;

    // Check if it's a metadata service
    const metaKey = Object.keys(SERVICE_METADATA).find(
      (key) => SERVICE_METADATA[key].name === serviceName || key === serviceObj.slug
    );

    if (metaKey) {
      const metaItem = SERVICE_METADATA[metaKey];
      // Gather dynamic mapping inputs for unified calculation
      let inputData: any = { addons: selectedAddons.flatMap(a => Array(a.quantity || 1).fill(a.name)) };
      if (metaItem.model === "hourly") {
        inputData.hours = hours;
      } else if (metaItem.model === "fixed") {
        inputData.propertyType = modalPropertyType;
      } else if (metaItem.model === "per_room") {
        inputData = { 
          bedroom: modalRoomCounters.bedroom || 3, 
          bathroom: modalRoomCounters.bathroom || 2, 
          livingRoom: modalRoomCounters.livingRoom || 1,
          hallway: modalRoomCounters.hallway || 1,
          staircase: modalRoomCounters.staircase || 0,
          addons: selectedAddons.flatMap(a => Array(a.quantity || 1).fill(a.name))
        };
      } else if (metaItem.model === "per_item") {
        inputData = {
          ...modalItemCounters,
          addons: selectedAddons.flatMap(a => Array(a.quantity || 1).fill(a.name))
        };
      } else if (metaItem.model === "sqm") {
        inputData.sqm = modalSqm;
      }
      
      rawTotal = calculateQuote(metaKey, inputData);
    } else {
      const hourlyRate = serviceObj.baseRatePerHour;

      // Standard baseline pricing
      const baseHourly = hours * hourlyRate;
      
      // Add subservices offsets if matching standard slugs
      let subserviceOffset = 0;
      const activeSublist = subserviceRegistry[serviceObj.slug] || defaultSubservices;
      const matchedSub = activeSublist.find((s) => s.name === subserviceName) || activeSublist[0];
      if (matchedSub) {
        subserviceOffset = matchedSub.priceOffset;
      }

      // Add bedroom/bathroom flat offsets
      let roomSurcharge = 0;
      if (serviceObj.category === "Domestic") {
        roomSurcharge += Math.max(0, (bedroomCount - 1) * 25);
        roomSurcharge += Math.max(0, (bathroomCount - 1) * 40);
      } else if (serviceObj.category === "Commercial") {
        roomSurcharge += Math.floor(deskCount / 10) * 50;
        roomSurcharge += communalCount * 35;
      }

      // Add selected extras
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0);

      rawTotal = baseHourly + subserviceOffset + roomSurcharge + addonsTotal;
    }

    // Dynamic Phase 2 physical asset breakout additions
    const assetBreakoutCost = 
      (meetingRooms * 45) + 
      (Math.max(0, workingDesks - 5) * 5) + 
      (kitchenettes * 60) + 
      (bathroomStalls * 50) + 
      (heavyCarpetZones * 80);

    // Dynamic SLA Coefficients
    let slaGapFee = 0;
    let slaMultiplier = 1.0;
    if (slaTier === "Gold-HACCP" || slaTier === "haccp") {
      slaGapFee = 50;
      slaMultiplier = 1.25;
    } else if (slaTier === "Platinum-Surgical" || slaTier === "platinum") {
      slaGapFee = 120;
      slaMultiplier = 1.45;
    } else if (slaTier === "NDIS-Certified" || slaTier === "ndis") {
      slaGapFee = 30;
      slaMultiplier = 1.10;
    }

    // Shift Hours Loading / Surcharge
    let shiftMultiplier = 1.0;
    if (timeSlot.toLowerCase().includes("nocturnal") || timeSlot.toLowerCase().includes("out-of-hours")) {
      shiftMultiplier = 1.20;
    } else if (timeSlot.toLowerCase().includes("weekend") || timeSlot.toLowerCase().includes("surge")) {
      shiftMultiplier = 1.30;
    }

    // Core Consolidated Premium Mathematical Clean Formula
    const cumulativeBase = rawTotal + assetBreakoutCost;
    const elevatedBase = (cumulativeBase * slaMultiplier * shiftMultiplier) + slaGapFee;
    const geoInflation = elevatedBase * (multiplier - 1);
    let finalCalculated = Math.round(elevatedBase + geoInflation + 15); // +$15 travel/prep fee

    // Promo code adjustments
    if (discountRate > 0) {
      finalCalculated = Math.round(finalCalculated * (1 - discountRate));
    }
    if (discountFlat > 0) {
      finalCalculated = Math.max(15, finalCalculated - discountFlat);
    }

    setEstimateTotal(finalCalculated);
  }, [
    hours,
    serviceName,
    postcode,
    combinedServices,
    postcodes,
    bedroomCount,
    bathroomCount,
    deskCount,
    communalCount,
    subserviceName,
    selectedAddons,
    discountRate,
    discountFlat,
    modalSqm,
    modalItemCounters,
    modalRoomCounters,
    modalPropertyType,
    meetingRooms,
    workingDesks,
    kitchenettes,
    bathroomStalls,
    heavyCarpetZones,
    slaTier,
    timeSlot,
  ]);

  // Upgraded PDF Quotation / Invoicing layout
  const generatePDFQuote = (isInvoice: boolean = false) => {
    if (!submittedRequest) return;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const baseTotal = submittedRequest.estimatedTotal || estimateTotal;
    const gst = Math.round(baseTotal * 0.1);
    const grandTotal = baseTotal + gst;

    // Draw page margin border
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);

    // Header strip banner
    doc.setFillColor(15, 23, 42); // slate-900 high contrast
    doc.rect(5, 5, 200, 32, "F");

    // Title / Logo
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AASTACLEAN SERVICES", 12, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("AUSTRALIAN NATIONAL COMPLIANCE-GRADE VACATE & SITE DISPATCH", 12, 24);
    doc.setFont("helvetica", "italic");
    doc.text("ISO Quality System QA Code: 9001:2015  |  ISO Work Health & Safety WHS: 45001:2018 certified.", 12, 28);

    // Top Right Invoice / Quote indicator
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(isInvoice ? "COMPLIANCE TAX INVOICE" : "OFFICIAL COST ESTIMATE", 135, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Doc Reference: ${isInvoice ? "INV" : "EST"}-${submittedRequest.id.split("_")[1]}`, 135, 24);
    doc.text(`Processed At: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 135, 28);

    // User Profile Data Details
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(10, 44, 190, 40, "F");
    
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CLIENT & TARGET PROPERTY SERVICE PROFILE", 15, 50);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Primary Client: ${submittedRequest.name}`, 15, 56);
    doc.text(`Contact Phone: ${submittedRequest.phone}`, 15, 62);
    doc.text(`Email Location: ${submittedRequest.email}`, 15, 68);
    doc.text(`Clean Lead ID: ${submittedRequest.id}`, 15, 74);

    const serviceObj = services.find((s) => s.name === submittedRequest.serviceName);
    const categoryName = serviceObj ? serviceObj.category : "Domestic";

    doc.text(`Coverage Area: Postcode ${submittedRequest.postcode} (State Certified Area)`, 110, 56);
    doc.text(`Category: ${categoryName} Standard Class`, 110, 62);
    doc.text(`Classification: ${submittedRequest.subserviceName || "Premium Standard Series"}`, 110, 68);
    doc.text("Payment Mode: " + (isInvoice ? (paymentMethod === "card" ? "Credit Card Authorization" : paymentMethod === "ndis" ? "NDIS Agency Managed Fund Check" : "Corporate Purchase PO Settlement") : "Pending Settlement"), 110, 74);

    // Services Cost Grid Table Header
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(10, 90, 190, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("SCHEDULED COMPLIANCE ITEM DESCRIPTION", 14, 95);
    doc.text("QTY / SIZES", 115, 95);
    doc.text("UNIT RATE", 145, 95);
    doc.text("ESTIMATED SUB (AUD)", 172, 95);

    // Line Row values
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    let yPos = 104;

    // Line 1: Main labor hours
    doc.text(`${submittedRequest.serviceName} - Base Labor Clean`, 14, yPos);
    doc.text(`${hours} working hrs`, 115, yPos);
    const baseHourRate = serviceObj ? serviceObj.baseRatePerHour : 45;
    doc.text(`$${baseHourRate}.00 / hr`, 145, yPos);
    doc.text(`$${hours * baseHourRate}.00`, 172, yPos);
    yPos += 6;

    // Line 2: Subservice Tier offset if applicable
    if (submittedRequest.subserviceName && submittedRequest.subserviceName !== "Premium Standard") {
      doc.text(`↳ Subservice Option: ${submittedRequest.subserviceName}`, 14, yPos);
      doc.text("1 flat fee", 115, yPos);
      doc.text("-", 145, yPos);
      const activeSublist = serviceObj ? (subserviceRegistry[serviceObj.slug] || defaultSubservices) : defaultSubservices;
      const matchedSub = activeSublist.find(s => s.name === submittedRequest.subserviceName);
      const pr = matchedSub ? matchedSub.priceOffset : 0;
      doc.text(`+$${pr}.00`, 172, yPos);
      yPos += 6;
    }

    // Line 3: Room configurations
    if (categoryName === "Domestic" && (submittedRequest.bedroomCount || submittedRequest.bathroomCount)) {
      const beds = submittedRequest.bedroomCount || bedroomCount;
      const baths = submittedRequest.bathroomCount || bathroomCount;
      doc.text(`↳ Room Multiplex Size Settings (${beds} Bedrooms, ${baths} Bathrooms)`, 14, yPos);
      doc.text("Cumulative", 115, yPos);
      doc.text("-", 145, yPos);
      const extraBeds = Math.max(0, (beds - 1) * 25);
      const extraBaths = Math.max(0, (baths - 1) * 40);
      doc.text(`+$${extraBeds + extraBaths}.00`, 172, yPos);
      yPos += 6;
    } else if (categoryName === "Commercial" && (submittedRequest.deskCount || submittedRequest.communalCount)) {
      const desks = submittedRequest.deskCount || deskCount;
      const communas = submittedRequest.communalCount || communalCount;
      doc.text(`↳ Workplace Station Settings (${desks} Desks, ${communas} Communals)`, 14, yPos);
      doc.text("Cumulative", 115, yPos);
      doc.text("-", 145, yPos);
      const extraDesks = Math.floor(desks / 10) * 50;
      const extraCommunas = communas * 35;
      doc.text(`+$${extraDesks + extraCommunas}.00`, 172, yPos);
      yPos += 6;
    }

    // Line 4: Addon items
    if (submittedRequest.selectedAddons && submittedRequest.selectedAddons.length > 0) {
      submittedRequest.selectedAddons.forEach((addon) => {
        const qty = addon.quantity || 1;
        const lineTotal = addon.price * qty;
        doc.text(`↳ Premium Extra: ${addon.name}`, 14, yPos);
        doc.text(`${qty} unit(s)`, 115, yPos);
        doc.text(`$${addon.price}.00`, 145, yPos);
        doc.text(`+$${lineTotal}.00`, 172, yPos);
        yPos += 6;
      });
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(10, yPos, 200, yPos);
    yPos += 6;

    // User Instruction notes parameter block
    doc.setFont("helvetica", "bold");
    doc.text("Specific Work Area Parameters & Site Instructions:", 14, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    const notesTxt = submittedRequest.notes || "No bespoke instructions reported. Standardizing clean parameters around certified exit checksheets.";
    const splitNotes = doc.splitTextToSize(notesTxt, 180);
    doc.text(splitNotes, 14, yPos);
    
    // Bottom calculations calculations
    const footerY = 240;
    doc.setDrawColor(226, 232, 240);
    doc.line(10, footerY - 5, 200, footerY - 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("REGIONAL COMPLIANCE CHARGE ESTIMATIONS:", 14, footerY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Net Subtotal Amount (AUD):`, 110, footerY);
    doc.text(`$${baseTotal}.00`, 175, footerY, { align: "right" });

    doc.text(`Australian Goods & Services Tax (10% GST):`, 110, footerY + 5);
    doc.text(`$${gst}.00`, 175, footerY + 5, { align: "right" });

    doc.setFillColor(243, 244, 246); // gray-100
    doc.rect(108, footerY + 8, 85, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`GRAND TOTAL INC GST (AUD):`, 110, footerY + 13);
    doc.text(`$${grandTotal}.00`, 175, footerY + 13, { align: "right" });

    // Authority signatures
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized by AastaClean Accounts Auditor Division", 14, footerY + 22);
    doc.text("This electronic voucher is authenticated under ISO 9001:2015 standards and represents official binding prices.", 14, footerY + 25);

    doc.save(`AastaClean_${isInvoice ? "Invoice" : "Quote"}_${submittedRequest.id.split("_")[1]}.pdf`);

    onTriggerLog({
      id: `pdf_gen_${Date.now()}`,
      type: "system",
      status: "success",
      message: `💾 Generated high-fidelity PDF ${isInvoice ? "Invoice" : "Booking Quote"} successfully. Loaded to local storage system.`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleSimulateEmail = (isInvoice: boolean) => {
    if (!submittedRequest) return;
    
    const setStatus = isInvoice ? setEmailInvoiceStatus : setEmailQuoteStatus;
    setStatus("sending");

    setTimeout(() => {
      setStatus("sent");
      onTriggerLog({
        id: `email_smtp_${Date.now()}`,
        type: "system",
        status: "success",
        message: `📨 [SMTP Router] Dispatched final ${isInvoice ? "Tax Invoice / Payment Receipt" : "Official Cost Quotation"} PDF to client at "${submittedRequest.email}". Status: 250 OK (RFC 5321 Delivery Verified).`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 900);
  };

  const handleSimulateShare = (isInvoice: boolean) => {
    if (!submittedRequest) return;
    
    const setCopied = isInvoice ? setCopiedReceiptLink : setCopiedLink;
    const shareUrl = `https://aastaclean.com.au/share/${isInvoice ? "invoice" : "quote"}/${submittedRequest.id}`;
    
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      onTriggerLog({
        id: `share_clip_${Date.now()}`,
        type: "system",
        status: "info",
        message: `🔗 Copied sharable secure dynamic URL to client clipboard: ${shareUrl}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      alert("Failed to write to clipboard, here is the link: " + shareUrl);
    }
  };

  const handleSecureCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedRequest) return;

    if (paymentMethod === "card") {
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim() || !cardName.trim()) {
        alert("Please complete all necessary credit card payment parameters.");
        return;
      }
    } else if (paymentMethod === "ndis") {
      if (!ndisId.trim()) {
        alert("Please specify a valid and active NDIS Scheme Participant ID.");
        return;
      }
    } else if (paymentMethod === "corporate") {
      if (!purchaseOrder.trim()) {
        alert("Please supply your Corporate Organization Purchase Order (PO) ref #.");
        return;
      }
    }

    setIsPaying(true);

    // Dynamic timeout to simulate bank payment routing and resources dispatch checks
    setTimeout(() => {
      setIsPaying(false);
      setPaymentSuccess(true);

      const randomCleaner = cleaners && cleaners.length > 0 
        ? cleaners[Math.floor(Math.random() * cleaners.length)] 
        : { name: "Liam Vance", phone: "0412 111 222", email: "liam.vance@aastaclean.com.au", rating: 4.9 };
      
      setDispatchedCleaner(randomCleaner);

      // Track Booking Payment Completed Event in CDP (Segment & RudderStack)
      traceCDPInteraction("Booking Payment Completed", {
        bookingId: submittedRequest.id,
        serviceName: submittedRequest.serviceName,
        paymentMethod: paymentMethod,
        amountCharged: submittedRequest.estimatedTotal,
        assignedCleaner: randomCleaner.name,
        assignedCleanerRating: randomCleaner.rating || 4.9
      }, onTriggerLog);

      const updatedQuote: QuoteRequest = {
        ...submittedRequest,
        status: "transmitted",
        assignedCleaner: randomCleaner.name,
        bookingStatus: "assigned"
      };

      onUpdateQuote(updatedQuote);

      onTriggerLog({
        id: `pay_gateway_${Date.now()}`,
        type: "crm",
        status: "success",
        message: `💳 [Direct-Merchant] payment authorized via Stripe Gateway. AuthToken: AAS_SECURE_PAY_TOKEN_${Math.floor(Math.random() * 900000 + 100000)}.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      onTriggerLog({
        id: `dispatch_user_receipt_${Date.now()}`,
        type: "system",
        status: "success",
        message: `📨 [Workflow Auto-Daemon] Transmitted final TAX INVOICE & PAID RECEIPT PDF dynamically to ${submittedRequest.email}. Verified complete.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      onTriggerLog({
        id: `sync_cus_dash_${Date.now()}`,
        type: "crm",
        status: "info",
        message: `📡 [MOCK POST] /api/customer/sync - Synchronized confirmed booking reference (#${submittedRequest.id.substring(5).toUpperCase()}) to client accounts dashboard schema.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      onTriggerLog({
        id: `sync_admin_dash_${Date.now()}`,
        type: "crm",
        status: "info",
        message: `📡 [MOCK POST] /api/admin/dispatch - Scheduled specialist dispatch allocation roster with shift supervisor dashboard. Assigned: ${randomCleaner.name}`,
        timestamp: new Date().toLocaleTimeString(),
      });

    }, 1500);
  };

  const validateStep1 = () => {
    const pc = postcode.trim();
    if (!/^\d{4}$/.test(pc)) {
      alert("Please enter a valid 4-digit Australian postcode.");
      return false;
    }

    if (!clientName.trim()) {
      alert("Please enter a contact name.");
      return false;
    }

    if (!phone.trim()) {
      alert("Please enter a contact phone number.");
      return false;
    }

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !emailTrimmed.includes("@") || !emailTrimmed.includes(".")) {
      alert("Please enter a valid email address.");
      return false;
    }

    if (postcodes) {
      const pcMatch = postcodes.find((p) => p.code === pc);
      if (pcMatch) {
         const stateMatch = states?.find((s) => s.code === pcMatch.state);
         const stateActive = stateMatch ? stateMatch.isActive : true;
         if (!pcMatch.isActive || !stateActive) {
           alert(`The postcode ${postcode} is currently deactivated or outside our active service network.`);
           return false;
         }
         const currentSvc = services.find((s) => s.name === serviceName);
         if (currentSvc && pcMatch.disabledServices && pcMatch.disabledServices.includes(currentSvc.slug)) {
           alert(`The service "${serviceName}" is temporarily restricted in postcode ${postcode}. Please select another service.`);
           return false;
         }
      } else {
         if (states) {
            let statePrefix = "National Network";
            if (pc.startsWith("2")) statePrefix = "NSW";
            else if (pc.startsWith("3")) statePrefix = "VIC";
            else if (pc.startsWith("4")) statePrefix = "QLD";
            else if (pc.startsWith("5")) statePrefix = "SA";
            else if (pc.startsWith("6")) statePrefix = "WA";
            else if (pc.startsWith("7")) statePrefix = "TAS";
            else if (pc.startsWith("0")) statePrefix = "NT";
            
            const stateMatch = states.find((s) => s.code === statePrefix);
            if (stateMatch && !stateMatch.isActive) {
               alert(`Service is currently deactivated across all of ${stateMatch.name}.`);
               return false;
            }
         }
      }
    }
    return true;
  };

  const getActiveStep = (): number => {
    if (paymentSuccess) return 5;
    if (submittedRequest) return 5;
    return currentFormStep;
  };

  const activeStepNum = getActiveStep();
  const progressPercent = ((activeStepNum - 1) / 4) * 100;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pc = postcode.trim();
    if (!/^\d{4}$/.test(pc)) {
      alert("Please enter a valid 4-digit Australian postcode.");
      return;
    }

    if (postcodes) {
      const pcMatch = postcodes.find((p) => p.code === pc);
      if (pcMatch) {
         const stateMatch = states?.find((s) => s.code === pcMatch.state);
         const stateActive = stateMatch ? stateMatch.isActive : true;
         if (!pcMatch.isActive || !stateActive) {
           alert(`The postcode ${postcode} is currently deactivated or outside our active service network.`);
           return;
         }
         const currentSvc = services.find((s) => s.name === serviceName);
         if (currentSvc && pcMatch.disabledServices && pcMatch.disabledServices.includes(currentSvc.slug)) {
           alert(`The service "${serviceName}" is temporarily restricted in postcode ${postcode}. Please select another service.`);
           return;
         }
      } else {
         if (states) {
            let statePrefix = "National Network";
            if (pc.startsWith("2")) statePrefix = "NSW";
            else if (pc.startsWith("3")) statePrefix = "VIC";
            else if (pc.startsWith("4")) statePrefix = "QLD";
            else if (pc.startsWith("5")) statePrefix = "SA";
            else if (pc.startsWith("6")) statePrefix = "WA";
            else if (pc.startsWith("7")) statePrefix = "TAS";
            else if (pc.startsWith("0")) statePrefix = "NT";
            
            const stateMatch = states.find((s) => s.code === statePrefix);
            if (stateMatch && !stateMatch.isActive) {
               alert(`Service is currently deactivated across all of ${stateMatch.name}.`);
               return;
            }
         }
      }
    }

    if (!clientName.trim() || !email.trim() || !phone.trim()) {
      alert("Please complete all required fields (*).");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newQuote: QuoteRequest = {
        id: `lead_${Math.floor(Math.random() * 900000 + 100000)}`,
        postcode,
        propertyType: propertyType,
        serviceName,
        name: clientName,
        email,
        phone,
        notes,
        timestamp: new Date().toLocaleTimeString(),
        status: "transmitted",
        estimatedTotal: estimateTotal,
        // Upgraded parameters synchronization
        bedroomCount: bedroomCount,
        bathroomCount: bathroomCount,
        deskCount: deskCount,
        communalCount: communalCount,
        subserviceName: subserviceName,
        selectedAddons: selectedAddons,
        // Phase 2 Advanced Fields
        roomBreakdown: {
          meetingRooms,
          workingDesks,
          kitchenettes,
          bathroomStalls,
          heavyCarpetZones,
        },
        slaTier,
        schedulingDetails: {
          preferredDate,
          timeSlot,
          keyExchange,
        },
        businessName,
        industry,
      };

      setIsSubmitting(false);
      
      // Identify customer in CDP registry
      identifyCDPUser(email, {
        name: clientName,
        phone,
        email
      }, onTriggerLog);

      // Track the lead form submission event
      traceCDPInteraction("Lead Form Submitted", {
        leadId: newQuote.id,
        postcode: newQuote.postcode,
        serviceName: newQuote.serviceName,
        subserviceName: newQuote.subserviceName,
        bedroomCount: newQuote.bedroomCount,
        bathroomCount: newQuote.bathroomCount,
        deskCount: newQuote.deskCount,
        communalCount: newQuote.communalCount,
        addonsCount: newQuote.selectedAddons?.length || 0,
        addonsList: newQuote.selectedAddons?.map(a => a.name) || [],
        estimatedTotal: newQuote.estimatedTotal,
        notesProvided: !!newQuote.notes
      }, onTriggerLog);

      setSubmittedRequest(newQuote);
      onQuoteSubmit(newQuote);
    }, 1200);
  };

  const handleReset = () => {
    setClientName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setPostcode("");
    setSubmittedRequest(null);
    setPaymentSuccess(false);
    setDispatchedCleaner(null);
    setEmailQuoteStatus("idle");
    setEmailInvoiceStatus("idle");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardName("");
    setNdisId("");
    setPurchaseOrder("");
    setCurrentFormStep(1);
    onClose();
  };

  const handleToggleAddon = (addon: any) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.name === addon.name);
      if (exists) {
        return prev.filter((a) => a.name !== addon.name);
      } else {
        return [...prev, { name: addon.name, price: addon.price, icon: addon.icon, quantity: 1 }];
      }
    });
  };

  const handleUpdateAddonQuantity = (addonName: string, delta: number) => {
    setSelectedAddons((prev) => {
      const existing = prev.find((a) => a.name === addonName);
      if (!existing) {
        if (delta > 0) {
          const registryMatch = addonRegistry.find(a => a.name === addonName);
          const price = registryMatch?.price || 45;
          const icon = registryMatch?.icon || "✨";
          return [...prev, { name: addonName, price, icon, quantity: delta }];
        }
        return prev;
      }
      const newQty = (existing.quantity || 1) + delta;
      if (newQty <= 0) {
        return prev.filter((a) => a.name !== addonName);
      }
      return prev.map((a) => a.name === addonName ? { ...a, quantity: newQty } : a);
    });
  };

  const activeSvcObj = combinedServices.find((s) => s.name === serviceName);
  const activeCategory = activeSvcObj?.category || "Domestic";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* Dark Translucent Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Main Dialog Window */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto z-10 border border-slate-100"
      >
        
        {/* Header Title Bar */}
        <div id="quote-modal-header" className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-5.5 h-5.5 text-purple-700" /> Professional Price Estimator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">Instant postcode matching and modular dispatch</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity Spot Lock CRO Banner */}
        <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-955 font-medium font-sans">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="leading-tight text-slate-700 text-[11px] sm:text-xs">
              <strong className="text-amber-900 font-extrabold">LIVE CAPACITY SPOT LOCK:</strong> Guaranteed booking slot reserved in our active Perth/Sydney crew dispatch.
            </span>
          </div>
          <div className="font-mono font-black bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded text-amber-950 animate-pulse whitespace-nowrap text-[11px] select-none ml-2">
            🕒 {formatTimer(spotLockTimer)}
          </div>
        </div>

        {/* Dynamic Stepper Progress Bar with trust anchors (Enhancement 1) */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between max-w-lg mx-auto relative px-2">
            
            {/* Connection line background */}
            <div className="absolute top-1/2 left-[5%] right-[5%] h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-[5%] h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
              style={{
                width: `${Math.max(0, Math.min(100, progressPercent))}%`
              }}
            />

            {[
              { idx: 1, label: "Location", mini: "📍" },
              { idx: 2, label: "Site Specs", mini: "🏢" },
              { idx: 3, label: "SLA Tier", mini: "🛡️" },
              { idx: 4, label: "Schedule", mini: "📅" },
              { idx: 5, label: "Checkout", mini: "💳" }
            ].map((step) => {
              const activeStep = getActiveStep();
              const isCompleted = activeStep > step.idx;
              const isCurrent = activeStep === step.idx;
              
              let stepBg = "bg-white text-slate-400 border border-slate-200";
              let textStyle = "text-slate-400 font-semibold";
              
              if (isCompleted) {
                stepBg = "bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50";
                textStyle = "text-emerald-600 font-bold";
              } else if (isCurrent) {
                if (step.idx === 5) {
                  stepBg = "bg-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse";
                  textStyle = "text-emerald-705 font-extrabold";
                } else {
                  stepBg = "bg-indigo-600 text-white ring-4 ring-indigo-150 shadow-md";
                  textStyle = "text-indigo-650 font-extrabold";
                }
              }

              return (
                <div key={step.idx} className="flex flex-col items-center z-10 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-300 ${stepBg}`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.idx === 5 ? "🎉" : step.idx}
                  </div>
                  <span className={`text-[9px] font-mono font-extrabold mt-1 uppercase tracking-wider hidden sm:inline-block ${textStyle}`}>
                    {step.label}
                  </span>
                  <span className={`text-[9px] font-mono font-extrabold mt-1 uppercase tracking-wider sm:hidden ${textStyle}`}>
                    {step.mini}
                  </span>
                </div>
              );
            })}

          </div>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {!submittedRequest ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {currentFormStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* Live Dispatch Feedback Alert */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                          <span className="text-slate-700 font-bold leading-normal">
                            🔥 Real-time booking dispatch active. Dynamic network rates active.
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest font-mono shrink-0">
                          ⚡ LIVE COORDINATES
                        </span>
                      </div>

                      {/* Location validation & handshakes card */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-4">
                        <h4 className="text-xs uppercase tracking-widest text-slate-550 font-extrabold flex items-center gap-1.5">
                          📍 Step 1: Location & Contact Coordinates
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Australian Postcode <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={postcode}
                              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                              placeholder="e.g. 6007, 2000"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-indigo-600 outline-none"
                              required
                            />
                            {recentPostcodes.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Quick Recall:</span>
                                {recentPostcodes.slice(0, 3).map((pc) => (
                                  <button
                                    key={pc}
                                    type="button"
                                    onClick={() => setPostcode(pc)}
                                    className="bg-white hover:bg-slate-100 text-slate-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200 shadow-xs transition-colors cursor-pointer"
                                  >
                                    📍 {pc}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              🏡 Property Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={propertyType}
                              onChange={(e) => setPropertyType(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none cursor-pointer"
                              required
                            >
                              <option value="Apartment">Apartment</option>
                              <option value="Townhouse">Townhouse</option>
                              <option value="Standalone House">Standalone House</option>
                              <option value="Commercial Space">Commercial Space / Office</option>
                            </select>
                          </div>
                        </div>

                        {/* SUBURB DISPATCH REAL-TIME MATCHING BANNER */}
                        {postcode.length === 4 && (
                          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-all animate-none">
                            {(() => {
                              const pcMatch = postcodes?.find(p => p.code === postcode.trim());
                              if (pcMatch) {
                                return (
                                  <>
                                    <div className="leading-normal">
                                      <span className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        📍 Network Identified: {pcMatch.suburb} ({pcMatch.state})
                                      </span>
                                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                        Dynamic postcode multiplier: {pcMatch.multiplier}x. Locating active regional supervisor in {pcMatch.suburb}...
                                      </p>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded font-mono shrink-0 self-start sm:self-center">
                                      🟢 ON SITE DISPATCH
                                    </span>
                                  </>
                                );
                              } else {
                                let stateCode = "WA";
                                if (postcode.startsWith("2")) stateCode = "NSW";
                                else if (postcode.startsWith("3")) stateCode = "VIC";
                                else if (postcode.startsWith("4")) stateCode = "QLD";
                                else if (postcode.startsWith("5")) stateCode = "SA";
                                
                                const stateMatch = states?.find(s => s.code === stateCode);
                                const active = stateMatch ? stateMatch.isActive : true;

                                if (active) {
                                  return (
                                    <>
                                      <div className="leading-normal">
                                        <span className="text-indigo-800 font-bold flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                          🌐 Regional Link Active: {stateCode} Region
                                        </span>
                                        <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                          Sourcing qualified state crew leader. Area active for high-spec dispatch.
                                        </p>
                                      </div>
                                      <span className="text-[9px] font-bold text-indigo-700 uppercase bg-indigo-100 px-2 py-0.5 rounded font-mono shrink-0 self-start sm:self-center">
                                        🟢 SYSTEM APPROVED
                                      </span>
                                    </>
                                  );
                                } else {
                                  return (
                                    <span className="text-rose-700 font-semibold flex items-center gap-1">
                                      ⚠️ Restricted State coverage: {stateCode} Region is temporarily deactivated.
                                    </span>
                                  );
                                }
                              }
                            })()}
                          </div>
                        )}

                        {/* Customer Identification coordinates */}
                        <div className="pt-4 border-t border-slate-200/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Your Name / Representative Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="John Doe"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Representative Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g. 0412 345 678"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-indigo-600 outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Corporate / Business Name <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              placeholder="e.g. Enterprise Clean Pty Ltd"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Business Industry Sector
                            </label>
                            <select
                              value={industry}
                              onChange={(e) => setIndustry(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none cursor-pointer"
                            >
                              <option value="Corporate Office">Corporate Office</option>
                              <option value="Healthcare / Clinics">Healthcare / Clinics</option>
                              <option value="F&B / Hospitality">F&B / Hospitality</option>
                              <option value="Real Estate / Strata">Real Estate / Strata</option>
                              <option value="NDIS Assisted living">NDIS / Guided Allowance</option>
                              <option value="Residential">Standard Domestic / Residential</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 font-bold mb-1.5">
                            Target Service Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={serviceName}
                            onChange={(e) => {
                              const nextSvc = e.target.value;
                              setServiceName(nextSvc);
                              const serviceObj = combinedServices.find((s) => s.name === nextSvc);
                              if (serviceObj) {
                                const metaKey = Object.keys(SERVICE_METADATA).find(
                                  (key) => SERVICE_METADATA[key].name === serviceObj.name || key === serviceObj.slug
                                );
                                let subList: any[] = [];
                                if (metaKey) {
                                  subList = SERVICE_METADATA[metaKey].subservices.map((sub, idx) => ({
                                    name: sub,
                                    slug: `${metaKey}-sub-${idx}`,
                                    priceOffset: 0,
                                    hoursOffset: 0,
                                    description: "Enterprise dynamic option"
                                  }));
                                } else {
                                  subList = subserviceRegistry[serviceObj.slug] || defaultSubservices;
                                }

                                if (subList && subList.length > 0) {
                                  setSubserviceName(subList[0].name);
                                } else {
                                  setSubserviceName("Premium General");
                                }
                                setSelectedAddons([]);
                                setHours(serviceObj.durationEstimateHours || 4);
                                if (serviceObj.category === "Domestic") {
                                  setBedroomCount(3);
                                  setBathroomCount(2);
                                } else if (serviceObj.category === "Commercial") {
                                  setDeskCount(20);
                                  setCommunalCount(1);
                                }
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none cursor-pointer"
                          >
                            {combinedServices.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name} ({s.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 font-bold mb-1.5">
                            Corporate Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. operations@business.com.au"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            if (validateStep1()) {
                              setCurrentFormStep(2);
                            }
                          }}
                          className="py-3.5 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-md select-none"
                        >
                          <span>Next: Site Specs</span>
                          <Send className="w-4 h-4 mt-0.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* Section 1: Custom Duration Estimator */}
                      <div className="bg-indigo-50/50 p-5 sm:p-6 rounded-2xl border border-indigo-100/80 space-y-4 font-sans border-b-2">
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                          <div>
                            <span className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" /> Custom Duration Estimator
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Adjust estimated labor requirements below if required</p>
                          </div>
                          <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-mono font-bold">
                            {hours} Hours Scheduled
                          </div>
                        </div>

                        <input
                          type="range"
                          min={2}
                          max={24}
                          value={hours}
                          onChange={(e) => setHours(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>Min 2.0 hrs (Rapid)</span>
                          <span>Max 24.0 hrs (Project crew)</span>
                        </div>
                      </div>

                      {/* Section 2: Physical Site Asset Specifier Counters */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-4">
                        <div>
                          <span className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">
                            🏢 Advanced Site Asset Breakdowns
                          </span>
                          <p className="text-[10px] text-slate-550 mt-0.5">Specify individual areas to optimize labor and dynamic team loading</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Meeting Rooms */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">📦 Meeting Rooms</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5">Boardrooms & labs</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setMeetingRooms(Math.max(0, meetingRooms - 1))}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs font-black text-slate-900 w-4 text-center">{meetingRooms}</span>
                              <button
                                type="button"
                                onClick={() => setMeetingRooms(meetingRooms + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Working Desks */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">🪑 Workstations / Desks</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5">Individual desk/benches</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setWorkingDesks(Math.max(0, workingDesks - 2))}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs font-black text-slate-900 w-5 text-center">{workingDesks}</span>
                              <button
                                type="button"
                                onClick={() => setWorkingDesks(workingDesks + 2)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Kitchenettes */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">🍳 Kitchenettes / breakrooms</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5">Breakrooms & food sinks</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setKitchenettes(Math.max(0, kitchenettes - 1))}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs font-black text-slate-900 w-4 text-center">{kitchenettes}</span>
                              <button
                                type="button"
                                onClick={() => setKitchenettes(kitchenettes + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Bathroom cubicles */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">🚾 Bathroom Cubicles</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5">Sanitation toilet stalls</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setBathroomStalls(Math.max(0, bathroomStalls - 1))}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs font-black text-slate-900 w-4 text-center">{bathroomStalls}</span>
                              <button
                                type="button"
                                onClick={() => setBathroomStalls(bathroomStalls + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Heavy Carpet Zones */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between sm:col-span-2">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">🧼 Special Carpets / Encapsulation Wash</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5">Deep extraction carpet areas</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setHeavyCarpetZones(Math.max(0, heavyCarpetZones - 1))}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs font-black text-slate-900 w-4 text-center">{heavyCarpetZones}</span>
                              <button
                                type="button"
                                onClick={() => setHeavyCarpetZones(heavyCarpetZones + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold cursor-pointer select-none active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                        {(() => {
                          const metaKey = Object.keys(SERVICE_METADATA).find(
                            (key) => SERVICE_METADATA[key].name === serviceName || (activeSvcObj && key === activeSvcObj.slug)
                          );
                          
                          let activeSublist = activeSvcObj ? (subserviceRegistry[activeSvcObj.slug] || defaultSubservices) : defaultSubservices;
                          let activeAddonsList = addonRegistry.filter((a) => a.categories.includes(activeCategory as any));

                          if (metaKey) {
                            const metaItem = SERVICE_METADATA[metaKey];
                            activeSublist = metaItem.subservices.map((sub, idx) => ({
                              name: sub,
                              slug: `${metaKey}-sub-${idx}`,
                              priceOffset: 0,
                              hoursOffset: 0,
                              description: "Enterprise premium grade option"
                            }));
                            activeAddonsList = metaItem.addons.map((add) => {
                              const registryMatch = addonRegistry.find(a => a.name.toLowerCase().includes(add.toLowerCase()) || add.toLowerCase().includes(a.name.toLowerCase()));
                              return {
                                id: registryMatch?.id || `meta-addon-${add.toLowerCase().replace(/\s+/g, '-')}`,
                                name: add,
                                price: metaItem.addonPrices?.[add] || registryMatch?.price || 45,
                                icon: registryMatch?.icon || "✨",
                                description: registryMatch?.description || `High-spec dynamic addon: ${add}`,
                                categories: []
                              };
                            });
                          }
                          return (
                            <>
                              {/* Subservice specification list */}
                              <div className="pt-2 border-t border-indigo-100/50">
                                <label className="block text-xs uppercase tracking-widest text-indigo-800 font-extrabold mb-2">
                                  Treatment / Sub-service level:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {activeSublist.map((sub) => {
                                    const isSelected = subserviceName === sub.name;
                                    return (
                                      <button
                                        type="button"
                                        key={sub.slug}
                                        onClick={() => setSubserviceName(sub.name)}
                                        className={`p-3 rounded-xl border text-left transition-all text-xs cursor-pointer ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200"
                                        }`}
                                      >
                                        <div className="font-extrabold flex justify-between gap-1 items-center">
                                          <span>{sub.name}</span>
                                          <span className={`font-mono text-[9px] whitespace-nowrap px-1.5 py-0.5 rounded ${isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-indigo-700 border border-slate-200"}`}>
                                            {sub.priceOffset >= 0 ? `+$${sub.priceOffset}` : `-$${Math.abs(sub.priceOffset)}`} AUD
                                          </span>
                                        </div>
                                        <p className={`text-[10px] mt-1 leading-tight ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                                          {sub.description}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Dynamic Property Sizing & Variable Constraints */}
                              <div className="pt-3 border-t border-indigo-150 space-y-3">
                                {metaKey && SERVICE_METADATA[metaKey] ? (() => {
                                  const metaItem = SERVICE_METADATA[metaKey];
                                  
                                  if (metaItem.model === "hourly") {
                                    return (
                                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs font-bold text-slate-700">
                                        <span className="text-indigo-800 font-extrabold uppercase text-[10px] tracking-wider">Property Size settings:</span>
                                        <div className="flex gap-4 w-full sm:w-auto justify-end">
                                          <div className="flex items-center gap-2 font-mono">
                                            <span>Bedrooms:</span>
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                              <button type="button" onClick={() => setBedroomCount(b => Math.max(1, b - 1))} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"><Minus className="w-3 h-3" /></button>
                                              <span className="px-3 text-slate-800 font-extrabold">{bedroomCount}</span>
                                              <button type="button" onClick={() => setBedroomCount(b => b + 1)} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"><Plus className="w-3 h-3" /></button>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono">
                                            <span>Bathrooms:</span>
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                              <button type="button" onClick={() => setBathroomCount(b => Math.max(1, b - 1))} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"><Minus className="w-3 h-3" /></button>
                                              <span className="px-3 text-slate-800 font-extrabold">{bathroomCount}</span>
                                              <button type="button" onClick={() => setBathroomCount(b => b + 1)} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"><Plus className="w-3 h-3" /></button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (metaItem.model === "fixed") {
                                    return (
                                      <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-wider text-indigo-800 font-extrabold">
                                          Select Flat-Rate Property Configuration:
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                          {Object.keys(metaItem.pricing || {}).map((prop) => {
                                            const isSelected = modalPropertyType === prop;
                                            return (
                                              <button
                                                key={prop}
                                                type="button"
                                                onClick={() => setModalPropertyType(prop)}
                                                className={`py-2 px-1 rounded-xl text-xs font-black border transition-all text-center cursor-pointer select-none uppercase ${
                                                  isSelected
                                                    ? "bg-indigo-600 border-indigo-700 text-white shadow"
                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                              >
                                                {prop}
                                                <span className={`block text-[8px] font-mono mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                                  ${metaItem.pricing?.[prop]}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (metaItem.model === "per_room") {
                                    return (
                                      <div className="space-y-3">
                                        <label className="block text-[10px] uppercase tracking-wider text-indigo-800 font-extrabold mb-1">
                                          Specify Target Room Counts:
                                        </label>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                          {Object.keys(metaItem.pricing || {}).map((room) => {
                                            const count = modalRoomCounters[room] || 0;
                                            const info = formatMetaItemName(room);
                                            return (
                                              <div key={room} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center justify-between gap-1.5 shadow-xs">
                                                <span className="text-base">{info.icon}</span>
                                                <span className="text-[10px] font-extrabold text-slate-700 text-center leading-tight truncate w-full">{info.label}</span>
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0 mt-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setModalRoomCounters(prev => ({ ...prev, [room]: Math.max(0, count - 1) }))}
                                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"
                                                  >
                                                    <Minus className="w-3 h-3" />
                                                  </button>
                                                  <span className="px-2.5 text-xs text-slate-800 font-extrabold font-mono">{count}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => setModalRoomCounters(prev => ({ ...prev, [room]: count + 1 }))}
                                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                  </button>
                                                </div>
                                                <span className="text-[8px] font-mono text-slate-400 font-bold">+${metaItem.pricing?.[room] || 0}/ea</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (metaItem.model === "per_item") {
                                    return (
                                      <div className="space-y-3">
                                        <label className="block text-[10px] uppercase tracking-wider text-indigo-800 font-extrabold mb-1">
                                          Count of Sized Items & Units:
                                        </label>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-48 overflow-y-auto pr-1">
                                          {Object.keys(metaItem.pricing || {}).map((item) => {
                                            const count = modalItemCounters[item] || 0;
                                            const info = formatMetaItemName(item);
                                            return (
                                              <div key={item} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center justify-between gap-1.5 shadow-xs">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm shrink-0">{info.icon}</span>
                                                  <span className="text-[10px] font-extrabold text-slate-700 leading-tight truncate">{info.label}</span>
                                                </div>
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => setModalItemCounters(prev => ({ ...prev, [item]: Math.max(0, count - 1) }))}
                                                    className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"
                                                  >
                                                    <Minus className="w-2.5 h-2.5" />
                                                  </button>
                                                  <span className="px-2 text-xs text-slate-800 font-extrabold font-mono">{count}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => setModalItemCounters(prev => ({ ...prev, [item]: count + 1 }))}
                                                    className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"
                                                  >
                                                    <Plus className="w-2.5 h-2.5" />
                                                  </button>
                                                </div>
                                                <span className="text-[8px] font-mono text-indigo-600 font-extrabold">+${metaItem.pricing?.[item] || 0} ea</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (metaItem.model === "sqm") {
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                          <span className="text-indigo-800 font-extrabold uppercase text-[10px] tracking-wider">Property Dimension Cover:</span>
                                          <span className="text-indigo-600 font-extrabold font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{modalSqm} sqm</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={30}
                                          max={500}
                                          step={10}
                                          value={modalSqm}
                                          onChange={(e) => setModalSqm(Number(e.target.value))}
                                          className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                                          <span>Min 30 sqm</span>
                                          <span>Max 500 sqm</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return null;
                                })() : (
                                  <>
                                    {activeCategory === "Domestic" ? (
                                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs font-bold text-slate-700">
                                        <span className="text-indigo-800 font-extrabold uppercase text-[10px] tracking-wider">Property Size settings:</span>
                                        <div className="flex gap-4 w-full sm:w-auto justify-end">
                                          <div className="flex items-center gap-2 font-mono">
                                            <span>Bedrooms:</span>
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                              <button type="button" onClick={() => setBedroomCount(b => Math.max(1, b - 1))} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"><Minus className="w-3 h-3" /></button>
                                              <span className="px-3 text-slate-800 font-extrabold">{bedroomCount}</span>
                                              <button type="button" onClick={() => setBedroomCount(b => b + 1)} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"><Plus className="w-3 h-3" /></button>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono">
                                            <span>Bathrooms:</span>
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                              <button type="button" onClick={() => setBathroomCount(b => Math.max(1, b - 1))} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-r border-slate-200 cursor-pointer"><Minus className="w-3 h-3" /></button>
                                              <span className="px-3 text-slate-800 font-extrabold">{bathroomCount}</span>
                                              <button type="button" onClick={() => setBathroomCount(b => b + 1)} className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 cursor-pointer"><Plus className="w-3 h-3" /></button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : activeCategory === "Commercial" ? (
                                      <div className="flex flex-col gap-3 text-xs font-bold text-slate-705">
                                        <span className="text-indigo-800 font-extrabold uppercase text-[10px] tracking-wider">Commercial Facility parameters:</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <div className="flex justify-between items-center text-slate-600 text-[11px]">
                                              <span>Workstation Desks: <strong className="text-slate-900 font-mono text-xs">{deskCount} desks</strong></span>
                                              <span className="text-[10px] text-indigo-650 font-bold font-mono">+${Math.floor(deskCount / 10) * 50} AUD</span>
                                            </div>
                                            <input
                                              type="range"
                                              min={5}
                                              max={150}
                                              step={5}
                                              value={deskCount}
                                              onChange={(e) => setDeskCount(parseInt(e.target.value))}
                                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <div className="flex justify-between items-center text-slate-600 text-[11px]">
                                              <span>Communal Rooms / Breakrooms: <strong className="text-slate-900 font-mono text-xs">{communalCount} spaces</strong></span>
                                              <span className="text-[10px] text-indigo-650 font-bold font-mono">+${communalCount * 35} AUD</span>
                                            </div>
                                            <input
                                              type="range"
                                              min={0}
                                              max={10}
                                              step={1}
                                              value={communalCount}
                                              onChange={(e) => setCommunalCount(parseInt(e.target.value))}
                                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>

                              {/* Context-Aware Dynamic Upsells (CRO Feature) */}
                              {(() => {
                                let upsellAddon: { name: string; price: number; icon: string; explanation: string } | null = null;
                                if (serviceName.includes("End of Lease")) {
                                  upsellAddon = {
                                    name: "End-of-Lease Security Deposit Guard",
                                    price: 120,
                                    icon: "🛡️",
                                    explanation: "Exhaustive agent checkout support, meticulous digital proof checklists, and complete bond-back guarantee backing"
                                  };
                                } else if (serviceName.includes("Regular")) {
                                  upsellAddon = {
                                    name: "NDIS & Aged Care Compliant Sterilisation",
                                    price: 90,
                                    icon: "♿",
                                    explanation: "Hospital-grade safety chemical trace, NDA clearances, and audited compliance paperwork"
                                  };
                                } else if (serviceName.includes("Carpet")) {
                                  upsellAddon = {
                                    name: "Stain Protection Shielder",
                                    price: 45,
                                    icon: "🧪",
                                    explanation: "Super-repellent stain and fluid block treatment for active high-traffic zones"
                                  };
                                } else if (serviceName.includes("Specialised")) {
                                  upsellAddon = {
                                    name: "Post-Construction Silica Safe-Clean",
                                    price: 145,
                                    icon: "🏗️",
                                    explanation: "Microscopic concrete pore extractions utilizing industrial dual HEPA air filtration setups"
                                  };
                                }

                                if (upsellAddon && !selectedAddons.some(a => a.name === upsellAddon!.name)) {
                                  const bonus = upsellAddon;
                                  return (
                                    <div className="mt-3 mb-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left animate-slide-in">
                                      <div className="space-y-1">
                                        <span className="bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">
                                          💡 Recommended High-Value Addition
                                        </span>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 leading-snug">
                                          <span>{bonus.icon}</span> Add {bonus.name} (+${bonus.price})
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-sans leading-tight">
                                          {bonus.explanation}. Highly requested by Australian agents & auditors.
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedAddons(prev => [...prev, { name: bonus.name, price: bonus.price, icon: bonus.icon, quantity: 1 }]);
                                          onTriggerLog({
                                            id: `upsell_${Date.now()}`,
                                            type: "system",
                                            status: "success",
                                            message: `🔥 Context-Aware Upsell Adopted: Selected "${bonus.name}" successfully!`,
                                            timestamp: new Date().toLocaleTimeString()
                                          });
                                        }}
                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] sm:text-xs uppercase px-4 py-2 rounded-xl transition-all shadow-md hover:scale-102 active:scale-98 cursor-pointer text-center"
                                      >
                                        Add Instantly
                                      </button>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Extras Upgrade checklist */}
                              <div className="pt-2 border-t border-indigo-100/50">
                                <label className="block text-xs uppercase tracking-widest text-indigo-800 font-extrabold mb-2 flex justify-between items-center">
                                  <span>Add Premium Service Extras:</span>
                                  <span className="text-[10px] text-indigo-600 font-extrabold font-mono lowercase">Click to opt in</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                  {activeAddonsList.map((addon) => {
                                    const isAdded = selectedAddons.some((a) => a.name === addon.name);
                                    const matchingSelected = selectedAddons.find((a) => a.name === addon.name);
                                    const qty = matchingSelected ? (matchingSelected.quantity || 1) : 0;
                                    
                                    return (
                                      <div
                                        key={addon.id}
                                        className={`p-3 rounded-xl border text-left transition-all text-xs flex justify-between gap-2.5 items-center ${
                                          isAdded
                                            ? "bg-purple-50/50 hover:bg-purple-50 border-purple-400 text-purple-950 shadow-sm"
                                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                                        }`}
                                      >
                                        <div 
                                          onClick={() => handleToggleAddon(addon)}
                                          className="flex items-center gap-2 cursor-pointer grow select-none pr-1"
                                        >
                                          <span className="text-base shrink-0">{addon.icon}</span>
                                          <div className="text-left leading-tight">
                                            <span className="font-extrabold block text-[11.5px] leading-tight text-slate-900">{addon.name}</span>
                                            <span className="text-[9px] text-slate-400 font-semibold font-sans leading-none block mt-0.5">
                                              {addon.description.slice(0, 45)}...
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {isAdded ? (
                                          <div className="flex items-center gap-1 shrink-0 bg-white border border-purple-200 rounded-lg p-0.5 shadow-xs">
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateAddonQuantity(addon.name, -1)}
                                              className="w-4.5 h-4.5 rounded flex items-center justify-center bg-slate-50 hover:bg-purple-100 text-purple-900 font-extrabold transition-colors cursor-pointer"
                                            >
                                              <Minus className="w-2.5 h-2.5 stroke-[3]" />
                                            </button>
                                            <span className="px-1 text-[10px] font-black text-purple-950 font-mono w-4.5 text-center">
                                              {qty}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateAddonQuantity(addon.name, 1)}
                                              className="w-4.5 h-4.5 rounded flex items-center justify-center bg-slate-50 hover:bg-purple-100 text-purple-900 font-extrabold transition-colors cursor-pointer"
                                            >
                                              <Plus className="w-2.5 h-2.5 stroke-[3]" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleAddon(addon)}
                                            className="text-[10px] font-black shrink-0 px-2 py-0.5 rounded font-mono bg-slate-50 text-purple-800 border border-purple-100 hover:bg-purple-50 cursor-pointer transition-colors"
                                          >
                                            +${addon.price}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          );
                        })()}

                        {/* Calculator Summary Outlay */}
                        <div className="border-t border-indigo-100 pt-3 flex justify-between items-center flex-wrap gap-4">
                          <div>
                            <span className="text-xs font-bold text-slate-500">Estimated Total Quote Range</span>
                            <p className="text-[10px] text-slate-400 italic font-sans">Conforms with targeted area multipliers & parameters</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-950 font-mono">
                              ${estimateTotal} - ${Math.round(estimateTotal * 1.15)}
                            </span>
                            <p className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">
                              + GST (Zero booking fee)
                            </p>
                          </div>
                        </div>

                        {/* Dynamic Promo Code Panel (Enhancement 3) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-500" /> Apply Corporate Coupon / Voucher Code
                            </span>
                            {appliedPromo && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono uppercase">
                                ✓ ACTIVE: {appliedPromo}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value)}
                              placeholder="e.g. SAVE20, FIRST10"
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono uppercase focus:border-indigo-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleApplyPromo}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                            >
                              Apply Code
                            </button>
                          </div>

                          {promoFeedback && (
                            <p className={`text-[11px] font-mono font-extrabold ${
                              promoStatus === "success" ? "text-emerald-700" : "text-rose-600"
                            }`}>
                              {promoFeedback}
                            </p>
                          )}

                          {/* Quick Select Coupon Buttons */}
                          <div className="flex flex-wrap gap-2 items-center pt-1">
                            <span className="text-[10px] text-slate-450 font-bold uppercase font-sans">Click to Auto-Redeem:</span>
                            <button
                              type="button"
                              onClick={() => { setPromoCodeInput("SAVE20"); setPromoStatus("idle"); setPromoFeedback(""); }}
                              className="bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200 shadow-3xs cursor-pointer transition-colors"
                            >
                              🏷️ SAVE20 (20% Off)
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPromoCodeInput("FIRST10"); setPromoStatus("idle"); setPromoFeedback(""); }}
                              className="bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200 shadow-3xs cursor-pointer transition-colors"
                            >
                              🏷️ FIRST10 (10% Off)
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPromoCodeInput("NDISFREE"); setPromoStatus("idle"); setPromoFeedback(""); }}
                              className="bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200 shadow-3xs cursor-pointer transition-colors"
                            >
                              🏷️ NDISFREE ($25 Off)
                            </button>
                          </div>
                        </div>

                      <div className="pt-4 flex justify-between gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(1)}
                          className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                        >
                          ← Core Service
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(3)}
                          className="py-3 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-md select-none"
                        >
                          <span>Next: Contact Details</span>
                          <Send className="w-4 h-4 mt-0.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* SLA Tier Compliance matrix */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-4">
                        <div>
                          <span className="text-xs uppercase font-extrabold text-slate-705 tracking-wider">
                            🛡️ Step 3: Certification & SLA Levels
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Select alignment level for active compliance, audits, and detergents</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Standard Tier */}
                          <div
                            onClick={() => setSlaTier("standard")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              slaTier === "standard"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase tracking-wide">Standard Service Tier</span>
                              <span className="text-[10px] font-mono text-slate-550 font-extrabold">Active (1.0x)</span>
                            </div>
                            <p className="text-[10px] mt-1 text-slate-500 font-normal leading-tight">
                              Fully vetted premium cleaners, standard chemical disinfectants, audit checklist.
                            </p>
                          </div>

                          {/* NDIS Certified Tier */}
                          <div
                            onClick={() => setSlaTier("ndis")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              slaTier === "ndis"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase tracking-wide">NDIS Access Certified</span>
                              <span className="text-[10px] font-mono text-indigo-650 font-bold">+10% loading</span>
                            </div>
                            <p className="text-[10px] mt-1 text-slate-500 font-normal leading-tight">
                              Wheelchair-safe operation, low-chemical sensitive detergents, standard compliance log.
                            </p>
                          </div>

                          {/* Gold HACCP Approved */}
                          <div
                            onClick={() => setSlaTier("haccp")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              slaTier === "haccp"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase tracking-wide">Gold HACCP Approved</span>
                              <span className="text-[10px] font-mono text-indigo-650 font-bold">+25% loading</span>
                            </div>
                            <p className="text-[10px] mt-1 text-slate-500 font-normal leading-tight">
                              Food prep safety certified, surgical grade rangehood scrub, HACCP compliance signed off.
                            </p>
                          </div>

                          {/* Platinum Surgical Clinical */}
                          <div
                            onClick={() => setSlaTier("platinum")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              slaTier === "platinum"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase tracking-wide">Platinum Surgical Clinical</span>
                              <span className="text-[10px] font-mono text-indigo-650 font-bold">+45% loading</span>
                            </div>
                            <p className="text-[10px] mt-1 text-slate-500 font-normal leading-tight">
                              Virucidal/bactericidal pathogen defense, double-bleach sterilization, bio-waste collection.
                            </p>
                          </div>
                        </div>

                        {/* Auditing and trust vector badges */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-455">
                            🛡️ VETTING & REGULATED ASSURANCE STANDARDS:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              Triple ISO Certifications
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              National Police Cleared Handlers
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              HACCP Safety Endorsed
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              NDIS Compliant Audits
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="pt-2 flex justify-between gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(2)}
                          className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                        >
                          ← Base Specs
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(4)}
                          className="py-3 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-md select-none"
                        >
                          <span>Next: Time & Key Exchange</span>
                          <Send className="w-4 h-4 mt-0.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* Step 4 details */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-4">
                        <div>
                          <span className="text-xs uppercase font-extrabold text-slate-705 tracking-wider">
                            📅 Step 4: Dispatch Shift Coordinator & Key Exchange
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Specify when our crew should arrive, shift surge, and real estate access notes</p>
                        </div>

                        {/* Date and hour select */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-650 font-bold mb-1.5">
                              Preferred Day <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={preferredDate}
                              onChange={(e) => setPreferredDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-650 font-bold mb-1.5">
                              Preferred Arrival Window <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={timeSlot}
                              onChange={(e) => setTimeSlot(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-600 outline-none cursor-pointer"
                              required
                            >
                              <option value="Morning Shift (7AM - 11AM)">Morning Shift (7AM - 11AM)</option>
                              <option value="Noon Shift (11AM - 3PM)">Noon Shift (11AM - 3PM)</option>
                              <option value="Afternoon Shift (3PM - 7PM)">Afternoon Shift (3PM - 7PM)</option>
                              <option value="Nocturnal Night Shift (7PM - 12AM)">Nocturnal Shift (7PM - 12AM - Out of Hours)</option>
                            </select>
                          </div>
                        </div>

                        {/* Shift Loading Multipliers selector */}
                        <div>
                          <label className="block text-xs text-slate-605 font-bold mb-2">
                            Operating Shift Loading
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTimeSlot("Morning Shift (7AM - 11AM)");
                                onTriggerLog({
                                  id: `shift_load_${Date.now()}`,
                                  type: "system",
                                  status: "success",
                                  message: "🛠️ [Dynamic Rates] Day Shift Load selected (1.00x).",
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }}
                              className={`p-3 rounded-xl border text-center font-extrabold text-[10px] uppercase cursor-pointer select-none tracking-wider ${
                                !timeSlot.includes("Nocturnal")
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-slate-705 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              Standard Day Shift
                              <span className="block text-[8px] font-mono mt-0.5 opacity-90">(1.00x - Peak Crew)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTimeSlot("Nocturnal Night Shift (7PM - 12AM)");
                                onTriggerLog({
                                  id: `shift_load_noc_${Date.now()}`,
                                  type: "system",
                                  status: "warning",
                                  message: "🌙 [Dynamic Rates] Nocturnal late loading triggered (1.20x tariff).",
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }}
                              className={`p-3 rounded-xl border text-center font-extrabold text-[10px] uppercase cursor-pointer select-none tracking-wider ${
                                timeSlot.includes("Nocturnal")
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-slate-705 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              Out of Hours Late
                              <span className="block text-[8px] font-mono mt-0.5 opacity-90">(1.20x - Nocturnal)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTimeSlot("Morning Shift (7AM - 11AM) - Weekend surge configured");
                                onTriggerLog({
                                  id: `shift_load_wk_${Date.now()}`,
                                  type: "system",
                                  status: "warning",
                                  message: "⚠️ [Dynamic Rates] Weekend dispatch premium loaded & prioritized (1.30x tariff).",
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }}
                              className={`p-3 rounded-xl border text-center font-extrabold text-[10px] uppercase cursor-pointer select-none tracking-wider ${
                                timeSlot.includes("Weekend")
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-slate-705 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              Weekend Surge
                              <span className="block text-[8px] font-mono mt-0.5 opacity-90">(1.30x - Emergency)</span>
                            </button>
                          </div>
                        </div>

                        {/* Access protocol Keyholding Exchange */}
                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-2">
                            🔑 Safe Area Access Protocol
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: "lockbox", label: "Secure Lockbox", desc: "Code provided" },
                              { id: "vault", label: "Aasta Vault Keyholding", desc: "Vault sign-out" },
                              { id: "concierge", label: "Concierge / Guard", desc: "Front Desk pickup" },
                              { id: "escort", label: "Escorted Access", desc: "Live Guard on site" }
                            ].map((proto) => {
                              const isSelected = keyExchange === proto.id;
                              return (
                                <button
                                  type="button"
                                  key={proto.id}
                                  onClick={() => setKeyExchange(proto.id)}
                                  className={`p-2.5 rounded-xl border text-center cursor-pointer select-none ${
                                    isSelected
                                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                                      : "bg-white border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="text-[10px] font-extrabold uppercase tracking-tight block text-slate-800 truncate">{proto.label}</span>
                                  <span className="text-[8px] text-slate-400 font-normal leading-tight block mt-0.5">{proto.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Special requests / instructions */}
                        <div>
                          <label className="block text-xs text-slate-600 font-bold mb-1.5">
                            Special dispatch requests, alarm codes, or entry hurdles (optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Code for side lockbox is #8210. Beware of the alarms in lobby. Strict safety protocols required."
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-600 outline-none resize-none placeholder-slate-400 text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="pt-2 flex justify-between gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(3)}
                          className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                        >
                          ← Adjust Tiers
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(5)}
                          className="py-3 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-md select-none"
                        >
                          <span>Next: Checkout Breakdown</span>
                          <Send className="w-4 h-4 mt-0.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 5 && (
                    <motion.div
                      key="step-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6 animate-none"
                    >
                      {/* Step 5 details (Billing Ledger Card & Payment settlement) */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-sans space-y-4">
                        <div>
                          <span className="text-xs uppercase font-extrabold text-slate-705 tracking-wider">
                            🧾 Step 5: Advanced Billing Ledger & Settlements
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Corporate receipt structure - pricing verified by on-demand dispatch algorithm</p>
                        </div>

                        {/* Detailed pricing audit ledger */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 font-mono text-xs shadow-xs text-slate-700">
                          <h6 className="font-extrabold border-b border-dashed border-slate-200 pb-2 text-slate-900 tracking-wide uppercase">🧾 Invoice Ledger Audit Summary</h6>
                          
                          <div className="flex justify-between items-center text-slate-650">
                            <span>Base Service Labor ({hours} hrs):</span>
                            <span>${hours * 45} AUD</span>
                          </div>

                          {(meetingRooms > 0 || workingDesks > 0 || kitchenettes > 0 || bathroomStalls > 0 || heavyCarpetZones > 0) && (
                            <div className="border-t border-slate-100 pt-2 space-y-1.5 text-slate-550 text-[11px]">
                              {meetingRooms > 0 && (
                                <div className="flex justify-between">
                                  <span>↳ Extra meeting rooms ({meetingRooms}x):</span>
                                  <span>+${meetingRooms * 45} AUD</span>
                                </div>
                              )}
                              {workingDesks > 0 && (
                                <div className="flex justify-between">
                                  <span>↳ High workstation index ({workingDesks} desks):</span>
                                  <span>+${workingDesks * 10} AUD</span>
                                </div>
                              )}
                              {kitchenettes > 0 && (
                                <div className="flex justify-between">
                                  <span>↳ Staff kitchenettes ({kitchenettes}x):</span>
                                  <span>+${kitchenettes * 60} AUD</span>
                                </div>
                              )}
                              {bathroomStalls > 0 && (
                                <div className="flex justify-between">
                                  <span>↳ Restrooms toilet stalls ({bathroomStalls}x):</span>
                                  <span>+${bathroomStalls * 50} AUD</span>
                                </div>
                              )}
                              {heavyCarpetZones > 0 && (
                                <div className="flex justify-between">
                                  <span>↳ Deep chemical carpet extraction ({heavyCarpetZones}x):</span>
                                  <span>+${heavyCarpetZones * 80} AUD</span>
                                </div>
                              )}
                            </div>
                          )}

                          {slaTier !== "standard" && slaTier !== "Standard" && (
                            <div className="flex justify-between text-indigo-707 font-bold border-t border-slate-100 pt-2">
                              <span>↳ Compliance SLA Tier Premium ({slaTier.toUpperCase()}):</span>
                              <span>
                                {(slaTier === "ndis" || slaTier === "NDIS-Certified") && "+10% + $30"}
                                {(slaTier === "haccp" || slaTier === "Gold-HACCP") && "+25% + $50"}
                                {(slaTier === "platinum" || slaTier === "Platinum-Surgical") && "+45% + $120"} AUD
                              </span>
                            </div>
                          )}

                          {timeSlot.includes("Nocturnal") && (
                            <div className="flex justify-between text-indigo-707 font-bold">
                              <span>↳ Nocturnal shift premium load:</span>
                              <span>+20% tariff</span>
                            </div>
                          )}

                          {timeSlot.includes("Weekend") && (
                            <div className="flex justify-between text-indigo-707 font-bold">
                              <span>↳ Weekend surgical schedule surge:</span>
                              <span>+30% tariff</span>
                            </div>
                          )}

                          {appliedPromo && (
                            <div className="flex justify-between text-emerald-700 font-extrabold border-t border-slate-100 pt-2">
                              <span>🏷️ ACTIVE Coupon Discount ({appliedPromo}):</span>
                              <span>
                                {appliedPromo === "SAVE20" && "-20%"}
                                {appliedPromo === "FIRST10" && "-10%"}
                                {appliedPromo === "NDISFREE" && "-$25.00"} AUD
                              </span>
                            </div>
                          )}

                          <div className="border-t border-slate-200 pt-3 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-slate-650">
                              <span>Net Invoice Estimate Subtotal:</span>
                              <span>${estimateTotal} AUD</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-455">
                              <span>Australian GST (10%):</span>
                              <span>${Math.round(estimateTotal * 0.1)} AUD</span>
                            </div>
                            <div className="flex justify-between items-center text-base font-extrabold text-slate-900 border-t border-dashed border-slate-200 pt-2 mt-1">
                              <span>Total Net Pay (INC. GST):</span>
                              <span>${Math.round(estimateTotal * 1.1)} AUD</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive payment options structure */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
                          <label className="block text-xs uppercase tracking-widest text-slate-655 font-black mb-1">
                            Select Settlement Option
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod("card");
                                onTriggerLog({
                                  id: `select_pay_cc_${Date.now()}`,
                                  type: "system",
                                  status: "info",
                                  message: "💳 Selected Card settlement. Auth-hold will lock dynamically.",
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }}
                              className={`p-3 rounded-xl border font-bold text-xs cursor-pointer select-none text-center ${
                                paymentMethod === "card"
                                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-705"
                              }`}
                            >
                              💳 Credit Card / Google Pay
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod("invoice");
                                onTriggerLog({
                                  id: `select_pay_inv_${Date.now()}`,
                                  type: "system",
                                  status: "success",
                                  message: "📑 Selected Corporate Invoicing with Net-14 terms protocol.",
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }}
                              className={`p-3 rounded-xl border font-bold text-xs cursor-pointer select-none text-center ${
                                paymentMethod === "invoice"
                                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-705"
                              }`}
                            >
                              📑 Corporate PO / Invoice Net-14
                            </button>
                          </div>

                          {paymentMethod === "card" ? (
                            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 animate-none text-xs bg-slate-50/50">
                              <span className="text-[10px] uppercase font-bold text-slate-455">Enter credit profile details for authorization hold:</span>
                              <div className="space-y-2 text-slate-705">
                                <input
                                  type="text"
                                  placeholder="Cardholder Name"
                                  defaultValue={clientName}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-sans"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Card Number"
                                    maxLength={19}
                                    defaultValue="4111 2222 3333 4444"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono col-span-2"
                                  />
                                  <input
                                    type="text"
                                    placeholder="CVC"
                                    maxLength={3}
                                    defaultValue="123"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono text-center"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 bg-slate-50/50 animated-none text-[10px] leading-tight text-slate-555">
                              <span className="font-extrabold uppercase text-indigo-805 block">📑 Purchase Order Net-14 protocols configured:</span>
                              <p className="mb-2">Invoice will be dynamically generated and transmitted to <strong>{email}</strong> upon completion of site dispatch. Payment is settled via standard bank transfer within 14 business days.</p>
                              <input
                                type="text"
                                placeholder="Enter corporate PO code (e.g. PO-7281-A)"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-mono font-bold"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Submit action */}
                      <div className="pt-2 flex justify-between gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(4)}
                          className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                        >
                          ← Adjust Timing
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          id="submit-quote-request-btn"
                          className="flex-1 py-4 bg-gradient-to-r from-purple-700 to-red-500 hover:from-purple-800 hover:to-red-600 text-white font-extrabold uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-purple-900/15"
                        >
                          <span>{isSubmitting ? "TRANSMITTING LEAD TO MASTER BOARD..." : "Transmit Verified Quote Request"}</span>
                          <Send className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            ) : (
              
              /* SUCCESS SCREEN & INTERACTIVE CHECKOUT PLATFORM */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                
                {/* Visual Header confirmation status strip */}
                <div className="text-center py-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-300">
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Quote Form Parameters Solidified
                  </h4>
                  <p className="text-[10px] uppercase text-emerald-800 tracking-widest font-extrabold">
                    Lead reference registered: {submittedRequest.id}
                  </p>
                </div>

                {/* PART A: Client Retained PDF Quote Hub */}
                <div id="pdf-hub-quote" className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div>
                    <h5 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Dynamic Quote Documents & Sharing Hub
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1 font-sans">Download ISO audited formal paperwork or dispatch instantly onto local client environments.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => generatePDFQuote(false)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer font-sans"
                    >
                      <Calculator className="w-4 h-4" /> Download Quote PDF
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSimulateEmail(false)}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                    >
                      <Mail className="w-4 h-4 text-indigo-600" />
                      {emailQuoteStatus === "idle" ? "Email PDF Quote" : emailQuoteStatus === "sending" ? "Dispatched..." : "✓ Email Dispatched"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateShare(false)}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                    >
                      <Share2 className="w-4 h-4 text-pink-600" />
                      {copiedLink ? "✓ URL Copied" : "Copy Share Link"}
                    </button>
                  </div>
                </div>

                {/* PART B: Checkout / Finalize payment state platform */}
                {!paymentSuccess ? (
                  <div id="checkout-panel-payment" className="bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-6 shadow-md transition-all space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-widest inline-block mb-1.5 font-sans">
                        Secure Vault Settlement Gateway
                      </span>
                      <h5 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <CreditCard className="w-4.5 h-4.5 text-indigo-600" /> Fast-Track Direct Driver Allocation & Dispatch
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-1 font-sans">Settle payment parameters below to dynamically authorize cleaner dispatches and auto-inject jobs into drivers' live dashboard routes.</p>
                    </div>

                    {/* Method Tabs Toggles */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-black text-slate-600">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`py-2 rounded-lg text-center cursor-pointer transition-all ${paymentMethod === "card" ? "bg-white text-indigo-700 shadow-sm font-black" : "hover:text-slate-900 font-bold"}`}
                      >
                        💳 Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("ndis")}
                        className={`py-2 rounded-lg text-center cursor-pointer transition-all ${paymentMethod === "ndis" ? "bg-white text-indigo-700 shadow-sm font-black" : "hover:text-slate-900 font-bold"}`}
                      >
                        ♿ NDIS Fund
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("corporate")}
                        className={`py-2 rounded-lg text-center cursor-pointer transition-all ${paymentMethod === "corporate" ? "bg-white text-indigo-700 shadow-sm font-black" : "hover:text-slate-900 font-bold"}`}
                      >
                        🏢 Corporate PO
                      </button>
                    </div>

                    {/* Express Payment Shortcuts (Enhancement 2) */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>⚡ Express Checkout Shortcuts</span>
                        <span className="text-indigo-600 font-extrabold">Instant Fill Authorization</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCardName("CUSTOMER EXPRESS PASS");
                            setCardNumber("4000 1234 5678 9010");
                            setCardExpiry("12/28");
                            setCardCvc("456");
                            setPaymentMethod("card");
                            onTriggerLog({
                              id: `express_checkout_${Date.now()}`,
                              type: "api",
                              status: "info",
                              message: "⚡ Express Apple Pay gateway parameters injected into form field configurations",
                              timestamp: new Date().toLocaleTimeString()
                            });
                          }}
                          className="bg-slate-900 hover:bg-black text-white py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm font-black shadow-xs cursor-pointer active:scale-95"
                        >
                          <span className="font-sans"> Pay</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setCardName("GOOGLE EXPRESS SECURE");
                            setCardNumber("5500 9876 5432 1011");
                            setCardExpiry("11/29");
                            setCardCvc("123");
                            setPaymentMethod("card");
                            onTriggerLog({
                              id: `express_checkout_g_${Date.now()}`,
                              type: "api",
                              status: "info",
                              message: "⚡ Express Google Pay secure parameters loaded into merchant payload structures",
                              timestamp: new Date().toLocaleTimeString()
                            });
                          }}
                          className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-black shadow-xs cursor-pointer active:scale-95"
                        >
                          <span className="text-red-500 font-extrabold">G</span>
                          <span className="font-bold">Pay</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 text-center italic font-mono">
                        Provides immediate sandboxed secure checkout credentials prefilled into checkout sections.
                      </p>
                    </div>

                    <form onSubmit={handleSecureCheckoutSubmit} className="space-y-4 font-sans">
                      {paymentMethod === "card" && (
                        <div className="space-y-3 font-mono">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cardholder Name</label>
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="LIAM VANCE"
                              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 uppercase outline-none focus:border-indigo-600"
                              required={paymentMethod === "card"}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Debit / Credit Card Number</label>
                            <input
                              type="text"
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                              placeholder="4500 1200 9001 2015"
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600 font-mono tracking-widest"
                              required={paymentMethod === "card"}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Expiry</label>
                              <input
                                type="text"
                                maxLength={5}
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value.replace(/[^\d/]/g, ''))}
                                placeholder="05/29"
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600 font-mono text-center"
                                required={paymentMethod === "card"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">CVC Security</label>
                              <input
                                type="text"
                                maxLength={3}
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                                placeholder="975"
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600 font-mono text-center"
                                required={paymentMethod === "card"}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === "ndis" && (
                        <div className="space-y-1 font-mono">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">NDIS Support Identifier Code</label>
                          <input
                            type="text"
                            value={ndisId}
                            onChange={(e) => setNdisId(e.target.value)}
                            placeholder="NDIS-48392-WA-VACATE"
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600"
                            required={paymentMethod === "ndis"}
                          />
                          <p className="text-[10px] text-slate-400 italic font-sans">Pre-approved NDIS client funding. Bypasses real card authorized transactions.</p>
                        </div>
                      )}

                      {paymentMethod === "corporate" && (
                        <div className="space-y-1 font-mono">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Corporate Client Purchase Order (PO)</label>
                          <input
                            type="text"
                            value={purchaseOrder}
                            onChange={(e) => setPurchaseOrder(e.target.value)}
                            placeholder="PO-2026-AAS-93022"
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600"
                            required={paymentMethod === "corporate"}
                          />
                          <p className="text-[10px] text-slate-400 italic font-sans">Net 30 invoice settlements dispatch for pre-approved corporate rosters.</p>
                        </div>
                      )}

                      <div className="bg-slate-50 p-3 rounded-xl border border-dotted border-slate-200 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold">Total Amount Authorized:</span>
                        <span className="text-sm font-extrabold font-mono text-indigo-950">
                          ${(submittedRequest.estimatedTotal || estimateTotal) + Math.round((submittedRequest.estimatedTotal || estimateTotal) * 0.1)} AUD <span className="text-[9px] text-slate-400 font-normal italic">(inc GST)</span>
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isPaying}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        <ShieldCheck className="w-4.5 h-4.5" />
                        <span>{isPaying ? "Authorizing Secure Settlement..." : "Settle Payment & Dispatch Cleaner Now"}</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  
                  /* CELEBRATION DISPATCHED RECEIPT CARD */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    id="paid-invoice-celebration-card"
                    className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 text-center space-y-5"
                  >
                    <div>
                      <span className="bg-emerald-500 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block mb-1.5 animate-bounce font-sans">
                        Booking Complete
                      </span>
                      <h5 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        🎉 Transaction Success & Driver Dispatched!
                      </h5>
                      <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto font-sans">
                        Your payment was cleared. An official tax-invoice receipt has been compiled and our automated dispatcher daemon has synchronized the work order.
                      </p>
                    </div>

                    {/* Allocated Cleaner Card Detail Component */}
                    <div className="bg-white border border-emerald-200 p-4 rounded-2xl max-w-sm mx-auto text-left relative overflow-hidden">
                      <div className="absolute right-3 top-3 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono border border-emerald-300">
                        Active Job Dispatched
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold font-mono">Assigned Clean Specialist:</div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-extrabold text-sm border-2 border-indigo-300 select-none">
                          {dispatchedCleaner?.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-800 font-sans">{dispatchedCleaner?.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{dispatchedCleaner?.phone}  • ⭐ {dispatchedCleaner?.rating.toFixed(2)} rating</p>
                        </div>
                      </div>
                    </div>

                    {/* Part C: Paid PDF Invoice downloads and sharing buttons */}
                    <div className="border-t border-emerald-200/80 pt-4 space-y-3 font-sans">
                      <p className="text-xs text-slate-600 font-bold">Receipt Invoicing Document Control Panel:</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => generatePDFQuote(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer font-mono"
                        >
                          📥 Tax Invoice PDF
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleSimulateEmail(true)}
                          className="bg-white hover:bg-slate-100 border border-emerald-300 text-slate-700 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                        >
                          <Mail className="w-3.5 h-3.5 text-emerald-600" />
                          {emailInvoiceStatus === "idle" ? "Email Receipt" : emailInvoiceStatus === "sending" ? "Dispatched..." : "✓ Receipt Sent"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSimulateShare(true)}
                          className="bg-white hover:bg-slate-100 border border-emerald-300 text-slate-700 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                        >
                          <Share2 className="w-3.5 h-3.5 text-pink-500" />
                          {copiedReceiptLink ? "✓ URL Copied" : "Share Invoice"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Return button */}
                <div className="pt-4 text-center">
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors shadow-md font-sans"
                  >
                    Return and Continue
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
