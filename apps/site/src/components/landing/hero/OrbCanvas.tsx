"use client";

import { type RefObject, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { darkPalette } from "@oxumi/ui/design/tokens";

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// A "voice orb": a glassy sphere of domain-warped plasma lit from above, so
// its upper half glows while the lower half falls into shadow behind the
// headline. Thin rings leave its surface like sound. Colour maths runs in
// linear light and is tone-mapped, which keeps the saffron/pink/violet blends
// saturated instead of muddy.
//
// On a dark page all of that is light added to the canvas. Added light cannot
// show on a near-white page, so in light mode (uLight) the same field is read
// as pigment instead: the sphere is a wash of colour that is dense where the
// plasma is bright and thins to paper where it is not, the halo becomes a
// soft tint around it, and the rings are drawn as tinted lines. The geometry
// and motion are shared, so the two modes move identically.
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntro;
uniform float uLevel;
uniform vec2 uMouse;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec3 uSaffron;
uniform vec3 uPink;
uniform vec3 uViolet;
uniform vec3 uCanvas;
uniform float uLight;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
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
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.02 + 11.7;
    a *= 0.5;
  }
  return v;
}
mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
// Brand palette as a loop: 0 saffron, 1/3 pink, 2/3 violet, back to saffron.
vec3 pal(float x) {
  vec3 a = uSaffron * uSaffron;
  vec3 b = uPink * uPink;
  vec3 c = uViolet * uViolet;
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(a, b, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(b, c, smoothstep(0.0, 1.0, x - 1.0));
  return mix(c, a, smoothstep(0.0, 1.0, x - 2.0));
}

void main() {
  float t = uTime;
  vec2 p = (gl_FragCoord.xy - uCenter) / uRadius - uMouse * 0.06;
  float r = length(p);
  float ang = atan(p.y, p.x);
  vec2 dir = p / max(r, 0.0001);

  // Speech: syllables riding on a slower phrase envelope, scaled by how
  // loudly the agent is talking right now.
  float syllable = 0.5 + 0.5 * sin(t * 9.0) * sin(t * 3.7 + 1.0);
  float phrase = 0.6 + 0.4 * sin(t * 1.3);
  float voice = uLevel * syllable * phrase;
  float breath = sin(t * 0.55);

  float wobble = fbm3(vec3(dir * 1.3, t * 0.22) + 3.0) - 0.5;
  float R = (0.93 + 0.06 * wobble + 0.012 * breath + 0.03 * voice
    + 0.02 * voice * sin(ang * 5.0 + t * 4.0)) * mix(0.78, 1.0, uIntro);
  float d = r - R;
  float px = 1.0 / uRadius;
  float mask = smoothstep(px, -px, d);

  // Light arrives from above.
  float up = dir.y;
  vec3 light = vec3(0.0);
  // Kept for the light-mode composite: the sphere's own emission and shading.
  vec3 sphere = vec3(0.0);
  float sphereLit = 0.0;
  float sphereRim = 0.0;
  float glint = 0.0;
  vec3 sphereBody = vec3(0.0);

  if (d < 0.02) {
    float q = clamp(r / R, 0.0, 1.0);
    float z = sqrt(1.0 - q * q);
    vec3 n = vec3(p / R, z);
    vec3 s = n;
    s.xz = rot(t * 0.11 + uMouse.x * 0.35) * s.xz;
    s.yz = rot(0.4 - uMouse.y * 0.25) * s.yz;

    vec3 w = vec3(
      fbm3(s * 1.4 + vec3(0.0, 0.0, t * 0.16)),
      fbm3(s * 1.4 + vec3(5.2, 1.3, -t * 0.13)),
      fbm3(s * 1.4 + vec3(-3.1, 7.7, t * 0.1))) - 0.5;
    float n1 = fbm(s * 1.5 + w * 2.8 + vec3(0.0, t * 0.09, 0.0));
    float n2 = fbm(s * 2.9 - w * 2.4 + vec3(t * 0.06, 0.0, 4.0));
    float veins = pow(1.0 - abs(2.0 * n2 - 1.0), 7.0);

    float hue = 0.36 * (1.0 - n.y) + (n1 - 0.5) * 0.9 + 0.04 * sin(t * 0.2);
    float lit = smoothstep(-1.0, 0.75, n.y + (n1 - 0.5) * 0.8);
    float shade = 0.1 + 0.9 * lit;

    // Glass: thin at the centre, dense toward the limb.
    float density = 0.05 + 1.25 * smoothstep(0.38, 0.72, n1);
    float depth = mix(0.3, 1.0, q * q * q);
    vec3 body = pal(hue) * density * depth;
    body += pal(hue - 0.12) * veins * (0.4 + 1.6 * voice);

    // Warm bloom under the lit pole swells with the voice; a small glint.
    vec2 pole = vec2(-0.1 + uMouse.x * 0.12, 0.42);
    body += pal(0.03) * exp(-length(n.xy - pole) * 3.2) * (0.5 + 1.3 * voice);
    vec3 l = normalize(vec3(-0.4 + uMouse.x * 0.3, 0.75 + uMouse.y * 0.2, 0.5));
    glint = pow(max(dot(n, l), 0.0), 40.0);
    sphere = body + pal(hue + 0.05) * pow(1.0 - z, 2.6) * 0.5;
    sphereLit = lit;
    sphereRim = pow(1.0 - z, 2.6);
    body += vec3(1.0, 0.9, 0.8) * glint * 0.5;
    body *= shade;

    float fres = pow(1.0 - z, 2.6);
    body += pal(hue + 0.05) * fres * (0.3 + 1.9 * lit) * (1.0 + 0.6 * voice);
    sphereBody = body * mask;
    light += sphereBody;
  }

  // Atmosphere outside the surface.
  float dOut = max(d, 0.0);
  float glowLit = smoothstep(-1.0, 0.7, up);
  vec3 glowCol = pal(0.36 * (1.0 - up) + 0.05 * sin(t * 0.3 + ang));
  light += glowCol * (1.0 - mask) * (0.18 + 0.82 * glowLit)
    * (exp(-dOut * 12.0) * (0.45 + 0.5 * voice) + exp(-dOut * 2.2) * (0.13 + 0.12 * voice));

  // Sound: rings leaving the surface. Near the orb their outline wavers
  // like a waveform; further out they settle into clean circles.
  vec3 ringCol = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float phase = fract(t * 0.1 + fi / 3.0);
    float fade = 1.0 - phase;
    float life = fade * fade * smoothstep(0.0, 0.05, phase);
    float ripple = sin(ang * 14.0 + t * 2.3 + fi * 2.1) * sin(ang * 5.0 - t * 1.1 + fi);
    float rr = 0.95 + phase * 3.4 + 0.03 * ripple * (0.15 + uLevel) * pow(fade, 6.0);
    float dist = abs(r - rr) * uRadius;
    float line = exp(-dist * 0.8) + exp(-dist * 0.06) * 0.14;
    ringCol += pal(0.36 * (1.0 - up) + phase * 0.4) * line * life;
  }
  light += ringCol * (0.2 + 0.4 * glowLit) * (1.0 - mask);

  // Faint drifting haze so the canvas is not flat.
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float haze = fbm3(vec3(uv * 1.4, t * 0.05));
  light += pal(0.62) * haze * haze * 0.03 * smoothstep(5.0, 0.8, r);

  // Tone-map on the brightest channel so highlights keep their hue rather
  // than washing out to pastel.
  light *= uIntro;
  sphereBody *= uIntro;
  float peak = max(light.r, max(light.g, light.b));
  float mapped = (1.0 - exp(-peak * 1.15)) / max(peak, 0.0001);
  light *= mapped;
  sphereBody *= mapped;
  light += vec3(smoothstep(0.75, 1.0, peak * 0.4)) * 0.12;

  float grain = hash2(gl_FragCoord.xy + fract(t) * 91.7) - 0.5;
  if (uLight < 0.5) {
    vec3 col = sqrt(uCanvas * uCanvas + light);
    col += grain * (0.026 + 0.03 * dot(col, vec3(0.33)));
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // Light page. Everything outside the sphere (halo, rings, haze) tints the
  // paper: its hue at full strength, in proportion to how bright it was.
  vec3 paper = uCanvas * uCanvas;
  vec3 around = max(light - sphereBody, 0.0);
  float aroundPeak = max(around.r, max(around.g, around.b));
  vec3 aroundHue = around / max(aroundPeak, 0.0001);
  float wash = 1.0 - exp(-aroundPeak * 3.2);
  vec3 col = paper * mix(vec3(1.0), aroundHue, wash * 0.62);

  // The sphere: pigment that is dense where the plasma glows. Its lit top is
  // saturated; the underside thins toward the page, so the headline that
  // overlaps it stays readable (in the dark it falls into shadow instead).
  float spherePeak = max(sphere.r, max(sphere.g, sphere.b));
  vec3 sphereHue = sphere / max(spherePeak, 0.0001);
  float dense = 1.0 - exp(-spherePeak * 3.4);
  float top = 0.3 + 0.7 * sphereLit;
  vec3 pigment = mix(vec3(1.0), sphereHue, clamp((0.3 + 0.7 * dense) * top + 0.4 * sphereRim, 0.0, 1.0));
  // Soft shading so it reads as a ball rather than a disc.
  pigment *= mix(0.86, 1.0, sphereLit) * (1.0 - 0.12 * sphereRim);
  pigment += vec3(1.0) * glint * 0.35;
  float cover = mask * uIntro * mix(0.55, 1.0, sphereLit);
  col = mix(col, paper * pigment, cover);

  col = sqrt(col);
  col += grain * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;

type Rgb = [number, number, number];

// "#rrggbb" to a 0..1 triple the shader can use.
function rgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// The palette as it resolves where the orb sits: the theme's colours are CSS
// variables, so this follows light and dark mode (and any scoped override)
// without the component knowing which is showing.
function readPalette(el: HTMLElement) {
  const style = getComputedStyle(el);
  const read = (name: string, fallback: string): Rgb =>
    rgb(style.getPropertyValue(name)) ?? rgb(fallback)!;
  const canvas = read("--cf-canvas", darkPalette.canvas);
  // A light page needs the subtractive rendering (see the shader).
  const light = canvas[0] + canvas[1] + canvas[2] > 1.5;
  // Light palettes keep their brand colours deep, so they can be text. As
  // pigment they would come out thin and grey, so each is brought up to full
  // brightness first: same hue and saturation, as vivid as the accent.
  const pigment = (name: string, fallback: string): Rgb => {
    const value = read(name, fallback);
    const peak = Math.max(...value, 0.001);
    return light ? [value[0] / peak, value[1] / peak, value[2] / peak] : value;
  };
  return {
    saffron: pigment("--cf-accent", darkPalette.accent),
    pink: pigment("--cf-pink", darkPalette.pink),
    violet: pigment("--cf-violet", darkPalette.violet),
    canvas,
    light,
  };
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function link(gl: WebGLRenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const at = (name: string) => gl.getUniformLocation(program, name);
  return {
    saffron: at("uSaffron"),
    pink: at("uPink"),
    violet: at("uViolet"),
    canvas: at("uCanvas"),
    light: at("uLight"),
    res: at("uRes"),
    time: at("uTime"),
    intro: at("uIntro"),
    level: at("uLevel"),
    mouse: at("uMouse"),
    center: at("uCenter"),
    radius: at("uRadius"),
  };
}

const INTRO_MS = 2200;
const MAX_PIXEL_RATIO = 1.5;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Stage = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

// Shown when WebGL is missing or fails. It waits a beat before appearing so a
// working canvas never flashes this first.
const Fallback = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle calc(var(--orb-r, 160px) * 2.4) at var(--orb-x, 50%) var(--orb-y, 30%),
      color-mix(in srgb, ${({ theme }) => theme.color.accent} 75%, transparent) 0,
      color-mix(in srgb, ${({ theme }) => theme.color.pink} 55%, transparent) 30%,
      color-mix(in srgb, ${({ theme }) => theme.color.violet} 24%, transparent) 46%,
      transparent 100%
    ),
    ${({ theme }) => theme.color.canvas};
  animation: ${fadeIn} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease} 700ms both;

  [data-mode="gl"] > & {
    display: none;
  }
`;

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;

  [data-mode="gl"] > & {
    opacity: 1;
  }
`;

// The orb is drawn where `anchor` sits in the layout, so DOM and shader stay
// composed together at every viewport size. `level` (0..1) is how loudly the
// agent is speaking; the orb eases toward it.
export default function OrbCanvas({
  anchor,
  level = 0.6,
}: {
  anchor: RefObject<HTMLElement | null>;
  level?: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const orb = { x: 0, y: 0, radius: 1 };
    let scale = 1;

    // Where the orb goes, in CSS pixels from the stage's top-left. Shared
    // with the CSS fallback through custom properties.
    const measure = () => {
      const box = stage.getBoundingClientRect();
      const slot = anchor.current?.getBoundingClientRect();
      const radius = slot ? Math.min(slot.width, slot.height) * 0.46 : box.height * 0.2;
      const x = slot ? slot.left + slot.width / 2 - box.left : box.width / 2;
      const y = slot ? slot.top + slot.height / 2 - box.top : box.height * 0.3;
      stage.style.setProperty("--orb-x", `${x}px`);
      stage.style.setProperty("--orb-y", `${y}px`);
      stage.style.setProperty("--orb-r", `${radius}px`);
      orb.radius = radius * scale;
      orb.x = x * scale;
      orb.y = (box.height - y) * scale;
    };
    measure();

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    let uniforms = gl && link(gl);
    if (!gl || !uniforms) {
      const fallbackSizes = new ResizeObserver(measure);
      fallbackSizes.observe(stage);
      return () => fallbackSizes.disconnect();
    }
    stage.dataset.mode = "gl";

    // The theme's colours, as uniforms. Called again whenever the theme
    // changes, so switching mode repaints without a new GL context.
    const colour = () => {
      if (!uniforms) return;
      const palette = readPalette(stage);
      gl.uniform3f(uniforms.saffron, ...palette.saffron);
      gl.uniform3f(uniforms.pink, ...palette.pink);
      gl.uniform3f(uniforms.violet, ...palette.violet);
      gl.uniform3f(uniforms.canvas, ...palette.canvas);
      gl.uniform1f(uniforms.light, palette.light ? 1 : 0);
    };
    colour();

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const start = performance.now();
    let voice = levelRef.current;
    let frame = 0;
    let visible = true;

    const resize = () => {
      // The shader is soft by nature, so full retina resolution is wasted work.
      scale = Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      measure();
    };

    const draw = (now: number) => {
      if (!uniforms) return;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      voice += (levelRef.current - voice) * 0.06;
      const elapsed = now - start;
      const intro = still ? 1 : Math.min(1, Math.max(0, elapsed / INTRO_MS));
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, still ? 14 : 14 + elapsed / 1000);
      gl.uniform1f(uniforms.intro, 1 - Math.pow(1 - intro, 3));
      gl.uniform1f(uniforms.level, still ? 0.6 : voice);
      gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.center, orb.x, orb.y);
      gl.uniform1f(uniforms.radius, orb.radius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && visible) frame = requestAnimationFrame(draw);
    };
    const play = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      mouse.tx = (event.clientX / innerWidth) * 2 - 1;
      mouse.ty = -((event.clientY / innerHeight) * 2 - 1);
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      uniforms = null;
      delete stage.dataset.mode;
    };
    const onRestored = () => {
      uniforms = link(gl);
      if (!uniforms) return;
      stage.dataset.mode = "gl";
      colour();
      resize();
      play();
    };

    const sizes = new ResizeObserver(() => {
      resize();
      if (still || !visible) play();
    });
    sizes.observe(canvas);
    if (anchor.current) sizes.observe(anchor.current);
    const sight = new IntersectionObserver(([entry]) => {
      visible = entry!.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !still) play();
    });
    sight.observe(canvas);
    // <html data-theme> and <html data-brand> switch the palette (see @oxumi/ui/design/theme-mode).
    const themes = new MutationObserver(() => {
      colour();
      play();
    });
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-brand"] });
    addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    resize();
    play();

    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      sight.disconnect();
      themes.disconnect();
      removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [anchor]);

  return (
    <Stage ref={stageRef} aria-hidden>
      <Fallback />
      <Canvas ref={canvasRef} />
    </Stage>
  );
}
