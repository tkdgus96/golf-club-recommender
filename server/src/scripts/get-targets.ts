
import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { GolfClub } from "../entities/GolfClub";

async function dumpTargets() {
  try {
    await AppDataSource.initialize();
    const clubs = await AppDataSource.getRepository(GolfClub).find();
    console.log(JSON.stringify(clubs.map(c => ({ brand: c.brand, name: c.name, type: c.clubType })), null, 2));
    process.exit(0);
  } catch (e) { console.error(e); }
}
dumpTargets();
