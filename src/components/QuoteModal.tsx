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
  // Modal Fields State
  const [postcode, setPostcode] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

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
    } else if (services.length > 0) {
      setServiceName(services[0].name);
    }
  }, [selectedService, services]);

  // Load draft configuration from localStorage if available upon trigger
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem("aastaclean_current_booking_draft");
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.postcode) setPostcode(draft.postcode);
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
    const serviceObj = services.find((s) => s.name === serviceName);
    if (!serviceObj) return;

    const hourlyRate = serviceObj.baseRatePerHour;
    let multiplier = 1.0;

    if (postcodes) {
      const pcMatch = postcodes.find((p) => p.code === postcode.trim());
      if (pcMatch) multiplier = pcMatch.multiplier;
    }

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
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);

    const mergedCleanTotal = baseHourly + subserviceOffset + roomSurcharge + addonsTotal;
    let finalCalculated = Math.round((mergedCleanTotal * multiplier) + 15); // +$15 travel/prep fee

    // Apply promo adjustments directly (Enhancement 3)
    if (discountRate > 0) {
      finalCalculated = Math.round(finalCalculated * (1 - discountRate));
    }
    if (discountFlat > 0) {
      finalCalculated = Math.max(15, finalCalculated - discountFlat);
    }

    setEstimateTotal(finalCalculated);
  }, [hours, serviceName, postcode, services, postcodes, bedroomCount, bathroomCount, deskCount, communalCount, subserviceName, selectedAddons, discountRate, discountFlat]);

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
        doc.text(`↳ Premium Extra: ${addon.name}`, 14, yPos);
        doc.text("1 unit", 115, yPos);
        doc.text(`$${addon.price}.00`, 145, yPos);
        doc.text(`+$${addon.price}.00`, 172, yPos);
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
    if (submittedRequest) return 4;
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
        selectedAddons: selectedAddons
      };

      setIsSubmitting(false);
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
        return [...prev, { name: addon.name, price: addon.price, icon: addon.icon }];
      }
    });
  };

  const activeSvcObj = services.find((s) => s.name === serviceName);
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
              { idx: 1, label: "Area", mini: "Area" },
              { idx: 2, label: "Specs", mini: "Specs" },
              { idx: 3, label: "Contact", mini: "Contact" },
              { idx: 4, label: "Vault", mini: "Vault" },
              { idx: 5, label: "Confirm", mini: "🎉" }
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
                      {/* Social Proof & Urgency strip (Enhancement 2) */}
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 px-4 flex items-center gap-3 text-xs justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                          <span className="text-indigo-950 font-sans font-bold leading-normal">
                            🔥 Live dispatch active in <span className="font-mono bg-indigo-100 px-1 rounded text-indigo-800 font-extrabold">{postcode || '6008'}</span>. Only 2 priority contractor spots available today!
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest font-mono shrink-0 hidden sm:inline-block">
                          ⚡ RAPID DISPATCH
                        </span>
                      </div>
                      
                      {/* PART 1: Postcode & Service Selection */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-slate-500 font-black mb-2">
                            Australian Postcode <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 6007, 2000"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-purple-600 outline-none"
                            required
                          />
                          {recentPostcodes.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                                <span className="animate-pulse">🕒</span> Quick Recall:
                              </span>
                              {recentPostcodes.slice(0, 3).map((pc) => (
                                <button
                                  key={pc}
                                  type="button"
                                  onClick={() => {
                                    setPostcode(pc);
                                    onTriggerLog({
                                      id: `quote_recall_pc_${Date.now()}`,
                                      type: "api",
                                      status: "info",
                                      message: `🕒 [Postcode Context Saved] Quick-recalled Australian postcode directory "${pc}" from local sessions cache`,
                                      timestamp: new Date().toLocaleTimeString()
                                    });
                                  }}
                                  className="bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                                >
                                  📍 {pc}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest text-slate-500 font-black mb-2">
                            Service Category
                          </label>
                          <select
                            value={serviceName}
                            onChange={(e) => {
                              const nextSvc = e.target.value;
                              setServiceName(nextSvc);
                              const serviceObj = services.find((s) => s.name === nextSvc);
                              if (serviceObj) {
                                const subList = subserviceRegistry[serviceObj.slug] || defaultSubservices;
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
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-purple-600 outline-none max-h-40 cursor-pointer"
                          >
                            {services.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name} ({s.category})
                              </option>
                            ))}
                          </select>
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
                          <span>Next: Customize Specs</span>
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
                      {/* PART 2: DRAFT OVERVIEW OR MANUALLY EDIT */}
                      <div className="bg-indigo-50/50 p-5 sm:p-6 rounded-2xl border border-indigo-100/80 space-y-4 font-sans">
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                          <div>
                            <span className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" /> Custom Duration Estimator
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">Adjust estimated labor requirements below</p>
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
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>2 hrs (Standard Small)</span>
                          <span>12 hrs (Enterprise High Frequency)</span>
                          <span>24 hrs (Continuous Industrial Shift)</span>
                        </div>

                        {(() => {
                          const activeSublist = activeSvcObj ? (subserviceRegistry[activeSvcObj.slug] || defaultSubservices) : defaultSubservices;
                          const activeAddonsList = addonRegistry.filter((a) => a.categories.includes(activeCategory as any));
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

                              {/* Room & Workspace counters */}
                              <div className="pt-2 border-t border-indigo-100/50">
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
                              </div>

                              {/* Extras Upgrade checklist */}
                              <div className="pt-2 border-t border-indigo-100/50">
                                <label className="block text-xs uppercase tracking-widest text-indigo-800 font-extrabold mb-2 flex justify-between items-center">
                                  <span>Add Premium Service Extras:</span>
                                  <span className="text-[10px] text-indigo-600 font-extrabold font-mono lowercase">Click to opt in</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                  {activeAddonsList.map((addon) => {
                                    const isAdded = selectedAddons.some((a) => a.name === addon.name);
                                    return (
                                      <button
                                        type="button"
                                        key={addon.id}
                                        onClick={() => handleToggleAddon(addon)}
                                        className={`p-3 rounded-xl border text-left transition-all text-xs cursor-pointer flex justify-between gap-2.5 items-center ${
                                          isAdded
                                            ? "bg-purple-50 hover:bg-purple-100 border-purple-400 text-purple-950 shadow-sm"
                                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-base shrink-0">{addon.icon}</span>
                                          <div className="text-left leading-tight">
                                            <span className="font-extrabold block text-[11px] leading-tight text-slate-900">{addon.name}</span>
                                            <span className="text-[9px] text-slate-400 font-semibold font-sans leading-none block mt-1">{addon.description.slice(0, 48)}...</span>
                                          </div>
                                        </div>
                                        <span className={`text-[10px] font-black shrink-0 px-2 py-0.5 rounded font-mono ${isAdded ? "bg-purple-600 text-white" : "bg-slate-50 text-purple-800 border border-purple-100"}`}>
                                          +${addon.price}
                                        </span>
                                      </button>
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
                      className="space-y-6 animate-none"
                    >
                      {/* PART 3: Personal Inquiries Details */}
                      <div className="space-y-4 bg-slate-50/60 p-5 sm:p-6 rounded-2xl border border-slate-200/60 font-sans">
                        <h4 className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">
                          Personal Contact Inquiries Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Your Name / Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="John Doe"
                              className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm focus:border-purple-600 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 font-bold mb-1.5">
                              Contact Phone <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g. 0412 345 678"
                              className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm focus:border-purple-600 outline-none font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 font-bold mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. operations@business.com.au"
                            className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm focus:border-purple-600 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 font-bold mb-1.5">
                            Special requests or site parameters (optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Commercial grease trap deep scrubbing, strict safety protocols required."
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm focus:border-purple-600 outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Form Footer Action */}
                      <div className="pt-4 flex justify-between gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(2)}
                          className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                        >
                          ← Configure Specs
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          id="submit-quote-request-btn"
                          className="flex-1 py-4 bg-gradient-to-r from-purple-700 to-red-500 hover:from-purple-800 hover:to-red-600 text-white font-extrabold uppercase tracking-widest text-xs sm:text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-purple-900/15"
                        >
                          <span>{isSubmitting ? "Transmitting lead parameters..." : "Transmit Verified Quote Request"}</span>
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
