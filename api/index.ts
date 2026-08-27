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

// Enable CORS for all Vercel domains and client environments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// JSON and URL-encoded body parsing with large limit for chat media/attachments
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    next();
  } else {
    express.json({ limit: "25mb" })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check endpoint
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
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

// Mount chat routes (support both rewritten paths /api/chat and /chat)
app.use("/api/chat", chatRouter);
app.use("/chat", chatRouter);

// Mount game proxy routes
app.use("/api/public", gameProxy);
app.use("/public", gameProxy);
app.use(gameProxy);

// Catch-all serverless error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Vercel API error:", err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: err?.message || "Internal API Error" });
});

export default app;
