import gameProxy from "../src/server/gameProxy.js";
import express from "express";

const app = express();
app.use("/api/public", gameProxy);

export default app;
