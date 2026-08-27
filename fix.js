const fs = require('fs');
let code = fs.readFileSync('src/components/frosted/GamePlayer.tsx', 'utf8');

if (!code.includes('import { initProxy, getOptimalWisp } from "@/lib/proxy"')) {
    code = code.replace(
        'import { loadGameSource, type GameLoadResult } from "@/lib/gameLoader";',
        'import { loadGameSource, type GameLoadResult } from "@/lib/gameLoader";\nimport { initProxy, getOptimalWisp } from "@/lib/proxy";'
    );
}

// Fix the corrupted block
code = code.replace(/async function initAndLoad\(\) \{.*?\}\);\s*return \(\) => \{/s, 
`async function initAndLoad() {
      if (game.directory.startsWith("/~/")) {
        try {
          const wisp = getOptimalWisp(game.directory);
          await initProxy(wisp);
        } catch (e) {
          console.error(e);
        }
      }
      if (cancelled) return;
      const result = await loadGameSource(game.directory);
      if (cancelled) {
        if (result.blobUrl) URL.revokeObjectURL(result.blobUrl);
        return;
      }
      if (result.blobUrl) {
        currentBlobUrlRef.current = result.blobUrl;
      }
      setActiveSrc(result.src);
    }
    initAndLoad();

    return () => {`);

// Fix handleReload
code = code.replace(/loadGameSource\(game\.directory\)\.then\(\(result\) => \{([\s\S]*?setActiveSrc\(result\.src\);[\s\S]*?setIsReloading\(false\), 500\);\s*\}\);/,
`async function reloadProxyAndGame() {
      if (game.directory.startsWith("/~/")) {
        try {
          const wisp = getOptimalWisp(game.directory);
          await initProxy(wisp);
        } catch (e) {}
      }
      const result = await loadGameSource(game.directory);
      if (result.blobUrl) {
        currentBlobUrlRef.current = result.blobUrl;
      }
      setActiveSrc(result.src);
      if (iframeRef.current) {
        iframeRef.current.src = result.src;
      }
      setTimeout(() => setIsReloading(false), 500);
    }
    reloadProxyAndGame();`);

fs.writeFileSync('src/components/frosted/GamePlayer.tsx', code);
