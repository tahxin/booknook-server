process.env.NODE_ENV = "test";

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const { default: app, HttpError, parseObjectId, validateBookFields, ALLOWED_CATEGORIES } = await import("./index.js");

describe("BookNook Server Unit & Route Tests", () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe("Sanity & Security Headers", () => {
    it("GET / returns 200 with status message", async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.message, "BookNook API is running");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("x-frame-options"), "DENY");
    });

    it("GET /unknown returns 404 Route not found", async () => {
      const res = await fetch(`${baseUrl}/unknown-nonexistent-path`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.message, "Route not found");
    });
  });

  describe("Protected Routes without Token", () => {
    it("GET /books/:id without auth returns 401", async () => {
      const res = await fetch(`${baseUrl}/books/507f1f77bcf86cd799439011`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.message, "Missing access token");
    });

    it("POST /books without auth returns 401", async () => {
      const res = await fetch(`${baseUrl}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Book" }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.message, "Missing access token");
    });

    it("POST /borrows without auth returns 401", async () => {
      const res = await fetch(`${baseUrl}/borrows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: "507f1f77bcf86cd799439011" }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.message, "Missing access token");
    });

    it("GET /borrows without auth returns 401", async () => {
      const res = await fetch(`${baseUrl}/borrows`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.message, "Missing access token");
    });
  });

  describe("Helper Validation Functions", () => {
    it("parseObjectId accepts valid 24-char hex strings", () => {
      const validHex = "507f1f77bcf86cd799439011";
      const parsed = parseObjectId(validHex, "book");
      assert.equal(String(parsed), validHex);
    });

    it("parseObjectId rejects invalid object ids with 400 HttpError", () => {
      assert.throws(
        () => parseObjectId("invalid-id", "book"),
        (err) => err instanceof HttpError && err.status === 400 && err.message === "Invalid book id"
      );
    });

    it("validateBookFields validates categories properly", () => {
      assert.ok(ALLOWED_CATEGORIES.includes("Fiction"));
      assert.throws(
        () =>
          validateBookFields(
            {
              title: "A",
              author: "B",
              category: "InvalidCategory",
              image: "https://example.com/img.jpg",
              description: "Desc",
              totalCopies: 5,
            },
            false
          ),
        (err) => err instanceof HttpError && err.status === 400
      );
    });

    it("validateBookFields validates title length", () => {
      assert.throws(
        () =>
          validateBookFields(
            {
              title: "",
              author: "Author",
              category: "Fiction",
              image: "https://example.com/img.jpg",
              description: "Desc",
              totalCopies: 5,
            },
            false
          ),
        (err) => err instanceof HttpError && err.status === 400
      );
    });
  });
});
