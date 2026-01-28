import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { QuizAnswers } from "../types";
import { getRecommendations } from "../services/api";

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

const STEPS = [
  "Skill Level",
  "Swing Speed",
  "Budget",
  "Playing Frequency",
  "Physical Profile",
  "Improvement Goals",
];

export default function Quiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof QuizAnswers, value: any) => {
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
      setError("Failed to get recommendations. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="quiz-step">
            <h2>What's your skill level?</h2>
            <p>Choose the option that best describes your current game.</p>
            <div className="quiz-options">
              {[
                {
                  value: "beginner",
                  label: "Beginner",
                  desc: "New to golf or still learning the basics. Typical score: 100+",
                },
                {
                  value: "intermediate",
                  label: "Intermediate",
                  desc: "Comfortable with fundamentals, working on consistency. Score: 85-100",
                },
                {
                  value: "advanced",
                  label: "Advanced",
                  desc: "Strong all-around game with good course management. Score: 75-85",
                },
                {
                  value: "professional",
                  label: "Professional",
                  desc: "Elite player competing at a high level. Score: under 75",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`quiz-option ${answers.skillLevel === opt.value ? "selected" : ""}`}
                  onClick={() => update("skillLevel", opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="quiz-step">
            <h2>How fast is your swing?</h2>
            <p>
              If you're unsure, pick based on your typical driver distance.
            </p>
            <div className="quiz-options">
              {[
                {
                  value: "slow",
                  label: "Slow",
                  desc: "Driver distance under 180 yards. Swing speed under 80 mph.",
                },
                {
                  value: "moderate",
                  label: "Moderate",
                  desc: "Driver distance 180-220 yards. Swing speed 80-95 mph.",
                },
                {
                  value: "fast",
                  label: "Fast",
                  desc: "Driver distance 220-260 yards. Swing speed 95-110 mph.",
                },
                {
                  value: "very_fast",
                  label: "Very Fast",
                  desc: "Driver distance 260+ yards. Swing speed 110+ mph.",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`quiz-option ${answers.swingSpeed === opt.value ? "selected" : ""}`}
                  onClick={() => update("swingSpeed", opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="quiz-step">
            <h2>What's your budget?</h2>
            <p>Per-club budget range (not the total set).</p>
            <div className="budget-inputs">
              <div className="budget-presets">
                {[
                  { label: "Budget ($0 - $300)", min: 0, max: 300 },
                  { label: "Mid-Range ($100 - $500)", min: 100, max: 500 },
                  { label: "Premium ($300 - $800)", min: 300, max: 800 },
                  { label: "No Limit ($0 - $2000)", min: 0, max: 2000 },
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
                  Or set custom range:
                  <div className="range-inputs">
                    <input
                      type="number"
                      value={answers.budgetMin}
                      onChange={(e) =>
                        update("budgetMin", parseInt(e.target.value) || 0)
                      }
                      placeholder="Min"
                      min={0}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={answers.budgetMax}
                      onChange={(e) =>
                        update("budgetMax", parseInt(e.target.value) || 0)
                      }
                      placeholder="Max"
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
            <h2>How often do you play?</h2>
            <div className="quiz-options">
              {[
                { value: "rarely", label: "Rarely", desc: "A few times a year" },
                {
                  value: "monthly",
                  label: "Monthly",
                  desc: "1-3 times per month",
                },
                {
                  value: "weekly",
                  label: "Weekly",
                  desc: "Once or twice a week",
                },
                {
                  value: "daily",
                  label: "Almost Daily",
                  desc: "3+ times per week",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`quiz-option ${answers.playingFrequency === opt.value ? "selected" : ""}`}
                  onClick={() => update("playingFrequency", opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="quiz-step">
            <h2>Tell us about yourself</h2>
            <p>This helps us recommend the right shaft and club weight.</p>
            <div className="quiz-section">
              <h3>Height</h3>
              <div className="quiz-options horizontal">
                {[
                  { value: "short", label: "Under 5'6\"" },
                  { value: "average", label: "5'6\" - 6'0\"" },
                  { value: "tall", label: "Over 6'0\"" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`quiz-option compact ${answers.height === opt.value ? "selected" : ""}`}
                    onClick={() => update("height", opt.value)}
                  >
                    <strong>{opt.label}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="quiz-section">
              <h3>Strength</h3>
              <div className="quiz-options horizontal">
                {[
                  { value: "light", label: "Light" },
                  { value: "average", label: "Average" },
                  { value: "strong", label: "Strong" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`quiz-option compact ${answers.strength === opt.value ? "selected" : ""}`}
                    onClick={() => update("strength", opt.value)}
                  >
                    <strong>{opt.label}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="quiz-step">
            <h2>What do you want to improve?</h2>
            <p>Select all that apply.</p>
            <div className="quiz-options">
              {[
                {
                  value: "distance",
                  label: "Distance",
                  desc: "Hit the ball farther off the tee and with every club",
                },
                {
                  value: "accuracy",
                  label: "Accuracy",
                  desc: "Hit more fairways and greens in regulation",
                },
                {
                  value: "consistency",
                  label: "Consistency",
                  desc: "More forgiving clubs that reduce the impact of mishits",
                },
                {
                  value: "control",
                  label: "Shot Control",
                  desc: "Shape shots and control trajectory and spin",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`quiz-option ${answers.improvementGoals.includes(opt.value) ? "selected" : ""}`}
                  onClick={() => toggleGoal(opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
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
      <div className="quiz-progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`progress-step ${i === step ? "current" : ""} ${i < step ? "done" : ""}`}
          >
            <div className="progress-dot">{i < step ? "\u2713" : i + 1}</div>
            <span className="progress-label">{s}</span>
          </div>
        ))}
      </div>

      {renderStep()}

      {error && <div className="error-message">{error}</div>}

      <div className="quiz-nav">
        {step > 0 && (
          <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
          >
            Next
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canNext() || loading}
          >
            {loading ? "Finding clubs..." : "Get Recommendations"}
          </button>
        )}
      </div>
    </div>
  );
}
