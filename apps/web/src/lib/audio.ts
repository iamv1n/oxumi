const SAMPLE_RATE = 16000;

// Browser side of a voice call: microphone frames out, agent audio in.
export class CallAudio {
  private context?: AudioContext;
  private playback?: AudioWorkletNode;
  private stream?: MediaStream;
  // Agent audio can arrive split mid-sample; keep the odd byte for next time.
  private carry: Uint8Array | null = null;

  async start(
    onFrame: (pcm: ArrayBuffer) => void,
    onDrained: (turn: number) => void,
  ): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const context = (this.context = new AudioContext({ sampleRate: SAMPLE_RATE }));
    await context.audioWorklet.addModule("/worklets/capture.js");
    await context.audioWorklet.addModule("/worklets/playback.js");

    const capture = new AudioWorkletNode(context, "capture", {
      numberOfOutputs: 0,
    });
    capture.port.onmessage = ({ data }) => onFrame(data as ArrayBuffer);
    context.createMediaStreamSource(this.stream).connect(capture);

    this.playback = new AudioWorkletNode(context, "playback", {
      outputChannelCount: [1],
    });
    this.playback.port.onmessage = ({ data }) => {
      if (data.type === "drained") onDrained(data.turn as number);
    };
    this.playback.connect(context.destination);
  }

  play(chunk: ArrayBuffer): void {
    let bytes = new Uint8Array(chunk);
    if (this.carry) {
      const joined = new Uint8Array(this.carry.length + bytes.length);
      joined.set(this.carry);
      joined.set(bytes, this.carry.length);
      bytes = joined;
      this.carry = null;
    }
    if (bytes.length % 2) {
      this.carry = bytes.slice(-1);
      bytes = bytes.subarray(0, -1);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const samples = new Float32Array(bytes.length / 2);
    for (let i = 0; i < samples.length; i++)
      samples[i] = view.getInt16(i * 2, true) / 0x8000;
    this.playback?.port.postMessage({ type: "audio", samples }, [samples.buffer]);
  }

  mark(turn: number): void {
    this.playback?.port.postMessage({ type: "mark", turn });
  }

  clear(): void {
    this.carry = null;
    this.playback?.port.postMessage({ type: "clear" });
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.context = undefined;
  }
}
