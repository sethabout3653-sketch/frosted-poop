import express from "express";
import Stripe from "stripe";
import gameProxy from "../src/server/gameProxy";
import { chatRouter } from "../src/server/chatServer";

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
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.post("/api/create-checkout-session", async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

app.use("/api/chat", chatRouter);
app.use("/api/public", gameProxy);
app.use("/public", gameProxy);
app.use(gameProxy);

export default app;
