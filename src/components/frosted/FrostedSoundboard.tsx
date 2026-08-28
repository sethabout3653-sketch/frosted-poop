import { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  Sliders,
  Play,
  Square,
  Repeat,
  Mic,
  MicOff,
  Upload,
  Star,
  Zap,
  Radio,
  Share2,
  Plus,
  Trash2,
  Download,
  Flame,
  Globe,
  Music,
  RefreshCw,
} from "lucide-react";

export interface SoundItem {
  id: string;
  title: string;
  mp3: string;
  color: string;
  category?: string;
  keybind?: string;
  isCustom?: boolean;
}

const DEFAULT_KEYBINDS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "q",
  "w",
  "e",
  "r",
  "t",
  "y",
  "u",
  "i",
  "o",
];

const CATEGORIES = [
  "All Instants",
  "Trending",
  "Memes",
  "Gaming",
  "Sound Effects",
  "Anime",
  "Reactions",
  "Movies",
  "Favorites",
  "My Custom Sounds",
];

export function FrostedSoundboard({ onBackToLibrary }: Props) {
  // Soundboard State
  const [sounds, setSounds] = useState<SoundItem[]>(() => {
    try {
      const saved = localStorage.getItem("frosted_soundboard_custom");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      /* silent */
    }
    return [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("frosted_soundboard_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("All Instants");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [liveProxyResults, setLiveProxyResults] = useState<SoundItem[]>([]);
  const [isSearchingProxy, setIsSearchingProxy] = useState<boolean>(false);

  // Audio FX Controls
  const [volume, setVolume] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0); // Playback rate / speed
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Keybind mapping mode
  const [assigningKeyForId, setAssigningKeyForId] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [customTitleInput, setCustomTitleInput] = useState<string>("");
  const [targetProxyUrl, setTargetProxyUrl] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Context & Active Nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load live sounds from Target URL via Scramjet Proxy on mount
  useEffect(() => {
    let isMounted = true;
    async function loadTargetUrlSounds() {
      try {
        const res = await fetch("/api/soundboard/search");
        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            if (data.targetUrl) {
              setTargetProxyUrl(data.targetUrl);
            }
            if (Array.isArray(data.sounds) && data.sounds.length > 0) {
              setSounds((prev) => {
                const existingIds = new Set(prev.map((s) => s.id));
                const fetched: SoundItem[] = data.sounds
                  .filter((s: SoundItem) => !existingIds.has(s.id))
                  .map((s: SoundItem, idx: number) => ({
                    ...s,
                    keybind: DEFAULT_KEYBINDS[(prev.length + idx) % DEFAULT_KEYBINDS.length],
                  }));
                return [...prev, ...fetched];
              });
            }
          }
        }
      } catch (err) {
        console.warn("Failed loading live proxy sounds:", err);
      }
    }
    loadTargetUrlSounds();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save custom sounds to localStorage
  useEffect(() => {
    try {
      const customOnly = sounds.filter((s) => s.isCustom);
      localStorage.setItem("frosted_soundboard_custom", JSON.stringify(customOnly));
    } catch {
      /* silent */
    }
  }, [sounds]);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("frosted_soundboard_favorites", JSON.stringify(favorites));
    } catch {
      /* silent */
    }
  }, [favorites]);

  // Proxy search query to Myinstants via Scramjet Backend Proxy
  const handleProxySearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setLiveProxyResults([]);
      return;
    }
    setIsSearchingProxy(true);
    try {
      const res = await fetch(`/api/soundboard/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.sounds)) {
          setLiveProxyResults(data.sounds);
        }
      }
    } catch (err) {
      console.warn("Proxy search failed:", err);
    } finally {
      setIsSearchingProxy(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 1) {
        handleProxySearch(searchQuery);
      } else {
        setLiveProxyResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, handleProxySearch]);

  // Visualizer Animation
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 32;
    const barWidth = canvas.width / bars;
    const isPlaying = currentlyPlayingId !== null;

    for (let i = 0; i < bars; i++) {
      const height = isPlaying
        ? Math.floor(Math.sin(Date.now() / 100 + i) * 15 + 20 + Math.random() * 10)
        : 3;
      const x = i * barWidth;
      const y = canvas.height - height;

      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "#f43f5e");

      ctx.fillStyle = isPlaying ? gradient : "#262626";
      ctx.fillRect(x + 1, y, barWidth - 2, height);
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    }
  }, [currentlyPlayingId]);

  useEffect(() => {
    drawVisualizer();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentlyPlayingId, drawVisualizer]);

  // Play Sound Function with Scramjet CORS Proxy URL wrapping
  const playSound = useCallback(
    (sound: SoundItem) => {
      try {
        // Stop currently playing instance if non-polyphonic
        const existing = activeSourcesRef.current.get(sound.id);
        if (existing) {
          existing.pause();
          existing.currentTime = 0;
          activeSourcesRef.current.delete(sound.id);
        }

        // Wrap URL in Scramjet Proxy streamer if external HTTP media URL
        let finalAudioUrl = sound.mp3;
        if (sound.mp3.startsWith("http")) {
          finalAudioUrl = `/api/soundboard/stream?url=${encodeURIComponent(sound.mp3)}`;
        }

        const audio = new Audio(finalAudioUrl);
        audio.volume = Math.min(Math.max(volume, 0), 1);
        audio.playbackRate = pitch;
        audio.loop = isLoop;

        setCurrentlyPlayingId(sound.id);

        audio.onended = () => {
          activeSourcesRef.current.delete(sound.id);
          if (activeSourcesRef.current.size === 0) {
            setCurrentlyPlayingId(null);
          }
        };

        audio.onerror = (e) => {
          console.warn(`Direct proxy stream fallback for ${sound.title}:`, e);
          // Try direct URL fallback if proxy fails
          const directAudio = new Audio(sound.mp3);
          directAudio.volume = volume;
          directAudio.playbackRate = pitch;
          directAudio.play().catch(() => {});
        };

        activeSourcesRef.current.set(sound.id, audio);
        audio.play().catch((err) => {
          console.warn("Audio play rejected:", err);
          setCurrentlyPlayingId(null);
        });
      } catch (err) {
        console.error("Error playing sound:", err);
      }
    },
    [volume, pitch, isLoop],
  );

  const stopAllSounds = () => {
    activeSourcesRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeSourcesRef.current.clear();
    setCurrentlyPlayingId(null);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();

      if (assigningKeyForId) {
        e.preventDefault();
        setSounds((prev) =>
          prev.map((s) => (s.id === assigningKeyForId ? { ...s, keybind: key } : s)),
        );
        setAssigningKeyForId(null);
        return;
      }

      // Check keybind match
      const matchedSound = sounds.find((s) => s.keybind?.toLowerCase() === key);
      if (matchedSound) {
        e.preventDefault();
        playSound(matchedSound);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sounds, playSound, assigningKeyForId]);

  // Favorite toggle
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Add Sound from Myinstants Proxy Search to user board
  const addProxySoundToBoard = (sound: SoundItem) => {
    if (!sounds.some((s) => s.id === sound.id)) {
      setSounds((prev) => [
        {
          ...sound,
          keybind: DEFAULT_KEYBINDS[prev.length % DEFAULT_KEYBINDS.length],
        },
        ...prev,
      ]);
    }
    playSound(sound);
  };

  // Record Custom Voice Clip
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newCustomSound: SoundItem = {
            id: `custom-rec-${Date.now()}`,
            title: customTitleInput.trim() || `Recorded Sound #${sounds.length + 1}`,
            mp3: base64Audio,
            color: "#10b981",
            category: "My Custom Sounds",
            isCustom: true,
            keybind: DEFAULT_KEYBINDS[sounds.length % DEFAULT_KEYBINDS.length],
          };
          setSounds((prev) => [newCustomSound, ...prev]);
          setCustomTitleInput("");
        };
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access is required to record custom sound clips.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  // Custom Local Sound File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        const soundTitle = file.name.replace(/\.[^/.]+$/, "");
        const newSound: SoundItem = {
          id: `custom-file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: soundTitle,
          mp3: base64Data,
          color: "#8b5cf6",
          category: "My Custom Sounds",
          isCustom: true,
          keybind: DEFAULT_KEYBINDS[sounds.length % DEFAULT_KEYBINDS.length],
        };
        setSounds((prev) => [newSound, ...prev]);
      };
    });
  };

  // Delete custom sound pad
  const deleteSound = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSounds((prev) => prev.filter((s) => s.id !== id));
  };

  // Filtered List calculation
  const displayedSounds = sounds.filter((sound) => {
    const matchesCategory =
      selectedCategory === "All Instants"
        ? true
        : selectedCategory === "Favorites"
          ? favorites.includes(sound.id)
          : selectedCategory === "My Custom Sounds"
            ? sound.isCustom
            : sound.category?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      sound.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sound.category?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Soundboard Header & Control Bar */}
      <div className="rounded-2xl border border-neutral-800 bg-[#0c0c0d] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Background Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none frosted-grid" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Title & Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-md">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                    FROSTED SOUNDBOARD
                  </h1>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                    <Globe className="h-3 w-3" />
                    Myinstants CORS Proxy Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Instant sound effect pads powered by Scramjet proxy traffic to Myinstants.com.
                  Trigger sounds live with keybinds or record custom FX!
                </p>
              </div>
            </div>
          </div>

          {/* Master FX Controls */}
          <div className="flex flex-wrap items-center gap-4 bg-[#141415] rounded-xl border border-neutral-800 p-3">
            {/* Visualizer Canvas */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Visualizer</span>
              <canvas
                ref={canvasRef}
                width={80}
                height={24}
                className="rounded bg-black border border-neutral-800"
              />
            </div>

            {/* Stop All Button */}
            <button
              onClick={stopAllSounds}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/60 transition-all cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Silence All</span>
            </button>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLoop(!isLoop)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                isLoop
                  ? "border-rose-500 bg-rose-500/20 text-rose-300"
                  : "border-neutral-800 bg-[#0d0d0d] text-neutral-400 hover:text-white"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Loop</span>
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVolume((v) => (v > 0 ? 0 : 1))}
                className="text-neutral-400 hover:text-white"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-rose-500 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-neutral-400 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Pitch / Speed Control */}
            <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs text-neutral-400 font-mono">Speed:</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 cursor-pointer"
                title={`Playback Speed: ${pitch}x`}
              />
              <span className="text-[10px] font-mono text-cyan-400 w-7">{pitch}x</span>
            </div>
          </div>
        </div>

        {/* Live Proxy Connection Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/60 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Target Proxy URL:{" "}
              <strong className="text-neutral-200">{targetProxyUrl || "Loading..."}</strong>
            </span>
            <span className="text-neutral-600">|</span>
            <span>
              Route:{" "}
              <code className="text-rose-400 font-mono bg-black/50 px-1.5 py-0.5 rounded">
                /api/soundboard/stream
              </code>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-neutral-800 bg-[#121214] px-3 py-1 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors">
              <Upload className="h-3.5 w-3.5 text-rose-400" />
              <span>Import .MP3/.WAV</span>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500 bg-rose-500/20 px-3 py-1 text-xs text-rose-300 animate-pulse cursor-pointer"
              >
                <MicOff className="h-3.5 w-3.5" />
                <span>Stop Recording ({recordingTime}s)</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-[#121214] px-3 py-1 text-xs text-neutral-300 hover:border-rose-500/50 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5 text-cyan-400" />
                <span>Record Mic FX</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories & Search Omnibox */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                  : "bg-[#0d0d0d] border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {cat === "Favorites" ? "★ Favorites" : cat}
            </button>
          ))}
        </div>

        {/* Search Input querying Myinstants via Scramjet Backend */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Myinstants proxy..."
            className="w-full rounded-xl border border-neutral-800 bg-[#0d0d0d] pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-500 transition-all"
          />
          {isSearchingProxy && (
            <RefreshCw className="absolute right-3 top-2.5 h-3.5 w-3.5 text-rose-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Myinstants Scramjet Live Proxy Search Results (If searching) */}
      {searchQuery.length > 1 && liveProxyResults.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-[#0f0b12] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-rose-400 font-semibold font-mono">
              <Globe className="h-3.5 w-3.5" />
              MYINSTANTS.COM LIVE PROXY RESULTS ({liveProxyResults.length})
            </span>
            <span className="text-[10px] text-neutral-400">Click sound to play & add to board</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {liveProxyResults.map((item) => (
              <button
                key={item.id}
                onClick={() => addProxySoundToBoard(item)}
                className="flex flex-col items-center justify-between p-3 rounded-xl border border-neutral-800 bg-[#16131c] hover:border-rose-500 hover:scale-[1.02] transition-all cursor-pointer text-center group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md mb-2 group-hover:rotate-12 transition-transform"
                  style={{ backgroundColor: item.color }}
                >
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <span className="text-xs font-medium text-neutral-200 line-clamp-1">
                  {item.title}
                </span>
                <span className="text-[9px] font-mono text-rose-400 mt-1 flex items-center gap-1">
                  <Plus className="h-2.5 w-2.5" /> Add Pad
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Soundboard Push-Button Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <span>
            Showing <strong className="text-white">{displayedSounds.length}</strong> sound pads
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            Tip: Press keyboard hotkeys shown in corner to instant-trigger!
          </span>
        </div>

        {displayedSounds.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-12 text-center space-y-3">
            <Music className="h-10 w-10 text-neutral-600 mx-auto" />
            <p className="text-sm font-medium text-neutral-300">No sounds found matching filter.</p>
            <p className="text-xs text-neutral-500">
              Try searching another term or record your own custom sound pad!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {displayedSounds.map((sound) => {
              const isFav = favorites.includes(sound.id);
              const isPlaying = currentlyPlayingId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() => playSound(sound)}
                  className={`relative group flex flex-col items-center justify-between p-4 rounded-2xl border transition-all duration-150 cursor-pointer select-none overflow-hidden ${
                    isPlaying
                      ? "border-rose-500 bg-[#181216] scale-[0.98] shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                      : "border-neutral-800 bg-[#0c0c0d] hover:border-neutral-600 hover:bg-[#121214] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top Row Controls: Keybind badge & Favorite Star */}
                  <div className="w-full flex items-center justify-between gap-1 z-10">
                    {/* Keybind Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssigningKeyForId(sound.id);
                      }}
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold uppercase transition-colors ${
                        assigningKeyForId === sound.id
                          ? "border-amber-400 bg-amber-400 text-black animate-bounce"
                          : sound.keybind
                            ? "border-neutral-700 bg-black/60 text-neutral-300 hover:border-white hover:text-white"
                            : "border-neutral-800 bg-black/30 text-neutral-600"
                      }`}
                      title="Click to remap keybind"
                    >
                      {assigningKeyForId === sound.id ? "PRESS KEY" : sound.keybind || "+Key"}
                    </button>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => toggleFavorite(sound.id, e)}
                      className="text-neutral-500 hover:text-amber-400 transition-colors p-0.5"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
                      />
                    </button>
                  </div>

                  {/* 3D Interactive Instant Sound Button */}
                  <div className="my-3 relative flex items-center justify-center">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-100 ${
                        isPlaying
                          ? "scale-90 shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                          : "group-hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: sound.color,
                        boxShadow: isPlaying
                          ? `0 0 25px ${sound.color}`
                          : `0 4px 14px ${sound.color}44`,
                      }}
                    >
                      {isPlaying ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-4 bg-white animate-pulse" />
                          <span className="w-1 h-6 bg-white animate-pulse delay-75" />
                          <span className="w-1 h-3 bg-white animate-pulse delay-150" />
                        </div>
                      ) : (
                        <Play className="h-6 w-6 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Title & Category Info */}
                  <div className="text-center w-full z-10">
                    <h3 className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                      {sound.title}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wide">
                        {sound.category || "Instant"}
                      </span>
                      {sound.isCustom && (
                        <button
                          onClick={(e) => deleteSound(sound.id, e)}
                          className="text-neutral-500 hover:text-red-400 p-0.5"
                          title="Delete Custom Sound"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
