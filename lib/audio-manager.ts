export type AudioState = "playing" | "paused";

export type AudioSubscriber = (state: AudioState) => void;

const SOUNDTRACK = "/suno-song.mp3";

// One player for the whole site: the page's soundtrack control and the chat's visualizer share it,
// so the song can never play twice. The file is not requested until someone presses play.
class AudioManager {
  private static instance: AudioManager;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  private state: AudioState = "paused";
  private subscribers: Set<AudioSubscriber> = new Set();
  private dataArray: Uint8Array | null = null;

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private element(): HTMLAudioElement | null {
    if (this.audioEl || typeof window === "undefined") return this.audioEl;
    const element = new Audio();
    element.preload = "none";
    element.loop = true;
    element.src = SOUNDTRACK;
    element.addEventListener("play", () => this.updateState("playing"));
    element.addEventListener("pause", () => this.updateState("paused"));
    element.addEventListener("ended", () => this.updateState("paused"));
    this.audioEl = element;
    return element;
  }

  private initAudioContext(element: HTMLAudioElement) {
    if (this.audioContext) return;
    // Create AudioContext only after user interaction
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext!.createAnalyser();
    this.analyser.fftSize = 256;

    this.source = this.audioContext!.createMediaElementSource(element);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext!.destination);

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

  /** Resolves true once playback has started, false if the browser or network refused it. */
  public async play(): Promise<boolean> {
    const element = this.element();
    if (!element) return false;
    try {
      this.initAudioContext(element);
      if (this.audioContext?.state === "suspended") {
        await this.audioContext.resume();
      }
      await element.play();
      return true;
    } catch (error) {
      // Autoplay refusals are expected; anything else is worth a log.
      if ((error as Error).name !== "NotAllowedError") {
        console.error("Audio playback error:", error);
      }
      return false;
    }
  }

  public pause() {
    this.audioEl?.pause();
  }

  public async toggle(): Promise<boolean> {
    if (this.state === "playing") {
      this.pause();
      return true;
    }
    return this.play();
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
