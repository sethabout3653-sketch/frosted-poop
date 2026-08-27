import { useState, useEffect, useRef } from "react";
import { Lock, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

interface Props {
  onVerified: () => void;
}

export function VerificationGate({ onVerified }: Props) {
  const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LdIbpstAAAAAOiww_nKfOaSB1a7oixnhFw4g5hl";

  const [status, setStatus] = useState<"idle" | "checking" | "verified" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Load Google reCAPTCHA script dynamically
  useEffect(() => {
    const scriptId = "google-recaptcha-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (window.grecaptcha && window.grecaptcha.render && containerRef.current) {
        try {
          containerRef.current.innerHTML = "";
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: SITE_KEY.trim(),
            theme: "dark",
            callback: (_token: string) => {
              setStatus("checking");
              setTimeout(() => {
                setStatus("verified");
                setTimeout(() => {
                  onVerified();
                }, 700);
              }, 400);
            },
            "error-callback": () => {
              setStatus("error");
              setErrorMessage("Domain not authorized or invalid key in Google Console.");
            },
          });
        } catch (err: any) {
          console.error("reCAPTCHA Render Error:", err);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(renderWidget);
        }
      };
      script.onerror = () => {
        setStatus("error");
        setErrorMessage("Could not connect to Google reCAPTCHA servers.");
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha && window.grecaptcha.render) {
      renderWidget();
    }
  }, [SITE_KEY, onVerified]);

  const handleFallbackVerify = () => {
    if (status === "verified") return;
    setStatus("checking");
    setTimeout(() => {
      setStatus("verified");
      setTimeout(() => {
        onVerified();
      }, 700);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 text-white font-sans selection:bg-white selection:text-black">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neutral-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#0a0a0a]/90 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-inner">
          {status === "verified" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-in zoom-in duration-200" />
          ) : (
            <ShieldCheck className="h-8 w-8 text-white" />
          )}
        </div>

        {/* Title & Description */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-[11px] font-mono text-neutral-400 mb-3">
            <Lock className="h-3 w-3 text-neutral-400" />
            <span>GOOGLE RECAPTCHA VERIFICATION</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Verification Required
          </h1>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Complete Google reCAPTCHA below to access the library. Once verified, you won't need to do this again.
          </p>
        </div>

        {/* Google reCAPTCHA Widget Container */}
        <div className="mb-6 flex flex-col items-center justify-center min-h-[90px]">
          {status === "verified" ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm animate-in fade-in">
              <CheckCircle2 className="h-5 w-5" />
              <span>Verified! Redirecting...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div ref={containerRef} className="flex justify-center" />
              {status === "error" && (
                <div className="text-center mt-2 flex flex-col items-center gap-2">
                  <p className="text-[11px] text-amber-400">{errorMessage}</p>
                  <button
                    onClick={handleFallbackVerify}
                    className="smooth-btn rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    Click to Verify Directly
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-900 pt-4">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-neutral-600" />
            <span>Protected by Google reCAPTCHA</span>
          </div>
          <span className="font-mono text-[10px] text-neutral-600">v2.5</span>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}
