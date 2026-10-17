"use client";

import { useEffect, useRef } from "react";

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// A breathing "voice" orb: domain-warped noise for the body, a bright rim, and
// rings travelling outward like sound.
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + 11.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 c = uv - vec2(0.0, 0.17) - uMouse * 0.035;
  float r = length(c);
  float angle = atan(c.y, c.x);
  float t = uTime * 0.22;

  vec2 warp = vec2(fbm(vec3(c * 1.4, t)), fbm(vec3(c * 1.4 + 5.2, t * 1.1)));
  float n = fbm(vec3(c * 1.7 + warp * 1.3 + vec2(t * 0.5, -t * 0.3), t));
  float n2 = fbm(vec3(c * 3.4 - warp + vec2(-t, t * 0.7), t * 1.4 + 4.0));

  // Speech-like amplitude: two slow sines beating against each other.
  float voice = 0.5 + 0.5 * sin(uTime * 1.9) * sin(uTime * 0.67 + 1.0);
  float radius = 0.27 + 0.085 * (n - 0.5)
    + 0.018 * voice * sin(angle * 3.0 + uTime * 1.3);
  float d = r - radius;

  float core = smoothstep(0.03, -0.24, d);
  float rim = exp(-abs(d) * 26.0);
  float halo = exp(-max(d, 0.0) * 5.0);

  float rings = 0.0;
  for (int i = 0; i < 3; i++) {
    float phase = fract(uTime * 0.16 + float(i) / 3.0);
    float ringRadius = radius + phase * 0.95;
    rings += exp(-abs(r - ringRadius) * 70.0) * (1.0 - phase) * (1.0 - phase);
  }

  vec3 saffron = vec3(1.0, 0.56, 0.16);
  vec3 magenta = vec3(0.96, 0.2, 0.52);
  vec3 violet = vec3(0.36, 0.27, 1.0);
  vec3 col = mix(violet, magenta, smoothstep(0.25, 0.75, n + c.x * 0.6));
  col = mix(col, saffron, smoothstep(0.35, 0.8, n2 + c.y * 0.9));

  vec3 orb = col * core * (0.35 + 0.75 * n2)
    + col * rim * 1.15
    + col * halo * 0.2
    + mix(violet, saffron, 0.45) * rings * 0.3;

  vec3 bg = vec3(0.027, 0.027, 0.035)
    + vec3(0.02, 0.012, 0.045) * fbm(vec3(uv * 1.3, t * 0.6));
  vec3 color = bg + orb;
  color += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) * 0.03;
  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function OrbCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let frame = 0;
    let visible = true;

    const resize = () => {
      // The shader is soft by nature, so full retina resolution is wasted work.
      const scale = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.floor(canvas.clientWidth * scale);
      canvas.height = Math.floor(canvas.clientHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = (now: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, still ? 12 : now / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && visible) frame = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
    };

    const sizes = new ResizeObserver(() => {
      resize();
      if (still) draw(0);
    });
    sizes.observe(canvas);
    const sight = new IntersectionObserver(([entry]) => {
      visible = entry!.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !still) frame = requestAnimationFrame(draw);
    });
    sight.observe(canvas);
    addEventListener("pointermove", onMove);
    resize();
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      sight.disconnect();
      removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full" />;
}
