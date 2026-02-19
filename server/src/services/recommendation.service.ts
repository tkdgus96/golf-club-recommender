import { IGolfClub } from "../interfaces/IGolfClub";
import { ClubType } from "../enums/club-enums";

export interface QuizAnswers {
  focusArea: string;
  problem: string;
  fittingGoal?: "distance" | "fairway_hit" | "dispersion" | "scoring_gain";
  skillLevel: string;
  swingSpeed: string;
  budgetMin: number;
  budgetMax: number;
  playingFrequency: string;
  height: string;
  strength: string;
  improvementGoals: string[];
}

export interface ReasonItem {
  key: string;
  params?: Record<string, string | number>;
}

export interface ScoreBreakdown {
  focusPenalty: number;
  skill: number;
  budget: number;
  swingSpeed: number;
  goals: number;
}

export interface RecommendationConfidence {
  score: number;
  level: "low" | "medium" | "high";
  components: {
    modelFit: number;
    dataQuality: number;
    signalStrength: number;
  };
}

export interface ScoredClub {
  club: IGolfClub;
  score: number;
  reasons: ReasonItem[];
  scoreBreakdown: ScoreBreakdown;
  confidence: RecommendationConfidence;
}

export interface RecommendationSet {
  driver: ScoredClub | null;
  fairwayWood: ScoredClub | null;
  hybrid: ScoredClub | null;
  ironSet: ScoredClub | null;
  wedge: ScoredClub | null;
  putter: ScoredClub | null;
  totalPrice: number;
}

const SKILL_ORDER = ["beginner", "intermediate", "advanced", "professional"];

const SWING_SPEED_TO_FLEX: Record<string, string[]> = {
  slow: ["ladies", "senior"],
  moderate: ["senior", "regular"],
  fast: ["regular", "stiff"],
  very_fast: ["stiff", "extra_stiff"],
};

const GOAL_WEIGHT_PROFILE: Record<
  NonNullable<QuizAnswers["fittingGoal"]>,
  { skill: number; budget: number; swing: number; goals: number }
> = {
  distance: { skill: 20, budget: 15, swing: 20, goals: 45 },
  fairway_hit: { skill: 25, budget: 15, swing: 20, goals: 40 },
  dispersion: { skill: 25, budget: 10, swing: 25, goals: 40 },
  scoring_gain: { skill: 30, budget: 20, swing: 20, goals: 30 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getConfidenceLevel(score: number): "low" | "medium" | "high" {
  if (score >= 0.78) return "high";
  if (score >= 0.56) return "medium";
  return "low";
}

function skillDistance(a: string, b: string): number {
  const idxA = SKILL_ORDER.indexOf(a);
  const idxB = SKILL_ORDER.indexOf(b);
  if (idxA === -1 || idxB === -1) return 3;
  return Math.abs(idxA - idxB);
}

function scoreClub(club: IGolfClub, answers: QuizAnswers): ScoredClub {
  let score = 0;
  const reasons: ReasonItem[] = [];
  const scoreBreakdown: ScoreBreakdown = {
    focusPenalty: 0,
    skill: 0,
    budget: 0,
    swingSpeed: 0,
    goals: 0,
  };

  const fittingGoal = answers.fittingGoal || "scoring_gain";
  const weights = GOAL_WEIGHT_PROFILE[fittingGoal];

  // 0. Focus area penalty to strongly discourage irrelevant categories.
  if (answers.focusArea && answers.focusArea !== "full_set") {
    if (answers.focusArea === "driver" && club.clubType !== ClubType.DRIVER) {
      scoreBreakdown.focusPenalty = -100;
      score += scoreBreakdown.focusPenalty;
    }
    if (answers.focusArea === "iron" && club.clubType !== ClubType.IRON_SET) {
      scoreBreakdown.focusPenalty = -100;
      score += scoreBreakdown.focusPenalty;
    }
    if (answers.focusArea === "wedge" && club.clubType !== ClubType.WEDGE) {
      scoreBreakdown.focusPenalty = -100;
      score += scoreBreakdown.focusPenalty;
    }
  }

  // 1. Skill level match (weighted)
  const skillMatch = club.skillLevels.includes(answers.skillLevel);
  if (skillMatch) {
    scoreBreakdown.skill = weights.skill;
    reasons.push({ key: "skillMatch", params: { skillLevel: answers.skillLevel } });
  } else {
    const minDist = Math.min(
      ...club.skillLevels.map((sl) => skillDistance(sl, answers.skillLevel))
    );
    if (minDist === 1) {
      scoreBreakdown.skill = weights.skill * (20 / 30);
      reasons.push({ key: "closeSkillMatch" });
    } else {
      scoreBreakdown.skill = 5 * (weights.skill / 30);
    }
  }
  score += scoreBreakdown.skill;

  // 2. Budget fit (weighted)
  const price = Number(club.price);
  if (price >= answers.budgetMin && price <= answers.budgetMax) {
    scoreBreakdown.budget = weights.budget;
    reasons.push({ key: "withinBudget" });
  } else if (price < answers.budgetMin) {
    scoreBreakdown.budget = weights.budget * 0.75;
    reasons.push({ key: "underBudget" });
  } else if (price <= answers.budgetMax * 1.2) {
    scoreBreakdown.budget = weights.budget * 0.5;
    reasons.push({ key: "slightlyOverBudget" });
  } else {
    scoreBreakdown.budget = weights.budget * 0.1;
  }
  score += scoreBreakdown.budget;

  // 3. Swing speed compatibility (weighted)
  const idealFlexes = SWING_SPEED_TO_FLEX[answers.swingSpeed] || ["regular"];
  const flexMatch = club.shaftFlex.some((f) => idealFlexes.includes(f));
  const speedMatch = club.swingSpeedRange.includes(answers.swingSpeed);

  if (speedMatch && flexMatch) {
    scoreBreakdown.swingSpeed = weights.swing;
    reasons.push({ key: "greatSwingSpeedMatch" });
  } else if (speedMatch || flexMatch) {
    scoreBreakdown.swingSpeed = weights.swing * 0.6;
    reasons.push({ key: "compatibleSwingSpeed" });
  } else {
    scoreBreakdown.swingSpeed = weights.swing * 0.15;
  }
  score += scoreBreakdown.swingSpeed;

  // 4. Improvement goals and problem mapping (weighted)
  const goals = [...(answers.improvementGoals || [])];

  if (answers.problem === "slice") goals.push("forgiveness", "accuracy");
  if (answers.problem === "hook") goals.push("control", "workability");
  if (answers.problem === "distance") goals.push("distance");
  if (answers.problem === "consistency") goals.push("forgiveness", "consistency");
  if (answers.problem === "launch") goals.push("distance");

  let goalScore = 0;
  let goalCount = 0;

  if (goals.includes("distance")) {
    goalScore += club.distanceRating;
    goalCount++;
    if (club.distanceRating >= 8) {
      reasons.push({ key: "excellentDistance", params: { rating: club.distanceRating } });
    }
  }
  if (goals.includes("accuracy")) {
    goalScore += club.accuracyRating;
    goalCount++;
    if (club.accuracyRating >= 8) {
      reasons.push({ key: "excellentAccuracy", params: { rating: club.accuracyRating } });
    }
  }
  if (goals.includes("consistency") || goals.includes("forgiveness")) {
    goalScore += club.forgivenessRating;
    goalCount++;
    if (club.forgivenessRating >= 8) {
      reasons.push({ key: "veryForgiving", params: { rating: club.forgivenessRating } });
    }
  }

  const balancedAverage =
    (club.distanceRating + club.accuracyRating + club.forgivenessRating) / 3;
  const avgGoalScore = goalCount > 0 ? goalScore / goalCount : balancedAverage;

  scoreBreakdown.goals = (avgGoalScore / 10) * weights.goals;
  score += scoreBreakdown.goals;

  const roundedScore = Math.round(score * 10) / 10;

  // Confidence model:
  // - modelFit: normalized recommendation score
  // - dataQuality: source confidence carried from imported/seeded data
  // - signalStrength: density/quality of matching reasons and no hard mismatch
  const modelFit = clamp(roundedScore / 100, 0, 1);
  const dataQuality = clamp(
    typeof club.dataConfidence === "number" ? Number(club.dataConfidence) : 0.65,
    0.1,
    1
  );
  const reasonDensity = clamp(reasons.length / 6, 0, 1);
  const signalStrength = clamp(
    reasonDensity * 0.65 + (avgGoalScore / 10) * 0.35,
    0,
    1
  );

  let confidenceScore =
    modelFit * 0.45 + dataQuality * 0.4 + signalStrength * 0.15;

  if (scoreBreakdown.focusPenalty < 0) {
    confidenceScore *= 0.5;
  }

  confidenceScore = clamp(confidenceScore, 0.05, 0.99);
  confidenceScore = Math.round(confidenceScore * 100) / 100;

  return {
    club,
    score: roundedScore,
    reasons,
    scoreBreakdown: {
      focusPenalty: Math.round(scoreBreakdown.focusPenalty * 10) / 10,
      skill: Math.round(scoreBreakdown.skill * 10) / 10,
      budget: Math.round(scoreBreakdown.budget * 10) / 10,
      swingSpeed: Math.round(scoreBreakdown.swingSpeed * 10) / 10,
      goals: Math.round(scoreBreakdown.goals * 10) / 10,
    },
    confidence: {
      score: confidenceScore,
      level: getConfidenceLevel(confidenceScore),
      components: {
        modelFit: Math.round(modelFit * 100) / 100,
        dataQuality: Math.round(dataQuality * 100) / 100,
        signalStrength: Math.round(signalStrength * 100) / 100,
      },
    },
  };
}

export function getRecommendations(
  clubs: IGolfClub[],
  answers: QuizAnswers
): RecommendationSet {
  const scored = clubs.map((club) => scoreClub(club, answers));

  // Filter out negative scores (mismatched categories)
  const validScored = scored.filter((s) => s.score > 0);
  validScored.sort((a, b) => b.score - a.score);

  const pickBest = (type: ClubType): ScoredClub | null => {
    const candidates = validScored.filter((s) => s.club.clubType === type);
    return candidates.length > 0 ? candidates[0] : null;
  };

  const driver = pickBest(ClubType.DRIVER);
  const fairwayWood = pickBest(ClubType.FAIRWAY_WOOD);
  const hybrid = pickBest(ClubType.HYBRID);
  const ironSet = pickBest(ClubType.IRON_SET);
  const wedge = pickBest(ClubType.WEDGE);
  const putter = pickBest(ClubType.PUTTER);

  const parts = [driver, fairwayWood, hybrid, ironSet, wedge, putter];
  const totalPrice = parts.reduce((sum, p) => sum + (p ? Number(p.club.price) : 0), 0);

  return { driver, fairwayWood, hybrid, ironSet, wedge, putter, totalPrice };
}

export function getTopClubsByType(
  clubs: IGolfClub[],
  answers: QuizAnswers,
  type: ClubType,
  limit: number = 5
): ScoredClub[] {
  const scored = clubs
    .filter((c) => c.clubType === type)
    .map((club) => scoreClub(club, answers))
    .filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
