import { useState } from "react";
import { HelpCircle, ChevronDown, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FAQItem {
  q: string;
  a: string;
  category: "Client" | "Technical Integration";
}

const faqList: FAQItem[] = [
  {
    category: "Client",
    q: "Do you provide enterprise cleaning services in my postcode?",
    a: "Yes. We operate Australia-wide with dedicated, locally-compliant corporate teams in all major cities and regional centers. Enter your 4-digit postcode on the home header block to verify availability and dispatch timers.",
  },
  {
    category: "Client",
    q: "Are all your cleaners background checked and insured?",
    a: "Absolutely. All cleaners undergo extensive national police checks and secure full reference-checked corporate clearance. Additionally, AASTACLEAN carries $20M in comprehensive Public Liability and workers' compensation coverage.",
  },
  {
    category: "Client",
    q: "What certifications does AASTACLEAN hold?",
    a: "We are proudly triple-certified under ISO standards: ISO 45001 (Occupational Health & Safety), ISO 9001 (Quality Management System), and certified HACCP compliant for hospital & food processing grade commercial sanitation.",
  },
  {
    category: "Technical Integration",
    q: "How does AASTACLEAN connect to my custom CRM or cleaners dispatch software?",
    a: "Our landing page features an advanced API Developer & Integration Console. You can enter any Zapier, Make.com, HubSpot, or custom webhook URL, configure custom request headers, and send live simulated test payloads. Turn on 'CRM Active' to stream genuine front-end quote leads to your databases.",
  },
  {
    category: "Technical Integration",
    q: "Can I extract the services structured data schema to sync to my website or CMS?",
    a: "Yes! Under the 'Payload Schema' tab in our Developer Console, you can instantly copy standard JSON representations of our entire structural lead schemas. This saves developers hours of setup mapping fields between custom CMS pages and central platforms.",
  },
  {
    category: "Client",
    q: "How does the NDIS cleaning allocation work?",
    a: "As a registered NDIS provider, we cooperate directly with your care coordinators or support workers to deliver scheduled home care or residential support, matching each allocation strictly against established NDIS checklist parameters.",
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = faqList.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-slate-50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> QUESTIONS & DIRECT RESPONSES
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
            Find immediate answers on safety policies, structural insurance coverages, and custom developer rest connectors.
          </p>

          <div className="max-w-md mx-auto pt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g., ISO, Webhook, CRM)..."
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-800 outline-none focus:border-purple-600 transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Accordions Stack */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-12 italic border border-dashed border-slate-200 rounded-2xl">
              No matching questions found in state catalogs. Try typing "CRM" or "ISO".
            </div>
          ) : (
            filteredFAQs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.q}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                >
                  {/* Title Toggle Bar */}
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-6 py-5 sm:py-6 text-left flex justify-between items-center gap-4 focus:outline-none hover:bg-slate-50/50 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 hidden sm:inline-block ${
                          faq.category === "Technical Integration"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {faq.category === "Technical Integration" ? "API Connect" : "Client"}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {faq.q}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-purple-700" : ""
                      }`}
                    />
                  </button>

                  {/* Stateful Drawer Body */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-6 text-slate-500 text-xs sm:text-sm leading-relaxed border-t border-slate-100 pt-5">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

      </div>
    </section>
  );
}
