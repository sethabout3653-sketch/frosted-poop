import gameProxy from "../src/server/gameProxy";
import express from "express";

const app = express();
app.use("/api/public", gameProxy);

export default app;
