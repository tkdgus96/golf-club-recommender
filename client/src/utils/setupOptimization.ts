import type { GolfClub, QuizAnswers } from "../types";

export interface SetupOptimization {
  loftAdjustmentDeg: number;
  lieAdjustmentDeg: number;
  lengthAdjustmentIn: number;
  shaftTarget: {
    flex: string;
    weightRange: string;
    torqueRange: string;
    launchProfile: string;
  };
  ballTarget: {
    profile: string;
    compression: string;
    spinProfile: string;
  };
  rationale: string[];
}

function getShaftFlexTarget(answers: QuizAnswers, club: GolfClub): string {
  if (answers.swingSpeed === "very_fast") return "X / TX";
  if (answers.swingSpeed === "fast") return "S / X";
  if (answers.swingSpeed === "moderate") return "R / S";
  if (answers.swingSpeed === "slow") return "A / R";

  const preferred = club.shaftFlex[0];
  return preferred ? preferred.toUpperCase() : "R";
}

function getWeightRange(answers: QuizAnswers, clubType: string): string {
  const slow = answers.swingSpeed === "slow";
  const fast = answers.swingSpeed === "fast" || answers.swingSpeed === "very_fast";

  if (clubType === "driver") {
    if (slow) return "45-55g";
    if (fast) return "65-75g";
    return "55-65g";
  }

  if (clubType === "iron_set") {
    if (slow) return "70-90g";
    if (fast) return "110-130g";
    return "90-110g";
  }

  if (clubType === "wedge") return fast ? "115-130g" : "95-115g";
  return fast ? "75-95g" : "60-80g";
}

function getLaunchProfile(goal: QuizAnswers["fittingGoal"], problem?: string): string {
  if (problem === "launch") return "Mid";
  if (goal === "distance") return "Mid-High";
  if (goal === "dispersion" || goal === "fairway_hit") return "Low-Mid";
  return "Mid";
}

function getBallTarget(goal: QuizAnswers["fittingGoal"], swingSpeed: string) {
  if (goal === "distance") {
    return {
      profile: "Distance Tour",
      compression: swingSpeed === "slow" ? "Low-Mid" : "Mid-High",
      spinProfile: "Mid-Low",
    };
  }

  if (goal === "dispersion" || goal === "fairway_hit") {
    return {
      profile: "Control Tour",
      compression: swingSpeed === "very_fast" ? "High" : "Mid",
      spinProfile: "Mid",
    };
  }

  return {
    profile: "Balanced Tour",
    compression: "Mid",
    spinProfile: "Mid",
  };
}

export function optimizeClubSetup(
  club: GolfClub,
  answers: QuizAnswers
): SetupOptimization {
  let loftAdjustmentDeg = 0;
  let lieAdjustmentDeg = 0;
  let lengthAdjustmentIn = 0;
  const rationale: string[] = [];

  const goal = answers.fittingGoal || "scoring_gain";

  if (goal === "distance") {
    loftAdjustmentDeg += answers.swingSpeed === "slow" ? 1 : 0.5;
    lengthAdjustmentIn += answers.swingSpeed === "slow" ? 0.25 : 0.1;
    rationale.push("Added dynamic launch and small length increase to maximize carry window.");
  }

  if (goal === "dispersion" || goal === "fairway_hit") {
    lieAdjustmentDeg += answers.problem === "slice" ? -0.5 : 0;
    lieAdjustmentDeg += answers.problem === "hook" ? 0.5 : 0;
    lengthAdjustmentIn -= 0.15;
    rationale.push("Shortened playing length and adjusted lie to reduce left/right variance.");
  }

  if (answers.problem === "slice") {
    loftAdjustmentDeg += 0.5;
    lieAdjustmentDeg -= 0.5;
    rationale.push("Biasing launch and lie flatter to reduce open-face miss tendencies.");
  }

  if (answers.problem === "hook") {
    loftAdjustmentDeg -= 0.3;
    lieAdjustmentDeg += 0.4;
    rationale.push("Reducing closure tendency with slightly upright lie and lower delivered loft.");
  }

  const shaftLaunchProfile = getLaunchProfile(goal, answers.problem);
  const shaftTorqueRange =
    goal === "dispersion" || goal === "fairway_hit" ? "2.8-3.8°" : "3.2-4.5°";

  const ballTarget = getBallTarget(goal, answers.swingSpeed);

  return {
    loftAdjustmentDeg: Math.round(loftAdjustmentDeg * 10) / 10,
    lieAdjustmentDeg: Math.round(lieAdjustmentDeg * 10) / 10,
    lengthAdjustmentIn: Math.round(lengthAdjustmentIn * 100) / 100,
    shaftTarget: {
      flex: getShaftFlexTarget(answers, club),
      weightRange: getWeightRange(answers, club.clubType),
      torqueRange: shaftTorqueRange,
      launchProfile: shaftLaunchProfile,
    },
    ballTarget,
    rationale,
  };
}
