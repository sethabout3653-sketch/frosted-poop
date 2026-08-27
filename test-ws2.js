import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:3000/ws/chat');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: "auth", payload: { token: "tok-856d8d89f5bd38051c7225316b83fc77" } }));
});
ws.on('message', (data) => {
  console.log('message', data.toString());
  ws.close();
});
