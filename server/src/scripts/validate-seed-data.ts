import fs from "fs";
import path from "path";

type Severity = "error" | "warning";

interface ValidationIssue {
  severity: Severity;
  dataset: string;
  message: string;
  id?: string;
}

interface ClubSeed {
  id?: number;
  name: string;
  brand: string;
  clubType: string;
  price: number;
  skillLevels: string[];
  shaftFlex: string[];
  description: string;
  imageUrl?: string | null;
  swingSpeedRange: string[];
  forgivenessRating: number;
  distanceRating: number;
  accuracyRating: number;
  sourceName?: string | null;
  sourceUrl?: string | null;
  dataConfidence?: number | null;
}

interface ShaftSeed {
  id: string;
  vendor: string;
  title: string;
  category?: number;
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

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidUrl(value: string): boolean {
  if (value.startsWith("/images/")) return true;
  if (value.startsWith("data:image/")) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function addIssue(
  issues: ValidationIssue[],
  severity: Severity,
  dataset: string,
  message: string,
  id?: string
) {
  issues.push({ severity, dataset, message, id });
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function validateClubSeeds(clubs: ClubSeed[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<number>();

  for (const club of clubs) {
    const id = isNumber(club.id) ? String(club.id) : `${club.brand || "unknown"}:${club.name || "unknown"}`;

    if (isNumber(club.id)) {
      if (seenIds.has(club.id)) {
        addIssue(issues, "error", "clubs", "Duplicate club id", id);
      }
      seenIds.add(club.id);
    }

    if (!club.name || !club.brand || !club.clubType) {
      addIssue(issues, "error", "clubs", "Missing required name/brand/clubType", id);
    }

    if (!isNumber(club.price) || club.price <= 0) {
      addIssue(issues, "error", "clubs", "Price must be a positive number", id);
    }

    if (!Array.isArray(club.skillLevels) || club.skillLevels.length === 0) {
      addIssue(issues, "warning", "clubs", "Missing skillLevels", id);
    }

    if (!Array.isArray(club.shaftFlex) || club.shaftFlex.length === 0) {
      addIssue(issues, "warning", "clubs", "Missing shaftFlex", id);
    }

    if (!Array.isArray(club.swingSpeedRange) || club.swingSpeedRange.length === 0) {
      addIssue(issues, "warning", "clubs", "Missing swingSpeedRange", id);
    }

    for (const [label, rating] of [
      ["forgivenessRating", club.forgivenessRating],
      ["distanceRating", club.distanceRating],
      ["accuracyRating", club.accuracyRating],
    ] as const) {
      if (!isNumber(rating) || rating < 1 || rating > 10) {
        addIssue(
          issues,
          "error",
          "clubs",
          `${label} must be between 1 and 10`,
          id
        );
      }
    }

    if (!club.imageUrl) {
      addIssue(issues, "warning", "clubs", "Missing imageUrl", id);
    } else if (!isValidUrl(club.imageUrl)) {
      addIssue(issues, "error", "clubs", "Invalid imageUrl", id);
    }

    if (club.sourceUrl && !isValidUrl(club.sourceUrl)) {
      addIssue(issues, "error", "clubs", "Invalid sourceUrl", id);
    }

    if (typeof club.dataConfidence === "number") {
      if (club.dataConfidence < 0 || club.dataConfidence > 1) {
        addIssue(issues, "error", "clubs", "dataConfidence must be between 0 and 1", id);
      } else if (club.dataConfidence < 0.6) {
        addIssue(issues, "warning", "clubs", "Low dataConfidence (<0.6)", id);
      }
    }
  }

  return issues;
}

function validateShaftSeeds(shafts: ShaftSeed[], datasetName: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const shaft of shafts) {
    const id = shaft.id;

    if (!id || typeof id !== "string") {
      addIssue(issues, "error", datasetName, "Missing shaft id");
      continue;
    }

    if (seenIds.has(id)) {
      addIssue(issues, "error", datasetName, "Duplicate shaft id inside dataset", id);
    }
    seenIds.add(id);

    if (!shaft.vendor || !shaft.title) {
      addIssue(issues, "error", datasetName, "Missing vendor or title", id);
    }

    if (!isNumber(shaft.weight) || shaft.weight < 30 || shaft.weight > 200) {
      addIssue(issues, "error", datasetName, "Weight outside realistic range (30-200g)", id);
    }

    const torque = Number.parseFloat(shaft.torque);
    if (!Number.isFinite(torque) || torque < 1 || torque > 10) {
      addIssue(issues, "warning", datasetName, "Torque outside expected range (1-10)", id);
    }

    if (!isNumber(shaft.x) || !isNumber(shaft.y)) {
      addIssue(issues, "warning", datasetName, "Missing x/y characteristics", id);
    }

    if (shaft.imageUrl && !isValidUrl(shaft.imageUrl)) {
      addIssue(issues, "error", datasetName, "Invalid imageUrl", id);
    }

    if (shaft.sourceUrl && !isValidUrl(shaft.sourceUrl)) {
      addIssue(issues, "error", datasetName, "Invalid sourceUrl", id);
    }

    if (typeof shaft.dataConfidence === "number") {
      if (shaft.dataConfidence < 0 || shaft.dataConfidence > 1) {
        addIssue(
          issues,
          "error",
          datasetName,
          "dataConfidence must be between 0 and 1",
          id
        );
      } else if (shaft.dataConfidence < 0.6) {
        addIssue(issues, "warning", datasetName, "Low dataConfidence (<0.6)", id);
      }
    }
  }

  return issues;
}

function validateGlobalShaftDuplicates(datasets: Array<{ name: string; rows: ShaftSeed[] }>) {
  const issues: ValidationIssue[] = [];
  const firstSeen = new Map<string, string>();

  for (const dataset of datasets) {
    for (const row of dataset.rows) {
      if (!row.id) continue;

      const seenFrom = firstSeen.get(row.id);
      if (seenFrom && seenFrom !== dataset.name) {
        addIssue(
          issues,
          "warning",
          "shafts",
          `Duplicate shaft id across datasets (${seenFrom} vs ${dataset.name})`,
          row.id
        );
      } else if (!seenFrom) {
        firstSeen.set(row.id, dataset.name);
      }
    }
  }

  return issues;
}

function main() {
  const strict = process.argv.includes("--strict");
  const repoRoot = path.join(__dirname, "../../..");

  const clubsPath = path.join(__dirname, "../seeds/clubs.seed.json");
  const shaftsBasePath = path.join(repoRoot, "shaft-data.json");
  const shaftsNewPath = path.join(__dirname, "../seed/new-shafts.json");
  const shaftsAggressivePath = path.join(__dirname, "../seed/aggressive-shafts.json");

  const clubs = readJsonFile<ClubSeed[]>(clubsPath);
  const baseShafts = readJsonFile<ShaftSeed[]>(shaftsBasePath);
  const newShafts = readJsonFile<ShaftSeed[]>(shaftsNewPath);
  const aggressiveShafts = readJsonFile<ShaftSeed[]>(shaftsAggressivePath);

  const issues: ValidationIssue[] = [
    ...validateClubSeeds(clubs),
    ...validateShaftSeeds(baseShafts, "shaft-data"),
    ...validateShaftSeeds(newShafts, "new-shafts"),
    ...validateShaftSeeds(aggressiveShafts, "aggressive-shafts"),
    ...validateGlobalShaftDuplicates([
      { name: "shaft-data", rows: baseShafts },
      { name: "new-shafts", rows: newShafts },
      { name: "aggressive-shafts", rows: aggressiveShafts },
    ]),
  ];

  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");

  const summary = {
    strict,
    totals: {
      clubs: clubs.length,
      shaftData: baseShafts.length,
      newShafts: newShafts.length,
      aggressiveShafts: aggressiveShafts.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    issues,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (strict && errors.length > 0) {
    process.exit(1);
  }
}

main();
