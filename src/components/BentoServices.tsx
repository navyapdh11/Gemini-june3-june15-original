import React, { useState, useRef } from "react";
import { Calculator, ArrowRight, Layers, Sparkles, ArrowUpDown, Star, Clock } from "lucide-react";
import { motion } from "motion/react";
import { allServices } from "../data";
import { ServiceItem } from "../types";

interface BentoServicesProps {
  onSelectService: (serviceName: string) => void;
}

export default function BentoServices({ onSelectService }: BentoServicesProps) {
  const [filter, setFilter] = useState<"All" | "Commercial" | "Specialised" | "Domestic">("All");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "duration">("name");

  const filteredServices = allServices.filter(
    (s) => filter === "All" || s.category === filter
  );

  const sortedServices = [...filteredServices].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "rating") {
      return b.rating - a.rating;
    }
    if (sortBy === "duration") {
      return a.durationEstimateHours - b.durationEstimateHours;
    }
    return 0;
  });

  return (
    <section id="services" className="py-24 bg-slate-50 relative overflow-hidden">
      
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-80 h-80 bg-purple-100/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            MODULAR SERVICES CATALOG
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-4 tracking-tight">
            Premium Cleaning Solutions
          </h2>
          <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
            ISO standard processes customized into plug-and-play clean components. Choose a service type below to explore price ranges.
          </p>

          {/* Catalog Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-10">
            {(["All", "Commercial", "Specialised", "Domestic"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  filter === tab
                    ? "bg-slate-900 text-white shadow-md scale-105"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {tab} Services
              </button>
            ))}
          </div>

          {/* Dynamic Sorting Selection Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 bg-slate-100/60 border border-slate-200 p-2.5 rounded-2xl max-w-xl mx-auto">
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5 px-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" /> Sort catalog:
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center w-full sm:w-auto">
              <button
                onClick={() => setSortBy("name")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sortBy === "name"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                A-Z Alphabetical
              </button>
              <button
                onClick={() => setSortBy("rating")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sortBy === "rating"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Highest Rating
              </button>
              <button
                onClick={() => setSortBy("duration")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sortBy === "duration"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Clock className="w-3 h-3 text-indigo-500" /> Shortest Est. Time
              </button>
            </div>
          </div>
        </div>

        {/* 3D Interactive Bento Grid */}
        <div className="perspective-1000 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedServices.map((service, index) => (
            <BentoCard
              key={service.slug}
              service={service}
              index={index}
              onSelect={onSelectService}
            />
          ))}
        </div>

        {/* Dynamic Multi-Service Quote CTA Box */}
        <div className="mt-16 bg-gradient-to-r from-purple-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-yellow-300 mb-4 uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> Custom Space Estimator
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Not sure what category fits your business?
              </h3>
              <p className="text-slate-300 mt-3 text-sm sm:text-base leading-relaxed">
                Connect our postcode coverage algorithms and dynamic quotation schemas directly. Set up custom metrics on the fly or consult a manager instantly.
              </p>
            </div>
            <button
              onClick={() => onSelectService("Inquire All Categories")}
              id="bento-quote-cta"
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold px-10 py-5 rounded-2xl tracking-wider uppercase text-sm flex items-center gap-3 transition-transform hover:scale-[1.03] active:scale-95 shrink-0 cursor-pointer shadow-lg shadow-yellow-400/20"
            >
              <Calculator className="w-4 h-4" />
              <span>Get Estimated Quote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

/* Sub-card component that handles elegant 3D tilt tracking */
function BentoCard({
  service,
  index,
  onSelect,
}: {
  service: ServiceItem;
  index: number;
  onSelect: (name: string) => void;
  key?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const angleX = (centerY - y) / 10; 
    const angleY = (x - centerX) / 10; 

    setRotate({ x: angleX, y: angleY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      style={{
        transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: "transform 0.1s ease-out",
      }}
      className="preserve-3d bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between h-full group select-none relative"
    >
      <div>
        
        {/* Category Badge & Icon */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-5xl group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
            {service.icon === "Shower" ? "🚿" : service.icon}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
              service.category === "Commercial"
                ? "bg-purple-100 text-purple-700"
                : service.category === "Specialised"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {service.category}
          </span>
        </div>

        {/* Heading */}
        <h4 className="font-extrabold text-xl text-slate-900 tracking-tight mb-3">
          {service.name}
        </h4>

        {/* Description */}
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
          {service.description}
        </p>

      </div>

      <div>
        
        {/* Dynamic Estimated hourly rates, Rating, and Duration */}
        <div className="border-t border-slate-100 pt-4 mt-4 mb-4 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1">★ Rating feedback</span>
            <span className="text-indigo-600 font-extrabold">
              {service.rating.toFixed(2)} / 5.00
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1">⏱ Duration est.</span>
            <span className="text-slate-700 font-bold">
              ~{service.durationEstimateHours} hrs
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100">
            <span className="text-slate-400 font-semibold">Base Rate Est.</span>
            <span className="text-slate-800 font-extrabold text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              ${service.baseRatePerHour}/hr
            </span>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => onSelect(service.name)}
          className="w-full py-3.5 bg-slate-50 hover:bg-slate-900 group-hover:bg-slate-900 text-slate-800 group-hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-sm shadow-slate-100 hover:shadow-lg active:scale-95"
        >
          <span>Calculate Free Quote</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </div>

    </motion.div>
  );
}
