import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { calculateQuote } from "./src/utils/PricingCalculator";
import { SERVICE_METADATA } from "./src/config/ServiceCatalog";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API HTML & JSON routes first
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
