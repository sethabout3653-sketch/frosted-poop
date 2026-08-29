import { Gamepad2, MessageSquare } from "lucide-react";

interface Props {
  onReturnToGames: () => void;
}

export function DiscordServerBar({ onReturnToGames }: Props) {
  return (
    <div className="flex flex-col items-center py-3 w-18 shrink-0 bg-[#000000] border-r border-neutral-900 gap-2 select-none">
      {/* Return to Games / Direct Messages Icon */}
      <button
        onClick={onReturnToGames}
        title="Return to Frosted Games Library"
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141414] border border-neutral-800 text-neutral-300 transition-all hover:rounded-xl hover:bg-white hover:text-black hover:border-white cursor-pointer shadow-sm"
      >
        <Gamepad2 className="h-5 w-5 transition-transform group-hover:scale-110" />
        {/* Left active pill */}
        <div className="absolute left-0 h-0 w-1 rounded-r bg-white transition-all group-hover:h-5" />
      </button>

      {/* Divider */}
      <div className="my-1 h-[1px] w-8 bg-neutral-800" />

      {/* Main Server Icon (Frosted Community Server) */}
      <button
        title="Frosted Community Guild"
        className="group relative flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all cursor-pointer"
      >
        <MessageSquare className="h-5 w-5" />
        {/* Left active indicator pill */}
        <div className="absolute left-0 h-9 w-1 rounded-r bg-white" />
      </button>
    </div>
  );
}
