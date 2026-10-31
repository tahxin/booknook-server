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
const BORROW_DAYS = parseInt(process.env.BORROW_DAYS || "14", 10);

export const ALLOWED_CATEGORIES = ["Fiction", "Science", "History", "Kids", "Others"];

const rawOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set(["http://localhost:3000", ...rawOrigins]));

// ==========================================
// 3. HttpError class and small helpers
// ==========================================
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function parseObjectId(id, entityName = "book") {
  if (!id || typeof id !== "string" || !ObjectId.isValid(id) || String(new ObjectId(id)) !== String(id)) {
    throw new HttpError(400, `Invalid ${entityName} id`);
  }
  return new ObjectId(id);
}

export function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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
// 9. notFound and errorHandler
// ==========================================
app.use((_req, _res, next) => {
  next(new HttpError(404, "Route not found"));
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Not allowed by CORS" });
  }
  console.error("Unhandled Server Error:", err.message);
  return res.status(500).json({ message: "Something went wrong" });
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
