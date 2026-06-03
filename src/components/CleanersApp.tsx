import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Clock, 
  User, 
  Award, 
  DollarSign, 
  Briefcase, 
  AlertCircle,
  Truck,
  Sparkles,
  ClipboardList,
  PenTool,
  Navigation,
  Play,
  Square,
  RefreshCw,
  Map as MapIcon,
  Unlock,
  Mail,
  Camera,
  Upload,
  Trash2,
  Eye,
  Send,
  X,
  Image as ImageIcon,
  Wifi,
  WifiOff
} from "lucide-react";
import { QuoteRequest, Cleaner } from "../types";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { SERVICE_METADATA } from "../config/ServiceCatalog";

interface CleanersAppProps {
  quotes: QuoteRequest[];
  cleaners: Cleaner[];
  onUpdateQuote: (updated: QuoteRequest) => void;
  onTriggerLog: (log: any) => void;
}

// Suburb lookup for Maps center points mapping
const SUBURB_MAP: Record<string, { lat: number; lng: number; label: string }> = {
  "6008": { lat: -31.9472, lng: 115.8239, label: "Subiaco" },
  "2000": { lat: -33.8688, lng: 151.2093, label: "Sydney CBD" },
  "3000": { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
  "4000": { lat: -27.4705, lng: 153.0260, label: "Brisbane CBD" },
  "5000": { lat: -34.9285, lng: 138.6007, label: "Adelaide CBD" },
  "6007": { lat: -31.9392, lng: 115.8347, label: "West Leederville" },
  "7000": { lat: -42.8821, lng: 147.3272, label: "Hobart" },
  "8000": { lat: -12.4637, lng: 130.8444, label: "Darwin" }
};

export default function CleanersApp({ 
  quotes, 
  cleaners, 
  onUpdateQuote,
  onTriggerLog
}: CleanersAppProps) {
  
  const [activeCleanerName, setActiveCleanerName] = useState(cleaners[0]?.name || "");
  const [daylightHighContrast, setDaylightHighContrast] = useState(false);
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_completed_subtasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Signature Capture Modal / Drawer trigger
  const [signingJobId, setSigningJobId] = useState<string | null>(null);

  // Email template sharing modal state
  const [sharingJobId, setSharingJobId] = useState<string | null>(null);
  const [emailTemplateType, setEmailTemplateType] = useState<"handover" | "eta" | "hygiene">("handover");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [ratingInput, setRatingInput] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState("Technician completed all checklist tasks with exemplary attention to detail.");
  const [showEmailSuccessToast, setShowEmailSuccessToast] = useState(false);

  // Live Timer states: jobId -> { arrivalTime: string, seconds: number, isRunning: boolean }
  const [timers, setTimers] = useState<Record<string, { startTime: string; seconds: number; isRunning: boolean }>>({});

  // Canvas Refs for signature tracking
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const activeCleaner = cleaners.find((c) => c.name === activeCleanerName);

  // --- SERVICE WORKER & OFFLINE COHERENCY STATES ---
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_offline_sync_queue");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_offline_simulated");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [swStatus, setSwStatus] = useState<string>("detecting");
  const [projectedQuotes, setProjectedQuotes] = useState<QuoteRequest[]>(quotes);

  // Background Sync dispatcher to empty the queue on connection recovery
  const triggerSyncQueueDispatch = (currentQueue = offlineSyncQueue) => {
    if (currentQueue.length === 0) return;

    onTriggerLog({
      id: `sync_start_${Date.now()}`,
      type: "api",
      status: "info",
      message: `🔄 Service Worker Sync: Restoring connectivity. Drain queue of (${currentQueue.length}) actions...`,
      timestamp: new Date().toLocaleTimeString(),
    });

    // Simulate short network latency and dispatch queued client updates to core system
    setTimeout(() => {
      // Group queue items by quote ID to merge updates cleanly
      const collapsed: Record<string, any> = {};
      currentQueue.forEach((item) => {
        collapsed[item.quoteId] = {
          ...collapsed[item.quoteId],
          ...item.payload
        };
      });

      // Synchronize with parent state
      Object.keys(collapsed).forEach((quoteId) => {
        const payload = collapsed[quoteId];
        const baseQuote = quotes.find((q) => q.id === quoteId);
        if (baseQuote) {
          onUpdateQuote({
            ...baseQuote,
            ...payload
          });
        }
      });

      onTriggerLog({
        id: `sync_success_${Date.now()}`,
        type: "api",
        status: "success",
        message: `🚀 Service Worker Sync Success: Reintegrated ${currentQueue.length} transactions (Checked cards & Signatures) cleanly. Sync status: 200 OK.`,
        timestamp: new Date().toLocaleTimeString(),
        payload: {
          drainedRecordsCount: currentQueue.length,
          mergedJobsCount: Object.keys(collapsed).length,
          activeServiceWorker: "Workbox v1-active"
        }
      });

      setOfflineSyncQueue([]);
      localStorage.setItem("aastaclean_offline_sync_queue", JSON.stringify([]));
    }, 1100);
  };

  // Log and schedule offline held queue
  const queueOfflineAction = (quoteId: string, type: string, payload: any, logText: string) => {
    const newItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      quoteId,
      type,
      timestamp: new Date().toLocaleTimeString(),
      payload
    };

    const nextQueue = [...offlineSyncQueue, newItem];
    setOfflineSyncQueue(nextQueue);
    localStorage.setItem("aastaclean_offline_sync_queue", JSON.stringify(nextQueue));

    onTriggerLog({
      id: `offline_queue_${newItem.id}`,
      type: "system",
      status: "warning",
      message: `⚡ Offline SW Queue: Cached "${logText}". Sync scheduled for signal recovery.`,
      timestamp: new Date().toLocaleTimeString(),
      payload: newItem
    });
  };

  // Register real Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      setSwStatus("registering");
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => {
          setSwStatus("registered");
          console.log("👷 Service Worker registered successfully:", reg);
          
          // Listen to background sync events
          const handleSWMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "SERVICE_WORKER_SYNC_TRIGGERED") {
              onTriggerLog({
                id: `sw_sync_${Date.now()}`,
                type: "system",
                status: "success",
                message: `👷 Service Worker Sync Event: Background Service Worker triggered. Initiating cache flush...`,
                timestamp: new Date().toLocaleTimeString()
              });
              triggerSyncQueueDispatch();
            }
          };
          navigator.serviceWorker.addEventListener("message", handleSWMessage);
          return () => navigator.serviceWorker.removeEventListener("message", handleSWMessage);
        })
        .catch((err) => {
          setSwStatus("failed");
          console.warn("👷 Service Worker registration failed:", err);
        });
    } else {
      setSwStatus("unsupported");
    }
  }, []);

  // Sync projectedQuotes when parent quotes props modify, applying pending offline sync actions sequentially
  useEffect(() => {
    setProjectedQuotes(() => {
      return quotes.map((q) => {
        const pendingForJob = offlineSyncQueue.filter((item) => item.quoteId === q.id);
        if (pendingForJob.length === 0) {
          return q;
        }
        let merged = { ...q };
        pendingForJob.forEach((item) => {
          if (item.type === "status_update") {
            merged.bookingStatus = item.payload.bookingStatus;
          } else if (item.type === "timer_start") {
            merged.bookingStatus = "in-progress";
            merged.siteArrivalTime = item.payload.siteArrivalTime;
          } else if (item.type === "signature_complete") {
            merged.bookingStatus = "completed";
            merged.clientSignature = item.payload.clientSignature;
            merged.siteDepartureTime = item.payload.siteDepartureTime;
            merged.actualSiteMinutes = item.payload.actualSiteMinutes;
          } else if (item.type === "photo_upload") {
            merged.beforePhotos = item.payload.beforePhotos || merged.beforePhotos;
            merged.afterPhotos = item.payload.afterPhotos || merged.afterPhotos;
          }
        });
        return merged;
      });
    });
  }, [quotes, offlineSyncQueue]);

  const cleanerJobs = projectedQuotes.filter((q) => q.assignedCleaner === activeCleanerName);

  // Active Timer Tick effect
  useEffect(() => {
    const handle = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(prev).forEach((id) => {
          const t = prev[id];
          if (t && t.isRunning) {
            next[id] = { ...t, seconds: t.seconds + 1 };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(handle);
  }, []);

  // Setup and calibrate signature pad with high-DPI (Retina) scaling and size correction
  useEffect(() => {
    if (signingJobId && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Calibrate pixel buffers to prevent rendering offset with CSS bounding box
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#4338ca"; // Indigo-700
      }
    }
  }, [signingJobId]);

  // Format stopwatch output: mm:ss or hh:mm:ss
  const formatDuration = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, "0") : null,
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].filter(Boolean).join(":");
  };

  const getSubtasksForService = (serviceName: string) => {
    // Check if the serviceName corresponds to any Service in metadata
    const parsedNameClean = serviceName.toLowerCase();
    let foundMetadataKey = "";
    
    if (parsedNameClean.includes("regular") || parsedNameClean.includes("domestic") || parsedNameClean.includes("general")) {
      foundMetadataKey = "regular-cleaning";
    } else if (parsedNameClean.includes("lease") || parsedNameClean.includes("bond") || parsedNameClean.includes("vacate")) {
      foundMetadataKey = "end-of-lease";
    } else if (parsedNameClean.includes("carpet") || parsedNameClean.includes("rug")) {
      foundMetadataKey = "carpet-cleaning";
    } else if (parsedNameClean.includes("pressure") || parsedNameClean.includes("exterior") || parsedNameClean.includes("wash") || parsedNameClean.includes("high-pressure")) {
      foundMetadataKey = "pressure-cleaning";
    } else if (parsedNameClean.includes("upholstery") || parsedNameClean.includes("fabric") || parsedNameClean.includes("furniture") || parsedNameClean.includes("leather") || parsedNameClean.includes("mattress")) {
      foundMetadataKey = "upholstery-furniture";
    } else if (parsedNameClean.includes("specialized") || parsedNameClean.includes("emergency") || parsedNameClean.includes("ndis") || parsedNameClean.includes("restoration") || parsedNameClean.includes("builders") || parsedNameClean.includes("commercial") || parsedNameClean.includes("office")) {
      foundMetadataKey = "specialized";
    }

    const metadataItem = SERVICE_METADATA[foundMetadataKey];
    if (metadataItem && metadataItem.inclusions && metadataItem.inclusions.length > 0) {
      // Clean and map active service catalog inclusions as professional checklists
      return [
        "Conduct pre-operation safety risk assessment",
        ...metadataItem.inclusions,
        "Sign-off visual checklist standards with client",
        "Perform site cleanup & collect specialized tools"
      ];
    }

    const defaultChecklist = ["Prepare standard neutral sanitizer", "Dust all hard surfaces", "Mop tiled areas", "Vacuum high-traffic zones"];
    if (serviceName.includes("Commercial") || serviceName.includes("Office")) {
      return [
        "Empty corporate desk bins & sanitise frames",
        "Sanitise high-touch keyboards, telephone receivers & mice",
        "Microfibre wipe dual-screen displays",
        "Vacuum boardrooms and sanitize conference tables",
        "Sanitise communal breakout areas & corporate kitchens"
      ];
    }
    if (serviceName.includes("Carpet")) {
      return [
        "Affix corner protective guards for hose feed",
        "Dynamic dry industrial suction vacuuming",
        "Targeted bio-enzymatic spray stain pretreatment",
        "High-temperature deionised steam extraction wash",
        "Affix air blower dryers & groom protective pile fibers"
      ];
    }
    if (serviceName.includes("NDIS")) {
      return [
        "Establish friendly physical distance client check-in",
        "High-frequency sanitization of support rails and handles",
        "Hypoallergenic chemical deployment on accessible spaces",
        "Clear accessible safety hallways of obstacles",
        "Log compliance audit checklist inside care system"
      ];
    }
    if (serviceName.includes("End of Lease") || serviceName.includes("Builders")) {
      return [
        "Inspect property status with checklist guidelines",
        "Deep scrub interior cabinets, drawers and wardrobes",
        "Steam-clean wall vents and track window grime",
        "Deep polish kitchen rangehood, filters and oven internal walls",
        "Sanitise heavy lime scaling on shower screen glass"
      ];
    }
    return defaultChecklist;
  };

  const handleToggleSubtask = (quoteId: string, subtask: string) => {
    setCompletedSubtasks((prev) => {
      const current = prev[quoteId] || [];
      const updated = current.includes(subtask)
        ? current.filter((x) => x !== subtask)
        : [...current, subtask];
      const next = { ...prev, [quoteId]: updated };
      try {
        localStorage.setItem("aastaclean_completed_subtasks", JSON.stringify(next));
      } catch (err) {
        console.error("Failed to store checklists in localStorage", err);
      }

      const logText = `Checklist option "${subtask.substring(0, 32)}..." ${current.includes(subtask) ? "deselected" : "completed"}`;
      if (isOffline) {
        queueOfflineAction(quoteId, "checklist_toggle", {}, logText);
      } else {
        onTriggerLog({
          id: Math.random().toString(),
          type: "system",
          status: "success",
          message: `📋 Checklist Update: ${logText} on Job #${quoteId.slice(-6)}`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
      return next;
    });
  };

  const handleUpdateStatus = (quoteId: string, nextStatus: QuoteRequest["bookingStatus"]) => {
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job || !nextStatus) return;

    const payload = { bookingStatus: nextStatus };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
      queueOfflineAction(
        quoteId,
        "status_update",
        payload,
        `Roster status update to [${nextStatus.toUpperCase()}] queued`
      );
    } else {
      onUpdateQuote({
        ...job,
        ...payload,
      });

      onTriggerLog({
        id: Math.random().toString(),
        type: "api",
        status: "success",
        message: `📲 Roster Sync: Cleaner "${activeCleanerName}" updated job status of "#${quoteId.slice(-6)}" to [${nextStatus?.toUpperCase()}]`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  // ⏱️ Start site arrival timer
  const handleStartTimer = (quoteId: string) => {
    const now = new Date();
    setTimers((prev) => ({
      ...prev,
      [quoteId]: {
        startTime: now.toLocaleTimeString(),
        seconds: 0,
        isRunning: true
      }
    }));

    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (job) {
      const payload = {
        bookingStatus: "in-progress" as const,
        siteArrivalTime: now.toLocaleTimeString()
      };

      if (isOffline) {
        setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
        queueOfflineAction(
          quoteId,
          "timer_start",
          payload,
          `On-site arrival timer registered at ${now.toLocaleTimeString()}`
        );
      } else {
        onUpdateQuote({
          ...job,
          ...payload
        });

        onTriggerLog({
          id: Math.random().toString(),
          type: "api",
          status: "info",
          message: `⏱️ Timer Engaged: Technician arrived on site for Job #${quoteId.slice(-6)} at ${now.toLocaleTimeString()}`,
          timestamp: now.toLocaleTimeString()
        });
      }
    }
  };

  // 📝 Signature pad Canvas handlings
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Save state and clear exact physical buffer area regardless of scaling modifier
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const submitSignatureAndComplete = (quoteId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Save signature as PNG dataURL
    const signatureDataUrl = canvas.toDataURL("image/png");
    const job = projectedQuotes.find((q) => q.id === quoteId);
    const timer = timers[quoteId];
    const now = new Date();

    if (job) {
      // Pause active timer
      if (timer) {
        setTimers((prev) => ({
          ...prev,
          [quoteId]: { ...timer, isRunning: false }
        }));
      }

      const payload = {
        bookingStatus: "completed" as const,
        clientSignature: signatureDataUrl,
        siteDepartureTime: now.toLocaleTimeString(),
        actualSiteMinutes: timer ? Math.round(timer.seconds / 60) : 120
      };

      if (isOffline) {
        setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
        queueOfflineAction(
          quoteId,
          "signature_complete",
          payload,
          `Client signature & verified ISO completion captured`
        );
      } else {
        onUpdateQuote({
          ...job,
          ...payload
        });

        onTriggerLog({
          id: Math.random().toString(),
          type: "api",
          status: "success",
          message: `✍️ Client Signed Off: Client signed off on Job #${quoteId.slice(-6)}. Actual on-site dur: ${timer ? Math.round(timer.seconds / 60) : 0} mins. Invoice locked.`,
          timestamp: now.toLocaleTimeString()
        });
      }
    }

    setSigningJobId(null);
  };

  const handlePhotoUpload = (quoteId: string, type: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (!base64) return;
      const job = projectedQuotes.find((q) => q.id === quoteId);
      if (job) {
        const currentPhotos = type === "before" ? (job.beforePhotos || []) : (job.afterPhotos || []);
        const updatedPhotos = [...currentPhotos, base64];
        const payload = {
          [type === "before" ? "beforePhotos" : "afterPhotos"]: updatedPhotos
        };

        if (isOffline) {
          setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
          queueOfflineAction(
            quoteId,
            "photo_upload",
            payload,
            `Photo upload cached under [${type.toUpperCase()}] stream`
          );
        } else {
          onUpdateQuote({
            ...job,
            ...payload
          });
          onTriggerLog({
            id: Math.random().toString(),
            type: "system",
            status: "success",
            message: `📸 Snapshot uploaded: [${type.toUpperCase()}] evidence photo attached to Job #${quoteId.slice(-6)}`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatePhotos = (quoteId: string) => {
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job) return;
    
    let beforePhotoUrl = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400";
    let afterPhotoUrl = "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=400";
    
    if (job.serviceName.includes("Carpet")) {
      beforePhotoUrl = "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=400";
      afterPhotoUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400";
    } else if (job.serviceName.includes("Commercial") || job.serviceName.includes("Office")) {
      beforePhotoUrl = "https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=400";
      afterPhotoUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400";
    }
    
    const payload = {
      beforePhotos: [...(job.beforePhotos || []), beforePhotoUrl],
      afterPhotos: [...(job.afterPhotos || []), afterPhotoUrl]
    };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
      queueOfflineAction(
        quoteId,
        "photo_upload",
        payload,
        `Simulated snapshot photobook parsed into offline cache`
      );
    } else {
      onUpdateQuote({
        ...job,
        ...payload
      });
      
      onTriggerLog({
        id: Math.random().toString(),
        type: "system",
        status: "success",
        message: `✨ Simulated Snapshot: Instantly loaded standard ${job.serviceName} before-and-after photobook!`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleDeletePhoto = (quoteId: string, type: "before" | "after", index: number) => {
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job) return;
    const currentPhotos = type === "before" ? (job.beforePhotos || []) : (job.afterPhotos || []);
    const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
    
    const payload = {
      [type === "before" ? "beforePhotos" : "afterPhotos"]: updatedPhotos
    };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
      queueOfflineAction(
        quoteId,
        "photo_upload",
        payload,
        `Removed photo from [${type.toUpperCase()}] stream`
      );
    } else {
      onUpdateQuote({
        ...job,
        ...payload
      });
      
      onTriggerLog({
        id: Math.random().toString(),
        type: "system",
        status: "warning",
        message: `🗑️ Evidence photo removed from [${type.toUpperCase()}] stack on Job #${quoteId.slice(-6)}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleSendEmail = (quoteId: string) => {
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job) return;

    const emailHistoryItem = {
      recipient: recipientEmail,
      templateType: emailTemplateType,
      timestamp: new Date().toLocaleTimeString()
    };

    const payload = {
      sentEmails: [...(job.sentEmails || []), emailHistoryItem]
    };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
      queueOfflineAction(
        quoteId,
        "email_share",
        payload,
        `Shared transaction receipt with recipient ${recipientEmail}`
      );
    } else {
      onUpdateQuote({
        ...job,
        ...payload
      });

      onTriggerLog({
        id: Math.random().toString(),
        type: "webhook",
        status: "success",
        message: `📧 Email Dispatched: Standard transaction template [${emailTemplateType.toUpperCase()}] transmitted successfully to ${recipientEmail}`,
        timestamp: new Date().toLocaleTimeString(),
        payload: {
          template: emailTemplateType,
          recipient: recipientEmail,
          subject: emailSubject,
          customerName: job.name,
          ratingsFeedback: ratingInput,
          comments: feedbackNotes,
          associatedJob: job.id,
          photosSent: {
            beforeCount: job.beforePhotos?.length || 0,
            afterCount: job.afterPhotos?.length || 0
          }
        }
      });
    }

    setShowEmailSuccessToast(true);
    setTimeout(() => setShowEmailSuccessToast(false), 4500);
  };

  const completedCount = cleanerJobs.filter((j) => j.bookingStatus === "completed").length;
  const activeCount = cleanerJobs.filter((j) => j.bookingStatus && j.bookingStatus !== "completed").length;
  
  // Calculate earnings reflecting actual site duration + hourly base pay
  const calculateEarningsForJob = (job: QuoteRequest) => {
    if (job.bookingStatus !== "completed") return 0;
    
    const baseHourRate = job.serviceName.includes("Builders") ? 85 : job.serviceName.includes("Carpet") ? 65 : 48;
    if (job.actualSiteMinutes && job.actualSiteMinutes > 1) {
      const hours = job.actualSiteMinutes / 60;
      return Math.round(hours * baseHourRate);
    }
    return job.estimatedTotal || 120;
  };

  const totalEarnings = cleanerJobs
    .filter((j) => j.bookingStatus === "completed")
    .reduce((sum, j) => sum + calculateEarningsForJob(j), 0);

  // Maps Keys definitions conforming to GCP maps skills
  const GOOGLE_MAPS_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    "";
  const hasValidMapKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== "YOUR_API_KEY";

  // Theme styling configurations for robust, bright daylight high-contrast conditions
  const themeSectionClasses = daylightHighContrast 
    ? "py-12 bg-white text-black border-t-8 border-black relative transition-all" 
    : "py-20 bg-slate-900 border-t border-slate-800 text-slate-100 relative transition-all";

  const themeLabelMuted = daylightHighContrast
    ? "text-black text-[11px] font-black tracking-wider uppercase block"
    : "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest";

  const themeSubTitle = daylightHighContrast
    ? "text-zinc-950 text-xs font-bold leading-normal block mt-1"
    : "text-xs text-slate-400 max-w-xl mt-0.5";

  const themeTitleText = daylightHighContrast
    ? "text-2xl font-black text-black tracking-tight mt-1 flex items-center gap-2"
    : "text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2";

  const themeHeaderBorder = daylightHighContrast
    ? "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black pb-6"
    : "flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6";

  const themeLeftPanelClasses = daylightHighContrast 
    ? "lg:col-span-4 bg-white text-black border-4 border-black p-6 font-mono space-y-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
    : "lg:col-span-4 bg-slate-950/80 rounded-3xl border border-slate-850 p-6 font-mono space-y-6";

  const themeLeftPanelAvatar = daylightHighContrast
    ? "w-14 h-14 bg-black text-white flex items-center justify-center font-black text-2xl border-4 border-black rounded-none"
    : "w-14 h-14 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg border border-indigo-400/20";

  const themeTodayStatsInner = daylightHighContrast
    ? "bg-white border-2 border-black p-3 space-y-1 block text-black"
    : "bg-slate-900 border border-slate-850 p-3 rounded-2xl space-y-1";

  const themeStatusIndicator = daylightHighContrast
    ? "p-3.5 bg-white border-2 border-black flex items-center justify-between text-xs font-black text-black"
    : "p-3.5 bg-slate-900 rounded-2xl border border-slate-850 flex items-center justify-between text-xs";

  const themeGuidelinesBox = daylightHighContrast
    ? "p-3.5 bg-white border-4 border-double border-black text-xs text-black space-y-2 leading-relaxed font-bold"
    : "p-3.5 bg-indigo-950/20 rounded-2xl border border-indigo-500/10 text-[11px] text-slate-400 space-y-2 leading-relaxed";

  const themeRightPanelItem = daylightHighContrast
    ? "bg-white text-black border-4 border-black p-6 sm:p-8 space-y-6 font-mono shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
    : "bg-slate-955 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 font-mono shadow-xl relative overflow-hidden";

  const themeRightPanelHeaderBorder = daylightHighContrast
    ? "pb-4 border-b-2 border-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    : "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-850";

  const themeRightPanelJobId = daylightHighContrast
    ? "text-[11px] text-white bg-black px-2 py-0.5 font-black uppercase tracking-wider"
    : "text-[10px] text-indigo-400 uppercase font-black tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-550/20";

  const themeRightPanelServiceWage = daylightHighContrast
    ? "text-md font-black text-black underline font-extrabold"
    : "text-md font-black text-emerald-400";

  const themeDetailsCard = daylightHighContrast
    ? "bg-white p-4 border-2 border-black grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-black leading-relaxed font-bold"
    : "bg-slate-900 p-4 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed shadow-inner";

  const themeDetailsCardLabel = daylightHighContrast
    ? "text-black font-black uppercase text-[10px]"
    : "text-slate-500 font-bold uppercase text-[9px]";

  const themeNotesBox = daylightHighContrast
    ? "text-xs text-black bg-white p-2.5 border border-black font-semibold"
    : "text-[11px] text-slate-400 italic bg-slate-950 p-2.5 rounded-lg border border-slate-850";

  const themeTimerCard = daylightHighContrast
    ? "bg-white p-4 border-2 border-black text-black"
    : "bg-slate-900/60 p-4 rounded-2xl border border-slate-850";

  const themeTimerInner = daylightHighContrast
    ? "bg-white p-2 border border-black text-black font-black text-xs"
    : "bg-slate-950 p-2 rounded-xl border border-slate-850 text-xs text-slate-300";

  const themeTimerWageTicker = daylightHighContrast
    ? "col-span-2 bg-yellow-100 py-2 border-2 border-black text-xs text-black flex items-center justify-between px-3 font-mono font-black"
    : "col-span-2 bg-indigo-950/20 py-2 rounded-xl border border-indigo-500/15 text-[11px] text-slate-300 flex items-center justify-between px-3 font-mono";

  const themeNavigationCard = daylightHighContrast
    ? "space-y-2 bg-white p-4 border-2 border-black"
    : "space-y-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-850";

  const themeNavigationHeading = daylightHighContrast
    ? "font-black text-black uppercase text-xs"
    : "font-extrabold text-white text-xs";

  const themeChecklistCard = daylightHighContrast
    ? "space-y-3 bg-white p-5 border-2 border-black text-black"
    : "space-y-3 bg-slate-900/40 p-5 rounded-2xl border border-slate-850";

  const themeChecklistLineWrap = daylightHighContrast
    ? "w-full bg-white h-3 border-2 border-black overflow-hidden"
    : "w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850";

  const themeChecklistTaskLabel = daylightHighContrast
    ? "text-xs leading-tight select-none font-sans text-black font-extrabold"
    : "text-[11px] leading-tight select-none font-sans text-slate-300";

  const themePhotosCard = daylightHighContrast
    ? "space-y-4 bg-white p-5 border-2 border-black text-black"
    : "space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-850";

  const themePhotoSubCard = daylightHighContrast
    ? "bg-white p-3 border border-black space-y-3 text-black"
    : "bg-slate-955 p-3 rounded-xl border border-slate-850 space-y-3";

  const themeReportsCard = daylightHighContrast
    ? "space-y-3 bg-white p-5 border-2 border-black text-black"
    : "space-y-3 bg-slate-900/40 p-5 rounded-2xl border border-slate-850";

  const themeReportsInner = daylightHighContrast
    ? "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white border border-black gap-3 text-black"
    : "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-950/80 border border-slate-850 rounded-xl gap-3";

  return (
    <section id="cleaners-app" className={themeSectionClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Title Block with cleaner choice dropdown */}
        <div className={themeHeaderBorder}>
          <div>
            <div className="flex items-center gap-2">
              <span className={themeLabelMuted}>
                Portals & Dispatch Hub
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className={themeTitleText}>
              <ClipboardList className={`w-6 h-6 ${daylightHighContrast ? "text-black" : "text-indigo-400"}`} /> Crew Cleaners' Portal App
            </h2>
            <p className={themeSubTitle}>
              Simulated mobile terminal dispatcher for local accredited technicians. Select active cleaner roster profile to retrieve scheduled assignments and log site logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto shrink-0 font-mono">
            {/* Daylight High Contrast Mode Toggle */}
            <button
              onClick={() => {
                const nextState = !daylightHighContrast;
                setDaylightHighContrast(nextState);
                onTriggerLog({
                  id: Math.random().toString(),
                  type: "system",
                  status: nextState ? "warning" : "info",
                  message: nextState 
                    ? `☀️ DAYLIGHT HIGH-CONTRAST MODE ACTIVE: Custom high-contrast layout for reading under bright sunlight.`
                    : `🌙 Standard high-contrast dark dashboard restored.`,
                  timestamp: new Date().toLocaleTimeString(),
                });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                daylightHighContrast
                  ? "bg-black text-white hover:bg-black/90 border-2 border-black"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:text-amber-400"
              }`}
              id="cleaner-high-contrast-toggle"
              aria-label="Toggle Bright Daylight Contrast Mode"
            >
              <span>{daylightHighContrast ? "☀️ Day Mode: HIGH CONTRAST" : "☀️ Daylight High Contrast Toggle"}</span>
            </button>

            <span className={`text-xs font-bold whitespace-nowrap ${daylightHighContrast ? 'text-black' : 'text-slate-400'}`}>Crew:</span>
            <select
              value={activeCleanerName}
              onChange={(e) => {
                setActiveCleanerName(e.target.value);
                onTriggerLog({
                  id: Math.random().toString(),
                  type: "system",
                  status: "info",
                  message: `🔐 Selected active Cleaners' Portal interface of crew member: "${e.target.value}"`,
                  timestamp: new Date().toLocaleTimeString(),
                });
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold cursor-pointer w-full md:w-48 outline-none ${
                daylightHighContrast
                  ? "bg-white text-black border-2 border-black font-black"
                  : "bg-slate-955 border border-slate-800 text-indigo-300 focus:text-white focus:border-indigo-500"
              }`}
            >
              {cleaners.map((c) => (
                <option key={c.id} value={c.name}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Service Worker Status & Offline Cache Control Banner */}
        <div className={`p-4 border font-mono text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
          daylightHighContrast 
            ? "bg-white border-4 border-black text-black" 
            : isOffline
              ? "bg-amber-950/20 border-amber-500/20 text-amber-300 rounded-2xl"
              : "bg-slate-900/60 border-slate-850 text-slate-300 rounded-2xl"
        }`}>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              isOffline 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse" 
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              {isOffline ? <WifiOff className="w-5 h-5 animate-pulse" /> : <Wifi className="w-5 h-5" />}
            </div>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`font-black uppercase tracking-wider ${
                  isOffline ? "text-amber-500" : "text-emerald-400"
                }`}>
                  {isOffline ? "● OFFLINE WORKER MODE ACTIVE" : "● WEBSOCKETS RETAINED ONLINE"}
                </span>
                <span className={`px-1.5 py-0.5 text-[9px] rounded-lg font-bold border uppercase ${
                  daylightHighContrast
                    ? "bg-black text-white border-black font-black"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-505/20"
                }`}>
                  SW Status: {swStatus}
                </span>
              </div>
              <p className={`text-[11.5px] leading-relaxed ${daylightHighContrast ? "text-slate-800" : "text-slate-400"}`}>
                {isOffline 
                  ? "Changes held in offline transaction buffer. Service Worker intercepting progress checklists & client sign-off drawings."
                  : "Database routes operational. Progress updates automatically synchronize with remote crew schedules."
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            {/* Toggle Connectivity Status */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isOffline;
                setIsOffline(nextState);
                localStorage.setItem("aastaclean_offline_simulated", String(nextState));
                
                onTriggerLog({
                  id: Math.random().toString(),
                  type: "system",
                  status: nextState ? "warning" : "success",
                  message: nextState 
                    ? `⚡ OFFLINE MODE TRIGGERED: Router disconnected. Checklist modifications & signature verifications are cached strictly in local stores.`
                    : `🛰️ SIGNAL RECOVERED: Restoring connected dispatch. Initiating transaction synchronization...`,
                  timestamp: new Date().toLocaleTimeString(),
                });

                if (!nextState) {
                  triggerSyncQueueDispatch();
                }
              }}
              className={`px-3 py-2 rounded-xl font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1.5 border transition-all ${
                isOffline 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-505 shadow-md"
                  : "bg-amber-600/15 hover:bg-amber-600/25 text-amber-500 hover:text-amber-400 border-amber-500/30"
              }`}
            >
              {isOffline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" /> Reconnect & Sync
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> Force Offline Simulation
                </>
              )}
            </button>

            {/* Offline Sync Queue Tracker Indicator */}
            <div className={`p-2 px-3 border rounded-xl flex items-center gap-2 ${
              offlineSyncQueue.length > 0 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-505 font-extrabold animate-pulse" 
                : daylightHighContrast 
                  ? "bg-zinc-100 border-black text-black" 
                  : "bg-slate-950 border-slate-850 text-slate-500"
            }`}>
              <RefreshCw className={`w-3.5 h-3.5 ${offlineSyncQueue.length > 0 ? "animate-spin" : ""}`} />
              <span className="text-[10px]">QUEUE: {offlineSyncQueue.length} PENDING</span>
            </div>

            {/* Manual Sync Trigger button */}
            {offlineSyncQueue.length > 0 && (
              <button
                type="button"
                onClick={() => triggerSyncQueueDispatch()}
                className={`p-2 px-3.5 font-bold uppercase text-[10px] rounded-xl cursor-pointer border shadow transition-all ${
                  daylightHighContrast
                    ? "bg-black text-white hover:bg-zinc-900 border-black"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500"
                }`}
              >
                Sync Now
              </button>
            )}
          </div>
        </div>

        {activeCleaner ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT Panel: Cleaner profile summary & daily stats card (4 Columns) */}
            <div className={themeLeftPanelClasses}>
              
              <div className="flex items-center gap-4">
                <div className={themeLeftPanelAvatar}>
                  {activeCleaner.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className={`font-extrabold text-sm ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>{activeCleaner.name}</h3>
                  <p className={`text-[10px] mt-0.5 ${daylightHighContrast ? "text-zinc-850 font-bold" : "text-slate-500"}`}>AAL Certified Staff Id: {activeCleaner.id.slice(-6)}</p>
                  <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-bold ${daylightHighContrast ? "text-black" : "text-amber-400"}`}>
                    <Award className="w-3.5 h-3.5" />
                    <span>⭐️ {activeCleaner.rating.toFixed(1)} Crew Rating</span>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={themeStatusIndicator}>
                <span className={daylightHighContrast ? "text-black font-bold" : "text-slate-400"}>Payroll Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${daylightHighContrast ? "bg-black text-white border-black font-black" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                  {activeCleaner.status}
                </span>
              </div>

              {/* Today stats summary */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className={themeTodayStatsInner}>
                  <span className={`text-[9px] font-bold uppercase block ${daylightHighContrast ? "text-black" : "text-slate-500"}`}>Accrued Pay</span>
                  <span className={`text-xs font-extrabold block ${daylightHighContrast ? "text-black underline font-black" : "text-emerald-400"}`}>${totalEarnings}</span>
                </div>
                <div className={themeTodayStatsInner}>
                  <span className={`text-[9px] font-bold uppercase block ${daylightHighContrast ? "text-black" : "text-slate-500"}`}>Done</span>
                  <span className={`text-xs font-extrabold block ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>{completedCount}</span>
                </div>
                <div className={themeTodayStatsInner}>
                  <span className={`text-[9px] font-bold uppercase block ${daylightHighContrast ? "text-black" : "text-slate-500"}`}>Pnd/Act</span>
                  <span className={`text-xs font-extrabold block ${daylightHighContrast ? "text-black font-black" : "text-indigo-400"}`}>{activeCount}</span>
                </div>
              </div>

              <div className={themeGuidelinesBox}>
                <p className={`flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider ${daylightHighContrast ? "text-black" : "text-indigo-400"}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Accredited Crew Guidelines
                </p>
                <p className="text-xs">Ensure client digital sign-offs are captured inside the signature drawpad panel before leaving premises to log and confirm on-site payroll records successfully.</p>
              </div>
            </div>

            {/* RIGHT Panel: Active assigned job details and checklists (8 Columns) */}
            <div className="lg:col-span-8 space-y-6">
              
              {cleanerJobs.length === 0 ? (
                <div className="bg-slate-950/60 py-20 border border-dashed border-slate-805 rounded-3xl text-center flex flex-col items-center justify-center gap-4">
                  <Briefcase className="w-10 h-10 text-slate-700" />
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm font-mono">No Scheduled Assignments</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">You have no tasks assigned currently. Switch to the Admin Coordinator Panel above to assign jobs to yourself.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {cleanerJobs.map((job) => {
                    const subtasks = getSubtasksForService(job.serviceName);
                    const completedTasks = completedSubtasks[job.id] || [];
                    const percentComplete = Math.round((completedTasks.length / subtasks.length) * 100) || 0;
                    
                    const pcodeDetails = SUBURB_MAP[job.postcode] || { lat: -31.9505, lng: 115.8605, label: "Perth" };
                    const timer = timers[job.id];
                    const activeHourlyRate = job.serviceName.includes("Builders") ? 85 : job.serviceName.includes("Carpet") ? 65 : 48;
                    const accumulatedPayResult = timer ? ((timer.seconds / 3600) * activeHourlyRate).toFixed(2) : "0.00";

                    return (
                      <div key={job.id} className={themeRightPanelItem}>
                        
                        {/* Dynamic backdrop glow for completed jobs */}
                        {job.bookingStatus === "completed" && !daylightHighContrast && (
                          <div className="absolute inset-0 bg-emerald-500/[0.015] pointer-events-none" />
                        )}

                        {/* Top banner / stats header */}
                        <div className={themeRightPanelHeaderBorder}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={themeRightPanelJobId}>
                                Job ID: #{job.id.slice(-6)}
                              </span>
                              <span className={`text-xs ${daylightHighContrast ? "text-black font-bold" : "text-slate-500"}`}>•</span>
                              <span className={`text-[10px] font-semibold ${daylightHighContrast ? "text-zinc-900 font-bold" : "text-slate-400"}`}>{job.timestamp}</span>
                            </div>
                            <h3 className={`font-extrabold text-lg mt-1 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>{job.serviceName}</h3>
                          </div>

                          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                            <span className={`text-xs ${daylightHighContrast ? "text-black font-black" : "text-slate-500"}`}>Service Wage:</span>
                            <span className={themeRightPanelServiceWage}>
                              {job.bookingStatus === "completed" 
                                ? `$${calculateEarningsForJob(job)} AUD` 
                                : `$${job.estimatedTotal || 120} AUD`}
                            </span>
                          </div>
                        </div>

                        {/* Customer details info card */}
                        <div className={themeDetailsCard}>
                          <div className="space-y-1">
                            <p className={themeDetailsCardLabel}>Client Details</p>
                            <p className={`font-semibold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black text-sm" : "text-white"}`}><User className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-slate-500"}`} /> {job.name}</p>
                            <p className={daylightHighContrast ? "text-black" : "text-slate-400"}>Email: {job.email}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className={themeDetailsCardLabel}>Dispatch Location & Direct Contact</p>
                            <p className={`font-semibold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black text-sm" : "text-indigo-300"}`}>
                              <MapPin className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-indigo-410"}`} /> {pcodeDetails.label} ({job.postcode})
                            </p>
                            <p className={`flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-bold" : "text-slate-400"}`}><Phone className={`w-3.5 h-3.5 ${daylightHighContrast ? "text-black" : "text-slate-500"}`} /> Call Client: {job.phone}</p>
                          </div>

                          {job.notes && (
                            <div className={`sm:col-span-2 pt-2 border-t ${daylightHighContrast ? "border-black" : "border-slate-850"}`}>
                              <p className={themeDetailsCardLabel}>Administrative Notes</p>
                              <p className={themeNotesBox}>
                                "{job.notes}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Live Timer Clock & Payroll Progress Tracking Dashboard */}
                        <div className={themeTimerCard}>
                          <div className={`flex justify-between items-center pb-2.5 border-b ${daylightHighContrast ? "border-black/55" : "border-slate-850/60"}`}>
                            <div className="flex items-center gap-2">
                              <Clock className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-indigo-400 animate-pulse"}`} />
                              <span className={`text-xs font-bold uppercase tracking-wider text-[10px] ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>On-Site Safe arrival Timer</span>
                            </div>
                            {timer?.isRunning && (
                              <span className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${daylightHighContrast ? "bg-black text-white font-black" : "bg-emerald-500/10 text-emerald-400 animate-pulse"}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE RECORDING
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-3 text-center">
                            <div className={themeTimerInner}>
                              <span className={`text-[9px] block uppercase font-bold ${daylightHighContrast ? "text-black" : "text-slate-500"}`}>Site Check-In Time</span>
                              <span className="text-xs font-mono mt-0.5 block font-bold">
                                {job.siteArrivalTime || timer?.startTime || "--:--:--"}
                              </span>
                            </div>

                            <div className={themeTimerInner}>
                              <span className={`text-[9px] block uppercase font-bold ${daylightHighContrast ? "text-black" : "text-slate-500"}`}>Job Duration Tracked</span>
                              <span className="text-xs font-mono mt-0.5 block font-bold">
                                {timer ? formatDuration(timer.seconds) : job.actualSiteMinutes ? `${job.actualSiteMinutes} mins` : "00:00"}
                              </span>
                            </div>

                            {/* Award Wage live ticker estimation */}
                            {timer?.isRunning && (
                              <div className={themeTimerWageTicker}>
                                <span className={`flex items-center gap-1 font-bold ${daylightHighContrast ? "text-black font-black" : "text-indigo-400"}`}>
                                  <DollarSign className="w-3.5 h-3.5" /> Accrued Wage ({pcodeDetails.label} Wage Pool):
                                </span>
                                <span className={`font-black font-mono ${daylightHighContrast ? "text-black underline" : "text-emerald-400"}`}>
                                  ${accumulatedPayResult} AUD (@${activeHourlyRate}/hr)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Google Map Preview Pane */}
                        <div className={themeNavigationCard}>
                          <div className="flex justify-between items-center text-xs pb-1">
                            <span className={`font-extrabold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>
                              <Navigation className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-sky-400"}`} /> Google Maps Navigation Assistant
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase font-mono ${daylightHighContrast ? "bg-black text-white border-black" : "bg-slate-950 text-slate-500 border-slate-850"}`}>
                              Geo-Postcode: {job.postcode}
                            </span>
                          </div>

                          <div className={`w-full h-44 rounded-2xl overflow-hidden relative flex flex-col items-center justify-center ${daylightHighContrast ? "border-2 border-black bg-white" : "border border-slate-800 bg-slate-950"}`}>
                            {hasValidMapKey ? (
                              <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
                                <Map
                                  defaultCenter={{ lat: pcodeDetails.lat, lng: pcodeDetails.lng }}
                                  defaultZoom={13}
                                  mapId="AASTACLEAN_CREW_MAP"
                                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                                  style={{ width: '100%', height: '100%' }}
                                  disableDefaultUI={true}
                                >
                                  <AdvancedMarker position={{ lat: pcodeDetails.lat, lng: pcodeDetails.lng }}>
                                    <Pin background="#4f46e5" glyphColor="#fff" scale={1} />
                                  </AdvancedMarker>
                                </Map>
                              </APIProvider>
                            ) : (
                              // Beautiful simulated vector map mesh complying with custom mapping falls back gracefully and explains keys.
                              <div className={`absolute inset-0 p-4 flex flex-col justify-between overflow-hidden ${daylightHighContrast ? "bg-white text-black" : "bg-slate-955 text-slate-300"}`}>
                                {/* Simulated Vector Coordinates Mesh Background */}
                                <div className={`absolute inset-0 opacity-15 pointer-events-none ${daylightHighContrast ? "bg-[radial-gradient(#000000_1px,transparent_1px)]" : "bg-[radial-gradient(#312e81_1px,transparent_1px)]"} [background-size:16px_16px]`} />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className={`w-24 h-24 rounded-full border absolute ${daylightHighContrast ? "border-black/20" : "border-indigo-500/20"}`} />
                                  <div className={`w-36 h-36 rounded-full border absolute ${daylightHighContrast ? "border-black/10" : "border-indigo-500/10"}`} />
                                </div>

                                <div className={`z-10 p-2 border flex justify-between items-start text-[10px] leading-normal font-mono ${daylightHighContrast ? "bg-white border-black text-black font-bold" : "bg-slate-900/90 border-slate-800 text-slate-400"}`}>
                                  <p className="max-w-xs font-mono">
                                    🗺️ Suburb coordinates mapping: <span className={daylightHighContrast ? "text-black underline font-black" : "text-white font-bold"}>{pcodeDetails.label}</span> Area center point loaded at <span>{pcodeDetails.lat.toFixed(4)}, {pcodeDetails.lng.toFixed(4)}</span>.
                                  </p>
                                </div>

                                <div className={`z-10 p-2 px-3 border flex items-center justify-between text-[11px] mt-auto ${daylightHighContrast ? "bg-white border-black text-black" : "bg-slate-950 border-slate-800"}`}>
                                  <span className={`font-semibold font-sans flex items-center gap-1 ${daylightHighContrast ? "text-black font-black" : "text-amber-400"}`}>
                                    <AlertCircle className="w-3.5 h-3.5 text-black" /> Google Maps API Key Not Loaded
                                  </span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        alert("To configure Google Maps API key:\n1. Get a key at console.cloud.google.com\n2. Open Settings (⚙️ top right) -> Secrets\n3. Add 'GOOGLE_MAPS_PLATFORM_KEY' and paste key.");
                                      }}
                                      className={`text-[9px] font-bold p-1 px-2.5 rounded cursor-pointer ${daylightHighContrast ? "bg-black text-white hover:bg-black/90" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                                    >
                                      Help Setup API Key
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                         {/* Checklist Tracker Panel */}
                        <div className={themeChecklistCard}>
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-extrabold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>
                              <ClipboardList className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-purple-400"}`} /> Service Tasks Checklist ({percentComplete}%)
                            </span>
                            <span className={`font-mono text-[10px] ${daylightHighContrast ? "text-black font-semibold" : "text-slate-500"}`}>
                              {completedTasks.length} of {subtasks.length} finished
                            </span>
                          </div>

                          {/* Progress Line */}
                          <div className={themeChecklistLineWrap}>
                            <div 
                              className={`h-full transition-all duration-300 ${
                                percentComplete === 100 
                                  ? (daylightHighContrast ? "bg-black" : "bg-emerald-500") 
                                  : (daylightHighContrast ? "bg-zinc-800" : "bg-purple-600")
                              }`} 
                              style={{ width: `${percentComplete}%` }} 
                            />
                          </div>

                          {/* Dynamic checklist elements */}
                          <div className={`pt-2 divide-y ${daylightHighContrast ? "divide-black" : "divide-slate-850"}`}>
                            {subtasks.map((task, idx) => {
                              const isChecked = completedTasks.includes(task);
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => handleToggleSubtask(job.id, task)}
                                  className={`flex items-start gap-3 py-2.5 cursor-pointer transition-all px-1`}
                                >
                                  <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                    isChecked 
                                      ? (daylightHighContrast ? "bg-black border-black text-white" : "bg-emerald-500 border-emerald-500 text-white") 
                                      : (daylightHighContrast ? "border-black hover:bg-black/10" : "border-slate-700 hover:border-purple-500")
                                  }`}>
                                    {isChecked && <CheckCircle2 className={`w-3.5 h-3.5 text-white ${daylightHighContrast ? "fill-black" : "fill-emerald-500"} stroke-[5]`} />}
                                  </div>
                                  <span className={`text-[11px] leading-tight select-none font-sans font-bold ${
                                    isChecked 
                                      ? "line-through text-slate-500" 
                                      : (daylightHighContrast ? "text-black font-black" : "text-slate-300")
                                  }`}>
                                    {task}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Work Photos & Evidence (ISO 9001 Compliant) */}
                        <div className={themePhotosCard}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                            <span className={`font-extrabold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>
                              <Camera className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-pink-400"}`} /> Work Photos & Case Evidence (ISO 9001)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSimulatePhotos(job.id)}
                                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                                  daylightHighContrast 
                                    ? "bg-black hover:bg-zinc-900 text-white border border-black" 
                                    : "bg-indigo-500/20 hover:bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                                }`}
                              >
                                <span>✨ Simulate Site Snapshots</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Before Stack */}
                            <div className={themePhotoSubCard}>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${daylightHighContrast ? "text-slate-800 font-black" : "text-slate-400"}`}>Before Cleaning Evidence</span>
                                <label className={`cursor-pointer text-[10px] font-bold p-1.5 px-3 rounded border flex items-center gap-1.5 transition-all ${
                                  daylightHighContrast 
                                    ? "bg-black hover:bg-zinc-900 text-white border-black" 
                                    : "bg-slate-900 hover:bg-slate-840 text-slate-300 hover:text-white border-slate-800"
                                }`}>
                                  <Upload className="w-3 h-3" /> Upload
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handlePhotoUpload(job.id, "before", e)} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-3 gap-2 min-h-[64px] items-center">
                                {!job.beforePhotos || job.beforePhotos.length === 0 ? (
                                  <div className={`col-span-3 text-center py-4 border border-dashed rounded-lg text-[10px] ${
                                    daylightHighContrast ? "border-black/55 text-slate-700 font-mono font-bold" : "border-slate-850 text-slate-600"
                                  }`}>
                                    No Pre-op photos added
                                  </div>
                                ) : (
                                  job.beforePhotos.map((img, idx) => (
                                    <div key={idx} className={`relative group rounded-lg overflow-hidden h-16 border ${
                                      daylightHighContrast ? "border-black bg-zinc-100" : "border-slate-850 bg-slate-900"
                                    }`}>
                                      <img src={img} alt="before" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePhoto(job.id, "before", idx)}
                                        className="absolute inset-0 bg-red-610/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* After Stack */}
                            <div className={themePhotoSubCard}>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${daylightHighContrast ? "text-slate-800 font-black" : "text-slate-400"}`}>After Cleaning Evidence</span>
                                <label className={`cursor-pointer text-[10px] font-bold p-1.5 px-3 rounded border flex items-center gap-1.5 transition-all ${
                                  daylightHighContrast 
                                    ? "bg-black hover:bg-zinc-900 text-white border-black" 
                                    : "bg-slate-900 hover:bg-slate-840 text-slate-300 hover:text-white border-slate-800"
                                }`}>
                                  <Upload className="w-3 h-3" /> Upload
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handlePhotoUpload(job.id, "after", e)} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-3 gap-2 min-h-[64px] items-center">
                                {!job.afterPhotos || job.afterPhotos.length === 0 ? (
                                  <div className={`col-span-3 text-center py-4 border border-dashed rounded-lg text-[10px] ${
                                    daylightHighContrast ? "border-black/55 text-slate-700 font-mono font-bold" : "border-slate-850 text-slate-600"
                                  }`}>
                                    No Post-op photos added
                                  </div>
                                ) : (
                                  job.afterPhotos.map((img, idx) => (
                                    <div key={idx} className={`relative group rounded-lg overflow-hidden h-16 border ${
                                      daylightHighContrast ? "border-black bg-zinc-100" : "border-slate-850 bg-slate-900"
                                    }`}>
                                      <img src={img} alt="after" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePhoto(job.id, "after", idx)}
                                        className="absolute inset-0 bg-red-610/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer Share & Email Console Activator */}
                        <div className={`space-y-3 p-5 border transition-all ${daylightHighContrast ? "bg-white border-2 border-black text-black" : "bg-slate-900/40 border-slate-850 rounded-2xl"}`}>
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-extrabold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>
                              <Mail className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-emerald-400"}`} /> Customer Reports & Email Templates
                            </span>
                            {job.sentEmails && job.sentEmails.length > 0 && (
                              <span className={`text-[9px] font-bold p-0.5 px-2 rounded-full uppercase ${daylightHighContrast ? "bg-black text-white" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>
                                {job.sentEmails.length} report shared
                              </span>
                            )}
                          </div>

                          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border transition-all ${daylightHighContrast ? "bg-white border-black text-black" : "bg-slate-950/80 border-slate-850 rounded-xl"} gap-3`}>
                            <div className="space-y-0.5">
                              <p className={`text-[11px] font-sans font-bold ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>Professional customer handover receipts</p>
                              <p className={`text-[9.5px] font-mono leading-relaxed ${daylightHighContrast ? "text-slate-800" : "text-slate-500"}`}>
                                {job.sentEmails && job.sentEmails.length > 0 
                                  ? `Last shared with ${job.sentEmails[job.sentEmails.length - 1].recipient} at ${job.sentEmails[job.sentEmails.length - 1].timestamp}`
                                  : "Draft ready: share detailed interactive HTML receipt including invoices, photos and signatures."
                                }
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSharingJobId(job.id);
                                setRecipientEmail(job.email);
                                setEmailSubject(`✨ Cleaners Handover Report & Invoice: Job #${job.id.slice(-6)}`);
                              }}
                              className={`text-[11px] font-bold p-2.5 px-3.5 rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 focus:outline-none transition-all ${
                                daylightHighContrast 
                                  ? "bg-black hover:bg-zinc-900 text-white border-black" 
                                  : "bg-indigo-600 hover:bg-indigo-505 text-white border-indigo-500"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 mt-0.5" /> View / Share Templates
                            </button>
                          </div>
                        </div>

                        {/* Lock Signature Sign-off Frame display if finalized */}
                        {job.bookingStatus === "completed" && job.clientSignature && (
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 flex items-center justify-between gap-4 font-mono text-[11px]">
                            <div className="space-y-1">
                              <p className="text-slate-500 font-bold uppercase text-[9px]">Client Electronic Authorization</p>
                              <p className="text-white flex items-center gap-1">
                                <PenTool className="w-3.5 h-3.5 text-indigo-400" /> Legal Sign-off Verified
                              </p>
                              <p className="text-slate-500 text-[10px]">Site departure recorded at {job.siteDepartureTime || "17:30"}</p>
                            </div>
                            <div className="bg-white p-1 rounded border border-slate-800">
                              <img src={job.clientSignature} alt="Client Signature" className="h-10 w-28 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        )}

                        {/* Status Dispatcher swipe control toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                          <div className="font-sans text-[10px] text-slate-500 leading-normal flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-indigo-400" />
                            <span>Telemetry logs broadcast client notifications on swipe updates.</span>
                          </div>

                          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                            {job.bookingStatus === "pending" || job.bookingStatus === "assigned" ? (
                              <button
                                onClick={() => handleUpdateStatus(job.id, "en-route")}
                                className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                              >
                                <span>🚗 Swipe En Route</span>
                              </button>
                            ) : job.bookingStatus === "en-route" ? (
                              <button
                                onClick={() => handleStartTimer(job.id)}
                                className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                              >
                                <span>⏱️ Start Timer & Arrive</span>
                              </button>
                            ) : job.bookingStatus === "in-progress" ? (
                              <button
                                onClick={() => {
                                  setSigningJobId(job.id);
                                  onTriggerLog({
                                    id: Math.random().toString(),
                                    type: "system",
                                    status: "info",
                                    message: `✍️ Launched Client Handheld Drawpad for Job ID #${job.id.slice(-6)}`,
                                    timestamp: new Date().toLocaleTimeString()
                                  });
                                }}
                                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-full sm:w-auto shrink-0 cursor-pointer animate-pulse"
                              >
                                <span>✍️ Client Sign-off</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Job Completed & Payroll Locked</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 font-mono">
            Roster system inactive or no cleaners currently deployed. Add cleaners in the Coordinator board first.
          </div>
        )}

      </div>

      {/* Signature drawing modal overlay */}
      {signingJobId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 font-mono text-slate-100 shadow-2xl relative">
            <div className="text-center">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest block w-fit mx-auto">
                Electronic Client Signature Capture
              </span>
              <h3 className="text-lg font-black text-white tracking-widest uppercase mt-4">
                Verify Job Completion
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Please instruct the client to draw their signature on the pad below to verify completion under ISO 9001 guidelines.
              </p>
            </div>

            {/* Drawing Pad Frame */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5" /> Client Sign-off Pad (Mouse/Touch active):
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold underline outline-none"
                >
                  Clear Pad
                </button>
              </div>

              <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-800 bg-white relative">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={176}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair block"
                />
              </div>
            </div>

            {/* Buttons list */}
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSigningJobId(null)}
                className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold py-3 rounded-xl border border-slate-805 transition-all text-center cursor-pointer"
              >
                Cancel Verify
              </button>
              <button
                type="button"
                onClick={() => submitSignatureAndComplete(signingJobId)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl border border-indigo-500 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Report Summary & Email Customization Drawer Overlay */}
      {sharingJobId && (() => {
        const job = projectedQuotes.find((q) => q.id === sharingJobId);
        if (!job) return null;

        const cleaner = cleaners.find((c) => c.name === job.assignedCleaner) || cleaners[0];
        const costVal = calculateEarningsForJob(job) || job.estimatedTotal || 120;
        const pcodeDetails = SUBURB_MAP[job.postcode] || { lat: -31.9505, lng: 115.8605, label: "Perth" };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-905 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 font-mono text-slate-100 shadow-2xl relative">
              
              {/* Top Close icon */}
              <button 
                type="button" 
                onClick={() => setSharingJobId(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-950 p-2 rounded-full border border-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-wider uppercase">AASTACLEAN SPARK REPORT CONSOLE</h3>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Author, refine and dispatch responsive transactional HTML briefings with clients. Simulated remote sync triggers telemetry events.
                  </p>
                </div>
              </div>

              {/* Grid content split: LEFT controls, RIGHT Live Previews */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left block (Controls Panel) - 5 Cols */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-850/80 space-y-4">
                    <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest border-b border-slate-850/30 pb-2">Report parameters</p>
                    
                    {/* Recipient Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Recipient Address</label>
                      <input
                        type="email"
                        value={recipientEmail || ""}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-200 outline-none focus:border-indigo-500"
                        placeholder="customer@domain.com"
                      />
                    </div>

                    {/* Template Switcher Buttons */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Core CRM Outbox Template</label>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEmailTemplateType("handover");
                            setEmailSubject(`✨ Handover Completed: Job #${job.id.slice(-6)} Invoice & Evidence`);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer outline-none focus:outline-none ${
                            emailTemplateType === "handover"
                              ? "bg-indigo-600/10 border-indigo-500 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${emailTemplateType === "handover" ? "text-indigo-400" : "text-slate-600"}`} />
                          <div>
                            <p className="font-bold text-[11px]">Before/After Handover Receipt</p>
                            <p className="text-[9px] text-slate-500 font-sans mt-0.5">Dual-column evidence, live signature, costs table & rating builder.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailTemplateType("eta");
                            setEmailSubject(`🚗 On-Route Alert: Technicians dispatched | Job #${job.id.slice(-6)}`);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer outline-none focus:outline-none ${
                            emailTemplateType === "eta"
                              ? "bg-indigo-600/10 border-indigo-505 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <Truck className={`w-4 h-4 mt-0.5 shrink-0 ${emailTemplateType === "eta" ? "text-indigo-400" : "text-slate-600"}`} />
                          <div>
                            <p className="font-bold text-[11px]">On-Route dispatch & ETA tracker</p>
                            <p className="text-[9px] text-slate-500 font-sans mt-0.5">Technician bio, pre-op arrival checklist notes, navigation status.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailTemplateType("hygiene");
                            setEmailSubject(`🛡️ ISO Sterile Compliance Certificate: Job #${job.id.slice(-6)}`);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer outline-none focus:outline-none ${
                            emailTemplateType === "hygiene"
                              ? "bg-purple-600/10 border-purple-500 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${emailTemplateType === "hygiene" ? "text-purple-400" : "text-slate-600"}`} />
                          <div>
                            <p className="font-bold text-[11px]">NDIS Sanitisation Compliance</p>
                            <p className="text-[9px] text-slate-500 font-sans mt-0.5">Bio-hazard neutralizers log, hypoallergenic audit report details.</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Handover Specific Customer feedback parameters */}
                    {emailTemplateType === "handover" && (
                      <div className="space-y-3 bg-slate-900 p-3 rounded-xl border border-slate-850">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Customer Handover Survey (Mock Builder)</p>
                        
                        {/* Rating stars */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Client Star Rating Override</label>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRatingInput(s)}
                                className="focus:outline-none cursor-pointer"
                              >
                                <Award className={`w-4.5 h-4.5 ${s <= ratingInput ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Customer review text */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Direct Customer feedback</label>
                          <textarea
                            value={feedbackNotes}
                            onChange={(e) => setFeedbackNotes(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] outline-none text-slate-300 font-sans"
                            placeholder="Add customer reviews log..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary send and alert alerts status */}
                  <div className="space-y-2">
                    {showEmailSuccessToast && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 animate-pulse font-sans">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[9px] font-mono">Ingest Broadcast Complete</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Customer inbox payload transmitted! Sync logs added to developer suite.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSharingJobId(null)}
                        className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold py-3.5 rounded-xl cursor-pointer"
                      >
                        Close Engine
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSendEmail(job.id)}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Send className="w-4 h-4" /> Share via SMTP Relay
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right block (Mock Email App View) - 7 Cols */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-sans">
                    <span>📱 Client Mail App Preview (Interactive)</span>
                    <span className="text-[10px] font-mono text-purple-400">100% Responsive HTML</span>
                  </div>

                  {/* Mock Device Container */}
                  <div className="w-full max-h-[500px] overflow-y-auto bg-white rounded-2xl border border-slate-300 p-4 sm:p-6 text-slate-850 relative shadow-inner select-text">
                    
                    {/* Safari/Mail header mock */}
                    <div className="border-b border-gray-200 pb-3 mb-4 text-xs font-sans text-slate-550 space-y-1 select-none">
                      <div className="flex"><span className="w-16 text-slate-400">From:</span> <span className="text-slate-800 font-semibold">AASTACLEAN Dispatch Hub &lt;dispatch@aastaclean.com.au&gt;</span></div>
                      <div className="flex"><span className="w-16 text-slate-400">To:</span> <span className="text-slate-800 font-semibold">{recipientEmail || job.email}</span></div>
                      <div className="flex"><span className="w-16 text-slate-400">Date:</span> <span className="text-slate-800">{new Date().toLocaleString()}</span></div>
                      <div className="flex"><span className="w-16 text-slate-400">Subject:</span> <span className="text-indigo-600 font-bold">{emailSubject}</span></div>
                    </div>

                    {/* Actual Template Contents Styled Perfectly */}
                    {emailTemplateType === "handover" && (
                      <div className="font-sans text-slate-700 leading-relaxed text-xs space-y-4">
                        <div className="text-center pb-4 border-b border-gray-100">
                          <h1 className="text-lg font-black tracking-tight text-indigo-700 m-0">AASTACLEAN SPARK REPORT</h1>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Accredited Site Handover Sheet</p>
                        </div>

                        <p>Hi <strong>{job.name}</strong>,</p>
                        <p>
                          We are thrilled to inform you that your accredited crew member, <strong>{job.assignedCleaner || "Liam Vance"}</strong>, has successfully concluded operations on your property. All components have been triple-checked matching Australian standard criteria.
                        </p>

                        {/* Side-by-Side Photos */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Handover Visual Evidence (Case Checklist)</p>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[9px] text-red-500 font-bold bg-red-100 p-0.5 px-1.5 rounded uppercase font-mono">BEFORE EVIDENCE</span>
                              <div className="rounded border border-gray-200 h-28 overflow-hidden bg-slate-100 text-[10px] text-slate-405 flex items-center justify-center">
                                {job.beforePhotos && job.beforePhotos[0] ? (
                                  <img src={job.beforePhotos[0]} alt="Before" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="font-mono text-[9px] text-center p-2 text-slate-400">Simulate/Upload Before photo inside job card to display</span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-100 p-0.5 px-1.5 rounded uppercase font-mono">AFTER COMPLETED</span>
                              <div className="rounded border border-gray-200 h-28 overflow-hidden bg-slate-100 text-[10px] text-slate-405 flex items-center justify-center">
                                {job.afterPhotos && job.afterPhotos[0] ? (
                                  <img src={job.afterPhotos[0]} alt="After" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="font-mono text-[9px] text-center p-2 text-slate-400">Simulate/Upload After photo inside job card to display</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cost Breakdown Sheet */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Invoice & Cost Breakdown Summary</p>
                          <table className="w-full text-[11px] border-collapse bg-slate-50/50 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-105 text-slate-500 text-left">
                                <th className="p-2">Itemised Service Allocation</th>
                                <th className="p-2 text-right">Price (AUD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              <tr>
                                <td className="p-2 font-sans">{job.serviceName} Base Booking</td>
                                <td className="p-2 text-right">${job.estimatedTotal || 120}.00</td>
                              </tr>
                              {job.selectedAddons && job.selectedAddons.map((addon, aIdx) => (
                                <tr key={aIdx}>
                                  <td className="p-2 text-slate-500 font-sans">+ Extra: {addon.name}</td>
                                  <td className="p-2 text-right text-slate-500">${addon.price}.00</td>
                                </tr>
                              ))}
                              <tr className="bg-indigo-50 font-bold text-indigo-700">
                                <td className="p-2 font-sans">Total Paid & Approved</td>
                                <td className="p-2 text-right">${costVal}.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Customer Feedback section */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 flex items-start gap-3">
                          <div className="text-xl shrink-0 mt-0.5">🌟</div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-600">Your Handover Feedback Verified:</p>
                            <p className="font-bold text-[11px] text-indigo-700">⭐ {ratingInput}.0 / 5.0 Star Score Status</p>
                            <p className="text-[10px] text-slate-500 italic font-sans font-medium">"{feedbackNotes}"</p>
                          </div>
                        </div>

                        {/* Signature verification block */}
                        {job.clientSignature && (
                          <div className="border-t border-gray-100 pt-3 flex justify-between items-center bg-gray-50/50 p-2.5 rounded-xl">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Client Sign-off Authorization</p>
                              <p className="text-[10px] text-slate-700 font-semibold">{job.name} Signed</p>
                              <p className="text-[8px] text-slate-400 font-mono">Logged UTC: {job.siteDepartureTime || new Date().toLocaleTimeString()}</p>
                            </div>
                            <img src={job.clientSignature} alt="Signature" className="h-8 max-w-28 object-contain bg-white p-0.5 rounded border border-gray-300" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        <div className="border-t border-gray-150 pt-3 text-[10px] text-slate-400 text-center font-sans space-y-1">
                          <p>© 2026 AASTACLEAN Group Australia. ISO 9055 & ISO 14001 Registered Systems.</p>
                          <p>We are a certified NDIS provider. Business Registries: ABN 45 909 112 003.</p>
                        </div>
                      </div>
                    )}

                    {/* ETA Alert Template Contents */}
                    {emailTemplateType === "eta" && (
                      <div className="font-sans text-slate-700 leading-relaxed text-xs space-y-4">
                        <div className="text-center pb-4 border-b border-gray-100">
                          <h1 className="text-lg font-black tracking-tight text-amber-600 m-0">CREW DISPATCH ALERT</h1>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">On-Route ETA & Security Verification</p>
                        </div>

                        <p>Dear <strong>{job.name}</strong>,</p>
                        <p>
                          We’ve dispatched our team to your location in <strong>{pcodeDetails.label} ({job.postcode})</strong>. Your designated technician is currently en route to your premises.
                        </p>

                        {/* Bio / Security badge */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                            {cleaner.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-800">Assigned Expert: {cleaner.name}</p>
                            <p className="text-[9px] text-amber-600 font-bold">★ {cleaner.rating.toFixed(1)} Rating • Fully Police-Checked & Cleaned</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Contact phone: {cleaner.phone}</p>
                          </div>
                        </div>

                        {/* Live ETA timer tracker */}
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Site Arrival Security Parameters
                          </p>
                          <ul className="list-disc list-inside mt-2 text-[10px] text-amber-700 space-y-1 font-sans">
                            <li><strong>Estimated ETA:</strong> Under 35 minutes matching traffic metrics</li>
                            <li><strong>Arrival Hygiene:</strong> Technical crew will wear brand-new deionised gloves</li>
                            <li><strong>Access Instructions:</strong> "{job.notes || "Standard access requested"}"</li>
                          </ul>
                        </div>

                        <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                          To assure security, our technicians arrive in fully-marked official AASTACLEAN service vehicles. If you have any modifications or pet directions, please call active dispatch directly.
                        </p>

                        <div className="border-t border-gray-150 pt-3 text-[10px] text-slate-400 text-center font-sans">
                          <p>© 2026 AASTACLEAN Group Australia. ISO 9055 Registered Crews.</p>
                        </div>
                      </div>
                    )}

                    {/* NDIS Compliance hygiene Template Contents */}
                    {emailTemplateType === "hygiene" && (
                      <div className="font-sans text-slate-700 leading-relaxed text-xs space-y-4">
                        <div className="text-center pb-4 border-b border-gray-100">
                          <h1 className="text-lg font-black tracking-tight text-purple-650 m-0">HYPOALLERGENIC COMPLIANCE CERTIFICATE</h1>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Sterilization & NDIS Quality Standards</p>
                        </div>

                        <p>Certified To: <strong>{job.name}</strong>,</p>
                        <p>
                          This document serves as formal system certification that the scheduled service on Job <strong>#{job.id.slice(-6)}</strong> has been conducted in full compliance with ISO 9005 medical sanitizaton norms and NDIS hypo-clean safety guidelines.
                        </p>

                        {/* Seal list details */}
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
                          <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1 font-sans">
                            🛡️ Chemical Deployment & Safety Registry
                          </p>
                          
                          <table className="w-full text-[10px] text-purple-950/80 border-t border-purple-100 mt-1">
                            <tbody>
                              <tr className="border-b border-purple-100/40"><td className="py-2.5 font-bold">Standard Diluter Agent:</td><td className="text-right">Hypoallergenic Neutral pH Deionised Purifier</td></tr>
                              <tr className="border-b border-purple-100/40"><td className="py-2.5 font-bold font-mono">Pathogen Kill Rate:</td><td className="text-right font-mono text-emerald-600 font-bold">99.999% of bacteria and spore particulate fields</td></tr>
                              <tr className="border-b border-purple-100/40"><td className="py-2.5 font-bold">Allergen Safety:</td><td className="text-right font-bold text-emerald-600">PASSED: Certified Asthma/Allergy Friendly</td></tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-gray-150">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Accredited Roster Verification:</p>
                          <ul className="text-[10px] text-slate-500 space-y-1 list-none font-mono">
                            <li>✓ <strong>Technician Verified:</strong> Certified Clinical Class Cleaner</li>
                            <li>✓ <strong>Water Standard:</strong> Reverse-osmosis filtered feed</li>
                            <li>✓ <strong>HEPA Log:</strong> Multi-stage micro-filtration bags active</li>
                          </ul>
                        </div>

                        <p className="text-[10px] text-slate-400 italic font-sans leading-relaxed">
                          This report is automatically synced into the customer CRM database of the government NDIS Commission registries. File Reference: AASTACLEAN/NDIS/{job.id.slice(-6)}.
                        </p>

                        <div className="border-t border-gray-150 pt-3 text-[10px] text-slate-400 text-center font-sans">
                          <p>© 2026 AASTACLEAN Group Australia. ISO 9055 Certified Hygiene provider.</p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </section>
  );
}
