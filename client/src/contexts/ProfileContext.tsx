import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CompareHistoryEntry,
  QuizAnswers,
  RecommendationSet,
  SavedBag,
  ShaftModelCalibration,
} from "../types";

type OnboardingVariant = "guided" | "express";

interface PersistedProfile {
  quizDraft: Partial<QuizAnswers>;
  lastQuizAnswers: Partial<QuizAnswers> | null;
  lastCompletedQuizAt: string | null;
  onboardingVariant: OnboardingVariant;
  modelCalibration: ShaftModelCalibration;
  savedBags: SavedBag[];
  compareHistory: CompareHistoryEntry[];
}

interface ProfileContextValue extends PersistedProfile {
  hasQuizDraft: boolean;
  bestBag: SavedBag | null;
  saveQuizDraft: (draft: Partial<QuizAnswers>) => void;
  clearQuizDraft: () => void;
  markQuizCompleted: (answers: QuizAnswers) => void;
  updateCalibration: (patch: Partial<ShaftModelCalibration>) => void;
  resetCalibration: () => void;
  saveBag: (label: string, answers: QuizAnswers, results: RecommendationSet) => SavedBag;
  removeBag: (id: string) => void;
  addCompareHistory: (
    entry: Omit<CompareHistoryEntry, "id" | "createdAt">
  ) => CompareHistoryEntry;
  clearCompareHistory: () => void;
}

const STORAGE_KEY = "golf-recommender-profile-v2";

const DEFAULT_CALIBRATION: ShaftModelCalibration = {
  ballSpeedBias: 0,
  launchAngleBias: 0,
  spinRateBias: 0,
  faceAngleBias: 0,
  pathAngleBias: 0,
  dispersionBias: 0,
};

function getRandomVariant(): OnboardingVariant {
  return Math.random() > 0.5 ? "guided" : "express";
}

function normalizeCalibration(
  calibration?: Partial<ShaftModelCalibration> | null
): ShaftModelCalibration {
  return {
    ...DEFAULT_CALIBRATION,
    ...(calibration || {}),
  };
}

function computeBagQuality(results: RecommendationSet): number {
  const parts = [
    results.driver,
    results.fairwayWood,
    results.hybrid,
    results.ironSet,
    results.wedge,
    results.putter,
  ].filter(Boolean);

  if (parts.length === 0) return 0;

  const avgScore =
    parts.reduce((sum, part) => sum + Number(part?.score || 0), 0) / parts.length;
  const avgConfidence =
    parts.reduce((sum, part) => sum + Number(part?.confidence?.score || 0), 0) / parts.length;

  return avgScore + avgConfidence * 10;
}

function loadInitialProfile(): PersistedProfile {
  if (typeof window === "undefined") {
    return {
      quizDraft: {},
      lastQuizAnswers: null,
      lastCompletedQuizAt: null,
      onboardingVariant: "guided",
      modelCalibration: DEFAULT_CALIBRATION,
      savedBags: [],
      compareHistory: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        quizDraft: {},
        lastQuizAnswers: null,
        lastCompletedQuizAt: null,
        onboardingVariant: getRandomVariant(),
        modelCalibration: DEFAULT_CALIBRATION,
        savedBags: [],
        compareHistory: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedProfile>;
    return {
      quizDraft: parsed.quizDraft ?? {},
      lastQuizAnswers: parsed.lastQuizAnswers ?? null,
      lastCompletedQuizAt: parsed.lastCompletedQuizAt ?? null,
      onboardingVariant:
        parsed.onboardingVariant === "express" ? "express" : "guided",
      modelCalibration: normalizeCalibration(parsed.modelCalibration),
      savedBags: parsed.savedBags ?? [],
      compareHistory: parsed.compareHistory ?? [],
    };
  } catch {
    return {
      quizDraft: {},
      lastQuizAnswers: null,
      lastCompletedQuizAt: null,
      onboardingVariant: getRandomVariant(),
      modelCalibration: DEFAULT_CALIBRATION,
      savedBags: [],
      compareHistory: [],
    };
  }
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PersistedProfile>(() => loadInitialProfile());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const bestBag = useMemo(() => {
    if (profile.savedBags.length === 0) return null;
    return [...profile.savedBags]
      .sort(
        (a, b) =>
          computeBagQuality(b.results) - computeBagQuality(a.results) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
  }, [profile.savedBags]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      ...profile,
      bestBag,
      hasQuizDraft: Object.keys(profile.quizDraft || {}).length > 0,
      saveQuizDraft: (draft: Partial<QuizAnswers>) => {
        setProfile((prev) => ({ ...prev, quizDraft: draft }));
      },
      clearQuizDraft: () => {
        setProfile((prev) => ({ ...prev, quizDraft: {} }));
      },
      markQuizCompleted: (answers: QuizAnswers) => {
        setProfile((prev) => ({
          ...prev,
          quizDraft: {},
          lastQuizAnswers: answers,
          lastCompletedQuizAt: new Date().toISOString(),
        }));
      },
      updateCalibration: (patch: Partial<ShaftModelCalibration>) => {
        setProfile((prev) => ({
          ...prev,
          modelCalibration: { ...prev.modelCalibration, ...patch },
        }));
      },
      resetCalibration: () => {
        setProfile((prev) => ({ ...prev, modelCalibration: DEFAULT_CALIBRATION }));
      },
      saveBag: (label: string, answers: QuizAnswers, results: RecommendationSet) => {
        const bag: SavedBag = {
          id: `bag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          label,
          createdAt: new Date().toISOString(),
          answers,
          results,
        };

        setProfile((prev) => ({
          ...prev,
          savedBags: [bag, ...prev.savedBags].slice(0, 30),
        }));

        return bag;
      },
      removeBag: (id: string) => {
        setProfile((prev) => ({
          ...prev,
          savedBags: prev.savedBags.filter((bag) => bag.id !== id),
        }));
      },
      addCompareHistory: (entry: Omit<CompareHistoryEntry, "id" | "createdAt">) => {
        const nextEntry: CompareHistoryEntry = {
          ...entry,
          id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        };

        setProfile((prev) => ({
          ...prev,
          compareHistory: [nextEntry, ...prev.compareHistory].slice(0, 80),
        }));

        return nextEntry;
      },
      clearCompareHistory: () => {
        setProfile((prev) => ({ ...prev, compareHistory: [] }));
      },
    }),
    [bestBag, profile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
