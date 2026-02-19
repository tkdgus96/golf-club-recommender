import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Shaft } from "../entities/Shaft";

const router = Router();
const shaftRepo = () => AppDataSource.getRepository(Shaft);

// GET /api/shafts - List shafts with filters and pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      vendor,
      flex,
      category,
      application,
      minWeight,
      maxWeight,
      minTorque,
      maxTorque,
      type,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    const qb = shaftRepo()
      .createQueryBuilder("shaft")
      .orderBy("shaft.vendor", "ASC")
      .addOrderBy("shaft.title", "ASC");

    if (vendor) {
      qb.andWhere("shaft.vendor = :vendor", { vendor });
    }

    if (flex) {
      qb.andWhere("shaft.flex = :flex", { flex });
    }

    if (category) {
      qb.andWhere("shaft.category = :category", {
        category: parseInt(category as string),
      });
    }

    if (application) {
      qb.andWhere("shaft.applications LIKE :application", {
        application: `%${application}%`,
      });
    }

    if (type) {
      qb.andWhere("shaft.type = :type", { type });
    }

    if (minWeight) {
      qb.andWhere("shaft.weight >= :minWeight", {
        minWeight: parseFloat(minWeight as string),
      });
    }

    if (maxWeight) {
      qb.andWhere("shaft.weight <= :maxWeight", {
        maxWeight: parseFloat(maxWeight as string),
      });
    }

    if (minTorque) {
      qb.andWhere("CAST(shaft.torque AS DECIMAL) >= :minTorque", {
        minTorque: parseFloat(minTorque as string),
      });
    }

    if (maxTorque) {
      qb.andWhere("CAST(shaft.torque AS DECIMAL) <= :maxTorque", {
        maxTorque: parseFloat(maxTorque as string),
      });
    }

    if (search) {
      qb.andWhere(
        "(LOWER(shaft.title) LIKE :search OR LOWER(shaft.vendor) LIKE :search)",
        { search: `%${(search as string).toLowerCase()}%` }
      );
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string)));

    const [shafts, total] = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    res.json({
      shafts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching shafts:", error);
    res.status(500).json({ error: "Failed to fetch shafts" });
  }
});

// GET /api/shafts/vendors - Get distinct vendors
router.get("/vendors", async (_req: Request, res: Response) => {
  try {
    const vendors = await shaftRepo()
      .createQueryBuilder("shaft")
      .select("DISTINCT shaft.vendor", "vendor")
      .orderBy("shaft.vendor", "ASC")
      .getRawMany();

    res.json(vendors.map((v) => v.vendor));
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// GET /api/shafts/categories - Get category options
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await shaftRepo()
      .createQueryBuilder("shaft")
      .select("DISTINCT shaft.category", "category")
      .orderBy("shaft.category", "ASC")
      .getRawMany();

    res.json(categories.map((c) => c.category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/shafts/applications - Get available shaft applications
router.get("/applications", async (_req: Request, res: Response) => {
  try {
    const shafts = await shaftRepo()
      .createQueryBuilder("shaft")
      .select(["shaft.applications"])
      .getMany();

    const applications = Array.from(
      new Set(shafts.flatMap((shaft) => shaft.applications || []))
    ).sort();

    res.json(applications);
  } catch (error) {
    console.error("Error fetching shaft applications:", error);
    res.status(500).json({ error: "Failed to fetch shaft applications" });
  }
});

// GET /api/shafts/flex-options - Get distinct flex options
router.get("/flex-options", async (_req: Request, res: Response) => {
  try {
    const flexOptions = await shaftRepo()
      .createQueryBuilder("shaft")
      .select("DISTINCT shaft.flex", "flex")
      .orderBy("shaft.flex", "ASC")
      .getRawMany();

    res.json(flexOptions.map((f) => f.flex));
  } catch (error) {
    console.error("Error fetching flex options:", error);
    res.status(500).json({ error: "Failed to fetch flex options" });
  }
});

// GET /api/shafts/:id - Get single shaft
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const shaft = await shaftRepo().findOne({
      where: { id: req.params.id },
    });

    if (!shaft) {
      return res.status(404).json({ error: "Shaft not found" });
    }

    res.json(shaft);
  } catch (error) {
    console.error("Error fetching shaft:", error);
    res.status(500).json({ error: "Failed to fetch shaft" });
  }
});

export default router;
