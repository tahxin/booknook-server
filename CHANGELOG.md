# Changelog

All notable changes to the BookNook API backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-01

### Added
- Express.js single-file architecture deployed for Node.js 20+ runtime.
- Native MongoDB Atlas integration using `@mongodb` driver with cached serverless connections.
- BetterAuth JWKS token verification with `jose` for route security.
- Comprehensive REST endpoints:
  - `GET /books` with sorting, limit, category filtering, owner filtering, and regex text search.
  - `GET /books/:id` for detailed book inspection.
  - `POST /books` with rigorous schema validation.
  - `PATCH /books/:id` with ownership guard and copy inventory checks.
  - `DELETE /books/:id` with ownership guard and active borrow collision protection.
  - `POST /borrows` with atomic `$inc` decrement and rollback on duplicate index race conditions.
  - `GET /borrows` for caller-specific borrow tracking.
  - `DELETE /borrows/:id` for book returns with inventory restoration.
- Custom security response headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- Cross-platform formatting consistency with `.editorconfig`.
- Interactive `requests.http` REST testing file.

