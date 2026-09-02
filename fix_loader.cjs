const fs = require('fs');
let file = 'src/lib/gameLoader.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/https:\\\/\\\/raw\\\.githack\\\.com\\\/\[\^\\\\x27" \\\\t\\\\n\\\\r>\]\+\/i/g, 'https:\\\/\\\/cdn\\\.jsdelivr\\\.net\\\/gh\\\/\[^\\\\x27" \\\\t\\\\n\\\\r>\]+/i');
content = content.replace(/\(https:\\\/\\\/raw\\\.githack\\\.com\\\/\[\^\\\/\]\+\\\/\[\^\\\/\]\+\(?:@\[\^\\\/\]\+\)\?\\\/\\\?\)\/i/g, '(https:\\\/\\\/cdn\\\.jsdelivr\\\.net\\\/gh\\\/\[^\\\/\]+\\\/\[^\\\/\]+(?:@\[^\\\/\]+)?\\\/?)/i');
fs.writeFileSync(file, content);
console.log("loader fixed");
