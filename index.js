// ==========================================
// 1. Imports and dotenv/config
// ==========================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

// ==========================================
// 2. Config constants
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "booknook";

const rawOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set(["http://localhost:3000", ...rawOrigins]));

// ==========================================
// 4. Mongo connection (cached client)
// ==========================================
let clientPromise = null;

export async function getDb() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// ==========================================
// 6. App creation, CORS, JSON parser
// ==========================================
const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// Sanity route
app.get("/", (_req, res) => {
  res.json({ message: "BookNook API is running" });
});

// ==========================================
// 10. Export default app and local listen
// ==========================================
export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`BookNook API running on port ${PORT}`);
  });
}
