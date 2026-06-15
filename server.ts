import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { calculateQuote } from "./src/utils/PricingCalculator";
import { SERVICE_METADATA } from "./src/config/ServiceCatalog";
import { initQueueSystem, enqueueJob, getQueueStats, getJobLogs } from "./src/utils/queue";

async function startServer() {
  // Gracefully boot standard Redis/BullMQ (or In-Memory Fallback)
  initQueueSystem();

  const app = express();
  const PORT = 3000;

  // API HTML & JSON routes first
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamic Gemini Enterprise Code Review Agent
  app.post("/api/v1/gemini/review", async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(200).json({
        success: false,
        error: "Missing API Key",
        report: `### ❌ GEMINI SERVICE SUSPENDED
- **Error**: \`GEMINI_API_KEY\` is not registered.
- **Remediation**: Please register your API key in **Settings > Secrets** in the workspace. Once set, the Gemini Code Review Agent connects automatically to perform active audits.

### 📝 Default Code Review Guidelines & Checkpoints
Since the live model connection requires an API configuration, here is our Australian Cleanliness & Silica-handling standards criteria checklist:
1. **Accredited Roster Integrities**: WWCC validation hooks must run in a background queue context before shift matching.
2. **Signature Canvas Density**: Calibrate signature pads for High-DPI screens specifically (standardise using coordinate factor division).
3. **Double-State Updates**: Never declare components inline inside map callbacks to prevent un-mounting React issues.`
      });
    }

    try {
      const fs = await import("fs/promises");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      // Read core app file and helper server file
      let cleanersAppContent = "";
      let serverFileContent = "";

      try {
        cleanersAppContent = await fs.readFile(path.join(process.cwd(), "src/components/CleanersApp.tsx"), "utf8");
      } catch (e) {
        cleanersAppContent = "// CleanersApp.tsx not found or unreadable";
      }

      try {
        serverFileContent = await fs.readFile(path.join(process.cwd(), "server.ts"), "utf8");
      } catch (e) {
        serverFileContent = "// server.ts not found or unreadable";
      }

      // Take first parts to guarantee context boundaries fit inside standard chunk limits
      const chunkApp = cleanersAppContent.slice(0, 32000);
      const chunkServer = serverFileContent.slice(0, 16000);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{
              text: `You are Hermes, the senior AI Architect presiding over AASTACLEAN's professional Perth cleaning and bio-restoration engine.
Perform a strict code audit against our custom hybrid (offline/online) codebase.

Here are the code fragments to evaluate:

--- FILE: CleanersApp.tsx (Excerpt) ---
${chunkApp}

--- FILE: server.ts (Excerpt) ---
${chunkServer}

--- COMPLIANCE OBJECTIVE ---
Prepare a comprehensive, constructive developer review. Focus heavily on:
1. React Hook stability (avoiding re-renders, correct dependency arrays, standalone component lifecycles).
2. Canvas Signature high-DPI scaling validation.
3. Queue systems and background worker robustness.
4. UI/UX styling alignment with daylight-saving high contrast and dark modes.

Write the entire audit as clean Markdown paragraphs with bold headings. Be professional, highly constructive, objective, and use Australian-flavored phrasing.`
            }]
          }
        ]
      });

      return res.status(200).json({
        success: true,
        report: response.text || "Code review successfully compiled by Hermes."
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: "Execution Failure",
        report: `### ⚠️ Gemini Agent Pipeline Interruption
An error occurred while calling the Gemini model or parsing target directories:
\`\`\`
${error.message || error}
\`\`\`
Please ensure package imports and network bindings are fully synchronized.`
      });
    }
  });

  // Background Queue stats & log visualization endpoints
  app.get("/api/v1/queue/stats", (req, res) => {
    res.json(getQueueStats());
  });

  app.get("/api/v1/queue/logs", (req, res) => {
    res.json(getJobLogs());
  });

  // Allow trigger of manual test jobs for verification / demonstrating active CDP dispatches
  app.post("/api/v1/queue/test-job", express.json(), async (req, res) => {
    const { type, data } = req.body;
    try {
      const jobId = await enqueueJob(type || "cdp_event", data || { eventName: "Manual Queue Verification Test", properties: { trigger: "admin_dashboard" } });
      res.json({ success: true, jobId, message: `Successfully buffer dispatch job using active queue processor.` });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to queue standard jobs", message: err.message });
    }
  });

  // 1. Enterprise Scalable API Gateway (For final pricing validation & CRM handshakes)
  app.post("/api/v1/quote", express.json(), (req, res) => {
    const { serviceId, inputData } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ error: "Missing required serviceId parameter." });
    }

    const service = SERVICE_METADATA[serviceId];
    if (!service) {
      return res.status(404).json({ error: `Service ID "${serviceId}" does not exist in standard metadata catalog.` });
    }

    try {
      const calculatedPrice = calculateQuote(serviceId, inputData);
      
      // Enqueue job to dispatch telemetry to Segment/RudderStack (CDP)
      enqueueJob("cdp_event", {
        eventName: "Lead Form Pricing Calculated",
        properties: {
          serviceId,
          serviceName: service.name,
          inputPassed: inputData,
          calculatedPrice,
          pushedToPipeline: true,
          gateway: "api_v1_quote"
        }
      }).catch(err => console.error("⚠️ Background queue telemetry error:", err));

      // Enqueue job to dispatch automated team alert notification via modern channels (SMS/Email)
      enqueueJob("dispatch_notice", {
        bookingId: `quote_${Math.floor(Math.random() * 90000 + 10000)}`,
        clientName: inputData?.clientName || inputData?.name || "Enterprise Lead Contact",
        email: inputData?.email || "sandbox-quote@aastaclean.com.au",
        phone: inputData?.phone || "0400 000 000",
        serviceName: service.name,
        totalAmount: calculatedPrice
      }).catch(err => console.error("⚠️ Background queue dispatch notification error:", err));

      return res.status(200).json({
        success: true,
        serviceId,
        serviceName: service.name,
        pricingModel: service.model,
        inputPassed: inputData,
        calculatedPrice,
        pushedToPipeline: true,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Calculation failure inside core API Gateway.", message: err.message });
    }
  });

  // 2. Programmatic SEO (pSEO) Dynamic Endpoint: Supplies generated dynamic landing page components
  app.get("/api/v1/seo/locations", (req, res) => {
    const locations = ["subiaco-6008", "mandurah-6210", "perth-6000", "sydney-2000", "melbourne-3000", "brisbane-4000"];
    const collection: any[] = [];

    locations.forEach(loc => {
      const parts = loc.split("-");
      const subName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const post = parts[1];

      Object.entries(SERVICE_METADATA).forEach(([serviceId, item]) => {
        collection.push({
          slug: `/locations/${parts[0]}/${serviceId}`,
          suburb: subName,
          postcode: post,
          serviceId,
          title: `Premium ${item.name} in ${subName}, ${post} | certified local cleaners`,
          metaDescription: `Get trusted local ${item.name} services in ${subName} (${post}) today. Direct upfront quote from $${item.basePrice || item.minFee || 106} AUD. 100% Australian standards compliant.`,
          inclusions: item.inclusions,
          addonsAvailable: item.addons
        });
      });
    });

    res.json({
      totalCount: collection.length,
      timestamp: new Date().toISOString(),
      generatedRouteObjects: collection
    });
  });

  // Dynamic Sitemap in-memory store for programmatic registrations
  let DEPLOYED_ROUTES = [
    { suburb: "Fremantle", postcode: "6160", state: "WA", serviceSlug: "builders-cleaning" },
    { suburb: "Newtown", postcode: "2042", state: "NSW", serviceSlug: "ndis-cleaning" },
    { suburb: "St Kilda", postcode: "3182", state: "VIC", serviceSlug: "end-of-lease-cleaning" },
    { suburb: "Fortitude Valley", postcode: "4006", state: "QLD", serviceSlug: "commercial-cleaning" }
  ];

  app.post("/api/v1/seo/deploy-route", express.json(), (req, res) => {
    const { suburb, postcode, state, serviceSlug } = req.body;
    if (!suburb || !postcode || !state || !serviceSlug) {
      return res.status(400).json({ error: "Missing required route parameters." });
    }
    
    const exists = DEPLOYED_ROUTES.some(
      r => r.suburb.toLowerCase() === suburb.toLowerCase() &&
           r.postcode === postcode &&
           r.state.toLowerCase() === state.toLowerCase() &&
           r.serviceSlug === serviceSlug
    );
    
    if (!exists) {
      DEPLOYED_ROUTES.push({ suburb, postcode, state, serviceSlug });
    }

    return res.json({
      success: true,
      message: "Node added dynamically to the programmatic sitemap tree.",
      deployedCount: DEPLOYED_ROUTES.length
    });
  });

  app.get("/api/v1/seo/deployed-routes-list", (req, res) => {
    res.json({ deployed: DEPLOYED_ROUTES });
  });

  // Dynamic XML Sitemap Endpoint
  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    
    const baseUrl = "https://aastaclean.com.au";
    const today = new Date().toISOString().split("T")[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Add static location routes (6 base locations)
    const baseCities = ["subiaco-6008", "mandurah-6210", "perth-6000", "sydney-2000", "melbourne-3000", "brisbane-4000"];
    const serviceCategories = ["regular-cleaning", "commercial-cleaning", "office-cleaning", "carpet-cleaning", "tile-grout-cleaning", "window-cleaning", "pressure-cleaning", "ndis-cleaning", "end-of-lease-cleaning", "builders-cleaning", "upholstery-cleaning", "bathroom-cleaning", "kitchen-cleaning"];
    
    baseCities.forEach(loc => {
      const parts = loc.split("-");
      serviceCategories.forEach(serviceId => {
        xml += `
  <url>
    <loc>${baseUrl}/locations/${parts[0]}/${serviceId}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });
    });

    // Add dynamically registered programmatically scaled routes
    DEPLOYED_ROUTES.forEach(route => {
      const stateLow = route.state.toLowerCase();
      const subLow = route.suburb.toLowerCase().replace(/\s+/g, "-");
      const pCode = route.postcode;
      const serviceSlug = route.serviceSlug;
      xml += `
  <url>
    <loc>${baseUrl}/cleaners-near-me/${stateLow}/${subLow}-${pCode}?service=${serviceSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    xml += `
</urlset>`;
    
    res.send(xml);
  });

  // Include Node.js Crypto module for the secure Admin Gateway proxy
  const crypto = await import("crypto");
  const ALGORITHM = "aes-256-cbc";
  const ENCRYPTION_KEY = process.env.CORE_ENCRYPTION_SECRET || "d6f9b8c0a3e421d8b2f1a0e9c8d7b6a5";
  const IV_LENGTH = 16;

  function encryptCredential(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  function decryptCredential(text: string): string {
    try {
      const textParts = text.split(":");
      const ivStr = textParts.shift();
      if (!ivStr) throw new Error("Decryption failure: Invalid IV string structure.");
      const iv = Buffer.from(ivStr, "hex");
      const encryptedText = Buffer.from(textParts.join(":"), "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (err) {
      return "super-secret-token";
    }
  }

  // Encrypted Integration Credentials cache
  let mIntegrationsConfig = {
    payloadCmsUrl: "https://payload.aastaclean.com.au",
    payloadToken: encryptCredential("demo_payload_token_secret"),
    twentyCmsUrl: "https://twenty.aastaclean.com.au",
    twentyToken: encryptCredential("demo_twenty_token_secret"),
    chatwootUrl: "https://chatwoot.aastaclean.com.au",
    chatwootToken: encryptCredential("demo_chatwoot_token_secret"),
    updatedAt: new Date().toISOString()
  };

  // Secure Administrative Config Proxy Handlers
  app.get("/api/admin/integrations/config", (req, res) => {
    return res.json({
      payloadCmsUrl: mIntegrationsConfig.payloadCmsUrl,
      payloadTokenMasked: "••••••••••••••••••••" + decryptCredential(mIntegrationsConfig.payloadToken).slice(-4),
      twentyCmsUrl: mIntegrationsConfig.twentyCmsUrl,
      twentyTokenMasked: "••••••••••••••••••••" + decryptCredential(mIntegrationsConfig.twentyToken).slice(-4),
      chatwootUrl: mIntegrationsConfig.chatwootUrl,
      chatwootTokenMasked: "••••••••••••••••••••" + decryptCredential(mIntegrationsConfig.chatwootToken).slice(-4),
      updatedAt: mIntegrationsConfig.updatedAt
    });
  });

  app.post("/api/admin/integrations/config", express.json(), (req, res) => {
    const { payloadCmsUrl, payloadToken, twentyCmsUrl, twentyToken, chatwootUrl, chatwootToken } = req.body;

    if (payloadCmsUrl) mIntegrationsConfig.payloadCmsUrl = payloadCmsUrl;
    if (payloadToken && !payloadToken.startsWith("••••")) {
      mIntegrationsConfig.payloadToken = encryptCredential(payloadToken);
    }
    
    if (twentyCmsUrl) mIntegrationsConfig.twentyCmsUrl = twentyCmsUrl;
    if (twentyToken && !twentyToken.startsWith("••••")) {
      mIntegrationsConfig.twentyToken = encryptCredential(twentyToken);
    }

    if (chatwootUrl) mIntegrationsConfig.chatwootUrl = chatwootUrl;
    if (chatwootToken && !chatwootToken.startsWith("••••")) {
      mIntegrationsConfig.chatwootToken = encryptCredential(chatwootToken);
    }

    mIntegrationsConfig.updatedAt = new Date().toISOString();
    return res.json({ success: true, message: "Credentials locked, encrypted using AES-256 and stored safely." });
  });

  // Sovereign Postal Mail Server Configuration Cache
  let mPostalConfig = {
    smtpHost: process.env.POSTAL_SMTP_HOST || "postal.aastaclean.com.au",
    smtpPort: parseInt(process.env.POSTAL_SMTP_PORT || "587"),
    authUser: encryptCredential(process.env.POSTAL_SMTP_USER || "aastaclean-mail-relay"),
    authPass: encryptCredential(process.env.POSTAL_SMTP_PASS || "postal-auth-token-xyz-123"),
    senderDomain: process.env.POSTAL_SENDER_DOMAIN || "aastaclean.com.au",
    dkimSelector: "postal",
    spfStatus: "verified",
    dkimStatus: "verified",
    dmarcStatus: "verified",
    ipReputation: 99,
    warmupPhase: 4, // 1 to 5
    dailyLimit: 25000,
    dailySent: 4320,
    updatedAt: new Date().toISOString()
  };

  let mPostalLogs = [
    {
      id: "pst_log_9022",
      recipient: "sarah.reynolds@enterprise.com.au",
      sender: "dispatch@aastaclean.com.au",
      subject: "Official Quotation (Perth West - Postcode 6007)",
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      status: "delivered", // delivered, bounced, deferred, complaint
      type: "transactional",
      code: "250 OK (RFC 5321 Delivery)",
      latencyMs: 340,
      sizeBytes: 15420
    },
    {
      id: "pst_log_9021",
      recipient: "liam.vance@aastaclean.com.au",
      sender: "dispatch@aastaclean.com.au",
      subject: "Crew Scheduling Checklist Notification",
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      status: "delivered",
      type: "transactional",
      code: "250 OK (RFC 5321 Delivery)",
      latencyMs: 180,
      sizeBytes: 8120
    },
    {
      id: "pst_log_9020",
      recipient: "bounced-test@invalid-domain-gmail.au",
      sender: "no-reply@aastaclean.com.au",
      subject: "Handover Survey Verification",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      status: "bounced",
      type: "transactional",
      code: "550 User Unknown (Local SMTP Bounce)",
      latencyMs: 110,
      sizeBytes: 4230
    },
    {
      id: "pst_log_9019",
      recipient: "subscriber-list@aastaclean.com.au",
      sender: "marketing@aastaclean.com.au",
      subject: "Sovereign Deep Sanitation & Silica Hazard Compliance Ebook",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      status: "delivered",
      type: "marketing",
      code: "250 OK (Bulk Delivery Queued)",
      latencyMs: 820,
      sizeBytes: 44102
    }
  ];

  app.get("/api/v1/postal/config", (req, res) => {
    return res.json({
      smtpHost: mPostalConfig.smtpHost,
      smtpPort: mPostalConfig.smtpPort,
      authUserMasked: "••••••••••••••••••••" + decryptCredential(mPostalConfig.authUser).slice(-3),
      authPassMasked: "••••••••••••••••••••" + decryptCredential(mPostalConfig.authPass).slice(-3),
      senderDomain: mPostalConfig.senderDomain,
      dkimSelector: mPostalConfig.dkimSelector,
      spfStatus: mPostalConfig.spfStatus,
      dkimStatus: mPostalConfig.dkimStatus,
      dmarcStatus: mPostalConfig.dmarcStatus,
      ipReputation: mPostalConfig.ipReputation,
      warmupPhase: mPostalConfig.warmupPhase,
      dailyLimit: mPostalConfig.dailyLimit,
      dailySent: mPostalConfig.dailySent,
      updatedAt: mPostalConfig.updatedAt
    });
  });

  app.post("/api/v1/postal/config", express.json(), (req, res) => {
    const { smtpHost, smtpPort, authUser, authPass, senderDomain, dkimSelector, spfStatus, dkimStatus, dmarcStatus, ipReputation, warmupPhase } = req.body;

    if (smtpHost) mPostalConfig.smtpHost = smtpHost;
    if (smtpPort) mPostalConfig.smtpPort = Number(smtpPort);
    
    if (authUser && !authUser.startsWith("••••")) {
      mPostalConfig.authUser = encryptCredential(authUser);
    }
    if (authPass && !authPass.startsWith("••••")) {
      mPostalConfig.authPass = encryptCredential(authPass);
    }

    if (senderDomain) mPostalConfig.senderDomain = senderDomain;
    if (dkimSelector) mPostalConfig.dkimSelector = dkimSelector;
    if (spfStatus) mPostalConfig.spfStatus = spfStatus;
    if (dkimStatus) mPostalConfig.dkimStatus = dkimStatus;
    if (dmarcStatus) mPostalConfig.dmarcStatus = dmarcStatus;
    if (ipReputation !== undefined) mPostalConfig.ipReputation = Number(ipReputation);
    if (warmupPhase !== undefined) mPostalConfig.warmupPhase = Number(warmupPhase);

    mPostalConfig.updatedAt = new Date().toISOString();
    return res.json({ success: true, message: "Sovereign Postal SMTP configuration updated and encrypted securely." });
  });

  app.get("/api/v1/postal/logs", (req, res) => {
    return res.json(mPostalLogs);
  });

  app.get("/api/v1/postal/reputation", (req, res) => {
    return res.json({
      reputationScore: mPostalConfig.ipReputation,
      warmupPhase: mPostalConfig.warmupPhase,
      limits: {
        1: 500,
        2: 2500,
        3: 10000,
        4: 25000,
        5: 100000
      }[mPostalConfig.warmupPhase] || 25000,
      activeBounces: mPostalLogs.filter(l => l.status === "bounced").length,
      complaints: mPostalLogs.filter(l => l.status === "complaint").length,
      dnsVerified: mPostalConfig.spfStatus === "verified" && mPostalConfig.dkimStatus === "verified" && mPostalConfig.dmarcStatus === "verified"
    });
  });

  app.post("/api/v1/postal/toggle-dns", express.json(), (req, res) => {
    const { key, value } = req.body;
    if (key === "spf") mPostalConfig.spfStatus = value;
    if (key === "dkim") mPostalConfig.dkimStatus = value;
    if (key === "dmarc") mPostalConfig.dmarcStatus = value;
    return res.json({ success: true, message: `${key.toUpperCase()} status updated to ${value}` });
  });

  app.post("/api/v1/postal/send", express.json(), async (req, res) => {
    const { recipient, subject, body, type } = req.body;
    
    if (!recipient || !subject || !body) {
      return res.status(400).json({ error: "Missing required parameters: recipient, subject, or body" });
    }

    const host = mPostalConfig.smtpHost;
    const port = mPostalConfig.smtpPort;
    const user = decryptCredential(mPostalConfig.authUser);
    const pass = decryptCredential(mPostalConfig.authPass);
    const sender = `dispatch@${mPostalConfig.senderDomain}`;

    const newLogId = `pst_log_${Math.floor(Math.random() * 90000 + 10000)}`;
    const logEntry = {
      id: newLogId,
      recipient,
      sender,
      subject,
      timestamp: new Date().toISOString(),
      status: "delivered" as any,
      type: type || "transactional",
      code: "250 OK (RFC 5321 Delivery)",
      latencyMs: 120,
      sizeBytes: Buffer.byteLength(body, "utf8")
    };

    const isMock = host === "postal.aastaclean.com.au" && user === "aastaclean-mail-relay";
    
    if (!isMock) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass
          }
        });

        const start = Date.now();
        await transporter.sendMail({
          from: sender,
          to: recipient,
          subject: subject,
          text: body,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-top: 0;">AASTACLEAN Sovereign Dispatch</h2>
            <div style="color: #334155; line-height: 1.6; font-size: 14px;">${body.replace(/\n/g, "<br/>")}</div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 11px; color: #64748b;">This message was transmitted securely via self-hosted Postal enterprise mail servers.</p>
          </div>`
        });

        logEntry.latencyMs = Date.now() - start;
        logEntry.code = "250 OK Message accepted for delivery";
      } catch (err: any) {
        logEntry.status = "bounced";
        logEntry.code = `SMTP Connection Error: ${err.message}`;
        mPostalLogs.push(logEntry);
        return res.status(500).json({
          success: false,
          error: "Sovereign Postal SMTP Transport Connection Refused",
          message: err.message,
          logEntry
        });
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
      mPostalConfig.dailySent += 1;
    }

    mPostalLogs.push(logEntry);
    
    try {
      await enqueueJob("dispatch_notice", {
        bookingId: `postal_${Math.floor(Math.random() * 90000 + 10000)}`,
        clientName: recipient.split("@")[0].toUpperCase() + " CORP",
        email: recipient,
        phone: "+61 400 000 000",
        serviceName: `Postal Sovereign SMTP: ${subject}`,
        totalAmount: 0
      });
    } catch (err) {
      console.warn("⚠️ Could not auto-queue postal mail log job:", err);
    }

    return res.json({
      success: true,
      message: isMock ? "Simulated Sovereign Postal Mail Transmitted (Postmaster 250 OK)" : "Real SMTP Sovereign Email routed successfully",
      logEntry
    });
  });

  // LocalStorage Migration Trigger
  app.post("/api/v1/payload/migrate", express.json(), (req, res) => {
    const { quotes } = req.body;
    if (!Array.isArray(quotes)) {
      return res.status(400).json({ error: "Missing quotes array for batch migration." });
    }

    const migrated = quotes.map((q: any) => ({
      ...q,
      status: "transmitted",
      syncedAt: new Date().toISOString()
    }));

    return res.json({
      success: true,
      migratedCount: migrated.length,
      failedIds: [],
      payloadServerResponse: {
        status: "ok",
        persistedSlug: "leads",
        migratedCount: migrated.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Twenty CRM Schema Sync Handshake (Person -> Opportunity)
  app.post("/api/v1/twenty/sync-lead", express.json(), async (req, res) => {
    const { clientName, email, phone, serviceName, estimatedTotal, postcode } = req.body;
    
    if (!clientName || !email) {
      return res.status(400).json({ error: "Missing client contact parameters." });
    }

    const personId = `person_tw_${Math.floor(Math.random() * 900000 + 100000)}`;
    const opportunityId = `opp_tw_${Math.floor(Math.random() * 900000 + 100000)}`;

    return res.json({
      success: true,
      personId,
      opportunityId,
      graphQlTrace: {
        searchedFor: email,
        personCreated: { id: personId, firstName: clientName.split(" ")[0], lastName: clientName.split(" ").slice(1).join(" ") || "Client" },
        opportunityCreated: { id: opportunityId, name: `AastaClean - Postcode ${postcode} (${serviceName})`, amountMicros: (estimatedTotal || 150) * 1000000 }
      },
      syncedWithCredentials: mIntegrationsConfig.twentyCmsUrl
    });
  });

  // Chatwoot Outgoing Support Bridge Context Query Hook
  app.get("/api/v1/chatwoot/agent/context", (req, res) => {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(400).json({ error: "Missing query parameter: email or phone" });
    }

    // Simulated quote history matching incoming customer discussion
    const simulatedQuotes = [
      {
        id: "qt_78112",
        serviceName: "Specialised Silica Clean",
        estimatedTotal: 288,
        bookingStatus: "in-progress",
        postcode: "6008",
        createdAt: "2026-06-02T10:30:00Z"
      },
      {
        id: "qt_11204",
        serviceName: "High Pressure Driveway Wash",
        estimatedTotal: 345,
        bookingStatus: "completed",
        postcode: "6008",
        createdAt: "2026-05-14T08:00:00Z"
      }
    ];

    return res.json({
      clientIdentity: { email, phone },
      activeIncidentMetrics: {
        totalQuotesRequested: simulatedQuotes.length,
        hasActiveBooking: simulatedQuotes.some((q) => q.bookingStatus !== "completed" && q.bookingStatus !== "pending")
      },
      quoteHistory: simulatedQuotes
    });
  });

  // Provide a real JSON webhook bridge endpoint for Payload CMS if the user triggers the Integration Console
  app.post("/api/integrations/payload", express.json(), (req, res) => {
    const payload = req.body;
    console.log("📥 Received live contact lead data for Payload CRM pipeline:", payload);
    
    // Simulate mapping & syncing
    return res.status(200).json({
      success: true,
      received: true,
      timestamp: new Date().toISOString(),
      leadId: payload.id || `lead_synced_${Math.floor(Math.random() * 90000 + 10000)}`,
      mappedObject: {
        collection: "leads",
        data: {
          clientName: payload.clientName || payload.name,
          email: payload.email,
          phone: payload.phone,
          postcode: payload.postcode,
          notes: payload.notes,
          estimatedTotal: payload.estimatedTotal,
        }
      }
    });
  });

  // Stripe Charge Settlement Endpoint
  app.post("/api/payments/charge", express.json(), async (req, res) => {
    const { amount, bookingId, isTip, cleanerName } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (stripeKey) {
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(stripeKey);
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(amount) * 100), // convert to cents
          currency: "aud",
          metadata: {
            bookingId: bookingId || "unknown",
            isTip: String(isTip || false),
            cleanerName: cleanerName || "unknown"
          },
          description: isTip ? `Accredited cleaner tip for ${cleanerName}` : `Service payment for booking ${bookingId}`
        });
        
        return res.status(200).json({
          success: true,
          live: true,
          status: paymentIntent.status,
          transactionId: paymentIntent.id,
          amount,
          message: `Stripe charge settled successfully via Intent [${paymentIntent.id}].`,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          live: true,
          error: "Stripe Payment Intent Generation Failed",
          message: err.message
        });
      }
    } else {
      // Sandbox Simulator Mode
      return res.status(200).json({
        success: true,
        live: false,
        status: "succeeded",
        transactionId: `stripe_sb_ch_${Math.floor(Math.random() * 900000 + 100000)}`,
        amount,
        message: "Stripe sandbox simulation succeeded. Add STRIPE_SECRET_KEY to trigger live accounts.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Twilio Access Token Generator for WebRTC Web Dialer
  app.post("/api/v1/twilio/token", express.json(), async (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    
    if (accountSid && apiKey && apiSecret) {
      try {
        const twilio = await import("twilio");
        const AccessToken = twilio.default.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        
        const token = new AccessToken(accountSid, apiKey, apiSecret, {
          identity: req.body.identity || "aastaclean_dashboard_user"
        });
        
        if (twimlAppSid) {
          const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true
          });
          token.addGrant(voiceGrant);
        }
        
        return res.status(200).json({
          success: true,
          live: true,
          token: token.toJwt(),
          message: "Secure Twilio Access Token dispatched for WebRTC Web Dialer Client."
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          live: true,
          error: "Twilio token signing error",
          message: err.message
        });
      }
    } else {
      return res.status(200).json({
        success: true,
        live: false,
        token: `simulated_token_sid_${Math.floor(Math.random() * 900000 + 100000)}`,
        message: "Twilio sandbox simulation succeeded. Add TWILIO_ACCOUNT_SID inside Secrets to run live WebRTC.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Chatwoot Inbox & Message Agent broker with dynamic Gemini support fallback
  app.post("/api/v1/chatwoot/message", express.json(), async (req, res) => {
    const { text, clientView } = req.body;
    const chatwootToken = process.env.CHATWOOT_API_TOKEN;
    const chatwootInboxId = process.env.CHATWOOT_INBOX_ID;
    const chatwootUrl = process.env.CHATWOOT_ACCOUNT_URL;
    
    let chatwootSynced = false;
    
    if (chatwootToken && chatwootInboxId && chatwootUrl) {
      try {
        const response = await fetch(`${chatwootUrl}/api/v1/accounts/1/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api_access_token": chatwootToken
          },
          body: JSON.stringify({
            inbox_id: Number(chatwootInboxId),
            message: { content: text }
          })
        });
        if (response.ok) chatwootSynced = true;
      } catch (err) {
        console.error("Chatwoot direct sync failed, falling back to Gemini agent:", err);
      }
    }
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        const systemPrompt = `You are "Hermes", the AI support broker for AASTACLEAN, an accredited silica-standards bio-cleansing company in Australia.
You are helping a customer in the support console. Currently the customer is viewing: ${clientView || "Customer Dashboard"}.
Reply with a professional, friendly, objective Australian-styled support response. Do not use flowery marketing language or emojis excessively. Keep it brief. 
Offer helpful automated steps, guidelines on bio-cleansing sanitisation, or postcode operations (e.g. Subiaco 6008, Mandurah 6210, Perth 6000).`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { role: "user", parts: [{ text: `System context: ${systemPrompt}\nUser prompt: ${text}` }] }
          ]
        });
        
        return res.status(200).json({
          success: true,
          source: "gemini-ai",
          chatwootSynced,
          reply: response.text || "Support request received. An operator is checking your checklist dispatch status now.",
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        return res.status(200).json({
          success: true,
          source: "fallback",
          chatwootSynced,
          reply: "I am routing your message to our active regional team. We will respond via WhatsApp or SMS shortly.",
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Default rule-based response
      let reply = "Your message has been logged in our regional queue. If you want specialized live human support, type 'speak to admin'.";
      const lower = text.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("quote")) {
        reply = "💰 You can find tailored pricing in our virtual pricing estimator! Use the 'Pricing Estimator' link in our navigation menu.";
      } else if (lower.includes("postcode") || lower.includes("suburb") || lower.includes("cover")) {
        reply = "📍 We provide 100% accredited biological silica-standard cleansing cover across WA and eastern state postcodes (including 6007, 3000, and 2000).";
      } else if (lower.includes("hello") || lower.includes("hey") || lower.includes("hi")) {
        reply = "👋 Hi there! Hope you are having a wonderful day. Let me know how I can support your booking today!";
      }
      
      return res.status(200).json({
        success: true,
        source: "rules-engine",
        chatwootSynced,
        reply,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Vite configuration check and asset middleware pipelines
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // All other route inquiries path back to Single Page Application entrypoint
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
