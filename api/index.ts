import express from "express";
import Stripe from "stripe";
import gameProxy from "../src/server/gameProxy";
import { chatRouter } from "../src/server/chatServer";
import soundboardRouter from "../src/server/soundboardProxy";

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

// 1. Enable Global CORS for all origins, methods, and headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// 2. Safe Body Parser that avoids stream consumption deadlocks on Vercel
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string" && req.body.length > 0) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Keep original string
      }
    } else if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf-8"));
      } catch {
        // Keep original buffer
      }
    }
    return next();
  }

  // If stream is still readable and not closed
  if (!req.complete && req.readable) {
    express.json({ limit: "25mb" })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: "25mb" })(req, res, next);
    });
  } else {
    next();
  }
});

// 3. Normalize Vercel serverless request URLs across routing patterns
app.use((req, _res, next) => {
  let url = req.url || "/";

  // If Vercel catch-all passed query params (e.g. all: ['chat', 'join'])
  if (req.query) {
    if (req.query.all) {
      const parts = Array.isArray(req.query.all) ? req.query.all : [req.query.all];
      url = "/" + parts.join("/");
    } else if (req.query.slug) {
      const parts = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
      url = "/chat/" + parts.join("/");
    }
  }

  const matchedHeader = (req.headers["x-matched-path"] || req.headers["x-now-route-matches"]) as
    string | undefined;
  if (
    matchedHeader &&
    (matchedHeader.includes("/chat") ||
      matchedHeader.includes("/public") ||
      matchedHeader.includes("/health"))
  ) {
    url = matchedHeader;
  }

  req.url = url;
  next();
});

// 4. Health check
app.get(["/api/health", "/health", "/api", "/"], (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), runtime: "vercel-serverless" });
});

// 5. Stripe checkout session creation
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

// 6. Mount Chat Router at all possible sub-paths
app.use("/api/chat", chatRouter);
app.use("/chat", chatRouter);

// 7. Mount Game Proxy at all possible sub-paths
app.use("/api/public", gameProxy);
app.use("/public", gameProxy);
app.use(gameProxy);

// 7.5. Mount Soundboard Proxy at all possible sub-paths
app.use("/api/soundboard", soundboardRouter);
app.use("/soundboard", soundboardRouter);
app.use(soundboardRouter);

// 8. Direct router fallback if path was stripped (e.g. /join, /state, /me)
app.use(chatRouter);

// 9. Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Serverless Function Error:", err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({
    error: err?.message || "Internal server error on backend",
  });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
