export type MonitoringSeverity = "info" | "warn" | "error";

export interface MonitoringEvent {
  id: string;
  type: string;
  severity: MonitoringSeverity;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type RenderQuality = "ultra" | "balanced" | "safe";

export interface RenderPerformanceSample {
  source: "simulator" | "compare";
  quality: RenderQuality;
  fps: number;
  frameTimeMs: number;
  droppedFrameRatio: number;
  lowFps: boolean;
}

const STORAGE_KEY = "golf-monitoring-events-v1";
const MAX_EVENTS = 300;
const GLOBAL_FLAG = "__golfMonitoringAttached";

declare global {
  interface Window {
    __golfMonitoringAttached?: boolean;
  }
}

function loadEvents(): MonitoringEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MonitoringEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: MonitoringEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function recordMonitoringEvent(
  type: string,
  severity: MonitoringSeverity,
  message: string,
  metadata?: Record<string, unknown>
): string {
  const event: MonitoringEvent = {
    id: `mon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    severity,
    message,
    createdAt: new Date().toISOString(),
    metadata,
  };

  const next = [event, ...loadEvents()];
  saveEvents(next);
  return event.id;
}

export function recordError(
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>
): string {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Unknown runtime error";

  return recordMonitoringEvent("runtime_error", "error", `${context}: ${errorMessage}`, {
    ...(error instanceof Error ? { stack: error.stack } : {}),
    ...(metadata || {}),
  });
}

export function recordRenderPerformance(sample: RenderPerformanceSample): string | null {
  if (!sample.lowFps) return null;
  return recordMonitoringEvent("render_performance", "warn", "Low FPS detected", {
    source: sample.source,
    quality: sample.quality,
    fps: Math.round(sample.fps),
    frameTimeMs: Number(sample.frameTimeMs.toFixed(2)),
    droppedFrameRatio: Number(sample.droppedFrameRatio.toFixed(3)),
  });
}

export function ensureGlobalMonitoring() {
  if (typeof window === "undefined") return;
  if (window[GLOBAL_FLAG]) return;

  const onWindowError = (event: ErrorEvent) => {
    recordError(event.error || event.message, "window.onerror", {
      filename: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordError(event.reason, "window.unhandledrejection");
  };

  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= 160) {
            recordMonitoringEvent(
              "long_task",
              "warn",
              "Long task detected on main thread",
              {
                durationMs: Number(entry.duration.toFixed(2)),
                startTimeMs: Number(entry.startTime.toFixed(2)),
              }
            );
          }
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    } catch {
      // Longtask observer is not supported in some browsers.
    }
  }

  window[GLOBAL_FLAG] = true;
}

