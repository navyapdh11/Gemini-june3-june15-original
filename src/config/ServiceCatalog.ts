export interface ServiceMetadataItem {
  name: string;
  description: string;
  model: "hourly" | "fixed" | "per_room" | "per_item" | "sqm" | "quote_based";
  basePrice?: number;
  minFee?: number;
  pricing?: Record<string, number>;
  priceTiers?: Record<string, number>;
  subservices: string[];
  inclusions: string[];
  addons: string[];
  addonPrices?: Record<string, number>;
}

export type ServiceMetadataType = Record<string, ServiceMetadataItem>;

export const SERVICE_METADATA: ServiceMetadataType = {
  "regular-cleaning": {
    name: "Regular Cleaning",
    description: "Routine maintenance for a clean, consistent living environment.",
    model: "hourly",
    basePrice: 45,
    minFee: 106,
    subservices: ["Weekly Visits", "Fortnightly Visits", "Monthly Catch-up Clean"],
    inclusions: ["Vacuuming & Mopping", "General Surface Dusting", "Bathroom Sanitization", "Kitchen Counter & Hob Wipe", "Emptying Trash Bins"],
    addons: ["Inside Oven", "Inside Fridge", "Laundry Load", "Ironing", "Inside Cabinets", "Internal Windows"],
    addonPrices: {
      "Inside Oven": 85,
      "Inside Fridge": 45,
      "Laundry": 55,
      "Ironing": 55,
      "Inside Cabinets": 55,
      "Internal Windows": 75
    }
  },
  "end-of-lease": {
    name: "End of Lease Cleaning",
    description: "A comprehensive, 100% bond-back guaranteed vacate deep clean.",
    model: "fixed",
    pricing: { studio: 240, "1br": 275, "2br": 320, "3br": 410, "4br": 555 },
    subservices: ["Full Tenancy Bond Cleaning", "Fast Vacate Moving Clean"],
    inclusions: ["Professional Oven Deep Clean", "Full Detergents & Heavy Equipment Used", "72-Hour Direct Agency Bond-Back Guarantee", "Kitchen Carbon & Glass Scraping", "Detailed Baseboard Detailing"],
    addons: ["Carpet Steam Cleaning", "Exterior Window Cleaning", "Wall Spot Cleaning", "Blind Cleaning", "Balcony Cleaning", "Garage Cleaning"],
    addonPrices: {
      "Carpet Steam Cleaning": 95,
      "Exterior Window Cleaning": 75,
      "Wall Spot Cleaning": 80,
      "Blind Cleaning": 45,
      "Balcony Cleaning": 65,
      "Garage Cleaning": 85
    }
  },
  "carpet-cleaning": {
    name: "Carpet & Rug Steam Extraction",
    description: "Professional steam or dry soil extraction for high-traffic fabrics.",
    model: "per_room",
    pricing: { bedroom: 35, livingRoom: 50, hallway: 25, staircase: 45 },
    subservices: ["Deep Steam Extraction", "Fibre Encapsulation Dry Cleaning", "Targeted Pet Flea Treatment", "Rapid Water Damage Remediation"],
    inclusions: ["Heavy Soil Agitation Extraction", "Organic Urine & Bio Stain Pre-treatment", "Industrial Deodorizer Flush"],
    addons: ["Stain Protection Shielder", "Flea Treatment", "Deodoriser Upgrade", "Heavy Heat Stain Removal"],
    addonPrices: {
      "Stain Protection Shielder": 45,
      "Flea Treatment": 75,
      "Deodoriser Upgrade": 25,
      "Heavy Heat Stain Removal": 80
    }
  },
  "pressure-cleaning": {
    name: "High-Pressure Exterior Washing",
    description: "High-pressure wash for concrete, brick, tile, and pathway surfaces.",
    model: "sqm",
    priceTiers: { "50": 6.0, "100": 5.5, "999": 5.0 },
    subservices: ["Driveway Refinishing", "Patio & Deck Lift", "Outdoor Slip Safeguarding", "Vertical Brick Clean"],
    inclusions: ["3000 PSI High Pressure Hydro Jetting", "Fungal Moss Chemical Pre-treatment Kill"],
    addons: ["Anti-Slip Sealer Cover", "Chemical Grout Stripper Seal", "High-Reach Gutter Extraction"],
    addonPrices: {
      "Anti-Slip Sealer Cover": 150,
      "Chemical Grout Stripper Seal": 190,
      "High-Reach Gutter Extraction": 125
    }
  },
  "upholstery-furniture": {
    name: "Upholstery & Delicate Leather Care",
    description: "Specialized care for custom leather, velvet, and fabric furniture.",
    model: "per_item",
    pricing: { armchair: 35, sofaSeat: 35, diningChair: 65, mattress: 80 },
    subservices: ["Sofa Fibre Cleanse", "Precision Leather Conditioner Wipe", "Mattress Micro-Dust Vacuum", "Heavy Curtain Dust Steam"],
    inclusions: ["Detailed pH-Safe Fabric Assessment", "Pathogen Stain Pre-spotting Extraction", "Soft Fiber Moisture Evaporator Dryer"],
    addons: ["Microbe Sanitisation", "Hydrophobic Stain Protex", "Scented Deodoriser Flush"],
    addonPrices: {
      "Microbe Sanitisation": 65,
      "Hydrophobic Stain Protex": 55,
      "Scented Deodoriser Flush": 25
    }
  },
  "specialized": {
    name: "Specialized & Emergency Restoration",
    description: "Advanced high-tier sanitisation, commercial kitchen, and post-builder scrubs.",
    model: "quote_based",
    subservices: ["Builders Post-Construction Clean", "HACCP Commercial Kitchen Detail", "TGA Active Antiviral Sanitisation", "High Velocity HVAC Duct Cleaning", "Police-Cleared NDIS Household Assist", "Heavy Floor Stone Buffing & Sealing", "WA Worksafe Vinyl Strip & Reseal"],
    inclusions: ["Custom Senior Site Assessor Protocol", "Specialist Heavy Degreaser & Sanitizers", "Full Safety Data Sheet Certification Validation Documentation"],
    addons: ["Priority Emergency Callout Response", "After-Hours Shift Premium Execution"],
    addonPrices: {
      "Priority Emergency Callout Response": 150,
      "After-Hours Shift Premium Execution": 95
    }
  }
};
