// Microphone loudness, kept outside React state: it changes 25 times a second
// and only the small level meter cares.

export interface LevelStore {
  subscribe(listener: () => void): () => void;
  // 0 (silence) to 1 (loud).
  get(): number;
}

export interface WritableLevel extends LevelStore {
  set(level: number): void;
  reset(): void;
}

export function createLevel(initial = 0): WritableLevel {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => value,
    set(level) {
      // Fast attack, slow release, so the meter does not flicker.
      const next = level > value ? level : value * 0.8 + level * 0.2;
      if (Math.abs(next - value) < 0.005) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    reset() {
      value = 0;
      listeners.forEach((listener) => listener());
    },
  };
}

// Loudness of one 16-bit PCM frame, on a scale that makes speech fill the meter.
export function pcmLevel(frame: ArrayBuffer): number {
  const samples = new Int16Array(frame, 0, Math.floor(frame.byteLength / 2));
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]! / 0x8000;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, rms * 6);
}
