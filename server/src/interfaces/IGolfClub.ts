
import { ClubType } from "../enums/club-enums";

export interface IGolfClub {
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
  sourceUpdatedAt?: Date | null;
  dataConfidence?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
