export interface ServiceItem {
  name: string;
  slug: string;
  icon: string;
  category: "Commercial" | "Specialised" | "Domestic";
  description: string;
  baseRatePerHour: number;
  rating: number;
  durationEstimateHours: number;
}

export interface SelectedAddon {
  name: string;
  price: number;
  icon?: string;
}

export interface QuoteRequest {
  id: string;
  postcode: string;
  serviceName: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  timestamp: string;
  status: "pending" | "transmitted" | "failed";
  estimatedTotal?: number;
  assignedCleaner?: string;
  bookingStatus?: "pending" | "assigned" | "en-route" | "in-progress" | "completed";
  clientSignature?: string;
  siteArrivalTime?: string;
  siteDepartureTime?: string;
  actualSiteMinutes?: number;
  beforePhotos?: string[];
  afterPhotos?: string[];
  sentEmails?: Array<{ recipient: string; templateType: string; timestamp: string }>;
  // Dynamic Australian Booking Fields
  selectedAddons?: SelectedAddon[];
  subserviceName?: string;
  bedroomCount?: number;
  bathroomCount?: number;
  deskCount?: number;
  communalCount?: number;
  frequencyOption?: string;
}

export interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "vacation";
  rating: number;
}

export interface WebhookConfig {
  webhookUrl: string;
  headerName: string;
  headerValue: string;
  crmType: "Zapier" | "HubSpot" | "Salesforce" | "Custom webhook" | "Cleaners App API" | "Payload CRM";
  triggerOnQuote: boolean;
  triggerOnSearch: boolean;
  isActive: boolean;
}

export interface ConnectionLog {
  id: string;
  type: "webhook" | "crm" | "api" | "system";
  message: string;
  timestamp: string;
  status: "success" | "warning" | "info" | "error";
  payload?: any;
}

export interface StateCoverage {
  code: string;
  name: string;
  isActive: boolean;
}

export interface PostcodeCoverage {
  code: string;
  suburb: string;
  state: string;
  isActive: boolean;
  multiplier: number;
  disabledServices: string[];
}

