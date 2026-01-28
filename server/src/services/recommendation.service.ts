import { GolfClub, ClubType, SwingSpeed } from "../entities/GolfClub";

export interface QuizAnswers {
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

export interface ScoredClub {
  club: GolfClub;
  score: number;
  reasons: ReasonItem[];
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

function skillDistance(a: string, b: string): number {
  const idxA = SKILL_ORDER.indexOf(a);
  const idxB = SKILL_ORDER.indexOf(b);
  if (idxA === -1 || idxB === -1) return 3;
  return Math.abs(idxA - idxB);
}

function scoreClub(club: GolfClub, answers: QuizAnswers): ScoredClub {
  let score = 0;
  const reasons: ReasonItem[] = [];

  // 1. Skill level match (30%)
  const skillMatch = club.skillLevels.includes(answers.skillLevel);
  if (skillMatch) {
    score += 30;
    reasons.push({ key: "skillMatch", params: { skillLevel: answers.skillLevel } });
  } else {
    const minDist = Math.min(
      ...club.skillLevels.map((sl) => skillDistance(sl, answers.skillLevel))
    );
    if (minDist === 1) {
      score += 20;
      reasons.push({ key: "closeSkillMatch" });
    } else {
      score += 5;
    }
  }

  // 2. Budget fit (20%)
  const price = Number(club.price);
  if (price >= answers.budgetMin && price <= answers.budgetMax) {
    score += 20;
    reasons.push({ key: "withinBudget" });
  } else if (price < answers.budgetMin) {
    score += 15;
    reasons.push({ key: "underBudget" });
  } else if (price <= answers.budgetMax * 1.2) {
    score += 10;
    reasons.push({ key: "slightlyOverBudget" });
  } else {
    score += 2;
  }

  // 3. Swing speed compatibility (20%)
  const idealFlexes = SWING_SPEED_TO_FLEX[answers.swingSpeed] || ["regular"];
  const flexMatch = club.shaftFlex.some((f) => idealFlexes.includes(f));
  const speedMatch = club.swingSpeedRange.includes(answers.swingSpeed);

  if (speedMatch && flexMatch) {
    score += 20;
    reasons.push({ key: "greatSwingSpeedMatch" });
  } else if (speedMatch || flexMatch) {
    score += 12;
    reasons.push({ key: "compatibleSwingSpeed" });
  } else {
    score += 3;
  }

  // 4. Improvement goals (30%)
  const goals = answers.improvementGoals || [];
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

  if (goalCount > 0) {
    const avgGoalScore = goalScore / goalCount;
    score += (avgGoalScore / 10) * 30;
  } else {
    // No specific goals - balance all ratings
    const avg =
      (club.distanceRating + club.accuracyRating + club.forgivenessRating) / 3;
    score += (avg / 10) * 30;
  }

  return { club, score: Math.round(score * 10) / 10, reasons };
}

export function getRecommendations(
  clubs: GolfClub[],
  answers: QuizAnswers
): RecommendationSet {
  const scored = clubs.map((club) => scoreClub(club, answers));
  scored.sort((a, b) => b.score - a.score);

  const pickBest = (type: ClubType): ScoredClub | null => {
    const candidates = scored.filter((s) => s.club.clubType === type);
    return candidates.length > 0 ? candidates[0] : null;
  };

  const driver = pickBest(ClubType.DRIVER);
  const fairwayWood = pickBest(ClubType.FAIRWAY_WOOD);
  const hybrid = pickBest(ClubType.HYBRID);
  const ironSet = pickBest(ClubType.IRON_SET);
  const wedge = pickBest(ClubType.WEDGE);
  const putter = pickBest(ClubType.PUTTER);

  const parts = [driver, fairwayWood, hybrid, ironSet, wedge, putter];
  const totalPrice = parts.reduce(
    (sum, p) => sum + (p ? Number(p.club.price) : 0),
    0
  );

  return { driver, fairwayWood, hybrid, ironSet, wedge, putter, totalPrice };
}

export function getTopClubsByType(
  clubs: GolfClub[],
  answers: QuizAnswers,
  type: ClubType,
  limit: number = 5
): ScoredClub[] {
  const scored = clubs
    .filter((c) => c.clubType === type)
    .map((club) => scoreClub(club, answers));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
