// Extrapolation panel: source and target clip under one wipe slider, plus the
// transfer chart for the selected scene change.
// Per quantity and model: [tgt CV, recal.] R^2 of the ROI arm, from the paper's
// appendix table (generalization.dat).
(function () {
  var root = document.getElementById('xp');
  if (!root) return;

  var MODELS = ['Wan 2.1', 'CogVideoX-1.5', 'Open-Sora 2.0'];
  var CONDS = {
    bg: { src: 'rolling_source', tgt: 'rolling_background', desc: 'Rolling: parquet floor → checkerboard.',
      data: [['dir-x', [0.99, 0.97], [0.99, 0.94], [0.89, -0.03]],
        ['dir-y', [0.99, 0.98], [0.99, 0.92], [0.88, 0.00]],
        ['speed', [0.99, 0.88], [0.99, 0.89], [0.93, 0.06]],
        ['momentum', [0.93, 0.63], [0.89, 0.48], [0.93, 0.03]]] },
    shp: { src: 'rolling_source', tgt: 'rolling_shape', desc: 'Rolling: ball → soda can.',
      data: [['dir-x', [1.00, 0.93], [1.00, 0.93], [0.98, 0.49]],
        ['dir-y', [1.00, 0.87], [1.00, 0.94], [0.99, 0.79]],
        ['speed', [0.99, 0.94], [0.99, 0.93], [0.98, 0.72]],
        ['momentum', [0.99, 0.83], [0.99, 0.57], [0.98, 0.58]]] },
    psp: { src: 'rolling_source', tgt: 'rolling_perspective', desc: 'Rolling: top-down camera → frontal view.',
      data: [['dir-x', [0.97, 0.91], [0.97, 0.91], [0.83, 0.13]],
        ['dir-y', [0.96, 0.84], [0.95, 0.45], [0.78, 0.17]],
        ['speed', [0.91, 0.54], [0.92, 0.47], [0.55, 0.05]],
        ['momentum', [0.78, 0.46], [0.79, 0.40], [0.66, 0.05]]] },
    cnt: { src: 'collision_source', tgt: 'collision_count', desc: 'Elastic collision: 2 → 5 balls.',
      data: [['dir-x', [0.98, 0.98], [0.98, 0.96], [0.62, 0.30]],
        ['dir-y', [0.98, 0.97], [0.98, 0.95], [0.70, 0.45]],
        ['speed', [0.96, 0.93], [0.96, 0.92], [0.60, 0.32]],
        ['momentum', [0.91, 0.80], [0.90, 0.82], [0.71, 0.31]]] }
  };

  function pct(v) { return Math.max(0, Math.min(1, v)) * 100 + '%'; }
  function fmt(v) { return v.toFixed(2).replace('-', '−'); }

  function render(el, data) {
    var html = '<div class="xp-legend">' + MODELS.map(function (m, i) {
      return '<span><i class="xp-m' + i + '"></i>' + m + '</span>';
    }).join('') + '<span><i class="xp-ring"></i>trained on target</span><span><i class="xp-dot"></i>transferred (recal.)</span></div>' +
      '<div class="xp-bar xp-head"><span></span><span class="xp-val">recal. R\u00b2</span></div>';
    data.forEach(function (q) {
      html += '<div class="xp-q">' + q[0] + '</div>';
      for (var i = 0; i < 3; i++) {
        var cv = q[i + 1][0], rc = q[i + 1][1];
        var lo = Math.min(cv, Math.max(rc, 0)), hi = Math.max(cv, rc);
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

  var compare = root.querySelector('.xp-compare');
  var src = root.querySelector('.xp-src'), tgt = root.querySelector('.xp-tgt');
  var wipe = root.querySelector('.xp-wipe');
  var buttons = root.querySelectorAll('.xp-swaps button');

  function setWipe() { compare.style.setProperty('--wipe', wipe.value + '%'); }
  wipe.addEventListener('input', setWipe);
  setWipe();

  // Both clips have the same 81 frames; restart them together when the source
  // ends instead of looping each on its own, so they never drift apart.
  src.addEventListener('ended', function () {
    src.currentTime = tgt.currentTime = 0;
    src.play(); tgt.play();
  });

  function select(key) {
    var c = CONDS[key];
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cond === key); });
    if (!src.src.endsWith('xp_' + c.src + '.mp4')) src.src = 'static/videos/xp_' + c.src + '.mp4';
    tgt.src = 'static/videos/xp_' + c.tgt + '.mp4';
    src.currentTime = 0;
    src.play(); tgt.play();
    root.querySelector('.xp-desc').textContent = c.desc;
    render(root.querySelector('.xp-chart'), c.data);
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.cond); }); });
  select('bg');
})();
