import { Router, Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { GolfClub } from "../entities/GolfClub";

interface RetailOffer {
  retailer: string;
  price: number;
  inStock: boolean;
  availability: "in_stock" | "limited" | "out_of_stock";
  purchaseUrl: string;
  lastCheckedAt: string;
}

const router = Router();
const clubRepo = () => AppDataSource.getRepository(GolfClub);

const RETAILERS = [
  {
    name: "Golf Galaxy",
    baseUrl: "https://www.golfgalaxy.com/search?searchTerm=",
    markup: 1.0,
  },
  {
    name: "PGA Tour Superstore",
    baseUrl: "https://www.pgatoursuperstore.com/search/?q=",
    markup: 1.02,
  },
  {
    name: "2nd Swing",
    baseUrl: "https://www.2ndswing.com/search?q=",
    markup: 0.96,
  },
  {
    name: "Fairway Jockey",
    baseUrl: "https://fairwayjockey.com/search?q=",
    markup: 1.05,
  },
];

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getAvailability(score: number): {
  inStock: boolean;
  availability: "in_stock" | "limited" | "out_of_stock";
} {
  if (score % 10 <= 1) return { inStock: false, availability: "out_of_stock" };
  if (score % 10 <= 3) return { inStock: true, availability: "limited" };
  return { inStock: true, availability: "in_stock" };
}

function buildOffers(club: GolfClub): RetailOffer[] {
  const now = new Date().toISOString();
  const daySeed = new Date().toISOString().slice(0, 10);

  return RETAILERS.map((retailer, index) => {
    const seed = hashSeed(`${club.id}-${retailer.name}-${daySeed}`);
    const variance = ((seed % 9) - 4) / 100;
    const rawPrice = Number(club.price) * retailer.markup * (1 + variance);
    const { inStock, availability } = getAvailability(seed + index);

    return {
      retailer: retailer.name,
      price: Math.max(49, Math.round(rawPrice * 100) / 100),
      inStock,
      availability,
      purchaseUrl: `${retailer.baseUrl}${encodeURIComponent(`${club.brand} ${club.name}`)}`,
      lastCheckedAt: now,
    };
  }).sort((a, b) => a.price - b.price);
}

router.get("/clubs/:id/offers", async (req: Request, res: Response) => {
  try {
    const clubId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(clubId)) {
      return res.status(400).json({ error: "Invalid club id" });
    }

    const club = await clubRepo().findOne({ where: { id: clubId } });
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const offers = buildOffers(club);
    res.json({
      clubId: club.id,
      clubName: `${club.brand} ${club.name}`,
      offers,
      bestOffer: offers.find((offer) => offer.inStock) || offers[0],
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching club offers:", error);
    res.status(500).json({ error: "Failed to fetch club offers" });
  }
});

router.post("/bundle", async (req: Request, res: Response) => {
  try {
    const clubIds = Array.isArray(req.body?.clubIds)
      ? req.body.clubIds
          .map((id: unknown) => Number.parseInt(String(id), 10))
          .filter((id: number) => Number.isFinite(id))
      : [];

    if (clubIds.length === 0) {
      return res.status(400).json({ error: "clubIds array is required" });
    }

    const clubs = await clubRepo().findBy({ id: In(clubIds) });

    const items = clubs.map((club) => {
      const offers = buildOffers(club);
      return {
        clubId: club.id,
        clubName: `${club.brand} ${club.name}`,
        offers,
        bestOffer: offers.find((offer) => offer.inStock) || offers[0],
      };
    });

    const retailerTotals = RETAILERS.map((retailer) => {
      const total = items.reduce((sum, item) => {
        const offer = item.offers.find((candidate) => candidate.retailer === retailer.name);
        return sum + (offer ? offer.price : 0);
      }, 0);

      const allInStock = items.every((item) => {
        const offer = item.offers.find((candidate) => candidate.retailer === retailer.name);
        return Boolean(offer?.inStock);
      });

      return {
        retailer: retailer.name,
        total: Math.round(total * 100) / 100,
        allInStock,
      };
    }).sort((a, b) => a.total - b.total);

    res.json({
      itemCount: items.length,
      items,
      retailerTotals,
      bestBundle: retailerTotals[0],
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching bundle offers:", error);
    res.status(500).json({ error: "Failed to fetch bundle offers" });
  }
});

export default router;
