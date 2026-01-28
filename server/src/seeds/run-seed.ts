import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { AppDataSource } from "../config/database";
import { GolfClub } from "../entities/GolfClub";

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected for seeding");

    const clubRepo = AppDataSource.getRepository(GolfClub);

    // Clear existing data
    await clubRepo.clear();
    console.log("Cleared existing club data");

    // Read seed data from JSON file
    const seedPath = path.join(__dirname, "clubs.seed.json");
    const rawData = fs.readFileSync(seedPath, "utf-8");
    const clubSeedData = JSON.parse(rawData);

    // Insert seed data
    for (const clubData of clubSeedData) {
      const club = clubRepo.create(clubData);
      await clubRepo.save(club);
    }

    console.log(`Seeded ${clubSeedData.length} golf clubs`);
    await AppDataSource.destroy();
    console.log("Seeding complete");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
