import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { AppDataSource } from "../config/database";
import { GolfClub } from "../entities/GolfClub";
import { Shaft } from "../entities/Shaft";
import {
  getPrimaryCategory,
  inferShaftApplications,
} from "../utils/shaft-classification";

interface RawShaftSeed {
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
}

interface ExpandedShaftImage {
  vendor: string;
  title: string;
  type: string;
  img: string;
}

function normalizeShaftTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected for seeding");

    const clubRepo = AppDataSource.getRepository(GolfClub);
    const shaftRepo = AppDataSource.getRepository(Shaft);

    // Clear existing data
    await clubRepo.clear();
    console.log("Cleared existing club data");

    // Drop and recreate shafts table to handle schema changes
    await AppDataSource.query("DROP TABLE IF EXISTS shafts CASCADE");
    await AppDataSource.synchronize();
    console.log("Recreated shafts table");

    // Seed golf clubs
    const clubSeedPath = path.join(__dirname, "clubs.seed.json");
    const clubRawData = fs.readFileSync(clubSeedPath, "utf-8");
    const clubSeedData = JSON.parse(clubRawData);

    for (const clubData of clubSeedData) {
      const club = clubRepo.create(clubData);
      await clubRepo.save(club);
    }
    console.log(`Seeded ${clubSeedData.length} golf clubs`);

    // Seed shafts from project root shaft-data.json
    const shaftSeedPath = path.join(__dirname, "../../../shaft-data.json");
    const shaftRawData = fs.readFileSync(shaftSeedPath, "utf-8");
    const baseShaftData = JSON.parse(shaftRawData) as RawShaftSeed[];

    const newShaftPath = path.join(__dirname, "../seed/new-shafts.json");
    const newShaftData = JSON.parse(fs.readFileSync(newShaftPath, "utf-8")) as RawShaftSeed[];
    const aggressiveShaftPath = path.join(
      __dirname,
      "../seed/aggressive-shafts.json"
    );
    const aggressiveShaftData = JSON.parse(
      fs.readFileSync(aggressiveShaftPath, "utf-8")
    ) as RawShaftSeed[];

    const expandedShaftPath = path.join(__dirname, "../seed/expanded-shafts.json");
    const expandedShaftData = JSON.parse(
      fs.readFileSync(expandedShaftPath, "utf-8")
    ) as ExpandedShaftImage[];
    const imageByTitle = new Map<string, string>();
    for (const entry of expandedShaftData) {
      imageByTitle.set(normalizeShaftTitle(entry.title), entry.img);
    }

    const merged = new Map<string, RawShaftSeed>();
    for (const shaft of [...baseShaftData, ...newShaftData, ...aggressiveShaftData]) {
      merged.set(shaft.id, shaft);
    }

    for (const shaftData of merged.values()) {
      const applications = inferShaftApplications({
        category: shaftData.category,
        title: shaftData.title,
        type: shaftData.type,
        tip: shaftData.tip,
      });

      const normalizedTitle = normalizeShaftTitle(shaftData.title);
      const imageUrl =
        shaftData.imageUrl || imageByTitle.get(normalizedTitle) || null;

      const shaft = shaftRepo.create({
        ...shaftData,
        category: shaftData.category ?? getPrimaryCategory(applications),
        applications,
        imageUrl,
        sourceName: "Seeded (shaft-data + new-shafts + aggressive-shafts)",
        sourceUrl: null,
        dataConfidence: 0.85,
      });
      await shaftRepo.save(shaft);
    }
    console.log(`Seeded ${merged.size} shafts`);

    await AppDataSource.destroy();
    console.log("Seeding complete");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
