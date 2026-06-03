import { useState } from "react";
import { BadgeCheck, ShieldAlert, Award, HelpingHand, MapPin, Globe } from "lucide-react";
import { motion } from "motion/react";

const stateHQs = [
  {
    state: "WA",
    name: "Western Australia HQ",
    address: "51 Tate Street, West Leederville WA 6007",
    phone: "08 9266 00",
    dispatchedTeams: 24,
    coverageMsg: "Full cover over Perth Metro, Mandurah, Bunbury, Kalgoorlie, and Pilbara centers.",
  },
  {
    state: "NSW",
    name: "New South Wales Hub",
    address: "32 Martin Place, Sydney NSW 2000",
    phone: "1300 AASTACLEAN",
    dispatchedTeams: 48,
    coverageMsg: "Sydney basin coverage including Newcastle, Wollongong, and central west hubs.",
  },
  {
    state: "VIC",
    name: "Victoria Regional Hub",
    address: "459 Collins Street, Melbourne VIC 3000",
    phone: "1300 AASTACLEAN",
    dispatchedTeams: 42,
    coverageMsg: "Full Melbourne coverage including Geelong, Ballarat, Bendigo, and Latrobe Valley.",
  },
  {
    state: "QLD",
    name: "Queensland Hub",
    address: "123 Eagle Street, Brisbane QLD 4000",
    phone: "1300 AASTACLEAN",
    dispatchedTeams: 36,
    coverageMsg: "Brisbane, Gold Coast, Sunshine Coast, Townsville, and Cairns commercial hubs.",
  },
  {
    state: "SA",
    name: "South Australia Hub",
    address: "100 King William Street, Adelaide SA 5000",
    phone: "1300 AASTACLEAN",
    dispatchedTeams: 18,
    coverageMsg: "Adelaide Metro, Barossa, and Spencer Gulf industrial facilities.",
  }
];

export default function CoverageCertifications() {
  const [activeState, setActiveState] = useState("WA");

  const selectedHQ = stateHQs.find((sh) => sh.state === activeState) || stateHQs[0];

  const certs = [
    {
      title: "ISO 45001",
      subtitle: "Safety First",
      desc: "Work Health & Safety Certified management systems protecting enterprise risks.",
      icon: <BadgeCheck className="w-12 h-12 text-yellow-400" />,
    },
    {
      title: "HACCP Certified",
      subtitle: "Food Safety",
      desc: "Safe environmental controls, cross-contamination prevention guidelines.",
      icon: <Award className="w-12 h-12 text-yellow-400" />,
    },
    {
      title: "ISO 9001",
      subtitle: "Quality Control",
      desc: "Meticulous quality control structures, daily audit trackers, cleaner reviews.",
      icon: <Globe className="w-12 h-12 text-yellow-400" />,
    },
    {
      title: "NDIS Registered",
      subtitle: "Disability Support",
      desc: "Fully compliant registration policies, background-checked elite care staff.",
      icon: <HelpingHand className="w-12 h-12 text-yellow-400" />,
    },
  ];

  return (
    <div id="coverage-certifications-wrapper">
      
      {/* SECTION 1: COVERAGE */}
      <section id="coverage" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Box: Explanator & State Selector */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold tracking-widest uppercase text-purple-700 bg-purple-100 px-3.5 py-1.5 rounded-full inline-block">
                NATIONAL ENTERPRISE COVERAGE
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
                Serving Every Postcode Across Australia
              </h2>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Connect your CRM structure to coordinate cleaning actions in any major territory. We run fully integrated local office networks in all Australian states with direct phone networks.
              </p>

              {/* State Interactive Badges */}
              <div className="space-y-3">
                <span className="text-xs uppercase text-slate-400 font-bold block">
                  Select state center to view HQ details:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {stateHQs.map((item) => (
                    <button
                      key={item.state}
                      onClick={() => setActiveState(item.state)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                        activeState === item.state
                          ? "bg-purple-700 text-white shadow-md scale-105"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {item.state}
                    </button>
                  ))}
                </div>
              </div>

              {/* National Count indicator */}
              <div className="pt-4 flex items-center gap-3">
                <span className="text-4xl">🇦🇺</span>
                <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">
                  Active in WA • NSW • VIC • QLD • SA • TAS • ACT • NT
                </span>
              </div>
            </div>

            {/* Right Box: HQ Details Visual Card */}
            <div className="lg:col-span-7 bg-slate-50 p-8 sm:p-12 rounded-3xl border border-slate-200/60 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
              
              <div className="absolute top-0 right-0 p-8 text-9xl font-bold font-mono text-slate-200/50 pointer-events-none select-none">
                {selectedHQ.state}
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm uppercase tracking-widest">
                  <MapPin className="w-4 h-4" /> Localized State Office
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {selectedHQ.name}
                </h3>

                <p className="font-mono text-sm sm:text-base text-slate-600 font-semibold bg-white p-4 rounded-xl border border-slate-100 max-w-md">
                  {selectedHQ.address}
                </p>

                <p className="text-slate-500 text-sm max-w-lg leading-relaxed">
                  {selectedHQ.coverageMsg}
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-4 pt-10 border-t border-slate-200 mt-8">
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-indigo-700 font-mono tracking-tight">
                    {selectedHQ.dispatchedTeams}+
                  </div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                    Dispatched Fleet Teams
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif tracking-tight">
                    8,000+
                  </div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                    Postcodes Active
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* SECTION 2: CERTIFICATIONS */}
      <section id="certifications" className="py-20 bg-gradient-to-br from-purple-700 via-indigo-900 to-slate-950 text-white relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1),_rgba(0,0,0,0.3))]" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs uppercase font-extrabold text-yellow-300 tracking-widest">
              CERTIFIED SYSTEM TRUST SHIELD
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              ISO Compliance & Registry Guidelines
            </h2>
            <p className="text-purple-200 text-sm max-w-lg mx-auto leading-relaxed">
              Every operation follows strict, triple-audit compliance policies ensuring public liability safety and disability welfare coverage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certs.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all text-center flex flex-col items-center justify-between min-h-[300px]"
              >
                <div className="mb-6 flex justify-center">{c.icon}</div>
                <div>
                  <div className="font-extrabold text-lg text-white mb-1">{c.title}</div>
                  <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">
                    {c.subtitle}
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
}
