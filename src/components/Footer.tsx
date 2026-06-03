import { allServices } from "../data";
import { Phone, Mail, MapPin, Sparkles, Facebook, Instagram, Linkedin, MessageCircle } from "lucide-react";

interface FooterProps {
  onOpenQuote: (service?: string) => void;
}

export default function Footer({ onOpenQuote }: FooterProps) {
  const footerServices = allServices.slice(0, 8);

  const handleSocialClick = (platform: string) => {
    const urls: Record<string, string> = {
      facebook: "https://facebook.com/aastaclean",
      instagram: "https://instagram.com/aastaclean",
      linkedin: "https://linkedin.com/company/aastaclean",
      whatsapp: "https://wa.me/618926600",
    };

    if (urls[platform]) {
      window.open(urls[platform], "_blank", "noopener,noreferrer");
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 relative overflow-hidden">
      
      {/* Decorative gradient accents */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Column 1: Brand details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-700 via-purple-700 to-red-500 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-lg">
                A
              </div>
              <span className="font-extrabold text-2xl tracking-tighter">AASTACLEAN</span>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              Premium fully-certified national enterprise cleaning solutions. Standardising custom rest integrations and local dispatch networks for seamless corporate support.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 p-2.5 rounded-xl justify-center sm:justify-start">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>Registered NDIS Provider</span>
            </div>
          </div>

          {/* Column 2: Service directories */}
          <div>
            <h4 className="uppercase text-xs tracking-widest mb-6 font-extrabold text-white">
              Modular Services
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-y-3.5 text-sm">
              {footerServices.map((service) => (
                <button
                  key={service.slug}
                  onClick={() => onOpenQuote(service.name)}
                  className="hover:text-white transition-colors text-left text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Corporate compliance */}
          <div>
            <h4 className="uppercase text-xs tracking-widest mb-6 font-extrabold text-white">
              Compliance & Info
            </h4>
            <div className="space-y-3.5 text-sm">
              <div>
                <a href="#certifications" className="hover:text-white text-xs sm:text-sm font-medium transition-colors">
                  ISO 45001 Certification
                </a>
              </div>
              <div>
                <a href="#certifications" className="hover:text-white text-xs sm:text-sm font-medium transition-colors">
                  HACCP Food Safety Policy
                </a>
              </div>
              <div>
                <a href="#certifications" className="hover:text-white text-xs sm:text-sm font-medium transition-colors">
                  $20M Public Liability File
                </a>
              </div>
              <div>
                <a href="#coverage" className="hover:text-white text-xs sm:text-sm font-medium transition-colors">
                  National Lead Ingestion Network
                </a>
              </div>
            </div>
          </div>

          {/* Column 4: Operational contact channels */}
          <div className="space-y-5">
            <h4 className="uppercase text-xs tracking-widest mb-6 font-extrabold text-white">
              Corporate Contacts
            </h4>
            
            <div className="space-y-3 text-sm">
              <a href="tel:08926600" className="flex items-center gap-2.5 hover:text-white transition-colors font-mono">
                <Phone className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                <span>08 9266 00</span>
              </a>

              <a href="mailto:aastaclean@gmail.com" className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Mail className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                <span className="break-all">aastaclean@gmail.com</span>
              </a>

              <div className="flex items-start gap-2.5 text-slate-400">
                <MapPin className="w-4.5 h-4.5 text-purple-400 shrink-0 mt-0.5" />
                <span className="leading-snug">51 Tate Street, West Leederville WA 6007</span>
              </div>
            </div>

            {/* Social handles */}
            <div className="flex gap-3.5 pt-4">
              {[
                { name: "facebook", icon: <Facebook className="w-5 h-5 text-blue-500" /> },
                { name: "instagram", icon: <Instagram className="w-5 h-5 text-pink-500" /> },
                { name: "linkedin", icon: <Linkedin className="w-5 h-5 text-sky-500" /> },
                { name: "whatsapp", icon: <MessageCircle className="w-5 h-5 text-emerald-500" /> },
              ].map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleSocialClick(platform.name)}
                  className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:scale-105 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  title={`Connect ${platform.name}`}
                >
                  {platform.icon}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Dynamic Enterprise Compliance Tracker Panel for E-E-A-T signals */}
        <div id="compliance-tracker" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mt-16 text-[11px] font-mono leading-relaxed max-w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-indigo-900/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-white font-extrabold uppercase tracking-widest text-[9px] text-indigo-400">Enterprise Compliance Health Status</span>
            </div>
            <span className="text-[9px] bg-slate-950 px-2.5 py-0.5 rounded border border-indigo-500/15 text-indigo-300 font-bold uppercase tracking-wider font-mono">
              ISO-Audit: Approved (May 2026 Audit)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-slate-300 font-mono">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-bold uppercase text-[8px] block">ISO Standard 9001:2015 QA</span>
              <p className="text-slate-200 font-extrabold text-xs">Quality System Verified</p>
              <div className="text-[10px] text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">✓ Passed National Audit</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-bold uppercase text-[8px] block">ISO Standard 45001:2018 WHS</span>
              <p className="text-slate-200 font-extrabold text-xs">Work Health and Safety compliant</p>
              <div className="text-[10px] text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">✓ Passed National Audit</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-bold uppercase text-[8px] block">Statutory Compliance Wage</span>
              <p className="text-slate-200 font-extrabold text-xs">Fair Work Award Auditing</p>
              <div className="text-[10px] text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">✓ Verified 100% compliant</div>
            </div>
          </div>
        </div>

        {/* Corporate copyright footer split strip */}
        <div className="text-xs border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between gap-6 dark:border-slate-800/80">
          <div className="space-y-1">
            <div>© 2026 AASTACLEAN • All Rights Reserved.</div>
            <div className="text-slate-600">Company registration ABN: Pending (Awaiting national corporate registry).</div>
          </div>
          <div className="flex gap-6 text-slate-500 font-semibold uppercase tracking-wider">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">T&C</a>
            <a href="#" className="hover:text-white transition-colors">API License</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
