import * as THREE from "three";

// Texturas generadas en el navegador (sin descargar imágenes): hormigón con fisuras y áridos,
// manchas de humedad y las «máscaras» donde se va pintando cada capa al proyectarla.

/** Cubierta: 8 × 5 m centrada en el origen (x hacia la derecha, z hacia el espectador) */
export const DECK = { w: 8, d: 5 } as const;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, { repeat = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Grano del hormigón: motas claras y oscuras y algún árido */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number, density: number, aggregate: number) {
  for (let i = 0; i < density; i++) {
    const l = r() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${l},${l},${l},${0.03 + r() * 0.06})`;
    const s = 1 + r() * 2.2;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  for (let i = 0; i < aggregate; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 1.5 + r() * 5;
    const tone = 90 + r() * 90;
    ctx.fillStyle = `rgba(${tone},${tone - 4},${tone - 10},${0.25 + r() * 0.35})`;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rr = rad * (0.6 + r() * 0.6);
      ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }
}

/** Fisuras de la cubierta en metros (x, z): mismas líneas para el hormigón dañado y el reparado */
export function makeCracks(seed = 7) {
  const r = rng(seed);
  const lines: [number, number][][] = [];
  const walk = (x: number, z: number, angle: number, steps: number, depth: number) => {
    const pts: [number, number][] = [[x, z]];
    for (let i = 0; i < steps; i++) {
      angle += (r() - 0.5) * 0.9;
      const len = 0.06 + r() * 0.1;
      x += Math.cos(angle) * len;
      z += Math.sin(angle) * len;
      if (Math.abs(x) > DECK.w / 2 - 0.05 || Math.abs(z) > DECK.d / 2 - 0.05) break;
      pts.push([x, z]);
      if (depth < 2 && r() < 0.06) walk(x, z, angle + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), Math.floor(steps * 0.35), depth + 1);
    }
    lines.push(pts);
  };
  walk(-3.2, 1.6, -0.25, 34, 0);
  walk(0.6, 2.3, -1.25, 26, 0);
  walk(1.2, -0.4, 0.15, 30, 0);
  walk(-2.4, -1.8, 0.5, 18, 0);
  return lines;
}

const toPx = (x: number, z: number, w: number, h: number) => [((x + DECK.w / 2) / DECK.w) * w, ((z + DECK.d / 2) / DECK.d) * h] as const;

/** Superficie de la cubierta: «raw» (vieja, sucia y fisurada) o «prepared» (granallada y con las fisuras selladas) */
export function deckTexture(mode: "raw" | "prepared", cracks: [number, number][][]) {
  const W = 1536;
  const H = 960;
  const [c, ctx] = canvas(W, H);
  const r = rng(mode === "raw" ? 11 : 12);
  ctx.fillStyle = mode === "raw" ? "#8c8780" : "#a7a39b";
  ctx.fillRect(0, 0, W, H);
  if (mode === "raw") {
    // Suciedad, verdín y manchas de agua de años
    for (let i = 0; i < 34; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = 40 + r() * 140;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const green = r() < 0.3;
      g.addColorStop(0, green ? "rgba(70,78,52,0.1)" : "rgba(40,36,30,0.08)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  grain(ctx, W, H, r, 60000, mode === "raw" ? 900 : 1400);
  if (mode === "prepared") {
    // Huella del granallado: bandas muy suaves
    for (let y = 0; y < H; y += 48) {
      ctx.fillStyle = `rgba(255,255,255,${0.025 + r() * 0.03})`;
      ctx.fillRect(0, y, W, 24);
    }
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const line of cracks) {
    const path = () => {
      ctx.beginPath();
      line.forEach(([x, z], i) => {
        const [px, py] = toPx(x, z, W, H);
        ctx[i ? "lineTo" : "moveTo"](px, py);
      });
    };
    if (mode === "raw") {
      path();
      ctx.strokeStyle = "rgba(25,22,20,0.9)";
      ctx.lineWidth = 3.2;
      ctx.stroke();
      path();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 7;
      ctx.stroke();
    } else {
      // Fisura abierta con radial y rellena de masilla (casi del color del hormigón)
      path();
      ctx.strokeStyle = "rgba(128,125,119,0.9)";
      ctx.lineWidth = 7;
      ctx.stroke();
      path();
      ctx.strokeStyle = "rgba(160,157,151,0.9)";
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }
  return toTexture(c);
}

/** Hormigón en corte (cantos del forjado, muros y la muestra): áridos grandes y armaduras. 1 textura = 1 × 1 m */
export function sectionTexture({ rebar = true, tone = "#9c978f" } = {}) {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const r = rng(21);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, r, 22000, 0);
  // Áridos (grava) visibles al cortar el hormigón
  for (let i = 0; i < 260; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 3 + r() * 9;
    const tone2 = 110 + r() * 80;
    ctx.fillStyle = `rgb(${tone2},${tone2 - 6},${tone2 - 14})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.55 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (rebar) {
    // Redondos de acero cada 20 cm, a 5 cm del borde inferior del canto (con el canto a 1 m de alto en la textura)
    for (let i = 0; i < 5; i++) {
      const x = 51 + i * 102;
      for (const y of [S * 0.86]) {
        ctx.fillStyle = "#4a3a2e";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(160,90,50,0.55)";
        ctx.beginPath();
        ctx.arc(x - 1.5, y - 1.5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return toTexture(c, { repeat: true });
}

/** Enlucido blanco del interior */
export function plasterTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const r = rng(31);
  ctx.fillStyle = "#e9e5de";
  ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, r, 5000, 0);
  return toTexture(c, { repeat: true });
}

/** Mancha de humedad (con su cerco más oscuro), para la pared interior */
export function dampTexture() {
  const W = 512;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  const r = rng(41);
  const blob = (scale: number, color: string) => {
    ctx.beginPath();
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI;
      // Mancha que baja desde el techo (arriba) con bordes irregulares
      const rad = (0.45 + 0.12 * Math.sin(i * 1.7) + 0.08 * (r() - 0.5)) * scale;
      const x = W / 2 + Math.cos(a) * rad * W * 0.9;
      const y = Math.sin(a) * rad * H * 1.7;
      ctx[i ? "lineTo" : "moveTo"](x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ctx.filter = "blur(6px)";
  blob(1, "rgba(92,78,58,0.55)");
  blob(0.9, "rgba(120,104,82,0.5)");
  blob(0.8, "rgba(70,66,60,0.35)");
  ctx.filter = "none";
  return toTexture(c);
}

/** Rejilla del sumidero */
export function grateTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = "#2b2b2c";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b0b0c";
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate((i / 16) * Math.PI * 2);
    ctx.fillRect(22, -6, 92, 12);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(c);
}

/** Relieve muy fino de «piel de naranja» de una membrana proyectada (para bumpMap) */
export function peelTexture() {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const r = rng(51);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 2 + r() * 7;
    const l = 110 + r() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${l},${l},${l},0.5)`);
    g.addColorStop(1, `rgba(${l},${l},${l},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = toTexture(c, { repeat: true, srgb: false });
  t.repeat.set(10, 6);
  return t;
}

/** Punto difuso para partículas (niebla de proyección, polvo, gotas) */
export function softDotTexture() {
  const S = 64;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, { srgb: false });
}

/** Anillo de salpicadura de una gota */
export function ringTexture() {
  const S = 64;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.55, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, { srgb: false });
}

/* ------------------------------------------------------------------ */
/*  Máscara de cobertura: se «pinta» por donde pasa la máquina/pistola  */
/* ------------------------------------------------------------------ */

export type Pass = { readonly rows: number; readonly width: number; readonly start: number; readonly end: number; readonly margin?: number };

/** Recorrido en zigzag por filas a lo largo de x, de atrás (z−) hacia delante (z+) */
export function passPosition(pass: Pass, p: number) {
  const margin = pass.margin ?? 0.15;
  const x0 = -DECK.w / 2 + margin;
  const x1 = DECK.w / 2 - margin;
  const z0 = -DECK.d / 2 + pass.width / 2 - 0.05;
  const z1 = DECK.d / 2 - pass.width / 2 + 0.05;
  const rowF = Math.min(p * pass.rows, pass.rows - 1e-6);
  const row = Math.floor(rowF);
  const f = rowF - row;
  const dir = row % 2 === 0 ? 1 : -1;
  const x = dir > 0 ? x0 + (x1 - x0) * f : x1 - (x1 - x0) * f;
  const z = pass.rows === 1 ? 0 : z0 + ((z1 - z0) * row) / (pass.rows - 1);
  return { x, z, dir, row, f };
}

export class Coverage {
  readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private painted = 0;
  private W: number;
  private H: number;
  private r = rng(5);

  /** spatter: salpicaduras en el borde (0 = borde limpio, como el de una máquina) */
  constructor(
    private pass: Pass,
    private radius: number,
    private spatter = 2,
  ) {
    const [c, ctx] = canvas(512, 320);
    this.W = c.width;
    this.H = c.height;
    this.ctx = ctx;
    this.texture = toTexture(c, { srgb: false });
    this.reset();
  }

  private clear = false;

  reset() {
    if (this.clear) return; // ya está vacía: no se vuelve a subir la textura a la GPU
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.painted = 0;
    this.clear = true;
    this.texture.needsUpdate = true;
  }

  private dot(x: number, z: number) {
    const [px, py] = toPx(x, z, this.W, this.H);
    const rad = (this.radius / DECK.w) * this.W;
    const g = this.ctx.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.55, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(px, py, rad, 0, Math.PI * 2);
    this.ctx.fill();
    // Pequeñas salpicaduras en el borde (la proyección real no deja un borde perfecto)
    for (let k = 0; k < this.spatter; k++) {
      const a = this.r() * Math.PI * 2;
      const d = rad * (0.75 + this.r() * 0.3);
      this.ctx.fillStyle = "rgba(255,255,255,0.8)";
      this.ctx.beginPath();
      this.ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, rad * (0.12 + this.r() * 0.12), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /** Pinta el recorrido hasta la fracción p (0–1); si se retrocede, vuelve a empezar */
  paintTo(p: number) {
    if (p < this.painted - 1e-6) this.reset();
    if (p <= this.painted) return;
    const step = 0.004 / this.pass.rows; // ~3 cm por paso
    for (let q = this.painted; q < p; q += step) {
      const { x, z } = passPosition(this.pass, Math.min(q, p));
      this.dot(x, z);
    }
    const { x, z } = passPosition(this.pass, p);
    this.dot(x, z);
    this.painted = p;
    this.clear = false;
    this.texture.needsUpdate = true;
  }

  /** Estado según el reloj: vacía antes de la pasada, pintándose durante y completa después */
  update(t: number) {
    const { start, end } = this.pass;
    if (t < start) this.reset();
    else if (t >= end) this.fill();
    else this.paintTo((t - start) / (end - start));
  }

  /** Todo cubierto (para saltar a un paso posterior) */
  fill() {
    if (this.painted >= 1) return;
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.painted = 1;
    this.clear = false;
    this.texture.needsUpdate = true;
  }
}
