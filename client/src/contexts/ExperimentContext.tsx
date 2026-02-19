import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface ExperimentVariants {
  onboarding_flow: "guided" | "express";
  recommendation_copy: "standard" | "confidence_first";
  compare_ui: "classic" | "one_thumb";
}

export interface ExperimentEvent {
  id: string;
  name: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ExperimentContextValue {
  variants: ExperimentVariants;
  events: ExperimentEvent[];
  trackEvent: (name: string, metadata?: Record<string, unknown>) => void;
  clearEvents: () => void;
}

const STORAGE_KEY = "golf-experiments-v1";
const EVENTS_KEY = "golf-experiments-events-v1";

function pickVariant<T extends string>(seed: string, options: T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % options.length;
  return options[index];
}

function createVariants(): ExperimentVariants {
  const seed =
    typeof navigator !== "undefined"
      ? `${navigator.userAgent}-${navigator.language}`
      : `${Date.now()}`;

  return {
    onboarding_flow: pickVariant(seed + "onboarding", ["guided", "express"]),
    recommendation_copy: pickVariant(seed + "copy", ["standard", "confidence_first"]),
    compare_ui: pickVariant(seed + "compare", ["classic", "one_thumb"]),
  };
}

function loadVariants(): ExperimentVariants {
  if (typeof window === "undefined") return createVariants();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const next = createVariants();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    }
    return JSON.parse(raw) as ExperimentVariants;
  } catch {
    return createVariants();
  }
}

function loadEvents(): ExperimentEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExperimentEvent[];
  } catch {
    return [];
  }
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [variants] = useState<ExperimentVariants>(() => loadVariants());
  const [events, setEvents] = useState<ExperimentEvent[]>(() => loadEvents());

  useEffect(() => {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const value = useMemo<ExperimentContextValue>(
    () => ({
      variants,
      events,
      trackEvent: (name, metadata) => {
        setEvents((prev) => [
          {
            id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt: new Date().toISOString(),
            metadata,
          },
          ...prev,
        ].slice(0, 500));
      },
      clearEvents: () => setEvents([]),
    }),
    [events, variants]
  );

  return (
    <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) throw new Error("useExperiment must be used within ExperimentProvider");
  return context;
}
