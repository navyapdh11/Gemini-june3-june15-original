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
    description: "Routine maintenance for a clean, consistent living environment (Fantastic & Jim's style).",
    model: "hourly",
    basePrice: 45,
    minFee: 106,
    subservices: ["Weekly Visits", "Fortnightly Visits", "Monthly Catch-up Clean", "Spring Cleaning One-Off Deep"],
    inclusions: ["Vacuuming & Mopping", "General Surface Dusting", "Bathroom Sanitization", "Kitchen Counter & Hob Wipe", "Emptying Trash Bins", "Basic Bed-Making & Tidying"],
    addons: ["Inside Oven", "Inside Fridge", "Laundry Load", "Ironing", "Inside Cabinets", "Internal Windows", "Wall Spot Cleaning", "Premium Rug Detailing", "Extra Carpet Room", "Dishwashing Load", "Pet Hair Treatment", "Balcony Deep Clean", "NDIS & Aged Care Compliant Sterilisation"],
    addonPrices: {
      "Inside Oven": 85,
      "Inside Fridge": 45,
      "Laundry Load": 55,
      "Ironing": 55,
      "Inside Cabinets": 55,
      "Internal Windows": 75,
      "Wall Spot Cleaning": 10,
      "Premium Rug Detailing": 30,
      "Extra Carpet Room": 45,
      "Dishwashing Load": 35,
      "Pet Hair Treatment": 50,
      "Balcony Deep Clean": 65,
      "NDIS & Aged Care Compliant Sterilisation": 90
    }
  },
  "end-of-lease": {
    name: "End of Lease Cleaning",
    description: "A comprehensive, 100% bond-back guaranteed vacate deep clean (REIA standard checklist).",
    model: "fixed",
    pricing: { studio: 240, "1br": 275, "2br": 320, "3br": 410, "4br": 555 },
    subservices: ["Full Tenancy Bond Cleaning", "Fast Vacate Moving Clean", "Eco-Friendly Alkaline Lease Wash", "Furnished Tenancy Clean (+Inventory)"],
    inclusions: ["Professional Oven Deep Clean", "Full Detergents & Heavy Equipment Used", "72-Hour Direct Agency Bond-Back Guarantee", "Kitchen Carbon & Glass Scraping", "Detailed Baseboard Detailing", "Track and Frame Sills Scrubbing"],
    addons: ["Carpet Steam Cleaning", "Exterior Window Cleaning", "Wall Spot Cleaning", "Blind Cleaning", "Balcony Cleaning", "Garage Cleaning", "Premium Rug Detailing", "Inside Fridge Deep", "Trash/Debris Waste Removal", "Double Oven Scraping", "End-of-Lease Security Deposit Guard"],
    addonPrices: {
      "Carpet Steam Cleaning": 45,
      "Exterior Window Cleaning": 75,
      "Wall Spot Cleaning": 10,
      "Blind Cleaning": 45,
      "Balcony Cleaning": 65,
      "Garage Cleaning": 85,
      "Premium Rug Detailing": 30,
      "Inside Fridge Deep": 45,
      "Trash/Debris Waste Removal": 150,
      "Double Oven Scraping": 110,
      "End-of-Lease Security Deposit Guard": 120
    }
  },
  "carpet-cleaning": {
    name: "Carpet & Rug Steam Extraction",
    description: "Professional steam or dry soil extraction for high-traffic fabrics (Jim's style dual-motor).",
    model: "per_room",
    pricing: { bedroom: 35, livingRoom: 50, hallway: 25, staircase: 45 },
    subservices: ["Deep Steam Extraction", "Fibre Encapsulation Dry Cleaning", "Targeted Pet Flea Treatment", "Severe Urine & Odour Remediation", "Water Damage Restorations"],
    inclusions: ["Heavy Soil Agitation Extraction", "Organic Urine & Bio Stain Pre-treatment", "Industrial Deodorizer Flush", "Fibre pH Sanitisation Assessment"],
    addons: ["Stain Protection Shielder", "Flea Treatment", "Deodoriser Upgrade", "Heavy Heat Stain Removal", "Extra Carpet Room", "Rug Steam Detail", "Leather Re-Conditioning Cream"],
    addonPrices: {
      "Stain Protection Shielder": 45,
      "Flea Treatment": 75,
      "Deodoriser Upgrade": 25,
      "Heavy Heat Stain Removal": 80,
      "Extra Carpet Room": 45,
      "Rug Steam Detail": 30,
      "Leather Re-Conditioning Cream": 45
    }
  },
  "pressure-cleaning": {
    name: "High-Pressure Exterior Washing",
    description: "Comprehensive pressure cleaning, sand sealing, and deck staining (Jetclean standards).",
    model: "sqm",
    priceTiers: { "50": 6.0, "100": 5.5, "999": 5.0 },
    subservices: ["Driveway Restorative Protection Seal", "Patio & Deck Deep Jet Lift", "Outdoor Slip Safeguarding Surface Prep", "Vertical Brick Clean", "Tennis Court Algae Blast", "Roof Sand Tile Moss Clean"],
    inclusions: ["3000 PSI High Pressure Hydro Jetting", "Fungal Moss Chemical Pre-treatment Kill", "Efflorescence Stain Solvent Agitation"],
    addons: ["Anti-Slip Sealer Cover", "Chemical Grout Stripper Seal", "High-Reach Gutter Extraction", "Driveway Joint Re-Sanding", "Timber Deck Staining Polish", "Graffiti Removal", "Eco Algae Pre-treatment Kill"],
    addonPrices: {
      "Anti-Slip Sealer Cover": 150,
      "Chemical Grout Stripper Seal": 190,
      "High-Reach Gutter Extraction": 125,
      "Driveway Joint Re-Sanding": 90,
      "Timber Deck Staining Polish": 220,
      "Graffiti Removal": 140,
      "Eco Algae Pre-treatment Kill": 55
    }
  },
  "upholstery-furniture": {
    name: "Upholstery & Delicate Leather Care",
    description: "Specialized care for custom leather, velvet, and fabric furniture (Jim's standard).",
    model: "per_item",
    pricing: { armchair: 35, sofaSeat: 35, diningChair: 65, mattress: 80 },
    subservices: ["Sofa Fibre Cleanse", "Precision Leather Conditioner Wipe", "Mattress Micro-Dust Vacuum", "Heavy Curtain Dust Steam"],
    inclusions: ["Detailed pH-Safe Fabric Assessment", "Pathogen Stain Pre-spotting Extraction", "Soft Fiber Moisture Evaporator Dryer"],
    addons: ["Microbe Sanitisation", "Hydrophobic Stain Protex", "Scented Deodoriser Flush", "Leather Protection Balm"],
    addonPrices: {
      "Microbe Sanitisation": 65,
      "Hydrophobic Stain Protex": 55,
      "Scented Deodoriser Flush": 25,
      "Leather Protection Balm": 45
    }
  },
  "specialized": {
    name: "Specialized & Emergency Restoration",
    description: "Advanced high-tier sanitisation, commercial kitchen, and post-builder scrubs (Fantastic & WHS).",
    model: "quote_based",
    subservices: ["Builders Post-Construction Clean", "HACCP Commercial Kitchen Detail", "TGA Active Antiviral Sanitisation", "High Velocity HVAC Duct Cleaning", "Police-Cleared NDIS Household Assist", "Heavy Floor Stone Buffing & Sealing", "WA Worksafe Vinyl Strip & Reseal"],
    inclusions: ["Custom Senior Site Assessor Protocol", "Specialist Heavy Degreaser & Sanitizers", "Full Safety Data Sheet Certification Validation Documentation"],
    addons: ["Priority Emergency Callout Response", "After-Hours Shift Premium Execution", "Silica Dust HEPA Prep", "Active Bio-Decon Fogging", "Heavy Stone Scrub & Tile Sealing", "Post-Construction Silica Safe-Clean", "NDIS & Aged Care Compliant Sterilisation", "Dual-Frequency Solar Panel Treatment"],
    addonPrices: {
      "Priority Emergency Callout Response": 150,
      "After-Hours Shift Premium Execution": 95,
      "Silica Dust HEPA Prep": 125,
      "Active Bio-Decon Fogging": 190,
      "Heavy Stone Scrub & Tile Sealing": 180,
      "Post-Construction Silica Safe-Clean": 145,
      "NDIS & Aged Care Compliant Sterilisation": 90,
      "Dual-Frequency Solar Panel Treatment": 95
    }
  },
  "window-cleaning": {
    name: "Specialised Window Cleaning",
    description: "Deionised pure water reach-pole exterior wash, safety harness high-rise, and streak-free interior glass polishing (Jim's/Fantastic standard).",
    model: "per_item",
    pricing: {
      singlePane: 10,
      doublePane: 18,
      slidingDoor: 25,
      glassBalustrade: 15,
      skylight: 30,
      flyScreen: 7
    },
    subservices: ["Residential Standard Window Polish", "Purified Deionised Reach-Pole Wash", "Heavy Commercial Triple Storey Polish", "Post-Construction Paint/Decal Scraping"],
    inclusions: ["Squeegee Streak-Free Internal Glass", "Pure Deionised Water Jet Exterior Reach-Wash", "Manual Track & Frame Vacuum/Soak Scrub", "Cobwebs, Mold & Mud Removal of Outer Frame"],
    addons: ["Glass Balustrade Deep Wash", "Solar Panels washing & Deionised Flush", "Flyscreen Pressure Detailing & Scrub", "Hard Water Stain & Calcium Scale Removal", "Silicone Residue & Builder's Scraping", "High-Reach Gutter Extraction", "Dual-Frequency Solar Panel Treatment"],
    addonPrices: {
      "Glass Balustrade Deep Wash": 65,
      "Solar Panels washing & Deionised Flush": 85,
      "Flyscreen Pressure Detailing & Scrub": 45,
      "Hard Water Stain & Calcium Scale Removal": 80,
      "Silicone Residue & Builder's Scraping": 55,
      "High-Reach Gutter Extraction": 125,
      "Dual-Frequency Solar Panel Treatment": 95
    }
  }
};
