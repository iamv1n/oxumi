// Plays queued agent audio. A mark in the queue reports back when everything
// before it has been played; "clear" drops the queue when the caller cuts in.
class Playback extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === "audio") this.queue.push(data.samples);
      else if (data.type === "mark") this.queue.push({ mark: data.turn });
      else if (data.type === "clear") {
        this.queue = [];
        this.offset = 0;
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    let written = 0;
    while (this.queue.length) {
      const head = this.queue[0];
      if (!(head instanceof Float32Array)) {
        this.port.postMessage({ type: "drained", turn: head.mark });
        this.queue.shift();
        continue;
      }
      if (written === out.length) break;
      const count = Math.min(out.length - written, head.length - this.offset);
      out.set(head.subarray(this.offset, this.offset + count), written);
      written += count;
      this.offset += count;
      if (this.offset === head.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("playback", Playback);
