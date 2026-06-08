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
    name: "Inside Oven",
    price: 85,
    icon: "🍳",
    description: "Full strip down, non-toxic heat bath of wire racks, carbon backing scraper, polished glass window ($85/oven).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "fridge-intel",
    name: "Inside Fridge",
    price: 45,
    icon: "🧼",
    description: "Thorough shelf-by-shelf removal, defrosting, anti-bacterial ice tray wash, door seals clean ($45/unit).",
    categories: ["Domestic"]
  },
  {
    id: "laundry-load",
    name: "Laundry Load",
    price: 55,
    icon: "🧺",
    description: "Washing cycle, organic detergent, spun dry and neatly folded ($55/load).",
    categories: ["Domestic"]
  },
  {
    id: "ironing",
    name: "Ironing",
    price: 55,
    icon: "👔",
    description: "Professional pressing of shirts, trousers, linens with zero creased lines ($55/basket).",
    categories: ["Domestic"]
  },
  {
    id: "inside-cabinets",
    name: "Inside Cabinets",
    price: 55,
    icon: "🚪",
    description: "Deep interior vacuuming and wiping of kitchen/bathroom cabinets ($55/area).",
    categories: ["Domestic", "Commercial"]
  },
  {
    id: "internal-windows",
    name: "Internal Windows",
    price: 75,
    icon: "🪟",
    description: "Perfect squeegee wash of all interior window panes, tracks vacuumed and sills wiped ($75/service).",
    categories: ["Domestic", "Commercial", "Specialised"]
  },
  {
    id: "wall-washing",
    name: "Wall Spot Cleaning",
    price: 10,
    icon: "🧹",
    description: "Sugar soap wall scrubbing, removing scuff marks, kids crayon markings, and oily handprints ($10/wall).",
    categories: ["Domestic", "Commercial"]
  },
  {
    id: "rug-detailing",
    name: "Premium Rug Detailing",
    price: 30,
    icon: "🧺",
    description: "Deep steam extraction of area rugs, removing grease, dust mites, and traffic-wear compaction ($30/rug).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "extra-room-carpet",
    name: "Extra Carpet Room",
    price: 45,
    icon: "🧹",
    description: "Deep hot-water steam extraction for additional carpeted rooms or study areas ($45/room).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "dishwashing-load",
    name: "Dishwashing Load",
    price: 35,
    icon: "🍽️",
    description: "Hand scrubbing or loading and cycling dishwasher, leaving plates crystal clear ($35/load).",
    categories: ["Domestic"]
  },
  {
    id: "pet-hair-treatment",
    name: "Pet Hair Treatment",
    price: 50,
    icon: "🐈",
    description: "Dedicated vacuum heads and static brushes to extract deeply embedded pet dander from fabrics ($50/service).",
    categories: ["Domestic"]
  },
  {
    id: "balcony-pressure",
    name: "Balcony Deep Clean",
    price: 65,
    icon: "💦",
    description: "Blast-wash concrete/tiled balcony floors, glass panels squeegee, door slider channels vacuumed ($65/balcony).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "carpet-steam-bond",
    name: "Carpet Steam Cleaning",
    price: 45,
    icon: "🧹",
    description: "Specialized vacate hot water extraction to comply with real-estate clean guidelines ($45/room).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "external-windows-bond",
    name: "Exterior Window Cleaning",
    price: 75,
    icon: "🪟",
    description: "High-reach pure deionised water fed poles for dynamic spotless exterior window finishes ($75/service).",
    categories: ["Domestic", "Commercial", "Specialised"]
  },
  {
    id: "blind-cleaning",
    name: "Blind Cleaning",
    price: 45,
    icon: "🪵",
    description: "Intrepid hand wipe of venetian, roller, or vertical dual-slat blinds ($45/set).",
    categories: ["Domestic"]
  },
  {
    id: "garage-cleaning",
    name: "Garage Cleaning",
    price: 85,
    icon: "🚗",
    description: "Thorough sweep, cobweb removal, extraction and oil stain high-pressure scrub ($85/garage).",
    categories: ["Domestic"]
  },
  {
    id: "fridge-deep-bond",
    name: "Inside Fridge Deep",
    price: 45,
    icon: "🧼",
    description: "Heavy defrosting, complete sanitization and anti-odor flush for real-estate handovers ($45/unit).",
    categories: ["Domestic"]
  },
  {
    id: "trash-removal",
    name: "Trash/Debris Waste Removal",
    price: 150,
    icon: "🗑️",
    description: "Removal and disposal of garden waste, left-behind boxes, or broken furniture ($150/bulk load).",
    categories: ["Domestic", "Commercial"]
  },
  {
    id: "double-oven-scraping",
    name: "Double Oven Scraping",
    price: 110,
    icon: "🍳",
    description: "Heavy duty double oven carbon scraper, door hinges dismantled and polished ($110/double oven).",
    categories: ["Domestic"]
  },
  {
    id: "stain-protection",
    name: "Stain Protection Shielder",
    price: 45,
    icon: "🛡️",
    description: "Liquid repellent coating applied to post-steam fibers to seal pores from accidental spills ($45/room).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "flea-treatment",
    name: "Flea Treatment",
    price: 75,
    icon: "🐜",
    description: "Licensed veterinary-safe insecticide treatment applied to carpets to verify pet hair vacate compliance ($75/flat).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "deodoriser-upgrade",
    name: "Deodoriser Upgrade",
    price: 25,
    icon: "🌸",
    description: "Organic extraction sanitizer leaving a premium long-lasting botanical fragrance ($25/room).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "heavy-heat-stain",
    name: "Heavy Heat Stain Removal",
    price: 80,
    icon: "🔥",
    description: "Direct chemical breakdown of rust, red wine, paint, or heat-set carpet discolourations ($80/spot).",
    categories: ["Specialised"]
  },
  {
    id: "rug-steam-detail-carpet",
    name: "Rug Steam Detail",
    price: 30,
    icon: "🧺",
    description: "Hot water extractor run on wool or delicate Area carpets, stain treatment ($30/rug).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "leather-recondition",
    name: "Leather Re-Conditioning Cream",
    price: 45,
    icon: "🧴",
    description: "Rich nutrient beeswax-based moisturizer cream rubbed on leather seats to stop cracks ($45/seater).",
    categories: ["Specialised"]
  },
  {
    id: "anti-slip",
    name: "Anti-Slip Sealer Cover",
    price: 150,
    icon: "🛡️",
    description: "Durable polymer acrylic sealer with high coefficient friction compound for stone/tiles ($150/50sqm).",
    categories: ["Specialised"]
  },
  {
    id: "chemical-grout",
    name: "Chemical Grout Stripper Seal",
    price: 190,
    icon: "🧱",
    description: "Restores dirty grey grout lines back to white, applying silicone colorant sealers ($190/bathroom).",
    categories: ["Specialised"]
  },
  {
    id: "high-reach-gutter",
    name: "High-Reach Gutter Extraction",
    price: 125,
    icon: "🏠",
    description: "Vacuum extraction system emptying leaves and silt from gutters up to 3 storeys high without ladders ($125/service).",
    categories: ["Specialised"]
  },
  {
    id: "driveway-re-sanding",
    name: "Driveway Joint Re-Sanding",
    price: 90,
    icon: "⏳",
    description: "Sweeping structural fine kiln-dry sand back into expansion paving joints after jet wash ($90/driveway).",
    categories: ["Specialised"]
  },
  {
    id: "timber-deck-staining",
    name: "Timber Deck Staining Polish",
    price: 220,
    icon: "🪵",
    description: "Application of premium water-based Merbau composite wood deck stain protective layer ($220/deck).",
    categories: ["Specialised"]
  },
  {
    id: "graffiti-removal",
    name: "Graffiti Removal",
    price: 140,
    icon: "🎨",
    description: "High-temperature spray with chemical solvent breakdown of paints from raw bricks/fences ($140/service).",
    categories: ["Specialised", "Commercial"]
  },
  {
    id: "eco-algae",
    name: "Eco Algae Pre-treatment Kill",
    price: 55,
    icon: "🦠",
    description: "Application of ecological sanitizer wash that kills fungal spore networks at roots ($55/service).",
    categories: ["Specialised"]
  },
  {
    id: "microbe-sanitisation",
    name: "Microbe Sanitisation",
    price: 65,
    icon: "🧫",
    description: "Active biocidal germicide wipe of desks, handles, phones to eliminate bacterial load ($65/area).",
    categories: ["Commercial", "Specialised"]
  },
  {
    id: "hydrophobic-protex",
    name: "Hydrophobic Stain Protex",
    price: 55,
    icon: "☔",
    description: "Applies liquid shield repellent to mattresses or high-use soft furnishings ($55/unit).",
    categories: ["Specialised"]
  },
  {
    id: "scented-deodoriser",
    name: "Scented Deodoriser Flush",
    price: 25,
    icon: "🌸",
    description: "Commercial fragrance extraction compound neutralizing biological odors ($25/unit).",
    categories: ["Specialised"]
  },
  {
    id: "leather-protection",
    name: "Leather Protection Balm",
    price: 45,
    icon: "🛋️",
    description: "Premium nourishing sealant cream guarding leather couches from oils and UV fading ($45/armchair).",
    categories: ["Specialised"]
  },
  {
    id: "priority-callout",
    name: "Priority Emergency Callout Response",
    price: 150,
    icon: "🚨",
    description: "Guarantees a vetted cleanup crew onsite within 2 hours of booking confirmation ($150 fee).",
    categories: ["Specialised", "Commercial"]
  },
  {
    id: "after-hours-premium",
    name: "After-Hours Shift Premium Execution",
    price: 95,
    icon: "🌙",
    description: "Allocated graveyard shift squad for commercial spaces between 6 PM and 6 AM ($95/shift).",
    categories: ["Commercial", "Specialised"]
  },
  {
    id: "silica-hepa-prep",
    name: "Silica Dust HEPA Prep",
    price: 125,
    icon: "🏗️",
    description: "Industrial HEPA vacuum extractor capturing hazardous microscopical concrete and plaster silica dust ($125/service).",
    categories: ["Specialised"]
  },
  {
    id: "active-bio-fogging",
    name: "Active Bio-Decon Fogging",
    price: 190,
    icon: "💨",
    description: "TGA-approved hospital-grade antiviral dry aerosol fogging, sanitizing 3D air volumes ($190/space).",
    categories: ["Specialised", "Commercial"]
  },
  {
    id: "heavy-stone-scrub",
    name: "Heavy Stone Scrub & Tile Sealing",
    price: 180,
    icon: "🧱",
    description: "Industrial single-disc floor scrub, deep grout agitation, and oil-repellent wax seal application ($180/service).",
    categories: ["Specialised"]
  },
  {
    id: "glass-balustrade-deep",
    name: "Glass Balustrade Deep Wash",
    price: 65,
    icon: "💎",
    description: "Wash and squeegee of glass balustrade fence sheets, removing sea salt spray grease ($65/service).",
    categories: ["Specialised"]
  },
  {
    id: "solar-panels-wash",
    name: "Solar Panels washing & Deionised Flush",
    price: 85,
    icon: "☀️",
    description: "Soot and grime scrubbing of solar panel arrays, deionised water spot-free rinse to boost solar efficiency ($85/service).",
    categories: ["Specialised"]
  },
  {
    id: "flyscreen-detail",
    name: "Flyscreen Pressure Detailing & Scrub",
    price: 45,
    icon: "🕸️",
    description: "High-pressure wash or manual brush detailing of mesh flyscreens, drying and re-fitting ($45/service).",
    categories: ["Specialised"]
  },
  {
    id: "hard-water-stain",
    name: "Hard Water Stain & Calcium Scale Removal",
    price: 80,
    icon: "🪞",
    description: "Acidic scrub and buffer polishing to remove thick mineral scale and hard water glass stains ($80/service).",
    categories: ["Specialised"]
  },
  {
    id: "silicone-scraping",
    name: "Silicone Residue & Builder's Scraping",
    price: 55,
    icon: "🪒",
    description: "Surgical safety scraping of silicone, paint splatters, tape grease, and decals off glass panes ($55/service).",
    categories: ["Specialised"]
  },
  {
    id: "ndis-aged-sterilisation",
    name: "NDIS & Aged Care Compliant Sterilisation",
    price: 90,
    icon: "♿",
    description: "Special compliance micro-detail sanitisation with certified chemical tracers and audit-ready cleaning logs (NDIA approved).",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "lease-security-guard",
    name: "End-of-Lease Security Deposit Guard",
    price: 120,
    icon: "🛡️",
    description: "Includes exhaustive triple-checked photographic validation, automated REA handover support, and a complete bond-back release protection warranty.",
    categories: ["Domestic", "Specialised"]
  },
  {
    id: "dual-solar-treatment",
    name: "Dual-Frequency Solar Panel Treatment",
    price: 95,
    icon: "☀️",
    description: "Automated recurrence triggers paired with localized WA dust index, scrubbing away solar efficiency blocks with hydrophobic rain barrier shields.",
    categories: ["Specialised"]
  },
  {
    id: "silica-safe-clean",
    name: "Post-Construction Silica Safe-Clean",
    price: 145,
    icon: "🏗️",
    description: "Heavy-duty commercial grade Hepa dust extractor targeting microscopic concrete, plaster, and toxic crystalline silica masonry powder.",
    categories: ["Specialised", "Commercial"]
  }
];
