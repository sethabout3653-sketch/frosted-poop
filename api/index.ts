import express from "express";
import Stripe from "stripe";
import gameProxy from "../src/server/gameProxy.js";
import { chatRouter } from "../src/server/chatServer.js";

// Initialize Stripe gracefully
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const app = express();

// Enable CORS for all Vercel domains, preview URLs, and client environments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// JSON and URL-encoded body parsing
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    next();
  } else {
    express.json({ limit: "25mb" })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Normalize request URLs across different Vercel serverless routing behaviors
app.use((req, _res, next) => {
  // If Vercel rewrote URL or passed x-matched-path / originalUrl
  const matchedPath = (req.headers["x-matched-path"] as string) || (req.headers["x-now-route-matches"] as string);
  if (matchedPath && (req.url === "/api" || req.url === "/api/index" || req.url === "/api/index.ts")) {
    req.url = matchedPath;
  }
  next();
});

// Health check endpoint
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), runtime: "vercel-serverless" });
});

// Stripe checkout session creation
app.post(["/api/create-checkout-session", "/create-checkout-session"], async (req, res) => {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "VIP Access",
              description: "Unlock exclusive VIP features.",
            },
            unit_amount: 99, // $0.99 USD
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.protocol}://${req.get("host")}/?vip=success`,
      cancel_url: `${req.protocol}://${req.get("host")}/`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error?.message || "Stripe session failure" });
  }
});

// Mount Chat Router at all possible Vercel request paths
app.use("/api/chat", chatRouter);
app.use("/chat", chatRouter);

// Mount Game Proxy at all possible paths
app.use("/api/public", gameProxy);
app.use("/public", gameProxy);
app.use(gameProxy);

// Fallback error handler for Vercel functions
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Vercel Serverless Function Error:", err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({
    error: err?.message || "Internal server error on chat backend",
  });
});

export default app;
