export type AudioState = "playing" | "paused";

export type AudioSubscriber = (state: AudioState) => void;

class AudioManager {
  private static instance: AudioManager;
  
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  
  private state: AudioState = "paused";
  private subscribers: Set<AudioSubscriber> = new Set();
  private dataArray: Uint8Array | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.audioEl = new Audio("/suno-song.mp3");
      this.audioEl.crossOrigin = "anonymous";
      this.audioEl.loop = true;
      
      this.audioEl.addEventListener("play", () => this.updateState("playing"));
      this.audioEl.addEventListener("pause", () => this.updateState("paused"));
      this.audioEl.addEventListener("ended", () => this.updateState("paused"));
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initAudioContext() {
    if (this.audioContext || !this.audioEl) return;
    
    // Create AudioContext only after user interaction
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.source = this.audioContext.createMediaElementSource(this.audioEl);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  private updateState(newState: AudioState) {
    this.state = newState;
    this.notifySubscribers();
  }

  public subscribe(callback: AudioSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.state);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.state));
  }

  public play() {
    if (!this.audioEl) return;
    this.initAudioContext();
    
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume();
    }
    
    this.audioEl.play().catch((error) => {
      // Ignore autoplay NotAllowedError to prevent noisy console logs
      if (error.name !== "NotAllowedError") {
        console.error("Audio playback error:", error);
      }
    });
  }

  public pause() {
    if (!this.audioEl) return;
    this.audioEl.pause();
  }

  public toggle() {
    if (this.state === "playing") {
      this.pause();
    } else {
      this.play();
    }
  }

  public getAverageFrequency(): number {
    if (!this.analyser || !this.dataArray || this.state !== "playing") {
      return 0;
    }
    
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // Normalize (0 to 1) based on max byte value 255
    return average / 255;
  }
}

export const audioManager = AudioManager.getInstance();
