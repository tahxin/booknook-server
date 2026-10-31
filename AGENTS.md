# AGENTS.md — BookNook API (backend)

> Save this file as `AGENTS.md` in the **backend repo root**. It is the single source of truth for any AI coding agent working on the BookNook server. Read all of it first. If something is marked `TODO(owner)`, ask the owner instead of guessing.

The client is a separate Next.js project (see the client's `AGENTS.md`). This repo is only the **Express + MongoDB API**, deployed on **Vercel**.

---

## 1. What this server does

BookNook is a small online library: *add a book, borrow a book, return a book*. The API stores books and borrows in MongoDB and protects write/user-specific routes with a **JWT issued by BetterAuth** (running in the Next.js client app). The API never handles passwords or logins; it only **verifies tokens**.

### Hard rules
- Expose **exactly these 8 API routes** (section 5). Do not add other API routes. (One optional non-API sanity route `GET /` is allowed, see section 5.)
- Identity (name, email) always comes from the **verified JWT**, never from the request body.
- Every error is JSON: `{ "message": "..." }` with the right status code. Never leak stack traces.
- Never log tokens, secrets, or the connection string.
- Atomic copy handling with `$inc` (no read-modify-write races).

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Database | MongoDB (Atlas) with the **native `mongodb` driver** (no Mongoose) |
| Auth | JWT verified with **`jose`** against BetterAuth's **JWKS** endpoint |
| Other | `cors`, `dotenv` |
| Language | JavaScript (ESM). `TODO(owner)`: confirm JS vs TypeScript. |
| Hosting | **Vercel** (own project, separate from the client) |

### Setup
```bash
mkdir booknook-server && cd booknook-server
npm init -y
npm pkg set type=module
npm i express cors dotenv mongodb jose
npm i -D nodemon
npm pkg set scripts.dev="nodemon index.js" scripts.start="node index.js"
```

### Environment variables (`.env`, never commit; commit `.env.example`)
```
PORT=5000
MONGODB_URI=
DB_NAME=booknook
CLIENT_ORIGIN=http://localhost:3000        # comma-separated for multiple, add the production URL
BETTER_AUTH_URL=http://localhost:3000      # the client app's base URL (issuer + JWKS host)
BORROW_DAYS=14
```
In production on Vercel, set `CLIENT_ORIGIN` and `BETTER_AUTH_URL` to the client's **production Vercel URL** (no trailing slash).

---

## 3. File structure (single file)

The owner wants **one file**. All server code lives in `index.js` at the repo root. Do not create `src/`, `routes/`, `middleware/` or `utils/` folders.

```
index.js
package.json
vercel.json
.env.example
.gitignore          # node_modules, .env, .vercel
README.md
```

Keep `index.js` readable by ordering it with banner comments (`// ===== Section =====`) in exactly this order:
1. Imports and `dotenv/config`
2. Config constants (env, categories, limits)
3. `HttpError` class and small helpers (`parseObjectId`, `escapeRegex`, validators, `asyncHandler`)
4. Mongo connection (cached client) and `ensureIndexes`
5. `verifyJwt` middleware
6. App creation, CORS, JSON parser
7. Books routes
8. Borrows routes
9. `notFound` and `errorHandler`
10. `export default app` and local `listen`

---

## 4. Authentication: JWT + JWKS (core of this server)

The client (BetterAuth with the **JWT plugin**) signs tokens. This API verifies them using BetterAuth's public keys.

- JWKS URL: `${BETTER_AUTH_URL}/api/auth/jwks`
- Client sends: `Authorization: Bearer <token>`
- Verify with `jose`:

```js
// inside index.js (HttpError is defined earlier in the same file)
import { createRemoteJWKSet, jwtVerify } from "jose";

const base = process.env.BETTER_AUTH_URL.replace(/\/$/, "");
// Module scope: jose caches fetched keys and refetches when an unknown key id appears.
const JWKS = createRemoteJWKSet(new URL(`${base}/api/auth/jwks`));

export async function verifyJwt(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new HttpError(401, "Missing access token");

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: base,
      audience: base,
    });

    if (!payload.email) throw new HttpError(401, "Token has no email");
    req.user = { id: payload.sub ?? payload.id, email: payload.email, name: payload.name ?? "" };
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(401, "Invalid or expired token"));
  }
}
```

Rules:
- Do **not** hard-code the signing algorithm; let the JWKS key decide (BetterAuth's default is EdDSA/Ed25519, but check the installed version).
- `issuer` and `audience` default to the BetterAuth base URL. If the owner customises them in the client, mirror that here (`TODO(owner)`: confirm).
- Default payload claims include the user's `id`/`sub`, `email` and `name`. Verify against the BetterAuth JWT plugin docs for the installed version before relying on a claim.
- Return `401` for missing/invalid/expired tokens. Return `403` for valid tokens that lack permission (not the owner, etc.).
- Attach `req.user = { id, email, name }`. Routes read identity only from here.
- Protected routes: all except `GET /books`.

---

## 5. The 8 routes

Base path is the server root (no `/api` prefix). JSON in, JSON out. Use `express.json({ limit: "100kb" })`.

| # | Method & path | Auth | Success | Notes |
|---|---|---|---|---|
| 1 | `GET /books` | public | `200` array of books | Query params below |
| 2 | `GET /books/:id` | JWT | `200` book | `400` bad id, `404` missing |
| 3 | `POST /books` | JWT | `201` created book | Owner from token |
| 4 | `PATCH /books/:id` | JWT | `200` updated book | Owner only |
| 5 | `DELETE /books/:id` | JWT | `200` `{ message }` | Owner only; blocked if borrowed |
| 6 | `POST /borrows` | JWT | `201` borrow | Atomic copies, no double borrow |
| 7 | `GET /borrows` | JWT | `200` array of borrows | Only the caller's |
| 8 | `DELETE /borrows/:id` | JWT | `200` `{ message }` | Return a book |

Optional sanity route (not an API route): `GET /` → `{ "message": "BookNook API is running" }` so the Vercel root URL isn't a bare 404. Remove it if the owner objects.

### Data shapes

**Book** (collection `books`)
```ts
{ _id: ObjectId, title: string, author: string,
  category: "Fiction"|"Science"|"History"|"Kids"|"Others",
  image: string, description: string,
  totalCopies: number, availableCopies: number,
  ownerName: string, ownerEmail: string, createdAt: Date }
```

**Borrow** (collection `borrows`; `bookId` stored as a **string**)
```ts
{ _id: ObjectId, bookId: string, bookTitle: string, bookImage: string,
  userEmail: string, userName: string, borrowDate: Date, returnDate: Date }
```

### 1. `GET /books` (public)
Query params (all optional, validate each):
- `sort=newest` → sort by `createdAt` descending. Default (no sort) is also newest first.
- `limit=N` → integer 1–100.
- `category` → must be one of the 5 categories, else `400`.
- `search` → case-insensitive match on `title` or `author`. **Escape regex special characters** before building `$regex`.
- `ownerEmail` → exact match (used by the client's My Books page).
The home page calls `GET /books?sort=newest&limit=6`.

### 2. `GET /books/:id`
`parseObjectId` first (`400 "Invalid book id"`), then `404 "Book not found"`.

### 3. `POST /books`
Body: `title, author, category, image, description, totalCopies`.
Validation (return `400` with a specific message):
- `title` 1–120 chars, `author` 1–80, `description` 1–1000 (trimmed strings)
- `category` in the enum
- `image` is an `http(s)` URL string
- `totalCopies` integer 1–1000
Server sets: `availableCopies = totalCopies`, `ownerName = req.user.name`, `ownerEmail = req.user.email`, `createdAt = new Date()`. Ignore any `_id`, `ownerEmail`, `availableCopies`, `createdAt` in the body.

### 4. `PATCH /books/:id`
- Allowed fields only: `title, author, category, image, description, totalCopies`. Ignore everything else.
- `403 "You can only edit your own books"` if `book.ownerEmail !== req.user.email`.
- If `totalCopies` changes: `borrowed = countDocuments(borrows, { bookId })`. New total must be `>= borrowed` (else `400 "Total copies cannot be lower than copies currently borrowed"`). Set `availableCopies = newTotal - borrowed`.
- Validate fields the same way as POST (only those present).

### 5. `DELETE /books/:id`
- Owner only (`403` otherwise).
- **Blocked while borrowed:** if any borrow exists for this book (`countDocuments(borrows, { bookId }) > 0`) → `409 "This book has active borrows and cannot be deleted"`.
- Otherwise delete and return `{ message: "Book deleted" }`.

### 6. `POST /borrows`
Body: `{ bookId }` only. Everything else comes from the DB and token.

Algorithm (in this order):
1. Parse `bookId` as ObjectId (`400`).
2. If a borrow with `{ bookId, userEmail }` already exists → `409 "You have already borrowed this book"`.
3. Atomically decrement:
   `findOneAndUpdate({ _id, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } }, { returnDocument: "after" })`.
   If `null`: look up the book. Missing → `404 "Book not found"`; exists → `400 "No copies available"`.
4. Insert the borrow: `{ bookId: String(_id), bookTitle, bookImage, userEmail, userName, borrowDate: now, returnDate: now + BORROW_DAYS }`.
5. If the insert throws duplicate-key error `11000` (race on the unique index) or any other error: **roll back** with `$inc: { availableCopies: +1 }`, then return `409` for duplicate key, otherwise rethrow.
6. Return `201` with the borrow.

No cap on how many different books a user may borrow at once.

### 7. `GET /borrows`
`find({ userEmail: req.user.email }).sort({ borrowDate: -1 })`. Never accept an email from the query.

### 8. `DELETE /borrows/:id`
1. `parseObjectId`; find the borrow → `404 "Borrow not found"`.
2. `403 "You can only return your own borrows"` if `borrow.userEmail !== req.user.email`.
3. `deleteOne` the borrow; only if `deletedCount === 1`, `$inc: { availableCopies: +1 }` on the book (`_id = ObjectId(borrow.bookId)`).
4. Return `{ message: "Book returned" }`.

---

## 6. Database

- In `index.js`, cache the `MongoClient` **promise** in a module-level variable so serverless invocations reuse the connection. Export `getDb()`.
- `ensureIndexes()` runs once per cold start (cache its promise), creating:
  - `books`: `{ createdAt: -1 }`, `{ ownerEmail: 1 }`, `{ category: 1 }`
  - `borrows`: **unique** `{ bookId: 1, userEmail: 1 }`, and `{ userEmail: 1, borrowDate: -1 }`
- Never expose the connection string; fail fast with a clear startup error if `MONGODB_URI` is missing.

---

## 7. App wiring (inside `index.js`)

Order matters:
1. `app.disable("x-powered-by")`
2. `cors({ origin: allowedOrigins, methods: ["GET","POST","PATCH","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] })` where `allowedOrigins` comes from `CLIENT_ORIGIN` split on commas (trimmed, no trailing slashes) plus `http://localhost:3000`. Handle preflight `OPTIONS` (the `cors` middleware does this).
3. `express.json({ limit: "100kb" })`
4. routes (`/books`, `/borrows`)
5. `notFound` → `404 { message: "Route not found" }`
6. `errorHandler` → maps `HttpError` to its status; anything else becomes `500 { message: "Something went wrong" }` (log the real error server-side without secrets). Invalid JSON body → `400`.

Wrap async handlers (or use Express 5, which forwards async errors) so no rejection goes unhandled.

End of `index.js` (the same file runs locally and on Vercel):
```js
export default app; // Vercel imports this

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 5000, () => console.log("BookNook API running"));
}
```

---

## 8. Deploying on Vercel

- Root `index.js` exports the Express `app` (`export default app`).
- `vercel.json`:
  ```json
  {
    "version": 2,
    "builds": [{ "src": "index.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/(.*)", "dest": "index.js" }]
  }
  ```
  Vercel also supports Express with zero config in recent versions. If the current Vercel Express guide says `vercel.json` is unnecessary for a root `index.js` that exports `app`, follow that guide, but keep the same export.
- Set env vars in the Vercel project: `MONGODB_URI`, `DB_NAME`, `CLIENT_ORIGIN`, `BETTER_AUTH_URL`, `BORROW_DAYS`.
- MongoDB Atlas: allow Vercel's outbound traffic (Network Access `0.0.0.0/0` for the assignment, or a restricted list if the owner prefers).
- After deploy, give the live URL to the client as `NEXT_PUBLIC_API_URL`, and add the client's production URL to `CLIENT_ORIGIN`.
- Only call `app.listen` when `process.env.VERCEL` is not set.

---

## 9. Testing checklist (run before telling the owner it is done)

Get a real token from the running client (browser console: `await authClient.token()` after logging in) and test with curl or Postman.

- [ ] `GET /books` works with no token; `?sort=newest&limit=6` returns 6 newest
- [ ] `GET /books?category=Nope` → 400; `?search=` with regex characters does not crash
- [ ] Any protected route without a token → 401; with a garbage token → 401
- [ ] `POST /books` ignores a spoofed `ownerEmail` in the body
- [ ] `PATCH`/`DELETE` another user's book → 403
- [ ] Lowering `totalCopies` below borrowed count → 400
- [ ] Borrow decrements copies by 1; borrowing again → 409
- [ ] Two parallel borrow requests for the last copy → exactly one succeeds
- [ ] Book with 0 copies → 400 "No copies available"
- [ ] Return restores copies (+1) and removes the borrow; returning someone else's borrow → 403
- [ ] Deleting a book that is borrowed → 409; after all returned → success
- [ ] Invalid ObjectId → 400 (not a 500)
- [ ] CORS: browser calls from the client origin succeed, including `PATCH`/`DELETE` preflight
- [ ] Reload/redeploy on Vercel: no cold-start crash, connection reused

---

## 10. Commits and README

- Required minimum is 8 notable commits; the owner wants **more than 10**. Aim for **16+ small commits** and never batch them. Because everything is in one file, grow `index.js` step by step:
  1. `chore: init express project, gitignore and env example`
  2. `feat: basic express app with health route and local listen`
  3. `feat: add cors and json parsing with allowed origins`
  4. `feat: add mongodb connection with cached client`
  5. `feat: add index creation for books and borrows`
  6. `feat: add jwt verification middleware using better-auth jwks`
  7. `feat: add http error class, not found and error handler`
  8. `feat: add get all books with sort, limit and category filter`
  9. `feat: add book search and owner filter`
  10. `feat: add get single book route`
  11. `feat: add create book route with validation`
  12. `feat: add update book route with ownership check`
  13. `feat: add delete book route with active borrow guard`
  14. `feat: add borrow route with atomic copy decrement`
  15. `fix: roll back copies on duplicate borrow`
  16. `feat: add my borrows route`
  17. `feat: add return book route`
  18. `chore: add vercel config for deployment`
  19. `docs: add readme with endpoints and setup`
- `README.md`: project name, live API URL, setup steps, env vars, and the endpoint table.

## 11. Do not
- Do not add API routes beyond the 8.
- Do not trust identity or ownership data from the request body or query.
- Do not use Mongoose (native driver only) unless the owner asks.
- Do not split the code into folders or extra files; everything stays in `index.js` (owner's choice).
- Do not store secrets in the repo.
- Do not skip the rollback in the borrow flow.

---

## 12. Manual data seeding (owner inserts data by hand)

The owner will insert data directly into MongoDB (Atlas / Compass). Agents must **not** write a seed script unless asked, and must ask the owner for any data they need rather than inventing it.

### What goes where
| Collection | Seed by hand? | Notes |
|---|---|---|
| `books` | **Yes** | Powers Home (New Arrivals), All Books, Top Categories, Book Details and My Books |
| `borrows` | **No** | Create through the UI so `availableCopies` and `borrows` stay consistent |
| `user`, `session`, `account`, `verification`, `jwks` | **No** | Created automatically by BetterAuth in the client's database. Register real accounts through the app |

### Book document (use MongoDB Extended JSON in Compass so dates are real dates)
```json
{
  "title": "Book title",
  "author": "Author name",
  "category": "Fiction",
  "image": "https://i.ibb.co/xxxx/cover.jpg",
  "description": "Two or three real sentences about the book.",
  "totalCopies": 5,
  "availableCopies": 5,
  "ownerName": "Registered user's name",
  "ownerEmail": "registered-user@email.com",
  "createdAt": { "$date": "2026-10-20T10:00:00Z" }
}
```
Rules for seeded books:
- `category` must be exactly one of `Fiction`, `Science`, `History`, `Kids`, `Others`.
- `createdAt` must be a **Date**, not a string, or sorting breaks. Give books **different** dates so "newest first" is visible; the 6 newest appear on the Home page.
- `availableCopies` must equal `totalCopies` (no borrows exist yet).
- `ownerEmail` must match a **registered user's email exactly** (case included) for that user to see the book in My Books and to edit/delete it. Use at least two different owners so ownership checks can be tested.
- `image` must be a working image URL (imgbb). No placeholders left in.
- Write real descriptions; no lorem text.
- Suggested volume: **12 to 15 books**, at least **2 per category**.

### Where the website needs data
- **Home, New Arrivals:** at least 6 books with distinct `createdAt` dates.
- **Home, Top Categories:** at least one book in each of the 5 categories.
- **All Books:** 12+ books so the grid, search and category chips look real.
- **Book Details:** full descriptions and a mix of copies (include one book with `totalCopies: 1` to demo "Not Available" after a borrow).
- **My Books:** books whose `ownerEmail` matches the test account.
- **My Borrows:** none seeded; borrow from the UI.
- Static content (hero slides, How Borrowing Works, footer text) lives in the client code, not the database.

## 13. Decisions and open items

### Decided by the owner
- Express + MongoDB, JWT verified via JWKS, hosted on Vercel.
- **Single `index.js`** file, no helmet, and 10+ commits (target 16+).
- No cap on simultaneous borrows (same book twice is blocked).
- Deleting a book is blocked while any copy is borrowed.
- `GET /books/:id` requires a valid JWT.

### Still open (ask the owner before assuming)
- `TODO(owner)`: JavaScript or TypeScript for the server (default here: JavaScript, ESM).
- `TODO(owner)`: Production client URL (needed for `BETTER_AUTH_URL`, `CLIENT_ORIGIN`, and JWT issuer/audience).
- `TODO(owner)`: Confirm the BetterAuth JWT plugin is using default issuer/audience and default claims (`sub`, `email`, `name`).
- `TODO(owner)`: Atlas database/cluster name (default `booknook`). Data is seeded by hand (section 12), so no seed script.
- `TODO(owner)`: Borrow period is 14 days by default (`BORROW_DAYS`); confirm.
