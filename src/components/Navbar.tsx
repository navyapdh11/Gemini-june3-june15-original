import { useState } from "react";
import { Phone, Send, Code, ShieldCheck, HelpCircle, Sparkles } from "lucide-react";

interface NavbarProps {
  onOpenQuote: (service?: string) => void;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  currentView: "client" | "admin" | "cleaner" | "seo" | "developer" | "services" | "pricing" | "dashboard";
  onChangeView: (view: "client" | "admin" | "cleaner" | "seo" | "developer" | "services" | "pricing" | "dashboard") => void;
}

export default function Navbar({ 
  onOpenQuote, 
  isDevMode, 
  onToggleDevMode,
  currentView,
  onChangeView
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  // Monitor scrolling to add backdrop blur
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      setScrolled(window.scrollY > 20);
    });
  }

  return (
    <nav
      id="main-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-3"
          : "bg-white/90 backdrop-blur-sm shadow-sm py-4"
      } border-b border-slate-100`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div onClick={() => onChangeView("client")} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-700 via-purple-700 to-red-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md group-hover:rotate-6 transition-transform">
              A
            </div>
            <div>
              <div className="font-extrabold text-2xl tracking-tighter text-slate-900 flex items-center gap-1.5">
                AASTACLEAN
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[9px] text-slate-500 tracking-wider uppercase font-medium -mt-1">
                National Certified Network
              </p>
            </div>
          </div>

          {" "}
          {/* Nav Links (Scenic Anchor Links) */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button 
              onClick={() => onChangeView("client")} 
              className={`hover:text-purple-700 transition-colors py-1 cursor-pointer font-bold ${currentView === "client" ? "text-purple-700 border-b-2 border-purple-700" : "text-slate-650"}`}
            >
              Home
            </button>
            <button 
              onClick={() => onChangeView("services")} 
              className={`hover:text-purple-700 transition-colors py-1 cursor-pointer font-bold ${currentView === "services" ? "text-purple-700 border-b-2 border-purple-700" : "text-slate-650"}`}
            >
              Services Directory
            </button>
            <button 
              onClick={() => onChangeView("pricing")} 
              className={`hover:text-purple-700 transition-colors py-1 cursor-pointer font-bold ${currentView === "pricing" ? "text-purple-700 border-b-2 border-purple-700" : "text-slate-650"}`}
            >
              Pricing Estimator
            </button>
            <button 
              onClick={() => onChangeView("dashboard")} 
              className={`hover:text-purple-700 transition-colors py-1 text-purple-650 flex items-center gap-1 cursor-pointer font-bold ${currentView === "dashboard" ? "text-purple-700 border-b-2 border-purple-700" : ""}`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-600" />
              <span>Customer Dashboard</span>
            </button>
            <button 
              onClick={() => onChangeView("admin")} 
              className={`hover:text-purple-700 transition-colors py-1 cursor-pointer font-bold ${currentView === "admin" ? "text-purple-700 border-b-2 border-purple-700" : "text-slate-650"}`}
            >
              Admin Controls
            </button>
            <a href="#coverage" className="hover:text-purple-700 transition-colors py-1">
              National Networks
            </a>
            <a href="#faq" className="hover:text-purple-700 transition-colors py-1">
              FAQ
            </a>
          </div>

          {/* Active Experience Portal Dropdown Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider hidden xl:inline px-1">Experience:</span>
            <select
              value={currentView}
              onChange={(e) => {
                const targetView = e.target.value as any;
                onChangeView(targetView);
              }}
              className="bg-transparent border-0 text-indigo-400 font-black text-xs outline-none cursor-pointer pr-1"
            >
              <option value="client" className="bg-slate-900 text-slate-100 font-bold">🌐 Client Site</option>
              <option value="dashboard" className="bg-slate-900 text-slate-100 font-bold">📲 Customer Dashboard</option>
              <option value="services" className="bg-slate-900 text-slate-100 font-bold">📋 Services Directory</option>
              <option value="pricing" className="bg-slate-900 text-slate-100 font-bold">💰 Pricing Estimator</option>
              <option value="developer" className="bg-slate-900 text-slate-100 font-bold">🛠️ Dev & Int. Suite</option>
              <option value="admin" className="bg-slate-900 text-slate-100 font-bold">👑 Admin Coordinator</option>
              <option value="cleaner" className="bg-slate-900 text-slate-100 font-bold">📱 Cleaners' App</option>
              <option value="seo" className="bg-slate-900 text-slate-100 font-bold">📊 SEO & EEAT Matrix</option>
            </select>
          </div>

          {/* CTAs and Toggle developer mode */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Developer Hub Mode Toggle */}
            <button
              onClick={onToggleDevMode}
              id="dev-panel-toggle"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                isDevMode
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
              title="Toggle Dev Integration Hub"
            >
              <Code className="w-4 h-4" />
              <span className="hidden md:inline">
                {isDevMode ? "Exit Dev Console" : "CRM / API Hub"}
              </span>
            </button>

            {/* Direct Phone Call */}
            <a
              href="tel:08926600"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-red-500 rounded-xl hover:bg-slate-50 transition-all"
            >
              <Phone className="w-4 h-4 text-purple-700" />
              <span>08 9266 00</span>
            </a>

            {/* Quote CTA Button */}
            <button
              onClick={() => onOpenQuote()}
              id="header-get-quote-btn"
              className="bg-gradient-to-r from-purple-700 to-red-500 text-white px-5 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Get Quote</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
