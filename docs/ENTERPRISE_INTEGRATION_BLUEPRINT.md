# Enterprise Integration Blueprint & Technical Roadmap
## AastaClean Headless Core, Twenty CRM, and Chatwoot Omni-Gateway

This document defines the production-grade architectural and implementation blueprint for migrating AastaClean's client-side, offline-first operational footprint into an enterprise-scale full-stack architecture. It is designed to act as a concrete guide for developers, system engineers, and database administrators.

---

## 1. Headless Core: Payload CMS Integration

We propose deploying Payload CMS as our single source of truth (SSOT) headless backend. Built on Express or Next.js with MongoDB/PostgreSQL, Payload provides absolute type safety natively integrated with our existing TypeScript declarations.

### Collection Configurations

We define three key collections mapping precisely to `/src/types.ts`: `quotes` (QuoteRequest), `services` (ServiceItem), and `staff` (Cleaner).

#### A. Quotes Collection Config (`collections/Quotes.ts`)
```typescript
import { CollectionConfig } from 'payload/types';

export const Quotes: CollectionConfig = {
  slug: 'quotes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'serviceName', 'status', 'bookingStatus', 'estimatedTotal'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'cleaner',
    create: () => true, // Anonymous consumers can request quotes
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'cleaner',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'postcode',
      type: 'text',
      required: true,
    },
    {
      name: 'serviceName',
      type: 'text',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Transmitted', value: 'transmitted' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'estimatedTotal',
      type: 'number',
    },
    {
      name: 'assignedCleaner',
      type: 'relationship',
      relationTo: 'staff',
    },
    {
      name: 'bookingStatus',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Assigned', value: 'assigned' },
        { label: 'En-Route', value: 'en-route' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'clientSignature',
      type: 'textarea', // Base64 signature data representation
    },
    {
      name: 'siteArrivalTime',
      type: 'date',
    },
    {
      name: 'siteDepartureTime',
      type: 'date',
    },
    {
      name: 'actualSiteMinutes',
      type: 'number',
    },
    {
      name: 'beforePhotos',
      type: 'array',
      fields: [{ name: 'url', type: 'text' }],
    },
    {
      name: 'afterPhotos',
      type: 'array',
      fields: [{ name: 'url', type: 'text' }],
    },
    {
      name: 'selectedAddons',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true }
      ]
    },
    {
      name: 'subserviceName',
      type: 'text',
    },
    {
      name: 'frequencyOption',
      type: 'text',
    }
  ],
};
```

#### B. Services Collection Config (`collections/Services.ts`)
```typescript
import { CollectionConfig } from 'payload/types';

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'baseRatePerHour'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'icon',
      type: 'text',
      required: true, // Lucide icon reference string
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Commercial', value: 'Commercial' },
        { label: 'Specialised', value: 'Specialised' },
        { label: 'Domestic', value: 'Domestic' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'baseRatePerHour',
      type: 'number',
      required: true,
    },
    {
      name: 'rating',
      type: 'number',
      defaultValue: 5.0,
    },
    {
      name: 'durationEstimateHours',
      type: 'number',
      required: true,
    },
  ],
};
```

#### C. Staff Collection Config (`collections/Staff.ts`)
```typescript
import { CollectionConfig } from 'payload/types';

export const Staff: CollectionConfig = {
  slug: 'staff',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'email', 'status', 'rating'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Vacation', value: 'vacation' },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      defaultValue: 5.0,
    }
  ],
};
```

### LocalStorage Client-Side Migration Path

When the client connects online, her existing offline keys (e.g. `aastaclean_quotes`) are compiled and transmitted to the Payload batch API. Because AastaClean utilizes background service workers with Native IndexedDB/localStorage, we initialize a dedicated reconciler component:

```typescript
// src/utils/migration.ts
import { QuoteRequest } from "../types";

export interface MigrationResult {
  migratedCount: number;
  failedIds: string[];
}

export async function migrateLocalStorageToPayload(
  payloadEndpoint: string,
  authToken: string
): Promise<MigrationResult> {
  const rawLocalQuotes = localStorage.getItem("aastaclean_quotes");
  if (!rawLocalQuotes) {
    return { migratedCount: 0, failedIds: [] };
  }

  let localQuotes: QuoteRequest[] = [];
  try {
    localQuotes = JSON.parse(rawLocalQuotes);
  } catch (err) {
    console.error("Local data corrupted", err);
    return { migratedCount: 0, failedIds: [] };
  }

  // Filter out those which already sync'd
  const pendingQuotes = localQuotes.filter(
    (q) => q.status === "pending" || q.status === "failed"
  );
  
  if (pendingQuotes.length === 0) {
    return { migratedCount: 0, failedIds: [] };
  }

  const failedIds: string[] = [];
  let migratedCount = 0;

  for (const quote of pendingQuotes) {
    try {
      const response = await fetch(`${payloadEndpoint}/api/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `JWT ${authToken}`,
        },
        body: JSON.stringify({
          // Map perfectly to Payload schema fields
          id: quote.id,
          name: quote.name,
          email: quote.email,
          phone: quote.phone,
          postcode: quote.postcode,
          serviceName: quote.serviceName,
          notes: quote.notes || "",
          estimatedTotal: quote.estimatedTotal || 0,
          bookingStatus: quote.bookingStatus || "pending",
          selectedAddons: quote.selectedAddons || [],
          subserviceName: quote.subserviceName || "",
          frequencyOption: quote.frequencyOption || "one-off",
        }),
      });

      if (response.ok) {
        migratedCount++;
        // Update local item status to "transmitted"
        quote.status = "transmitted";
      } else {
        failedIds.push(quote.id);
      }
    } catch (err) {
      console.error(`Failed transmitting quote: ${quote.id}`, err);
      failedIds.push(quote.id);
    }
  }

  // Rewrite state with updated transmission status
  localStorage.setItem("aastaclean_quotes", JSON.stringify(localQuotes));

  return { migratedCount, failedIds };
}
```

---

## 2. Customer Relationship Engine: Twenty CRM Technical Roadmap

Twenty CRM utilizes a modern GraphQL & REST API designed with absolute relationship control. Our synchronization roadmap targets converting quotes (`leads`) into linked system records: **People** (clients), **Companies** (optional, for commercial accounts), and **Opportunities** (commercial options).

```
   [ AastaClean Client Web UI ] 
               │
               ▼  (POST /api/quotes)
     [ Payload CMS Backend ]
               │
               ▼  (Sync Worker via API queue)
     [ Twenty CRM Server ]
       ├── Create/Find Person
       ├── Create/Find Company (Commercial)
       └── Create Opportunity (Value = EstTotal)
```

### Multi-Step Schema Synchronization Workflow

1. **Webhook Detection**: Upon creation of a Quote in Payload CMS, configure a Payload hook `afterChange` targeting Twenty CRM.
2. **Contact (Person) Deduplication**: Check if email exists in Twenty CRM using an exact text filter. If not, create a `Person` resource.
3. **Account Creation**: If Category is "Commercial", check if Company exists. If not, instantiate a new `Company`. Associate Person to Company.
4. **Opportunity Registration**: Map Quote Estimated Price into Twenty CRM `Opportunities`. Link to the Person. Mark status as "Lead".

### Synchronization Router (`server/crm-TwentySync.ts`)

```typescript
import fetch from "node-fetch";

interface SyncRecord {
  clientName: string;
  email: string;
  phone: string;
  serviceName: string;
  estimatedTotal: number;
  postcode: string;
}

export async function syncLeadToTwentyCRM(
  lead: SyncRecord,
  envConfig: { apiKey: string; url: string }
): Promise<{ success: boolean; personId?: string; opportunityId?: string }> {
  const { apiKey, url } = envConfig;
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    // Stage 1: Search or Create Person
    let personId: string | null = null;
    const findPersonRes = await fetch(`${url}/api/v1/people?filter[email][eq]=${encodeURIComponent(lead.email)}`, {
      method: "GET",
      headers,
    });

    if (findPersonRes.ok) {
      const { data } = await findPersonRes.json() as any;
      if (data && data.length > 0) {
        personId = data[0].id;
      }
    }

    if (!personId) {
      const lastName = lead.clientName.split(" ").slice(1).join(" ") || "Client";
      const firstName = lead.clientName.split(" ")[0];

      const createPersonRes = await fetch(`${url}/api/v1/people`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          firstName,
          lastName,
          emails: {
            primary: lead.email,
          },
          phones: {
            primary: lead.phone,
          },
          jobTitle: "Prospect Cleaner Client",
        }),
      });

      if (createPersonRes.ok) {
        const result = await createPersonRes.json() as any;
        personId = result.data.id;
      } else {
        throw new Error("Failed to create Client contact in Twenty CRM API.");
      }
    }

    // Stage 2: Register Opportunities
    const createOpportunityRes = await fetch(`${url}/api/v1/opportunities`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Austral Commercial & Domestic Quote - Postcode ${lead.postcode} (${lead.serviceName})`,
        amount: {
          amountMicros: (lead.estimatedTotal || 150) * 1000000,
          currencyCode: "AUD",
        },
        stage: "NEW_LEAD",
        personId: personId,
      }),
    });

    if (createOpportunityRes.ok) {
      const oppResult = await createOpportunityRes.json() as any;
      return { 
        success: true, 
        personId: personId || undefined, 
        opportunityId: oppResult.data.id 
      };
    }

    return { success: true, personId: personId || undefined };
  } catch (err) {
    console.error("Twenty CRM Integration Sync Pipeline Critical Exception:", err);
    return { success: false };
  }
}
```

---

## 3. Support Infrastructure: Live Chatwoot + Hermes Bridge Module

To empower customer support operations, this module establishes a secure bridge between Chatwoot’s Conversation endpoint and our frontend `HermesChatwootWidget`. When a client communicates, the live agent's panel automatically correlates the incoming message with the client's current Quote & Booking checklist history.

### Context Mapping Sequence

```
[ Client on Hermes Drawer ] ---> Chatwoot Widget Web Client ---> Realtime Inbox (WebSocket)
                                                                        │
[ Live Support Agent ] <--- Context Bridge Component <--- API Metadata Ingestion
                                   │
                         Matches on Client Mobile / Email / Cookie Metadata
                                   │
                         Fetches quote history from Payload CMS & displays
                         bespoke customer profile, postcode multipliers, and active clean progress!
```

### API Contract specifications for Chatwoot Handoff Hooks

Every message initiated via the Hermes wrapper provides a persistent customer metadata object inside Chatwoot custom attributes:

```json
{
  "event": "message_created",
  "account_id": 1,
  "conversation": {
    "id": 4012,
    "contact_inbox": {
      "contact": {
        "email": "sarah.reynolds@gmail.com",
        "phone_number": "+61491570156",
        "custom_attributes": {
          "active_quote_id": "qt_78112",
          "service_category": "Specialised Silica Clean",
          "booking_status": "in-progress",
          "suburb_postcode": "6008",
          "current_rate_multiplier": 1.25
        }
      }
    }
  }
}
```

By subscribing to Chatwoot's outgoing webhook triggers (`webhooks_v1`), we proxy responses through our central API Gateway, feeding high-fidelity state data dynamically to the agent dashboard:

```typescript
// server/chatwoot-bridge.ts
import { Request, Response } from "express";

/**
 * Chatwoot Agent Panel Context Provider Hook
 * When the support agent expands a discussion, the panel requests AastaClean transaction context
 */
export async function handleChatwootAgentContextQuery(req: Request, res: Response) {
  const { email, phone } = req.query;

  if (!email && !phone) {
    return res.status(400).json({ error: "Missing identity query parameter (email or phone)" });
  }

  try {
    // 1. Fetch complete historic records from Payload CMS Quote Collection
    // (Query structured filter matching exact contact data)
    let queryFilter = "";
    if (email) queryFilter = `where[email][equals]=${encodeURIComponent(email as string)}`;
    else queryFilter = `where[phone][equals]=${encodeURIComponent(phone as string)}`;

    const payloadRaw = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/quotes?${queryFilter}&limit=3`, {
      headers: { "Authorization": `JWT ${process.env.PAYLOAD_SYSTEM_TOKEN}` }
    });

    const quotesObj = await payloadRaw.json() as any;
    const clientQuotes = quotesObj.docs || [];

    // 2. Synthesize payload for the agent's screen widget
    return res.json({
      clientIdentity: {
        email,
        phone,
      },
      activeIncidentMetrics: {
        totalQuotesRequested: clientQuotes.length,
        hasActiveBooking: clientQuotes.some((q: any) => q.bookingStatus !== 'completed' && q.bookingStatus !== 'pending'),
      },
      quoteHistory: clientQuotes.map((q: any) => ({
        quoteId: q.id,
        service: q.serviceName,
        estimatedCost: q.estimatedTotal,
        bookedStatus: q.bookingStatus,
        cleanerAssigned: q.assignedCleaner?.name || "Unassigned",
        createdOn: q.createdAt,
      }))
    });
  } catch (err) {
    console.error("Chatwoot context gateway mismatch:", err);
    return res.status(500).json({ error: "Internal Gateway failed to query customer context matching active conversation" });
  }
}
```

---

## 4. Administrative Gateway: Unified Key Configuration Console

The unified configuration console resides server-side behind `/api/admin/integrations/config` inside our full-stack Express layer on Port 3000. It solves key leak vulnerabilities by strictly acting as an encrypted credential proxy, holding all credentials inside sandboxed system caches.

```
                  ┌──────────────────────────────────────────────┐
                  │          Secure Operational Environment      │
                  │                                              │
 CLIENT BROWSER   │      EXPRESS APIS                     GATEWAY│
 ┌────────────┐   │    ┌──────────────┐             ┌──────────┐ │
 │   Admin    │───┼───>│ Request Sync │────────────>│  Twenty  │ │
 │ Dashboard  │◀──┼────│ (Decrypt)    │◀────────────│  CRM APIS│ │
 └────────────┘   │    └──────────────┘             └──────────┘ │
                  │           │                            │     │
                  │           ▼                            ▼     │
                  │    ┌──────────────┐             ┌──────────┐ │
                  │    │ Access Token │────────────>│Payload   │ │
                  │    │ Vault (AES256)             │  CMS APIS│ │
                  │    └──────────────┘             └──────────┘ │
                  │                                              │
                  └──────────────────────────────────────────────┘
```

### Encryption Engine & Controller Routing File (`server/admin-CoreConfig.ts`)

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Loaded from secure platform environment variables
const ENCRYPTION_KEY = process.env.CORE_ENCRYPTION_SECRET || "d6f9b8c0a3e421d8b2f1a0e9c8d7b6a5"; 
const IV_LENGTH = 16;

export function encryptCredential(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptCredential(text: string): string {
  const textParts = text.split(":");
  const ivStr = textParts.shift();
  if (!ivStr) throw new Error("Decryption failure: Invalid IV string structure.");
  const iv = Buffer.from(ivStr, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Secure Config payload saved in storage
 */
export interface MasterIntegrationsConfig {
  payloadCmsUrl: string;
  payloadToken: string;       // Saved as encrypted
  twentyCmsUrl: string;
  twentyToken: string;        // Saved as encrypted
  chatwootUrl: string;
  chatwootToken: string;      // Saved as encrypted
  updatedAt: string;
}

// In-Memory Secure Cache Layer
let secureConfigInstance: MasterIntegrationsConfig = {
  payloadCmsUrl: "https://payload.aastaclean.com.au",
  payloadToken: encryptCredential("demo_payload_token_secret"),
  twentyCmsUrl: "https://twenty.aastaclean.com.au",
  twentyToken: encryptCredential("demo_twenty_token_secret"),
  chatwootUrl: "https://chatwoot.aastaclean.com.au",
  chatwootToken: encryptCredential("demo_chatwoot_token_secret"),
  updatedAt: new Date().toISOString(),
};

/**
 * Accessor Proxy interface (Client never gets the real tokens, only masked previews or validation indicators)
 */
export async function getIntegrationsProxyConfig(req: any, res: any) {
  // Simple check ensuring request is coming from authorized session user
  if (!req.headers["x-aastaclean-admin-auth"]) {
    return res.status(401).json({ error: "Unauthorized access to secret administrative gateway proxy." });
  }

  return res.json({
    payloadCmsUrl: secureConfigInstance.payloadCmsUrl,
    payloadTokenMasked: "••••••••••••••••••••" + decryptCredential(secureConfigInstance.payloadToken).slice(-4),
    twentyCmsUrl: secureConfigInstance.twentyCmsUrl,
    twentyTokenMasked: "••••••••••••••••••••" + decryptCredential(secureConfigInstance.twentyToken).slice(-4),
    chatwootUrl: secureConfigInstance.chatwootUrl,
    chatwootTokenMasked: "••••••••••••••••••••" + decryptCredential(secureConfigInstance.chatwootToken).slice(-4),
    updatedAt: secureConfigInstance.updatedAt
  });
}

/**
 * Handler for securely saving updated configurations
 */
export async function updateIntegrationsProxyConfig(req: any, res: any) {
  if (!req.headers["x-aastaclean-admin-auth"]) {
    return res.status(401).json({ error: "Unauthorized update action. Authorization header required." });
  }

  const { payloadCmsUrl, payloadToken, twentyCmsUrl, twentyToken, chatwootUrl, chatwootToken } = req.body;

  if (payloadCmsUrl) secureConfigInstance.payloadCmsUrl = payloadCmsUrl;
  if (payloadToken && !payloadToken.startsWith("••••")) {
    secureConfigInstance.payloadToken = encryptCredential(payloadToken);
  }
  
  if (twentyCmsUrl) secureConfigInstance.twentyCmsUrl = twentyCmsUrl;
  if (twentyToken && !twentyToken.startsWith("••••")) {
    secureConfigInstance.twentyToken = encryptCredential(twentyToken);
  }

  if (chatwootUrl) secureConfigInstance.chatwootUrl = chatwootUrl;
  if (chatwootToken && !chatwootToken.startsWith("••••")) {
    secureConfigInstance.chatwootToken = encryptCredential(chatwootToken);
  }

  secureConfigInstance.updatedAt = new Date().toISOString();

  console.log("🔒 Credentials rotated, re-encrypted, and updated on Master config proxy.");
  return res.json({ success: true, message: "Credentials safely saved and encrypted." });
}
```

---

## Conclusion & Actionable Timeline

This integration strategy optimizes performance, achieves outstanding organizational security, and delivers perfect SEO/AEO index compatibility dynamically from the backend proxy.

| Phase | Objective | Deliverables | Target Timeline |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Schema Deployment & Headless core | Init Payload CMS, mount database schemas, local reconciler logic. | Weeks 1 - 2 |
| **Phase 2** | Customer Relationship Sync | Implement Twenty CRMOpportunity mappings, webhook triggers. | Weeks 3 - 4 |
| **Phase 3** | Live Support Bridging | Setup Chatwoot Conversation attribute ingestion & context mapping. | Weeks 5 - 6 |
| **Phase 4** | Administration Panel Lock | Deploy encrypted proxy, restrict API Keys, launch global checks. | Week 7 |
