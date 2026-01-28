import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
import clubsRouter from "./routes/clubs";
import recommendationsRouter from "./routes/recommendations";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/clubs", clubsRouter);
app.use("/api/recommendations", recommendationsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
