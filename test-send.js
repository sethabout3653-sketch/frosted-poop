import WebSocket from 'ws';
const TOKEN = process.argv[2];
const ws = new WebSocket('ws://localhost:3000/ws/chat');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: "auth", payload: { token: TOKEN } }));
  setTimeout(() => {
    ws.send(JSON.stringify({ type: "send_message", payload: { channelId: "general", content: "Hello world!" } }));
  }, 500);
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type !== "auth_success" && msg.type !== "user_status_change") {
    console.log('received:', msg);
  }
});
setTimeout(() => ws.close(), 1500);
