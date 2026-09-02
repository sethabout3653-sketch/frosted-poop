const fs = require('fs');
let content = fs.readFileSync('src/server/gameProxy.ts', 'utf8');
content = content.replace(/https:\\\/\\\/cdn\\\.jsdelivr\\\.net\\\/gh\\\//g, 'https:\\/\\/raw\\.githack\\.com\\/');
fs.writeFileSync('src/server/gameProxy.ts', content);

let loader = fs.readFileSync('src/lib/gameLoader.ts', 'utf8');
loader = loader.replace(/https:\\\/\\\/cdn\\\.jsdelivr\\\.net\\\/gh\\\//g, 'https:\\/\\/raw\\.githack\\.com\\/');
fs.writeFileSync('src/lib/gameLoader.ts', loader);
console.log('done');
