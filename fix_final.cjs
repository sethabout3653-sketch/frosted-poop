const fs = require('fs');
function fixAll(file) {
  let content = fs.readFileSync(file, 'utf8');
  // First, completely remove any lingering jsdelivr references.
  content = content.replace(/cdn\.jsdelivr\.net\/gh/g, 'raw.githack.com');
  content = content.replace(/cdn\.jsdelivr\.net/g, 'raw.githack.com');
  content = content.replace(/quantil\.jsdelivr\.net/g, 'raw.githack.com');
  content = content.replace(/fastly\.jsdelivr\.net/g, 'raw.githack.com');
  content = content.replace(/gcore\.jsdelivr\.net/g, 'raw.githack.com');
  
  // Fix the broken double /g/g from the bad sed command
  content = content.replace(/\/g\/g, "/g, `\/g, "`);
  
  fs.writeFileSync(file, content);
}
['src/server/gameProxy.ts', 'src/lib/gameLoader.ts', 'test.html', 'public/test-lumin.html', 'src/lib/cdnManager.ts'].forEach(f => {
  if (fs.existsSync(f)) fixAll(f);
});
console.log('Fixed');
