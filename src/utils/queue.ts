import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// ----------------------------------------------------
// Type Definitions for Background Queue System
// ----------------------------------------------------

export interface CDPJobData {
  eventName: string;
  properties: Record<string, any>;
}

export interface DispatchNoticeJobData {
  bookingId: string;
  clientName: string;
  email: string;
  phone: string;
  serviceName: string;
  totalAmount: number;
}

export interface JobLog {
  id: string;
  jobName: string;
  queueType: "redis-bullmq" | "in-memory-fallback";
  status: "queued" | "active" | "completed" | "failed";
  timestamp: string;
  completedAt?: string;
  error?: string;
  payload: any;
  result?: any;
}

// ----------------------------------------------------
// Global State & Fallback Mechanisms
// ----------------------------------------------------

const REDIS_URL = (import.meta as any).env?.REDIS_URL || process.env.REDIS_URL || "";

let redisClient: any = null;
let bullQueue: any = null;
let bullWorker: any = null;

let isRedisConnected = false;
let queueMode: "redis" | "memory" = "memory";

// In-Memory Queue Store for Fallback mode
const memoryLogsList: JobLog[] = [];
const memoryQueue: { id: string; name: string; data: any; timestamp: string }[] = [];

// Track performance statistics
export function getQueueStats() {
  const allLogs = getJobLogs();
  return {
    queueMode,
    isRedisConnected,
    redisUrlUsed: REDIS_URL ? REDIS_URL.split("@")[1] || "configured" : "none",
    totals: {
      all: allLogs.length,
      queued: allLogs.filter(l => l.status === "queued").length,
      active: allLogs.filter(l => l.status === "active").length,
      completed: allLogs.filter(l => l.status === "completed").length,
      failed: allLogs.filter(l => l.status === "failed").length
    }
  };
}

// Return the last 50 job logs for dashboard visualization
export function getJobLogs(): JobLog[] {
  return [...memoryLogsList].reverse().slice(0, 50);
}

// Add logs with length limitation
function addJobLog(log: JobLog) {
  memoryLogsList.push(log);
  if (memoryLogsList.length > 200) {
    memoryLogsList.shift();
  }
}

function updateJobLogStatus(id: string, status: "active" | "completed" | "failed", extra: { error?: string; result?: any } = {}) {
  const found = memoryLogsList.find(log => log.id === id);
  if (found) {
    found.status = status;
    if (status === "completed" || status === "failed") {
      found.completedAt = new Date().toISOString();
    }
    if (extra.error) found.error = extra.error;
    if (extra.result) found.result = extra.result;
  }
}

// ----------------------------------------------------
// Core Worker Processor Logics
// ----------------------------------------------------

async function processJobLogic(jobName: string, data: any): Promise<any> {
  const startTime = Date.now();
  console.log(`🚀 [Background Queue Worker] Processing job [${jobName}]...`, data);

  if (jobName === "cdp_event") {
    // 1. Offload Customer Data Platform Tracking (Dual Dispatch to Segment & RudderStack)
    const { eventName, properties } = data as CDPJobData;
    
    // Simulate real high-scale webhook delivery to Segment/RudderStack APIs
    const apiCallDelay = Math.floor(Math.random() * 300) + 100;
    await new Promise(resolve => setTimeout(resolve, apiCallDelay));

    console.log(`✅ [Background Worker] Handled CDP Webhook Dispatch for event: "${eventName}" in ${apiCallDelay}ms.`);
    return {
      dispatched: true,
      service: "CDP Dual-Dispatch (Segment & RudderStack)",
      event: eventName,
      deliveredAt: new Date().toISOString(),
      rttMs: apiCallDelay
    };

  } else if (jobName === "dispatch_notice") {
    // 2. Offload Automated Dispatch Notices (Multi-channel: SMS & Email alerts)
    const { bookingId, clientName, serviceName, email, phone, totalAmount } = data as DispatchNoticeJobData;

    // Simulate multi-channel delivery (Slack/Twilio/SendGrid background calls)
    const deliveryDelay = Math.floor(Math.random() * 600) + 200;
    await new Promise(resolve => setTimeout(resolve, deliveryDelay));

    // Automated Cleaner Assignment message simulation
    const snsMsg = `[SMS / TWILIO DISPATCH] Alert sent to Australian Bio-Cleansing Squad: New booking ${bookingId} for "${serviceName}" from customer ${clientName} (${phone}) ready for scheduling. Value: $${totalAmount} AUD.`;
    console.log(`✅ [Background Worker] ${snsMsg}`);

    return {
      dispatched: true,
      channels: ["SMS-Twilio", "Support-Email-Notice", "Admin-Log-Hook"],
      messagePreview: `Alert sent for ${clientName}`,
      notifiedParties: ["Regional Supervisor", "Bio-Cleansing Lead", "Client Confirmation"],
      latencyMs: deliveryDelay
    };
  }

  throw new Error(`Unknown background job name type: "${jobName}"`);
}

// ----------------------------------------------------
// Fallback Memory Queue Event Loop Loop
// ----------------------------------------------------

function runInMemoryScheduler() {
  setInterval(async () => {
    if (memoryQueue.length === 0) return;
    const currentJob = memoryQueue.shift();
    if (!currentJob) return;

    const logId = currentJob.id;
    updateJobLogStatus(logId, "active");

    try {
      const result = await processJobLogic(currentJob.name, currentJob.data);
      updateJobLogStatus(logId, "completed", { result });
    } catch (err: any) {
      console.error(`❌ [In-Memory Queue fallback] Job failure: ${err.message}`);
      updateJobLogStatus(logId, "failed", { error: err.message });
    }
  }, 1000);
}

// ----------------------------------------------------
// Initialize Redis / BullMQ & Fallback Safely
// ----------------------------------------------------

export function initQueueSystem() {
  if (!REDIS_URL) {
    console.log("ℹ️ Queue Setup: No REDIS_URL provided in environment. Instantiating high-fidelity In-Memory Fallback Queue Scheduler.");
    queueMode = "memory";
    runInMemoryScheduler();
    return;
  }

  try {
    console.log("🔄 Queue Setup: Connecting to Redis for BullMQ setup...", REDIS_URL.split("@")[1] || "configured-url");
    
    // Create connection options keeping startup safe
    const connectionOptions = {
      maxRetriesPerRequest: null, // Required by BullMQ worker module
      connectTimeout: 5000,       // Gracefully timeout instead of blocking dev startup
      lazyConnect: true
    };

    redisClient = new IORedis(REDIS_URL, connectionOptions);

    redisClient.on("connect", () => {
      isRedisConnected = true;
      queueMode = "redis";
      console.log("⚡ Queue Setup: ioredis connected to Redis server successfully!");
    });

    redisClient.on("error", (err: any) => {
      console.warn("⚠️ Redis Server Connect Failed. Falling back to robust In-Memory Queue engine.", err.message);
      isRedisConnected = false;
      if (queueMode !== "memory") {
        queueMode = "memory";
        runInMemoryScheduler();
      }
    });

    // Lazy trigger the connect
    redisClient.connect().catch((err: any) => {
      console.warn("⚠️ Queue Setup: Connect exception caught. Running on In-Memory Queue handler instead.");
      queueMode = "memory";
      runInMemoryScheduler();
    });

    // Create the BullMQ standard Task queue
    bullQueue = new Queue("AastaCleanQueue", {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        }
      }
    });

    // Create the background worker
    bullWorker = new Worker("AastaCleanQueue", async (job: Job) => {
      const logId = job.id || `redis_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      updateJobLogStatus(logId, "active");

      try {
        const result = await processJobLogic(job.name, job.data);
        updateJobLogStatus(logId, "completed", { result });
        return result;
      } catch (err: any) {
        updateJobLogStatus(logId, "failed", { error: err.message });
        throw err;
      }
    }, {
      connection: redisClient,
      concurrency: 2
    });

    bullWorker.on("failed", (job, err) => {
      console.error(`❌ [BullMQ Worker] Job failed: ${job?.id} with error: ${err.message}`);
    });

  } catch (err: any) {
    console.warn("⚠️ Queue Setup: Unexpected error bootstrapping BullMQ, securing with In-Memory fallback scheduler.", err.message);
    queueMode = "memory";
    runInMemoryScheduler();
  }
}

// ----------------------------------------------------
// Unified Enqueue Helper (Dual-capable)
// ----------------------------------------------------

export async function enqueueJob(jobName: string, data: any): Promise<string> {
  const jobId = `${jobName}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Register initial job log in both modes
  const newLog: JobLog = {
    id: jobId,
    jobName,
    queueType: queueMode === "redis" ? "redis-bullmq" : "in-memory-fallback",
    status: "queued",
    timestamp: new Date().toISOString(),
    payload: data
  };
  addJobLog(newLog);

  if (queueMode === "redis" && bullQueue && isRedisConnected) {
    try {
      await bullQueue.add(jobName, data, { jobId });
      console.log(`📦 [BullMQ] Job "${jobName}" buffered successfully in Redis queue. ID: ${jobId}`);
      return jobId;
    } catch (err: any) {
      console.warn(`⚠️ [BullMQ Setup Error] Queue insertion faulted, running local Eventloop override. Error: ${err.message}`);
    }
  }

  // Fallback / Standby Memory Queue Processing execution
  memoryQueue.push({
    id: jobId,
    name: jobName,
    data,
    timestamp: new Date().toISOString()
  });
  console.log(`📦 [In-Memory Fallback Queue] Job "${jobName}" buffered in memory loop list. ID: ${jobId}`);
  return jobId;
}
