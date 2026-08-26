import express from "express";
import gameProxy from "../src/server/gameProxy";

const app = express();
app.use("/api/public", gameProxy);
app.use("/public", gameProxy);
app.use(gameProxy);

export default app;
