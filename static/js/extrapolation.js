// Extrapolation panel: target clip with the source clip as picture-in-picture (as in the
// paper's transfer figure), plus the transfer chart for the selected scene change and probe.
// "direction" is the mean of the x and y components (tgt CV and recal. alike).
// DATA[cond][probe] = [[quantity, [tgt CV, recal.] per model], ...], 0 dB, GENERATED
// from the paper's appendix table figures/probing/generalization_table.tex
// (experiments: capture/attention-anchor-probes/export_paper_dat.py,
// results/transfer/<model>.csv). tgt CV: probe fitted and read on the target
// scene; recal.: source probe, gain + offset refitted on 10 target videos, scored
// on the other 90. "mean" averages direction (x/y first), speed and momentum.
(function () {
  var root = document.getElementById('xp');
  if (!root) return;

  var MODELS = ['Wan 2.1', 'CogVideoX-1.5', 'Open-Sora 2.0', 'Cosmos-Predict 2.5', 'LingBot-World'];
  var PROBES = { attn: 'attention-weighted', glob: 'global', base: 'input baseline' };
  var CONDS = {
    bg: { src: 'rolling_source', tgt: 'rolling_background', desc: 'Rolling: parquet floor → checkerboard.' },
    shp: { src: 'rolling_source', tgt: 'rolling_shape', desc: 'Rolling: ball → soda can.' },
    psp: { src: 'rolling_source', tgt: 'rolling_perspective', desc: 'Rolling: top-down camera → oblique side view.' },
    cnt: { src: 'collision_source', tgt: 'collision_count', desc: 'Elastic collision: 2 → 5 balls (attention-weighted probe only: a whole-frame feature cannot address one of five balls).' }
  };
  var DATA = {"bg":{"attn":[["direction",[0.985,0.97],[0.99,0.98],[0.955,0.885],[0.98,0.97],[0.98,0.945]],["speed",[0.96,0.85],[0.98,0.94],[0.97,0.88],[0.98,0.95],[0.95,0.85]],["momentum",[0.91,0.6],[0.85,0.41],[0.87,0.8],[0.89,0.77],[0.87,0.56]],["mean",[0.95,0.81],[0.94,0.78],[0.93,0.86],[0.95,0.9],[0.94,0.79]]],"glob":[["direction",[0.805,0.44],[0.955,0.785],[0.865,0.715],[0.935,0.825],[0.935,0.88]],["speed",[0.79,0.56],[0.88,0.54],[0.79,0.38],[0.91,0.74],[0.9,0.77]],["momentum",[0.88,0.61],[0.92,0.68],[0.94,0.83],[0.93,0.77],[0.93,0.77]],["mean",[0.83,0.54],[0.92,0.67],[0.87,0.64],[0.92,0.78],[0.92,0.81]]],"base":[["direction",[0.32,0.275],[0.02,-0.175],[0.415,-0.255],[0.32,0.275],[0.395,0.285]],["speed",[0.31,0.16],[0.38,0.24],[0.19,0.0],[0.31,0.16],[0.1,0.04]],["momentum",[0.85,-0.34],[0.79,0.71],[0.78,-0.1],[0.85,-0.34],[0.75,-0.61]],["mean",[0.49,0.03],[0.4,0.26],[0.46,-0.12],[0.49,0.03],[0.42,-0.09]]]},"shp":{"attn":[["direction",[1.0,0.96],[1.0,0.985],[1.0,0.935],[1.0,0.95],[1.0,0.955]],["speed",[0.98,0.91],[0.99,0.96],[0.99,0.95],[0.99,0.96],[0.98,0.92]],["momentum",[0.98,0.75],[0.99,0.94],[0.99,0.93],[0.99,0.83],[0.98,0.71]],["mean",[0.99,0.87],[0.99,0.96],[0.99,0.94],[0.99,0.91],[0.99,0.86]]],"glob":[["direction",[0.92,0.855],[0.99,0.96],[0.965,0.92],[0.99,0.9],[0.99,0.96]],["speed",[0.93,0.88],[0.97,0.85],[0.95,0.84],[0.97,0.93],[0.97,0.88]],["momentum",[0.93,0.71],[0.97,0.86],[0.95,0.87],[0.97,0.86],[0.97,0.91]],["mean",[0.92,0.81],[0.98,0.89],[0.96,0.88],[0.98,0.9],[0.98,0.91]]],"base":[["direction",[0.85,0.47],[0.48,0.29],[0.885,0.555],[0.85,0.47],[0.845,0.5]],["speed",[0.83,0.57],[0.9,0.82],[0.8,0.34],[0.83,0.57],[0.82,0.48]],["momentum",[0.83,0.57],[0.9,0.86],[0.8,0.29],[0.83,0.57],[0.82,0.53]],["mean",[0.84,0.54],[0.76,0.65],[0.83,0.4],[0.84,0.54],[0.83,0.51]]]},"psp":{"attn":[["direction",[0.93,0.71],[0.96,0.78],[0.945,0.865],[0.945,0.73],[0.925,0.725]],["speed",[0.9,0.46],[0.91,0.44],[0.91,0.42],[0.89,0.54],[0.87,0.49]],["momentum",[0.81,0.55],[0.7,0.49],[0.77,0.49],[0.8,0.55],[0.8,0.47]],["mean",[0.88,0.57],[0.86,0.57],[0.88,0.59],[0.88,0.61],[0.87,0.56]]],"glob":[["direction",[0.705,0.375],[0.845,0.725],[0.815,0.725],[0.84,0.49],[0.805,0.625]],["speed",[0.7,0.38],[0.73,0.44],[0.63,0.42],[0.8,0.47],[0.78,0.49]],["momentum",[0.69,0.52],[0.71,0.46],[0.66,0.49],[0.78,0.42],[0.75,0.47]],["mean",[0.7,0.43],[0.76,0.54],[0.7,0.54],[0.81,0.46],[0.78,0.53]]],"base":[["direction",[0.46,0.13],[0.305,0.095],[0.42,0.155],[0.46,0.13],[0.525,0.255]],["speed",[0.48,-0.31],[0.39,0.24],[0.29,0.04],[0.48,-0.31],[0.43,0.21]],["momentum",[0.65,0.59],[0.5,0.52],[0.5,0.25],[0.65,0.59],[0.54,0.52]],["mean",[0.53,0.14],[0.4,0.29],[0.4,0.15],[0.53,0.14],[0.5,0.33]]]},"cnt":{"attn":[["direction",[0.93,0.925],[0.915,0.91],[0.94,0.93],[0.94,0.93],[0.93,0.915]],["speed",[0.86,0.74],[0.87,0.83],[0.85,0.79],[0.88,0.8],[0.87,0.78]],["momentum",[0.84,0.71],[0.79,0.75],[0.83,0.78],[0.8,0.73],[0.85,0.75]],["mean",[0.88,0.79],[0.86,0.83],[0.87,0.83],[0.87,0.82],[0.88,0.81]]]}};

  function pct(v) { return Math.max(0, Math.min(1, v)) * 100 + '%'; }
  function fmt(v) { return (Math.round(v * 100) / 100 || 0).toFixed(2).replace('-', '−'); }

  function render(el, data) {
    var html = '<div class="xp-legend">' + MODELS.map(function (m, i) {
      return '<span><i class="xp-m' + i + '"></i>' + m + '</span>';
    }).join('') + '<span><i class="xp-ring"></i>fitted on target</span><span><i class="xp-dot"></i>transferred (recal.)</span></div>' +
      '<div class="xp-bar xp-head"><span></span><span class="xp-val">recal. R²</span></div>';
    data.forEach(function (q) {
      html += '<div class="xp-q' + (q[0] === 'mean' ? ' is-mean' : '') + '">' + q[0] + '</div>';
      for (var i = 0; i < MODELS.length; i++) {
        var cv = q[i + 1][0], rc = q[i + 1][1];
        var lo = Math.min(Math.max(cv, 0), Math.max(rc, 0)), hi = Math.max(cv, rc, 0);
        html += '<div class="xp-bar xp-m' + i + '" title="' + MODELS[i] + ' · ' + q[0] +
          ': tgt CV ' + fmt(cv) + ', recal. ' + fmt(rc) + '">' +
          '<span class="xp-track"><span class="xp-gap" style="left:' + pct(lo) + ';width:calc(' + pct(hi) + ' - ' + pct(lo) + ')"></span>' +
          '<span class="xp-ring" style="left:' + pct(cv) + '"></span>' +
          '<span class="xp-dot' + (rc < 0 ? ' is-clipped' : '') + '" style="left:' + pct(rc) + '"></span></span>' +
          '<span class="xp-val">' + fmt(rc) + '</span></div>';
      }
    });
    html += '<div class="xp-axis"><span>0</span><span>R²</span><span>1</span></div>';
    el.innerHTML = html;
  }

  var src = root.querySelector('.xp-src'), tgt = root.querySelector('.xp-tgt');
  var condButtons = root.querySelectorAll('.xp-conds button');
  var probeButtons = root.querySelectorAll('.xp-probes button');
  var cond = 'bg', probe = 'attn';

  // Both clips have the same 81 frames; restart them together when the source
  // ends instead of looping each on its own, so they never drift apart.
  src.addEventListener('ended', function () {
    src.currentTime = tgt.currentTime = 0;
    src.play().catch(function () {}); tgt.play().catch(function () {});
  });

  function update() {
    var avail = DATA[cond][probe] ? probe : 'attn';
    probeButtons.forEach(function (b) {
      b.disabled = !DATA[cond][b.dataset.probe];
      b.setAttribute('aria-pressed', b.dataset.probe === avail);
    });
    root.querySelector('.xp-desc').textContent = CONDS[cond].desc;
    render(root.querySelector('.xp-chart'), DATA[cond][avail]);
  }

  function selectCond(key) {
    var c = CONDS[key];
    cond = key;
    condButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cond === key); });
    if (!src.src.endsWith('xp_' + c.src + '.mp4')) src.src = 'static/videos/xp_' + c.src + '.mp4';
    tgt.src = 'static/videos/xp_' + c.tgt + '.mp4';
    src.currentTime = 0;
    src.play().catch(function () {}); tgt.play().catch(function () {});
    update();
  }
  condButtons.forEach(function (b) { b.addEventListener('click', function () { selectCond(b.dataset.cond); }); });
  probeButtons.forEach(function (b) { b.addEventListener('click', function () { probe = b.dataset.probe; update(); }); });
  selectCond('bg');
})();
