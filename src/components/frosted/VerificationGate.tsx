import { useState } from "react";
import { Lock, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

interface Props {
  onVerified: () => void;
}

export function VerificationGate({ onVerified }: Props) {
  const [status, setStatus] = useState<"idle" | "checking" | "verified">("idle");

  const handleClickCheckbox = () => {
    if (status !== "idle") return;
    setStatus("checking");

    // Simulate authentic Google reCAPTCHA response delay
    setTimeout(() => {
      setStatus("verified");
      setTimeout(() => {
        onVerified();
      }, 700);
    }, 1200);
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
            Please complete the Google reCAPTCHA check below to proceed to the Frosted Games platform.
          </p>
        </div>

        {/* Google reCAPTCHA v2 Widget Replica */}
        <div className="mb-6 flex justify-center">
          <div className="w-[304px] h-[78px] rounded-md border border-[#333333] bg-[#222222] p-3 flex items-center justify-between shadow-lg select-none">
            {/* Left Checkbox & Text */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClickCheckbox}
                disabled={status !== "idle"}
                className={`relative h-7 w-7 shrink-0 rounded-sm border transition-colors flex items-center justify-center cursor-pointer ${
                  status === "verified"
                    ? "border-emerald-500 bg-transparent"
                    : status === "checking"
                    ? "border-[#555] bg-[#1a1a1a]"
                    : "border-[#c1c1c1] hover:border-[#ffffff] bg-[#222222]"
                }`}
              >
                {status === "checking" && (
                  <div className="h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                )}
                {status === "verified" && (
                  <svg className="h-6 w-6 text-emerald-400 animate-in zoom-in duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span className="text-xs font-normal text-[#f0f0f0] tracking-normal font-sans">
                {status === "verified"
                  ? "You are verified"
                  : status === "checking"
                  ? "Verifying..."
                  : "I'm not a robot"}
              </span>
            </div>

            {/* Right reCAPTCHA Brand Logo & Links */}
            <div className="flex flex-col items-center justify-center shrink-0 pl-2">
              {/* Google reCAPTCHA Logo */}
              <svg className="h-8 w-8" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.25l6.9-6.9C35.9 2.18 30.29 0 24 0 14.66 0 6.6 5.37 2.69 13.19l8.03 6.24C12.63 13.68 17.82 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.1 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.51c-.54 2.87-2.18 5.3-4.63 6.94l7.21 5.59C43.32 37.5 46.1 31.55 46.1 24.55z"/>
                <path fill="#FBBC05" d="M10.72 28.57c-.49-1.45-.77-2.99-.77-4.57s.28-3.12.77-4.57L2.69 13.19C1.02 16.52 0 20.15 0 24s1.02 7.48 2.69 10.81l8.03-6.24z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.21-5.59c-2.15 1.45-4.92 2.3-8.68 2.3-6.18 0-11.37-4.18-13.28-9.93l-8.03 6.24C6.6 42.63 14.66 48 24 48z"/>
              </svg>
              <span className="text-[10px] font-medium text-[#aaaaaa] mt-0.5">reCAPTCHA</span>
              <div className="flex gap-1 text-[8px] text-[#888888]">
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="hover:underline">Privacy</a>
                <span>-</span>
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="hover:underline">Terms</a>
              </div>
            </div>
          </div>
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
