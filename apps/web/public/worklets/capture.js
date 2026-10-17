// Microphone -> 16-bit PCM in 40 ms frames (640 samples at 16 kHz).
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Int16Array(640);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      this.frame[this.filled++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.filled === this.frame.length) {
        this.port.postMessage(this.frame.buffer.slice(0));
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("capture", Capture);
