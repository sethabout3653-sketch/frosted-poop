import type { User } from "@/types/chat";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface Props {
  users: User[];
  currentUserId: string | undefined;
}

export function DiscordUserList({ users, currentUserId }: Props) {
  const online = users.filter((u) => u.status !== "offline");
  const offline = users.filter((u) => u.status === "offline");

  return (
    <div className="flex h-full w-60 shrink-0 flex-col bg-[#0d0d0d] p-3 text-neutral-400 font-sans border-l border-neutral-800 select-none overflow-y-auto">
      {/* ONLINE SECTION */}
      <div className="mb-4 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-2">
          Online — {online.length}
        </div>

        <div className="space-y-0.5">
          {online.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-default select-none"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    style={{ backgroundColor: u.avatarColor || "#ffffff" }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/20 shadow-sm"
                  >
                    {u.username.substring(0, 1).toUpperCase()}
                  </div>
                  {/* Status Ring */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0d0d] bg-emerald-400" />
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1 truncate">
                    <span className="truncate text-xs font-bold text-neutral-200">
                      {u.username}
                    </span>
                    {u.username === "frostedbot" ? (
                      <span className="rounded bg-white px-1 py-0.2 text-[9px] font-black text-black uppercase">
                        BOT
                      </span>
                    ) : isSelf ? (
                      <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30 uppercase">
                        YOU
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    Online
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OFFLINE SECTION */}
      {offline.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 px-2">
            Offline — {offline.length}
          </div>

          <div className="space-y-0.5">
            {offline.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 opacity-50 select-none cursor-default"
              >
                <div className="relative shrink-0">
                  <div
                    style={{ backgroundColor: u.avatarColor || "#ffffff" }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  >
                    {u.username.substring(0, 1).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0d0d] bg-neutral-600" />
                </div>

                <div className="truncate">
                  <div className="truncate text-xs font-medium text-neutral-300">
                    {u.username}
                  </div>
                  <div className="text-[10px] text-neutral-500">Offline</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
