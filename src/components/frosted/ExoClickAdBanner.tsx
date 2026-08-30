import { useEffect, useRef } from "react";
import { DEFAULT_BANNER_ZONE } from "@/lib/popupManager";

interface Props {
  zoneId?: string;
  className?: string;
}

export function ExoClickAdBanner({ zoneId = DEFAULT_BANNER_ZONE, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const activeZone = zoneId || DEFAULT_BANNER_ZONE;

      // Clear previous banner contents
      containerRef.current.innerHTML = "";

      // Create ExoClick banner ins element (Banner uses eas6a97888e2)
      const ins = document.createElement("ins");
      ins.className = "eas6a97888e2";
      ins.setAttribute("data-zoneid", activeZone);
      containerRef.current.appendChild(ins);

      // Trigger ExoClick AdProvider
      const win = window as unknown as { AdProvider?: Array<{ serve: Record<string, unknown> }> };
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });
    } catch {
      /* silent */
    }
  }, [zoneId]);

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-800/60 bg-[#0a0a0a]/60 p-3 text-center backdrop-blur-sm ${className}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Advertisement (Banner)
        </span>
        <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-mono text-neutral-400 border border-neutral-800">
          Zone {zoneId || DEFAULT_BANNER_ZONE}
        </span>
      </div>

      <div
        ref={containerRef}
        className="min-h-[100px] w-full flex items-center justify-center overflow-hidden"
      >
        <ins className="eas6a97888e2" data-zoneid={zoneId || DEFAULT_BANNER_ZONE} />
      </div>
    </div>
  );
}
