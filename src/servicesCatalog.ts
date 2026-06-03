export interface SubService {
  name: string;
  slug: string;
  priceOffset: number; // Flat fee or base calculation offset
  hoursOffset: number; // Duration adjustment
  description: string;
}

export interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  icon: string;
  description: string;
  categories: ("Domestic" | "Commercial" | "Specialised")[];
}

export const subserviceRegistry: Record<string, SubService[]> = {
  "end-of-lease-cleaning": [
    { name: "Full Tenancy Bond Clean (Checked)", slug: "full-bond", priceOffset: 0, hoursOffset: 0, description: "100% Bond Back Refund guaranteed. Follows REIA standard tenancy move-out list." },
    { name: "Furnished Tenancy Clean (+Inventory)", slug: "furnished-bond", priceOffset: 45, hoursOffset: 1, description: "Includes polishing/vacuuming under furniture, dusting inventory items, and appliances." },
    { name: "Eco-Friendly Alkaline Lease Wash", slug: "eco-bond", priceOffset: 30, hoursOffset: 0.5, description: "Hypoallergenic chemical-free wash safe for pets, infants, and allergy-sensitive tenants." }
  ],
  "ndis-cleaning": [
    { name: "Standard NDIA Domestic Support", slug: "ndis-standard", priceOffset: 0, hoursOffset: 0, description: "Authorized household assistance, task coaching, general dusting and dishwash." },
    { name: "NDIS High-Needs Sanitisation", slug: "ndis-high-needs", priceOffset: 35, hoursOffset: 1, description: "Surgical-grade floor wash, high-touch sanitization, pathogen eradication with non-reactive agents." },
    { name: "Roster Respite Deep Clean", slug: "ndis-respite", priceOffset: 50, hoursOffset: 1.5, description: "Intensive deep-room cleaning preparing the property for transition or inspector visits." }
  ],
  "commercial-cleaning": [
    { name: "Standard Corporate Facility Clean", slug: "commercial-standard", priceOffset: 0, hoursOffset: 0, description: "WHS compliant general janitorial services, daily floor-wash, rubbish extraction." },
    { name: "Industrial / Retail Floor Detailing", slug: "commercial-industrial", priceOffset: 75, hoursOffset: 1.5, description: "Heavy-duty walk-behind floor scrubbing, anti-slip waxing, safety pathway clearout." },
    { name: "Medical / Childcare Clinical Hygiene", slug: "commercial-medical", priceOffset: 110, hoursOffset: 2, description: "ISO 9001 certified pathology-grade microbial decontamination of desks and child areas." }
  ],
  "office-cleaning": [
    { name: "Daily Workplace Maintenance Clean", slug: "office-main", priceOffset: 0, hoursOffset: 0, description: "Communal areas sweep, high-frequency work area dusting, breakroom setup." },
    { name: "Office Deep-Steam Sanitisation", slug: "office-steam", priceOffset: 55, hoursOffset: 1, description: "Includes computer screen de-static, keyboard steam blowout, phone hand-piece degreasing." },
    { name: "Boardroom & Front-Of-House Polish", slug: "office-vip", priceOffset: 40, hoursOffset: 0.5, description: "High-sheen boardroom table polishing, glass entrance panels wiper, VIP reception presentation." }
  ],
  "carpet-cleaning": [
    { name: "Commercial Hot Water Extraction", slug: "carpet-extraction", priceOffset: 0, hoursOffset: 0, description: "Dual-motor high vacuum pressure extraction lifting heavy-traffic compaction." },
    { name: "Delicate Wool / Fibre Carpet Dry-Clean", slug: "carpet-dry", priceOffset: 45, hoursOffset: 0.5, description: "Pre-solvent dispersion and encapsulation technology preventing fiber shrinkage." },
    { name: "Severe Urine & Odour Remediation", slug: "carpet-odour", priceOffset: 60, hoursOffset: 1, description: "Sub-surface injection of advanced bio-enzymatic neutralisers breaking organic crystals." }
  ]
};

// Default fallback sub-services if not specifically defined
export const defaultSubservices: SubService[] = [
  { name: "Premium Standard Execution", slug: "standard-general", priceOffset: 0, hoursOffset: 0, description: "Our professional signature care featuring double-check security checklists." },
  { name: "Surgical Disinfection Polish", slug: "deep-general", priceOffset: 35, hoursOffset: 1, description: "Addition of clinical sanitizer, microfibre detailing, and high-shine finishes." }
];

export const addonRegistry: ServiceAddon[] = [
  {
    id: "oven-deep",
    name: "Deep Oven & Stove Detailing",
    price: 85,
    icon: "🍳",
    description: "Full strip down, non-toxic heat bath of wire racks, carbon backing scraper, polished glass window.",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "fridge-intel",
    name: "Sub-Zero Inside Fridge/Freezer Sanitise",
    price: 45,
    icon: "🧼",
    description: "Thorough shelf-by-shelf removal, defrosting, anti-bacterial ice tray wash, door seals clean.",
    categories: ["Domestic"]
  },
  {
    id: "inside-cabinets",
    name: "In-Wall Cabinets & Shelving Wipe",
    price: 55,
    icon: "🚪",
    description: "Deep interior vacuuming of kitchen and bathroom cabinets (must specify if empty/unpopulated).",
    categories: ["Domestic", "Commercial"]
  },
  {
    id: "external-windows",
    name: "Deionised Pure Water External Windows",
    price: 75,
    icon: "🪟",
    description: "Exterior high-reach carbon-fiber wash poles, leaving high-sheen glass with zero chemical residue.",
    categories: ["Domestic", "Commercial", "Specialised"]
  },
  {
    id: "balcony-pressure",
    name: "Balcony / Al-Fresco Pressure Wash",
    price: 65,
    icon: "💦",
    description: "Blast-wash concrete slabs, glass balustrades dirt sweep, outdoor sliding tracks vacuumed.",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "wall-washing",
    name: "Wall Scuff & Spot Eraser Wash",
    price: 80,
    icon: "🧹",
    description: "Sugar soap wall scrubbing, removing scuff marks, kids crayon markings, and kitchen grease splash.",
    categories: ["Domestic", "Commercial"]
  },
  {
    id: "covid-fogging",
    name: "VIRUS-SHIELD Certified High Fogging",
    price: 190,
    icon: "💨",
    description: "TGA-approved active hospital-grade antiviral fogging, killing 99.99% of surface and airborne pathogens.",
    categories: ["Commercial", "Specialised"]
  },
  {
    id: "after-hours",
    name: "Safe lockout/Roster After-Hours Premium",
    price: 95,
    icon: "🌙",
    description: "Allocates crew between 6PM and 6AM. Quiet execution, key exchange collection, alarm resets.",
    categories: ["Commercial"]
  },
  {
    id: "hepa-silica",
    name: "Builders HEPA Air Silica Dust Filter",
    price: 125,
    icon: "🏗️",
    description: "Continuous commercial air scrubbers running during work to trap dry-wall and masonry silica dust.",
    categories: ["Specialised"]
  },
  {
    id: "grout-hydrophobic",
    name: "Stain-Shield Grout Hydrophobic Sealer",
    price: 110,
    icon: "🧱",
    description: "Applies liquid silicone barriers to fresh tile grout pathways preventing future oily stains.",
    categories: ["Specialised"]
  }
];
