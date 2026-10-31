// ==========================================
// 1. Imports and dotenv/config
// ==========================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ==========================================
// 2. Config constants
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "booknook";
const BETTER_AUTH_URL = (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

const rawOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set(["http://localhost:3000", ...rawOrigins]));

// ==========================================
// 3. HttpError class
// ==========================================
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

// ==========================================
// 4. Mongo connection (cached client) and ensureIndexes
// ==========================================
let clientPromise = null;
let indexesPromise = null;

export async function ensureIndexes(db) {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const books = db.collection("books");
      const borrows = db.collection("borrows");

      await Promise.all([
        books.createIndex({ createdAt: -1 }),
        books.createIndex({ ownerEmail: 1 }),
        books.createIndex({ category: 1 }),
        borrows.createIndex({ bookId: 1, userEmail: 1 }, { unique: true }),
        borrows.createIndex({ userEmail: 1, borrowDate: -1 }),
      ]);
    })();
  }
  return indexesPromise;
}

export async function getDb() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

// ==========================================
// 5. verifyJwt middleware
// ==========================================
const JWKS = createRemoteJWKSet(new URL(`${BETTER_AUTH_URL}/api/auth/jwks`));

export async function verifyJwt(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Missing access token");
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BETTER_AUTH_URL,
      audience: BETTER_AUTH_URL,
    });

    if (!payload.email) {
      throw new HttpError(401, "Token has no email");
    }

    req.user = {
      id: payload.sub ?? payload.id,
      email: payload.email,
      name: payload.name ?? "",
    };
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(401, "Invalid or expired token"));
  }
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
