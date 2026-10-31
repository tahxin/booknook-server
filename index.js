// ==========================================
// 1. Imports and dotenv/config
// ==========================================
import "dotenv/config";
import express from "express";

// ==========================================
// 6. App creation
// ==========================================
const app = express();
app.disable("x-powered-by");

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
