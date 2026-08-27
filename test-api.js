import fetch from 'node-fetch';
const TOKEN = process.argv[2];
fetch('http://localhost:3000/api/chat/state', { headers: { Authorization: `Bearer ${TOKEN}` } })
  .then(res => res.json())
  .then(data => console.log('state channels:', data.channels.length, 'messages:', Object.keys(data.messages).length))
  .catch(console.error);
