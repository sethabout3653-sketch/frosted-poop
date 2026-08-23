import { Check, Globe, Sparkles, X, Zap } from "lucide-react";
import { motion } from "motion/react";

import { useSettings } from "@/lib/settings";
import { getAvailableWispServers } from "@/lib/proxy";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const wispServers = getAvailableWispServers();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex justify-end bg-background/80 backdrop-blur-sm"
    >
      <button aria-label="Close settings" className="flex-1" onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 selection:bg-foreground selection:text-background"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            <h2 className="text-lg font-light tracking-tight text-foreground">Browser Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active Wisp Relays */}
        <Section title="Wisp Network Relays">
          <div className="space-y-1.5">
            {wispServers.map((server, idx) => (
              <div
                key={server.url}
                className="flex items-center justify-between rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                  <span className="font-medium text-foreground">{server.name}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[12rem]">
                  {server.url.replace(/^wss?:\/\//, "")}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Anti-Deleado */}
        <Section title="Tab Protection">
          <Toggle
            label="Anti-Deleado (Confirm before closing)"
            checked={settings.antiDeleado}
            onChange={(v) => update({ antiDeleado: v })}
          />
        </Section>
      </motion.aside>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-border pt-6 first-of-type:border-0">
      <h3 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/60"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/40"
    >
      {label}
      <span
        className={`ml-3 h-5 w-9 shrink-0 rounded-full border border-border p-0.5 transition-colors ${
          checked ? "bg-foreground" : "bg-background"
        }`}
      >
        <span
          className={`block h-3.5 w-3.5 rounded-full transition-transform ${
            checked ? "translate-x-4 bg-background" : "bg-muted-foreground"
          }`}
        />
      </span>
    </button>
  );
}
