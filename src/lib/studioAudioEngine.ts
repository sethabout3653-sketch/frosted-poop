/**
 * Studio Audio Engine & Voice Mastering DSP for Frosted Voice
 *
 * Provides studio broadcast clarity for microphones:
 * - 5-Stage Broadcast Equalizer (80Hz sub-rumble cut, 220Hz warmth, 450Hz anti-boxiness, 3.6kHz clarity, 11kHz air)
 * - Soft-Knee Studio Dynamics Compression (levels whisper/shout dynamics cleanly without distortion)
 * - Peak Safety Limiting (prevents digital clipping)
 */

export interface StudioAudioConfig {
  studioEnhancer: boolean;
  micGain: number;
  micMonitoring: boolean;
}

export class StudioAudioEngine {
  private actx: AudioContext | null = null;
  private rawSource: MediaStreamAudioSourceNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private warmthFilter: BiquadFilterNode | null = null;
  private boxinessFilter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private airShelf: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private mainGainNode: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  private config: StudioAudioConfig = {
    studioEnhancer: true,
    micGain: 1.5,
    micMonitoring: false,
  };

  constructor(initialConfig?: Partial<StudioAudioConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * Initializes the studio audio graph from a raw MediaStream.
   */
  public initialize(rawStream: MediaStream): MediaStream {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return rawStream;
      }

      this.actx = new AudioCtx({ sampleRate: 48000, latencyHint: "interactive" });
      if (this.actx.state === "suspended") {
        this.actx.resume().catch(() => {});
      }

      this.rawSource = this.actx.createMediaStreamSource(rawStream);
      this.destinationNode = this.actx.createMediaStreamDestination();

      // --- STAGE 1: High-Pass Sub-Rumble Cut (80Hz Butterworth) ---
      // Eliminates desk vibrations and electrical hum
      this.highpassFilter = this.actx.createBiquadFilter();
      this.highpassFilter.type = "highpass";
      this.highpassFilter.frequency.value = 80;
      this.highpassFilter.Q.value = 0.707;

      // --- STAGE 2: 4-Band Broadcast Vocal Equalizer ---
      // 1. Warmth & Chest Resonance (220Hz) - fixes thin laptop / headset mics
      this.warmthFilter = this.actx.createBiquadFilter();
      this.warmthFilter.type = "peaking";
      this.warmthFilter.frequency.value = 220;
      this.warmthFilter.Q.value = 0.85;
      this.warmthFilter.gain.value = this.config.studioEnhancer ? 2.0 : 0;

      // 2. Anti-Boxiness Dip (450Hz) - eliminates "talking in a box/can" sound
      this.boxinessFilter = this.actx.createBiquadFilter();
      this.boxinessFilter.type = "peaking";
      this.boxinessFilter.frequency.value = 450;
      this.boxinessFilter.Q.value = 1.2;
      this.boxinessFilter.gain.value = this.config.studioEnhancer ? -2.2 : 0;

      // 3. Speech Presence & Articulation Boost (3.6kHz) - crystal clear intelligibility
      this.presenceFilter = this.actx.createBiquadFilter();
      this.presenceFilter.type = "peaking";
      this.presenceFilter.frequency.value = 3600;
      this.presenceFilter.Q.value = 1.0;
      this.presenceFilter.gain.value = this.config.studioEnhancer ? 3.5 : 0;

      // 4. Studio Broadcast Air Shelf (11kHz) - silky modern top-end sparkle
      this.airShelf = this.actx.createBiquadFilter();
      this.airShelf.type = "highshelf";
      this.airShelf.frequency.value = 11000;
      this.airShelf.gain.value = this.config.studioEnhancer ? 2.5 : 0;

      // --- STAGE 3: Studio Broadcast Compressor & Leveler ---
      // Smooths dynamics without pumping
      this.compressor = this.actx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 3.5;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;

      // --- STAGE 4: Clean Main Output Gain ---
      this.mainGainNode = this.actx.createGain();
      this.mainGainNode.gain.value = this.config.micGain;

      // --- STAGE 5: Brickwall Safety Limiter (Prevents Digital Clipping) ---
      this.limiter = this.actx.createDynamicsCompressor();
      this.limiter.threshold.value = -1.5;
      this.limiter.knee.value = 2;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.001;
      this.limiter.release.value = 0.05;

      // --- STAGE 6: Real-Time Level Analyzer ---
      this.analyserNode = this.actx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      // --- STAGE 7: Local Monitoring ("Hear Myself") ---
      this.monitorGainNode = this.actx.createGain();
      this.monitorGainNode.gain.value = this.config.micMonitoring ? 0.9 : 0;

      // --- CONNECT THE DSP GRAPH ---
      // rawSource -> highpass -> warmth -> boxiness -> presence -> airShelf -> compressor -> mainGain -> limiter -> destination & analyser
      this.rawSource.connect(this.highpassFilter);
      this.highpassFilter.connect(this.warmthFilter);
      this.warmthFilter.connect(this.boxinessFilter);
      this.boxinessFilter.connect(this.presenceFilter);
      this.presenceFilter.connect(this.airShelf);
      this.airShelf.connect(this.compressor);
      this.compressor.connect(this.mainGainNode);
      this.mainGainNode.connect(this.limiter);

      // Output to WebRTC stream destination
      this.limiter.connect(this.destinationNode);

      // Output to visual meter analyzer
      this.limiter.connect(this.analyserNode);

      // Connect monitor to local speakers
      this.limiter.connect(this.monitorGainNode);
      this.monitorGainNode.connect(this.actx.destination);

      return this.destinationNode.stream;
    } catch (err) {
      console.warn("StudioAudioEngine fallback to raw stream:", err);
      return rawStream;
    }
  }

  public setStudioEnhancer(enabled: boolean) {
    this.config.studioEnhancer = enabled;
    if (this.warmthFilter) this.warmthFilter.gain.value = enabled ? 2.0 : 0;
    if (this.boxinessFilter) this.boxinessFilter.gain.value = enabled ? -2.2 : 0;
    if (this.presenceFilter) this.presenceFilter.gain.value = enabled ? 3.5 : 0;
    if (this.airShelf) this.airShelf.gain.value = enabled ? 2.5 : 0;
  }

  public setMicGain(gain: number) {
    this.config.micGain = gain;
    if (this.mainGainNode && this.actx) {
      this.mainGainNode.gain.setTargetAtTime(gain, this.actx.currentTime, 0.02);
    }
  }

  public setMicMonitoring(enabled: boolean) {
    this.config.micMonitoring = enabled;
    if (this.monitorGainNode && this.actx) {
      this.monitorGainNode.gain.setTargetAtTime(enabled ? 0.9 : 0, this.actx.currentTime, 0.02);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public destroy() {
    try {
      if (this.rawSource) this.rawSource.disconnect();
      if (this.highpassFilter) this.highpassFilter.disconnect();
      if (this.warmthFilter) this.warmthFilter.disconnect();
      if (this.boxinessFilter) this.boxinessFilter.disconnect();
      if (this.presenceFilter) this.presenceFilter.disconnect();
      if (this.airShelf) this.airShelf.disconnect();
      if (this.compressor) this.compressor.disconnect();
      if (this.limiter) this.limiter.disconnect();
      if (this.mainGainNode) this.mainGainNode.disconnect();
      if (this.monitorGainNode) this.monitorGainNode.disconnect();
      if (this.analyserNode) this.analyserNode.disconnect();
      if (this.destinationNode) this.destinationNode.disconnect();

      if (this.actx && this.actx.state !== "closed") {
        this.actx.close().catch(() => {});
      }
    } catch (e) {
      console.warn("StudioAudioEngine cleanup note:", e);
    } finally {
      this.actx = null;
    }
  }
}
