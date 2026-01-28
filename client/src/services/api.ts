import axios from "axios";
import type {
  ClubsResponse,
  GolfClub,
  QuizAnswers,
  RecommendationSet,
  ClubFilters,
} from "../types";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

export async function getClubs(filters: ClubFilters = {}): Promise<ClubsResponse> {
  const params: Record<string, string | number> = {};
  if (filters.type) params.type = filters.type;
  if (filters.brand) params.brand = filters.brand;
  if (filters.skillLevel) params.skillLevel = filters.skillLevel;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const { data } = await api.get<ClubsResponse>("/clubs", { params });
  return data;
}

export async function getClub(id: number): Promise<GolfClub> {
  const { data } = await api.get<GolfClub>(`/clubs/${id}`);
  return data;
}

export async function getClubTypes(): Promise<string[]> {
  const { data } = await api.get<string[]>("/clubs/types");
  return data;
}

export async function getBrands(): Promise<string[]> {
  const { data } = await api.get<string[]>("/clubs/brands");
  return data;
}

export async function getRecommendations(
  answers: QuizAnswers
): Promise<RecommendationSet> {
  const { data } = await api.post<RecommendationSet>("/recommendations", answers);
  return data;
}
