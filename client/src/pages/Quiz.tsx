
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { QuizAnswers } from "../types";
import { getRecommendations } from "../services/api";
import { useUnits } from "../hooks/useUnits";
import { useProfile } from "../contexts/ProfileContext";
import { useExperiment } from "../contexts/ExperimentContext";

const INITIAL_ANSWERS: QuizAnswers = {
  focusArea: "", // "full_set", "driver", "iron", "wedge"
  problem: "",   // "slice", "hook", "distance", etc.
  fittingGoal: "scoring_gain",
  skillLevel: "",
  swingSpeed: "",
  budgetMin: 0,
  budgetMax: 2000,
  playingFrequency: "",
  height: "",
  strength: "",
  improvementGoals: [],
};

function getInitialStep(
  answers: QuizAnswers,
  onboardingVariant: "guided" | "express",
  hasQuizDraft: boolean
): number {
  if (!hasQuizDraft && onboardingVariant === "express") return 2;
  if (!answers.focusArea) return 0;
  if (!answers.fittingGoal) return 0;
  if (answers.focusArea !== "full_set" && !answers.problem) return 1;
  if (!answers.skillLevel) return 2;
  if (!answers.swingSpeed) return 3;
  if (answers.budgetMax <= 0) return 4;
  if (!answers.playingFrequency) return 5;
  if (answers.focusArea === "full_set" && answers.improvementGoals.length === 0) return 6;
  return answers.focusArea === "full_set" ? 6 : 5;
}

export default function Quiz() {
  const navigate = useNavigate();
  const { t } = useTranslation("quiz");
  const { t: tc } = useTranslation("common");
  const { getSwingSpeedDescription } = useUnits();
  const {
    quizDraft,
    lastQuizAnswers,
    saveQuizDraft,
    markQuizCompleted,
    onboardingVariant,
    hasQuizDraft,
  } = useProfile();
  const { variants, trackEvent } = useExperiment();
  const onboardingMode = variants.onboarding_flow || onboardingVariant;
  const buildInitialAnswers = (): QuizAnswers => ({
    ...INITIAL_ANSWERS,
    ...(onboardingMode === "express"
      ? { focusArea: "full_set", fittingGoal: "distance" }
      : {}),
    ...(lastQuizAnswers ?? {}),
    ...quizDraft,
  });
  const [answers, setAnswers] = useState<QuizAnswers>(() => buildInitialAnswers());
  const [step, setStep] = useState<number>(() =>
    getInitialStep(buildInitialAnswers(), onboardingMode, hasQuizDraft)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveQuizDraft(answers);
  }, [answers, saveQuizDraft]);

  const update = (field: keyof QuizAnswers, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGoal = (goal: string) => {
    setAnswers((prev) => ({
      ...prev,
      improvementGoals: prev.improvementGoals.includes(goal)
        ? prev.improvementGoals.filter((g) => g !== goal)
        : [...prev.improvementGoals, goal],
    }));
  };

  // Step Definitions
  // 0: Focus Area (New)
  // 1: Specific Problem (New - only if specific area selected)
  // 2: Skill Level
  // 3: Swing Speed
  // 4: Budget
  // 5: Frequency
  // 6: Goals (Full bag flow only)

  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!answers.focusArea && !!answers.fittingGoal;
      case 1: return answers.focusArea === 'full_set' ? !!answers.skillLevel : !!answers.problem;
      case 2: return answers.focusArea === 'full_set' ? !!answers.swingSpeed : !!answers.skillLevel;
      case 3: return answers.focusArea === 'full_set' ? answers.budgetMax > 0 : !!answers.swingSpeed;
      case 4: return answers.focusArea === 'full_set' ? !!answers.playingFrequency : answers.budgetMax > 0;
      case 5: return !!answers.playingFrequency;
      case 6: return answers.focusArea === 'full_set' ? answers.improvementGoals.length > 0 : true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await getRecommendations(answers);
      trackEvent("quiz_submitted", {
        fittingGoal: answers.fittingGoal,
        focusArea: answers.focusArea,
      });
      markQuizCompleted(answers);
      navigate("/results", { state: { results, answers } });
    } catch (err) {
      setError(tc("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Branching Logic
    if (step === 0 && answers.focusArea === 'full_set') {
      setStep(2); // Skip Problem Selection
      return;
    }
    if (step === 1 && answers.focusArea !== 'full_set') {
      setStep(2); // Go to Skill Level
      return;
    }
    
    // Final Step Logic
    const isFullSet = answers.focusArea === 'full_set';
    const lastStep = isFullSet ? 6 : 5;

    if (step === lastStep) {
      handleSubmit();
      return;
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 2 && answers.focusArea === 'full_set') {
      setStep(0);
      return;
    }
    if (step === 2 && answers.focusArea !== 'full_set') {
      setStep(1);
      return;
    }
    setStep(step - 1);
  };

  const renderStep = () => {
    // 0. Focus Area
    if (step === 0) return (
      <div className="quiz-step">
        <h2>{t("step0.title")}</h2>
        <div className="quiz-options">
          {[
            { id: "full_set", label: t("step0.full_set.label"), desc: t("step0.full_set.description") },
            { id: "driver", label: t("step0.driver.label"), desc: t("step0.driver.description") },
            { id: "iron", label: t("step0.iron.label"), desc: t("step0.iron.description") },
            { id: "wedge", label: t("step0.wedge.label"), desc: t("step0.wedge.description") }
          ].map((opt) => (
            <button
              key={opt.id}
              className={`quiz-option ${answers.focusArea === opt.id ? "selected" : ""}`}
              onClick={() => update("focusArea", opt.id)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </button>
          ))}
        </div>
        <div className="quiz-section">
          <h3>{t("goalMode.title")}</h3>
          <div className="quiz-options">
            {[
              { id: "distance", label: t("goalMode.distance") },
              { id: "fairway_hit", label: t("goalMode.fairwayHit") },
              { id: "dispersion", label: t("goalMode.dispersion") },
              { id: "scoring_gain", label: t("goalMode.scoringGain") },
            ].map((goal) => (
              <button
                key={goal.id}
                className={`quiz-option ${answers.fittingGoal === goal.id ? "selected" : ""}`}
                onClick={() => update("fittingGoal", goal.id)}
              >
                <strong>{goal.label}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    // 1. Specific Problem (Only for specific areas)
    if (step === 1 && answers.focusArea !== 'full_set') {
      const problems = {
        driver: [
          { id: "slice", label: t("problems.slice") },
          { id: "hook", label: t("problems.hook") },
          { id: "distance", label: t("problems.distance") },
          { id: "launch", label: t("problems.launch") }
        ],
        iron: [
          { id: "consistency", label: t("problems.consistency") },
          { id: "distance", label: t("problems.distance") },
          { id: "direction", label: t("problems.direction") }
        ],
        wedge: [
          { id: "chunk", label: t("problems.chunk") },
          { id: "thin", label: t("problems.thin") },
          { id: "spin", label: t("problems.spin") }
        ]
      }[answers.focusArea as 'driver' | 'iron' | 'wedge'] || [];

      return (
        <div className="quiz-step">
          <h2>{t("step1_problem.title")}</h2>
          <div className="quiz-options">
            {problems.map((prob) => (
              <button
                key={prob.id}
                className={`quiz-option ${answers.problem === prob.id ? "selected" : ""}`}
                onClick={() => update("problem", prob.id)}
              >
                <strong>{prob.label}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 2. Skill Level
    if (step === 2) return (
      <div className="quiz-step">
        <h2>{t("step1.title")}</h2>
        <div className="quiz-options">
          {["beginner", "intermediate", "advanced", "professional"].map((level) => (
            <button
              key={level}
              className={`quiz-option ${answers.skillLevel === level ? "selected" : ""}`}
              onClick={() => update("skillLevel", level)}
            >
              <strong>{t(`step1.${level}.label`)}</strong>
              <span>{t(`step1.${level}.description`)}</span>
            </button>
          ))}
        </div>
      </div>
    );

    // 3. Swing Speed
    if (step === 3) return (
      <div className="quiz-step">
        <h2>{t("step2.title")}</h2>
        <div className="quiz-options">
          {(["slow", "moderate", "fast", "very_fast"] as const).map((speed) => (
            <button
              key={speed}
              className={`quiz-option ${answers.swingSpeed === speed ? "selected" : ""}`}
              onClick={() => update("swingSpeed", speed)}
            >
              <strong>{t(`step2.${speed}.label`)}</strong>
              <span>{getSwingSpeedDescription(speed)}</span>
            </button>
          ))}
        </div>
      </div>
    );

    // 4. Budget
    if (step === 4) return (
      <div className="quiz-step">
        <h2>{t("step3.title")}</h2>
        <p>{t("step3.perClub")}</p>
        <div className="budget-inputs">
          <div className="budget-presets">
            {[
              { label: `${t("step3.min")} ($0 - $300)`, min: 0, max: 300 },
              { label: `Mid-Range ($100 - $500)`, min: 100, max: 500 },
              { label: `Premium ($300 - $800)`, min: 300, max: 800 },
              { label: `No Limit ($0 - $2000)`, min: 0, max: 2000 },
            ].map((preset) => (
              <button
                key={preset.label}
                className={`quiz-option ${answers.budgetMin === preset.min && answers.budgetMax === preset.max ? "selected" : ""}`}
                onClick={() => {
                  update("budgetMin", preset.min);
                  update("budgetMax", preset.max);
                }}
              >
                <strong>{preset.label}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    // 5. Frequency
    if (step === 5) return (
      <div className="quiz-step">
        <h2>{t("step4.title")}</h2>
        <div className="quiz-options">
          {["occasional", "monthly", "weekly", "daily"].map((freq) => (
            <button
              key={freq}
              className={`quiz-option ${answers.playingFrequency === freq ? "selected" : ""}`}
              onClick={() => update("playingFrequency", freq)}
            >
              <strong>{t(`step4.${freq}.label`)}</strong>
              <span>{t(`step4.${freq}.description`)}</span>
            </button>
          ))}
        </div>
      </div>
    );

    // 6. Goals (Only for Full Set flow, or skipped/merged)
    if (step === 6 && answers.focusArea === 'full_set') return (
      <div className="quiz-step">
        <h2>{t("step6.title")}</h2>
        <div className="quiz-options">
          {["distance", "accuracy", "consistency", "forgiveness"].map((goal) => (
            <button
              key={goal}
              className={`quiz-option ${answers.improvementGoals.includes(goal) ? "selected" : ""}`}
              onClick={() => toggleGoal(goal)}
            >
              <strong>{t(`step6.goals.${goal}`)}</strong>
            </button>
          ))}
        </div>
      </div>
    );

    return null;
  };

  return (
    <div className="quiz-page">
      <h1>{t("title")}</h1>
      <p className="quiz-variant-note">
        {onboardingMode === "express" ? t("variant.express") : t("variant.guided")}
      </p>
      {/* Simplified Progress for branching logic */}
      <div className="quiz-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / (answers.focusArea === 'full_set' ? 7 : 6)) * 100}%` }}
          />
        </div>
      </div>

      {renderStep()}

      {error && <div className="error-message">{error}</div>}

      <div className="quiz-nav">
        {step > 0 && (
          <button className="btn btn-secondary" onClick={handleBack}>
            {tc("buttons.back")}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={!canNext() || loading}
        >
          {loading ? t("submitting") : (step === (answers.focusArea === 'full_set' ? 6 : 5) ? tc("nav.results") : tc("buttons.next"))}
        </button>
      </div>
    </div>
  );
}
