const fs = require('fs');

const files = [
  'src/lib/gameLoader.ts',
  'src/lib/games.ts',
  'src/lib/offlineManager.ts',
  'src/lib/cdnManager.ts',
  'src/server/gameProxy.ts',
  'src/data/luminSdkGames.json'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Replace jsdelivr gh urls: https://cdn.jsdelivr.net/gh/owner/repo@branch/path -> https://raw.githack.com/owner/repo/branch/path
  content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^@\/]+)@([^\/]+)\//g, 'https://raw.githack.com/$1/$2/$3/');
  
  // General domain replacement
  content = content.replace(/cdn\.jsdelivr\.net\/gh/g, 'raw.githack.com');
  content = content.replace(/cdn\.jsdelivr\.net/g, 'raw.githack.com');
  
  // Specific fix for cdnManager buildGhUrl
  content = content.replace(
    /return `https:\/\/raw\.githack\.com\/\$\{owner\}\/\$\{repo\}@\$\{ref\}\/\$\{cleanPath\}`;/g,
    'return `https://raw.githack.com/${owner}/${repo}/${ref}/${cleanPath}`;'
  );
  
  fs.writeFileSync(file, content);
});
console.log('Done');
