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
  WifiOff,
  Download,
  HardDrive,
  Flag,
  MessageSquare,
  Search,
  Plus,
  Minus,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { QuoteRequest, Cleaner } from "../types";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { useTheme } from "../context/ThemeContext";
import { safeLocalStorage as localStorage } from "../utils/storageFallback";
import { SERVICE_METADATA } from "../config/ServiceCatalog";
import {
  saveSignatureInDB,
  getSignatureFromDB,
  savePhotoInDB,
  getPhotosFromDB,
  clearAllJobAssetsFromDB,
  getOfflineDBSizeInBytes,
  saveTaskPhotoInDB,
  getTaskPhotosFromDB,
  getAllTaskPhotosForQuote,
  openOfflineDB,
  deletePhotoFromDB
} from "../utils/indexedDb";

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

// Client-side Image Compression Helper using Canvas to reduce IndexedDB disk write footprints and speed up remote dispatch syncing syncs.
const compressImageBase64 = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

// Standalone high-performance SwipeActionTrack to guarantee correct React state lifecycle schedule
const SwipeActionTrack = ({ 
  text, 
  colorClass, 
  onPerform, 
  daylightHighContrast 
}: { 
  text: string; 
  colorClass: string; 
  onPerform: () => void; 
  daylightHighContrast: boolean; 
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = Math.max(0, Math.min(130, clientX - startXRef.current));
    setOffset(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offset >= 110) {
      onPerform();
    }
    setOffset(0);
  };

  useEffect(() => {
    const onGlobalMove = (e: MouseEvent) => handleMove(e.clientX);
    const onGlobalTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onGlobalUp = () => handleEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onGlobalMove);
      window.addEventListener("mouseup", onGlobalUp);
      window.addEventListener("touchmove", onGlobalTouchMove);
      window.addEventListener("touchend", onGlobalUp);
    }
    return () => {
      window.removeEventListener("mousemove", onGlobalMove);
      window.removeEventListener("mouseup", onGlobalUp);
      window.removeEventListener("touchmove", onGlobalTouchMove);
      window.removeEventListener("touchend", onGlobalUp);
    };
  }, [isDragging, offset]);

  return (
    <div className={`relative w-52 h-10 ${daylightHighContrast ? "bg-zinc-100 border-2 border-black" : "bg-slate-950/90 border border-slate-800"} rounded-xl overflow-hidden select-none flex items-center shadow-md shrink-0`}>
      <div 
        className={`absolute left-0 top-0 bottom-0 ${colorClass} opacity-20`}
        style={{ width: `${offset + 36}px` }}
      />
      <div className={`absolute inset-0 flex items-center justify-center text-[9px] font-black tracking-widest uppercase pointer-events-none select-none text-center ${daylightHighContrast ? "text-black" : "text-slate-400"}`}>
        {offset > 12 ? "" : text}
      </div>
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        className="absolute left-1 h-8 w-8 bg-indigo-600 hover:bg-indigo-550 rounded-lg flex items-center justify-center text-white cursor-grab active:cursor-grabbing shadow-sm text-xs font-bold font-mono"
        style={{ 
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        👉
      </div>
    </div>
  );
};

interface TechnicianMapContainerProps {
  job: QuoteRequest;
  pcodeDetails: { lat: number; lng: number; label: string };
  cleanerGpsCoords: Record<string, { lat: number; lng: number; bearing: number }>;
  daylightHighContrast: boolean;
  hasValidMapKey: boolean;
  GOOGLE_MAPS_KEY: string;
  mapMode: "roadmap" | "satellite";
  setMapMode: (mode: "roadmap" | "satellite") => void;
  onTriggerLog: (log: any) => void;
  gpsTelemetryHistory: Record<string, any[]>;
}

function TechnicianMapContainer({
  job,
  pcodeDetails,
  cleanerGpsCoords,
  daylightHighContrast,
  hasValidMapKey,
  GOOGLE_MAPS_KEY,
  mapMode,
  setMapMode,
  onTriggerLog,
  gpsTelemetryHistory
}: TechnicianMapContainerProps) {
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState({ lat: pcodeDetails.lat, lng: pcodeDetails.lng });

  const currentCoord = cleanerGpsCoords[job.id];
  const lastCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (currentCoord) {
      const changed = !lastCoordRef.current || 
                     lastCoordRef.current.lat !== currentCoord.lat || 
                     lastCoordRef.current.lng !== currentCoord.lng;
      if (changed) {
        setCenter({ lat: currentCoord.lat, lng: currentCoord.lng });
        setZoom(16); // auto zoom in on active tracker points
        lastCoordRef.current = { lat: currentCoord.lat, lng: currentCoord.lng };
      }
    }
  }, [currentCoord]);

  // Handle card switching or suburb change
  useEffect(() => {
    setCenter({ lat: pcodeDetails.lat, lng: pcodeDetails.lng });
    setZoom(13);
    lastCoordRef.current = null;
  }, [pcodeDetails.lat, pcodeDetails.lng]);

  const handleCameraChange = (ev: any) => {
    if (ev.detail && ev.detail.zoom !== undefined) {
      setZoom(ev.detail.zoom);
    }
    if (ev.detail && ev.detail.center !== undefined) {
      setCenter(ev.detail.center);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(19, prev + 1));
  const handleZoomOut = () => setZoom(prev => Math.max(10, prev - 1));
  const handleCenterJob = () => {
    setCenter({ lat: pcodeDetails.lat, lng: pcodeDetails.lng });
    setZoom(13);
  };
  const handleCenterTech = () => {
    if (currentCoord) {
      setCenter({ lat: currentCoord.lat, lng: currentCoord.lng });
      setZoom(16);
    }
  };

  const handleGlobalMapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enable arrows for panning center when container or inner elements are active
    const step = 0.004 / Math.pow(2, zoom - 13);
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCenter(prev => ({ lat: prev.lat + step, lng: prev.lng }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCenter(prev => ({ lat: prev.lat - step, lng: prev.lng }));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCenter(prev => ({ lat: prev.lat, lng: prev.lng - step }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setCenter(prev => ({ lat: prev.lat, lng: prev.lng + step }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === "-") {
      e.preventDefault();
      handleZoomOut();
    }
  };

  return (
    <div 
      tabIndex={0}
      role="region"
      aria-label="Interactive technician tracking map. Use Arrow Keys to pan center. Use Plus/Minus to zoom."
      onKeyDown={handleGlobalMapKeyDown}
      className={`w-full h-44 rounded-2xl overflow-hidden relative flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        daylightHighContrast 
          ? "border-2 border-black bg-white focus-visible:ring-offset-white" 
          : "border border-slate-800 bg-slate-950 focus-visible:ring-offset-slate-950"
      }`}
    >
      {/* Zoom and Center Controls overlaid on the map UI */}
      <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 select-none pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleZoomIn();
            }
          }}
          className={`p-1 w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            daylightHighContrast
              ? "bg-white text-black border-2 border-black hover:bg-zinc-100 focus-visible:ring-black focus-visible:ring-offset-white"
              : "bg-slate-900/90 hover:bg-slate-800 text-white border-slate-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-905"
          }`}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4 font-black" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleZoomOut();
            }
          }}
          className={`p-1 w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            daylightHighContrast
              ? "bg-white text-black border-2 border-black hover:bg-zinc-100 focus-visible:ring-black focus-visible:ring-offset-white"
              : "bg-slate-900/90 hover:bg-slate-800 text-white border-slate-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-905"
          }`}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4 font-black" />
        </button>
        <button
          type="button"
          onClick={handleCenterJob}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCenterJob();
            }
          }}
          className={`p-1 w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            daylightHighContrast
              ? "bg-white text-black border-2 border-black hover:bg-zinc-100 focus-visible:ring-black focus-visible:ring-offset-white"
              : "bg-slate-900/90 hover:bg-slate-800 text-indigo-400 border-slate-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-905"
          }`}
          title="Center on Job Site"
          aria-label="Center on Job Site"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
        {currentCoord && (
          <button
            type="button"
            onClick={handleCenterTech}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCenterTech();
              }
            }}
            className={`p-1 w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              daylightHighContrast
                ? "bg-white text-black border-2 border-black hover:bg-zinc-100 focus-visible:ring-black focus-visible:ring-offset-white"
                : "bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-slate-800 focus-visible:ring-emerald-500 focus-visible:ring-offset-slate-905"
            }`}
            title="Center on Technician"
            aria-label="Center on Technician"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Digital scale marker bottom right */}
      <div className={`absolute bottom-2 right-2 z-30 px-2 py-0.5 rounded text-[8px] font-mono border select-none ${
        daylightHighContrast
          ? "bg-white text-black border-black font-black"
          : "bg-slate-955 text-sky-400 border-slate-800"
      }`}>
        Zoom: {zoom}x
      </div>

      {hasValidMapKey ? (
        <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
          <Map
            center={center}
            zoom={zoom}
            onCameraChanged={handleCameraChange}
            mapId="AASTACLEAN_CREW_MAP"
            mapTypeId={mapMode}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '105%', height: '105%' }}
            disableDefaultUI={true}
          >
            <AdvancedMarker position={{ lat: pcodeDetails.lat, lng: pcodeDetails.lng }}>
              <Pin background="#4f46e5" glyphColor="#fff" scale={1} />
            </AdvancedMarker>

            {/* Visual 50-meter Geofence circle on the real Google Map */}
            <AdvancedMarker position={{ lat: pcodeDetails.lat, lng: pcodeDetails.lng }}>
              <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none">
                <div className="w-[120px] h-[120px] rounded-full border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 animate-[pulse_3s_infinite] flex items-center justify-center">
                  <span className="text-[7.5px] font-bold text-indigo-400 uppercase tracking-widest font-mono">50m Geofence</span>
                </div>
              </div>
            </AdvancedMarker>

            {/* Cleaner Real-time GPS Position Overlay Marker on Google Maps if active */}
            {currentCoord && (
              <AdvancedMarker position={{ lat: currentCoord.lat, lng: currentCoord.lng }}>
                <div className="flex flex-col items-center justify-center scale-90 translate-y-[-10px] select-none">
                  <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-xl border-2 border-white animate-bounce">
                    🚗
                  </div>
                  <span className="bg-slate-950 border border-slate-805 text-white text-[7px] font-black tracking-widest uppercase px-1 rounded block font-mono">
                    CREW GPS
                  </span>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      ) : (
        // Beautiful simulated vector map mesh complying with custom mapping falls back gracefully and explains keys.
        <div className={`absolute inset-0 p-4 flex flex-col justify-between overflow-hidden transition-all ${
          mapMode === "satellite"
            ? (daylightHighContrast ? "bg-zinc-900 text-white" : "bg-slate-955 text-sky-400")
            : (daylightHighContrast ? "bg-white text-black" : "bg-slate-955 text-slate-300")
        }`}>
          {/* Simulated Vector Coordinates Mesh Background */}
          <div className={`absolute inset-0 opacity-15 pointer-events-none ${
            mapMode === "satellite"
              ? "bg-[radial-gradient(#38bdf8_1px,transparent_1px)]"
              : (daylightHighContrast ? "bg-[radial-gradient(#000000_1px,transparent_1px)]" : "bg-[radial-gradient(#312e81_1px,transparent_1px)]")
          } [background-size:16px_16px]`} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-24 h-24 rounded-full border absolute ${
              mapMode === "satellite"
                ? "border-sky-500/20 animate-ping"
                : (daylightHighContrast ? "border-black/20" : "border-indigo-500/20")
            }`} />
            <div className={`w-36 h-36 rounded-full border absolute ${
              mapMode === "satellite"
                ? "border-sky-500/10"
                : (daylightHighContrast ? "border-black/10" : "border-indigo-500/10")
            }`} />
          </div>

          {/* Center Client Job Site Destination Marker relative to center / zoom */}
          {(() => {
            const zoomMultiplier = Math.pow(2, zoom - 13);
            const siteDx = (pcodeDetails.lat - center.lat) * zoomMultiplier * 1000;
            const siteDy = (pcodeDetails.lng - center.lng) * zoomMultiplier * 1000;
            
            const siteLeft = 50 + siteDy * 12;
            const siteTop = 50 - siteDx * 12;

            // Only display job site if it is within reasonable visual boundaries (fallback margin clamp)
            if (siteLeft < -20 || siteLeft > 120 || siteTop < -20 || siteTop > 120) return null;

            return (
              <div 
                className="absolute z-20 flex flex-col items-center justify-center pointer-events-none transition-all duration-300"
                style={{ left: `${siteLeft}%`, top: `${siteTop}%` }}
              >
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-pulse">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <span className={`text-[7px] font-black uppercase px-1 mt-0.5 rounded shadow ${
                  daylightHighContrast ? "bg-black text-white" : "bg-slate-900/90 text-indigo-300"
                }`}>
                  JOB SITE
                </span>
              </div>
            );
          })()}

          {/* 50-meter Geofence Boundary Visual Range Indicator (Circle) relative to center / zoom */}
          {(() => {
            const zoomMultiplier = Math.pow(2, zoom - 13);
            const siteDx = (pcodeDetails.lat - center.lat) * zoomMultiplier * 1000;
            const siteDy = (pcodeDetails.lng - center.lng) * zoomMultiplier * 1000;
            
            const siteLeft = 50 + siteDy * 12;
            const siteTop = 50 - siteDx * 12;

            if (siteLeft < -20 || siteLeft > 120 || siteTop < -20 || siteTop > 120) return null;

            // Visual diameter scales with zoom
            const diameter = 112 * zoomMultiplier;

            return (
              <div 
                className="absolute z-10 rounded-full border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 animate-[pulse_3s_infinite] pointer-events-none flex items-center justify-center transition-all duration-300 -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${siteLeft}%`, 
                  top: `${siteTop}%`,
                  width: `${Math.max(40, Math.min(300, diameter))}px`,
                  height: `${Math.max(40, Math.min(300, diameter))}px`
                }}
              >
                <span className="text-[6.5px] font-black text-indigo-400 bg-slate-950/45 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">50m Geofence</span>
              </div>
            );
          })()}

          {/* Real-time Moving GPS Tracker Overlaid */}
          {currentCoord && (() => {
            const zoomMultiplier = Math.pow(2, zoom - 13);
            const dx = (currentCoord.lat - center.lat) * zoomMultiplier * 1000;
            const dy = (currentCoord.lng - center.lng) * zoomMultiplier * 1000;
            
            const leftVal = 50 + dy * 12;
            const topVal = 50 - dx * 12;

            if (leftVal < -20 || leftVal > 120 || topVal < -20 || topVal > 120) return null;
            
            return (
              <div 
                className="absolute z-20 transition-all duration-1000 ease-linear flex flex-col items-center justify-center select-none"
                style={{ left: `${leftVal}%`, top: `${topVal}%` }}
              >
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
                  🚗
                </div>
                <span className={`text-[6px] font-black uppercase px-1 py-0.5 rounded shadow whitespace-nowrap ${
                  daylightHighContrast ? "bg-black text-white" : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                }`}>
                  CREW: {job.bookingStatus.toUpperCase()}
                </span>
              </div>
            );
          })()}

          <div className={`z-10 p-2 border flex justify-between items-start text-[10px] leading-normal font-mono ${
            mapMode === "satellite"
              ? "bg-slate-900/95 border-sky-800 text-sky-400"
              : (daylightHighContrast ? "bg-white border-black text-black font-bold" : "bg-slate-900/90 border-slate-800 text-slate-400")
          }`}>
            <p className="max-w-xs font-mono">
              {mapMode === "satellite" ? (
                <span>📡 Satellite Orbits Locked: <span className="text-white font-black">{pcodeDetails.label}</span> Dispatch Telemetry tracking active at {center.lat.toFixed(4)}, {center.lng.toFixed(4)} with real-time GPS telemetry...</span>
              ) : (
                <span>🗺️ Suburb coordinates mapping: <span className={daylightHighContrast ? "text-black underline font-black" : "text-white font-bold"}>{pcodeDetails.label}</span> Map Center at <span>{center.lat.toFixed(4)}, {center.lng.toFixed(4)}</span>.</span>
              )}
            </p>
          </div>

          <div className={`z-10 p-2 px-3 border flex items-center justify-between text-[11px] mt-auto ${
            mapMode === "satellite"
              ? "bg-slate-905 border-sky-950 text-slate-300"
              : (daylightHighContrast ? "bg-white border-black text-black" : "bg-slate-950 border-slate-800")
          }`}>
            <span className={`font-semibold font-sans flex items-center gap-1 ${
              mapMode === "satellite"
                ? "text-sky-400"
                : (daylightHighContrast ? "text-black font-black" : "text-amber-400")
            }`}>
              <AlertCircle className="w-3.5 h-3.5" /> API Key Not Active (Simulated {mapMode === "satellite" ? "Satellite" : "Road"} Mode)
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
  );
}

export default function CleanersApp({ 
  quotes, 
  cleaners, 
  onUpdateQuote,
  onTriggerLog
}: CleanersAppProps) {
  
  const [activeCleanerName, setActiveCleanerName] = useState(cleaners[0]?.name || "");
  const { daylightHighContrast, setDaylightHighContrast } = useTheme();
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_completed_subtasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Enterprise additions for aligned map viewing, offline photo collections & multi-job selection
  const [mapMode, setMapMode] = useState<"roadmap" | "satellite">("roadmap");
  const [photoViewMode, setPhotoViewMode] = useState<"standard" | "offline-gallery">("standard");
  const [selectedPhotosToDelete, setSelectedPhotosToDelete] = useState<{ type: "before" | "after"; index: number }[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  
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

  // Custom states for advanced visual diagnostics, charts and team features
  const [checklistSearch, setChecklistSearch] = useState<Record<string, string>>({});

  // Task-specific photos mapping: jobId -> { taskName: list of Base64 strings }
  const [subtaskPhotos, setSubtaskPhotos] = useState<Record<string, Record<string, string[]>>>({});

  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [teamNotes, setTeamNotes] = useState<Array<{ id: string; sender: string; message: string; timestamp: string }>>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_team_chat_notes");
      return saved ? JSON.parse(saved) : [
        { id: "note1", sender: "Dean Harrison", message: "Left specific keys in Lockbox 4 for Brisbane CBD job. Double-check front door alarm code.", timestamp: "Yesterday, 4:15 PM" },
        { id: "note2", sender: "Michael K.", message: "All HACCP sanitizer bottles re-stocked in van 3. Please update inventory sheets.", timestamp: "Today, 9:30 AM" }
      ];
    } catch {
      return [];
    }
  });
  const [chatInputText, setChatInputText] = useState("");
  const [expandedNotesJobId, setExpandedNotesJobId] = useState<string | null>(null);
  const [editedNotesText, setEditedNotesText] = useState("");
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [activeDragJob, setActiveDragJob] = useState<{ id: string; startX: number } | null>(null);
  const [cleanerGpsCoords, setCleanerGpsCoords] = useState<Record<string, { lat: number; lng: number; bearing: number }>>({});
  const [gpsTelemetryHistory, setGpsTelemetryHistory] = useState<Record<string, Array<{ lat: number; lng: number; bearing: number; timestamp: string; bookingStatus: string }>>>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_gps_telemetry_history");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aastaclean_gps_telemetry_history", JSON.stringify(gpsTelemetryHistory));
    } catch (e) {}
  }, [gpsTelemetryHistory]);

  // --- PHASE 2: ADVANCED SHIFT CLOCKING STATES ---
  const [shiftClockedIn, setShiftClockedIn] = useState<boolean>(() => {
    return localStorage.getItem("aastaclean_shift_clocked_in") === "true";
  });
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(() => {
    return localStorage.getItem("aastaclean_shift_start_time");
  });
  const [shiftTotalSeconds, setShiftTotalSeconds] = useState<number>(() => {
    const saved = localStorage.getItem("aastaclean_shift_total_seconds");
    return saved ? parseInt(saved) : 0;
  });

  // --- PHASE 2: VISUAL CALENDAR STATES ---
  const [viewTab, setViewTab] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // --- PHASE 2: PHOTO ANNOTATION STATES ---
  const [annotatingPhoto, setAnnotatingPhoto] = useState<{
    quoteId: string;
    type: "before" | "after" | "subtask";
    index: number;
    src: string;
    taskName?: string;
  } | null>(null);

  const [annotationTool, setAnnotationTool] = useState<"arrow" | "brush" | "text">("brush");
  const [annotationColor, setAnnotationColor] = useState<string>("#ec4899"); // Tailwind Pink-500 default
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<number>(4);
  const [isDrawingCanvas, setIsDrawingCanvas] = useState(false);
  const [startDrawingPos, setStartDrawingPos] = useState<{ x: number; y: number } | null>(null);
  const [drawHistory, setDrawHistory] = useState<string[]>([]);
  const [textInputVal, setTextInputVal] = useState("");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  // --- Automated PDF & Email Report States (Explain like I'm 10!) ---
  const [reportDispatchActive, setReportDispatchActive] = useState(false);
  const [reportDispatchProgress, setReportDispatchProgress] = useState(0);
  const [reportStepsLog, setReportStepsLog] = useState<string[]>([]);
  const [reportFinished, setReportFinished] = useState(false);
  const [generatedPdfBlobUrl, setGeneratedPdfBlobUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState("");

  // --- VAN INVENTORY MANAGEMENT SYSTEM ---
  const [vanInventory, setVanInventory] = useState<Record<string, Array<{ id: string; name: string; category: string; qty: number; minQty: number; unit: string; maxQty: number }>>>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_van_inventory_by_cleaner");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [newInvName, setNewInvName] = useState("");
  const [newInvCategory, setNewInvCategory] = useState("Chemicals");
  const [newInvQty, setNewInvQty] = useState(5);
  const [newInvMinQty, setNewInvMinQty] = useState(2);
  const [newInvUnit, setNewInvUnit] = useState("units");
  const [showAddInvForm, setShowAddInvForm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("aastaclean_van_inventory_by_cleaner", JSON.stringify(vanInventory));
    } catch (e) {
      console.error("Local storage inventory save failure:", e);
    }
  }, [vanInventory]);

  // Returns inventory for a given cleaner, returning defaults if not yet initialized
  const getCleanerInventory = (cleanerName: string) => {
    if (vanInventory[cleanerName]) {
      return vanInventory[cleanerName];
    }
    // Default high-yield commercial cleaning assets
    return [
      { id: "inv_sanitizer", name: "HACCP Sanitizer Bottles", category: "Chemicals", qty: 6, minQty: 3, unit: "bottles", maxQty: 12 },
      { id: "inv_hepa", name: "M-Class HEPA Filters", category: "Hardware", qty: 1, minQty: 2, unit: "units", maxQty: 4 },
      { id: "inv_microfibre", name: "Microfibre Cloths", category: "Supplies", qty: 14, minQty: 10, unit: "packs", maxQty: 25 },
      { id: "inv_abrasive", name: "Dual-Action Scrubbing Pads", category: "Supplies", qty: 3, minQty: 5, unit: "pads", maxQty: 10 },
      { id: "inv_neutral", name: "pH Neutral Detergent (5L)", category: "Chemicals", qty: 4, minQty: 2, unit: "tubs", maxQty: 8 }
    ];
  };

  const adjustInventoryQty = (cleanerName: string, itemId: string, delta: number) => {
    const currentList = [...getCleanerInventory(cleanerName)];
    const updatedList = currentList.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, Math.min(item.maxQty || 100, item.qty + delta));
        return { ...item, qty: newQty };
      }
      return item;
    });

    setVanInventory(prev => ({
      ...prev,
      [cleanerName]: updatedList
    }));

    // Trigger log entry so integration logs reflect usage
    const targetItem = currentList.find(i => i.id === itemId);
    if (targetItem) {
      const action = delta > 0 ? "Restocked" : "Used";
      onTriggerLog({
        id: `inventory_log_${Date.now()}`,
        type: "system",
        status: delta > 0 ? "success" : "info",
        message: `🚚 [VAN-INVENTORY] ${action} ${Math.abs(delta)} ${targetItem.unit} of ${targetItem.name}. Current stock: ${Math.max(0, targetItem.qty + delta)} ${targetItem.unit}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const addInventoryItem = (cleanerName: string) => {
    if (!newInvName.trim()) return;
    const currentList = [...getCleanerInventory(cleanerName)];
    const newItem = {
      id: `inv_custom_${Date.now()}`,
      name: newInvName.trim(),
      category: newInvCategory,
      qty: Number(newInvQty) || 1,
      minQty: Number(newInvMinQty) || 1,
      unit: newInvUnit.trim() || "units",
      maxQty: Math.max(Number(newInvQty) * 3, 50)
    };

    setVanInventory(prev => ({
      ...prev,
      [cleanerName]: [...currentList, newItem]
    }));

    onTriggerLog({
      id: `inventory_log_${Date.now()}`,
      type: "system",
      status: "success",
      message: `🚚 [VAN-INVENTORY] Added new supply item: '${newItem.name}' to Van Loadout list.`,
      timestamp: new Date().toLocaleTimeString()
    });

    setNewInvName("");
    setNewInvQty(5);
    setNewInvMinQty(2);
    setNewInvUnit("units");
    setShowAddInvForm(false);
  };

  const removeInventoryItem = (cleanerName: string, itemId: string) => {
    const currentList = [...getCleanerInventory(cleanerName)];
    const filteredList = currentList.filter(item => item.id !== itemId);
    
    setVanInventory(prev => ({
      ...prev,
      [cleanerName]: filteredList
    }));

    onTriggerLog({
      id: `inventory_log_${Date.now()}`,
      type: "system",
      status: "warning",
      message: `🚚 [VAN-INVENTORY] Discarded inventory stock item tracking for this mobile unit.`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const reorderAllLowItems = (cleanerName: string) => {
    const currentList = getCleanerInventory(cleanerName);
    const lowItems = currentList.filter(item => item.qty <= item.minQty);
    
    if (lowItems.length === 0) {
      onTriggerLog({
        id: `inventory_log_${Date.now()}`,
        type: "system",
        status: "info",
        message: `🚚 [VAN-INVENTORY] No auto-reorders required. Van supply stock is fully coherent and above compliance benchmarks.`,
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }

    const updatedList = currentList.map(item => {
      if (item.qty <= item.minQty) {
        // replenishment to maxQty / high default
        return { ...item, qty: item.maxQty || (item.minQty * 3) };
      }
      return item;
    });

    setVanInventory(prev => ({
      ...prev,
      [cleanerName]: updatedList
    }));

    onTriggerLog({
      id: `inventory_log_${Date.now()}`,
      type: "system",
      status: "success",
      message: `🚚 [AUTO-REORDER] Automated restocking sequence completed for ${lowItems.length} low supplies: ${lowItems.map(i => i.name).join(", ")}.`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const updateInventoryThreshold = (cleanerName: string, itemId: string, newMinQty: number) => {
    const currentList = [...getCleanerInventory(cleanerName)];
    const updatedList = currentList.map(item => {
      if (item.id === itemId) {
        return { ...item, minQty: Math.max(0, newMinQty) };
      }
      return item;
    });

    setVanInventory(prev => ({
      ...prev,
      [cleanerName]: updatedList
    }));

    const targetItem = currentList.find(i => i.id === itemId);
    if (targetItem) {
      onTriggerLog({
        id: `inventory_log_thresh_${Date.now()}`,
        type: "system",
        status: "info",
        message: `🔧 [VAN-INVENTORY] Updated reorder threshold for ${targetItem.name} to ${newMinQty} ${targetItem.unit}.`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };


  // Canvas Refs for signature tracking
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const activeCleaner = cleaners.find((c) => c.name === activeCleanerName);

  // --- SERVICE WORKER & OFFLINE COHERENCY STATES ---
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_offline_sync_queue");
      // Load initially as thin list, will be inflated by the asynchronous effect on boot
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

  const [isWebOnline, setIsWebOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsWebOnline(true);
    };
    const handleOffline = () => {
      setIsWebOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [swStatus, setSwStatus] = useState<string>("detecting");
  const [projectedQuotes, setProjectedQuotes] = useState<QuoteRequest[]>(quotes);

  // Pre-load all task-specific photos from IndexedDB for current jobs
  useEffect(() => {
    const loadAllTaskPhotos = async () => {
      const photosMap: Record<string, Record<string, string[]>> = {};
      for (const quote of projectedQuotes) {
        try {
          const taskPhotos = await getAllTaskPhotosForQuote(quote.id);
          if (Object.keys(taskPhotos).length > 0) {
            photosMap[quote.id] = taskPhotos;
          }
        } catch (err) {
          console.warn(`Failed loading task photos for quote ${quote.id}:`, err);
        }
      }
      setSubtaskPhotos(photosMap);
    };
    loadAllTaskPhotos();
  }, [projectedQuotes]);

  // Sync History Log state for offline synchronization tracking
  const [syncHistory, setSyncHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("aastaclean_sync_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real-time disk footprint metrics state for IndexedDB
  const [idbStats, setIdbStats] = useState<{ signatures: number; photos: number; sizeFormatted: string } | null>(null);
  const [isZipping, setIsZipping] = useState<Record<string, boolean>>({});

  const queryIdbStats = async () => {
    try {
      const sizeObj = await getOfflineDBSizeInBytes();
      let formatted = "0 B";
      if (sizeObj.total > 1024 * 1024) {
        formatted = `${(sizeObj.total / (1024 * 1024)).toFixed(2)} MB`;
      } else if (sizeObj.total > 1024) {
        formatted = `${(sizeObj.total / 1024).toFixed(1)} KB`;
      } else {
        formatted = `${sizeObj.total} B`;
      }
      setIdbStats({
        signatures: sizeObj.signatures,
        photos: sizeObj.photos,
        sizeFormatted: formatted
      });
    } catch (err) {
      console.warn("Failed fetching IndexedDB storage stats:", err);
    }
  };

  // Asynchronous queue inflation upon application mount
  useEffect(() => {
    const bootstrapAndInflate = async () => {
      await queryIdbStats();

      const saved = localStorage.getItem("aastaclean_offline_sync_queue");
      if (!saved) return;
      try {
        const thinQueue = JSON.parse(saved);
        if (thinQueue.length === 0) return;

        const inflated = await Promise.all(thinQueue.map(async (item: any) => {
          if (item.type === "signature_complete") {
            if (item.payload.clientSignature === "indexeddb_ref") {
              const sig = await getSignatureFromDB(item.quoteId);
              if (sig) {
                item.payload = {
                  ...item.payload,
                  clientSignature: sig
                };
              }
            }
          } else if (item.type === "photo_upload") {
            const dbBeforePhotos = await getPhotosFromDB(item.quoteId, "before");
            const dbAfterPhotos = await getPhotosFromDB(item.quoteId, "after");
            
            let beforeIdx = 0;
            let afterIdx = 0;

            if (item.payload.beforePhotos) {
              item.payload.beforePhotos = item.payload.beforePhotos.map((p: string) => {
                if (p === "indexeddb_ref") {
                  const found = dbBeforePhotos[beforeIdx++];
                  return found ? found.dataUrl : p;
                }
                return p;
              });
            }

            if (item.payload.afterPhotos) {
              item.payload.afterPhotos = item.payload.afterPhotos.map((p: string) => {
                if (p === "indexeddb_ref") {
                  const found = dbAfterPhotos[afterIdx++];
                  return found ? found.dataUrl : p;
                }
                return p;
              });
            }
          }
          return item;
        }));

        setOfflineSyncQueue(inflated);
        console.log("👷 Ready: Successfully inflated offline sync queue with IndexedDB blocks.");
      } catch (err) {
        console.warn("👷 Offline sync queue inflation exception:", err);
      }
    };

    bootstrapAndInflate();
  }, []);

  // Real-time GPS coordinates animated approximation for active en-route & in-progress cleaner crews
  useEffect(() => {
    const interval = setInterval(() => {
      setCleanerGpsCoords(prev => {
        const next = { ...prev };
        const activeCleanerJobs = projectedQuotes.filter(q => q.assignedCleaner === activeCleanerName);
        const newHistoryEntries: Record<string, { lat: number; lng: number; bearing: number; timestamp: string; bookingStatus: string }> = {};

        activeCleanerJobs.forEach(job => {
          if (job.bookingStatus === "en-route" || job.bookingStatus === "in-progress") {
            const dest = SUBURB_MAP[job.postcode] || { lat: -31.9505, lng: 115.8605, label: "Perth" };
            const current = prev[job.id];
            let updatedCoord;
            
            if (!current) {
              // Start further away representing dispatch station
              updatedCoord = {
                lat: dest.lat - 0.012,
                lng: dest.lng - 0.012,
                bearing: 45
              };
            } else {
              const targetLat = dest.lat;
              const targetLng = dest.lng;
              
              const dx = targetLat - current.lat;
              const dy = targetLng - current.lng;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist > 0.0001) {
                // approaches closer
                const step = job.bookingStatus === "en-route" ? 0.06 : 0.8;
                const nextLat = current.lat + dx * step;
                const nextLng = current.lng + dy * step;
                const bearing = Math.atan2(dy, dx) * (180 / Math.PI);
                updatedCoord = { lat: nextLat, lng: nextLng, bearing };
              } else {
                // jitter simulated live telemetry
                updatedCoord = {
                  lat: targetLat + (Math.random() - 0.5) * 0.0001,
                  lng: targetLng + (Math.random() - 0.5) * 0.0001,
                  bearing: current.bearing + (Math.random() - 0.5) * 20
                };
              }
            }

            next[job.id] = updatedCoord;
            newHistoryEntries[job.id] = {
              lat: updatedCoord.lat,
              lng: updatedCoord.lng,
              bearing: updatedCoord.bearing,
              timestamp: new Date().toLocaleTimeString(),
              bookingStatus: job.bookingStatus
            };
          }
        });

        // Batch update telemetry history
        if (Object.keys(newHistoryEntries).length > 0) {
          setGpsTelemetryHistory(prevHist => {
            const nextHist = { ...prevHist };
            Object.entries(newHistoryEntries).forEach(([jobId, entry]) => {
              const arr = nextHist[jobId] || [];
              const nextArr = [...arr, entry];
              if (nextArr.length > 200) {
                nextArr.shift(); // keep last 200 items per job
              }
              nextHist[jobId] = nextArr;
            });
            return nextHist;
          });
        }

        return next;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [projectedQuotes, activeCleanerName]);

  // Utility to calculate Distance in Meters (Haversine formula)
  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Automatically trigger job start if within 50m of suburb destination coordinates (Geofence Arrival)
  useEffect(() => {
    const activeJobs = projectedQuotes.filter(
      q => q.bookingStatus === "en-route" && q.assignedCleaner === activeCleanerName
    );
    
    activeJobs.forEach(job => {
      const coords = cleanerGpsCoords[job.id];
      if (coords) {
        const dest = SUBURB_MAP[job.postcode] || { lat: -31.9505, lng: 115.8605 };
        const dist = getDistanceInMeters(coords.lat, coords.lng, dest.lat, dest.lng);
        
        if (dist <= 50) {
          onTriggerLog({
            id: `geofence_arrival_${job.id}_${Date.now()}`,
            type: "system",
            status: "success",
            message: `🚨 [GEOFENCE ARRIVAL] Automatic check-in and timer engagement initiated for Job #${job.id.slice(-6).toUpperCase()} as crew GPS coordinates detected within 50m (${Math.round(dist)}m) of suburb destination (${job.suburb || "Area"}).`,
            timestamp: new Date().toLocaleTimeString()
          });
          handleStartTimer(job.id);
        }
      }
    });
  }, [cleanerGpsCoords, projectedQuotes, activeCleanerName]);

  // Background Sync dispatcher to empty the queue on connection recovery
  const triggerSyncQueueDispatch = async (currentQueue = offlineSyncQueue) => {
    if (currentQueue.length === 0) return;

    onTriggerLog({
      id: `sync_start_${Date.now()}`,
      type: "api",
      status: "info",
      message: `🔄 Service Worker Sync: Restoring connectivity. Drain queue of (${currentQueue.length}) actions...`,
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      // Inflate any placeholders from IndexedDB before syncing to server
      const inflatedQueue = await Promise.all(currentQueue.map(async (item) => {
        const clonedItem = JSON.parse(JSON.stringify(item));
        if (clonedItem.type === "signature_complete") {
          if (clonedItem.payload.clientSignature === "indexeddb_ref") {
            const sig = await getSignatureFromDB(clonedItem.quoteId);
            if (sig) {
              clonedItem.payload.clientSignature = sig;
            }
          }
        } else if (clonedItem.type === "photo_upload") {
          const dbBeforePhotos = await getPhotosFromDB(clonedItem.quoteId, "before");
          const dbAfterPhotos = await getPhotosFromDB(clonedItem.quoteId, "after");
          
          let beforeIdx = 0;
          let afterIdx = 0;

          if (clonedItem.payload.beforePhotos) {
            clonedItem.payload.beforePhotos = clonedItem.payload.beforePhotos.map((p: string) => {
              if (p === "indexeddb_ref") {
                const found = dbBeforePhotos[beforeIdx++];
                return found ? found.dataUrl : p;
              }
              return p;
            });
          }

          if (clonedItem.payload.afterPhotos) {
            clonedItem.payload.afterPhotos = clonedItem.payload.afterPhotos.map((p: string) => {
              if (p === "indexeddb_ref") {
                const found = dbAfterPhotos[afterIdx++];
                return found ? found.dataUrl : p;
              }
              return p;
            });
          }
        }
        return clonedItem;
      }));

      // Simulate network response and commit updates
      setTimeout(() => {
        const collapsed: Record<string, any> = {};
        inflatedQueue.forEach((item) => {
          collapsed[item.quoteId] = {
            ...collapsed[item.quoteId],
            ...item.payload
          };
        });

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

        // Purge synchronized assets from IndexedDB to maintain clean storage state
        inflatedQueue.forEach((item) => {
          clearAllJobAssetsFromDB(item.quoteId);
        });

        onTriggerLog({
          id: `sync_success_${Date.now()}`,
          type: "api",
          status: "success",
          message: `🚀 Service Worker Sync Success: Reintegrated ${inflatedQueue.length} transactions cleanly. Sync status: 200 OK.`,
          timestamp: new Date().toLocaleTimeString(),
          payload: {
            drainedRecordsCount: inflatedQueue.length,
            mergedJobsCount: Object.keys(collapsed).length,
            activeServiceWorker: "Workbox v1-active"
          }
        });

        const nextHistoryItem = {
          id: `sync_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          transactionCount: inflatedQueue.length,
          jobCount: Object.keys(collapsed).length,
          description: `Synced ${inflatedQueue.length} transaction${inflatedQueue.length !== 1 ? "s" : ""} cleanly for ${Object.keys(collapsed).length} job${Object.keys(collapsed).length !== 1 ? "s" : ""}`,
          details: inflatedQueue.map(item => {
            const shortId = item.quoteId ? item.quoteId.slice(-6).toUpperCase() : "SYSTEM";
            return `[#${shortId}] ${item.logText || item.type || "Offline action updated"}`;
          })
        };

        setSyncHistory(prev => {
          const updated = [nextHistoryItem, ...prev].slice(0, 5);
          localStorage.setItem("aastaclean_sync_history", JSON.stringify(updated));
          return updated;
        });

        setOfflineSyncQueue([]);
        localStorage.setItem("aastaclean_offline_sync_queue", JSON.stringify([]));
        queryIdbStats();
      }, 1100);

    } catch (syncErr) {
      console.error("Failed to process background queue sync:", syncErr);
    }
  };

  // Log and schedule offline held queue
  const queueOfflineAction = async (quoteId: string, type: string, payload: any, logText: string) => {
    // 1. Durably save heavy blocks (Signatures and Photographs) to IndexedDB
    try {
      if (type === "signature_complete" && payload.clientSignature) {
        await saveSignatureInDB(quoteId, payload.clientSignature);
      } else if (type === "photo_upload") {
        if (payload.beforePhotos) {
          for (const raw of payload.beforePhotos) {
            if (raw.startsWith("data:")) {
              await savePhotoInDB(quoteId, "before", raw);
            }
          }
        }
        if (payload.afterPhotos) {
          for (const raw of payload.afterPhotos) {
            if (raw.startsWith("data:")) {
              await savePhotoInDB(quoteId, "after", raw);
            }
          }
        }
      }
      await queryIdbStats();
    } catch (idbErr) {
      console.warn("⚠️ IndexedDB block caching failure:", idbErr);
    }

    // 2. Queue in-memory state with full assets (making immediate UI visual state crisp)
    const newItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      quoteId,
      type,
      timestamp: new Date().toLocaleTimeString(),
      payload
    };

    const nextQueue = [...offlineSyncQueue, newItem];
    setOfflineSyncQueue(nextQueue);

    // 3. Serialize thin queue metadata to localStorage (subbing large strings with slim hashes)
    const thinQueue = nextQueue.map(item => {
      if (item.type === "signature_complete") {
        return {
          ...item,
          payload: {
            ...item.payload,
            clientSignature: "indexeddb_ref"
          }
        };
      }
      if (item.type === "photo_upload") {
        return {
          ...item,
          payload: {
            ...item.payload,
            beforePhotos: item.payload.beforePhotos?.map((p: string) => p.startsWith("data:") ? "indexeddb_ref" : p),
            afterPhotos: item.payload.afterPhotos?.map((p: string) => p.startsWith("data:") ? "indexeddb_ref" : p)
          }
        };
      }
      return item;
    });

    localStorage.setItem("aastaclean_offline_sync_queue", JSON.stringify(thinQueue));

    onTriggerLog({
      id: `offline_queue_${newItem.id}`,
      type: "system",
      status: "warning",
      message: `⚡ Offline SW Queue + IndexedDB: Cached "${logText}". Fully resilient to browser restarts!`,
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

  // Trigger Sync Queue Dispatch on browser window focus OR online connectivity state change
  useEffect(() => {
    const handleWindowFocus = () => {
      triggerSyncQueueDispatch();
    };
    const handleNetworkOnlineChange = () => {
      if (navigator.onLine && !isOffline) {
        onTriggerLog({
          id: `network_online_detect_${Date.now()}`,
          type: "system",
          status: "success",
          message: "📶 Network Status Change: Browser detected active online network state. Triggering safe silent background sync attempt with the dispatch server.",
          timestamp: new Date().toLocaleTimeString()
        });
        triggerSyncQueueDispatch();
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleNetworkOnlineChange);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleNetworkOnlineChange);
    };
  }, [triggerSyncQueueDispatch, isOffline, onTriggerLog]);

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

  // --- PHASE 2: SHIFT TIMER TICK effect ---
  useEffect(() => {
    let handle: any;
    if (shiftClockedIn) {
      handle = setInterval(() => {
        setShiftTotalSeconds((prev) => {
          const next = prev + 1;
          localStorage.setItem("aastaclean_shift_total_seconds", next.toString());
          return next;
        });
      }, 1000);
    }
    return () => {
      if (handle) clearInterval(handle);
    };
  }, [shiftClockedIn]);

  const handleShiftClockIn = () => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setShiftClockedIn(true);
    setShiftStartTime(nowStr);
    setShiftTotalSeconds(0);
    localStorage.setItem("aastaclean_shift_clocked_in", "true");
    localStorage.setItem("aastaclean_shift_start_time", nowStr);
    localStorage.setItem("aastaclean_shift_total_seconds", "0");

    onTriggerLog({
      id: `shift_clock_in_${Date.now()}`,
      type: "system",
      status: "success",
      message: `⏰ Shift Clock-In: ${activeCleanerName} registered their shift start at ${nowStr}!`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleShiftClockOut = () => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const elapsedHrs = Math.floor(shiftTotalSeconds / 3600);
    const elapsedMins = Math.floor((shiftTotalSeconds % 3600) / 60);
    const elapsedSecs = shiftTotalSeconds % 60;
    const readableDuration = `${elapsedHrs.toString().padStart(2, '0')}h:${elapsedMins.toString().padStart(2, '0')}m:${elapsedSecs.toString().padStart(2, '0')}s`;

    setShiftClockedIn(false);
    localStorage.setItem("aastaclean_shift_clocked_in", "false");

    onTriggerLog({
      id: `shift_clock_out_${Date.now()}`,
      type: "system",
      status: "warning",
      message: `⏰ Shift Clock-Out: ${activeCleanerName} clocked out at ${nowStr}. Total Shift duration: ${readableDuration}`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // --- PHASE 2: VISUAL CALENDAR GENERATION ALGORITHMS ---
  const handlePrevMonth = () => {
    setCalendarDate((prev) => {
      const newD = new Date(prev);
      newD.setMonth(newD.getMonth() - 1);
      return newD;
    });
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => {
      const newD = new Date(prev);
      newD.setMonth(newD.getMonth() + 1);
      return newD;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: Array<{ dayNum: number; dateString: string; isCurrentMonth: boolean }> = [];
    
    // We start week on Monday in Australia
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const paddingDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    for (let i = paddingDays - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({
        dayNum: prevMonthTotalDays - i,
        dateString: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      days.push({
        dayNum: i,
        dateString: currDate.toISOString().split('T')[0],
        isCurrentMonth: true
      });
    }
    
    const nextPadding = 42 - days.length;
    for (let i = 1; i <= nextPadding; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dayNum: i,
        dateString: nextDate.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getJobsForDate = (dateStr: string) => {
    return cleanerJobs.filter((job) => {
      const pDate = job.schedulingDetails?.preferredDate || (job.timestamp ? job.timestamp.split('T')[0] : "");
      return pDate === dateStr;
    });
  };



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
    } else if (parsedNameClean.includes("window") || parsedNameClean.includes("glass")) {
      foundMetadataKey = "window-cleaning";
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

  // --- OFFLINE/ONLINE CANVAS PHOTO ANNOTATION ENGINE SYSTEM HANDLERS ---
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleStartAnnotation = (imgUrl: string, onSaveCallback: (newUrl: string) => void) => {
    setAnnotatingPhoto({ imgUrl, onSaveCallback });
    setTextPosition(null);
    setTextInputVal("");
    setDrawHistory([]);
    
    // Load image onto Canvas after mounting
    setTimeout(() => {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        // Adjust canvas aspect to fit image in modern scale bound
        const maxW = 550;
        const maxH = 400;
        let w = img.width;
        let h = img.height;
        
        if (w > maxW) {
          h = (maxW / w) * h;
          w = maxW;
        }
        if (h > maxH) {
          w = (maxH / h) * w;
          h = maxH;
        }
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        // Save initial state to history stack
        setDrawHistory([canvas.toDataURL()]);
      };
      img.src = imgUrl;
    }, 150);
  };

  const handleCanvasStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (annotationTool === "text") {
      setTextPosition({ x, y });
      return;
    }

    setIsDrawingCanvas(true);
    setStartDrawingPos({ x, y });

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = annotationColor;
    ctx.lineWidth = annotationStrokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (annotationTool === "text" || !isDrawingCanvas || !startDrawingPos) return;
    e.preventDefault();

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (annotationTool === "brush") {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (annotationTool === "arrow") {
      // Draw arrow preview by clearing and drawing over previous history frame
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Draw custom arrow vector line
        ctx.beginPath();
        ctx.moveTo(startDrawingPos.x, startDrawingPos.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = annotationColor;
        ctx.lineWidth = annotationStrokeWidth;
        ctx.stroke();

        // Draw arrow head points
        const angle = Math.atan2(y - startDrawingPos.y, x - startDrawingPos.x);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12 * Math.cos(angle - Math.PI / 6), y - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - 12 * Math.cos(angle + Math.PI / 6), y - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = annotationColor;
        ctx.fill();
      };
      img.src = drawHistory[drawHistory.length - 1];
    }
  };

  const handleCanvasEnd = () => {
    if (!isDrawingCanvas) return;
    setIsDrawingCanvas(false);
    setStartDrawingPos(null);

    // Save active state frame to history stack
    const canvas = annotationCanvasRef.current;
    if (canvas) {
      setDrawHistory((prev) => [...prev, canvas.toDataURL()]);
    }
  };

  const handleAddTextBadge = () => {
    if (!textPosition || !textInputVal || !annotationCanvasRef.current) return;
    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = annotationColor;
    
    // Draw solid text highlight container first
    const metric = ctx.measureText(textInputVal);
    const bgW = metric.width + 12;
    const bgH = 20;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(textPosition.x - bgW / 2, textPosition.y - bgH / 2 - 4, bgW, bgH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = annotationColor;
    ctx.strokeRect(textPosition.x - bgW / 2, textPosition.y - bgH / 2 - 4, bgW, bgH);

    // Render foreground text label
    ctx.fillStyle = annotationColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textInputVal, textPosition.x, textPosition.y - 4);

    // Save stateframe
    setDrawHistory((prev) => [...prev, canvas.toDataURL()]);
    setTextPosition(null);
    setTextInputVal("");
  };

  const handleUndo = () => {
    if (drawHistory.length <= 1) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hist = [...drawHistory];
    hist.pop(); // Remove last frame
    setDrawHistory(hist);

    const prevFrame = hist[hist.length - 1];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevFrame;
  };

  const handleSaveAnnotatedPhoto = (dataUrl: string) => {
    if (annotatingPhoto?.onSaveCallback) {
      annotatingPhoto.onSaveCallback(dataUrl);
    }
    setAnnotatingPhoto(null);
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

  // Bulk status update action to update select job statuses statefully
  const handleBulkUpdateStatus = (nextStatus: "completed" | "en-route") => {
    if (selectedJobIds.length === 0) return;

    selectedJobIds.forEach((quoteId) => {
      const job = projectedQuotes.find((q) => q.id === quoteId);
      if (!job) return;

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
          message: `📲 Bulk Roster Sync: Updated job status of "#${quoteId.slice(-6)}" to [${nextStatus?.toUpperCase()}]`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    onTriggerLog({
      id: Math.random().toString(),
      type: "system",
      status: "success",
      message: `⚡ Bulk Operation: Aligned and updated status of ${selectedJobIds.length} job(s) to [${nextStatus.toUpperCase()}]`,
      timestamp: new Date().toLocaleTimeString(),
    });

    setSelectedJobIds([]);
  };

  const downloadGpsTelemetry = (jobId: string, suburbName: string) => {
    const logs = gpsTelemetryHistory[jobId] || [];
    
    // Generate JSON document payload
    const payload = {
      technicianName: activeCleanerName,
      jobId: jobId,
      destinationSuburb: suburbName,
      extractedAt: new Date().toISOString(),
      telemetryRecordsCount: logs.length,
      logs: logs.map((log: any, index: number) => ({
        index: index + 1,
        lat: Number(log.lat.toFixed(6)),
        lng: Number(log.lng.toFixed(6)),
        bearing: Number(log.bearing.toFixed(2)),
        timestamp: log.timestamp,
        phase: log.bookingStatus
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aastaclean_gps_telem_job_${jobId.slice(-6).toUpperCase()}_${suburbName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onTriggerLog({
      id: `gps_download_${jobId}_${Date.now()}`,
      type: "system",
      status: "success",
      message: `📥 GPS telemetry logs exported successfully for Job #${jobId.slice(-6).toUpperCase()} (${logs.length} data points exported).`,
      timestamp: new Date().toLocaleTimeString()
    });
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

  const triggerDailySummaryReport = async (finalJob: any, signatureDataUrl: string) => {
    setReportDispatchActive(true);
    setReportFinished(false);
    setReportDispatchProgress(10);
    setReportStepsLog(["🎒 Helper Bot: Starting your final shift report task!"]);
    
    // Step 1: Gathering Job Cards
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setReportDispatchProgress(25);
    setReportStepsLog(prev => [
      ...prev, 
      `🔍 Step 1: Gathering all completed job cards for Lead Cleaner: ${activeCleanerName}...`
    ]);
    
    // Let's find all completed jobs that have been finished
    const activeCleanerJobs = projectedQuotes.filter(
      q => q.assignedCleaner === activeCleanerName
    );
    
    // Map existing completed jobs plus this final job
    const completedJobs = activeCleanerJobs.map(q => 
      q.id === finalJob.id ? { ...q, bookingStatus: "completed" as const, clientSignature: signatureDataUrl } : q
    ).filter(q => q.bookingStatus === "completed" || q.id === finalJob.id);

    // Step 2: Creating a beautiful report draft
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setReportDispatchProgress(50);
    setReportStepsLog(prev => [
      ...prev,
      `📝 Step 2: Drafting the shift report card with ${completedJobs.length} completed job assignments!`
    ]);

    // Let's render the PDF!
    let pdfUrl = "";
    const pdfFileName = `AASTACLEAN_Daily_Summary_${activeCleanerName.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.pdf`;
    try {
      const doc = new jsPDF();
      
      const slateDark = [15, 23, 42];  
      const emeraldGreen = [16, 185, 129]; 
      
      // Banner Border (Top)
      doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.rect(0, 0, 210, 15, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text("DAILY SHIFT HANDOVER REPORT", 14, 32);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Professional Cleaning Operations Panel Summary", 14, 38);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 42, 196, 42);
      
      // Shift Information Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 46, 182, 32, "F");
      doc.setDrawColor(241, 245, 249);
      doc.rect(14, 46, 182, 32, "D");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text("SHIFT & CREW METRICS", 20, 53);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Lead Cleaner:      ${activeCleanerName}`, 20, 60);
      doc.text(`Date of Shift:     ${new Date().toLocaleDateString()}`, 20, 66);
      doc.text(`Report Ref ID:     #REP-${Math.floor(100000 + Math.random() * 900000)}`, 20, 72);
      
      doc.text(`Total Tasks Done:  ${completedJobs.length} Job Assignments`, 110, 60);
      doc.text(`Zoning Office:     Perth Cleaning Guild Hub`, 110, 66);
      doc.text(`Security Protocol: Locked & Verified`, 110, 72);
      
      // Section: Completed Jobs Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text("DETAILED JOB LOGS", 14, 88);
      
      let yOffset = 95;
      
      completedJobs.forEach((job, index) => {
        if (yOffset > 220) {
          doc.addPage();
          yOffset = 25;
        }
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, yOffset, 182, 45, "D");
        
        doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
        doc.rect(16, yOffset + 3, 16, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`JOB #${index + 1}`, 18, yOffset + 6.5);
        
        doc.setFontSize(11);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text(`${job.serviceName} - Job ID #${job.id.slice(-6)}`, 36, yOffset + 7);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Customer Address: ${job.suburb || "Perth Hub"} (${job.postcode || "6000"})`, 18, yOffset + 15);
        
        const tasks = getSubtasksForService(job.serviceName);
        const subList = completedSubtasks[job.id] || [];
        doc.text(`Verified Subtasks: ${subList.length} of ${tasks.length} tasks completed`, 18, yOffset + 21);
        
        const start = timers[job.id]?.startTime || job.siteArrivalTime || "09:00 AM";
        const end = job.siteDepartureTime || "11:30 AM";
        const duration = job.actualSiteMinutes || (timers[job.id] ? Math.round(timers[job.id].seconds / 60) : 150);
        doc.text(`Shift Timings: Site Arrival ${start} | Departure ${end} (${duration} mins)`, 18, yOffset + 27);
        
        if (job.clientSignature || signatureDataUrl) {
          doc.text("Signed Off by Client:", 135, yOffset + 15);
          try {
            doc.addImage(job.clientSignature || signatureDataUrl, "PNG", 135, yOffset + 18, 45, 15);
          } catch (e) {
            doc.setFontSize(7.5);
            doc.text("[Signature Image Taped]", 135, yOffset + 22);
          }
        } else {
          doc.text("Status: Electronic ISO Signed Off", 135, yOffset + 21);
        }
        
        yOffset += 52;
      });

      if (yOffset > 240) {
        doc.addPage();
        yOffset = 25;
      }
      
      doc.setFillColor(240, 253, 250);
      doc.rect(14, yOffset, 182, 22, "F");
      doc.setDrawColor(204, 251, 241);
      doc.rect(14, yOffset, 182, 22, "D");
      
      doc.setTextColor(4, 120, 87);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("ISO-9001 COMPLIANCE CERTIFICATION OF WORKS", 20, yOffset + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text("We hereby audit and certify that the requested maintenance, sanitization, and safety checks on all listed properties", 20, yOffset + 11);
      doc.text("have been completed in full, backed up by physical on-site photographic & signatures validation logs.", 20, yOffset + 15);
      
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Cleaner Representative Signature:", 14, yOffset + 35);
      doc.line(14, yOffset + 44, 75, yOffset + 44);
      doc.text(activeCleanerName, 14, yOffset + 48);
      
      doc.text("Verified Audit Authority Stamp:", 120, yOffset + 35);
      doc.line(120, yOffset + 44, 185, yOffset + 44);
      doc.text("AASTACLEAN PERTH DEPLOYMENT OFFICE", 120, yOffset + 48);
      
      const blob = doc.output("blob");
      pdfUrl = URL.createObjectURL(blob);
      setGeneratedPdfBlobUrl(pdfUrl);
      setGeneratedPdfName(pdfFileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setReportStepsLog(prev => [...prev, "❌ Error writing PDF data: " + err]);
    }

    // Step 3: Compiling signatures & pictures
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setReportDispatchProgress(75);
    setReportStepsLog(prev => [
      ...prev, 
      `🎨 Step 3: Success! Rendered official shift PDF report document: ${pdfFileName}`
    ]);

    // Step 4: Transmitting simulated email
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setReportDispatchProgress(90);
    setReportStepsLog(prev => [
      ...prev, 
      "📨 Step 4: Transmitting verified secure email stream with PDF attachment to: admin@aastaclean.com.au"
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setReportDispatchProgress(100);
    setReportFinished(true);
    setReportStepsLog(prev => [
      ...prev, 
      "🎉 Step 5: Email transmission success! Fully synced with Administrator Panel databases. Invoice references locked."
    ]);

    onTriggerLog({
      id: Math.random().toString(),
      type: "system",
      status: "success",
      message: `📨 PDF Summary Report Generated & Emailed successfully for ${activeCleanerName}! file: ${pdfFileName}`,
      timestamp: new Date().toLocaleTimeString()
    });
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

      // Check if this was the last remaining uncompleted job on their roster
      const activeCleanerJobs = projectedQuotes.filter(q => q.assignedCleaner === activeCleanerName);
      const incompleteJobs = activeCleanerJobs.filter(q => q.id !== quoteId && q.bookingStatus !== "completed");
      const isFinalShiftTask = incompleteJobs.length === 0;

      if (isFinalShiftTask) {
        triggerDailySummaryReport(job, signatureDataUrl);
      }
    }

    setSigningJobId(null);
  };

  const handleTaskPhotoUpload = async (quoteId: string, taskName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const currentList = subtaskPhotos[quoteId]?.[taskName] || [];
    if (currentList.length >= 5) {
      alert("⚠️ Compliance Alert: Maximum of 5 audit evidence photos permitted per subtask checklist item.");
      return;
    }

    onTriggerLog({
      id: `task_compression_${Date.now()}`,
      type: "system",
      status: "warning",
      message: `⚡ Task Photo Optimization: Initiating client-side quality scale & canvas compression on checklist item "${taskName.substring(0, 15)}..."`,
      timestamp: new Date().toLocaleTimeString()
    });

    const file = files[0];
    try {
      const base64Raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => resolve(uploadEvent.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file as Blob);
      });

      const compressed = await compressImageBase64(base64Raw, 800, 800, 0.7);
      await saveTaskPhotoInDB(quoteId, taskName, compressed);

      const updatedPhotos = await getAllTaskPhotosForQuote(quoteId);
      setSubtaskPhotos(prev => ({
        ...prev,
        [quoteId]: updatedPhotos
      }));

      onTriggerLog({
        id: `task_photo_success_${Date.now()}`,
        type: "system",
        status: "success",
        message: `📸 Checklist Evidence: Added 1 compressed photo specifically for task "${taskName}" on Job #${quoteId.slice(-6)}. Total: ${updatedPhotos[taskName]?.length || 1}/5.`,
        timestamp: new Date().toLocaleTimeString()
      });

      await queryIdbStats();

    } catch (err) {
      console.error("Subtask photo processing failure:", err);
      onTriggerLog({
        id: `task_photo_error_${Date.now()}`,
        type: "system",
        status: "danger",
        message: `⚠️ Subtask Evidence Error: Failed to compress or store photo for task "${taskName}". Details: ${err}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleTaskPhotoDelete = async (quoteId: string, taskName: string, photoIndex: number) => {
    try {
      const db = await openOfflineDB();
      const transaction = db.transaction("photos", "readwrite");
      const store = transaction.objectStore("photos");
      
      let matchedCount = 0;
      let targetId = "";
      
      const request = store.openCursor();
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const value = cursor.value;
            if (value.quoteId === quoteId && value.type === `task_${taskName}`) {
              if (matchedCount === photoIndex) {
                 targetId = value.id;
              }
              matchedCount++;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });

      if (targetId) {
        await deletePhotoFromDB(targetId);
        
        const updatedPhotos = await getAllTaskPhotosForQuote(quoteId);
        setSubtaskPhotos(prev => ({
          ...prev,
          [quoteId]: updatedPhotos
        }));

        onTriggerLog({
          id: `task_photo_delete_${Date.now()}`,
          type: "system",
          status: "info",
          message: `🗑️ Checklist Evidence Removed: Deleted evidence photo for subtask "${taskName}" index #${photoIndex} on Job #${quoteId.slice(-6)}.`,
          timestamp: new Date().toLocaleTimeString()
        });

        await queryIdbStats();
      }
    } catch (err) {
      console.warn("Subtask photo deletion failure:", err);
    }
  };

  const handlePhotoUpload = async (quoteId: string, type: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job) return;
    
    const maxPhotos = 15;
    const currentPhotos = type === "before" ? (job.beforePhotos || []) : (job.afterPhotos || []);
    
    const allowedCount = Math.max(0, maxPhotos - currentPhotos.length);
    const filesToUpload = Array.from(files).slice(0, allowedCount);
    
    if (filesToUpload.length === 0) {
      alert(`Photo limit reached! You can upload up to 15 photos for this stream.`);
      return;
    }

    onTriggerLog({
      id: `compression_start_${Date.now()}`,
      type: "system",
      status: "warning",
      message: `⚡ Compression Active: Initializing asynchronous, client-side dynamic footprint optimization on ${filesToUpload.length} selected asset photo(s)...`,
      timestamp: new Date().toLocaleTimeString()
    });

    const nextPhotos = [...currentPhotos];

    for (let f = 0; f < filesToUpload.length; f++) {
      const file = filesToUpload[f];
      try {
        const base64Raw = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => resolve(uploadEvent.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file as Blob);
        });

        const compressed = await compressImageBase64(base64Raw);
        nextPhotos.push(compressed);
      } catch (err) {
        console.warn("Could not read or compress file, resorting to fallback raw size:", err);
      }
    }

    const payload = {
      [type === "before" ? "beforePhotos" : "afterPhotos"]: nextPhotos
    };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, ...payload } : q));
      queueOfflineAction(
        quoteId,
        "photo_upload",
        payload,
        `Uploaded ${filesToUpload.length} compressed photos under [${type.toUpperCase()}] stream`
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
        message: `📸 Concurrent uploads: Compressed & optimized ${filesToUpload.length} new photos in [${type.toUpperCase()}] stream for Job #${quoteId.slice(-6)} (Total: ${nextPhotos.length}/15)`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleSendTeamNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    const newNote = {
      id: `chat_${Date.now()}`,
      sender: activeCleaner?.name || "System Dispatch",
      message: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...teamNotes, newNote];
    setTeamNotes(updated);
    localStorage.setItem("aastaclean_team_chat_notes", JSON.stringify(updated));
    setChatInputText("");
    
    onTriggerLog({
      id: Math.random().toString(),
      type: "system",
      status: "success",
      message: `💬 Handover notes update: Team dispatch notice added by "${activeCleaner?.name}" successfully.`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleDragStart = (jobId: string, clientX: number) => {
    setActiveDragJob({ id: jobId, startX: clientX });
  };

  const handleDragMove = (clientX: number) => {
    if (!activeDragJob) return;
    const offset = Math.max(0, Math.min(220, clientX - activeDragJob.startX));
    setDragOffsets(prev => ({ ...prev, [activeDragJob.id]: offset }));
  };

  const handleDragEnd = (jobId: string, targetStatus: string, onTrigger: () => void) => {
    if (!activeDragJob || activeDragJob.id !== jobId) return;
    const currentOffset = dragOffsets[jobId] || 0;
    
    if (currentOffset >= 150) {
      onTrigger();
      onTriggerLog({
        id: Math.random().toString(),
        type: "system",
        status: "success",
        message: `📱 Tactile Gesture: Seamless swipe gesture completed for Job ID #${jobId.slice(-6)} - transition triggered!`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setDragOffsets(prev => ({ ...prev, [jobId]: 0 }));
    setActiveDragJob(null);
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

  const handleBulkDeletePhotos = (jobId: string) => {
    if (selectedPhotosToDelete.length === 0) return;

    const job = projectedQuotes.find((q) => q.id === jobId);
    if (!job) return;

    // Separate deletion list by category
    const beforeIndices = selectedPhotosToDelete.filter((x) => x.type === "before").map((x) => x.index);
    const afterIndices = selectedPhotosToDelete.filter((x) => x.type === "after").map((x) => x.index);

    const updatedBefore = (job.beforePhotos || []).filter((_, i) => !beforeIndices.includes(i));
    const updatedAfter = (job.afterPhotos || []).filter((_, i) => !afterIndices.includes(i));

    const payload = {
      beforePhotos: updatedBefore,
      afterPhotos: updatedAfter
    };

    if (isOffline) {
      setProjectedQuotes(prev => prev.map(q => q.id === jobId ? { ...q, ...payload } : q));
      queueOfflineAction(
        jobId,
        "photo_upload",
        payload,
        `Bulk deleted ${selectedPhotosToDelete.length} locally cached photos`
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
        message: `🗑️ Bulk Asset Clearing: Removed ${selectedPhotosToDelete.length} file(s) from Job #${jobId.slice(-6)} media stack`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setSelectedPhotosToDelete([]);
  };

  const appendPhotoToZip = async (zip: JSZip, img: string, baseFilename: string) => {
    if (img.startsWith("data:")) {
      const parts = img.split(",");
      if (parts.length < 2) return;
      const base64Data = parts[1];
      const mimeMatch = img.match(/^data:(image\/[a-zA-Z+-\.]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      const fileExt = mimeType.split("/")[1] || "png";
      zip.file(`${baseFilename}.${fileExt}`, base64Data, { base64: true });
    } else {
      try {
        const response = await fetch(img, { referrerPolicy: "no-referrer" });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const buffer = await response.arrayBuffer();
        
        let fileExt = "jpg";
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.startsWith("image/")) {
          fileExt = contentType.split("/")[1] || "jpg";
        } else {
          const urlMatch = img.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
          if (urlMatch) {
            fileExt = urlMatch[1];
          }
        }
        zip.file(`${baseFilename}.${fileExt}`, buffer);
      } catch (err) {
        console.warn(`Could not load external image ${img} over internet:`, err);
        zip.file(`${baseFilename}_load_error.txt`, `Image could not be retrieved dynamically during offline mode or due to server headers restriction. URL: ${img}`);
      }
    }
  };

  const handleDownloadAllPhotos = async (quoteId: string) => {
    const job = projectedQuotes.find((q) => q.id === quoteId);
    if (!job) return;

    const beforePhotos = job.beforePhotos || [];
    const afterPhotos = job.afterPhotos || [];
    if (beforePhotos.length === 0 && afterPhotos.length === 0) {
      onTriggerLog({
        id: `zip_error_${Date.now()}`,
        type: "system",
        status: "error",
        message: "⚠️ ZIP Download: No pre-op or post-op evidence photos exist to package for this job.",
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }

    setIsZipping((prev) => ({ ...prev, [quoteId]: true }));

    try {
      const zip = new JSZip();
      
      onTriggerLog({
        id: `zip_start_${Date.now()}`,
        type: "system",
        status: "info",
        message: `📦 Bundling visual evidence for Job #${quoteId.slice(-6)} into ZIP. Loading assets...`,
        timestamp: new Date().toLocaleTimeString()
      });

      // 1. Process Before photos
      for (let i = 0; i < beforePhotos.length; i++) {
        const img = beforePhotos[i];
        const filename = `before_evidence_${i + 1}`;
        await appendPhotoToZip(zip, img, filename);
      }

      // 2. Process After photos
      for (let i = 0; i < afterPhotos.length; i++) {
        const img = afterPhotos[i];
        const filename = `after_evidence_${i + 1}`;
        await appendPhotoToZip(zip, img, filename);
      }

      // 3. Generate ZIP as Blob
      const zipContent = await zip.generateAsync({ type: "blob" });

      // 4. Download file
      const downloadUrl = URL.createObjectURL(zipContent);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Job_${quoteId.slice(-6)}_Evidence_Archive.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      onTriggerLog({
        id: `zip_success_${Date.now()}`,
        type: "system",
        status: "success",
        message: `✅ ZIP Archive created successfully: Job_${quoteId.slice(-6)}_Evidence_Archive.zip has been generated.`,
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (err: any) {
      console.error("Failed to generate ZIP archive:", err);
      onTriggerLog({
        id: `zip_error_${Date.now()}`,
        type: "system",
        status: "error",
        message: `❌ ZIP compilation failed: ${err.message || "An unexpected error occurred."}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsZipping((prev) => ({ ...prev, [quoteId]: false }));
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

  const themeSyncStatusLabel = daylightHighContrast
    ? (isWebOnline 
        ? "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 border-2 border-black font-black uppercase text-black bg-white"
        : "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 border-2 border-red-605 font-black uppercase text-red-700 bg-white"
      )
    : (isWebOnline
        ? "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase tracking-wider font-mono shadow-sm"
        : "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-bold uppercase tracking-wider font-mono shadow-sm"
      );

  return (
    <section id="cleaners-app" className={themeSectionClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Title Block with cleaner choice dropdown */}
        <div className={themeHeaderBorder}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={themeLabelMuted}>
                Portals & Dispatch Hub
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              
              <div className={themeSyncStatusLabel}>
                {isWebOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sync Status: Online</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Sync Status: Disconnected</span>
                  </>
                )}
              </div>
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
        <div className={`p-4 border font-mono text-xs flex flex-col gap-4 transition-all ${
          daylightHighContrast 
            ? "bg-white border-4 border-black text-black" 
            : isOffline
              ? "bg-amber-950/20 border-amber-500/20 text-amber-300 rounded-2xl"
              : "bg-slate-900/60 border-slate-850 text-slate-300 rounded-2xl"
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                isOffline 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-505 animate-pulse" 
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                {isOffline ? <WifiOff className="w-5 h-5 animate-pulse" /> : <Wifi className="w-5 h-5" />}
              </div>
              
              <div className="space-y-0.5 border-none">
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

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 border-none">
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
              <div className={`p-2 px-3 border rounded-xl flex items-center gap-2 transition-all duration-300 ${
                offlineSyncQueue.length > 5
                  ? "bg-rose-500/20 border-rose-500 text-rose-550 font-extrabold animate-pulse ring-2 ring-rose-500/30"
                  : offlineSyncQueue.length > 0 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-505 font-extrabold animate-pulse" 
                    : daylightHighContrast 
                      ? "bg-zinc-100 border-black text-black" 
                      : "bg-slate-950 border-slate-850 text-slate-500"
              }`}>
                <RefreshCw className={`w-3.5 h-3.5 ${offlineSyncQueue.length > 0 ? "animate-spin" : ""} ${offlineSyncQueue.length > 5 ? "text-rose-500 animate-bounce" : ""}`} />
                <span className="text-[10px] tracking-wide uppercase font-mono">
                  {offlineSyncQueue.length > 5 ? "⚠️ BACKLOG: " : "QUEUE: "}{offlineSyncQueue.length} PENDING
                </span>
              </div>

              {/* IndexedDB Disk Footprint Indicator */}
              {idbStats && (idbStats.signatures > 0 || idbStats.photos > 0) && (
                <div className={`p-2 px-3 border rounded-xl flex items-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase font-mono">
                    IndexedDB: {idbStats.sizeFormatted} Archived
                  </span>
                </div>
              )}

              {/* Team Communications button */}
              <button
                type="button"
                onClick={() => setIsTeamChatOpen(true)}
                className={`p-2 px-3.5 font-bold uppercase text-[10px] rounded-xl cursor-pointer border shadow transition-all flex items-center gap-1.5 ${
                  daylightHighContrast
                    ? "bg-white text-black hover:bg-zinc-100 border-black font-black"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md hover:shadow-indigo-500/20"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 animate-pulse text-purple-200" /> Crew Handover Chat
              </button>

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

          {/* Sync History element inside the banner card */}
          {syncHistory.length > 0 && (
            <div className={`mt-2 pt-3.5 border-t border-dashed w-full ${
              daylightHighContrast ? "border-black/55" : "border-slate-800/80"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] uppercase font-black tracking-widest ${
                  daylightHighContrast ? "text-black" : "text-emerald-400"
                }`}>
                  🔄 Service Worker Sync History Logs (Last 5 Sessions)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSyncHistory([]);
                    localStorage.removeItem("aastaclean_sync_history");
                  }}
                  className={`text-[9px] uppercase tracking-wider font-bold hover:underline ${
                    daylightHighContrast ? "text-slate-800" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Clear Logs
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {syncHistory.map((session) => (
                  <div 
                    key={session.id}
                    className={`p-2.5 rounded-xl border text-[10.5px] leading-relaxed transition-all flex flex-col justify-between ${
                      daylightHighContrast
                        ? "bg-zinc-50 border-black text-black"
                        : "bg-slate-950/80 border-slate-850 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1 bg-transparent gap-1">
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1 text-[9.5px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {session.timestamp}
                        </span>
                        <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                          daylightHighContrast ? "bg-zinc-200 text-black border border-black" : "bg-slate-900 text-slate-400"
                        }`}>
                          {session.transactionCount} Recs
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed font-sans font-medium text-slate-400">
                        {session.description}
                      </p>
                    </div>
                    {session.details && session.details.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-900 space-y-0.5 text-[8.5px] font-mono text-slate-500 overflow-hidden text-ellipsis max-h-12">
                        {session.details.slice(0, 3).map((detail: string, dIdx: number) => (
                          <div key={dIdx} className="truncate">
                            ✓ {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeCleaner ? (
          <div className="space-y-6">
            
            {/* GLOBAL SHIFT CLOCKING SYSTEM BAR & VIEW SELECTOR */}
            <div className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-5 ${
              daylightHighContrast
                ? "bg-zinc-50 border-2 border-black text-black"
                : "bg-slate-950/80 border-slate-805 text-white shadow-xl backdrop-blur-md"
            }`}>
              <div className="flex items-center gap-4 flex-1">
                {/* Micro pulsating status lamp */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    shiftClockedIn 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}>
                    <Clock className={`w-6 h-6 ${shiftClockedIn ? "animate-spin-slow" : ""}`} />
                  </div>
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${
                    daylightHighContrast ? "border-zinc-100" : "border-slate-950"
                  } ${
                    shiftClockedIn ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-500">Global Shift Manager</span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                      shiftClockedIn ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-500"
                    }`}>
                      {shiftClockedIn ? "● Shift Active" : "● Off Shift"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {shiftClockedIn ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black font-mono tracking-tight text-white select-none">
                          {(() => {
                            const h = Math.floor(shiftTotalSeconds / 3600);
                            const m = Math.floor((shiftTotalSeconds % 3600) / 60);
                            const s = shiftTotalSeconds % 60;
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Elapsed Shift</span>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">Your daily shift time is currently paused. Please Clock In to activate tracking.</p>
                    )}
                  </div>
                  {shiftClockedIn && shiftStartTime && (
                    <p className="text-[9px] text-slate-500 font-mono">Shift started at: {shiftStartTime}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons & View Segment Tracker */}
              <div className="flex flex-wrap items-center gap-3 md:justify-end shrink-0">
                <div className="flex items-center gap-2">
                  {!shiftClockedIn ? (
                    <button
                      type="button"
                      onClick={handleShiftClockIn}
                      className="px-4 py-2 bg-emerald-650 hover:bg-emerald-555 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer leading-none shadow-md shadow-emerald-700/10 shrink-0 border-none"
                    >
                      Clock-In Shift
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleShiftClockOut}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer leading-none shadow-md shadow-rose-700/10 shrink-0 border-none"
                    >
                      Clock-Out Shift
                    </button>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-800 hidden sm:block mx-1" />

                {/* Segmented layout switcher tabs */}
                <div className={`p-0.5 rounded-xl border flex items-center overflow-hidden ${
                  daylightHighContrast ? "bg-white border-black" : "bg-slate-900 border-slate-850"
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewTab("list")}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewTab === "list"
                        ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white")
                        : (daylightHighContrast ? "bg-white hover:bg-zinc-100 text-black font-extrabold" : "bg-transparent text-slate-400 hover:text-slate-200")
                    }`}
                  >
                    Roster Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("calendar")}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      viewTab === "calendar"
                        ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white")
                        : (daylightHighContrast ? "bg-white hover:bg-zinc-100 text-black font-extrabold" : "bg-transparent text-slate-400 hover:text-slate-200")
                    }`}
                  >
                    Roster Calendar
                  </button>
                </div>
              </div>
            </div>

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
                  <span className={`text-[9.5px] font-black uppercase block ${daylightHighContrast ? "text-black text-xs font-black" : "text-slate-400"}`}>Accrued Pay</span>
                  <span className={`text-base font-black block ${daylightHighContrast ? "text-black underline font-black" : "text-emerald-400"}`}>${totalEarnings}</span>
                </div>
                <div className={themeTodayStatsInner}>
                  <span className={`text-[9.5px] font-black uppercase block ${daylightHighContrast ? "text-black text-xs font-black" : "text-slate-400"}`}>Done</span>
                  <span className={`text-base font-black block ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>{completedCount}</span>
                </div>
                <div className={themeTodayStatsInner}>
                  <span className={`text-[9.5px] font-black uppercase block ${daylightHighContrast ? "text-black text-xs font-black" : "text-slate-400"}`}>Pnd/Act</span>
                  <span className={`text-base font-black block ${daylightHighContrast ? "text-black font-black" : "text-indigo-400"}`}>{activeCount}</span>
                </div>
              </div>

              {/* Sparkline chart visually mapping Accrued Pay Trend */}
              <div id="cleaners-app-sparkline" className={`p-3 rounded-2xl border ${daylightHighContrast ? "bg-zinc-100 border-black text-black" : "bg-slate-950 border-slate-850"}`}>
                <div className="flex justify-between items-center text-[10px] font-bold tracking-wider mb-2">
                  <span className={daylightHighContrast ? "text-black" : "text-slate-400 uppercase"}>Accrued Pay Trend (7d)</span>
                  <span className={daylightHighContrast ? "text-black font-black" : "text-emerald-400 font-mono"}>+{(totalEarnings > 0 ? 15 : 0)}% wk</span>
                </div>
                <div className="h-10 w-full flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0,25 Q 25,${25 - (totalEarnings * 0.05)} 50,${20 - (totalEarnings * 0.04)} 75,${28 - (totalEarnings * 0.02)} 100,${Math.max(5, 30 - (totalEarnings * 0.07))}`}
                      fill="none"
                      stroke={daylightHighContrast ? "#000" : "#10b981"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 0,25 Q 25,${25 - (totalEarnings * 0.05)} 50,${20 - (totalEarnings * 0.04)} 75,${28 - (totalEarnings * 0.02)} 100,${Math.max(5, 30 - (totalEarnings * 0.07))} L 100,30 L 0,30 Z`}
                      fill="url(#sparklineGrad)"
                      stroke="none"
                    />
                    <circle
                      cx="100"
                      cy={Math.max(5, 30 - (totalEarnings * 0.07))}
                      r="3"
                      fill={daylightHighContrast ? "#000" : "#34d399"}
                      className="animate-ping"
                      style={{ transformOrigin: "100px center" }}
                    />
                    <circle
                      cx="100"
                      cy={Math.max(5, 30 - (totalEarnings * 0.07))}
                      r="2"
                      fill={daylightHighContrast ? "#000" : "#059669"}
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1 font-bold">
                  <span>MON $80</span>
                  <span>WED $220</span>
                  <span>TODAY ${totalEarnings}</span>
                </div>
              </div>

              {/* 🚚 VAN INVENTORY MANAGEMENT SYSTEM */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition-all ${
                daylightHighContrast 
                  ? "bg-zinc-100 border-black text-black" 
                  : "bg-slate-950 border-slate-850"
              }`}>
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-800">
                  <div>
                    <span className={`text-[9px] uppercase font-bold text-indigo-400 block tracking-widest ${daylightHighContrast ? "text-zinc-650 font-black" : ""}`}>Mobile Assets</span>
                    <h4 className={`text-xs font-semibold ${daylightHighContrast ? "text-black font-black" : "text-white"} flex items-center gap-1.5`}>
                      <Truck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Van Supply Inventory</span>
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => reorderAllLowItems(activeCleaner ? activeCleaner.name : "")}
                      className={`text-[9px] font-black p-1 px-2 rounded border transition-all uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                        daylightHighContrast 
                          ? "bg-black text-white hover:bg-zinc-900 border-[#000]" 
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                      title="Instantly trigger reorders and restore low stock levels"
                    >
                      Restock Low
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddInvForm(!showAddInvForm)}
                      className={`text-[11px] font-black w-5 h-5 rounded border transition-all flex items-center justify-center cursor-pointer ${
                        daylightHighContrast
                          ? "bg-black text-white border-black"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                      }`}
                    >
                      {showAddInvForm ? "×" : "+"}
                    </button>
                  </div>
                </div>

                {/* Optional Inventory Custom Item Addition Drawer */}
                {showAddInvForm && (
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    daylightHighContrast 
                      ? "bg-white border-black" 
                      : "bg-slate-900/50 border-slate-800"
                  }`}>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold block">Supply Name</label>
                        <input
                          type="text"
                          value={newInvName}
                          onChange={(e) => setNewInvName(e.target.value)}
                          placeholder="e.g. Mask Respirators"
                          className={`w-full px-2 py-1 rounded text-[10px] ${
                            daylightHighContrast 
                              ? "bg-zinc-200 border border-black text-black" 
                              : "bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold block">Category</label>
                        <select
                          value={newInvCategory}
                          onChange={(e) => setNewInvCategory(e.target.value)}
                          className={`w-full px-2 py-1 rounded text-[10px] ${
                            daylightHighContrast 
                              ? "bg-zinc-200 border border-black text-black" 
                              : "bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                          }`}
                        >
                          <option value="Chemicals">Chemicals</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Supplies">Supplies</option>
                          <option value="PPE">PPE</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold block">Stock At Hand</label>
                        <input
                          type="number"
                          value={newInvQty}
                          min={0}
                          onChange={(e) => setNewInvQty(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-full px-2 py-1 rounded text-[10px] ${
                            daylightHighContrast 
                              ? "bg-zinc-200 border border-black text-black" 
                              : "bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold block">Order Threshold</label>
                        <input
                          type="number"
                          value={newInvMinQty}
                          min={0}
                          onChange={(e) => setNewInvMinQty(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-full px-2 py-1 rounded text-[10px] ${
                            daylightHighContrast 
                              ? "bg-zinc-200 border border-black text-black" 
                              : "bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold block">Unit Metric</label>
                        <input
                          type="text"
                          value={newInvUnit}
                          onChange={(e) => setNewInvUnit(e.target.value)}
                          placeholder="e.g. bottles"
                          className={`w-full px-2 py-1 rounded text-[10px] ${
                            daylightHighContrast 
                              ? "bg-zinc-200 border border-black text-black" 
                              : "bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => addInventoryItem(activeCleaner ? activeCleaner.name : "")}
                      className={`w-full py-1.5 rounded transition-all text-[9.5px] font-bold uppercase cursor-pointer ${
                        daylightHighContrast 
                          ? "bg-black text-white" 
                          : "bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold"
                      }`}
                    >
                      Provision Asset Item
                    </button>
                  </div>
                )}

                {/* Supply Stock List with Reorder Required Warning Flags */}
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {getCleanerInventory(activeCleaner ? activeCleaner.name : "").map((item) => {
                    const isLow = item.qty <= item.minQty;
                    const fillPercent = Math.min(100, Math.round((item.qty / (item.maxQty || 20)) * 100));

                    return (
                      <div 
                        key={item.id} 
                        className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          isLow 
                            ? (daylightHighContrast ? "bg-amber-50 border-amber-500 animate-low-stock-pulse" : "bg-red-950/20 border-red-500/50 animate-low-stock-pulse")
                            : (daylightHighContrast ? "bg-white border-zinc-200" : "bg-slate-900/40 border-slate-800/80")
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10.5px] font-bold ${daylightHighContrast ? "text-black" : "text-slate-100"}`}>
                                {item.name}
                              </span>
                              <span className={`text-[7px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                item.category === "Chemicals" ? "bg-teal-500/10 text-teal-400" :
                                item.category === "Hardware" ? "bg-amber-500/10 text-amber-400" :
                                "bg-indigo-500/10 text-indigo-400"
                              }`}>
                                {item.category}
                              </span>
                              {isLow && (
                                <span className="text-[7.5px] px-1.5 py-0.2 rounded font-black uppercase bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse shrink-0">
                                  🚨 LOW STOCK
                                </span>
                              )}
                            </div>
                            
                            <span className="text-[8px] text-slate-400 font-bold uppercase font-mono block">
                              Manning Unit load: {item.qty} / {item.maxQty || 20} {item.unit}
                            </span>

                            {/* Dynamic Threshold setting controls */}
                            <div className="flex items-center gap-1.5 mt-1 select-none">
                              <span className="text-[8px] text-slate-505 font-bold uppercase tracking-wider font-mono">
                                Order Trigger Limit:
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={item.maxQty}
                                value={item.minQty}
                                onChange={(e) => updateInventoryThreshold(activeCleaner ? activeCleaner.name : "", item.id, parseInt(e.target.value) || 0)}
                                className={`w-8 py-0 px-1 text-center rounded text-[8px] font-mono leading-tight outline-none focus:ring-1 focus:ring-indigo-500 ${
                                  daylightHighContrast
                                    ? "bg-zinc-200 border border-black text-black font-extrabold"
                                    : "bg-slate-950 border border-slate-800 text-white font-bold"
                                }`}
                                title="Click or type to define a custom alert threshold limit"
                              />
                              <span className="text-[8px] text-slate-550 font-mono font-bold lowercase">
                                {item.unit}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Decrement Unit usage */}
                            <button
                              type="button"
                              onClick={() => adjustInventoryQty(activeCleaner ? activeCleaner.name : "", item.id, -1)}
                              className={`p-1 rounded cursor-pointer transition-all ${
                                daylightHighContrast 
                                  ? "bg-zinc-200 hover:bg-zinc-300 text-black border border-black" 
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              }`}
                              title={`Log 1 ${item.unit} used`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            {/* Increment Unit Restock */}
                            <button
                              type="button"
                              onClick={() => adjustInventoryQty(activeCleaner ? activeCleaner.name : "", item.id, 1)}
                              className={`p-1 rounded cursor-pointer transition-all ${
                                daylightHighContrast 
                                  ? "bg-zinc-200 hover:bg-zinc-300 text-black border border-black" 
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              }`}
                              title={`Load 1 ${item.unit}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>

                            {/* Delete custom assets */}
                            {item.id.startsWith("inv_custom_") && (
                              <button
                                type="button"
                                onClick={() => removeInventoryItem(activeCleaner ? activeCleaner.name : "", item.id)}
                                className={`p-1 rounded text-rose-400 hover:text-rose-300 cursor-pointer transition-all ${
                                  daylightHighContrast ? "bg-rose-50 border border-rose-500 text-black" : "bg-rose-950/20"
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress load indicator bar */}
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isLow ? "bg-red-500 animate-pulse" : "bg-indigo-500"}`} 
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>

                        {/* Automatic Low-Stock/Reorder warning alerts */}
                        {isLow && (
                          <div className="flex items-center gap-1.5 text-[8.5px] font-bold font-mono text-rose-450">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="uppercase tracking-wide">
                              ⚠️ REORDER REQUIRED (Supply below threshold: {item.qty} left)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Earnings progressions Recharts Chart and CSV Exporter */}
              <div className={`p-4 rounded-2xl border ${daylightHighContrast ? "bg-white border-2 border-black" : "bg-slate-950/80 border-slate-850"}`}>
                <div className="flex justify-between items-center gap-1 mb-3">
                  <div>
                    <span className={`text-[9px] uppercase font-bold text-indigo-400 block tracking-widest ${daylightHighContrast ? "text-zinc-650 font-black" : ""}`}>Weekly Payouts</span>
                    <h4 className={`text-xs font-semibold ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>Earnings progression</h4>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const earningsData = [
                        { day: "Mon", pay: 80 },
                        { day: "Tue", pay: 160 },
                        { day: "Wed", pay: 110 },
                        { day: "Thu", pay: 240 },
                        { day: "Fri", pay: 190 },
                        { day: "Sat", pay: totalEarnings > 0 ? Math.round(totalEarnings * 0.4) : 90 },
                        { day: "Sun", pay: totalEarnings }
                      ];
                      let csvContent = "data:text/csv;charset=utf-8,Day,Earnings (AUD)\n";
                      earningsData.forEach(row => {
                        csvContent += `${row.day},${row.pay}\n`;
                      });
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `Weekly_Earnings_${activeCleaner.name.replace(/\s+/g, "_")}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      onTriggerLog({
                        id: Math.random().toString(),
                        type: "system",
                        status: "success",
                        message: `📊 CSV Export: Successfully generated payout report for ${activeCleaner.name}!`,
                        timestamp: new Date().toLocaleTimeString()
                      });
                    }}
                    className={`text-[9px] font-black p-1 px-2 rounded-lg border transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer ${
                      daylightHighContrast 
                        ? "bg-black text-white hover:bg-zinc-900 border-black" 
                        : "bg-slate-900 hover:bg-slate-840 text-slate-300 hover:text-white border-slate-800"
                    }`}
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>

                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={[
                        { day: "Mon", pay: 80 },
                        { day: "Tue", pay: 160 },
                        { day: "Wed", pay: 110 },
                        { day: "Thu", pay: 240 },
                        { day: "Fri", pay: 190 },
                        { day: "Sat", pay: totalEarnings > 0 ? Math.round(totalEarnings * 0.4) : 90 },
                        { day: "Sun", pay: totalEarnings }
                      ]} 
                      margin={{ top: 5, right: 5, left: -32, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaProgressGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={daylightHighContrast ? "#cbd5e1" : "#1e293b"} />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fill: daylightHighContrast ? "#000" : "#94a3b8", fontSize: 8, fontWeight: "bold" }} 
                        axisLine={{ stroke: daylightHighContrast ? "#000" : "#334155" }}
                      />
                      <YAxis 
                        tick={{ fill: daylightHighContrast ? "#000" : "#94a3b8", fontSize: 8 }} 
                        axisLine={{ stroke: daylightHighContrast ? "#000" : "#334155" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: daylightHighContrast ? "#fff" : "#0f172a", 
                          borderColor: daylightHighContrast ? "#000" : "#334155",
                          borderRadius: "8px"
                        }}
                        labelStyle={{ color: daylightHighContrast ? "#000" : "#f8fafc", fontWeight: "bold", fontSize: 9 }}
                        itemStyle={{ color: "#6366f1", fontSize: 9, fontWeight: "bold" }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="pay" 
                        stroke="#6366f1" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#areaProgressGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
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
              
              {viewTab === "calendar" ? (
                <div className={`p-6 rounded-3xl border transition-all ${
                  daylightHighContrast 
                    ? "bg-zinc-50 border-2 border-black text-black" 
                    : "bg-slate-950/90 border-slate-800/85 text-white shadow-2xl"
                }`}>
                  {/* Calendar Header with navigation switches */}
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider">Roster Booking Calendar</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Monthly Technician Allocation Map</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          daylightHighContrast ? "bg-zinc-200 hover:bg-zinc-300 text-black border border-black animate-none" : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent"
                        }`}
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-black min-w-[100px] text-center uppercase tracking-wider whitespace-nowrap">
                        {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          daylightHighContrast ? "bg-zinc-200 hover:bg-zinc-300 text-black border border-black animate-none" : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent"
                        }`}
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekdays indicator heading */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase tracking-wider text-slate-500 mb-2">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Days grid layout */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(calendarDate).map((cell, idx) => {
                      const matches = getJobsForDate(cell.dateString);
                      const hasJobs = matches.length > 0;
                      const isSelected = selectedCalendarDate === cell.dateString;
                      
                      let cellBgClass = "";
                      if (isSelected) {
                        cellBgClass = daylightHighContrast ? "bg-indigo-100 border-indigo-600 text-black animate-none" : "bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 text-white animate-none";
                      } else if (!cell.isCurrentMonth) {
                        cellBgClass = daylightHighContrast ? "bg-zinc-100 text-zinc-400 opacity-40" : "bg-slate-950/20 text-slate-650 opacity-40";
                      } else {
                        cellBgClass = daylightHighContrast ? "bg-white hover:bg-zinc-150 text-black" : "bg-slate-900/40 hover:bg-slate-850/60 text-slate-300";
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedCalendarDate(cell.dateString);
                          }}
                          className={`min-h-[64px] sm:min-h-[80px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between items-start ${
                            daylightHighContrast ? "border-zinc-200" : "border-slate-850/50"
                          } ${cellBgClass}`}
                        >
                          <span className="text-[10px] font-black">{cell.dayNum}</span>
                          
                          {/* Embedded Mini Badges indicating scheduled tasks */}
                          {hasJobs && (
                            <div className="w-full space-y-0.5 mt-1 overflow-hidden" style={{ maxHeight: '42px' }}>
                              {matches.slice(0, 3).map((job) => {
                                let badgeColors = daylightHighContrast ? "bg-blue-105 text-blue-800" : "bg-blue-500/20 text-blue-400";
                                if (job.bookingStatus === "completed") {
                                  badgeColors = daylightHighContrast ? "bg-emerald-105 text-emerald-800" : "bg-emerald-500/20 text-emerald-400";
                                } else if (job.bookingStatus === "en-route" || job.bookingStatus === "in-progress") {
                                  badgeColors = daylightHighContrast ? "bg-amber-105 text-amber-805" : "bg-amber-500/20 text-amber-450";
                                }
                                return (
                                  <div
                                    key={job.id}
                                    className={`text-[8px] px-1 py-0.5 rounded font-extrabold truncate uppercase ${badgeColors}`}
                                    title={`${job.serviceName} - ${job.name}`}
                                  >
                                    {job.serviceName.split(" ")[0]}
                                  </div>
                                );
                              })}
                              {matches.length > 3 && (
                                <div className="text-[7px] font-bold text-slate-450 pl-0.5">
                                  +{matches.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail Roster items listed for the selected calendar day date */}
                  <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between items-center bg-transparent gap-2 flex-wrap">
                      <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                        📆 Jobs rostered for: <span className="text-white font-mono font-black">{selectedCalendarDate ? new Date(selectedCalendarDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Select a day"}</span>
                      </h5>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-900 border border-slate-800 uppercase font-mono text-slate-500 whitespace-nowrap">
                        {getJobsForDate(selectedCalendarDate || "").length} Allocation{getJobsForDate(selectedCalendarDate || "").length !== 1 ? 's' : ''} Found
                      </span>
                    </div>

                    {getJobsForDate(selectedCalendarDate || "").length === 0 ? (
                      <div className={`text-center py-6 border border-dashed rounded-2xl text-[11px] ${
                        daylightHighContrast ? "border-zinc-300 text-zinc-500 font-bold" : "border-slate-850/80 text-slate-600 font-mono"
                      }`}>
                        No job assignments designated on this calendar node. Select another slot above or switch views.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getJobsForDate(selectedCalendarDate || "").map((job) => {
                          const subtasks = getSubtasksForService(job.serviceName);
                          const completedTasks = completedSubtasks[job.id] || [];
                          const percentComplete = Math.round((completedTasks.length / subtasks.length) * 100) || 0;
                          
                          return (
                            <div 
                              key={job.id}
                              className={`p-4 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                                daylightHighContrast 
                                  ? "bg-white border-2 border-black text-black shadow-sm" 
                                  : "bg-slate-950 border-slate-805 text-white hover:border-slate-700"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black">{job.serviceName}</span>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                                    job.bookingStatus === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                                    job.bookingStatus === "in-progress" ? "bg-amber-500/10 text-amber-500" :
                                    "bg-blue-500/10 text-blue-450"
                                  }`}>
                                    {job.bookingStatus || "assigned"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">Customer: <strong className="text-slate-200">{job.name}</strong> • Location: <strong>{job.suburb} ({job.postcode})</strong></p>
                                <p className="text-[9px] text-slate-550 font-mono">Time slot selected: {job.schedulingDetails?.timeSlot || "Day Shift (Standard)"}</p>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div className="text-right hidden sm:block">
                                  <span className="text-[9px] font-black uppercase text-indigo-400 block">Checklist Task Prog</span>
                                  <span className="text-[11px] font-bold font-mono text-slate-200">{completedTasks.length}/{subtasks.length} ({percentComplete}%)</span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Navigate / scroll directly to standard list card or open notes
                                    setViewTab("list");
                                    setTimeout(() => {
                                      const el = document.getElementById(`job-card-${job.id}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] uppercase font-black tracking-wider cursor-pointer transition-all border-none"
                                >
                                  Manage Job Action
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {cleanerJobs.length === 0 ? (
                <div className="bg-slate-950/60 py-20 border border-dashed border-slate-805 rounded-3xl text-center flex flex-col items-center justify-center gap-4">
                  <Briefcase className="w-10 h-10 text-slate-700" />
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm font-mono">No Scheduled Assignments</p>
                    <p className="text-xs text-slate-505 max-w-sm mx-auto">You have no tasks assigned currently. Switch to the Admin Coordinator Panel above to assign jobs to yourself.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Multi-job Selector Toolbar Command Center */}
                  {selectedJobIds.length > 0 && (
                    <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border transition-all ${
                      daylightHighContrast 
                        ? "bg-zinc-100 border-2 border-black text-black" 
                        : "bg-indigo-950/30 border-indigo-500/40 text-indigo-100 shadow-xl"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-wider uppercase font-sans">
                          ⚡ Bulk Operation Console ({selectedJobIds.length} Assignment{selectedJobIds.length > 1 ? 's' : ''} Checked)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBulkUpdateStatus("en-route")}
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer bg-amber-500 hover:bg-amber-450 text-black leading-none"
                        >
                          Mark En-Route
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkUpdateStatus("completed")}
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-555 text-white leading-none"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedJobIds([])}
                          className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer leading-none ${
                            daylightHighContrast
                              ? "bg-white border border-black hover:bg-slate-100 text-black"
                              : "bg-slate-900 hover:bg-slate-800 borderborder-slate-800 text-slate-400"
                          }`}
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  )}

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
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Job selection checkbox */}
                              <input
                                type="checkbox"
                                checked={selectedJobIds.includes(job.id)}
                                onChange={() => {
                                  setSelectedJobIds(prev =>
                                    prev.includes(job.id)
                                      ? prev.filter(id => id !== job.id)
                                      : [...prev, job.id]
                                  );
                                }}
                                className={`w-4 h-4 rounded border cursor-pointer focus:ring-0 ${
                                  daylightHighContrast
                                    ? "accent-black border-black bg-white"
                                    : "accent-indigo-500 border-slate-700 bg-slate-950"
                                }`}
                              />
                              <span className={themeRightPanelJobId}>
                                Job ID: #{job.id.slice(-6)}
                              </span>
                              
                              {/* Urgent Badge if next 2 hours or HACCP/Morning SLA */}
                              {(() => {
                                if (!job.timestamp) return false;
                                try {
                                  const jobTime = new Date(job.timestamp).getTime();
                                  const nowTime = new Date().getTime();
                                  const diffHours = (jobTime - nowTime) / (1000 * 60 * 60);
                                  return (diffHours >= -1 && diffHours <= 2) || job.slaTier?.toLowerCase() === "haccp" || job.schedulingDetails?.timeSlot === "Morning";
                                } catch {
                                  return false;
                                }
                              })() && (
                                <span className="bg-red-600 text-white font-mono font-black text-[9px] uppercase px-2 py-0.5 rounded tracking-wider animate-pulse border border-red-500 shadow-sm shadow-red-500/20">
                                  ⚡ URGENT
                                </span>
                              )}

                              {/* Flag / Attention Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateQuote({
                                    ...job,
                                    isFlagged: !job.isFlagged
                                  });
                                  onTriggerLog({
                                    id: Math.random().toString(),
                                    type: "system",
                                    status: !job.isFlagged ? "warning" : "success",
                                    message: !job.isFlagged 
                                      ? `⚠️ Job #${job.id.slice(-6)} flagged for supervisory review and follow-up attention.`
                                      : `✅ Flag removed from Job #${job.id.slice(-6)}.`,
                                    timestamp: new Date().toLocaleTimeString()
                                  });
                                }}
                                className={`text-[9px] font-black p-1 px-2.5 rounded transition-all flex items-center gap-1 cursor-pointer select-none border ${
                                  job.isFlagged 
                                    ? "bg-red-600 border-red-500 text-white shadow-sm shadow-red-650/40" 
                                    : (daylightHighContrast ? "bg-white text-black border-black/50 hover:bg-zinc-150" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-red-500/50")
                                }`}
                              >
                                <Flag className={`w-3 h-3 ${job.isFlagged ? "fill-white" : ""}`} /> 
                                <span>{job.isFlagged ? "Flagged" : "Flag Job"}</span>
                              </button>

                              {/* Integrated Real-Time Status Badge */}
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-300 select-none shrink-0 ${
                                job.bookingStatus === "completed"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm shadow-emerald-500/5"
                                  : job.bookingStatus === "in-progress"
                                    ? "bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-sm shadow-sky-500/5 animate-pulse"
                                    : job.bookingStatus === "en-route"
                                      ? "bg-amber-550/10 text-amber-400 border-amber-500/25 shadow-sm shadow-amber-500/5 animate-pulse"
                                      : "bg-slate-550/10 text-slate-400 border-slate-500/20 shadow-sm"
                              }`}>
                                {job.bookingStatus}
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

                        {/* Attention Flag Warning Banner */}
                        {job.isFlagged && (
                          <div className="bg-red-650/15 border border-red-500/40 p-2.5 px-3 rounded-2xl flex items-center justify-between text-xs text-red-400 mb-3 animate-pulse">
                            <div className="flex items-center gap-2">
                              <Flag className="w-4 h-4 text-red-500 fill-red-500 animate-bounce" />
                              <span className="font-extrabold font-mono uppercase tracking-wider text-[10px]">⚠️ ACTION REQUIRED / FLAGGED FOR REVIEW</span>
                            </div>
                            <span className="text-[10.5px] font-bold text-red-300">Requires Dispatch Attention</span>
                          </div>
                        )}

                        {/* Overall Subtasks Progress Bar (Immediate feedback on job status) */}
                        <div className={`mt-3 p-3 text-left rounded-2xl border ${daylightHighContrast ? "bg-zinc-50 border-black text-black" : "bg-slate-950/40 border-slate-850"}`}>
                          <div className="flex justify-between items-center text-[10.5px] font-bold mb-1.5">
                            <span className={daylightHighContrast ? "text-zinc-850 font-black" : "text-slate-400"}>Subtasks Checklist Progression</span>
                            <span className={daylightHighContrast ? "text-black font-black" : "text-indigo-400 font-mono"}>
                              {percentComplete}% completed ({completedTasks.length}/{subtasks.length})
                            </span>
                          </div>
                          <div className={`w-full h-2.5 rounded-full overflow-hidden ${daylightHighContrast ? "bg-slate-200 border border-black" : "bg-slate-900"}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentComplete === 100 
                                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/25" 
                                  : "bg-indigo-500 shadow-sm shadow-indigo-500/20"
                              }`}
                              style={{ width: `${percentComplete}%` }}
                            />
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={`flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-bold" : "text-slate-400"}`}>
                                <Phone className={`w-3.5 h-3.5 ${daylightHighContrast ? "text-black" : "text-slate-500"}`} /> Call Client: {job.phone}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  onTriggerLog({
                                    id: Math.random().toString(),
                                    type: "api",
                                    status: "success",
                                    message: `💬 SMS Dispatched (ETA Template): Sent to ${job.name} (${job.phone})`,
                                    timestamp: new Date().toLocaleTimeString()
                                  });
                                  alert(`"On my way" SMS Sent to Client:\n"Hi ${job.name}, this is your technician from AastaClean. I am currently on my way and estimated to arrive in 15-20 minutes."`);
                                }}
                                className={`text-[9px] font-black p-1 px-2.5 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                                  daylightHighContrast 
                                    ? "bg-black text-white hover:bg-black/90" 
                                    : "bg-indigo-600 hover:bg-indigo-505 text-white shadow shadow-indigo-500/10"
                                }`}
                              >
                                <Send className="w-3 h-3" /> Quick "On My Way" SMS
                              </button>
                            </div>
                          </div>

                          <div className={`sm:col-span-2 pt-2 border-t ${daylightHighContrast ? "border-black" : "border-slate-850"}`}>
                            <div className="flex justify-between items-center mb-1">
                              <p className={themeDetailsCardLabel}>Administrative Notes</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedNotesJobId(job.id);
                                  setEditedNotesText(job.notes || "");
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer select-none font-mono tracking-wide uppercase"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Expand & Edit Notes
                              </button>
                            </div>
                            <p className={themeNotesBox}>
                              "{job.notes || "No custom admin notes provided for this schedule. Click 'Expand & Edit Notes' above to attach custom instructions."}"
                            </p>
                          </div>
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
                              <Navigation className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-sky-450"}`} /> Google Maps Navigation Assistant
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {/* Map view type toggle buttons */}
                              <div className={`flex rounded-lg overflow-hidden border ${daylightHighContrast ? "border-black bg-white" : "border-slate-805 bg-slate-950 p-0.5"}`}>
                                <button
                                  type="button"
                                  onClick={() => setMapMode("roadmap")}
                                  className={`px-2 py-0.5 text-[9px] font-black uppercase transition-all tracking-wider cursor-pointer ${
                                    mapMode === "roadmap"
                                      ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white rounded-md")
                                      : (daylightHighContrast ? "bg-white text-black hover:bg-slate-100" : "bg-transparent text-slate-500 hover:text-slate-300")
                                  }`}
                                >
                                  Map
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMapMode("satellite")}
                                  className={`px-2 py-0.5 text-[9px] font-black uppercase transition-all tracking-wider cursor-pointer ${
                                    mapMode === "satellite"
                                      ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white rounded-md")
                                      : (daylightHighContrast ? "bg-white text-black hover:bg-slate-100" : "bg-transparent text-slate-500 hover:text-slate-300")
                                  }`}
                                >
                                  Satellite
                                </button>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase font-mono ${daylightHighContrast ? "bg-black text-white border-black" : "bg-slate-955 text-slate-500 border-slate-850"}`}>
                                Geo-Postcode: {job.postcode}
                              </span>

                              <button
                                type="button"
                                onClick={() => downloadGpsTelemetry(job.id, job.suburb || "Area")}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer select-none ${
                                  daylightHighContrast
                                    ? "bg-black hover:bg-zinc-800 text-white border-black animate-pulse"
                                    : "bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 text-white border-emerald-500/30"
                                }`}
                                title="Download real-time technician GPS tracking path and breadcrumb telemetry JSON log file"
                              >
                                <Download className="w-3 h-3" />
                                <span>Export GPS ({gpsTelemetryHistory[job.id]?.length || 0})</span>
                              </button>
                            </div>
                          </div>

                          <TechnicianMapContainer
                            job={job}
                            pcodeDetails={pcodeDetails}
                            cleanerGpsCoords={cleanerGpsCoords}
                            daylightHighContrast={daylightHighContrast}
                            hasValidMapKey={hasValidMapKey}
                            GOOGLE_MAPS_KEY={GOOGLE_MAPS_KEY}
                            mapMode={mapMode}
                            setMapMode={setMapMode}
                            onTriggerLog={onTriggerLog}
                            gpsTelemetryHistory={gpsTelemetryHistory}
                          />
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

                          {/* Task Filter Input box */}
                          <div className="mt-2.5 mb-2 relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                              <Search className="h-3.5 w-3.5 text-slate-450" />
                            </div>
                            <input
                              type="text"
                              placeholder="Search checklist duties..."
                              value={checklistSearch[job.id] || ""}
                              onChange={(e) => setChecklistSearch(prev => ({ ...prev, [job.id]: e.target.value }))}
                              className={`w-full p-1.5 pl-8 text-xs rounded-xl font-sans outline-none ${
                                daylightHighContrast
                                  ? "bg-white border text-black placeholder-zinc-500 border-black font-semibold"
                                  : "bg-slate-950 border text-white placeholder-slate-500 border-slate-800 focus:border-indigo-500"
                              }`}
                            />
                          </div>

                          {/* Dynamic checklist elements */}
                          <div className={`pt-2 divide-y ${daylightHighContrast ? "divide-black" : "divide-slate-850"}`}>
                            {(() => {
                              const query = (checklistSearch[job.id] || "").toLowerCase().trim();
                              const filtered = subtasks.filter(task => task.toLowerCase().includes(query));
                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-4 text-slate-500 font-mono text-[10px]">
                                    No tasks match your search query.
                                  </div>
                                );
                              }
                              return filtered.map((task, idx) => {
                                const isChecked = completedTasks.includes(task);
                                const taskPics = subtaskPhotos[job.id]?.[task] || [];
                                return (
                                  <div 
                                    key={idx} 
                                    className={`py-3 px-1.5 border-b ${
                                      daylightHighContrast ? "border-zinc-200" : "border-slate-850"
                                    } last:border-0 transition-all`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      {/* Left completion toggle clickable zone */}
                                      <div 
                                        onClick={() => handleToggleSubtask(job.id, task)}
                                        className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                                      >
                                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                          isChecked 
                                            ? (daylightHighContrast ? "bg-black border-black text-white" : "bg-emerald-500 border-emerald-500 text-white") 
                                            : (daylightHighContrast ? "border-black hover:bg-black/10" : "border-slate-700 hover:border-purple-500")
                                        }`}>
                                          {isChecked && <CheckCircle2 className={`w-3.5 h-3.5 text-white ${daylightHighContrast ? "fill-black" : "fill-emerald-500"} stroke-[5]`} />}
                                        </div>
                                        
                                        <div className="space-y-1">
                                          <span className={`text-[11px] leading-tight font-sans font-bold block ${
                                            isChecked 
                                              ? "line-through text-slate-500" 
                                              : (daylightHighContrast ? "text-black font-black" : "text-slate-300")
                                          }`}>
                                            {task}
                                          </span>
                                          
                                          {/* Task specific Evidence Photos Inline Gallery */}
                                          {taskPics.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1.5" onClick={(ev) => ev.stopPropagation()}>
                                              {taskPics.map((pic, pIdx) => (
                                                <div 
                                                  key={pIdx} 
                                                  className="relative group w-8 h-8 rounded-lg overflow-hidden border border-slate-700/40 shadow-xs bg-slate-900 shrink-0"
                                                >
                                                  <img src={pic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                   <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <button
                                                       type="button"
                                                       onClick={() => handleStartAnnotation(pic, (newUrl) => {
                                                         const updated = [...taskPics];
                                                         updated[pIdx] = newUrl;
                                                         setSubtaskPhotos((prev) => ({
                                                           ...prev,
                                                           [job.id]: {
                                                             ...prev[job.id],
                                                             [task]: updated
                                                           }
                                                         }));
                                                       })}
                                                       className="p-1 bg-indigo-605 hover:bg-indigo-500 text-white rounded cursor-pointer border-none flex items-center justify-center"
                                                       title="Draw onto this photo"
                                                     >
                                                       <Edit2 className="w-3.5 h-3.5" />
                                                     </button>
                                                     <button
                                                       type="button"
                                                       onClick={() => handleTaskPhotoDelete(job.id, task, pIdx)}
                                                       className="p-1 bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer border-none flex items-center justify-center"
                                                       title="Delete this photo"
                                                     >
                                                       <X className="w-3.5 h-3.5" />
                                                     </button>
                                                   </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Action zone - Photo uploader */}
                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          id={`task-upload-${job.id}-${idx}`}
                                          className="hidden" 
                                          onChange={(e) => handleTaskPhotoUpload(job.id, task, e)}
                                        />
                                        <label 
                                          htmlFor={`task-upload-${job.id}-${idx}`}
                                          title="Add task-specific evidence photograph"
                                          className={`p-1.5 rounded-lg border flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                            daylightHighContrast
                                              ? "bg-zinc-100 hover:bg-black hover:text-white border-zinc-300 text-black shadow-xs"
                                              : "bg-slate-900/60 hover:bg-indigo-650/85 border-slate-750 text-indigo-400 hover:text-white shadow"
                                          }`}
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Work Photos & Evidence (ISO 9001 Compliant) */}
                        <div className={themePhotosCard}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                            <span className={`font-extrabold flex items-center gap-1.5 ${daylightHighContrast ? "text-black font-black" : "text-white"}`}>
                              <Camera className={`w-4 h-4 ${daylightHighContrast ? "text-black" : "text-pink-400"}`} /> Work Photos & Case Evidence (ISO 9001)
                            </span>
                            
                            <div className="flex items-center flex-wrap gap-2">
                              {/* Standard vs Offline Gallery Mode Toggle */}
                              <div className={`flex rounded-lg overflow-hidden border ${daylightHighContrast ? "border-black bg-white" : "border-slate-805 bg-slate-950 p-0.5"}`}>
                                <button
                                  type="button"
                                  onClick={() => setPhotoViewMode("standard")}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase transition-all tracking-wider cursor-pointer ${
                                    photoViewMode === "standard"
                                      ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white rounded-md")
                                      : (daylightHighContrast ? "bg-white text-black hover:bg-slate-100" : "bg-transparent text-slate-500 hover:text-slate-300")
                                  }`}
                                >
                                  Standard View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPhotoViewMode("offline-gallery")}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 ${
                                    photoViewMode === "offline-gallery"
                                      ? (daylightHighContrast ? "bg-black text-white" : "bg-indigo-600 text-white rounded-md")
                                      : (daylightHighContrast ? "bg-white text-black hover:bg-slate-100" : "bg-transparent text-slate-500 hover:text-slate-300")
                                  }`}
                                >
                                  <HardDrive className="w-3 h-3" /> Offline Gallery
                                </button>
                              </div>

                              {((job.beforePhotos?.length || 0) + (job.afterPhotos?.length || 0)) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAllPhotos(job.id)}
                                  disabled={isZipping[job.id]}
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                    daylightHighContrast 
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 font-sans" 
                                      : "bg-emerald-500/25 hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-bold font-sans"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {isZipping[job.id] ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Compiling ZIP...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download All (ZIP)</span>
                                    </>
                                  )}
                                </button>
                              )}
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

                          {photoViewMode === "offline-gallery" ? (
                            <div className={`p-4 rounded-xl space-y-4 border ${daylightHighContrast ? "bg-slate-50 border-black" : "bg-slate-950/40 border-slate-850"}`}>
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2.5 border-b border-dashed border-slate-800">
                                <div>
                                  <h4 className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${daylightHighContrast ? "text-gradient text-black" : "text-white"}`}>
                                    <HardDrive className="w-4 h-4 text-pink-400" /> Locally Cached Offline Media Sandbox
                                  </h4>
                                  <p className={`text-[10px] ${daylightHighContrast ? "text-zinc-600" : "text-slate-400"}`}>
                                    Browse pre/post-operation images and bulk clear un-synced queue items stored in temporary browser cache memory.
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 self-start sm:self-center">
                                  {selectedPhotosToDelete.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleBulkDeletePhotos(job.id)}
                                      className={`text-[10px] font-black px-2.5 py-1.5 rounded cursor-pointer transition-all flex items-center gap-1 bg-red-650 hover:bg-red-600 text-white`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Bulk Delete ({selectedPhotosToDelete.length})</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allBefore = (job.beforePhotos || []).map((_, i) => ({ type: "before" as const, index: i }));
                                      const allAfter = (job.afterPhotos || []).map((_, i) => ({ type: "after" as const, index: i }));
                                      const all = [...allBefore, ...allAfter];
                                      if (selectedPhotosToDelete.length === all.length) {
                                        setSelectedPhotosToDelete([]);
                                      } else {
                                        setSelectedPhotosToDelete(all);
                                      }
                                    }}
                                    className={`text-[10px] font-bold px-2 py-1.5 rounded border transition-all cursor-pointer ${
                                      daylightHighContrast
                                        ? "bg-white hover:bg-slate-100 border-black text-black"
                                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-350"
                                    }`}
                                  >
                                    {selectedPhotosToDelete.length === ((job.beforePhotos?.length || 0) + (job.afterPhotos?.length || 0))
                                      ? "Deselect All"
                                      : "Select All"}
                                  </button>
                                </div>
                              </div>

                              {(!job.beforePhotos || job.beforePhotos.length === 0) && (!job.afterPhotos || job.afterPhotos.length === 0) ? (
                                <div className={`text-center py-8 border border-dashed rounded-lg text-xs ${
                                  daylightHighContrast ? "border-black/55 text-zinc-700 font-mono font-bold" : "border-slate-850 text-slate-500"
                                }`}>
                                  📂 Locally cached media directories are empty. Add photos to populate this sandbox list.
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                  {/* Render combined list for multi-delete checkboxes */}
                                  {[
                                    ...(job.beforePhotos || []).map((img, i) => ({ img, type: "before" as const, index: i })),
                                    ...(job.afterPhotos || []).map((img, i) => ({ img, type: "after" as const, index: i }))
                                  ].map(({ img, type, index }) => {
                                    const isChecked = selectedPhotosToDelete.some(x => x.type === type && x.index === index);
                                    return (
                                      <div
                                        key={`${type}-${index}`}
                                        onClick={() => {
                                          if (isChecked) {
                                            setSelectedPhotosToDelete(prev => prev.filter(x => !(x.type === type && x.index === index)));
                                          } else {
                                            setSelectedPhotosToDelete(prev => [...prev, { type, index }]);
                                          }
                                        }}
                                        className={`relative group rounded-xl overflow-hidden aspect-video border transition-all cursor-pointer p-0.5 ${
                                          isChecked
                                            ? "border-pink-500 ring-2 ring-pink-500/50 scale-[0.98]"
                                            : (daylightHighContrast ? "border-black hover:border-black bg-white shadow-sm" : "border-slate-850 hover:border-slate-700 bg-slate-900")
                                        }`}
                                      >
                                        <img src={img} alt={type} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                        
                                        {/* Status Tag Overlay defining type of evidence */}
                                        <div className={`absolute top-1 left-1 text-[8px] font-black uppercase px-1 rounded leading-none shadow ${
                                          type === "before"
                                            ? "bg-amber-500 text-black"
                                            : "bg-emerald-500 text-white"
                                        }`}>
                                          {type}
                                        </div>

                                        {/* Checkbox overlay indicator */}
                                        <div className={`absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center border transition-all shadow ${
                                          isChecked
                                            ? "bg-pink-500 border-pink-500 text-white"
                                            : "bg-black/55 border-white/60 text-transparent"
                                        }`}>
                                          {isChecked && <CheckCircle2 className="w-3 h-3 stroke-[4] text-white" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
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
                                         <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button
                                             type="button"
                                             onClick={() => handleStartAnnotation(img, (newUrl) => {
                                               const updated = [...(job.beforePhotos || [])];
                                               updated[idx] = newUrl;
                                               setProjectedQuotes((prev) =>
                                                 prev.map((q) => (q.id === job.id ? { ...q, beforePhotos: updated } : q))
                                               );
                                             })}
                                             className="p-1.5 bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg cursor-pointer border-none flex items-center justify-center"
                                             title="Draw / Highlight pre-op damage"
                                           >
                                             <Edit2 className="w-4 h-4" />
                                           </button>
                                           <button
                                             type="button"
                                             onClick={() => handleDeletePhoto(job.id, "before", idx)}
                                             className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer border-none flex items-center justify-center"
                                             title="Delete this photo"
                                           >
                                             <Trash2 className="w-4 h-4" />
                                           </button>
                                         </div>
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
                                         <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button
                                             type="button"
                                             onClick={() => handleStartAnnotation(img, (newUrl) => {
                                               const updated = [...(job.afterPhotos || [])];
                                               updated[idx] = newUrl;
                                               setProjectedQuotes((prev) =>
                                                 prev.map((q) => (q.id === job.id ? { ...q, afterPhotos: updated } : q))
                                               );
                                             })}
                                             className="p-1.5 bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg cursor-pointer border-none flex items-center justify-center"
                                             title="Draw / Highlight clean finish results"
                                           >
                                             <Edit2 className="w-4 h-4" />
                                           </button>
                                           <button
                                             type="button"
                                             onClick={() => handleDeletePhoto(job.id, "after", idx)}
                                             className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer border-none flex items-center justify-center"
                                             title="Delete this photo"
                                           >
                                             <Trash2 className="w-4 h-4" />
                                           </button>
                                         </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 flex items-center justify-between gap-4 font-mono text-[11px] mb-4">
                            <div className="space-y-1 text-left">
                              <p className="text-slate-505 font-bold uppercase text-[9px]">Client Electronic Authorization</p>
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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-850/60">
                          <div className="font-sans text-[10px] text-slate-505 leading-normal flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span>Tactile swipe actions log and broadcast real-time telemetry.</span>
                          </div>

                          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                            {(() => {
                              if (job.bookingStatus === "pending" || job.bookingStatus === "assigned") {
                                return (
                                  <SwipeActionTrack 
                                    text="Swipe -> En-Route" 
                                    colorClass="bg-amber-500" 
                                    onPerform={() => handleUpdateStatus(job.id, "en-route")} 
                                    daylightHighContrast={daylightHighContrast}
                                  />
                                );
                              } else if (job.bookingStatus === "en-route") {
                                return (
                                  <SwipeActionTrack 
                                    text="Swipe -> Start Job" 
                                    colorClass="bg-sky-500" 
                                    onPerform={() => handleStartTimer(job.id)} 
                                    daylightHighContrast={daylightHighContrast}
                                  />
                                );
                              } else if (job.bookingStatus === "in-progress") {
                                return (
                                  <SwipeActionTrack 
                                    text="Swipe -> Sign-Off" 
                                    colorClass="bg-indigo-500" 
                                    onPerform={() => {
                                      setSigningJobId(job.id);
                                      onTriggerLog({
                                        id: Math.random().toString(),
                                        type: "system",
                                        status: "info",
                                        message: `✍️ Launched Client Handheld Drawpad for Job ID #${job.id.slice(-6)}`,
                                        timestamp: new Date().toLocaleTimeString()
                                      });
                                    }} 
                                    daylightHighContrast={daylightHighContrast}
                                  />
                                );
                              } else {
                                return (
                                  <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                                    <span>Job Completed & Locked</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
              </>
             )}
            </div>

          </div>
        </div>
        ) : (
          <div className="py-12 text-center text-slate-500 font-mono">
            Roster system inactive or no cleaners currently deployed. Add cleaners in the Coordinator board first.
          </div>
        )}

      </div>

      {/* PHASE 2: PHOTO CANVAS ANNOTATION DRAWPAD MODAL */}
      {annotatingPhoto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 text-slate-100 shadow-2xl relative flex flex-col ${
            daylightHighContrast ? "bg-white border-2 border-black text-black" : "bg-slate-900 border-slate-800"
          }`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className={`text-md font-black uppercase tracking-wider ${daylightHighContrast ? "text-black" : "text-white"}`}>
                    Evidence Photo Annotation Drawer
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Draw highlights, arrows, and stamp warning tags on work photos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnnotatingPhoto(null)}
                className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer ${daylightHighContrast ? "text-black hover:bg-zinc-200" : "text-slate-400 hover:text-white"}`}
              >
                ✕
              </button>
            </div>

            {/* Drawing Canvas Board Workspace */}
            <div className="flex flex-col items-center justify-center gap-4">
              <div 
                className="relative max-w-full rounded-2xl border bg-slate-950 flex items-center justify-center overflow-hidden"
                style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: '#334155' }}
              >
                <canvas
                  ref={annotationCanvasRef}
                  onMouseDown={handleCanvasStart}
                  onMouseMove={handleCanvasMove}
                  onMouseUp={handleCanvasEnd}
                  onMouseLeave={handleCanvasEnd}
                  onTouchStart={handleCanvasStart}
                  onTouchMove={handleCanvasMove}
                  onTouchEnd={handleCanvasEnd}
                  className="max-w-full cursor-crosshair rounded-xl block"
                />

                {/* Inline Text Input Overlay on clicking for stamping */}
                {textPosition && (
                  <div 
                    className="absolute z-10 p-2.5 bg-slate-950 border border-indigo-500 text-white rounded-xl shadow-2xl space-y-2 max-w-[200px]"
                    style={{ 
                      left: `${textPosition.x}px`, 
                      top: `${textPosition.y}px`, 
                      transform: 'translate(-50%, -100%)' 
                    }}
                  >
                    <p className="text-[8px] font-black uppercase tracking-wider text-indigo-400">Stamp Text Here:</p>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. MISSING AT SPOT, OVEN CLEANED"
                      value={textInputVal}
                      onChange={(e) => setTextInputVal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-between items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTextPosition(null)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[8px] uppercase font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTextBadge}
                        className="px-2 py-0.5 bg-indigo-650 hover:bg-indigo-555 text-white rounded text-[8px] uppercase font-bold"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Annotation Toolbelt Toolbar */}
            <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
              daylightHighContrast ? "bg-zinc-100 border-black" : "bg-slate-950/80 border-slate-850"
            }`}>
              {/* Tool Selection */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Tools:</span>
                <button
                  type="button"
                  onClick={() => {
                    setAnnotationTool("brush");
                    setTextPosition(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                    annotationTool === "brush" ? "bg-indigo-600 text-white font-bold animate-none" : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  🖌️ Brush Paint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnnotationTool("arrow");
                    setTextPosition(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                    annotationTool === "arrow" ? "bg-indigo-600 text-white font-bold animate-none" : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  ➡️ Arrow Highlight
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnnotationTool("text");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                    annotationTool === "text" ? "bg-indigo-600 text-white font-bold animate-none" : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  🔤 Text Sticker (Click image)
                </button>
              </div>

              {/* Color Swatch Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-505 font-bold uppercase mr-1">Color:</span>
                {[
                  { hex: "#ec4899", desc: "Pink" },
                  { hex: "#ef4444", desc: "Red" },
                  { hex: "#eab308", desc: "Yellow" },
                  { hex: "#10b981", desc: "Green" },
                  { hex: "#6366f1", desc: "Indigo" },
                  { hex: "#ffffff", desc: "White" }
                ].map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setAnnotationColor(col.hex)}
                    className="w-5.5 h-5.5 rounded-full border transition-transform hover:scale-115 cursor-pointer relative"
                    style={{ 
                      backgroundColor: col.hex,
                      borderColor: annotationColor === col.hex ? '#f43f5e' : 'rgba(255,255,255,0.25)',
                      boxShadow: annotationColor === col.hex ? `0 0 8px ${col.hex}` : ''
                    }}
                    title={col.desc}
                  >
                    {annotationColor === col.hex && (
                      <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-slate-950" />
                    )}
                  </button>
                ))}
              </div>

              {/* Undo Stack */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={drawHistory.length <= 1}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-all cursor-pointer"
                title="Undo last stroke"
              >
                ↩️ Undo Stroke
              </button>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-end gap-3 text-xs pt-1">
              <button
                type="button"
                onClick={() => setAnnotatingPhoto(null)}
                className={`px-4 py-2.5 font-bold rounded-xl transition-all cursor-pointer ${
                  daylightHighContrast ? "bg-zinc-200 text-black hover:bg-zinc-300" : "bg-slate-950 hover:bg-slate-900 text-slate-450 border border-slate-805"
                }`}
              >
                Cancel Drawing
              </button>
              <button
                type="button"
                onClick={() => {
                  if (annotationCanvasRef.current) {
                    handleSaveAnnotatedPhoto(annotationCanvasRef.current.toDataURL());
                  }
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-650/25"
              >
                Save Annotated Evidence
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 🎒 10-Year-Old Daily Shift Report & Email Dispatch Modal */}
      {reportDispatchActive && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-600 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 text-slate-100 shadow-2xl relative animate-fade-in font-sans">
            
            {/* Top Close icon */}
            <button 
              type="button" 
              onClick={() => {
                setReportDispatchActive(false);
                setReportFinished(false);
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-950 p-2 rounded-full border border-slate-800 transition-colors cursor-pointer"
              title="Close summary"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Visual Head */}
            <div className="text-center space-y-3">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest inline-block mx-auto animate-bounce">
                🚀 Shift Mission Accomplished! 🚀
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Daily Shift Summary Dispatcher
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto font-medium">
                Hey there superstar! Under your direction, <strong className="text-indigo-400">{activeCleanerName}</strong> has completed every single job on their roster. Let's package up your amazing shift accomplishments!
              </p>
            </div>

            {/* Friendly Analogy for a 10 year old */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/20 space-y-2 text-xs text-slate-300 leading-relaxed font-mono">
              <span className="font-extrabold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-450" />
                Explain-Like-I'm-10: How it works!
              </span>
              <p>
                Imagine putting your superhero cleaning tasks in a golden booklet, signing it with a magic pen, and flying it directly to the boss's command desk! We use a special library called <strong className="text-indigo-300 font-mono text-[13px] font-bold">jsPDF</strong> in the browser to weave your actual client signatures into a real PDF document, then trigger a simulated email flight to our server!
              </p>
            </div>

            {/* Progress Wheel and Steps Log */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold font-mono">
                  <span>Mailing Progress Meter</span>
                  <span>{reportDispatchProgress}% Ready!</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-teal-500 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${reportDispatchProgress}%` }}
                  />
                </div>
              </div>

              {/* Steps timeline log */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2 max-h-48 overflow-y-auto font-mono text-xs text-left">
                {reportStepsLog.map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2 items-start py-1 ${
                      step.startsWith("❌") 
                        ? "text-rose-450 font-bold" 
                        : step.startsWith("🎉") 
                          ? "text-emerald-450 font-black" 
                          : "text-slate-200"
                    }`}
                  >
                    <span>•</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Finished states actions */}
            {reportFinished && (
              <div className="space-y-4 pt-2">
                <div className="bg-emerald-505/10 border border-emerald-500/20 p-4 rounded-2xl text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
                    ✓
                  </div>
                  <h4 className="text-md font-bold text-white pt-1">Mailing Successful!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    Your PDF shift overview and signatures have safely arrived at <strong className="text-emerald-450">admin@aastaclean.com.au</strong> as a secure email attachment.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 font-mono">
                  {generatedPdfBlobUrl && (
                    <a
                      href={generatedPdfBlobUrl}
                      download={generatedPdfName}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/15"
                    >
                      <Download className="w-4 h-4" /> Download PDF Report Card
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReportDispatchActive(false);
                      setReportFinished(false);
                    }}
                    className="flex-1 bg-slate-950 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 border border-slate-805 font-bold py-3.5 px-4 rounded-xl text-center transition-all cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Go Back & Explore 👋
                  </button>
                </div>
              </div>
            )}
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

      {/* EXPANDED NOTES MODAL */}
      {expandedNotesJobId && (() => {
        const targetJob = projectedQuotes.find(q => q.id === expandedNotesJobId);
        if (!targetJob) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 overflow-hidden ${
              daylightHighContrast ? "bg-white border-2 border-black text-black" : "bg-slate-900 border-slate-805 text-white"
            }`}>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <span className="font-extrabold text-sm uppercase tracking-wide">
                    Admin Notes: Job #{targetJob.id.slice(-6)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedNotesJobId(null)}
                  className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer ${daylightHighContrast ? "text-black" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-505 uppercase tracking-widest">Customer Details</p>
                  <p className="text-xs font-semibold">{targetJob.name} ({targetJob.serviceName})</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-505 uppercase tracking-widest">Edit Job Specific Notes</p>
                  <textarea
                    rows={6}
                    value={editedNotesText}
                    onChange={(e) => setEditedNotesText(e.target.value)}
                    placeholder="Enter custom administrative notes or special technician walkthrough notes here..."
                    className={`w-full p-3 rounded-2xl text-xs font-sans outline-none border transition-all ${
                      daylightHighContrast
                        ? "bg-white border-black text-black placeholder-zinc-500 font-bold"
                        : "bg-slate-950 border-slate-805 text-white placeholder-slate-500 focus:border-indigo-500"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExpandedNotesJobId(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    daylightHighContrast ? "bg-zinc-200 text-black hover:bg-zinc-350" : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateQuote({
                      ...targetJob,
                      notes: editedNotesText
                    });
                    onTriggerLog({
                      id: Math.random().toString(),
                      type: "system",
                      status: "success",
                      message: `📝 Administrative notes updated for Job #${targetJob.id.slice(-6)}.`,
                      timestamp: new Date().toLocaleTimeString()
                    });
                    setExpandedNotesJobId(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Save notes
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEAM NOTES HANDOVER Drawer */}
      {isTeamChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-md h-full shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0 ${
            daylightHighContrast ? "bg-white border-l-2 border-black text-black" : "bg-slate-900 border-l border-slate-800/80 text-white"
          }`}>
            <div className="p-4.5 border-b border-slate-800/70 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Crew Shift-Handover Chat</h3>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Active Dispatch Group Alpha</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamChatOpen(false)}
                className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer ${daylightHighContrast ? "text-black hover:bg-zinc-200" : "text-slate-400 hover:text-white"}`}
              >
                ✕
              </button>
            </div>

            {/* Handover Logs List scroll block */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/15 text-[11px] leading-relaxed text-indigo-200/90 mb-3 font-sans">
                💡 <strong>Dispatch Hint:</strong> Notes written here are logged on the shared server cluster and replicated safely to incoming afternoon crew members instantly for smooth field transition.
              </div>

              {teamNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`p-3 rounded-2xl border transition-all ${
                    daylightHighContrast 
                      ? "bg-zinc-50 border-black" 
                      : "bg-slate-950 border-slate-850"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1 font-mono">
                    <span className="text-indigo-400">{note.sender}</span>
                    <span>{note.timestamp}</span>
                  </div>
                  <p className={`text-xs font-semibold leading-relaxed ${daylightHighContrast ? "text-black" : "text-slate-300"}`}>
                    {note.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Chat Input Area footer */}
            <form 
              onSubmit={handleSendTeamNote}
              className="p-4 border-t border-slate-800/80 shrink-0 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a hand-over message or shift-note..."
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  className={`flex-1 p-2.5 text-xs rounded-xl font-sans outline-none border transition-all ${
                    daylightHighContrast
                      ? "bg-white border-black text-black font-extrabold"
                      : "bg-slate-950 border-slate-805 text-white placeholder-slate-550 focus:border-indigo-500"
                  }`}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold p-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30"
                >
                  Send Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
