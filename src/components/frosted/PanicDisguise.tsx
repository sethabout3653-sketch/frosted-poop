import { Lock } from "lucide-react";

interface Props {
  onUnlock: () => void;
}

export function PanicDisguise({ onUnlock }: Props) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white text-slate-800">
      {/* Fake School Header Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-[#006ca7] px-6 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black tracking-tight">IXL</span>
          <div className="h-4 w-[1px] bg-white/30" />
          <span className="text-sm font-medium">Learning & Analytics Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80">Student ID: #849201</span>
          {/* Secret unlock button disguised as a subtle lock icon */}
          <button
            onClick={onUnlock}
            title="Resume Frosted Games"
            className="rounded p-1 text-white/40 hover:text-white transition-colors"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fake Educational Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800">Algebra II & Calculus Practice</h1>
            <p className="mt-1 text-xs text-slate-500">
              Assigned by Instructor • Complete 10 diagnostic questions
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Question 1: Solve for x in the quadratic equation: 3x² + 12x - 15 = 0
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button className="rounded-lg border border-slate-200 bg-white p-2.5 text-left font-medium text-slate-700 hover:border-sky-500">
                    A) x = 1, x = -5
                  </button>
                  <button className="rounded-lg border border-slate-200 bg-white p-2.5 text-left font-medium text-slate-700 hover:border-sky-500">
                    B) x = -1, x = 5
                  </button>
                  <button className="rounded-lg border border-slate-200 bg-white p-2.5 text-left font-medium text-slate-700 hover:border-sky-500">
                    C) x = 3, x = -4
                  </button>
                  <button className="rounded-lg border border-slate-200 bg-white p-2.5 text-left font-medium text-slate-700 hover:border-sky-500">
                    D) x = 2, x = -3
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
