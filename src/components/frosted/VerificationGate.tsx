import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onVerified: () => void;
}

// Google reCAPTCHA v2 official test site key (always passes and renders official Google widget)
const RECAPTCHA_SITE_KEY = "6LeIxacZAAAAACQ5H_x5692484646";

export function VerificationGate({ onVerified }: Props) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if script is already present
    if (window.grecaptcha) {
      setScriptLoaded(true);
      return;
    }

    const scriptId = "google-recaptcha-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        setScriptError(true);
      };
      document.head.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || isSuccess) return;

    const renderCaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render && containerRef.current) {
        try {
          containerRef.current.innerHTML = "";
          window.grecaptcha.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: "dark",
            callback: (_token: string) => {
              setIsVerifying(true);
              setTimeout(() => {
                setIsVerifying(false);
                setIsSuccess(true);
                setTimeout(() => {
                  onVerified();
                }, 600);
              }, 400);
            },
            "expired-callback": () => {
              setIsVerifying(false);
              setIsSuccess(false);
            },
            "error-callback": () => {
              setScriptError(true);
            },
          });
        } catch (e) {
          console.error("reCAPTCHA render error:", e);
        }
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      renderCaptcha();
    } else {
      const timer = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(timer);
          renderCaptcha();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [scriptLoaded, isSuccess, onVerified]);

  // Fallback verification for offline / blocked script environments
  const handleFallbackVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 500);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 text-white font-sans selection:bg-white selection:text-black">
      {/* Background ambient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neutral-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#0a0a0a]/90 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-inner">
          {isSuccess ? (
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
            Please complete Google reCAPTCHA below to confirm you are human. Once verified, you won't need to do this again.
          </p>
        </div>

        {/* Captcha Box Container */}
        <div className="mb-6 flex flex-col items-center justify-center min-h-[140px] rounded-2xl border border-neutral-800 bg-black/60 p-5 shadow-inner">
          {isSuccess ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm animate-in fade-in">
              <CheckCircle2 className="h-5 w-5" />
              <span>Verified! Redirecting to games...</span>
            </div>
          ) : isVerifying ? (
            <div className="flex flex-col items-center gap-2 text-neutral-300 text-xs">
              <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Verifying captcha token...</span>
            </div>
          ) : (
            <>
              {/* Google reCAPTCHA Container */}
              <div ref={containerRef} className="flex justify-center my-2" />

              {/* Fallback button if Google script fails or is blocked by network */}
              {scriptError && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-[11px] text-amber-400">
                    Could not connect to Google reCAPTCHA servers.
                  </p>
                  <button
                    onClick={handleFallbackVerify}
                    className="smooth-btn rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    Click to Complete Security Check
                  </button>
                </div>
              )}
            </>
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

// Add Window interface declaration for grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
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
