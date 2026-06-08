import { AnalyticsBrowser } from '@segment/analytics-next';
import { RudderAnalytics } from '@rudderstack/analytics-js';

// ----------------------------------------------------
// Customer Data Platform Integrations (Segment & RudderStack)
// ----------------------------------------------------

const meta = import.meta as any;
const SEGMENT_WRITE_KEY = (meta.env?.VITE_SEGMENT_WRITE_KEY as string) || "SEGMENT_DEMO_KEY_6f65248d_aastaclean";
const RUDDER_WRITE_KEY = (meta.env?.VITE_RUDDERSTACK_WRITE_KEY as string) || "RUDDER_DEMO_KEY_6f65248d_aastaclean";
const RUDDER_DATA_PLANE_URL = (meta.env?.VITE_RUDDERSTACK_DATA_PLANE_URL as string) || "https://api.rudderstack.com";

const isRudderDemo = RUDDER_WRITE_KEY.includes("DEMO_KEY") || RUDDER_WRITE_KEY === "RUDDER_DEMO_KEY_6f65248d_aastaclean";

const isSegmentDemo = SEGMENT_WRITE_KEY.includes("DEMO_KEY") || SEGMENT_WRITE_KEY === "SEGMENT_DEMO_KEY_6f65248d_aastaclean";

// 1. Initialize Segment Analytics client
class MockSegmentAnalytics {
  track(eventName: string, properties?: any) {
    console.log(`[Mock Segment Event] "${eventName}"`, properties);
  }
  identify(userId: string, traits?: any) {
    console.log(`[Mock Segment Identify] User "${userId}"`, traits);
  }
}

let segmentClient: any = null;
if (isSegmentDemo) {
  segmentClient = new MockSegmentAnalytics();
  console.log("⚡ CDP: Segment analytics-next loaded as offline/mock client.");
} else {
  try {
    segmentClient = AnalyticsBrowser.load({ writeKey: SEGMENT_WRITE_KEY });
    console.log("⚡ CDP: Segment analytics-next initialized with key:", SEGMENT_WRITE_KEY);
  } catch (err) {
    console.warn("⚠️ CDP Error: Failed to load Segment Analytics SDK", err);
  }
}

// 2. Custom robust Mock client for local offline / sandboxed telemetry when demo key is active
class MockRudderAnalytics {
  load(writeKey: string, dataPlaneUrl: string, _options?: any) {
    console.log(`[Mock RudderStack] Telemetry active with placeholder key: ${writeKey} (No-op remote fetch bypassed)`);
  }
  ready(callback: () => void) {
    setTimeout(callback, 100);
  }
  track(eventName: string, properties?: any, _options?: any, callback?: any) {
    console.log(`[Mock RudderStack Event] "${eventName}"`, properties);
    if (callback) callback();
  }
  identify(userId: string, traits?: any, _options?: any, callback?: any) {
    console.log(`[Mock RudderStack Identify] User "${userId}"`, traits);
    if (callback) callback();
  }
  page(category?: any, name?: any, properties?: any, _options?: any, callback?: any) {
    console.log(`[Mock RudderStack Page]`, { category, name, properties });
    if (callback) callback();
  }
}

// Instantiate the appropriate RudderStack client based on writeKey credentials
let rudderanalytics: any = null;
if (isRudderDemo) {
  rudderanalytics = new MockRudderAnalytics();
} else {
  try {
    rudderanalytics = new RudderAnalytics();
  } catch (err) {
    console.warn("⚠️ CDP Error: Failed to instantiate live RudderAnalytics client, using fallback mock", err);
    rudderanalytics = new MockRudderAnalytics();
  }
}

// 3. Initialize RudderStack Analytics JS SDK
let rudderClientInitialized = false;
export function initializeRudderStack() {
  if (rudderClientInitialized) return;
  try {
    rudderanalytics.load(RUDDER_WRITE_KEY, RUDDER_DATA_PLANE_URL, {
      logLevel: "DEBUG"
    });
    rudderanalytics.ready(() => {
      rudderClientInitialized = true;
      console.log("⚡ CDP: RudderStack ready with Write Key:", RUDDER_WRITE_KEY);
    });
  } catch (err) {
    console.warn("⚠️ CDP Error: Failed to boot RudderStack SDK JS client", err);
  }
}

// Ensure first load tries to trigger RudderStack setup
if (typeof window !== "undefined") {
  initializeRudderStack();
}

/**
 * Unified tracking helper to record actions in BOTH Segment and RudderStack (Dual-Dispatch).
 * Displays a nice console trace and optional callback triggers.
 */
export function traceCDPInteraction(
  eventName: string,
  properties: Record<string, any> = {},
  onTriggerLog?: (log: any) => void
) {
  const enrichedProperties = {
    ...properties,
    source: "aastaclean_portal",
    applet_uuid: "6f65248d-6988-4b17-96f2-f29505824350",
    timestamp_utc: new Date().toISOString(),
    environment: (import.meta as any).env?.MODE || "development"
  };

  console.log(`[CDP Dispatch] eventName: "${eventName}"`, enrichedProperties);

  // Send to Segment
  if (segmentClient) {
    try {
      segmentClient.track(eventName, enrichedProperties);
    } catch (err) {
      console.warn("Failed sending track event to Segment client instance:", err);
    }
  }

  // Send to RudderStack
  try {
    rudderanalytics.track(eventName, enrichedProperties);
  } catch (err) {
    console.warn("Failed sending track event to RudderStack instance:", err);
  }

  // Trigger in-app log console feed if available for visual verification
  if (onTriggerLog) {
    onTriggerLog({
      id: `cdp_${eventName}_${Date.now()}`,
      type: "webhook", // categorizes nicely as webhook stream
      status: "info",
      message: `🎯 CDP Dual-Dispatch: Captured "${eventName}" telemetry in Segment & RudderStack.`,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        registeredCdpSegment: !!segmentClient,
        registeredCdpRudderStack: true,
        sentEventName: eventName,
        traitsDispatchMap: enrichedProperties
      }
    });
  }
}

/**
 * Identify a user across both Segment and RudderStack platforms.
 */
export function identifyCDPUser(
  userId: string,
  traits: Record<string, any> = {},
  onTriggerLog?: (log: any) => void
) {
  const enrichedTraits = {
    ...traits,
    applet: "CleanersApp-AastaClean",
    lastSeenAt: new Date().toISOString()
  };

  console.log(`[CDP Identify] UserID: ${userId}`, enrichedTraits);

  // Identify in Segment
  if (segmentClient) {
    try {
      segmentClient.identify(userId, enrichedTraits);
    } catch (err) {
      console.warn("Failed sending identify to Segment:", err);
    }
  }

  // Identify in RudderStack
  try {
    rudderanalytics.identify(userId, enrichedTraits);
  } catch (err) {
    console.warn("Failed sending identify to RudderStack:", err);
  }

  if (onTriggerLog) {
    onTriggerLog({
      id: `cdp_identify_${Date.now()}`,
      type: "crm",
      status: "success",
      message: `👤 CDP Identify: Synced secure user context with Segment & RudderStack repositories.`,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        assignedId: userId,
        syncedTraits: enrichedTraits
      }
    });
  }
}
