const fs = require('fs');
function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/cdn\\\.jsdelivr\\\.net\\\/gh/g, 'raw\\.githack\\.com');
  content = content.replace(/quantil\\\.jsdelivr\\\.net\\\/gh/g, 'raw\\.githack\\.com');
  content = content.replace(/fastly\\\.jsdelivr\\\.net\\\/gh/g, 'raw\\.githack\\.com');
  content = content.replace(/gcore\\\.jsdelivr\\\.net\\\/gh/g, 'raw\\.githack\\.com');
  content = content.replace(/a456pur\\\/seraph@main/g, 'a456pur\\/seraph\\/main');
  content = content.replace(/3kh0\\\/3kh0-Assets@main/g, '3kh0\\/3kh0-Assets\\/main');
  fs.writeFileSync(file, content);
}
fix('src/server/gameProxy.ts');
fix('src/lib/gameLoader.ts');
console.log('done');
