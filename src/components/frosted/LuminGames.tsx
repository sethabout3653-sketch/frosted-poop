import { useEffect, useRef } from "react";

export function LuminGames() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject the script dynamically so it runs when this mounts
    const script = document.createElement("script");
    const container = containerRef.current;

    script.src = "https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).Lumin) {
        (window as any).Lumin.init({
          container: "#lumin-games",
          theme: "dark",
          css: "/style.css",
          style: "/style.css",
        });
      }
    };

    return () => {
      document.body.removeChild(script);
      // Clean up the container if necessary to prevent memory leaks
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="w-full min-h-screen relative flex flex-col pt-8 pb-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-white drop-shadow-md">
          Lumin Library
        </h2>

        {/* Container for the LuminSDK to mount into */}
        <div
          id="lumin-games"
          ref={containerRef}
          className="w-full min-h-[600px] rounded-2xl border border-neutral-800 bg-[#000000] overflow-hidden"
        />
      </div>
    </div>
  );
}
