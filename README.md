# BookNook API — Backend Server

BookNook is a modern online library management platform: *add a book, borrow a book, return a book*. This repository contains the backend REST API built with Express.js and the native MongoDB driver, deployed on Vercel.

- **Client Repository**: [BookNook Client](https://github.com/satahsin/booknook-client) *(or your client repository)*
- **Live API URL**: [https://booknook-server.vercel.app](https://booknook-server.vercel.app) *(configured upon Vercel deployment)*

---

## Key Features

- **8 Strictly Specified REST Endpoints**: Implements the exact public and private API routes for books and borrow lifecycle management without unnecessary bloat.
- **Secure Token Verification with BetterAuth JWKS**: Protects write and user-specific endpoints via asymmetric JSON Web Token verification using `jose` against BetterAuth's Remote JWK Set.
- **Atomic Concurrency Handling**: Employs MongoDB's native `$inc` operators and atomic `findOneAndUpdate` queries to avoid race conditions when borrowing or returning book copies.
- **Strict Anti-Double-Borrow Protection**: Prevents duplicate concurrent borrows using compound unique indexing (`{ bookId: 1, userEmail: 1 }`) and automated rollback on race collisions.
- **Serverless-Optimized Database Pooling**: Reuses cached MongoDB connection instances across invocations to optimize cold start performance on Vercel.

---

## API Endpoints

All responses are formatted in clean JSON. Errors return `{ "message": "..." }` with corresponding HTTP status codes.

| Method | Endpoint | Access | Description | Request Body / Params |
|---|---|---|---|---|
| `GET` | `/` | Public | Sanity health check | — |
| `GET` | `/books` | Public | Retrieve books collection | Query: `sort=newest`, `limit=N`, `category`, `search`, `ownerEmail` |
| `GET` | `/books/:id` | Private (JWT) | Get single book details | URL parameter: `id` |
| `POST` | `/books` | Private (JWT) | Add a new book to the library | `{ title, author, category, image, description, totalCopies }` |
| `PATCH` | `/books/:id` | Private (JWT) | Update book (owner only) | Partial: `{ title, author, category, image, description, totalCopies }` |
| `DELETE` | `/books/:id` | Private (JWT) | Delete book (owner only, non-borrowed) | URL parameter: `id` |
| `POST` | `/borrows` | Private (JWT) | Borrow a book copy | `{ bookId }` |
| `GET` | `/borrows` | Private (JWT) | List caller's active borrow records | — |
| `DELETE` | `/borrows/:id` | Private (JWT) | Return a borrowed book | URL parameter: `id` |

---

## Tech Stack

- **Runtime**: Node.js 20+ (ES Modules)
- **Framework**: Express.js 5
- **Database**: MongoDB (Atlas) via native `mongodb` driver (v6+)
- **Security & JWT**: `jose` (Remote JWKS verification)
- **CORS & Environment**: `cors`, `dotenv`
- **Deployment**: Vercel Serverless Functions

---

## Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=booknook
CLIENT_ORIGIN=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BORROW_DAYS=14
```

In production on Vercel, set `CLIENT_ORIGIN` and `BETTER_AUTH_URL` to your live client URL (without trailing slashes).

---

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd booknook-server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

### 4. Run production server
```bash
npm start
```
