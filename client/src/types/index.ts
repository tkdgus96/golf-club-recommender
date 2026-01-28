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
