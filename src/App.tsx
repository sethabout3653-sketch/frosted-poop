import { useState, useEffect } from "react";
import { SettingsProvider } from "./lib/settings";
import { BrowserShell } from "./components/browser/BrowserShell";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IXL_FAVICON, FROSTED_ICON_SVG } from "./lib/favicons";

const queryClient = new QueryClient();

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Tab Cloaking: Disguise as school only during splash
    if (showSplash) {
      document.title = "IXL";
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) link.href = IXL_FAVICON;
    } else {
      document.title = "Frosted";
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) link.href = FROSTED_ICON_SVG;
    }

    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        {showSplash ? (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            <img
              src="https://blog.ixl.com/wp-content/uploads/2023/08/GD-3024-IXL-Blog-images_-Student-Dashboard-1200x600-1.png"
              alt="Loading..."
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <BrowserShell />
        )}
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
