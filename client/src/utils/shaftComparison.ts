import type {
  Shaft,
  BallFlightInput,
  ComparisonResult,
  ShaftModelCalibration,
} from "../types";
import { calculateBallFlight, metersToYards } from "./ballFlight";

export type { ComparisonResult };

export type ShaftApplication =
  | "driver"
  | "fairway_wood"
  | "hybrid"
  | "iron"
  | "wedge"
  | "putter";

export interface ComparisonOptions {
  application?: ShaftApplication;
  calibration?: Partial<ShaftModelCalibration>;
}

interface ApplicationCoefficients {
  speed: number;
  launch: number;
  spin: number;
  face: number;
  path: number;
  dispersion: number;
  startLineFaceWeight: number;
  idealCarry: number;
  baselineStrokes: number;
}

const FLEX_SCALE: Record<string, number> = {
  L: 1,
  A: 1.5,
  R2: 2,
  R: 2.5,
  R1: 2.5,
  SR: 3,
  S: 3.5,
  X: 4,
  TX: 4.5,
};

const LAUNCH_SCALE: Record<string, number> = {
  Low: 1,
  "Low-Mid": 1.5,
  "Mid-Low": 1.5,
  Mid: 2,
  "Mid-High": 2.5,
  High: 3,
};

const SPIN_SCALE: Record<string, number> = {
  Low: 1,
  "Low-Mid": 1.5,
  "Mid-Low": 1.5,
  Mid: 2,
  "Mid-High": 2.5,
  High: 3,
};

const APPLICATION_COEFFICIENTS: Record<ShaftApplication, ApplicationCoefficients> = {
  driver: {
    speed: 1,
    launch: 1,
    spin: 1,
    face: 1,
    path: 1,
    dispersion: 1,
    startLineFaceWeight: 0.78,
    idealCarry: 255,
    baselineStrokes: 4.05,
  },
  fairway_wood: {
    speed: 0.82,
    launch: 0.8,
    spin: 0.85,
    face: 0.82,
    path: 0.88,
    dispersion: 0.88,
    startLineFaceWeight: 0.74,
    idealCarry: 225,
    baselineStrokes: 3.95,
  },
  hybrid: {
    speed: 0.75,
    launch: 0.72,
    spin: 0.74,
    face: 0.72,
    path: 0.8,
    dispersion: 0.82,
    startLineFaceWeight: 0.7,
    idealCarry: 205,
    baselineStrokes: 3.85,
  },
  iron: {
    speed: 0.62,
    launch: 0.58,
    spin: 0.68,
    face: 0.64,
    path: 0.7,
    dispersion: 0.74,
    startLineFaceWeight: 0.65,
    idealCarry: 175,
    baselineStrokes: 3.65,
  },
  wedge: {
    speed: 0.45,
    launch: 0.42,
    spin: 0.48,
    face: 0.5,
    path: 0.58,
    dispersion: 0.7,
    startLineFaceWeight: 0.6,
    idealCarry: 115,
    baselineStrokes: 2.95,
  },
  putter: {
    speed: 0.12,
    launch: 0.12,
    spin: 0.1,
    face: 0.95,
    path: 0.95,
    dispersion: 1.2,
    startLineFaceWeight: 0.9,
    idealCarry: 20,
    baselineStrokes: 2.1,
  },
};

const DEFAULT_CALIBRATION: ShaftModelCalibration = {
  ballSpeedBias: 0,
  launchAngleBias: 0,
  spinRateBias: 0,
  faceAngleBias: 0,
  pathAngleBias: 0,
  dispersionBias: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, digits: number = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getFlexValue(flex: string): number {
  return FLEX_SCALE[flex] ?? 2.5;
}

function getLaunchValue(launch: string): number {
  return LAUNCH_SCALE[launch] ?? 2;
}

function getSpinValue(spin: string): number {
  return SPIN_SCALE[spin] ?? 2;
}

function parseTorque(torque: string): number {
  return Number.parseFloat(torque) || 4.0;
}

function parseTip(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDataConfidence(shaft: Shaft): number {
  return clamp(
    typeof shaft.dataConfidence === "number" ? Number(shaft.dataConfidence) : 0.75,
    0.2,
    1
  );
}

function normalizeCalibration(
  calibration?: Partial<ShaftModelCalibration>
): ShaftModelCalibration {
  return {
    ballSpeedBias: calibration?.ballSpeedBias ?? DEFAULT_CALIBRATION.ballSpeedBias,
    launchAngleBias:
      calibration?.launchAngleBias ?? DEFAULT_CALIBRATION.launchAngleBias,
    spinRateBias: calibration?.spinRateBias ?? DEFAULT_CALIBRATION.spinRateBias,
    faceAngleBias: calibration?.faceAngleBias ?? DEFAULT_CALIBRATION.faceAngleBias,
    pathAngleBias: calibration?.pathAngleBias ?? DEFAULT_CALIBRATION.pathAngleBias,
    dispersionBias:
      calibration?.dispersionBias ?? DEFAULT_CALIBRATION.dispersionBias,
  };
}

function getStartLineAngle(
  faceAngle: number,
  pathAngle: number,
  faceWeight: number
): number {
  return faceAngle * faceWeight + pathAngle * (1 - faceWeight);
}

function getDispersionBand(
  shaft: Shaft,
  ballSpeed: number,
  profile: ApplicationCoefficients,
  calibration: ShaftModelCalibration
): number {
  const torque = parseTorque(shaft.torque);
  const weight = Number(shaft.weight) || 65;
  const flex = getFlexValue(shaft.flex);

  const speedLoad = Math.max(0, (ballSpeed - 140) * 0.04);
  const torqueEffect = (torque - 3.8) * 1.8;
  const weightEffect = (65 - weight) * 0.09;
  const flexEffect = Math.abs(3.2 - flex) * 0.7;

  return clamp(
    (8 + speedLoad + torqueEffect + weightEffect + flexEffect + calibration.dispersionBias) *
      profile.dispersion,
    3,
    26
  );
}

function getModelConfidence(
  currentShaft: Shaft,
  targetShaft: Shaft,
  weightDiff: number,
  flexDiff: number,
  torqueDiff: number,
  launchProfileDiff: number,
  spinProfileDiff: number,
  calibration: ShaftModelCalibration
): number {
  const extrapolation = clamp(
    (Math.abs(weightDiff) / 35 +
      Math.abs(flexDiff) / 3 +
      Math.abs(torqueDiff) / 3 +
      Math.abs(launchProfileDiff) / 3 +
      Math.abs(spinProfileDiff) / 3) /
      5,
    0,
    1
  );

  const calibrationMagnitude = clamp(
    (Math.abs(calibration.ballSpeedBias) / 6 +
      Math.abs(calibration.launchAngleBias) / 4 +
      Math.abs(calibration.spinRateBias) / 600 +
      Math.abs(calibration.faceAngleBias) / 3 +
      Math.abs(calibration.pathAngleBias) / 3 +
      Math.abs(calibration.dispersionBias) / 6) /
      6,
    0,
    1
  );

  const dataConfidence =
    (getDataConfidence(currentShaft) + getDataConfidence(targetShaft)) / 2;
  return clamp(
    dataConfidence * 0.5 + (1 - extrapolation) * 0.35 + (1 - calibrationMagnitude) * 0.15,
    0.3,
    0.95
  );
}

function estimateExpectedStrokes(
  carry: number,
  offline: number,
  dispersionBand: number,
  faceToPath: number,
  profile: ApplicationCoefficients
): number {
  const distancePenalty = Math.abs(profile.idealCarry - carry) / Math.max(40, profile.idealCarry * 0.18);
  const offlinePenalty = Math.abs(offline) / 18;
  const dispersionPenalty = dispersionBand / 14;
  const strikePenalty = Math.abs(faceToPath) / 4;

  return roundTo(
    profile.baselineStrokes +
      distancePenalty * 0.22 +
      offlinePenalty * 0.28 +
      dispersionPenalty * 0.24 +
      strikePenalty * 0.14,
    2
  );
}

export interface ShotData {
  ballSpeed: number;
  launchAngle: number;
  spinRate: number;
  carry: number;
}

export interface ClubData {
  clubSpeed: number;
  clubFaceAngle: number;
  clubPathAngle: number;
  attackAngle: number;
  backspin: number;
}

export function compareShafts(
  shotData: ShotData,
  currentShaft: Shaft,
  targetShaft: Shaft,
  isMetric: boolean = false,
  baseDelivery: Pick<ClubData, "clubFaceAngle" | "clubPathAngle"> = {
    clubFaceAngle: 0,
    clubPathAngle: 0,
  },
  options: ComparisonOptions = {}
): ComparisonResult {
  const application = options.application ?? "driver";
  const profile = APPLICATION_COEFFICIENTS[application];
  const calibration = normalizeCalibration(options.calibration);

  const carryYards = isMetric ? metersToYards(shotData.carry) : shotData.carry;

  const weightDiff = Number(targetShaft.weight) - Number(currentShaft.weight);
  const flexDiff = getFlexValue(targetShaft.flex) - getFlexValue(currentShaft.flex);
  const torqueDiff = parseTorque(targetShaft.torque) - parseTorque(currentShaft.torque);
  const launchProfileDiff =
    getLaunchValue(targetShaft.launch) - getLaunchValue(currentShaft.launch);
  const spinProfileDiff = getSpinValue(targetShaft.spin) - getSpinValue(currentShaft.spin);

  const tipDiff = parseTip(targetShaft.tip, 0.335) - parseTip(currentShaft.tip, 0.335);
  const buttDiff = parseTip(targetShaft.butt, 0.6) - parseTip(currentShaft.butt, 0.6);

  const ballSpeedFromWeight = weightDiff * -0.075 * profile.speed;
  const ballSpeedFromFlex = flexDiff * -0.15 * profile.speed;

  const launchFromFlex = flexDiff * -0.65 * profile.launch;
  const launchFromProfile = launchProfileDiff * 1.2 * profile.launch;
  const launchFromTip = tipDiff * -28 * profile.launch;

  const spinFromFlex = flexDiff * -90 * profile.spin;
  const spinFromTorque = torqueDiff * 130 * profile.spin;
  const spinFromProfile = spinProfileDiff * 180 * profile.spin;

  const clubFaceAngleChange = roundTo(
    (weightDiff * -0.022 +
      flexDiff * 0.28 +
      torqueDiff * -0.32 +
      buttDiff * -4 +
      launchProfileDiff * 0.08) *
      profile.face +
      calibration.faceAngleBias,
    1
  );

  const clubPathAngleChange = roundTo(
    (weightDiff * -0.014 +
      flexDiff * 0.15 +
      torqueDiff * -0.11 +
      launchProfileDiff * 0.05) *
      profile.path +
      calibration.pathAngleBias,
    1
  );

  const predictedClubFaceAngle = roundTo(
    clamp(baseDelivery.clubFaceAngle + clubFaceAngleChange, -10, 10),
    1
  );
  const predictedClubPathAngle = roundTo(
    clamp(baseDelivery.clubPathAngle + clubPathAngleChange, -10, 10),
    1
  );

  const ballSpeedChange = roundTo(
    ballSpeedFromWeight + ballSpeedFromFlex + calibration.ballSpeedBias,
    1
  );
  const launchAngleChange = roundTo(
    launchFromFlex + launchFromProfile + launchFromTip + calibration.launchAngleBias,
    1
  );
  const spinRateChange = Math.round(
    spinFromFlex + spinFromTorque + spinFromProfile + calibration.spinRateBias
  );

  const predictedBallSpeed = roundTo(clamp(shotData.ballSpeed + ballSpeedChange, 80, 200), 1);
  const predictedLaunchAngle = roundTo(
    clamp(shotData.launchAngle + launchAngleChange, 0, 30),
    1
  );
  const predictedSpinRate = Math.round(clamp(shotData.spinRate + spinRateChange, 1000, 6500));

  const currentFlightInput: BallFlightInput = {
    ballSpeed: shotData.ballSpeed,
    clubSpeed: shotData.ballSpeed * 0.67,
    launchAngle: shotData.launchAngle,
    clubFaceAngle: baseDelivery.clubFaceAngle,
    clubPathAngle: baseDelivery.clubPathAngle,
    backspin: shotData.spinRate,
  };

  const targetFlightInput: BallFlightInput = {
    ballSpeed: predictedBallSpeed,
    clubSpeed: predictedBallSpeed * 0.67,
    launchAngle: predictedLaunchAngle,
    clubFaceAngle: predictedClubFaceAngle,
    clubPathAngle: predictedClubPathAngle,
    backspin: predictedSpinRate,
  };

  const currentFlight = calculateBallFlight(currentFlightInput, false);
  const targetFlight = calculateBallFlight(targetFlightInput, false);

  const carryChange = Math.round(targetFlight.carry - currentFlight.carry);
  const predictedCarry = Math.round(carryYards + carryChange);

  const currentOffline = roundTo(currentFlight.offline, 1);
  const predictedOffline = roundTo(targetFlight.offline, 1);
  const offlineChange = roundTo(predictedOffline - currentOffline, 1);
  const offlineAbsChange = roundTo(
    Math.abs(predictedOffline) - Math.abs(currentOffline),
    1
  );

  const currentStartLineAngle = getStartLineAngle(
    baseDelivery.clubFaceAngle,
    baseDelivery.clubPathAngle,
    profile.startLineFaceWeight
  );
  const predictedStartLineAngle = getStartLineAngle(
    predictedClubFaceAngle,
    predictedClubPathAngle,
    profile.startLineFaceWeight
  );

  const currentStartLineFlight = calculateBallFlight(
    {
      ...currentFlightInput,
      clubFaceAngle: currentStartLineAngle,
      clubPathAngle: currentStartLineAngle,
    },
    false
  );

  const predictedStartLineFlight = calculateBallFlight(
    {
      ...targetFlightInput,
      clubFaceAngle: predictedStartLineAngle,
      clubPathAngle: predictedStartLineAngle,
    },
    false
  );

  const currentStartLineOffline = currentStartLineFlight.offline;
  const predictedStartLineOffline = predictedStartLineFlight.offline;

  const currentCurvatureOffline = currentOffline - currentStartLineOffline;
  const predictedCurvatureOffline = predictedOffline - predictedStartLineOffline;

  const startLineOfflineDelta = roundTo(
    predictedStartLineOffline - currentStartLineOffline,
    1
  );
  const curvatureOfflineDelta = roundTo(
    predictedCurvatureOffline - currentCurvatureOffline,
    1
  );

  const currentFaceToPath = roundTo(
    baseDelivery.clubFaceAngle - baseDelivery.clubPathAngle,
    1
  );
  const predictedFaceToPath = roundTo(predictedClubFaceAngle - predictedClubPathAngle, 1);
  const faceToPathChange = roundTo(predictedFaceToPath - currentFaceToPath, 1);

  const dispersionBandCurrent = roundTo(
    getDispersionBand(currentShaft, shotData.ballSpeed, profile, calibration),
    1
  );
  const dispersionBandPredicted = roundTo(
    getDispersionBand(targetShaft, predictedBallSpeed, profile, calibration),
    1
  );
  const dispersionBandChange = roundTo(
    dispersionBandPredicted - dispersionBandCurrent,
    1
  );

  const modelConfidence = roundTo(
    getModelConfidence(
      currentShaft,
      targetShaft,
      weightDiff,
      flexDiff,
      torqueDiff,
      launchProfileDiff,
      spinProfileDiff,
      calibration
    ),
    2
  );

  const carryHalfRange = Math.max(
    2,
    Math.abs(carryChange) * 0.18 +
      (1 - modelConfidence) * 14 +
      Math.abs(weightDiff) * 0.08 +
      Math.abs(torqueDiff) * 0.7
  );

  const predictedCarryLow = Math.round(predictedCarry - carryHalfRange);
  const predictedCarryHigh = Math.round(predictedCarry + carryHalfRange);
  const predictedOfflineLeft = roundTo(predictedOffline - dispersionBandPredicted, 1);
  const predictedOfflineRight = roundTo(predictedOffline + dispersionBandPredicted, 1);

  const carryP10 = predictedCarryLow;
  const carryP50 = predictedCarry;
  const carryP90 = predictedCarryHigh;
  const offlineP10 = predictedOfflineLeft;
  const offlineP50 = predictedOffline;
  const offlineP90 = predictedOfflineRight;

  const expectedStrokesCurrent = estimateExpectedStrokes(
    roundTo(currentFlight.carry, 1),
    currentOffline,
    dispersionBandCurrent,
    currentFaceToPath,
    profile
  );
  const expectedStrokesPredicted = estimateExpectedStrokes(
    roundTo(targetFlight.carry, 1),
    predictedOffline,
    dispersionBandPredicted,
    predictedFaceToPath,
    profile
  );
  const expectedStrokesDelta = roundTo(
    expectedStrokesCurrent - expectedStrokesPredicted,
    2
  );

  let distanceRating = 0;
  let accuracyRating = 0;

  if (ballSpeedChange > 1) distanceRating += 1;
  if (ballSpeedChange > 2) distanceRating += 1;
  if (ballSpeedChange < -1) distanceRating -= 1;
  if (ballSpeedChange < -2) distanceRating -= 1;

  if (carryChange > 3) distanceRating += 1;
  if (carryChange > 8) distanceRating += 1;
  if (carryChange < -3) distanceRating -= 1;
  if (carryChange < -8) distanceRating -= 1;

  const currentSpinFromOptimal = Math.abs(shotData.spinRate - 2250);
  const targetSpinFromOptimal = Math.abs(predictedSpinRate - 2250);
  if (targetSpinFromOptimal < currentSpinFromOptimal - 180) distanceRating += 1;
  if (targetSpinFromOptimal > currentSpinFromOptimal + 180) distanceRating -= 1;

  if (Math.abs(predictedFaceToPath) < Math.abs(currentFaceToPath) - 0.4) accuracyRating += 1;
  if (Math.abs(predictedFaceToPath) > Math.abs(currentFaceToPath) + 0.4) accuracyRating -= 1;

  if (offlineAbsChange <= -2) accuracyRating += 1;
  if (offlineAbsChange <= -5) accuracyRating += 1;
  if (offlineAbsChange >= 2) accuracyRating -= 1;
  if (offlineAbsChange >= 5) accuracyRating -= 1;

  if (dispersionBandChange <= -1.2) accuracyRating += 1;
  if (dispersionBandChange >= 1.2) accuracyRating -= 1;

  distanceRating = clamp(distanceRating, -3, 3);
  accuracyRating = clamp(accuracyRating, -3, 3);

  let recommendation: "better" | "neutral" | "worse";
  let recommendationReason: string;

  const confidencePenalty = modelConfidence < 0.55 ? -1 : 0;
  const strokesImpact =
    expectedStrokesDelta > 0.1 ? 1 : expectedStrokesDelta < -0.1 ? -1 : 0;

  const totalScore =
    distanceRating +
    accuracyRating +
    (carryChange > 5 ? 1 : carryChange < -5 ? -1 : 0) +
    confidencePenalty +
    strokesImpact;

  if (totalScore >= 2) {
    recommendation = "better";
    if (expectedStrokesDelta > 0.1) {
      recommendationReason = "betterExpectedStrokes";
    } else if (distanceRating > accuracyRating) {
      recommendationReason = "moreDistance";
    } else if (accuracyRating > distanceRating) {
      recommendationReason = "moreAccuracy";
    } else {
      recommendationReason = "betterOverall";
    }
  } else if (totalScore <= -2) {
    recommendation = "worse";
    if (expectedStrokesDelta < -0.1) {
      recommendationReason = "worseExpectedStrokes";
    } else if (distanceRating < accuracyRating) {
      recommendationReason = "lessDistance";
    } else if (accuracyRating < distanceRating) {
      recommendationReason = "lessAccuracy";
    } else {
      recommendationReason = "worseOverall";
    }
  } else {
    recommendation = "neutral";
    recommendationReason = "neutral";
  }

  return {
    ballSpeedChange,
    launchAngleChange,
    spinRateChange: Math.round(spinRateChange),
    carryChange: Math.round(carryChange),
    predictedBallSpeed,
    predictedLaunchAngle,
    predictedSpinRate,
    predictedCarry,
    clubFaceAngleChange,
    clubPathAngleChange,
    predictedClubFaceAngle,
    predictedClubPathAngle,
    currentFaceToPath,
    predictedFaceToPath,
    faceToPathChange,
    currentOffline,
    predictedOffline,
    offlineChange,
    offlineAbsChange,
    startLineOfflineDelta,
    curvatureOfflineDelta,
    dispersionBandCurrent,
    dispersionBandPredicted,
    dispersionBandChange,
    predictedCarryLow,
    predictedCarryHigh,
    carryP10,
    carryP50,
    carryP90,
    predictedOfflineLeft,
    predictedOfflineRight,
    offlineP10,
    offlineP50,
    offlineP90,
    expectedStrokesCurrent,
    expectedStrokesPredicted,
    expectedStrokesDelta,
    modelConfidence,
    recommendation,
    recommendationReason,
    distanceRating,
    accuracyRating,
  };
}

export function compareShaftsFromClubData(
  clubData: ClubData,
  currentShaft: Shaft,
  targetShaft: Shaft,
  _isMetric: boolean = false,
  options: ComparisonOptions = {}
): ComparisonResult {
  const estimatedBallSpeed = clubData.clubSpeed * 1.5;
  const baseLaunch = 12 + clubData.attackAngle * 0.8;

  const shotData: ShotData = {
    ballSpeed: estimatedBallSpeed,
    launchAngle: clamp(baseLaunch, 6, 20),
    spinRate: clubData.backspin,
    carry: 0,
  };

  const flightInput: BallFlightInput = {
    ballSpeed: estimatedBallSpeed,
    clubSpeed: clubData.clubSpeed,
    launchAngle: shotData.launchAngle,
    clubFaceAngle: clubData.clubFaceAngle,
    clubPathAngle: clubData.clubPathAngle,
    backspin: clubData.backspin,
  };

  const currentFlight = calculateBallFlight(flightInput, false);
  shotData.carry = currentFlight.carry;

  return compareShafts(shotData, currentShaft, targetShaft, false, {
    clubFaceAngle: clubData.clubFaceAngle,
    clubPathAngle: clubData.clubPathAngle,
  }, options);
}

export function getDefaultShotData(): ShotData {
  return {
    ballSpeed: 150,
    launchAngle: 12,
    spinRate: 2500,
    carry: 245,
  };
}

export function getDefaultClubData(): ClubData {
  return {
    clubSpeed: 100,
    clubFaceAngle: 0,
    clubPathAngle: 0,
    attackAngle: 2,
    backspin: 2500,
  };
}

export function getShotDataRanges() {
  return {
    ballSpeed: { min: 100, max: 190, step: 1 },
    launchAngle: { min: 6, max: 20, step: 0.5 },
    spinRate: { min: 1500, max: 4000, step: 50 },
    carry: { min: 150, max: 320, step: 1 },
  };
}

export function getClubDataRanges() {
  return {
    clubSpeed: { min: 70, max: 130, step: 1 },
    clubFaceAngle: { min: -8, max: 8, step: 0.5 },
    clubPathAngle: { min: -8, max: 8, step: 0.5 },
    attackAngle: { min: -5, max: 8, step: 0.5 },
    backspin: { min: 1500, max: 4000, step: 50 },
  };
}
