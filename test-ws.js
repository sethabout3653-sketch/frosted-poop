import WebSocket from "ws";
const ws = new WebSocket("ws://localhost:3000/ws/chat");
ws.on("open", () => {
  console.log("connected!");
  ws.send(
    JSON.stringify({ type: "auth", payload: { token: "tok-49c2a59edf09a9b94f49ef4ceb4bbbed" } }),
  );
});
ws.on("message", (data) => {
  console.log("message", data.toString().substring(0, 50));
  ws.close();
});
ws.on("error", (err) => {
  console.error("error", err);
});
