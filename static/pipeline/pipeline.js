// own scope: the destructured engine globals below would clash with engine.js's top-level names
(() => {
/* Probing pipeline — continuous composition. All elements live in one world
   tree; a virtual camera pans/zooms along the rail keyed to authored cues.
   Symbolic grammar: full-size tiles = pixel space, small tiles = latent space,
   trapezoids = encoder / decoder, circled plus = noise injection.
   Light theme so frames drop straight onto white slides. */
const { CompositionStage, useComposition, animate, clamp, Easing } = window;
const R = window.React;

const C_BG = '#FFFFFF';
const C_TEXT = '#141821';
const C_DIM = '#6B7488';
const C_LINE = '#C3CAD6';
const C_DATA = '#2A6EDB';
const C_NOISE = '#C1741A';
const C_ACT = '#22A599';

const MOTION = {
  enter: Easing.easeOutCubic,
  glide: Easing.easeInOutCubic,
  pop: Easing.easeOutBack,
};

/* --- world geometry (pixel-space tiles are full size, latents are small) --- */
const CY = 245;                       // shared centre line
const TW = 300, TH = 170;             // pixel-space tile
const LW = 186, LH = 105;             // latent-space tile
const TRW = 100;                      // trapezoid width
const TY = CY - TH / 2;
const LY = CY - LH / 2;

const GT_X = 0;
const ENC_X = GT_X + TW;              // 300
const Z0_X = ENC_X + TRW;             // 400
const NZ_ARR = Z0_X + LW;             // 586  -> noise arrow with (+) node
const NOISE_X = NZ_ARR + 120;         // 706
const DIT_ARR = NOISE_X + LW;         // 892
const DIT_X = DIT_ARR + 80;           // 972
const DIT_W = 240, DIT_Y = CY - 102, DIT_H = 204;
const ZH_ARR = DIT_X + DIT_W;         // 1212
const ZHAT_X = ZH_ARR + 160;          // 1372 — fits the counter-scaled 'denoise' label

const ACT_S = 104, ACT_GAP = 18;
const ACT_CX = DIT_X + DIT_W / 2;     // 1092
const ACT_X = ACT_CX - (ACT_S * 3 + ACT_GAP * 2) / 2;
const ACT_Y = 408;

// Linear (ridge) probe reads the activations out to a physical target.
const PR_X = ACT_X + ACT_S * 3 + ACT_GAP * 2 + 150, PR_W = 280, PR_Y = ACT_Y, PR_H = ACT_S;
const TG_X = PR_X + PR_W + 130, TG_W = 150;
const RD_Y = PR_Y + PR_H / 2;
const WORLD_W = TG_X + TG_W;

const LBL_W = 300;
const NOISE_SRC = [
  'videos/noise_t100.mp4',
  'videos/noise_t200.mp4',
  'videos/noise_t300.mp4',
  'videos/noise_t400.mp4',
  'videos/noise_t500.mp4',
  'videos/noise_t600.mp4',
  'videos/noise_t700.mp4',
  'videos/noise_t800.mp4',
  'videos/noise_t900.mp4',
  'videos/noise_t1000.mp4',
]; // t = 100 .. 1000
const HOLD_I = 6; // t = 700
const BODY = "'Arimo', Arial, sans-serif";
const HEAD = "'Outfit', 'Arimo', sans-serif";

const MATH_I = "'KaTeX_Math', 'Latin Modern Math', 'Cambria Math', serif";
const MATH_R = "'KaTeX_Main', 'Latin Modern Roman', 'Times New Roman', serif";
const mi = (t) => R.createElement('span', { style: { fontFamily: MATH_I, fontStyle: 'italic' } }, t);
const mr = (t) => R.createElement('span', { style: { fontFamily: MATH_R, fontStyle: 'normal' } }, t);
const msub = (t) => R.createElement('sub', { style: { fontFamily: MATH_R, fontStyle: 'normal', fontSize: '0.7em', verticalAlign: '-0.25em', lineHeight: 0 } }, t);
const mhat = (t) => R.createElement('span', { style: { position: 'relative', display: 'inline-block' } }, mi(t),
  R.createElement('span', { style: { position: 'absolute', left: '0.1em', top: '-0.05em', fontFamily: MATH_R, fontStyle: 'normal' } }, '\u02c6'));
const FS = 38;    // 12 pt on a 21.41 cm wide slide at 1920 px
const FS_S = 32;  // 10 pt
const SW = 1920, SH = 750, F = 1.3; // stage size; camera scale multiplier

function ramp(T, a, b, ease) {
  return (ease || MOTION.enter)(clamp((T - a) / Math.max(1e-6, b - a), 0, 1));
}

function cam(T, keys) {
  if (T <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (T >= a.t && T <= b.t) {
      const p = MOTION.glide(clamp((T - a.t) / Math.max(1e-6, b.t - a.t), 0, 1));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p };
    }
  }
  return keys[keys.length - 1];
}

/* Plays natively while running, seeks deterministically when paused so
   exported frames are exact. */
function VTile({ src, x, y, w, h, opacity, border, radius, flat }) {
  const { T, playing } = useComposition();
  const ref = R.useRef(null);
  const v = ref.current;
  if (v) {
    if (playing) {
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    } else {
      if (!v.paused) v.pause();
      const d = v.duration;
      if (d && isFinite(d) && d > 0) {
        const t = ((T % d) + d) % d;
        if (Math.abs(v.currentTime - t) > 0.04) { try { v.currentTime = t; } catch (e) {} }
      }
    }
  }
  return R.createElement('div', {
    style: {
      position: 'absolute', left: x, top: y, width: w, height: h, opacity,
      borderRadius: radius == null ? 6 : radius, overflow: 'hidden', background: '#EDEFF3',
      boxShadow: flat ? 'none' : '0 6px 18px rgba(20,28,48,0.14)',
      outline: '1px solid ' + (border || C_LINE), outlineOffset: -1,
    },
  }, R.createElement('video', {
    ref, src, muted: true, loop: true, playsInline: true, preload: 'auto',
    style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  }));
}

function Label({ cx, y, title, tag, op, dy, color, k, above, wide }) {
  const lw = wide || LBL_W;
  return R.createElement('div', {
    style: {
      position: 'absolute', left: cx - lw / 2, top: y, width: lw, opacity: op,
      transform: 'translateY(' + (above ? 'calc(-100% + ' + dy + 'px)' : dy + 'px') + ')', textAlign: 'center', textWrap: 'balance',
    },
  },
    R.createElement('div', {
      style: { font: '400 ' + FS * k + 'px/1.2 ' + BODY, color: C_TEXT },
    }, title),
    tag ? R.createElement('div', {
      style: { font: '400 ' + FS_S * k + 'px/1.3 ' + BODY, color: color || C_DIM, marginTop: 4 * k },
    }, tag) : null
  );
}

/* Encoder / decoder as the classic autoencoder trapezoid: the silhouette
   narrows into latent space and widens back out of it. */
function Trapezoid({ x, dir, label, op, T, at, edgeOp, k }) {
  const p = ramp(T, at, at + 0.6, MOTION.glide);
  const narrow = (LH / TH) * 100;
  const inset = (100 - narrow) / 2;
  const clip = dir === 'in'
    ? 'polygon(0 0, 100% ' + inset + '%, 100% ' + (100 - inset) + '%, 0 100%)'
    : 'polygon(0 ' + inset + '%, 100% 0, 100% 100%, 0 ' + (100 - inset) + '%)';
  return R.createElement('div', {
    style: {
      position: 'absolute', left: x, top: TY, width: TRW, height: TH,
      opacity: op, transform: 'scaleX(' + (0.5 + 0.5 * p) + ')',
      transformOrigin: dir === 'in' ? 'left center' : 'right center',
    },
  },
    R.createElement('div', {
      style: {
        position: 'absolute', inset: 0, clipPath: clip, WebkitClipPath: clip,
        background: 'linear-gradient(' + (dir === 'in' ? '90deg' : '270deg') +
          ', #22A599, #35BFB2)',
      },
    }),
    R.createElement('div', {
      style: {
        position: 'absolute', left: TRW / 2 - 150, width: 300, bottom: TH + 8 * k, textAlign: 'center',
        font: '400 ' + FS_S * k + 'px/1.2 ' + BODY, color: '#1B8A80', whiteSpace: 'nowrap',
        opacity: ramp(T, at + 0.3, at + 0.8) * (edgeOp == null ? 1 : edgeOp),
        transform: 'scaleX(' + (1 / (0.5 + 0.5 * p)) + ')',
      },
    }, label)
  );
}

function Conn({ x1, x2, y, at, label, color, T, k }) {
  const p = ramp(T, at, at + 0.75, MOTION.glide);
  const w = (x2 - x1) * p;
  const op = ramp(T, at, at + 0.3);
  // A: ambient clock, keeps running while a phase is held; then the pulses keep flowing
  const { A, held } = useComposition();
  const alive = T > at && (held || T < at + 3.4);
  const pulse = (((A - at) % 1.9) + 1.9) % 1.9 / 1.9;
  const c = color || C_LINE;
  return R.createElement('div', { style: { position: 'absolute', left: x1, top: y, opacity: op } },
    R.createElement('div', { style: { position: 'absolute', left: 0, top: -1, width: w, height: 2, background: c, borderRadius: 2 } }),
    R.createElement('div', {
      style: {
        position: 'absolute', left: w - 7, top: -5, width: 0, height: 0,
        borderLeft: '8px solid ' + c, borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
        opacity: p > 0.97 ? 1 : 0,
      },
    }),
    p > 0.97 && alive ? R.createElement('div', {
      style: {
        position: 'absolute', left: (x2 - x1) * pulse - 3, top: -4, width: 7, height: 7,
        borderRadius: 7, background: color || C_DATA,
        opacity: Math.sin(pulse * Math.PI) * 0.95,
      },
    }) : null,
    label ? R.createElement('div', {
      style: {
        position: 'absolute', left: (x2 - x1) / 2 - 100, bottom: 10 * k, width: 200, textAlign: 'center',
        font: '400 ' + FS_S * k + 'px/1.2 ' + BODY, color: C_DIM, whiteSpace: 'nowrap',
        opacity: ramp(T, at + 0.3, at + 0.8),
      },
    }, label) : null
  );
}

/* Circled plus: noise is added to the latent. A small live noise swatch
   drops in from above and feeds the node. */
function NoiseNode({ cx, at, T, op }) {
  const drop = ramp(T, at + 0.2, at + 0.9, MOTION.glide);
  const ring = ramp(T, at, at + 0.5, MOTION.pop);
  return R.createElement('div', { style: { position: 'absolute', left: 0, top: 0, opacity: op } },
    R.createElement(VTile, {
      src: 'videos/noise_t1000.mp4', x: cx - 21, y: CY - 96 + (1 - drop) * 22, w: 42, h: 42,
      opacity: drop, border: 'rgba(193,116,26,0.55)', radius: 4,
    }),
    R.createElement('div', {
      style: {
        position: 'absolute', left: cx - 1, top: CY - 52, width: 2,
        height: 32 * drop, background: C_NOISE, opacity: 0.6,
      },
    }),
    R.createElement('div', {
      style: {
        position: 'absolute', left: cx - 15, top: CY - 15, width: 30, height: 30,
        borderRadius: 30, border: '2px solid ' + C_NOISE, background: C_BG,
        transform: 'scale(' + ring + ')',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: '400 20px/1 ' + BODY, color: C_NOISE,
        boxShadow: '0 2px 8px rgba(20,28,48,0.12)',
      },
    }, '+')
  );
}

function ActMap({ x, y, size, seed, alpha, reveal }) {
  const T = useComposition().A; // shimmer runs on the ambient clock
  const n = 8, c = size / n, cells = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const order = (i * n + j) / (n * n);
      const on = clamp((reveal - order) * 6, 0, 1);
      if (on <= 0) continue;
      const v = 0.5
        + 0.42 * Math.sin(i * 0.85 + seed * 2.1 + T * 1.5)
        * Math.cos(j * 1.05 - seed * 1.3 + T * 1.15)
        + 0.16 * Math.sin((i + j) * 2.2 + T * 2.6 + seed);
      const a = clamp(v, 0, 1) * alpha * on;
      cells.push(R.createElement('div', {
        key: i + '-' + j,
        style: {
          position: 'absolute', left: j * c, top: i * c, width: c + 0.6, height: c + 0.6,
          background: 'rgba(34,165,153,' + (a * 0.92).toFixed(3) + ')',
        },
      }));
    }
  }
  return R.createElement('div', {
    style: {
      position: 'absolute', left: x, top: y, width: size, height: size, opacity: alpha,
      background: '#EAF7F5', borderRadius: 4, overflow: 'hidden',
      outline: '1px solid rgba(34,165,153,' + (0.34 * alpha).toFixed(2) + ')', outlineOffset: -1,
    },
  }, cells);
}

function DiTBlock({ T, op, cue, k, textOp }) {
  const A = useComposition().A; // rows keep lighting up on the ambient clock
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const lit = clamp(Math.sin((A - cue) * 2.0 - i * 0.55) * 1.4, 0, 1) * clamp((T - cue - 0.5) * 2, 0, 1);
    rows.push(R.createElement('div', {
      key: i,
      style: {
        flex: 1, minHeight: 6, borderRadius: 3,
        background: 'rgba(34,165,153,' + (0.09 + lit * 0.42).toFixed(3) + ')',
        outline: '1px solid rgba(34,165,153,' + (0.22 + lit * 0.40).toFixed(3) + ')', outlineOffset: -1,
      },
    }));
  }
  return R.createElement('div', {
    style: {
      position: 'absolute', left: DIT_X, top: DIT_Y, width: DIT_W, height: DIT_H,
      opacity: op, borderRadius: 8, background: '#F6FCFB',
      outline: '1px solid rgba(34,165,153,0.36)', outlineOffset: -1,
      padding: '14px 16px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(20,28,48,0.12)',
    },
  },
    R.createElement('div', {
      style: {
        font: '400 ' + Math.min(FS_S * k, 30) + 'px/1.1 ' + BODY, color: '#1B8A80', marginBottom: 2, whiteSpace: 'nowrap',
        opacity: textOp == null ? 1 : textOp,
      },
    }, 'DiT blocks'),
    rows
  );
}

function Piece({ labelMode, layout }) {
  const classic = layout === 'classic';
  const H = classic ? 1080 : SH;
  const { T, CUES, authoredTotal, focus } = useComposition();
  const C = CUES;

  const keys = [
    { t: 0, x: GT_X + TW / 2, y: CY + 20, s: 1.7 },
    { t: C.Encode - 0.6, x: GT_X + TW / 2, y: CY + 20, s: 1.7 },
    { t: C.Encode + 0.6, x: 293, y: CY + 20, s: 1.75 },
    { t: C.Noise - 0.6, x: 293, y: CY + 20, s: 1.75 },
    { t: C.Noise + 0.7, x: NOISE_X + LW / 2, y: CY + 4, s: 1.72 },
    { t: C.Capture - 0.6, x: NOISE_X + LW / 2, y: CY + 4, s: 1.72 },
    { t: C.Capture + 0.7, x: ACT_CX, y: 365, s: 0.97 },
    { t: C.Probe - 0.6, x: ACT_CX, y: 365, s: 0.97 },
    { t: C.Probe + 0.7, x: (DIT_X + WORLD_W) / 2, y: 365, s: 1.0 },
    { t: C.Overview - 0.6, x: (DIT_X + WORLD_W) / 2, y: 365, s: 1.0 },
    { t: C.Overview + 0.9, x: WORLD_W / 2, y: 350, s: 0.66 },
    { t: C.Overview + 60, x: WORLD_W / 2, y: 350, s: 0.66 },
  ];
  // Held from the phase bar: keep the phase's settled framing the whole time,
  // so neither the pan into it nor the one out of it ever shows.
  const settled = focus == null ? null : keys.find((q) => q.t > focus + 1e-6);
  const cm = settled || cam(T, keys);
  const S = cm.s * F * (classic ? 0.9 : 1);

  const worldOp = 1;

  // Noise station: sweep every step t = 100..1000, then settle on HOLD_T.
  const u = T - C.Noise;
  const L = 9 * ramp(T, C.Noise + 0.5, C.Noise + 3.7, (x) => x);
  const settle = ramp(T, C.Noise + 3.95, C.Noise + 4.5, MOTION.glide);
  const noiseOp = (i) => (i === 0 ? 1 : clamp(L - i + 1, 0, 1)) * (i > HOLD_I ? 1 - settle : 1);
  const curI = settle > 0.5 ? HOLD_I : Math.round(L);
  const tLabel = R.createElement('span', null, mi('t'), mr(' = ' + (curI + 1) * 100));
  const tFrac = ((L + 1) / 10) * (1 - settle) + ((HOLD_I + 1) / 10) * settle;

  const app = (t0) => ramp(T, t0, t0 + 0.55);
  const rise = (t0) => (1 - ramp(T, t0, t0 + 0.55)) * 14;

  const actReveal = clamp((T - C.Capture - 1.2) / 1.6, 0, 1);
  const actAlpha = ramp(T, C.Capture + 1.0, C.Capture + 1.8);

  // Text and feature maps must never be sliced by the frame edge. Fade them
  // from where they actually project on screen under the current camera, so
  // this holds through any camera retune (and self-restores in the wide shot).
  // k converts on-screen px to world px, so type stays at 12 / 10 pt on the slide.
  // 'scale' mode: type is 12 / 10 pt while zoomed in (S >= REF_S) and shrinks
  // with the camera when it zooms out, staying proportional to the diagram.
  const REF_S = 1.3;
  // Default: type is fixed in world units, sized to 12 / 10 pt at the opening
  // zoom, so it scales with the diagram as the camera moves.
  const S0 = keys[0].s * F;
  // classic: constant on screen while zoomed in, shrinks with the diagram in the wide shot
  const k = classic ? 1.1 / Math.max(S, 1.15) : labelMode === 'scale' ? 1 / Math.max(S, REF_S) : 1.7 / S0;
  const edge = (wx, halfW) => {
    const sx = (wx - cm.x) * S + SW / 2, hw = halfW * S; // horizontal only
    return Math.min(
      clamp((sx - hw - 6) / 30, 0, 1),
      clamp((SW - (sx + hw) - 6) / 30, 0, 1)
    );
  };
  // Test the real text extent, not the 260px label container: the container
  // overhangs the glyphs by ~45px a side and would fade labels that are
  // comfortably inside the frame.
  const glyphHalf = (title, tag) => Math.max(
    (title || '').length * 0.52 * FS,
    (tag || '').length * 0.52 * FS_S
  ) * k / 2;
  const eLbl = (wx, title, tag) => edge(wx, Math.min(glyphHalf(title, tag), LBL_W / 2));
  // Grouped units leave frame together rather than tearing apart.
  const eDiT = edge(DIT_X + DIT_W / 2, DIT_W / 2);
  const kb = Math.min(k, 1 / 1.1); // in-box type never outgrows its box

  return R.createElement('div', {
    style: { position: 'absolute', inset: 0, overflow: 'hidden', background: C_BG },
  },
    R.createElement('div', {
      style: {
        position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 700,
        transformOrigin: '0 0', opacity: worldOp,
        transform: 'translate(' + (SW / 2 - cm.x * S) + 'px,' + ((classic ? (H + 250) / 2 : H / 2) - cm.y * S) + 'px) scale(' + S + ')',
      },
    },
      /* connectors */
      R.createElement(Conn, { k, x1: NZ_ARR, x2: NOISE_X, y: CY, at: C.Noise + 0.2, color: C_LINE, T }),
      R.createElement(Conn, { k, x1: DIT_ARR, x2: DIT_X, y: CY, at: C.Capture + 0.2, color: C_LINE, T }),
      R.createElement(Conn, { k, x1: ZH_ARR, x2: ZHAT_X, y: CY, at: C.Probe + 0.1, label: 'denoise', color: C_LINE, T }),

      /* DiT -> activations tap */
      R.createElement('div', {
        style: {
          position: 'absolute', left: ACT_CX - 1, top: DIT_Y + DIT_H,
          width: 2, height: (ACT_Y - DIT_Y - DIT_H) * ramp(T, C.Capture + 0.7, C.Capture + 1.3, MOTION.glide),
          background: C_ACT, opacity: 0.75,
        },
      }),

      /* pixel space in */
      R.createElement(VTile, { src: 'videos/source.mp4', x: GT_X, y: TY, w: TW, h: TH, opacity: app(-0.3) }),
      R.createElement(Label, { k, cx: GT_X + TW / 2, y: TY + TH + 16, title: 'Ground\u2011truth video', tag: 'pixel space', op: app(0.05) * eLbl(GT_X + TW / 2, 'Ground-truth video', 'pixel space'), dy: rise(0.05) }),

      /* encoder */
      R.createElement(Trapezoid, { x: ENC_X, dir: 'in', label: 'encoder', op: app(C.Encode + 0.15), T, at: C.Encode + 0.15, edgeOp: edge(ENC_X + TRW / 2, 60 * k), k }),

      /* latent space */
      R.createElement(VTile, { src: 'videos/latent.mp4', x: Z0_X, y: LY, w: LW, h: LH, opacity: app(C.Encode + 0.8), border: 'rgba(42,110,219,0.45)' }),
      R.createElement(Label, { k, cx: Z0_X + LW / 2, y: LY + LH + 16, title: 'Clean latent', tag: R.createElement('span', null, mi('z'), msub('0')), op: app(C.Encode + 1.05) * eLbl(Z0_X + LW / 2, 'Clean latent', 'z\u2080'), dy: rise(C.Encode + 1.05), color: C_DATA }),

      R.createElement(NoiseNode, { cx: NZ_ARR + 60, at: C.Noise + 0.5, T, op: app(C.Noise + 0.4) * edge(NZ_ARR + 60, 24) }),

      NOISE_SRC.map((src, i) => R.createElement(VTile, { key: src, src, flat: i > 0, x: NOISE_X, y: LY, w: LW, h: LH, opacity: noiseOp(i) * app(C.Noise + 0.5), border: 'rgba(193,116,26,0.45)' })),
      R.createElement('div', {
        style: {
          position: 'absolute', left: NOISE_X + 26, top: LY + LH + 16, width: LW - 52, height: 3,
          background: 'rgba(193,116,26,0.22)', borderRadius: 3, opacity: app(C.Noise + 1.0) * edge(NOISE_X + LW / 2, (LW - 52) / 2),
        },
      },
        R.createElement('div', {
          style: {
            position: 'absolute', left: 'calc(' + (tFrac * 100) + '% - 4px)', top: -3, width: 9, height: 9,
            borderRadius: 9, background: C_NOISE, boxShadow: '0 1px 4px rgba(20,28,48,0.2)',
          },
        })
      ),
      R.createElement(Label, { k, cx: NOISE_X + LW / 2, y: LY + LH + 32, title: 'Noised latent', tag: tLabel, op: app(C.Noise + 1.1) * eLbl(NOISE_X + LW / 2, 'Noised latent', 't = 500'), dy: rise(C.Noise + 1.1), color: C_NOISE }),

      /* DiT + activations */
      R.createElement(DiTBlock, { T, op: app(C.Capture + 0.3), cue: C.Capture, k, textOp: eDiT }),
      R.createElement(Label, { k, above: true, cx: ACT_CX, y: DIT_Y - 10 * k, title: 'Diffusion transformer', tag: null, op: app(C.Capture + 0.5) * eLbl(ACT_CX, 'Diffusion transformer', null), dy: rise(C.Capture + 0.5) }),

      R.createElement(ActMap, { x: ACT_X, y: ACT_Y, size: ACT_S, seed: 0.3, T, alpha: actAlpha, reveal: actReveal }),
      R.createElement(ActMap, { x: ACT_X + ACT_S + ACT_GAP, y: ACT_Y, size: ACT_S, seed: 1.7, T, alpha: actAlpha, reveal: clamp(actReveal - 0.12, 0, 1) }),
      R.createElement(ActMap, { x: ACT_X + (ACT_S + ACT_GAP) * 2, y: ACT_Y, size: ACT_S, seed: 3.1, T, alpha: actAlpha, reveal: clamp(actReveal - 0.24, 0, 1) }),
      R.createElement(Label, {
        k, wide: 520, cx: ACT_CX, y: ACT_Y + ACT_S + 16,
        title: 'Activations we read out', tag: 'what the probe sees',
        op: app(C.Capture + 2.0) * eLbl(ACT_CX, 'Activations we read out', 'what the probe sees'), dy: rise(C.Capture + 2.0), color: C_ACT,
      }),

      /* denoised latent -> decoder -> pixel space out */
      R.createElement(VTile, { src: 'videos/latent.mp4', x: ZHAT_X, y: LY, w: LW, h: LH, opacity: app(C.Probe + 0.15), border: 'rgba(42,110,219,0.45)' }),
      R.createElement(Label, { k, cx: ZHAT_X + LW / 2, y: LY + LH + 16, title: 'Denoised latent', tag: R.createElement('span', null, mhat('z'), msub('0')), op: app(C.Probe + 0.4) * eLbl(ZHAT_X + LW / 2, 'Denoised latent', '\u1e91\u2080'), dy: rise(C.Probe + 0.4), color: C_DATA }),

      R.createElement(Conn, { k, x1: ACT_X + ACT_S * 3 + ACT_GAP * 2 + 16, x2: PR_X - 4, y: RD_Y, at: C.Probe + 0.7, label: 'pool', color: C_ACT, T }),
      R.createElement('div', { style: {
        position: 'absolute', left: PR_X, top: PR_Y, width: PR_W, height: PR_H, borderRadius: 10,
        border: '2px solid ' + C_TEXT, background: C_BG, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * k,
        opacity: app(C.Probe + 1.1), boxShadow: '0 8px 24px rgba(20,28,48,0.10)',
      } },
        R.createElement('div', { style: { font: '400 ' + FS * kb + 'px/1.2 ' + BODY, color: C_TEXT, whiteSpace: 'nowrap' } }, 'Linear probe'),
        R.createElement('div', { style: { font: '400 ' + FS_S * kb + 'px/1.2 ' + BODY, color: C_DIM, whiteSpace: 'nowrap' } }, 'ridge regression')
      ),
      R.createElement(Conn, { k, x1: PR_X + PR_W + 6, x2: TG_X - 4, y: RD_Y, at: C.Probe + 1.6, color: C_LINE, T }),
      R.createElement('div', { style: {
        position: 'absolute', left: TG_X, top: PR_Y, width: TG_W, height: PR_H, borderRadius: 10,
        background: '#EAF7F5', border: '2px solid ' + C_ACT, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: '400 ' + FS * 1.4 * kb + 'px/1 ' + BODY, color: '#1B8A80',
        opacity: app(C.Probe + 2.0), transform: 'scale(' + (0.9 + 0.1 * ramp(T, C.Probe + 2.0, C.Probe + 2.6, MOTION.pop)) + ')',
      } }, mhat('y')),
      R.createElement(Label, { k, cx: TG_X + TG_W / 2, y: PR_Y + PR_H + 16, title: 'Physical target', tag: null, op: app(C.Probe + 2.2) * eLbl(TG_X + TG_W / 2, 'Physical target', null), dy: rise(C.Probe + 2.2) })
    ),
    classic ? (() => {
      const steps = [
        ['Source', 'Ground truth', 'We start from a ground-truth video of the scene.'],
        ['Encode', 'Encode', 'The VAE encoder compresses the video into a smaller latent video.'],
        ['Noise', 'Forward noising', 'Noise is added to the latent.'],
        ['Capture', 'Capture activations', 'The noised latent passes through the diffusion transformer, and we record its block activations.'],
        ['Probe', 'Linear probe', 'The activations are pooled, and a ridge regression maps them to a physical target quantity.'],
        ['Overview', 'Overview', 'The full probing pipeline, end to end.'],
      ];
      const ends = steps.map((st, i) => (i + 1 < steps.length ? CUES[steps[i + 1][0]] : authoredTotal));
      return R.createElement('div', { style: { position: 'absolute', left: 96, top: 72, right: 96, height: 150 } },
        steps.map((st, i) => {
          const t0 = CUES[st[0]], t1 = ends[i];
          const op = ramp(T, t0 + 0.05, t0 + 0.6) * (1 - (i + 1 < steps.length ? ramp(T, t1 - 0.35, t1 - 0.02) : 0));
          if (op <= 0.001) return null;
          return R.createElement('div', { key: st[0], style: { position: 'absolute', left: 0, top: 0, right: 0, opacity: op, transform: 'translateY(' + (1 - ramp(T, t0 + 0.05, t0 + 0.6)) * 12 + 'px)' } },
            R.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 18, whiteSpace: 'nowrap' } },
              R.createElement('span', { style: { font: '600 48px/1.15 ' + HEAD, color: C_ACT } }, String(i + 1)),
              R.createElement('span', { style: { font: '500 48px/1.15 ' + HEAD, color: C_TEXT, letterSpacing: '-0.01em' } }, st[1])
            ),
            R.createElement('div', { style: { font: '400 ' + FS + 'px/1.4 ' + BODY, color: C_DIM, marginTop: 14, maxWidth: 1500, textWrap: 'pretty' } }, st[2])
          );
        })
      );
    })() : null
  );
}

function Pipeline(props) {
  const layout = props && props.layout;
  return R.createElement(CompositionStage, {
    width: SW, height: layout === 'classic' ? 1080 : SH, scenes: window.OM_SCENES, playback: window.OM_PLAYBACK, bg: C_BG,
    lead: 0.4, // hold a phase 0.4 s before its end: everything has popped in, the heading has not begun to fade
  }, R.createElement(Piece, { labelMode: props && props.labelMode, layout }));
}

window.Pipeline = Pipeline;

})();
