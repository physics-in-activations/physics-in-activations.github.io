// Occlusion explorer: dragging the cardboard scrubs the occluded rolling clip (video 163 of 200, among the fastest)
// while a chart shows the attention-weighted probe R^2 per token-frame.
// Data: paper figures/probing/occlusion.dat (experiments: capture/
// attention-anchor-probes/occlusion_summary.py), rolling-room-occluded, n = 200,
// +16 dB, one probe per token-frame, 5-fold video-level CV, R^2 averaged over
// speed, direction and position. Rows: [video frame at token-frame centre,
// median over the 10 report blocks, the model's best block]. Best block (BLOCK):
// the report block with the highest R^2 averaged over the hidden token-frames,
// i.e. selected on the hidden window as in the paper's supplement; its series
// recomputed with occlusion_summary.qmean from results/probe_results/
// rolling-room-occluded__<model>.csv (same computation reproduces occlusion.dat).
(function () {
  var root = document.getElementById('occ-demo');
  if (!root) return;

  var DATA = {"wan":[[0.0,0.905,0.906],[2.5,0.913,0.953],[6.5,0.904,0.941],[10.5,0.912,0.945],[14.5,0.893,0.937],[18.5,0.891,0.898],[22.5,0.182,0.34],[26.5,0.124,0.166],[30.5,-0.071,0.115],[34.5,0.009,0.097],[38.5,-0.045,0.14],[42.5,0.097,0.112],[46.5,0.028,0.119],[50.5,-0.054,0.042],[54.5,-0.021,0.125],[58.5,-0.031,0.032],[62.5,-0.024,0.023],[66.5,-0.052,0.008],[70.5,-0.021,-0.037],[74.5,-0.054,-0.007],[78.5,-0.045,-0.021]],"cog":[[0.0,0.796,0.905],[4.5,0.875,0.95],[12.5,0.889,0.963],[20.5,0.649,0.784],[28.5,0.072,0.625],[36.5,0.032,0.386],[44.5,-0.003,0.346],[52.5,-0.035,0.273],[60.5,-0.006,0.274],[68.5,-0.014,0.225],[76.5,0.011,0.277]],"sora":[[0.0,0.934,0.918],[2.5,0.926,0.932],[6.5,0.912,0.917],[10.5,0.909,0.924],[14.5,0.918,0.928],[18.5,0.877,0.875],[22.5,0.581,0.818],[26.5,0.327,0.725],[30.5,0.132,0.494],[34.5,0.1,0.463],[38.5,0.108,0.402],[42.5,0.09,0.432],[46.5,0.056,0.294],[50.5,0.037,0.302],[54.5,0.04,0.323],[58.5,0.017,0.228],[62.5,0.015,0.22],[66.5,0.046,0.289],[70.5,0.036,0.391],[74.5,0.026,0.408],[78.5,0.022,0.451]],"cos":[[0.0,0.935,0.959],[2.5,0.933,0.958],[6.5,0.927,0.961],[10.5,0.925,0.967],[14.5,0.935,0.964],[18.5,0.913,0.945],[22.5,0.499,0.867],[26.5,0.371,0.834],[30.5,0.334,0.814],[34.5,0.297,0.769],[38.5,0.251,0.754],[42.5,0.248,0.712],[46.5,0.242,0.69],[50.5,0.251,0.725],[54.5,0.257,0.705],[58.5,0.186,0.729],[62.5,0.226,0.682],[66.5,0.246,0.666],[70.5,0.219,0.727],[74.5,0.246,0.758],[78.5,0.147,0.799]],"ling":[[0.0,0.908,0.908],[2.5,0.913,0.962],[6.5,0.889,0.951],[10.5,0.892,0.952],[14.5,0.899,0.932],[18.5,0.863,0.914],[22.5,0.297,0.766],[26.5,-0.037,0.484],[30.5,-0.041,0.391],[34.5,-0.037,0.332],[38.5,0.116,0.497],[42.5,-0.035,0.342],[46.5,-0.056,0.379],[50.5,-0.072,0.325],[54.5,-0.027,0.312],[58.5,-0.033,0.274],[62.5,-0.021,0.344],[66.5,-0.039,0.324],[70.5,-0.013,0.265],[74.5,-0.044,0.332],[78.5,-0.042,0.33]]};
  var BLOCK = {"wan":4,"cog":8,"sora":11,"cos":18,"ling":4};
  // paper colours (videoPlotStyle.sty: modelWan/Cog/Sora/Cos/Ling)
  var MODELS = [
    ['wan', 'Wan 2.1', '#008080'], ['cog', 'CogVideoX-1.5', '#FF8383'],
    ['sora', 'Open-Sora 2.0', '#8768E6'], ['cos', 'Cosmos-Predict 2.5', '#D9A000'],
    ['ling', 'LingBot-World', '#3D3D3D']
  ];
  var FPS = 24, LAST = 80, HIDDEN = 21;           // ball hidden from video frame 21 on
  var W = 560, H = 260, L = 44, R = 12, T = 12, B = 34, YMIN = -0.1, YMAX = 1;
  var NS = 'http://www.w3.org/2000/svg';

  // Fraction of the clip width the cardboard covers, frames 17..24 (measured
  // against the unoccluded twin clip rolling_room_00163; 0 before, 1 after).
  var EDGE = [0, 0.12, 0.279, 0.481, 0.678, 0.851, 0.99, 1], E0 = 17;

  var video = root.querySelector('video');
  var stage = root.querySelector('.occ-stage');
  var sheet = root.querySelector('.occ-sheet');
  var replay = root.querySelector('.occ-replay');
  var out = root.querySelector('#occ-frame');
  var svg = root.querySelector('svg');
  var list = root.querySelector('.occ-readout');
  var col = 1;                                     // 1 = median, 2 = best block

  // Seeking needs HTTP Range support; a blob URL seeks on any server.
  fetch(video.getAttribute('src')).then(function (r) { return r.blob(); })
    .then(function (b) { video.src = URL.createObjectURL(b); }).catch(function () {});

  function x(f) { return L + f / LAST * (W - L - R); }
  function y(r) { r = Math.max(YMIN, Math.min(YMAX, r)); return T + (YMAX - r) / (YMAX - YMIN) * (H - T - B); }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  }

  // static frame: hidden region, gridlines, axes
  el('rect', { x: x(HIDDEN), y: T, width: x(LAST) - x(HIDDEN), height: H - T - B, class: 'occ-hidden' });
  el('text', { x: x(HIDDEN) + 6, y: T + 14, class: 'occ-note' }).textContent = 'ball hidden';
  [0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
    el('line', { x1: L, x2: W - R, y1: y(r), y2: y(r), class: r === 0 ? 'occ-zero' : 'occ-grid' });
    el('text', { x: L - 6, y: y(r) + 4, class: 'occ-tick', 'text-anchor': 'end' }).textContent = r;
  });
  [0, 20, 40, 60, 80].forEach(function (f) {
    el('text', { x: x(f), y: H - B + 16, class: 'occ-tick', 'text-anchor': 'middle' }).textContent = f;
  });
  el('text', { x: (L + W - R) / 2, y: H - 2, class: 'occ-tick', 'text-anchor': 'middle' }).textContent = 'video frame';
  var my = (T + H - B) / 2;
  el('text', { x: 12, y: my, class: 'occ-tick', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + my + ')' })
    .textContent = 'probe R²';

  var lines = MODELS.map(function (m) {
    return el('polyline', { fill: 'none', stroke: m[2], 'stroke-width': 2, 'stroke-linejoin': 'round' });
  });
  var cursor = el('line', { y1: T, y2: H - B, class: 'occ-cursor' });
  var dots = MODELS.map(function (m) { return el('circle', { r: 4, fill: m[2] }); });

  var cells = MODELS.map(function (m) {
    var li = document.createElement('li');
    li.innerHTML = '<i style="background:' + m[2] + '"></i><span>' + m[1] +
      ' <small class="occ-blk">block ' + BLOCK[m[0]] + '</small></span><b></b>';
    list.appendChild(li);
    return li.querySelector('b');
  });

  // token-frame whose centre is nearest the video frame
  function at(series, f) {
    var best = series[0];
    series.forEach(function (p) { if (Math.abs(p[0] - f) < Math.abs(best[0] - f)) best = p; });
    return best;
  }

  function drawLines() {
    MODELS.forEach(function (m, i) {
      lines[i].setAttribute('points', DATA[m[0]].map(function (p) { return x(p[0]) + ',' + y(p[col]); }).join(' '));
    });
  }

  var frame = 0, timer = null, idle = true, inView = true, dragging = false;
  var FULL = E0 + EDGE.length - 1;                 // first fully covered frame

  function cover(f) { return f <= E0 ? 0 : f >= FULL ? 1 : EDGE[f - E0]; }
  // pointer position (fraction of the clip width) -> frame whose edge is nearest
  function frameAt(p) {
    var best = 0;
    EDGE.forEach(function (e, i) { if (Math.abs(e - p) < Math.abs(EDGE[best] - p)) best = i; });
    return E0 + best;
  }

  function show(f) {
    frame = f;
    out.textContent = f >= HIDDEN ? 'frame ' + f + ' · ball hidden' : 'frame ' + f;
    sheet.setAttribute('aria-valuenow', f);
    sheet.setAttribute('aria-valuetext', out.textContent);
    sheet.style.left = cover(f) * 100 + '%';
    root.classList.toggle('is-covered', f >= FULL);
    cursor.setAttribute('x1', x(f)); cursor.setAttribute('x2', x(f));
    MODELS.forEach(function (m, i) {
      var p = at(DATA[m[0]], f);
      dots[i].setAttribute('cx', x(p[0])); dots[i].setAttribute('cy', y(p[col]));
      cells[i].textContent = p[col].toFixed(2);
    });
    if (video.readyState >= 1) video.currentTime = f / FPS + 0.001;
  }

  function stop() { cancelAnimationFrame(timer); timer = null; }
  // step through frames from..to in real time (the clip is seeked, never played)
  function run(from, to, loop) {
    stop();
    var t0 = performance.now();
    (function tick(now) {
      var f = from + Math.floor((now - t0) / 1000 * FPS);
      if (f > to) {
        if (!loop) { show(to); timer = null; return; }
        t0 = now; f = from;
      }
      if (f !== frame) show(f);
      timer = requestAnimationFrame(tick);
    })(t0);
  }
  // before the cardboard is touched, the ball rolls on a loop up to the frame before it enters
  function rest() { idle = true; if (inView) run(0, E0, true); }

  function drag(e) {
    var r = stage.getBoundingClientRect();
    show(frameAt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))));
  }
  stage.addEventListener('pointerdown', function (e) {
    dragging = true; idle = false; stop();
    stage.setPointerCapture(e.pointerId);
    drag(e);
  });
  stage.addEventListener('pointermove', function (e) { if (dragging) drag(e); });
  function release() {
    if (!dragging) return;
    dragging = false;
    if (frame >= FULL) run(frame, LAST, false);    // fully covered: let the clip run to its end
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  sheet.addEventListener('keydown', function (e) {
    var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    var f = e.key === 'Home' ? 0 : e.key === 'End' ? LAST : step === undefined ? null : frame + step;
    if (f === null) return;
    e.preventDefault(); idle = false; stop();
    show(Math.max(0, Math.min(LAST, f)));
  });
  replay.addEventListener('click', rest);

  video.addEventListener('loadedmetadata', function () { show(frame); });
  root.querySelectorAll('input[name="occ-agg"]').forEach(function (r) {
    r.addEventListener('change', function () {
      col = +r.value; root.classList.toggle('is-best', col === 2); drawLines(); show(frame);
    });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (!inView) stop(); else if (idle) rest();
    }).observe(stage);
  }

  drawLines();
  show(0);
  rest();
})();
