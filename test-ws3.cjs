const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws/chat');
ws.on('open', () => {
    console.log('connected!');
    ws.close();
});
ws.on('error', (err) => console.error(err));
