
export const ClubType = {
  DRIVER: "driver",
  FAIRWAY_WOOD: "fairway_wood",
  HYBRID: "hybrid",
  IRON_SET: "iron_set",
  WEDGE: "wedge",
  PUTTER: "putter",
} as const;

export type ClubType = (typeof ClubType)[keyof typeof ClubType];

export const CLUB_TYPE_LABELS: Record<ClubType, string> = {
  [ClubType.DRIVER]: "Driver",
  [ClubType.FAIRWAY_WOOD]: "Fairway Wood",
  [ClubType.HYBRID]: "Hybrid",
  [ClubType.IRON_SET]: "Iron Set",
  [ClubType.WEDGE]: "Wedge",
  [ClubType.PUTTER]: "Putter",
};

export interface GolfClub {
  id: number;
  name: string;
  brand: string;
  clubType: ClubType;
  price: number;
  skillLevels: string[];
  shaftFlex: string[];
  loft: string;
  description: string;
  descriptions: Record<string, string> | null;
  imageUrl: string;
  swingSpeedRange: string[];
  forgivenessRating: number;
  distanceRating: number;
  accuracyRating: number;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceUpdatedAt?: string | null;
  dataConfidence?: number | null;
}

export interface ClubsResponse {
  clubs: GolfClub[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuizAnswers {
  focusArea?: string; // Optional for backward compatibility, but used in new flow
  problem?: string;
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

export interface ScoredClub {
  club: GolfClub;
  score: number;
  reasons: ReasonItem[];
  scoreBreakdown: {
    focusPenalty: number;
    skill: number;
    budget: number;
    swingSpeed: number;
    goals: number;
  };
  confidence: {
    score: number;
    level: "low" | "medium" | "high";
    components: {
      modelFit: number;
      dataQuality: number;
      signalStrength: number;
    };
  };
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

export interface ClubFilters {
  type?: string;
  brand?: string;
  skillLevel?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Shaft {
  id: string;
  vendor: string;
  title: string;
  category: number;
  applications: string[];
  x: number;
  y: number;
  weight: number;
  flex: string;
  tip: string;
  butt: string;
  torque: string;
  launch: string;
  spin: string;
  type: string;
  imageUrl?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  dataConfidence?: number | null;
}

export interface ShaftsResponse {
  shafts: Shaft[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ShaftFilters {
  vendor?: string;
  flex?: string;
  category?: number;
  application?: string;
  type?: string;
  minWeight?: number;
  maxWeight?: number;
  minTorque?: number;
  maxTorque?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BallFlightInput {
  ballSpeed: number;
  clubSpeed: number;
  launchAngle: number;
  clubFaceAngle: number;
  clubPathAngle: number;
  backspin: number;
}

export interface BallFlightResult {
  carry: number;
  total: number;
  maxHeight: number;
  landingAngle: number;
  offline: number;
  flightTime: number;
  trajectory: { x: number; y: number; z: number }[];
}

export interface ShotData {
  ballSpeed: number;
  launchAngle: number;
  spinRate: number;
  carry: number;
}

export interface ComparisonResult {
  ballSpeedChange: number;
  launchAngleChange: number;
  spinRateChange: number;
  carryChange: number;
  predictedBallSpeed: number;
  predictedLaunchAngle: number;
  predictedSpinRate: number;
  predictedCarry: number;
  clubFaceAngleChange: number;
  clubPathAngleChange: number;
  predictedClubFaceAngle: number;
  predictedClubPathAngle: number;
  currentFaceToPath: number;
  predictedFaceToPath: number;
  faceToPathChange: number;
  currentOffline: number;
  predictedOffline: number;
  offlineChange: number;
  offlineAbsChange: number;
  startLineOfflineDelta: number;
  curvatureOfflineDelta: number;
  dispersionBandCurrent: number;
  dispersionBandPredicted: number;
  dispersionBandChange: number;
  predictedCarryLow: number;
  predictedCarryHigh: number;
  carryP10: number;
  carryP50: number;
  carryP90: number;
  predictedOfflineLeft: number;
  predictedOfflineRight: number;
  offlineP10: number;
  offlineP50: number;
  offlineP90: number;
  expectedStrokesCurrent: number;
  expectedStrokesPredicted: number;
  expectedStrokesDelta: number;
  modelConfidence: number;
  recommendation: "better" | "neutral" | "worse";
  recommendationReason: string;
  distanceRating: number;
  accuracyRating: number;
}

export interface ShaftModelCalibration {
  ballSpeedBias: number;
  launchAngleBias: number;
  spinRateBias: number;
  faceAngleBias: number;
  pathAngleBias: number;
  dispersionBias: number;
}

export interface SavedBag {
  id: string;
  label: string;
  createdAt: string;
  answers: QuizAnswers;
  results: RecommendationSet;
}

export interface CompareHistoryEntry {
  id: string;
  createdAt: string;
  application: string;
  currentShaftId: string;
  currentShaftName: string;
  targetShaftId: string;
  targetShaftName: string;
  recommendation: "better" | "neutral" | "worse";
  expectedStrokesDelta: number;
  modelConfidence: number;
  carryChange: number;
  offlineAbsChange: number;
}

export interface RetailOffer {
  retailer: string;
  price: number;
  inStock: boolean;
  availability: "in_stock" | "limited" | "out_of_stock";
  purchaseUrl: string;
  lastCheckedAt: string;
}

export interface ClubOffersResponse {
  clubId: number;
  clubName: string;
  offers: RetailOffer[];
  bestOffer: RetailOffer;
  checkedAt: string;
}

export interface BundleOffersResponse {
  itemCount: number;
  items: Array<{
    clubId: number;
    clubName: string;
    offers: RetailOffer[];
    bestOffer: RetailOffer;
  }>;
  retailerTotals: Array<{
    retailer: string;
    total: number;
    allInStock: boolean;
  }>;
  bestBundle: {
    retailer: string;
    total: number;
    allInStock: boolean;
  };
  checkedAt: string;
}
