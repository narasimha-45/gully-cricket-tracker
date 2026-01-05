import express from "express";
import cors from "cors";
import seasonRoutes from "./routes/season.routes.js";
import matchRoutes from "./routes/match.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/seasons", seasonRoutes);
app.use("/api/matches", matchRoutes);

export default app;
