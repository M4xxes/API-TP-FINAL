import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { router as productsRouter } from "./routes/products";
import { router as authRouter } from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import "./db"; // initialise Prisma client & SQLite adapter

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Servir l'interface de test front (dossier public)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.json({
    message: "Marketplace API is running",
    routes: {
      auth: ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/me"],
      products: ["/products"],
    },
  });
});

app.use("/auth", authRouter);
app.use("/products", authMiddleware, productsRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});


