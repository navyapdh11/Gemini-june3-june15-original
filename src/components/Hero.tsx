import React, { useState, useEffect } from "react";
import { Search, Shield, HelpCircle, Phone, HelpCircle as Mail, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { demoPostcodes } from "../data";

interface HeroProps {
  onPostcodeSubmit: (postcode: string) => void;
  onOpenQuote: (service?: string) => void;
}

export default function Hero({ onPostcodeSubmit, onOpenQuote }: HeroProps) {
  const [postcode, setPostcode] = useState("");
  const [searchStatus, setSearchStatus] = useState<{
    searched: boolean;
    valid: boolean;
    postcodeVal?: string;
  }>({ searched: false, valid: false });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Rotating postcode state for visual demonstration
  const [rotatingPC, setRotatingPC] = useState("6007");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % demoPostcodes.length;
      setRotatingPC(demoPostcodes[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("aastaclean_recent_postcodes");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local storage read error", e);
    }
  }, []);

  const savePostcodeToHistory = (pc: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((p) => p !== pc);
      const next = [pc, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("aastaclean_recent_postcodes", JSON.stringify(next));
      } catch (e) {
        console.error("Local storage save error", e);
      }
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPC = postcode.trim();
    if (/^\d{4}$/.test(cleanPC)) {
      setSearchStatus({ searched: true, valid: true, postcodeVal: cleanPC });
      savePostcodeToHistory(cleanPC);
      onPostcodeSubmit(cleanPC);
    } else {
      setSearchStatus({ searched: true, valid: false, postcodeVal: cleanPC });
    }
  };

  const handleRecallPostcode = (pc: string) => {
    setPostcode(pc);
    setSearchStatus({ searched: true, valid: true, postcodeVal: pc });
    savePostcodeToHistory(pc);
    onPostcodeSubmit(pc);
  };

  const handleQuickCTA = (type: "call" | "whatsapp" | "email") => {
    if (type === "call") {
      window.location.href = "tel:08926600";
    } else if (type === "whatsapp") {
      window.open("https://wa.me/618926600", "_blank");
    } else if (type === "email") {
      window.location.href = "mailto:aastaclean@gmail.com";
    }
  };

  return (
    <header className="relative min-h-screen flex items-center justify-center pt-24 pb-20 overflow-hidden bg-slate-950">
      
      {/* Immersive Parallax & Gradient Overlay Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 transform opacity-30 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(88,28,135,0.92), rgba(15,23,42,0.96)), url('https://picsum.photos/id/1015/2000/1200')`,
          filter: "brightness(0.8) contrast(1.1)"
        }}
      />

      {/* Modern Neon Grid Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        
        {/* Certificate Badge Row */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20 shadow-md text-xs sm:text-sm"
        >
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
          <span className="font-semibold uppercase tracking-[3px] text-[10px] sm:text-xs">
            ISO Certified • HACCP Certified • National Coverage
          </span>
        </motion.div>

        {/* Dynamic GEO Headline */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 cursor-default"
        >
          Enterprise Cleaning in{" "}
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-red-400 font-serif italic pr-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={rotatingPC}
                initial={{ y: 25, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -25, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-block"
              >
                {searchStatus.searched && searchStatus.valid ? searchStatus.postcodeVal : rotatingPC}
              </motion.span>
            </AnimatePresence>
          </span>
          ?
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed mb-10"
        >
          Approved <strong className="text-white">ISO 45001</strong> · <strong className="text-white">ISO 9001</strong> · <strong className="text-white">NDIS Registered Provider</strong>. Premium Commercial, Office, Strata & High-Sanitation Specialised Cleaning active across every Australian postcode.
        </motion.p>

        {/* Postcode Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-lg mx-auto mb-10"
        >
          <form onSubmit={handleSearch} className="bg-white p-1.5 sm:p-2.5 rounded-3xl sm:rounded-full shadow-2xl flex flex-col sm:flex-row gap-2 border border-slate-700/10">
            <div className="flex-1 flex items-center px-4">
              <Search className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
              <input 
                type="text"
                maxLength={4}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter postal code (e.g. 6007, 2000)"
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 font-medium py-3 text-base md:text-lg outline-none"
              />
            </div>
            <button 
              type="submit"
              className="bg-gradient-to-r from-purple-700 to-red-500 hover:from-purple-800 hover:to-red-600 text-white font-bold px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-900/40 shrink-0 cursor-pointer"
            >
              FIND SERVICES
            </button>
          </form>

          {recentSearches.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mr-1">Recently Searched:</span>
              {recentSearches.map((pc) => (
                <button
                  key={pc}
                  type="button"
                  onClick={() => handleRecallPostcode(pc)}
                  className="bg-white/10 hover:bg-indigo-500 hover:text-white px-3 py-1 rounded-full font-mono text-[11px] font-semibold text-slate-300 transition-all border border-white/5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                >
                  📍 {pc}
                </button>
              ))}
            </div>
          )}

          {/* Inline Validation States */}
          <AnimatePresence>
            {searchStatus.searched && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3.5 text-sm"
              >
                {searchStatus.valid ? (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Success! Postcode {searchStatus.postcodeVal} is fully covered. Dispatchers standby.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 flex items-center justify-center gap-2 animate-bounce">
                    <span>❌ Verification failed: Please enter a correct 4-digit Australian postcode directory.</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Contact CTAs Channels */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap justify-center items-center gap-8 text-xs sm:text-sm text-slate-400"
        >
          <button 
            onClick={() => handleQuickCTA("call")}
            className="flex items-center gap-2.5 hover:text-yellow-400 transition-colors py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded px-2"
          >
            <Phone className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-white">Call Instant Desk (08 9266 00)</span>
          </button>

          <button 
            onClick={() => handleQuickCTA("whatsapp")}
            className="flex items-center gap-2.5 hover:text-emerald-400 transition-colors py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-2"
          >
            <span className="text-emerald-400 text-lg font-bold shrink-0">💬</span>
            <span className="font-semibold text-white">Direct WhatsApp</span>
          </button>
        </motion.div>

        {/* Voice-First SEO Block - Dynamic Interaction */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 max-w-sm mx-auto bg-white/5 border border-white/10 backdrop-blur-lg px-6 py-4 rounded-2xl text-slate-400 text-xs text-center shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 mb-1.5 font-bold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
            <span>Voice & AEO Intelligence Badge</span>
          </div>
          <span className="italic">"Hey Siri, find certified high-end cleaning solutions near me"</span> — AASTACLEAN is tuned to respond.
        </motion.div>

      </div>

      {/* Trust Rating Strip Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md py-4 text-slate-800 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 mx-auto sm:mx-0 text-amber-500">
            <div className="flex text-lg leading-none">★★★★★</div>
            <span className="text-slate-800 font-bold ml-1">4.98 / 5 Average enterprise customer rating</span>
          </div>
          <div className="text-slate-500 tracking-wide uppercase font-medium mx-auto sm:mx-0">
            Headquarters: West Leederville, Perth WA 6007
          </div>
          <div className="text-purple-700 font-bold tracking-wider mx-auto sm:mx-0">
            ACTIVE ACROSS ALL STATES
          </div>
        </div>
      </div>

    </header>
  );
}
