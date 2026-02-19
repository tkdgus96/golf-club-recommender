import "reflect-metadata";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { ClubType } from "../entities/GolfClub";
import { importClubsFromWeb, WebImportInput } from "../services/web-import.service";

interface RawImportTarget {
  url: string;
  sourceName?: string;
  clubTypeHint?: string;
}

function parseClubType(value: string | undefined): ClubType | undefined {
  if (!value) return undefined;
  if (Object.values(ClubType).includes(value as ClubType)) {
    return value as ClubType;
  }
  return undefined;
}

function loadImportTargets(filePath: string): WebImportInput[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as RawImportTarget[];
  if (!Array.isArray(parsed)) {
    throw new Error("Import target file must be an array");
  }

  return parsed
    .filter((entry) => entry && typeof entry.url === "string" && entry.url.trim())
    .map((entry) => ({
      url: entry.url.trim(),
      sourceName: entry.sourceName?.trim() || undefined,
      clubTypeHint: parseClubType(entry.clubTypeHint?.trim()),
    }));
}

async function run() {
  const explicitPath = process.argv[2];
  const defaultPath = path.join(__dirname, "../seed/web-import-targets.json");
  const targetPath = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : defaultPath;

  try {
    const inputs = loadImportTargets(targetPath);
    if (inputs.length === 0) {
      throw new Error(`No valid URLs found in ${targetPath}`);
    }

    await AppDataSource.initialize();
    const summary = await importClubsFromWeb(inputs);
    console.log(JSON.stringify(summary, null, 2));
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Web import failed:", error);
    process.exit(1);
  }
}

run();
