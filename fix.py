import re

with open('src/components/frosted/GamePlayer.tsx', 'r') as f:
    code = f.read()

# Add imports
if 'initProxy' not in code:
    code = code.replace(
        'import { loadGameSource, type GameLoadResult } from "@/lib/gameLoader";',
        'import { loadGameSource, type GameLoadResult } from "@/lib/gameLoader";\nimport { initProxy, getOptimalWisp } from "@/lib/proxy";'
    )

# Fix the first corrupted block
pattern1 = r'async function initAndLoad\(\) \{.*?\}\);\s*return \(\) => \{'
replacement1 = """async function initAndLoad() {
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

    return () => {"""
code = re.sub(pattern1, replacement1, code, flags=re.DOTALL)

# Fix the handleReload block
pattern2 = r'loadGameSource\(game\.directory\)\.then\(\(result\) => \{.*?setTimeout\(\(\) => setIsReloading\(false\), 500\);\s*\}\);'
replacement2 = """async function reloadProxyAndGame() {
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
    reloadProxyAndGame();"""
code = re.sub(pattern2, replacement2, code, flags=re.DOTALL)

with open('src/components/frosted/GamePlayer.tsx', 'w') as f:
    f.write(code)
