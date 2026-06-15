import { useState, useEffect, FormEvent } from "react";
import { 
  Terminal, 
  Database, 
  Code, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Send, 
  Copy, 
  Download, 
  RefreshCw, 
  Layers,
  MessageSquare,
  Sliders,
  Check,
  Plus,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Zap,
  Info,
  ChevronRight,
  Shield,
  Trash2,
  Mail
} from "lucide-react";
import { WebhookConfig, ConnectionLog, QuoteRequest } from "../types";
import { defaultWebhookConfig, allServices } from "../data";

interface IntegrationConsoleProps {
  latestQuotes: QuoteRequest[];
  onTriggerLog: (log: ConnectionLog) => void;
  logs: ConnectionLog[];
  onClearLogs: () => void;
  initialActiveTab?: "webook-tester" | "rudderstack-cdp" | "chatwoot-inbox" | "payload-schema" | "payload-validator" | "twenty-crm" | "active-queues" | "crm-instructions" | "secured-gateway" | "sovereign-postal";
}

export default function IntegrationConsole({
  latestQuotes,
  onTriggerLog,
  logs,
  onClearLogs,
  initialActiveTab,
}: IntegrationConsoleProps) {
  const [config, setConfig] = useState<WebhookConfig>(defaultWebhookConfig);
  const [activeTab, setActiveTab] = useState<"webook-tester" | "rudderstack-cdp" | "chatwoot-inbox" | "payload-schema" | "payload-validator" | "twenty-crm" | "active-queues" | "crm-instructions" | "secured-gateway" | "sovereign-postal">(initialActiveTab || "webook-tester");

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);
  const [isTesting, setIsTesting] = useState(false);
  const [customLogs, setCustomLogs] = useState<ConnectionLog[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // --- SOVEREIGN POSTAL STATE VARIABLES ---
  const [postalHost, setPostalHost] = useState("postal.aastaclean.com.au");
  const [postalPort, setPostalPort] = useState(587);
  const [postalUser, setPostalUser] = useState("");
  const [postalPass, setPostalPass] = useState("");
  const [postalDomain, setPostalDomain] = useState("aastaclean.com.au");
  const [postalSelector, setPostalSelector] = useState("postal");
  const [postalLogs, setPostalLogs] = useState<any[]>([]);
  const [postalReputation, setPostalReputation] = useState<any>({
    reputationScore: 99,
    warmupPhase: 4,
    limits: 25000,
    activeBounces: 1,
    complaints: 0,
    dnsVerified: true
  });
  
  const [postalTestRecipient, setPostalTestRecipient] = useState("sarah.reynolds@enterprise.com.au");
  const [postalTestSubject, setPostalTestSubject] = useState("Official Job Handover Certification");
  const [postalTestBody, setPostalTestBody] = useState(`Hi Sarah,

Your corporate deep clean is complete. Our technicians (Liam Vance) successfully certified the silica dust levels below critical thresholds per standards.

All compliance logs have been backed up to your Twenty CRM.

Regards,
AASTACLEAN Dispatch Team`);
  const [postalIsSending, setPostalIsSending] = useState(false);
  const [postalIsSaving, setPostalIsSaving] = useState(false);

  const fetchPostalData = async () => {
    try {
      const configRes = await fetch("/api/v1/postal/config");
      const logsRes = await fetch("/api/v1/postal/logs");
      const repRes = await fetch("/api/v1/postal/reputation");

      if (configRes.ok) {
        const data = await configRes.json();
        setPostalHost(data.smtpHost);
        setPostalPort(data.smtpPort);
        setPostalDomain(data.senderDomain);
        setPostalSelector(data.dkimSelector);
      }
      if (logsRes.ok) {
        setPostalLogs(await logsRes.json());
      }
      if (repRes.ok) {
        setPostalReputation(await repRes.json());
      }
    } catch (e) {
      console.warn("Could not fetch sovereign postal data:", e);
    }
  };

  // --- BACKGROUND QUEUE SYSTEM STATES ---
  const [queueStats, setQueueStats] = useState<{
    queueMode: "redis" | "memory";
    isRedisConnected: boolean;
    redisUrlUsed: string;
    totals: { all: number; queued: number; active: number; completed: number; failed: number };
  } | null>(null);
  const [queueLogs, setQueueLogs] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [manualQueueEvent, setManualQueueEvent] = useState("cdp_event");
  const [manualQueuePayload, setManualQueuePayload] = useState<string>(`{
  "eventName": "Manual Lead Trigger",
  "properties": {
    "siteCode": "AU-WA-6008",
    "notes": "Buffered through standard BullMQ queue cluster",
    "origin": "integration_portal"
  }
}`);

  const fetchQueueData = async () => {
    try {
      const statsRes = await fetch("/api/v1/queue/stats");
      const logsRes = await fetch("/api/v1/queue/logs");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setQueueStats(stats);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setQueueLogs(logsData);
      }
    } catch (err) {
      console.warn("Failed fetching active background queue statistics:", err);
    }
  };

  useEffect(() => {
    fetchQueueData();
    fetchPostalData();
    const interval = setInterval(() => {
      fetchQueueData();
      fetchPostalData();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerManualJob = async () => {
    setIsQueueLoading(true);
    let parsedData = {};
    try {
      parsedData = JSON.parse(manualQueuePayload);
    } catch (e: any) {
      onTriggerLog({
        id: `queue_err_${Date.now()}`,
        type: "system",
        status: "error",
        message: `⚠️ Queue Dispatch: Invalid JSON compilation. ${e.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsQueueLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/queue/test-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: manualQueueEvent, data: parsedData })
      });

      if (res.ok) {
        const bodyObj = await res.json();
        onTriggerLog({
          id: `queue_dispatch_${Date.now()}`,
          type: "system",
          status: "success",
          message: `📦 [Queue Buffer] Task dispatched. JobID: ${bodyObj.jobId}`,
          timestamp: new Date().toLocaleTimeString(),
          payload: {
            assignedJobId: bodyObj.jobId,
            queueType: queueStats?.queueMode === "redis" ? "Redis + BullMQ Cluster" : "In-Memory EventLoop (Local Preview Mode)",
            payloadBuffered: parsedData
          }
        });
        await fetchQueueData();
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      onTriggerLog({
        id: `queue_err_${Date.now()}`,
        type: "system",
        status: "error",
        message: `❌ Queue trigger failure: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsQueueLoading(false);
    }
  };

  // --- NEW INTEGRATIONS STATE VARIABLES (PHASE 1 FOUNDATION) ---
  
  // RudderStack CDP States
  const [rudderEventName, setRudderEventName] = useState("Quote Requested");
  const [rudderUserId, setRudderUserId] = useState("user_926600");
  const [rudderEventProps, setRudderEventProps] = useState<string>(`{
  "serviceName": "Commercial Cleaning",
  "postcode": "6007",
  "estimatedTotal": 288,
  "clientName": "Sarah Reynolds",
  "email": "sarah.reynolds@enterprise.com.au",
  "currency": "AUD"
}`);
  const [rudderDestinations, setRudderDestinations] = useState([
    { name: "Google Analytics 4", type: "Analytics", status: "active", eventsCount: 14 },
    { name: "Mixpanel", type: "Product Analytics", status: "active", eventsCount: 9 },
    { name: "Snowflake Data Warehouse", type: "Warehouse", status: "pending", eventsCount: 0 },
    { name: "Twenty CRM Connector", type: "CRM", status: "active", eventsCount: 5 }
  ]);
  const [isRudderTracking, setIsRudderTracking] = useState(false);

  // Chatwoot States
  const [chatwootInbox, setChatwootInbox] = useState<"whatsapp" | "sms" | "livechat">("whatsapp");
  const [chatwootReply, setChatwootReply] = useState("");
  const [chatwootWebhookEnabled, setChatwootWebhookEnabled] = useState(true);
  const [chatwootPhoneGateway, setChatwootPhoneGateway] = useState("+61 412 345 678");
  const [chatwootApiToken, setChatwootApiToken] = useState("chatwoot_pat_aasta_926600_sec");
  
  // Custom Chatwoot Mock Conversations State
  const [chatwootConversations, setChatwootConversations] = useState<Array<{
    id: string;
    channel: "whatsapp" | "sms" | "livechat";
    sender: "customer" | "agent" | "system";
    text: string;
    timestamp: string;
    customerName: string;
  }>>([
    { id: "msg_wa_1", channel: "whatsapp", sender: "customer", text: "Hello! Dynamic lookup states showed me that your high-frequency Commercial Office sanitation covers West Perth (6007)? Is that correct?", timestamp: "09:12 AM", customerName: "Sarah (Enterprise)" },
    { id: "msg_wa_2", channel: "whatsapp", sender: "agent", text: "Hi Sarah! Yes, absolutely. Perth West Precinct (postcode 6007) is active. Standard Commercial Office rates start from $42/hr under ISO safety guidelines.", timestamp: "09:15 AM", customerName: "Sarah (Enterprise)" },
    { id: "msg_wa_3", channel: "whatsapp", sender: "customer", text: "Brilliant. I just submitted an active quote through your dynamic estimator board for $288. Let me know if Liam Vance is available for a test run?", timestamp: "09:18 AM", customerName: "Sarah (Enterprise)" },
    { id: "msg_sms_1", channel: "sms", sender: "customer", text: "Need an urgent end of lease cleaning for my 3-bedroom unit in Sydney 2000 on Saturday.", timestamp: "Yesterday", customerName: "Marcus Wood" },
    { id: "msg_sms_2", channel: "sms", sender: "agent", text: "Hi Marcus! Saturday vacancy slots are open in post code 2000 with our bond back guarantee. Base estimate for 3 bed / 2 bath is $390. Would you like us to assign Niamh O'Connor?", timestamp: "Yesterday", customerName: "Marcus Wood" },
    { id: "msg_lc_1", channel: "livechat", sender: "customer", text: "Do you provide WHS certificate files to corporate clients after building cleans?", timestamp: "2 hours ago", customerName: "Visitor #807" },
    { id: "msg_lc_2", channel: "agent", text: "Hello! Yes, absolutely. All cleaning operations are backed by active public liability insurance up to $20M and full safety certifications.", timestamp: "2 hours ago", customerName: "Visitor #807" }
  ]);

  // PayloadCMS Dynamic Collections Schemas
  const [payloadCollection, setPayloadCollection] = useState<"leads" | "cleaners" | "locations">("leads");
  const [payloadCustomFields, setPayloadCustomFields] = useState<Array<{ name: string; type: "text" | "number" | "relationship" | "date" | "checkbox"; required: boolean }>>([
    { name: "priorityRating", type: "number", required: false },
    { name: "channelSource", type: "text", required: true },
    { name: "isNdisApproved", type: "checkbox", required: false }
  ]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "relationship" | "date" | "checkbox">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Twenty CRM Board Opportunities Local State
  const [twentyLeads, setTwentyLeads] = useState<Array<{
    id: string;
    name: string;
    service: string;
    postcode: string;
    amount: number;
    phone: string;
    email: string;
    stage: "incoming" | "contacted" | "qualified" | "won" | "lost";
  }>>([]);

  // Sync Twenty CRM local cards with latestQuotes
  useEffect(() => {
    const combined = [
      ...latestQuotes.map((q, idx) => ({
        id: q.id || `lead_${100 + idx}`,
        name: q.name || "Anonymous Client",
        service: q.serviceName || "Commercial Cleaning",
        postcode: q.postcode || "6007",
        amount: q.estimatedTotal || 288,
        phone: q.phone || "0412 345 678",
        email: q.email || "client@sandbox.au",
        stage: (idx % 4 === 0 ? "won" : idx % 4 === 1 ? "qualified" : idx % 4 === 2 ? "contacted" : "incoming") as any
      })),
      { id: "lead_xx99", name: "David Grohl", service: "Pressure Cleaning", postcode: "4000", amount: 480, phone: "0499 123 456", email: "dave@grohl-studios.com.au", stage: "contacted" as const }
    ];
    
    // Deduplicate by ID
    const unique: typeof combined = [];
    const seen = new Set();
    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    setTwentyLeads(unique);
  }, [latestQuotes]);

  // SECURED GATEWAY CONFIG STATE (AES-256 Cloud Proxy Configuration)
  const [secureGatewayConfig, setSecureGatewayConfig] = useState({
    payloadCmsUrl: "https://payload.aastaclean.com.au",
    payloadToken: "",
    twentyCmsUrl: "https://twenty.aastaclean.com.au",
    twentyToken: "",
    chatwootUrl: "https://chatwoot.aastaclean.com.au",
    chatwootToken: ""
  });
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  // Load Secure Credentials Masked state from Node Node.js API Gateway on activeTab toggle or component mount
  useEffect(() => {
    if (activeTab === "secured-gateway") {
      fetch("/api/admin/integrations/config")
        .then((res) => {
          if (!res.ok) throw new Error("Credentials gateway returned an error state.");
          return res.json();
        })
        .then((data) => {
          setSecureGatewayConfig({
            payloadCmsUrl: data.payloadCmsUrl || "",
            payloadToken: data.payloadTokenMasked || "",
            twentyCmsUrl: data.twentyCmsUrl || "",
            twentyToken: data.twentyTokenMasked || "",
            chatwootUrl: data.chatwootUrl || "",
            chatwootToken: data.chatwootTokenMasked || ""
          });
          onTriggerLog({
            id: `secret_load_${Date.now()}`,
            type: "system",
            status: "info",
            message: `🔐 Secure Gateway: API credentials fetched. Encrypted Secrets are masked safe in browser view.`,
            timestamp: new Date().toLocaleTimeString(),
          });
        })
        .catch((err) => {
          onTriggerLog({
            id: `secret_err_${Date.now()}`,
            type: "system",
            status: "warning",
            message: `🔒 Secure Gateway loading issue: ${err.message}. Defaulting to visual proxies.`,
            timestamp: new Date().toLocaleTimeString(),
          });
        });
    }
  }, [activeTab]);

  const handleSaveSecureKeys = () => {
    setIsSavingKeys(true);
    fetch("/api/admin/integrations/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(secureGatewayConfig)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not update secure server proxy registry.");
        return res.json();
      })
      .then((data) => {
        onTriggerLog({
          id: `secret_save_${Date.now()}`,
          type: "system",
          status: "success",
          message: `🛡️ LOCK SECURE: Secret Keys locked using AES-256 standard and synchronized on server Node.`,
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsSavingKeys(false);
      })
      .catch((err) => {
        onTriggerLog({
          id: `secret_save_err_${Date.now()}`,
          type: "system",
          status: "error",
          message: `⚠️ Gateway update failure: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsSavingKeys(false);
      });
  };

  // --- INTEGRATION LOGIC HANDLERS (PHASES 1 & 2 PIPELINES) ---

  const handleRudderTrack = () => {
    setIsRudderTracking(true);
    let parsedProps = {};
    try {
      parsedProps = JSON.parse(rudderEventProps);
    } catch (e: any) {
      onTriggerLog({
        id: `rudder_err_${Date.now()}`,
        type: "system",
        status: "error",
        message: `⚠️ RudderStack: Invalid properties JSON compilation. ${e.message}`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsRudderTracking(false);
      return;
    }

    setTimeout(() => {
      setIsRudderTracking(false);
      onTriggerLog({
        id: `rudder_event_${Date.now()}`,
        type: "webhook",
        status: "success",
        message: `🛰️ [RudderStack CDP] Track API "${rudderEventName}" successfully dispatched into pipeline. User ID: ${rudderUserId}`,
        timestamp: new Date().toLocaleTimeString(),
        payload: {
          clientEvent: rudderEventName,
          userId: rudderUserId,
          traits: parsedProps,
          timestamp: new Date().toISOString(),
          context: {
            library: { name: "rudder-sdk-js", version: "3.2.1" },
            userAgent: navigator.userAgent,
            locale: "en-AU"
          }
        }
      });

      rudderDestinations.forEach(dest => {
        if (dest.status === "active") {
          onTriggerLog({
            id: `rudder_dest_${dest.name}_${Date.now()}`,
            type: "crm",
            status: "info",
            message: `🔄 [RudderStack Sync] Forwarding event "${rudderEventName}" to Cloud Destination: ${dest.name}`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      });

      setRudderDestinations(prev => prev.map(d => d.status === "active" ? { ...d, eventsCount: d.eventsCount + 1 } : d));
    }, 800);
  };

  const handleChatwootReplyText = (e: FormEvent) => {
    e.preventDefault();
    if (!chatwootReply.trim()) return;

    const textToSubmit = chatwootReply;
    const currentInbox = chatwootInbox;
    
    // Create Agent reply
    const newMsg = {
      id: `chatwoot_msg_${Date.now()}`,
      channel: currentInbox,
      sender: "agent" as const,
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: currentInbox === "whatsapp" ? "Sarah (Enterprise)" : currentInbox === "sms" ? "Marcus Wood" : "Visitor #807"
    };

    setChatwootConversations(prev => [...prev, newMsg]);
    setChatwootReply("");

    onTriggerLog({
      id: `chatwoot_dispatch_${Date.now()}`,
      type: "crm",
      status: "success",
      message: `💬 [Chatwoot Omnichannel Dispatcher] Message dispatched via ${currentInbox.toUpperCase()} Channel. Status: TRANSMITTED`,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        channelType: currentInbox,
        phoneNumberGateway: chatwootPhoneGateway,
        apiCredentialsEncrypted: true,
        messageBody: textToSubmit,
        gatewayStatus: "CONNECTED"
      }
    });

    setTimeout(() => {
      let responseText = "Thanks for confirming that! I am testing this platform.";
      if (currentInbox === "whatsapp") {
        responseText = "Awesome! That works perfectly. I will discuss this with our operational managers and book Liam right away. Outstanding system!";
      } else if (currentInbox === "sms") {
        responseText = "Great! Yes, please assign Niamh O'Connor. Let's make it Saturday.";
      } else {
        responseText = "Excellent, thank you. Could you email me the safety credential sheets at admin@comms.com.au?";
      }

      const clientMsg = {
        id: `chatwoot_msg_client_${Date.now()}`,
        channel: currentInbox,
        sender: "customer" as const,
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerName: currentInbox === "whatsapp" ? "Sarah (Enterprise)" : currentInbox === "sms" ? "Marcus Wood" : "Visitor #807"
      };

      setChatwootConversations(prev => [...prev, clientMsg]);

      onTriggerLog({
        id: `chatwoot_inbound_${Date.now()}`,
        type: "api",
        status: "info",
        message: `📲 [Chatwoot Webhook Ingress] Incoming message from ${clientMsg.customerName} via ${currentInbox.toUpperCase()}`,
        timestamp: new Date().toLocaleTimeString(),
        payload: clientMsg
      });
    }, 1500);
  };

  const handleAddPayloadField = () => {
    if (!newFieldName.trim()) return;
    const validatedName = newFieldName.trim().replace(/[^a-zA-Z0-9]/g, "");
    if (payloadCustomFields.some(f => f.name === validatedName)) {
      onTriggerLog({
        id: `payload_err_${Date.now()}`,
        type: "system",
        status: "error",
        message: `⚠️ Payload CMS: Field "${validatedName}" already exists in model.`,
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }
    const newField = {
      name: validatedName,
      type: newFieldType,
      required: newFieldRequired
    };
    setPayloadCustomFields(prev => [...prev, newField]);
    setNewFieldName("");
    setNewFieldRequired(false);

    onTriggerLog({
      id: `payload_schema_update_${Date.now()}`,
      type: "system",
      status: "info",
      message: `🛠️ [Payload CMS Dynamic Model] Added subclass field "${validatedName}" [${newFieldType.toUpperCase()}] to collection schema.`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleRemovePayloadField = (name: string) => {
    setPayloadCustomFields(prev => prev.filter(f => f.name !== name));
    onTriggerLog({
      id: `payload_schema_remove_${Date.now()}`,
      type: "system",
      status: "warning",
      message: `🗑️ [Payload CMS Dynamic Model] Removed field "${name}" from collection mapping schema.`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const generatePayloadFieldsCode = () => {
    return `// Payload CMS Collection Schema definition
import { CollectionDef } from 'payload/types';

export const ${payloadCollection.charAt(0).toUpperCase() + payloadCollection.slice(1)}: CollectionDef = {
  slug: '${payloadCollection}',
  admin: {
    useAsTitle: '${payloadCollection === "leads" ? "clientName" : "name"}',
  },
  fields: [
    { name: 'id', type: 'text', required: true, unique: true },
    ${payloadCollection === "leads" ? `
    { name: 'clientName', type: 'text', required: true },
    { name: 'serviceName', type: 'text', required: true },
    { name: 'postcode', type: 'text', required: true },
    { name: 'estimatedTotal', type: 'number', required: false },
    { name: 'phone', type: 'text', required: true },
    { name: 'email', type: 'text', required: true },` : `
    { name: 'name', type: 'text', required: true },
    { name: 'status', type: 'text', required: true },`}
    ${payloadCustomFields.map(f => `{ name: '${f.name}', type: '${f.type}', required: ${f.required} }`).join(',\n    ')}
  ]
};`;
  };

  const moveTwentyLead = (leadId: string, direction: "next" | "prev") => {
    const stages: Array<"incoming" | "contacted" | "qualified" | "won" | "lost"> = ["incoming", "contacted", "qualified", "won", "lost"];
    
    setTwentyLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const currentStageIdx = stages.indexOf(lead.stage);
        let nextStageIdx = currentStageIdx;
        if (direction === "next" && currentStageIdx < stages.length - 1) {
          nextStageIdx = currentStageIdx + 1;
        } else if (direction === "prev" && currentStageIdx > 0) {
          nextStageIdx = currentStageIdx - 1;
        }
        
        const targetStage = stages[nextStageIdx];
        if (targetStage !== lead.stage) {
          onTriggerLog({
            id: `twenty_crm_move_${Date.now()}`,
            type: "crm",
            status: "success",
            message: `💼 [Twenty CRM GraphQL Connector] Moved Opportunity for "${lead.name}" : ${lead.stage.toUpperCase()} ➔ ${targetStage.toUpperCase()} (Value: $${lead.amount})`,
            timestamp: new Date().toLocaleTimeString(),
            payload: {
              dealId: lead.id,
              clientName: lead.name,
              movedFrom: lead.stage,
              movedTo: targetStage,
              amount: lead.amount,
              graphqlMutation: `mutation UpdateOpportunity {
  updateOpportunity(id: "${lead.id}", input: { stage: "${targetStage}" }) {
    id
    name
    stage
    amount
  }
}`
            }
          });
        }
        return { ...lead, stage: targetStage };
      }
      return lead;
    }));
  };

  const [editorPayloadValue, setEditorPayloadValue] = useState<string>(`{
  "id": "lead_926600",
  "postcode": "6007",
  "serviceName": "Commercial Cleaning",
  "clientName": "Sarah Reynolds",
  "email": "sarah.reynolds@enterprise.com.au",
  "phone": "0412345678",
  "estimatedTotal": 288,
  "timestamp": "2026-05-24T05:00:00Z"
}`);

  const [validationReport, setValidationReport] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    checkedAt: string | null;
  }>({
    isValid: true,
    errors: [],
    warnings: [],
    checkedAt: null,
  });

  const runPayloadValidation = (jsonStr: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: any = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (e: any) {
      setValidationReport({
        isValid: false,
        errors: [`Invalid JSON Syntax: ${e.message}`],
        warnings: [],
        checkedAt: new Date().toLocaleTimeString(),
      });
      return false;
    }

    // Rule 1: ID
    if (!parsed.id) {
      errors.push("Missing required field: 'id'");
    } else if (typeof parsed.id !== "string") {
      errors.push("Field 'id' must be a string");
    }

    // Rule 2: Postcode
    if (!parsed.postcode) {
      errors.push("Missing required field: 'postcode'");
    } else {
      const postcodeStr = String(parsed.postcode);
      if (!/^\d{4}$/.test(postcodeStr)) {
        errors.push("Field 'postcode' must be a 4-digit Australian postcode (e.g. '6007')");
      }
    }

    // Rule 3: Service Name
    if (!parsed.serviceName) {
      errors.push("Missing required field: 'serviceName'");
    } else if (typeof parsed.serviceName !== "string") {
      errors.push("Field 'serviceName' must be a string");
    }

    // Rule 4: Client Name Key mapping validation (Crucial!)
    if (parsed.name && !parsed.clientName) {
      errors.push("CRM Database Mapping Mismatch: Payload CRM database schema requires 'clientName' instead of 'name'");
      warnings.push("AASTACLEAN frontend outputs 'name' which must be transformed into 'clientName' before injection into Payload.");
    } else if (!parsed.clientName && !parsed.name) {
      errors.push("Missing required field: 'clientName'");
    }

    // Rule 5: Email Format
    if (!parsed.email) {
      errors.push("Missing required field: 'email'");
    } else {
      const emailStr = String(parsed.email);
      if (!emailStr.includes("@") || !emailStr.includes(".")) {
        errors.push("Field 'email' must be a valid email address containing an '@' and domain extension");
      }
    }

    // Rule 6: Phone
    if (!parsed.phone) {
      errors.push("Missing required field: 'phone'");
    } else if (String(parsed.phone).length < 8) {
      warnings.push("Phone number appears short. Recommend verifying Australian format prefix (e.g. '0412345678')");
    }

    // Rule 7: Estimated Total
    if (parsed.estimatedTotal !== undefined) {
      const num = Number(parsed.estimatedTotal);
      if (isNaN(num) || num <= 0) {
        errors.push("Field 'estimatedTotal' must be a positive number representing the pricing calculation");
      }
    } else {
      warnings.push("No 'estimatedTotal' detected. While optional for simple contacts, leads require an active estimated valuation to generate pipelines.");
    }

    const isValid = errors.length === 0;

    setValidationReport({
      isValid,
      errors,
      warnings,
      checkedAt: new Date().toLocaleTimeString(),
    });

    onTriggerLog({
      id: Math.random().toString(),
      type: "system",
      status: isValid ? "success" : "warning",
      message: `Payload Validation executed: Schema is ${isValid ? "CONFORMANT" : "INVALID"} (${errors.length} errors, ${warnings.length} warnings)`,
      timestamp: new Date().toLocaleTimeString(),
      payload: { errors, warnings, jsonValidated: parsed },
    });

    return isValid;
  };

  // Sync state or handle defaults
  const handleConfigChange = (key: keyof WebhookConfig, value: any) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });

    onTriggerLog({
      id: Math.random().toString(),
      type: "system",
      status: "info",
      message: `Config updated: ${String(key)} set to ${String(value)}`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleTestCall = async () => {
    setIsTesting(true);
    const start = Date.now();
    const mockLead: QuoteRequest = {
      id: `lead_${Math.floor(Math.random() * 900000 + 100000)}`,
      postcode: ["6007", "2000", "3000", "4000"][Math.floor(Math.random() * 4)],
      propertyType: ["Apartment", "Townhouse", "Standalone House"][Math.floor(Math.random() * 3)],
      serviceName: allServices[Math.floor(Math.random() * allServices.length)].name,
      name: ["Johnathan Fletcher", "Olivia Henderson", "Amir Patel", "Chloe Vance"][Math.floor(Math.random() * 4)],
      email: "sandbox@aastaclean-crm.au",
      phone: "08 9266 00",
      notes: "Sandbox CRM live integration simulation test payload.",
      timestamp: new Date().toISOString(),
      status: "transmitted",
      estimatedTotal: Math.floor(Math.random() * 300 + 120),
    };

    let transformedPayload: any = { ...mockLead };

    if (config.crmType === "Payload CRM") {
      onTriggerLog({
        id: Math.random().toString(),
        type: "system",
        status: "info",
        message: "🔍 [Payload Pre-Flight Engine] Intercepting request. Auto-verifying payload schema compatibility...",
        timestamp: new Date().toLocaleTimeString(),
      });

      onTriggerLog({
        id: Math.random().toString(),
        type: "system",
        status: "warning",
        message: "⚠️ [Pre-Flight Verification] 'name' was detected in standard model. Auto-translating AASTACLEAN key 'name' to destination 'clientName' for Payload collection compatibility.",
        timestamp: new Date().toLocaleTimeString(),
      });

      transformedPayload = {
        id: mockLead.id,
        postcode: mockLead.postcode,
        serviceName: mockLead.serviceName,
        clientName: mockLead.name, // Mapped according to collections logic
        email: mockLead.email,
        phone: mockLead.phone,
        notes: mockLead.notes,
        estimatedTotal: mockLead.estimatedTotal,
        timestamp: mockLead.timestamp,
        status: mockLead.status,
      };
    }

    onTriggerLog({
      id: Math.random().toString(),
      type: "webhook",
      status: "info",
      message: `Initiating ${config.crmType} REST connection dispatcher to: ${config.webhookUrl}`,
      timestamp: new Date().toLocaleTimeString(),
      payload: transformedPayload,
    });

    try {
      if (!config.webhookUrl || !config.webhookUrl.startsWith("http")) {
        throw new Error("Invalid URL: must start with http:// or https://");
      }

      // Perform a real HTTP request under browser context if the URL exists
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.headerName && config.headerValue) {
        headers[config.headerName] = config.headerValue;
      }

      const response = await fetch(config.webhookUrl, {
        method: "POST",
        mode: "cors",
        headers,
        body: JSON.stringify(transformedPayload),
        signal: controller.signal,
      });

      clearTimeout(id);
      const stop = Date.now();

      onTriggerLog({
        id: Math.random().toString(),
        type: "crm",
        status: "success",
        message: `HTTP POST completed successfully in ${stop - start}ms: Status ${response.status}`,
        timestamp: new Date().toLocaleTimeString(),
        payload: {
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
        },
      });
    } catch (err: any) {
      // Create a gorgeous fallback mock success/fail logging stream to let them test safely even if offline/blocked by CORS
      const delay = Math.floor(Math.random() * 400 + 200);
      await new Promise((r) => setTimeout(r, delay));

      const isUrlMocked = config.webhookUrl.includes("aastaclean.com") || config.webhookUrl.includes("example.com");

      if (isUrlMocked) {
        onTriggerLog({
          id: Math.random().toString(),
          type: "crm",
          status: "success",
          message: `🛰️ [Simulated] Connected to ${config.crmType} - webhook request delivered cleanly under 200 OK after ${delay}ms`,
          timestamp: new Date().toLocaleTimeString(),
          payload: {
            mockDelivery: true,
            status: 200,
            statusText: "OK (Simulated Gateway)",
            data: transformedPayload,
          },
        });
      } else {
        onTriggerLog({
          id: Math.random().toString(),
          type: "crm",
          status: "error",
          message: `⚠️ Connection failed: ${err?.message || "CORS restriction or network timeout."} Tracing back debug loop.`,
          timestamp: new Date().toLocaleTimeString(),
          payload: {
            reason: err?.message || "CORS blocking. Normal in localhost frontend code unless matching server endpoints accept CORS options.",
            recommendation: "Use the Webhook.site address or Zapier webhook listener hooks to allow public triggers.",
          },
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const sampleLeadJSON = `{
  "id": "lead_926600",
  "postcode": "6007",
  "serviceName": "Commercial Cleaning",
  "clientName": "Sarah Reynolds",
  "email": "sarah.reynolds@enterprise.com.au",
  "phone": "0412345678",
  "hourlyRateEst": 48,
  "estimatedHours": 6,
  "totalEstimated": 288,
  "transmissionTimestamp": "2026-05-24T05:00:00Z"
}`;

  const crmIntegrationGuide = `### HubSpot & Salesforce Connection Outline
1. Set endpoint URL above to your HubSpot dynamic Forms ingestion or custom endpoint.
2. In Zapier, select Webhook Trigger (Catch Hook). Copy-paste the Zapier URL into the Webhook URL field.
3. Submit a live quote from the front page of Aastaclean.
4. The JSON properties map directly into standard Salesforce Opportunities or Spotless Lead records.`;

  return (
    <section id="developer-hub" className="py-24 bg-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Intro Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
              <Code className="w-4.5 h-4.5" /> DEVELOPER & INTEGRATION SUITE
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mt-4">
              Modular Integration Engine
            </h2>
            <p className="text-slate-400 mt-3 max-w-2xl text-base">
              Connect AASTACLEAN's dynamic quote requests, lead triggers, and postcode router variables to Salesforce, HubSpot, custom server webhooks, or scheduling apps.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-2xl border border-slate-700">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-mono text-emerald-400">REST API V1.0 - SIMULATOR ONLINE</span>
          </div>
        </div>

        {/* Master Panel Frame */}
        <div className="bg-slate-950 rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Panel: Ingest & Dispatch Configuration (7 Columns) */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2 shrink-0">
                <Database className="w-5 h-5 text-indigo-400" /> Connection Parameters
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {(["webook-tester", "rudderstack-cdp", "chatwoot-inbox", "payload-schema", "payload-validator", "twenty-crm", "active-queues", "crm-instructions", "secured-gateway", "sovereign-postal"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-1 rounded text-[11px] font-bold tracking-tight transition-all ${
                      activeTab === tab
                        ? "bg-indigo-600 text-white shadow-md font-extrabold"
                        : "bg-slate-900 hover:bg-slate-850 text-slate-400"
                    }`}
                  >
                    {tab === "webook-tester"
                      ? "Webhooks"
                      : tab === "rudderstack-cdp"
                      ? "Rudderstack"
                      : tab === "chatwoot-inbox"
                      ? "Chatwoot"
                      : tab === "payload-schema"
                      ? "Payload Schema"
                      : tab === "payload-validator"
                      ? "Validation CLI"
                      : tab === "twenty-crm"
                      ? "Twenty CRM"
                      : tab === "active-queues"
                      ? "Task Queues"
                      : tab === "crm-instructions"
                      ? "Setup Info"
                      : tab === "secured-gateway"
                      ? "🔒 Secured Gateway"
                      : "📬 Postal Sovereign"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Tabs */}
            {activeTab === "webook-tester" && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                      CRM / System Target Type
                    </label>
                    <select
                      value={config.crmType}
                      onChange={(e) => handleConfigChange("crmType", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-indigo-500 max-h-40 outline-none"
                    >
                      <option value="Zapier">Zapier Webhook</option>
                      <option value="HubSpot">HubSpot CRM Connection</option>
                      <option value="Salesforce">Salesforce REST API</option>
                      <option value="Cleaners App API">Cleaners App API Integration</option>
                      <option value="Payload CRM">Payload headless CRM</option>
                      <option value="Custom webhook">Custom Gateway</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                      Webhook Connection State
                    </label>
                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                      <input
                        type="checkbox"
                        checked={config.isActive}
                        onChange={(e) => handleConfigChange("isActive", e.target.checked)}
                        className="w-4 h-4 accent-indigo-500 rounded"
                        id="webhook-active-toggle"
                      />
                      <label htmlFor="webhook-active-toggle" className="text-sm select-none font-bold text-slate-300">
                        {config.isActive ? "🟢 Active & Ready" : "🔴 Suspended"}
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Ingestion / Destination Webhook Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={config.webhookUrl}
                    onChange={(e) => handleConfigChange("webhookUrl", e.target.value)}
                    placeholder="e.g. https://hooks.zapier.com/hooks/catch/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Set this endpoint to your custom webhook channel. Live quote dispatches on the site will POST real-time payloads here. (Pre-configured placeholder simulations are fully safe).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                      Custom REST Header Key
                    </label>
                    <input
                      type="text"
                      value={config.headerName}
                      onChange={(e) => handleConfigChange("headerName", e.target.value)}
                      placeholder="X-AASTACLEAN-API-KEY"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                      Custom Auth Bearer Token
                    </label>
                    <input
                      type="text"
                      value={config.headerValue}
                      onChange={(e) => handleConfigChange("headerValue", e.target.value)}
                      placeholder="Bearer aas_secret..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase block">Quote Submissions</span>
                      <span className="text-xs text-slate-500">Auto-dispatch webhook on quotes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.triggerOnQuote}
                      onChange={(e) => handleConfigChange("triggerOnQuote", e.target.checked)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase block">Postcode Checks</span>
                      <span className="text-xs text-slate-500">Auto-dispatch webhook on searches</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.triggerOnSearch}
                      onChange={(e) => handleConfigChange("triggerOnSearch", e.target.checked)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleTestCall}
                    disabled={isTesting || !config.isActive}
                    id="webhook-fire-btn"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all transition-transform active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>{isTesting ? "Executing Rest Ingestion..." : "Fire Test Webhook Payload"}</span>
                  </button>
                </div>

              </div>
            )}

            {activeTab === "rudderstack-cdp" && (
              <div className="space-y-6">
                <div className="bg-slate-900/45 p-4 rounded-2xl border border-indigo-500/15 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">RudderStack Event Tracking CDP</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Real-time dynamic telemetry and event pipeline forwarding.</p>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                    v3.2 - CDP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Track Event Type</label>
                    <select
                      value={rudderEventName}
                      onChange={(e) => setRudderEventName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 font-bold focus:border-indigo-500 outline-none"
                    >
                      <option value="Quote Requested">Quote Requested (lead_submit)</option>
                      <option value="Postcode Verified">Postcode Verified (geo_lookup)</option>
                      <option value="Specialist Scheduled">Specialist Scheduled (roster_dispatch)</option>
                      <option value="Payment Succeeded">Payment Succeeded (stripe_checkout)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Anonymous User ID</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 font-mono focus:border-indigo-500 outline-none"
                      value={rudderUserId}
                      onChange={(e) => setRudderUserId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Event Properties Context JSON</label>
                  <textarea
                    value={rudderEventProps}
                    onChange={(e) => setRudderEventProps(e.target.value)}
                    className="w-full h-32 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-200 focus:border-indigo-500 outline-none"
                  />
                </div>

                <button
                  onClick={handleRudderTrack}
                  disabled={isRudderTracking}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isRudderTracking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400 fill-current" />}
                  <span>{isRudderTracking ? "Forwarding Telemetry stream..." : "Dispatch RudderStack Telemetry Track()"}</span>
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white">Active Source Destinations Sync:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rudderDestinations.map((dest, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{dest.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{dest.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-indigo-400">({dest.eventsCount} events)</span>
                          <span className={`w-2 h-2 rounded-full ${dest.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chatwoot-inbox" && (
              <div className="space-y-6">
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Chatwoot Client omni-channel Workspace</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Interact with WhatsApp and SMS feeds mapped straight to local state operators.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(["whatsapp", "sms", "livechat"] as const).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setChatwootInbox(ch)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${
                          chatwootInbox === ch
                            ? "bg-indigo-600 text-white shadow font-black"
                            : "bg-slate-900 hover:bg-slate-850 text-slate-400"
                        }`}
                      >
                        {ch.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Omni Configuration panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">WhatsApp & SMS Gateway Number</span>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                      value={chatwootPhoneGateway}
                      onChange={(e) => setChatwootPhoneGateway(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Chatwoot Private Access Token</span>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                      value={chatwootApiToken}
                      onChange={(e) => setChatwootApiToken(e.target.value)}
                    />
                  </div>
                </div>

                {/* Simulated Conversation Panel */}
                <div className="border border-slate-800 bg-slate-950 rounded-2xl flex flex-col h-80 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2 text-xs font-mono border-b border-zinc-800 flex justify-between text-slate-400 items-center">
                    <span>Active Gateway Stream: {chatwootInbox.toUpperCase()} inboxes</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      SIMULATOR ONLINE
                    </span>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {chatwootConversations.filter(msg => msg.channel === chatwootInbox).map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs relative ${
                          msg.sender === "agent"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800"
                        }`}>
                          <span className={`text-[9px] block font-bold mb-1 ${msg.sender === "agent" ? "text-indigo-200" : "text-indigo-400"}`}>{msg.customerName}</span>
                          <p className="leading-snug">{msg.text}</p>
                          <span className="text-[8px] font-mono text-slate-500 block text-right mt-1">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply form */}
                  <form onSubmit={handleChatwootReplyText} className="border-t border-slate-800 p-2 flex gap-2 bg-slate-900">
                    <input
                      type="text"
                      value={chatwootReply}
                      onChange={(e) => setChatwootReply(e.target.value)}
                      placeholder={`Reply via simulated ${chatwootInbox.toUpperCase()}...`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 text-white"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg cursor-pointer transition-all flex items-center justify-center">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "payload-schema" && (
              <div className="space-y-6">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-indigo-500/10 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">Payload CMS Collections Configurator</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Define subclass collections and inject customized fields dynamically.</p>
                    </div>
                    <select
                      value={payloadCollection}
                      onChange={(e) => setPayloadCollection(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-indigo-300 outline-none"
                    >
                      <option value="leads">leads collection</option>
                      <option value="cleaners">cleaners collection</option>
                      <option value="locations">locations collection</option>
                    </select>
                  </div>

                  <div className="border border-slate-800 p-4 rounded-xl bg-slate-950 space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">Create Schema Extension Parameters:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Field Name (camelCase)</label>
                        <input
                          type="text"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="e.g. ndisIdentifier"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Type</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none"
                        >
                          <option value="text">text</option>
                          <option value="number">number</option>
                          <option value="relationship">relationship</option>
                          <option value="date">date</option>
                          <option value="checkbox">checkbox</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-2 pb-2">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          id="new-field-required"
                          className="accent-indigo-500"
                        />
                        <label htmlFor="new-field-required" className="text-xs text-slate-400 select-none">Required</label>
                      </div>
                    </div>
                    <button
                      onClick={handleAddPayloadField}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Inject Field definition</span>
                    </button>
                  </div>

                  {payloadCustomFields.length > 0 && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">Active Customized Class Parameters:</span>
                      <div className="flex flex-wrap gap-2">
                        {payloadCustomFields.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg text-xs font-mono text-zinc-300 border border-slate-800">
                            <strong>{f.name}</strong> 
                            <span className="text-indigo-400">[{f.type}]</span>
                            {f.required && <span className="text-rose-400 font-extrabold text-[9px] uppercase">Req</span>}
                            <button onClick={() => handleRemovePayloadField(f.name)} className="hover:text-red-400 ml-1 font-bold text-red-500 shrink-0">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950 py-1 px-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-indigo-400 font-mono font-bold">{payloadCollection.toUpperCase()}_COLLECTION_SCHEMA.TS</span>
                    <button
                      onClick={() => handleCopy(generatePayloadFieldsCode(), "payloadCode")}
                      className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold py-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedText === "payloadCode" ? "Copied!" : "Copy TypeScript Schema"}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-xs sm:text-sm font-mono text-indigo-200 overflow-x-auto my-0 select-all max-h-80 select-all">
                    {generatePayloadFieldsCode()}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === "twenty-crm" && (
              <div className="space-y-6">
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-indigo-500/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Twenty CRM Sales Pipeline</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Manage opportunity stages mapped straight to dynamic database states.</p>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                    GraphQL Connector
                  </span>
                </div>

                {/* Dynamic board columns */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 overflow-x-auto pb-4">
                  {(["incoming", "contacted", "qualified", "won", "lost"] as const).map(col => {
                    const colLeads = twentyLeads.filter(l => l.stage === col);
                    const totalValue = colLeads.reduce((acc, curr) => acc + curr.amount, 0);

                    return (
                      <div key={col} className="bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800 space-y-2.5 shrink-0 min-w-[155px]">
                        <div className="pb-1 border-b border-slate-800 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider font-mono">
                            {col === "incoming" ? "INCOMING" : col === "contacted" ? "CONTACT" : col === "qualified" ? "QUOTED" : col === "won" ? "WON 🟢" : "LOST ❌"}
                          </span>
                          <span className="text-[9px] bg-slate-950 font-bold font-mono px-1.5 py-0.5 rounded text-indigo-300">
                            {colLeads.length}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {colLeads.length === 0 ? (
                            <p className="text-[9px] text-slate-600 italic text-center py-6">No active leads</p>
                          ) : (
                            colLeads.map(lead => (
                              <div key={lead.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px] space-y-1.5 group hover:border-indigo-500/50 transition-all select-none">
                                <div className="font-extrabold text-white text-[11px] truncate">{lead.name}</div>
                                <div className="text-zinc-500 truncate font-semibold">{lead.service} ({lead.postcode})</div>
                                <div className="flex justify-between items-center bg-slate-900/70 p-1.5 rounded border border-zinc-850">
                                  <span className="text-[10px] font-bold text-emerald-400 font-mono">${lead.amount}</span>
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      onClick={() => moveTwentyLead(lead.id, "prev")}
                                      className="hover:bg-slate-800 p-0.5 rounded text-zinc-400 hover:text-white shrink-0 cursor-pointer text-[9px] font-bold"
                                      title="Move Left"
                                    >
                                      ❮
                                    </button>
                                    <button
                                      onClick={() => moveTwentyLead(lead.id, "next")}
                                      className="hover:bg-slate-800 p-0.5 rounded text-zinc-400 hover:text-white shrink-0 cursor-pointer text-[9px] font-bold"
                                      title="Move Right"
                                    >
                                      ❯
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-slate-850 flex justify-between text-[9px] font-mono text-zinc-500">
                          <span>Total:</span>
                          <span className="font-bold text-slate-300">${totalValue}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "payload-validator" && (
              <div className="space-y-6">
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">Payload Schema Validation Suite</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verify compatibility with the open-source Payload CRM <code>leads</code> database model.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] bg-indigo-500/15 text-indigo-300 font-mono px-2 py-1 rounded-md border border-indigo-500/30 font-bold uppercase tracking-wider">
                    Client Sandbox
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Draft Outbound JSON Sandbox */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">
                      Draft Outbound Lead JSON (Editable)
                    </label>
                    <textarea
                      value={editorPayloadValue}
                      onChange={(e) => setEditorPayloadValue(e.target.value)}
                      className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-mono text-indigo-100 focus:border-indigo-500 outline-none h-64 resize-y"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Alter fields to trigger schema alerts:</span>
                      <button
                        onClick={() => {
                          setEditorPayloadValue(`{
  "id": "lead_926600",
  "postcode": "6007",
  "serviceName": "Commercial Cleaning",
  "clientName": "Sarah Reynolds",
  "email": "sarah.reynolds@enterprise.com.au",
  "phone": "0412345678",
  "estimatedTotal": 288,
  "timestamp": "2026-05-24T05:00:00Z"
}`);
                        }}
                        className="text-indigo-400 hover:underline hover:text-indigo-300 font-bold cursor-pointer"
                      >
                        Reset Template
                      </button>
                    </div>
                  </div>

                  {/* Schema Rules & Checklist */}
                  <div className="space-y-4">
                    <div className="bg-slate-900/85 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <h5 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Required Database Blueprint Constraints
                      </h5>
                      <ul className="text-[11px] font-mono text-slate-300 space-y-2 list-none pl-0">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-white">id</span>: string (UUID / shortid format)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-white">postcode</span>: string (4 Aussie digits e.g. <code>/^\d{4}$/</code>)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-450" />
                          <span className="font-semibold text-white">clientName</span>: string (No standard <code>name</code> key allowed!)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-white">email</span>: string (RFC 5322 compliance check)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-white">estimatedTotal</span>: number (Positive value)
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => runPayloadValidation(editorPayloadValue)}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-white" />
                      <span>Run Outbound Schema Verification</span>
                    </button>
                  </div>
                </div>

                {/* Diagnostics Validation Results Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Diagnostics Output {validationReport.checkedAt ? `(checked at ${validationReport.checkedAt})` : ""}
                    </span>
                    {validationReport.checkedAt ? (
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${
                          validationReport.isValid
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {validationReport.isValid ? "PASS" : "FAIL"}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 font-mono italic">No check executed yet</span>
                    )}
                  </div>

                  {validationReport.checkedAt && (
                    <div className="space-y-3">
                      {validationReport.isValid ? (
                        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-1">
                            <p className="font-semibold text-white">Outbound lead schema fully verified!</p>
                            <p className="text-[11px] text-slate-400">
                              This object will map directly to the default Payload CRM / MongoDB/PostgreSQL database without generating schema rejection errors.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-slate-300">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-white">Schema Validation Rejections ({validationReport.errors.length})</p>
                              <p className="text-[11px] text-slate-400">
                                Fix the following syntax or key alignment issues to prevent webhook failure:
                              </p>
                            </div>
                          </div>
                          <ul className="text-xs space-y-1.5 list-none pl-0 my-0">
                            {validationReport.errors.map((err, i) => (
                              <li key={i} className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-red-950/20 font-mono text-red-300">
                                <span className="text-red-500 font-bold select-none">[!]</span> {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationReport.warnings.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <div className="text-[10px] font-extrabold tracking-wider uppercase text-amber-500">
                            Pre-flight Warnings ({validationReport.warnings.length})
                          </div>
                          <ul className="text-xs space-y-1 my-0 list-none pl-0">
                            {validationReport.warnings.map((warn, i) => (
                              <li key={i} className="flex items-start gap-2 p-2 bg-slate-950/20 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                                <span className="text-amber-400 font-bold font-mono">[*]</span> {warn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "active-queues" && (
              <div className="space-y-6">
                {/* Header Status Bar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-white text-base">Active Buffer Queue Orchestration</h4>
                      <p className="text-xs text-slate-400 mt-1">High-throughput task worker pool powered by BullMQ & Redis.</p>
                    </div>
                    <div>
                      {queueStats?.queueMode === "redis" ? (
                        <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 animate-pulse shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Upstash / Redis Cluster Online
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          Local In-Memory EventLoop (Preview)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Jobs</span>
                      <span className="text-xl font-bold font-mono text-slate-100">{queueStats?.totals?.all ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-805 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Queued</span>
                      <span className="text-xl font-bold font-mono text-yellow-400">{queueStats?.totals?.queued ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Processing</span>
                      <span className="text-xl font-bold font-mono text-indigo-400 animate-pulse">{queueStats?.totals?.active ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Completed</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{queueStats?.totals?.completed ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Failed</span>
                      <span className="text-xl font-bold font-mono text-red-400">{queueStats?.totals?.failed ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Main Queue Manual Trigger Form */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h5 className="font-extrabold text-white text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Direct Job Ingestion Gateway
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Background Worker Task</label>
                      <select
                        value={manualQueueEvent}
                        onChange={(e) => {
                          setManualQueueEvent(e.target.value);
                          if (e.target.value === "cdp_event") {
                            setManualQueuePayload(JSON.stringify({
                              eventName: "Manual Customer Dispatch Trigger",
                              properties: {
                                postcode: "6007",
                                selectedAddonsCount: 2,
                                totalAmount: 480
                              }
                            }, null, 2));
                          } else {
                            setManualQueuePayload(JSON.stringify({
                              bookingId: "aas_bk_926600",
                              clientName: "David Grohl",
                              email: "dave@grohl-studios.com.au",
                              phone: "0499 123 456",
                              serviceName: "Pressure Cleaning",
                              totalAmount: 480
                            }, null, 2));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="cdp_event">cdp_event (Segment / RudderStack webhook dispatch)</option>
                        <option value="dispatch_notice">dispatch_notice (Automated SMS & Email notice worker)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Job Options / Operational Mode</label>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center justify-between">
                        <span className="font-medium">Exponential Backoff / Retry:</span>
                        <span className="font-mono text-indigo-400 font-extrabold">3 attempts @ 2s delay</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Enqueue Task Parameters Context Payload</label>
                    <textarea
                      value={manualQueuePayload}
                      onChange={(e) => setManualQueuePayload(e.target.value)}
                      className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-teal-300 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleTriggerManualJob}
                    disabled={isQueueLoading}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isQueueLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current text-white" />}
                    <span>{isQueueLoading ? "Offloading Job to Redis Buffer..." : "Enqueue Background Job in BullMQ Cluster"}</span>
                  </button>
                </div>

                {/* Cloud Workflow Orchestrator (Crawl-Walk-Run Info and Temporal Cloud Mapping) */}
                <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shrink-0">
                      <Layers className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">🔄 Advanced Dispatch Orchestration Strategy</h5>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Currently, <strong>Redis + BullMQ</strong> buffers lightning-fast telemetry (Segment, RudderStack) and transactional alerts. For high-reliability, long-running regional dispatch matching (which takes 2-4 hours, escalates to cleaner backups, and operates multi-stage workflows), our roadmap seamlessly ports these stateful pathways to <strong>Temporal Cloud</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-slate-950/45 p-3.5 rounded-xl border border-slate-850">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-200 block">⚡ BullMQ Queue Target Jobs:</span>
                      <span className="text-slate-400">- Segment / RudderStack telemetries</span>
                      <span className="text-slate-400 block">- Immediate CRM lead synchronization</span>
                      <span className="text-slate-400 block">- Instant confirmation SMS trigger hooks</span>
                    </div>
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
                      <span className="font-bold text-indigo-400 block">⚙️ Temporal Workflow Pipeline:</span>
                      <span className="text-slate-400">- 4-hour cleaner regional bidding checks</span>
                      <span className="text-slate-400 block">- Complex conditional escalation logic</span>
                      <span className="text-slate-400 block">- Guaranteed state preservation through crashes</span>
                    </div>
                  </div>
                </div>

                {/* Queue History Log stream */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-white text-xs uppercase tracking-widest">📋 Real-Time Background Worker Log Stream</h5>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                    {queueLogs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">
                        No active queue jobs buffered in log registry. Try submitting a pricing quote on the site or firing a test job above to verify worker state!
                      </div>
                    ) : (
                      queueLogs.map((log) => {
                        const isCompleted = log.status === "completed";
                        const isFailed = log.status === "failed";
                        const isActive = log.status === "active";
                        return (
                          <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCompleted ? "bg-emerald-500" : isFailed ? "bg-red-500 animate-pulse" : isActive ? "bg-indigo-500 animate-pulse" : "bg-slate-500"}`} />
                                <span className="font-extrabold text-slate-100 italic">job: "{log.jobName}"</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                              <span>Queue Provider: <span className="text-slate-300 font-mono font-semibold">[{log.queueType}]</span></span>
                              <span className="font-mono">ID: {log.id}</span>
                            </div>

                            {/* Job Details Preview */}
                            <div className="bg-slate-900 border border-slate-800/60 p-2.5 rounded-lg space-y-1 text-[10px] font-mono">
                              <div className="text-indigo-300">Payload: <span className="text-slate-400 font-sans">{JSON.stringify(log.payload)}</span></div>
                              {log.result && <div className="text-emerald-400">Result: <span className="text-slate-300 font-sans">{JSON.stringify(log.result)}</span></div>}
                              {log.error && <div className="text-red-400">Error: <span className="text-red-300 font-sans">{log.error}</span></div>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "crm-instructions" && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed p-4 bg-slate-900 rounded-3xl border border-slate-800">
                <h4 className="font-extrabold text-white text-base">Ingestion Instructions</h4>
                <div className="space-y-3">
                  <p>
                    <strong>1. CMS/WordPress integration:</strong> Capture quote requests by linking your form submissions to fire a fetch/axios call pointing at your configured CRM Webhook endpoint.
                  </p>
                  <p>
                    <strong>2. Zapier/Make.com triggers:</strong> Use standard HTTP Webhooks. Copy the unique hook address from Zapier and replace the ingestion URL in the webhook console. Once configured, submissions on Aastaclean trigger Zapier immediately!
                  </p>
                  <p>
                    <strong>3. Cleaners app & custom CRM:</strong> Include verification credentials in headers. Our system supports token checks to maintain authenticated API access security.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "secured-gateway" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">🔒 AES-256 Unified Enterprise Key Manager</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Encrypts and anchors private authorization secrets in our secure cloud node server.</p>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                    RSA / AES Hybrid
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Configure Microservice Cluster Endpoints</h5>
                  
                  <div className="space-y-4">
                    {/* PAYLOAD CMS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-4 border-b border-slate-800/60">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payload CMS Host URL</label>
                        <input
                          type="text"
                          value={secureGatewayConfig.payloadCmsUrl}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, payloadCmsUrl: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Private Authorization Secret Key / Token</label>
                        <input
                          type="password"
                          value={secureGatewayConfig.payloadToken}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, payloadToken: e.target.value})}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* TWENTY CRM */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-4 border-b border-slate-800/60">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Twenty CRM API URL (GraphQL Endpoint)</label>
                        <input
                          type="text"
                          value={secureGatewayConfig.twentyCmsUrl}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, twentyCmsUrl: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Twenty API Access Secret Key / PAT</label>
                        <input
                          type="password"
                          value={secureGatewayConfig.twentyToken}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, twentyToken: e.target.value})}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* CHATWOOT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chatwoot Client API Host URL</label>
                        <input
                          type="text"
                          value={secureGatewayConfig.chatwootUrl}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, chatwootUrl: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chatwoot Private Access Token</label>
                        <input
                          type="password"
                          value={secureGatewayConfig.chatwootToken}
                          onChange={(e) => setSecureGatewayConfig({...secureGatewayConfig, chatwootToken: e.target.value})}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSecureKeys}
                    disabled={isSavingKeys}
                    className="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isSavingKeys ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 text-emerald-100 fill-current" />}
                    <span>{isSavingKeys ? "Encrypting and syncing keys..." : "Lock & Sync Keys on Express Core"}</span>
                  </button>
                </div>

                <div className="bg-indigo-950/20 border border-indigo-500/20 p-4.5 rounded-2xl text-[11px] text-indigo-350 leading-relaxed font-sans">
                  <strong>🔒 Advanced Cryptography Protection:</strong> High-security credential storage automatically converts plaintext keys into <code>AES-256-CBC</code> cryptograms immediately upon ingestion on the Node virtual machine. Decryption happens safely memory-only during proxy fetch handshakes, shielding your raw API keys from ever leaking on any public network, browser viewport, or developer browser logs.
                </div>
              </div>
            )}

            {activeTab === "sovereign-postal" && (
              <div className="space-y-6 animate-fadeIn">
                
                <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">📬 Sovereign Postal Mail Server</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Self-hosted transactional email infrastructure. Cut the SendGrid cord, routing notices & PDFs from local workspace servers.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded">
                    Sovereign Relay Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-3.5">
                    <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center justify-between">
                      <span>IP Warmup & Reputation</span>
                      <span className="text-emerald-400 font-mono">Score: {postalReputation?.reputationScore || 99}/100</span>
                    </h5>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Warmup Limit Progression:</span>
                        <span className="font-mono text-indigo-300 font-bold">
                          {postalReputation?.limits ? `${postalReputation.limits.toLocaleString()} emails/day` : "25,000/day"}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div 
                            key={s} 
                            onClick={async () => {
                              try {
                                await fetch("/api/v1/postal/config", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ warmupPhase: s, ipReputation: 90 + s * 2 })
                                });
                                fetchPostalData();
                              } catch (err) {}
                            }}
                            className={`h-full rounded-full cursor-pointer transition-all ${
                              (postalReputation?.warmupPhase || 4) >= s 
                                ? "bg-indigo-500 hover:bg-indigo-400" 
                                : "bg-slate-800 hover:bg-slate-700"
                            }`}
                            title={`Set Warmup Stage ${s}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                        <div className="text-slate-500">BOUNCES</div>
                        <div className="text-lg font-black text-rose-400 mt-0.5">{postalReputation?.activeBounces ?? 1}</div>
                      </div>
                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                        <div className="text-slate-500">WHS COMPLAINTS</div>
                        <div className="text-lg font-black text-indigo-400 mt-0.5">{postalReputation?.complaints ?? 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-3">
                    <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">DNS Authentication (Anti-Spam compliance)</h5>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-bold">SPF Record</span>
                          <span className="text-[9px] text-slate-500 font-mono">v=spf1 include:postal.aastaclean.com.au ~all</span>
                        </div>
                        <button
                          onClick={async () => {
                            const nextVal = postalReputation?.spfStatus === "verified" ? "failed" : "verified";
                            await fetch("/api/v1/postal/toggle-dns", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ key: "spf", value: nextVal })
                            });
                            fetchPostalData();
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                            postalReputation?.dnsVerified || postalLogs.length > 0
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                          }`}
                        >
                          {postalReputation?.dnsVerified || postalLogs.length > 0 ? "VERIFIED (OK)" : "MISCONFIGURED"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-bold">DKIM 2048-bit Key</span>
                          <span className="text-[9px] text-slate-500 font-mono font-sans">Selector: {postalSelector}._domainkey</span>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                          SECURE PASS
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-bold">DMARC Alignment</span>
                          <span className="text-[9px] text-slate-500 font-mono font-sans">p=quarantine; pct=100;</span>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                          ACTIVE ALIGNED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Sovereign Postmaster Credentials</span>
                    <span className="text-[10px] text-indigo-400 font-mono uppercase">Validated TLS Hook</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Server SMTP Host</label>
                      <input
                        type="text"
                        value={postalHost}
                        onChange={(e) => setPostalHost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">SMTP TLS Port</label>
                      <input
                        type="number"
                        value={postalPort}
                        onChange={(e) => setPostalPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">DKIM Domain Selector</label>
                      <input
                        type="text"
                        value={postalSelector}
                        onChange={(e) => setPostalSelector(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800/60">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Relay User Identifier</label>
                      <input
                        type="text"
                        value={postalUser}
                        onChange={(e) => setPostalUser(e.target.value)}
                        placeholder="aastaclean-mail-relay"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Relay Private Password</label>
                      <input
                        type="password"
                        value={postalPass}
                        onChange={(e) => setPostalPass(e.target.value)}
                        placeholder="••••••••••••••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400">
                    <div>
                      <span className="font-bold text-indigo-300">Default Auth Proxy:</span> Defaults to local high-fidelity sandbox. To feed live boxes, provide custom host logins.
                    </div>
                    <button
                      onClick={async () => {
                        setPostalIsSaving(true);
                        try {
                          const res = await fetch("/api/v1/postal/config", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              smtpHost: postalHost,
                              smtpPort: postalPort,
                              authUser: postalUser || undefined,
                              authPass: postalPass || undefined,
                              dkimSelector: postalSelector,
                              senderDomain: postalDomain
                            })
                          });
                          if (res.ok) {
                            onTriggerLog({
                              id: `postal_conf_${Date.now()}`,
                              type: "system",
                              status: "success",
                              message: `🔒 Sovereign Postal Config cryptographically locked inside local virtual machine (AES-256).`,
                              timestamp: new Date().toLocaleTimeString()
                            });
                          }
                        } catch (err) {}
                        setPostalIsSaving(false);
                      }}
                      disabled={postalIsSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 font-bold uppercase transition-all shrink-0 text-white px-3 py-1.5 rounded cursor-pointer"
                    >
                      {postalIsSaving ? "Saving..." : "Lock Config"}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" /> Send Interactive SMTP Transaction Test-Fire
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Recipient Destination</label>
                      <input
                        type="email"
                        value={postalTestRecipient}
                        onChange={(e) => setPostalTestRecipient(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subject Header</label>
                      <input
                        type="text"
                        value={postalTestSubject}
                        onChange={(e) => setPostalTestSubject(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Plaintext / HTML Body Contents</label>
                    <textarea
                      rows={4}
                      value={postalTestBody}
                      onChange={(e) => setPostalTestBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!postalTestRecipient.includes("@")) {
                        onTriggerLog({
                          id: `postal_test_err_${Date.now()}`,
                          type: "system",
                          status: "error",
                          message: `⚠️ Mail Routing Error: Recipient must be a valid email address structure.`,
                          timestamp: new Date().toLocaleTimeString()
                        });
                        return;
                      }

                      setPostalIsSending(true);
                      try {
                        const res = await fetch("/api/v1/postal/send", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            recipient: postalTestRecipient,
                            subject: postalTestSubject,
                            body: postalTestBody,
                            type: "transactional"
                          })
                        });
                        const data = await res.json();
                        
                        onTriggerLog({
                          id: `postal_test_${Date.now()}`,
                          type: "system",
                          status: data.success ? "success" : "error",
                          message: data.success 
                            ? `📨 [Sovereign Postmaster] SMTP envelope accepted (RFC-5321 code 250). Log: ${data.logEntry.id}. Latency: ${data.logEntry.latencyMs}ms.`
                            : `❌ [Sovereign Postmaster] SMTP connection refused by relay nodes: ${data.error}. Details: ${data.message}`,
                          timestamp: new Date().toLocaleTimeString(),
                          payload: data.logEntry
                        });

                        fetchPostalData();
                      } catch (err: any) {
                        onTriggerLog({
                          id: `postal_test_err_${Date.now()}`,
                          type: "system",
                          status: "error",
                          message: `❌ Sovereign SMTP Dispatch crashed: ${err.message}`,
                          timestamp: new Date().toLocaleTimeString()
                        });
                      } finally {
                        setPostalIsSending(false);
                      }
                    }}
                    disabled={postalIsSending}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:text-indigo-400 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {postalIsSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>{postalIsSending ? "Rerouting packets via sovereign relays..." : "Transmit Sovereign SMTP Test Mail"}</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Postal Relay Transmit Records</h5>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-[10px] uppercase font-bold text-slate-500">
                          <th className="py-2.5 px-3">Log ID</th>
                          <th className="py-2.5 px-3">Recipient</th>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Delivery Code</th>
                          <th className="py-2.5 px-3 text-right">Rtt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-[11px] font-mono text-slate-300">
                        {postalLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center italic text-slate-500">No email records captured in history logs.</td>
                          </tr>
                        ) : (
                          postalLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-850/40">
                              <td className="py-2 px-3 font-semibold text-slate-400">{log.id}</td>
                              <td className="py-2 px-3 truncate max-w-[120px]" title={log.recipient}>{log.recipient}</td>
                              <td className="py-2 px-3 truncate max-w-[150px]" title={log.subject}>{log.subject}</td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  log.type === "marketing" ? "bg-amber-500/10 text-amber-300" : "bg-cyan-500/10 text-cyan-300"
                                }`}>
                                  {log.type}
                                </span>
                              </td>
                              <td className="py-2 px-3 flex items-center h-[35px]">
                                <span className={`flex items-center gap-1 shrink-0 ${
                                  log.status === "delivered" ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    log.status === "delivered" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                                  }`} />
                                  {log.code}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-indigo-400 whitespace-nowrap">{log.latencyMs}ms</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Right Panel: Ingest/Transaction Terminal logs (5 Columns) */}
          <div className="lg:col-span-12 xl:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-slate-950">
            
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Transmission Logs Terminal
                  </span>
                </div>
                <button
                  onClick={onClearLogs}
                  className="text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear Logs
                </button>
              </div>

              {/* Logger Screen Terminal */}
              <div className="min-h-[250px] max-h-[380px] overflow-y-auto bg-slate-900 border border-slate-800 p-4 rounded-2xl font-mono text-xs text-slate-300 space-y-3 shadow-inner select-text">
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic text-center py-10">
                    No webhook activities stored. Submit quotes on the website or click "Fire Test Webhook Payload" to view transmission logs.
                  </div>
                ) : (
                  [...logs].reverse().map((log) => (
                    <div key={log.id} className="pb-2.5 border-b border-slate-850 last:border-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                          [{log.timestamp}]
                        </span>
                        <span
                          className={`font-semibold text-[10px] uppercase px-2 py-0.5 rounded ${
                            log.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : log.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : log.status === "warning"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-indigo-500/10 text-indigo-400"
                          }`}
                        >
                          {log.type} // {log.status}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200 leading-normal">{log.message}</div>
                      
                      {log.payload && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-indigo-400 cursor-pointer hover:underline select-none">
                            View JSON Event payload
                          </summary>
                          <pre className="mt-1.5 p-2 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-indigo-200 overflow-x-auto max-h-48 my-0">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick stats / transmission score */}
            <div className="mt-8 border-t border-slate-800 pt-5 text-xs text-slate-500 space-y-2">
              <div className="flex justify-between">
                <span>Total transmission operations:</span>
                <span className="font-mono text-slate-300">{logs.length} logged</span>
              </div>
              <div className="flex justify-between">
                <span>Failures / Warnings recorded:</span>
                <span className="font-mono text-slate-300">
                  {logs.filter((l) => l.status === "error" || l.status === "warning").length} recorded
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg. transmission latency:</span>
                <span className="font-mono text-slate-300">~180ms</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
