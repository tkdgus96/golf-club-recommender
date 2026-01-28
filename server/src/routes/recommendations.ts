import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { GolfClub } from "../entities/GolfClub";
import {
  getRecommendations,
  QuizAnswers,
} from "../services/recommendation.service";

const router = Router();

// POST /api/recommendations - Get club recommendations based on quiz answers
router.post("/", async (req: Request, res: Response) => {
  try {
    const answers: QuizAnswers = req.body;

    // Validate required fields
    if (!answers.skillLevel || !answers.swingSpeed) {
      return res.status(400).json({
        error: "skillLevel and swingSpeed are required",
      });
    }

    // Set defaults
    if (!answers.budgetMin) answers.budgetMin = 0;
    if (!answers.budgetMax) answers.budgetMax = 10000;
    if (!answers.improvementGoals) answers.improvementGoals = [];

    const clubRepo = AppDataSource.getRepository(GolfClub);
    const allClubs = await clubRepo.find();

    const recommendations = getRecommendations(allClubs, answers);

    res.json(recommendations);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

export default router;
