import axios from "axios";
import i18n from "../i18n";
import type {
  ClubsResponse,
  GolfClub,
  QuizAnswers,
  RecommendationSet,
  ClubFilters,
  ShaftsResponse,
  Shaft,
  ShaftFilters,
  ClubOffersResponse,
  BundleOffersResponse,
} from "../types";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

function getLang(): string {
  return i18n.language?.substring(0, 2) || "en";
}

export async function getClubs(filters: ClubFilters = {}): Promise<ClubsResponse> {
  const params: Record<string, string | number> = {};
  params.lang = getLang();
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
  const { data } = await api.get<GolfClub>(`/clubs/${id}`, {
    params: { lang: getLang() },
  });
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

export async function getShafts(filters: ShaftFilters = {}): Promise<ShaftsResponse> {
  const params: Record<string, string | number> = {};
  if (filters.vendor) params.vendor = filters.vendor;
  if (filters.flex) params.flex = filters.flex;
  if (filters.category !== undefined) params.category = filters.category;
  if (filters.application) params.application = filters.application;
  if (filters.type) params.type = filters.type;
  if (filters.minWeight) params.minWeight = filters.minWeight;
  if (filters.maxWeight) params.maxWeight = filters.maxWeight;
  if (filters.minTorque) params.minTorque = filters.minTorque;
  if (filters.maxTorque) params.maxTorque = filters.maxTorque;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const { data } = await api.get<ShaftsResponse>("/shafts", { params });
  return data;
}

export async function getShaft(id: string): Promise<Shaft> {
  const { data } = await api.get<Shaft>(`/shafts/${id}`);
  return data;
}

export async function getShaftVendors(): Promise<string[]> {
  const { data } = await api.get<string[]>("/shafts/vendors");
  return data;
}

export async function getShaftCategories(): Promise<number[]> {
  const { data } = await api.get<number[]>("/shafts/categories");
  return data;
}

export async function getShaftApplications(): Promise<string[]> {
  const { data } = await api.get<string[]>("/shafts/applications");
  return data;
}

export async function getShaftFlexOptions(): Promise<string[]> {
  const { data } = await api.get<string[]>("/shafts/flex-options");
  return data;
}

export async function getClubOffers(id: number): Promise<ClubOffersResponse> {
  const { data } = await api.get<ClubOffersResponse>(`/commerce/clubs/${id}/offers`);
  return data;
}

export async function getBundleOffers(clubIds: number[]): Promise<BundleOffersResponse> {
  const { data } = await api.post<BundleOffersResponse>("/commerce/bundle", { clubIds });
  return data;
}
