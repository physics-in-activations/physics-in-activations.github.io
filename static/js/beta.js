/* Steering vs readout explorer: one probing weight beta, the paper's Wan block-21 stills
   (beta 0 = steering only, 0.5 = joint, 1 = ridge probe; in between cross-fades the two nearest),
   and an outline at the end position the direction's linear readout predicts.
   Ball end positions are read off the stills; outlines and aggregate curves are illustrative. */
(() => {
  const root = document.getElementById('beta-demo');
  if (!root) return;
  const IMG = 'static/images/beta/';
  const SEEDS = {
    13: { dir: ['left', 'right'], start: [188, 128],
          k: [ { img: 'steer', end: [283, 130], pred: [ 64, 128], pr: 52, turned: true },
               { img: 'joint', end: [305, 135], pred: [298, 131], pr: 29, turned: true },
               { img: 'probe', end: [ 68, 123], pred: [ 71, 125], pr: 18, turned: false } ] },
    1:  { dir: ['left', 'right'], start: [190, 137],
          k: [ { img: 'steer', end: [375, 118], pred: [ 96, 166], pr: 52, turned: true },
               { img: 'joint', end: [388, 137], pred: [380, 132], pr: 29, turned: true },
               { img: 'probe', end: [404, 107], pred: [400, 110], pr: 21, turned: true } ] },
    7:  { dir: ['left', 'right'], start: [190, 135],
          k: [ { img: 'steer', end: [390, 128], pred: [ 22, 142], pr: 52, turned: true },
               { img: 'joint', end: [352, 148], pred: [345, 143], pr: 29, turned: true },
               { img: 'probe', end: [263,  31], pred: [255,  42], pr: 24, turned: null } ] },
    12: { dir: ['right', 'left'], start: [207, 152],
          k: [ { img: 'steer', end: [130,  85], pred: [222, 140], pr: 52, turned: true },
               { img: 'joint', end: [125,  80], pred: [131,  86], pr: 29, turned: true },
               { img: 'probe', end: [225, 137], pred: [222, 135], pr: 22, turned: false } ] },
  };
  const ORDER = [13, 1, 7, 12];
  const TI = [83, 86, 87, 58, 17], IN = [6, 41, 80, 88, 93];   // knots at beta 0, .25, .5, .75, 1

  const $ = s => root.querySelector(s);
  const lerp = (a, b, t) => a + (b - a) * t;
  const knot = (arr, b) => { const x = b * 4, i = Math.min(3, Math.floor(x)); return lerp(arr[i], arr[i + 1], x - i); };
  const set = (e, a) => { for (const k in a) e.setAttribute(k, a[k]); return e; };
  let seed = ORDER[0];

  ORDER.forEach(s => SEEDS[s].k.forEach(k => { new Image().src = `${IMG}seed${s}_${k.img}.jpg`; }));

  const pills = $('.beta-seeds');
  ORDER.forEach(s => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.seed = s;
    b.textContent = `seed ${s} · ${SEEDS[s].dir[0] === 'left' ? '←' : '→'}`;
    b.addEventListener('click', () => { seed = s; render(); });
    pills.appendChild(b);
  });

  const NS = 'http://www.w3.org/2000/svg', mini = $('.beta-mini svg');
  const mk = (t, a) => mini.appendChild(set(document.createElementNS(NS, t), a));
  const L = 26, R = 292, T = 8, B = 108, X = b => L + b * (R - L), Y = v => B - v / 100 * (B - T);
  let lo = null, hi = null;
  for (let i = 0; i <= 100; i++) { const b = i / 100; if (knot(TI, b) >= 75 && knot(IN, b) >= 75) { if (lo === null) lo = b; hi = b; } }
  if (lo !== null) mk('rect', { x: X(lo), y: T, width: X(hi) - X(lo), height: B - T, fill: 'rgb(34 165 153 / .1)' });
  [0, 50, 100].forEach(v => { mk('line', { x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: '#e2e8f0' }); mk('text', { x: L - 4, y: Y(v) + 3, 'text-anchor': 'end' }).textContent = v + '%'; });
  [0, .5, 1].forEach(b => { mk('text', { x: X(b), y: B + 13, 'text-anchor': 'middle' }).textContent = 'β ' + b; });
  const curve = (arr, col) => { let d = ''; for (let i = 0; i <= 50; i++) { const b = i / 50; d += (i ? 'L' : 'M') + X(b).toFixed(1) + ' ' + Y(knot(arr, b)).toFixed(1); } mk('path', { d, fill: 'none', stroke: col, 'stroke-width': 2.2 }); };
  curve(TI, '#e07a2f'); curve(IN, '#2563eb');
  const vline = mk('line', { y1: T, y2: B, stroke: '#0f172a', 'stroke-width': 1, 'stroke-dasharray': '2 3' });
  const dTI = mk('circle', { r: 4, fill: '#e07a2f', stroke: '#fff', 'stroke-width': 1.5 });
  const dIN = mk('circle', { r: 4, fill: '#2563eb', stroke: '#fff', 'stroke-width': 1.5 });

  const range = $('.beta-range'), imA = $('.beta-im-a'), imB = $('.beta-im-b'), ol = $('.beta-outline');
  function render() {
    const b = +range.value, S = SEEDS[seed];
    pills.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', +x.dataset.seed === seed));
    $('.beta-value').textContent = b.toFixed(2);

    const seg = b < .5 ? 0 : 1, t = seg === 0 ? b / .5 : (b - .5) / .5;
    const K0 = S.k[seg], K1 = S.k[seg + 1], dom = t < .5 ? K0 : K1;
    imA.src = `${IMG}seed${seed}_${K0.img}.jpg`;
    imB.src = `${IMG}seed${seed}_${K1.img}.jpg`; imB.style.opacity = t;

    const pc = [lerp(K0.pred[0], K1.pred[0], t), lerp(K0.pred[1], K1.pred[1], t)], rx = lerp(K0.pr, K1.pr, t), ry = rx * .82, end = dom.end;
    set(ol, { cx: pc[0], cy: pc[1], rx, ry });
    const inside = Math.hypot((end[0] - pc[0]) / rx, (end[1] - pc[1]) / ry) <= 1;
    ol.classList.toggle('hit', inside);
    set($('.beta-lab'), { x: Math.max(60, Math.min(356, pc[0])), y: pc[1] - ry - 6 < 12 ? pc[1] + ry + 14 : pc[1] - ry - 6 });
    set($('.beta-start'), { cx: S.start[0], cy: S.start[1] });
    const dx = pc[0] - S.start[0], dy = pc[1] - S.start[1], dl = Math.hypot(dx, dy) || 1, sh = Math.min(ry, dl - 8);
    set($('.beta-path'), { d: `M${S.start[0] + dx / dl * 7} ${S.start[1] + dy / dl * 7}L${pc[0] - dx / dl * sh} ${pc[1] - dy / dl * sh}` });
    const c = 7, [x1, x2] = root.querySelectorAll('.beta-xh');
    set(x1, { x1: end[0] - c, y1: end[1] - c, x2: end[0] + c, y2: end[1] + c });
    set(x2, { x1: end[0] + c, y1: end[1] - c, x2: end[0] - c, y2: end[1] + c });

    const turned = dom.turned;
    const chips = [turned === true ? ['ok', `turned ${S.dir[1]}`] : turned === false ? ['bad', `still rolls ${S.dir[0]}`] : ['warn', 'ambiguous (second ball)'],
                   inside ? ['ok', 'lands in readout outline'] : ['bad', 'misses readout outline']];
    $('.beta-chips').innerHTML = chips.map(([k, s]) => `<span class="beta-chip ${k}">${s}</span>`).join('');
    $('.beta-verdict').innerHTML = turned && inside ? '<b>Steers and reads.</b> The ball turns, and the direction\'s own readout predicts where it ends.'
      : turned ? '<b>Steers, does not read.</b> The ball turns, but the readout still predicts the unsteered motion.'
      : inside ? '<b>Reads, does not steer.</b> The readout predicts the ball well, but injecting the direction barely moves it.'
      : '<b>Neither.</b>';

    const ti = knot(TI, b), inn = knot(IN, b);
    $('.beta-ti').textContent = Math.round(ti) + '%'; $('.beta-in').textContent = Math.round(inn) + '%';
    set(vline, { x1: X(b), x2: X(b) }); set(dTI, { cx: X(b), cy: Y(ti) }); set(dIN, { cx: X(b), cy: Y(inn) });
  }
  range.addEventListener('input', render);
  render();
})();
