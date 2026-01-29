import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { QuizAnswers } from "../types";
import { getRecommendations } from "../services/api";
import { useUnits } from "../hooks/useUnits";

const INITIAL_ANSWERS: QuizAnswers = {
  skillLevel: "",
  swingSpeed: "",
  budgetMin: 0,
  budgetMax: 2000,
  playingFrequency: "",
  height: "",
  strength: "",
  improvementGoals: [],
};

export default function Quiz() {
  const navigate = useNavigate();
  const { t } = useTranslation("quiz");
  const { t: tc } = useTranslation("common");
  const { getHeightLabel, getSwingSpeedDescription, isMetric } = useUnits();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const STEPS = [
    tc("skillLevels.beginner"),
    tc("swingSpeed.slow"),
    tc("labels.price"),
    t("step4.title"),
    t("step5.title"),
    t("step6.title"),
  ];

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

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return !!answers.skillLevel;
      case 1:
        return !!answers.swingSpeed;
      case 2:
        return answers.budgetMax > 0;
      case 3:
        return !!answers.playingFrequency;
      case 4:
        return !!answers.height && !!answers.strength;
      case 5:
        return answers.improvementGoals.length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await getRecommendations(answers);
      navigate("/results", { state: { results, answers } });
    } catch (err) {
      setError(tc("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="quiz-step">
            <h2>{t("step1.title")}</h2>
            <div className="quiz-options">
              {(["beginner", "intermediate", "advanced", "professional"] as const).map((level) => (
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

      case 1:
        return (
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

      case 2:
        return (
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
              <div className="custom-budget">
                <label>
                  {t("step3.range", { min: answers.budgetMin, max: answers.budgetMax })}
                  <div className="range-inputs">
                    <input
                      type="number"
                      value={answers.budgetMin}
                      onChange={(e) =>
                        update("budgetMin", parseInt(e.target.value) || 0)
                      }
                      placeholder={t("step3.min")}
                      min={0}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      value={answers.budgetMax}
                      onChange={(e) =>
                        update("budgetMax", parseInt(e.target.value) || 0)
                      }
                      placeholder={t("step3.max")}
                      min={0}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="quiz-step">
            <h2>{t("step4.title")}</h2>
            <div className="quiz-options">
              {(["occasional", "monthly", "weekly", "daily"] as const).map((freq) => (
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

      case 4:
        return (
          <div className="quiz-step">
            <h2>{t("step5.title")}</h2>
            <div className="quiz-section">
              <h3>{t("step5.height")}</h3>
              <div className="quiz-options horizontal">
                {(["short", "medium", "tall", "very_tall"] as const).map((h) => (
                  <button
                    key={h}
                    className={`quiz-option compact ${answers.height === h ? "selected" : ""}`}
                    onClick={() => update("height", h)}
                  >
                    <strong>{getHeightLabel(h)}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="quiz-section">
              <h3>{t("step5.strength")}</h3>
              <div className="quiz-options horizontal">
                {(["light", "average", "strong", "very_strong"] as const).map((s) => (
                  <button
                    key={s}
                    className={`quiz-option compact ${answers.strength === s ? "selected" : ""}`}
                    onClick={() => update("strength", s)}
                  >
                    <strong>{t(`step5.strengthOptions.${s}`)}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="quiz-step">
            <h2>{t("step6.title")}</h2>
            <p>{t("step6.subtitle")}</p>
            <div className="quiz-options">
              {(["distance", "accuracy", "consistency", "forgiveness", "control", "feel"] as const).map((goal) => (
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

      default:
        return null;
    }
  };

  return (
    <div className="quiz-page">
      <h1>{t("title")}</h1>
      <div className="quiz-progress">
        <span>{t("progress", { current: step + 1, total: STEPS.length })}</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {renderStep()}

      {error && <div className="error-message">{error}</div>}

      <div className="quiz-nav">
        {step > 0 && (
          <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            {tc("buttons.back")}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
          >
            {tc("buttons.next")}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canNext() || loading}
          >
            {loading ? t("submitting") : tc("nav.quiz")}
          </button>
        )}
      </div>
    </div>
  );
}
