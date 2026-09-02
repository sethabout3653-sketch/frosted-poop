const fs = require('fs');
let p = fs.readFileSync('src/server/gameProxy.ts', 'utf8');
p = p.replace(/https:\\\/\\\/raw\\\.githack\\\.com\\\/\\\/ga456pur\\\/seraph\\\/main\/g/g, 'https:\\/\\/raw\\.githack\\.com\\/a456pur\\/seraph\\/main/g');
p = p.replace(/https:\\\/\\\/raw\\\.githack\\\.com\\\/\\\/g3kh0\\\/3kh0-Assets\\\/main\/g/g, 'https:\\/\\/raw\\.githack\\.com\\/3kh0\\/3kh0-Assets\\/main/g');
fs.writeFileSync('src/server/gameProxy.ts', p);
console.log('done');
