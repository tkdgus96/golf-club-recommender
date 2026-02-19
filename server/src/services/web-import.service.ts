import http from "http";
import https from "https";
import { AppDataSource } from "../config/database";
import { ClubType, GolfClub } from "../entities/GolfClub";
import { ShaftFlex, SkillLevel, SwingSpeed } from "../enums/club-enums";

export interface WebImportInput {
  url: string;
  sourceName?: string;
  clubTypeHint?: ClubType;
}

export interface WebImportSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ url: string; message: string }>;
}

interface ParsedWebClub {
  name: string;
  brand: string;
  description: string;
  price: number | null;
  imageUrl: string | null;
  sourceUpdatedAt: Date | null;
}

const KNOWN_BRANDS = [
  "TaylorMade",
  "Callaway",
  "Titleist",
  "Ping",
  "Cobra",
  "Mizuno",
  "Srixon",
  "Cleveland",
  "PXG",
  "Wilson",
  "Tour Edge",
  "XXIO",
  "Odyssey",
  "Scotty Cameron",
];

function fetchUrl(url: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith("https://") ? https : http;
    const request = transport.get(
      url,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; GolfClubRecommenderBot/1.0; +https://localhost)",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          const redirectedUrl = new URL(response.headers.location, url).toString();
          response.resume();
          fetchUrl(redirectedUrl).then(resolve).catch(reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf-8"));
        });
      }
    );

    const timer = setTimeout(() => {
      request.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    request.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    request.on("close", () => {
      clearTimeout(timer);
    });
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : "";
}

function getMetaContent(html: string, key: string): string {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const parsed = tryParseJson(match[1].trim());
    if (!parsed) continue;

    const queue = asArray<unknown>(parsed);
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item || typeof item !== "object") continue;

      const typed = item as Record<string, unknown>;
      const typeField = typed["@type"];
      const types = asArray<string>(typeField as string | string[] | undefined).map(
        (t) => t.toLowerCase()
      );
      if (types.includes("product")) {
        return typed;
      }

      if (Array.isArray(typed["@graph"])) {
        queue.push(...(typed["@graph"] as unknown[]));
      }
      if (Array.isArray(typed["itemListElement"])) {
        queue.push(...(typed["itemListElement"] as unknown[]));
      }
      if (typed["mainEntity"]) {
        queue.push(typed["mainEntity"]);
      }
    }
  }

  return null;
}

function extractPrice(offers: unknown): number | null {
  const offerList = asArray<Record<string, unknown>>(offers as Record<string, unknown>);
  for (const offer of offerList) {
    const raw = offer?.price;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeName(title: string): string {
  return title
    .replace(/\s*\|\s*.*$/, "")
    .replace(/\s*-\s*.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/^[a-z]*\d+[a-z\d]*$/i.test(part) || part.length <= 3) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function nameFromUrl(pageUrl: string): string {
  const pathname = new URL(pageUrl).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const raw = parts[parts.length - 1] || parts[parts.length - 2] || "";
  const cleaned = raw
    .replace(/\.(html|htm)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\bN\d+\b/g, "")
    .replace(/\bM[A-Z0-9]+\b/g, "")
    .trim();
  return toTitleCase(cleaned);
}

function isGenericName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  if (normalized.length < 5) return true;
  return (
    normalized === "golf drivers" ||
    normalized === "drivers" ||
    normalized === "golf clubs" ||
    normalized === "gt metals"
  );
}

function inferBrandFromText(text: string, pageUrl: string): string {
  const lowered = text.toLowerCase();
  const brandMatch = KNOWN_BRANDS.find((brand) =>
    lowered.includes(brand.toLowerCase())
  );
  if (brandMatch) return brandMatch;

  const host = new URL(pageUrl).hostname.toLowerCase();
  if (host.includes("taylormade")) return "TaylorMade";
  if (host.includes("callaway")) return "Callaway";
  if (host.includes("titleist")) return "Titleist";
  if (host.includes("ping")) return "Ping";
  if (host.includes("cobra")) return "Cobra";
  if (host.includes("mizuno")) return "Mizuno";
  if (host.includes("srixon")) return "Srixon";
  if (host.includes("cleveland")) return "Cleveland";
  if (host.includes("pxg")) return "PXG";

  return "Unknown";
}

function inferClubType(
  text: string,
  hint: ClubType | undefined
): ClubType | null {
  if (hint) return hint;

  const lowered = text.toLowerCase();
  if (/\bdriver\b/.test(lowered)) return ClubType.DRIVER;
  if (/\bfairway\b/.test(lowered)) return ClubType.FAIRWAY_WOOD;
  if (/\bhybrid\b|\brescue\b/.test(lowered)) return ClubType.HYBRID;
  if (/\biron\b|\birons\b|\biron set\b/.test(lowered)) return ClubType.IRON_SET;
  if (/\bwedge\b/.test(lowered)) return ClubType.WEDGE;
  if (/\bputter\b/.test(lowered)) return ClubType.PUTTER;
  return null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseClubFromHtml(html: string, pageUrl: string): ParsedWebClub | null {
  const product = extractJsonLdProduct(html);
  const title = getTitleFromHtml(html);
  const ogTitle = getMetaContent(html, "og:title");
  const metaTitle = getMetaContent(html, "twitter:title");
  const fallbackTitle = ogTitle || metaTitle || title;

  const name =
    (typeof product?.name === "string" && product.name.trim()) ||
    fallbackTitle;
  const brand =
    (typeof product?.brand === "string" && product.brand.trim()) ||
    (typeof (product?.brand as Record<string, unknown>)?.name === "string" &&
      String((product?.brand as Record<string, unknown>).name).trim()) ||
    getMetaContent(html, "product:brand") ||
    inferBrandFromText(`${fallbackTitle} ${getMetaContent(html, "description")}`, pageUrl);

  if (!name || !brand || brand === "Unknown") return null;
  const normalizedName = normalizeName(name);
  const improvedName = isGenericName(normalizedName)
    ? nameFromUrl(pageUrl) || normalizedName
    : normalizedName;

  const description =
    (typeof product?.description === "string" && product.description.trim()) ||
    getMetaContent(html, "description") ||
    getMetaContent(html, "og:description") ||
    `${normalizeName(name)} by ${brand}`;

  const imageRaw =
    (typeof product?.image === "string" && product.image.trim()) ||
    (Array.isArray(product?.image) && typeof product?.image[0] === "string"
      ? (product?.image[0] as string)
      : "") ||
    getMetaContent(html, "og:image");

  let imageUrl: string | null = null;
  if (imageRaw) {
    imageUrl = new URL(imageRaw, pageUrl).toString();
  }

  const price = extractPrice(product?.offers);
  const sourceUpdatedAt =
    parseDate(product?.releaseDate) ||
    parseDate(product?.dateModified) ||
    parseDate(getMetaContent(html, "article:modified_time"));

  return {
    name: improvedName,
    brand: normalizeName(brand),
    description: stripHtml(description).slice(0, 1200),
    price,
    imageUrl,
    sourceUpdatedAt,
  };
}

function mapDefaultsByType(type: ClubType) {
  switch (type) {
    case ClubType.DRIVER:
      return {
        skillLevels: [
          SkillLevel.BEGINNER,
          SkillLevel.INTERMEDIATE,
          SkillLevel.ADVANCED,
        ],
        shaftFlex: [
          ShaftFlex.SENIOR,
          ShaftFlex.REGULAR,
          ShaftFlex.STIFF,
          ShaftFlex.EXTRA_STIFF,
        ],
      };
    case ClubType.PUTTER:
      return {
        skillLevels: Object.values(SkillLevel),
        shaftFlex: [ShaftFlex.REGULAR],
      };
    default:
      return {
        skillLevels: [SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED],
        shaftFlex: [ShaftFlex.REGULAR, ShaftFlex.STIFF],
      };
  }
}

async function findExistingClubByNameAndBrand(
  brand: string,
  name: string
): Promise<GolfClub | null> {
  return AppDataSource.getRepository(GolfClub)
    .createQueryBuilder("club")
    .where("LOWER(club.brand) = LOWER(:brand)", { brand })
    .andWhere("LOWER(club.name) = LOWER(:name)", { name })
    .getOne();
}

async function findExistingClubBySourceUrl(
  sourceUrl: string
): Promise<GolfClub | null> {
  return AppDataSource.getRepository(GolfClub)
    .createQueryBuilder("club")
    .where('club."sourceUrl" = :sourceUrl', { sourceUrl })
    .getOne();
}

export async function importClubsFromWeb(
  inputs: WebImportInput[]
): Promise<WebImportSummary> {
  const clubRepo = AppDataSource.getRepository(GolfClub);
  const summary: WebImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const input of inputs) {
    try {
      console.log(`[web-import] fetching ${input.url}`);
      const html = await fetchUrl(input.url, 15000);
      const parsed = parseClubFromHtml(html, input.url);

      if (!parsed) {
        summary.skipped++;
        summary.errors.push({
          url: input.url,
          message: "No product-like structured data found",
        });
        continue;
      }

      const inferredType = inferClubType(
        `${parsed.name} ${parsed.description}`,
        input.clubTypeHint
      );
      if (!inferredType) {
        summary.skipped++;
        summary.errors.push({
          url: input.url,
          message: "Could not infer club type (driver/iron/wedge/etc.)",
        });
        continue;
      }

      const defaults = mapDefaultsByType(inferredType);
      const existingBySource = await findExistingClubBySourceUrl(input.url);
      const existing =
        existingBySource ||
        (await findExistingClubByNameAndBrand(parsed.brand, parsed.name));
      const baseData = {
        name: parsed.name,
        brand: parsed.brand,
        clubType: inferredType,
        price: parsed.price ?? 499,
        skillLevels: defaults.skillLevels,
        shaftFlex: defaults.shaftFlex,
        loft: "Standard",
        description: parsed.description,
        descriptions: { en: parsed.description },
        imageUrl: parsed.imageUrl ?? "",
        swingSpeedRange: [SwingSpeed.SLOW, SwingSpeed.MODERATE, SwingSpeed.FAST],
        forgivenessRating: 7,
        distanceRating: 7,
        accuracyRating: 7,
        sourceName: input.sourceName ?? new URL(input.url).hostname,
        sourceUrl: input.url,
        sourceUpdatedAt: parsed.sourceUpdatedAt,
        dataConfidence: parsed.price ? 0.85 : 0.7,
      };

      if (existing) {
        await clubRepo.save(clubRepo.merge(existing, baseData));
        console.log(`[web-import] updated ${parsed.brand} ${parsed.name}`);
        summary.updated++;
      } else {
        await clubRepo.save(clubRepo.create(baseData));
        console.log(`[web-import] created ${parsed.brand} ${parsed.name}`);
        summary.created++;
      }
    } catch (error) {
      console.log(`[web-import] failed ${input.url}`);
      summary.failed++;
      summary.errors.push({
        url: input.url,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summary;
}
