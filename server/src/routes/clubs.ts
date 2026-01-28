import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { GolfClub, ClubType } from "../entities/GolfClub";
import {
  getRecommendations,
  QuizAnswers,
} from "../services/recommendation.service";

const router = Router();
const clubRepo = () => AppDataSource.getRepository(GolfClub);

function localizeClub(club: GolfClub, lang?: string): GolfClub {
  if (lang && lang !== "en" && club.descriptions && club.descriptions[lang]) {
    return { ...club, description: club.descriptions[lang] };
  }
  return club;
}

// GET /api/clubs - List clubs with filters and pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      type,
      brand,
      skillLevel,
      minPrice,
      maxPrice,
      search,
      page = "1",
      limit = "20",
      lang,
    } = req.query;

    const qb = clubRepo()
      .createQueryBuilder("club")
      .orderBy("club.brand", "ASC")
      .addOrderBy("club.name", "ASC");

    if (type) {
      qb.andWhere("club.clubType = :type", { type });
    }

    if (brand) {
      qb.andWhere("club.brand = :brand", { brand });
    }

    if (skillLevel) {
      qb.andWhere("club.skillLevels LIKE :skillLevel", {
        skillLevel: `%${skillLevel}%`,
      });
    }

    if (minPrice) {
      qb.andWhere("club.price >= :minPrice", {
        minPrice: parseFloat(minPrice as string),
      });
    }

    if (maxPrice) {
      qb.andWhere("club.price <= :maxPrice", {
        maxPrice: parseFloat(maxPrice as string),
      });
    }

    if (search) {
      qb.andWhere(
        "(LOWER(club.name) LIKE :search OR LOWER(club.brand) LIKE :search)",
        { search: `%${(search as string).toLowerCase()}%` }
      );
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const [clubs, total] = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const localizedClubs = clubs.map((c) =>
      localizeClub(c, lang as string | undefined)
    );

    res.json({
      clubs: localizedClubs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching clubs:", error);
    res.status(500).json({ error: "Failed to fetch clubs" });
  }
});

// GET /api/clubs/types - Get available club types
router.get("/types", async (_req: Request, res: Response) => {
  res.json(Object.values(ClubType));
});

// GET /api/clubs/brands - Get available brands
router.get("/brands", async (_req: Request, res: Response) => {
  try {
    const brands = await clubRepo()
      .createQueryBuilder("club")
      .select("DISTINCT club.brand", "brand")
      .orderBy("club.brand", "ASC")
      .getRawMany();

    res.json(brands.map((b) => b.brand));
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
});

// GET /api/clubs/:id - Get single club
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { lang } = req.query;
    const club = await clubRepo().findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    res.json(localizeClub(club, lang as string | undefined));
  } catch (error) {
    console.error("Error fetching club:", error);
    res.status(500).json({ error: "Failed to fetch club" });
  }
});

export default router;
