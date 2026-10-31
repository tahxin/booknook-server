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

export function validateBookFields(data, isUpdate = false) {
  if (!isUpdate || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new HttpError(400, "Title is required and must be a non-empty string");
    }
    const t = data.title.trim();
    if (t.length < 1 || t.length > 120) {
      throw new HttpError(400, "Title must be between 1 and 120 characters");
    }
  }

  if (!isUpdate || data.author !== undefined) {
    if (typeof data.author !== "string" || !data.author.trim()) {
      throw new HttpError(400, "Author is required and must be a non-empty string");
    }
    const a = data.author.trim();
    if (a.length < 1 || a.length > 80) {
      throw new HttpError(400, "Author must be between 1 and 80 characters");
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(data.category)) {
      throw new HttpError(400, `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
    }
  }

  if (!isUpdate || data.image !== undefined) {
    if (typeof data.image !== "string" || !/^https?:\/\/.+/i.test(data.image.trim())) {
      throw new HttpError(400, "Image must be a valid http or https URL");
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (typeof data.description !== "string" || !data.description.trim()) {
      throw new HttpError(400, "Description is required and must be a non-empty string");
    }
    const d = data.description.trim();
    if (d.length < 1 || d.length > 1000) {
      throw new HttpError(400, "Description must be between 1 and 1000 characters");
    }
  }

  if (!isUpdate || data.totalCopies !== undefined) {
    const parsed = Number(data.totalCopies);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
      throw new HttpError(400, "Total copies must be an integer between 1 and 1000");
    }
  }
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
// 7. Books routes
// ==========================================

// 1. GET /books (public)
app.get(
  "/books",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const query = {};

    // Category filter
    if (req.query.category) {
      if (!ALLOWED_CATEGORIES.includes(req.query.category)) {
        throw new HttpError(400, "Invalid category");
      }
      query.category = req.query.category;
    }

    // Search filter (title or author, escaped regex)
    if (req.query.search) {
      const sanitized = escapeRegex(req.query.search.trim());
      if (sanitized) {
        query.$or = [
          { title: { $regex: sanitized, $options: "i" } },
          { author: { $regex: sanitized, $options: "i" } },
        ];
      }
    }

    // Owner email filter
    if (req.query.ownerEmail) {
      query.ownerEmail = req.query.ownerEmail.trim();
    }

    // Limit filter
    let limit = 0;
    if (req.query.limit !== undefined) {
      const parsedLimit = parseInt(req.query.limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new HttpError(400, "Limit must be an integer between 1 and 100");
      }
      limit = parsedLimit;
    }

    // Sort order: default is newest first
    const sort = { createdAt: -1 };

    let cursor = db.collection("books").find(query).sort(sort);
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const books = await cursor.toArray();
    res.json(books);
  })
);

// 2. GET /books/:id (JWT)
app.get(
  "/books/:id",
  verifyJwt,
  asyncHandler(async (req, res) => {
    const objectId = parseObjectId(req.params.id, "book");
    const db = await getDb();
    const book = await db.collection("books").findOne({ _id: objectId });
    if (!book) {
      throw new HttpError(404, "Book not found");
    }
    res.json(book);
  })
);

// 3. POST /books (JWT)
app.post(
  "/books",
  verifyJwt,
  asyncHandler(async (req, res) => {
    const { title, author, category, image, description, totalCopies } = req.body || {};
    validateBookFields({ title, author, category, image, description, totalCopies }, false);

    const parsedCopies = parseInt(totalCopies, 10);
    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category,
      image: image.trim(),
      description: description.trim(),
      totalCopies: parsedCopies,
      availableCopies: parsedCopies,
      ownerName: req.user.name || "",
      ownerEmail: req.user.email,
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("books").insertOne(newBook);
    const createdBook = await db.collection("books").findOne({ _id: result.insertedId });
    res.status(201).json(createdBook);
  })
);

// 4. PATCH /books/:id (JWT)
app.patch(
  "/books/:id",
  verifyJwt,
  asyncHandler(async (req, res) => {
    const objectId = parseObjectId(req.params.id, "book");
    const db = await getDb();

    const book = await db.collection("books").findOne({ _id: objectId });
    if (!book) {
      throw new HttpError(404, "Book not found");
    }

    if (book.ownerEmail !== req.user.email) {
      throw new HttpError(403, "You can only edit your own books");
    }

    const { title, author, category, image, description, totalCopies } = req.body || {};
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (category !== undefined) updateData.category = category;
    if (image !== undefined) updateData.image = image;
    if (description !== undefined) updateData.description = description;
    if (totalCopies !== undefined) updateData.totalCopies = totalCopies;

    if (Object.keys(updateData).length === 0) {
      return res.json(book);
    }

    validateBookFields(updateData, true);

    const setFields = {};
    if (updateData.title !== undefined) setFields.title = updateData.title.trim();
    if (updateData.author !== undefined) setFields.author = updateData.author.trim();
    if (updateData.category !== undefined) setFields.category = updateData.category;
    if (updateData.image !== undefined) setFields.image = updateData.image.trim();
    if (updateData.description !== undefined) setFields.description = updateData.description.trim();

    if (updateData.totalCopies !== undefined) {
      const newTotal = parseInt(updateData.totalCopies, 10);
      const borrowedCount = await db.collection("borrows").countDocuments({ bookId: String(objectId) });
      if (newTotal < borrowedCount) {
        throw new HttpError(400, "Total copies cannot be lower than copies currently borrowed");
      }
      setFields.totalCopies = newTotal;
      setFields.availableCopies = newTotal - borrowedCount;
    }

    const updated = await db.collection("books").findOneAndUpdate(
      { _id: objectId },
      { $set: setFields },
      { returnDocument: "after" }
    );

    res.json(updated);
  })
);

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
