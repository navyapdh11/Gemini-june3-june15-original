export interface CitySEOPage {
  city: string;
  state: "WA" | "NSW" | "VIC" | "QLD";
  postcodes: string[];
  suburbs: string[];
  topService: string;
  hourlyRate: number;
  totalCleanersCount: number;
  avgResponseMins: number;
  totalJobsDoneCount: number;
  whsAct: string;
  regulatoryAgency: string;
  localLandmarks: string[];
  postcodeLatitudes: Record<string, number>;
  postcodeLongitudes: Record<string, number>;
  neighboringCities: string[];
}

export const PROGRAMMATIC_CITIES_METADATA: Record<string, CitySEOPage> = {
  perth: {
    city: "Perth",
    state: "WA",
    postcodes: ["6000", "6004", "6005", "6007", "6008", "6009", "6010", "6019", "6027", "6160", "6210"],
    suburbs: ["Perth CBD", "East Perth", "West Perth", "West Leederville", "Subiaco", "Nedlands", "Claremont", "Scarborough", "Joondalup", "Fremantle", "Mandurah"],
    topService: "NDIS & Aged Care Compliant Sterilisation",
    hourlyRate: 45,
    totalCleanersCount: 24,
    avgResponseMins: 12,
    totalJobsDoneCount: 4230,
    whsAct: "Work Health and Safety Act 2020 (WA)",
    regulatoryAgency: "WA WorkSafe Department of Mines, Industry Regulation & Safety",
    localLandmarks: ["Kings Park", "Elizabeth Quay", "Fremantle Markets", "Cottesloe Beach", "Optus Stadium", "Swan River Basin"],
    postcodeLatitudes: {
      "6000": -31.9505, "6004": -31.9535, "6005": -31.9475, "6007": -31.9395, "6008": -31.9485,
      "6009": -31.9795, "6010": -31.9775, "6019": -31.8955, "6027": -31.7455, "6160": -32.0525, "6210": -32.5325
    },
    postcodeLongitudes: {
      "6000": 115.8605, "6004": 115.8725, "6005": 115.8455, "6007": 115.8325, "6008": 115.8255,
      "6009": 115.8015, "6010": 115.7825, "6019": 115.7605, "6027": 115.7665, "6160": 115.7485, "6210": 115.7225
    },
    neighboringCities: ["Bunbury", "Geraldton", "Kalgoorlie", "Fremantle", "Joondalup"]
  },
  sydney: {
    city: "Sydney",
    state: "NSW",
    postcodes: ["2000", "2010", "2026", "2031", "2042", "2060", "2150"],
    suburbs: ["Sydney CBD", "Surry Hills", "Bondi Beach", "Coogee", "Newtown", "North Sydney", "Parramatta"],
    topService: "End-of-Lease Security Deposit Guard",
    hourlyRate: 50,
    totalCleanersCount: 48,
    avgResponseMins: 9,
    totalJobsDoneCount: 9840,
    whsAct: "Work Health and Safety Act 2011 (NSW)",
    regulatoryAgency: "SafeWork NSW",
    localLandmarks: ["Sydney Opera House", "Sydney Harbour Bridge", "Darling Harbour", "Bondi Pavilion", "Parramatta Park", "Taronga Zoo"],
    postcodeLatitudes: {
      "2000": -33.8688, "2010": -33.8825, "2026": -33.8915, "2031": -33.9185, "2042": -33.8975, "2060": -33.8395, "2150": -33.8155
    },
    postcodeLongitudes: {
      "2000": 151.2093, "2010": 151.2165, "2026": 151.2745, "2031": 151.2525, "2042": 151.1795, "2060": 151.2075, "2150": 151.0025
    },
    neighboringCities: ["Wollongong", "Newcastle", "Gosford", "Blue Mountains", "Penrith"]
  },
  melbourne: {
    city: "Melbourne",
    state: "VIC",
    postcodes: ["3000", "3006", "3121", "3141", "3182", "3205"],
    suburbs: ["Melbourne CBD", "Southbank", "Richmond", "South Yarra", "St Kilda", "South Melbourne"],
    topService: "Post-Construction Silica Safe-Clean",
    hourlyRate: 48,
    totalCleanersCount: 42,
    avgResponseMins: 11,
    totalJobsDoneCount: 8460,
    whsAct: "Occupational Health and Safety Act 2004 (VIC)",
    regulatoryAgency: "WorkSafe Victoria",
    localLandmarks: ["Federation Square", "Royal Botanic Gardens", "St Kilda Pier", "MCG Stadium", "Queen Victoria Market", "Shrine of Remembrance"],
    postcodeLatitudes: {
      "3000": -37.8136, "3006": -37.8225, "3121": -37.8215, "3141": -37.8385, "3182": -37.8675, "3205": -37.8335
    },
    postcodeLongitudes: {
      "3000": 144.9631, "3006": 144.9615, "3121": 145.0065, "3141": 144.9895, "3182": 144.9765, "3205": 144.9585
    },
    neighboringCities: ["Geelong", "Ballarat", "Bendigo", "Frankston", "Dandenong"]
  },
  brisbane: {
    city: "Brisbane",
    state: "QLD",
    postcodes: ["4000", "4006", "4101", "4102", "4122"],
    suburbs: ["Brisbane CBD", "Fortitude Valley", "West End", "Woolloongabba", "Mount Gravatt"],
    topService: "Dual-Frequency Solar Panel Treatment",
    hourlyRate: 45,
    totalCleanersCount: 30,
    avgResponseMins: 13,
    totalJobsDoneCount: 5120,
    whsAct: "Work Health and Safety Act 2011 (QLD)",
    regulatoryAgency: "Workplace Health and Safety Queensland",
    localLandmarks: ["South Bank Parklands", "Story Bridge", "Mount Coot-tha Lookout", "Lone Pine Koala Sanctuary", "Suncorp Stadium", "Queensland Art Gallery"],
    postcodeLatitudes: {
      "4000": -27.4698, "4006": -27.4525, "4101": -27.4785, "4102": -27.4895, "4122": -27.5455
    },
    postcodeLongitudes: {
      "4000": 153.0251, "4006": 153.0365, "4101": 153.0115, "4102": 153.0325, "4122": 153.0785
    },
    neighboringCities: ["Gold Coast", "Sunshine Coast", "Ipswich", "Toowoomba", "Redland Bay"]
  },
  bunbury: {
    city: "Bunbury",
    state: "WA",
    postcodes: ["6230", "6232", "6233"],
    suburbs: ["Bunbury CBD", "South Bunbury", "Australind"],
    topService: "Post-Construction Silica Safe-Clean",
    hourlyRate: 44,
    totalCleanersCount: 12,
    avgResponseMins: 16,
    totalJobsDoneCount: 1450,
    whsAct: "Work Health and Safety Act 2020 (WA)",
    regulatoryAgency: "WA WorkSafe Department of Mines, Industry Regulation & Safety",
    localLandmarks: ["Bunbury Jetty", "Dolphin Discovery Centre", "Koombana Bay", "Marlston Hill Lookout"],
    postcodeLatitudes: {
      "6230": -33.3271, "6232": -33.3456, "6233": -33.3150
    },
    postcodeLongitudes: {
      "6230": 115.6416, "6232": 115.6620, "6233": 115.7001
    },
    neighboringCities: ["Mandurah", "Busselton", "Margaret River", "Perth"]
  },
  kalgoorlie: {
    city: "Kalgoorlie",
    state: "WA",
    postcodes: ["6430", "6432", "6433"],
    suburbs: ["Kalgoorlie CBD", "Boulder", "Hannans"],
    topService: "Post-Construction Silica Safe-Clean",
    hourlyRate: 52,
    totalCleanersCount: 10,
    avgResponseMins: 18,
    totalJobsDoneCount: 1120,
    whsAct: "Work Health and Safety Act 2020 (WA)",
    regulatoryAgency: "WA WorkSafe Department of Mines, Industry Regulation & Safety",
    localLandmarks: ["Super Pit Gold Mine", "Hannan Street", "Karlkurla Bushland Park", "Museum of the Goldfields"],
    postcodeLatitudes: {
      "6430": -30.7489, "6432": -30.7780, "6433": -30.7250
    },
    postcodeLongitudes: {
      "6430": 121.4658, "6432": 121.4920, "6433": 121.4350
    },
    neighboringCities: ["Coolgardie", "Perth", "Esperance"]
  },
  mandurah: {
    city: "Mandurah",
    state: "WA",
    postcodes: ["6210", "6211", "6180"],
    suburbs: ["Mandurah CBD", "Halls Head", "Falcon"],
    topService: "Dual-Frequency Solar Panel Treatment",
    hourlyRate: 46,
    totalCleanersCount: 14,
    avgResponseMins: 14,
    totalJobsDoneCount: 1820,
    whsAct: "Work Health and Safety Act 2020 (WA)",
    regulatoryAgency: "WA WorkSafe Department of Mines, Industry Regulation & Safety",
    localLandmarks: ["Mandurah Estuary", "Dolphin Quay", "Peel Inlet", "Halls Head Beach"],
    postcodeLatitudes: {
      "6210": -32.5325, "6211": -32.5134, "6180": -32.4820
    },
    postcodeLongitudes: {
      "6210": 115.7225, "6211": 115.7533, "6180": 115.7610
    },
    neighboringCities: ["Perth", "Bunbury", "Rockingham"]
  }
};
