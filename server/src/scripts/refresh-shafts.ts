import "reflect-metadata";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
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
  title: string;
  img: string;
}

function normalizeShaftTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function refreshShafts() {
  await AppDataSource.initialize();
  const shaftRepo = AppDataSource.getRepository(Shaft);

  const shaftSeedPath = path.join(__dirname, "../../../shaft-data.json");
  const baseShaftData = JSON.parse(
    fs.readFileSync(shaftSeedPath, "utf-8")
  ) as RawShaftSeed[];
  const newShaftPath = path.join(__dirname, "../seed/new-shafts.json");
  const newShaftData = JSON.parse(
    fs.readFileSync(newShaftPath, "utf-8")
  ) as RawShaftSeed[];
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

  let created = 0;
  let updated = 0;

  for (const shaftData of merged.values()) {
    const applications = inferShaftApplications({
      category: shaftData.category,
      title: shaftData.title,
      type: shaftData.type,
      tip: shaftData.tip,
    });
    const imageUrl =
      shaftData.imageUrl ||
      imageByTitle.get(normalizeShaftTitle(shaftData.title)) ||
      null;

    const payload = {
      ...shaftData,
      category: shaftData.category ?? getPrimaryCategory(applications),
      applications,
      imageUrl,
      sourceName: "Seeded (shaft-data + new-shafts + aggressive-shafts)",
      sourceUrl: null,
      dataConfidence: 0.85,
    };

    const existing = await shaftRepo.findOne({ where: { id: shaftData.id } });
    if (existing) {
      await shaftRepo.save(shaftRepo.merge(existing, payload));
      updated++;
    } else {
      await shaftRepo.save(shaftRepo.create(payload));
      created++;
    }
  }

  const total = await shaftRepo.count();
  await AppDataSource.destroy();
  console.log(JSON.stringify({ created, updated, total }, null, 2));
}

refreshShafts().catch((error) => {
  console.error("Failed to refresh shafts:", error);
  process.exit(1);
});
