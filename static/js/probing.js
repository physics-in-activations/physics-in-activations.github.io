// Main probing result: ROI probe R^2 from DiT activations vs. the two latent
// baselines, across input noise. One noise slider drives both the input tiles
// (noised latent) and the marker in every chart; buttons pick the model.
// Numbers from the paper's decodability_lines_sweep.dat: r2 = mean over 10
// transformer blocks, lo/hi = their min/max, ztc = probe on [z_t | z_c],
// z0 = probe on the clean latent (constant in noise).
(function () {
  var root = document.getElementById('probe-results');
  if (!root) return;

  var DB = [-40, -20, -8, 0, 8, 16];
  // Latent clips per model (rolling room, clip 00000): z0 and z_t at each of
  // the six levels, rendered with one PCA colour basis per model fitted on z0.
  var MODELS = { wan: 'Wan 2.1', cog: 'CogVideoX-1.5', sora: 'Open-Sora 2.0' };
  var PANELS = [
    ['roll_speed', 'Rolling · speed'],
    ['roll_direction', 'Rolling · direction'],
    ['coll_total_momentum_xy', 'Collision · total momentum'],
    ['coll_approach_angle_deg', 'Collision · approach angle'],
    ['proj_gravity', 'Projectile · gravity'],
    ['proj_launch_angle_deg', 'Projectile · launch angle']
  ];
  var DATA = {
    roll_speed: {"wan":{"r2":[0.734,0.935,0.978,0.984,0.988,0.989],"lo":[0.086,0.767,0.96,0.981,0.986,0.987],"hi":[0.872,0.972,0.986,0.988,0.99,0.991],"ztc":[-0.001,0.188,0.687,0.841,0.891,0.899],"z0":0.902},"cog":{"r2":[0.851,0.908,0.973,0.979,0.988,0.991],"lo":[0.439,0.759,0.956,0.973,0.986,0.989],"hi":[0.923,0.937,0.982,0.987,0.991,0.994],"ztc":[-0.036,0.086,0.689,0.847,0.887,0.902],"z0":0.882},"sora":{"r2":[0.278,0.706,0.758,0.908,0.955,0.962],"lo":[-0.009,0.152,0.651,0.872,0.937,0.957],"hi":[0.397,0.87,0.821,0.933,0.965,0.969],"ztc":[-0.008,-0.019,0.52,0.775,0.867,0.894],"z0":0.887}},
    roll_direction: {"wan":{"r2":[0.864,0.968,0.986,0.988,0.99,0.991],"lo":[0.631,0.9,0.979,0.983,0.985,0.986],"hi":[0.917,0.987,0.992,0.992,0.994,0.994],"ztc":[-0.028,0.155,0.621,0.853,0.926,0.942],"z0":0.944},"cog":{"r2":[0.842,0.919,0.978,0.983,0.991,0.993],"lo":[0.634,0.817,0.973,0.979,0.988,0.991],"hi":[0.918,0.944,0.987,0.991,0.993,0.995],"ztc":[-0.019,0.013,0.333,0.647,0.796,0.847],"z0":0.835},"sora":{"r2":[0.628,0.785,0.816,0.883,0.933,0.949],"lo":[0.567,0.673,0.756,0.864,0.925,0.946],"hi":[0.681,0.837,0.859,0.905,0.938,0.952],"ztc":[-0.028,0.133,0.748,0.888,0.921,0.932],"z0":0.924}},
    coll_total_momentum_xy: {"wan":{"r2":[0.536,0.705,0.729,0.744,0.736,0.736],"lo":[0.413,0.648,0.662,0.659,0.629,0.621],"hi":[0.615,0.771,0.799,0.813,0.823,0.82],"ztc":[0.017,0.103,0.39,0.507,0.554,0.568],"z0":0.619},"cog":{"r2":[0.499,0.763,0.75,0.763,0.766,0.78],"lo":[0.4,0.697,0.699,0.704,0.685,0.683],"hi":[0.595,0.783,0.779,0.832,0.837,0.834],"ztc":[0.009,0.003,0.055,0.218,0.384,0.431],"z0":0.497},"sora":{"r2":[0.099,0.452,0.487,0.579,0.648,0.69],"lo":[-0.009,0.129,0.445,0.534,0.595,0.651],"hi":[0.196,0.628,0.528,0.657,0.732,0.768],"ztc":[0.012,0.094,0.463,0.587,0.611,0.608],"z0":0.672}},
    coll_approach_angle_deg: {"wan":{"r2":[0.21,0.538,0.565,0.541,0.479,0.489],"lo":[0.087,0.364,0.391,0.344,0.275,0.323],"hi":[0.302,0.739,0.767,0.756,0.73,0.695],"ztc":[-0.024,-0.025,-0.055,-0.053,0.016,0.016],"z0":0.06},"cog":{"r2":[0.019,0.371,0.324,0.329,0.337,0.335],"lo":[-0.047,0.173,0.1,0.104,0.113,0.138],"hi":[0.095,0.688,0.706,0.718,0.691,0.645],"ztc":[-0.018,-0.015,0.002,0.021,0.036,0.036],"z0":0.031},"sora":{"r2":[0.015,0.06,0.005,0.032,0.074,0.088],"lo":[-0.039,-0.023,-0.03,-0.017,0.029,0.03],"hi":[0.046,0.149,0.032,0.107,0.133,0.142],"ztc":[-0.023,-0.02,-0.152,0.055,0.137,0.141],"z0":0.114}},
    proj_gravity: {"wan":{"r2":[0.257,0.814,0.907,0.919,0.923,0.926],"lo":[0.175,0.668,0.891,0.902,0.906,0.909],"hi":[0.294,0.884,0.926,0.942,0.945,0.949],"ztc":[-0.014,-0.022,0.123,0.268,0.312,0.335],"z0":0.49},"cog":{"r2":[0.189,0.646,0.887,0.902,0.911,0.917],"lo":[0.151,0.295,0.846,0.874,0.888,0.898],"hi":[0.215,0.743,0.931,0.946,0.948,0.947],"ztc":[-0.012,-0.018,0.073,0.214,0.298,0.345],"z0":0.411},"sora":{"r2":[0.216,0.317,0.337,0.607,0.835,0.868],"lo":[0.073,0.153,0.192,0.571,0.795,0.832],"hi":[0.255,0.499,0.42,0.66,0.857,0.892],"ztc":[-0.014,-0.02,0.139,0.3,0.409,0.469],"z0":0.672}},
    proj_launch_angle_deg: {"wan":{"r2":[0.407,0.908,0.948,0.946,0.938,0.934],"lo":[0.265,0.775,0.929,0.92,0.916,0.914],"hi":[0.499,0.942,0.965,0.964,0.957,0.952],"ztc":[-0.01,-0.027,0.125,0.252,0.285,0.281],"z0":0.387},"cog":{"r2":[0.458,0.782,0.904,0.917,0.927,0.936],"lo":[0.359,0.574,0.872,0.881,0.898,0.916],"hi":[0.516,0.829,0.957,0.965,0.969,0.963],"ztc":[-0.012,-0.009,0.173,0.333,0.385,0.421],"z0":0.457},"sora":{"r2":[0.221,0.468,0.584,0.825,0.874,0.886],"lo":[0.077,0.23,0.484,0.741,0.796,0.837],"hi":[0.331,0.546,0.68,0.872,0.904,0.919],"ztc":[-0.013,-0.022,0.077,0.179,0.178,0.194],"z0":0.271}}
  };

  // Chart geometry (SVG user units).
  var W = 220, H = 140, L = 30, R = 8, T = 8, B = 22;
  function x(db) { return L + (db + 40) / 56 * (W - L - R); }
  function y(v) { return T + (1 - (Math.max(-0.1, v) + 0.1) / 1.1) * (H - T - B); }
  function path(vals) {
    return vals.map(function (v, i) { return (i ? 'L' : 'M') + x(DB[i]).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
  }
  function fmt(v) { return (Math.round(v * 100) / 100 || 0).toFixed(2).replace('-', '−'); }

  var model = 'wan', level = 3;
  var grid = root.querySelector('.pr-grid');
  var noiseVid = root.querySelector('.pr-noised');
  var cleanVid = root.querySelector('.pr-clean');
  var range = root.querySelector('.pr-range');
  var out = root.querySelector('.pr-db');
  var buttons = root.querySelectorAll('.pr-models button');

  function draw() {
    grid.innerHTML = PANELS.map(function (p) {
      var d = DATA[p[0]][model];
      var band = path(d.hi) + d.lo.slice().reverse().map(function (v, i) {
        return 'L' + x(DB[DB.length - 1 - i]).toFixed(1) + ' ' + y(v).toFixed(1);
      }).join('') + 'Z';
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + p[1] + ', ' + MODELS[model] + '">';
      [0, 0.5, 1].forEach(function (g) {
        svg += '<line class="pr-gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>' +
          '<text class="pr-tick" x="' + (L - 5) + '" y="' + (y(g) + 3) + '" text-anchor="end">' + g + '</text>';
      });
      [-40, -20, 0, 16].forEach(function (t) {
        svg += '<text class="pr-tick" x="' + x(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + t + '</text>';
      });
      svg += '<line class="pr-marker" x1="' + x(DB[level]) + '" x2="' + x(DB[level]) + '" y1="' + T + '" y2="' + (H - B) + '"/>' +
        '<path class="pr-band" d="' + band + '"/>' +
        '<line class="pr-z0" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(d.z0) + '" y2="' + y(d.z0) + '"/>' +
        '<path class="pr-ztc" d="' + path(d.ztc) + '"/>' +
        '<path class="pr-dit" d="' + path(d.r2) + '"/>' +
        '<circle class="pr-dot" cx="' + x(DB[level]) + '" cy="' + y(d.r2[level]) + '" r="3.5"/></svg>';
      return '<figure class="pr-panel"><figcaption>' + p[1] + '</figcaption>' + svg +
        '<div class="pr-read"><span class="pr-k-dit">DiT ' + fmt(d.r2[level]) + '</span>' +
        '<span>z<sub>tc</sub> ' + fmt(d.ztc[level]) + '</span><span>z<sub>0</sub> ' + fmt(d.z0) + '</span></div></figure>';
    }).join('');
  }

  function dbText(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v) + ' dB'; }

  // Swap a clip's source but keep its playback position, so moving the slider
  // or switching model doesn't restart the loop.
  function swap(v, src) {
    var t = v.currentTime;
    v.src = src;
    v.currentTime = t;
    v.play().catch(function () {});
  }

  function update() {
    out.textContent = dbText(DB[level]);
    swap(noiseVid, 'static/videos/latents/' + model + '_zt' + level + '.mp4');
    draw();
  }

  function setLevel(i) { level = i; update(); }

  range.addEventListener('input', function () { setLevel(+range.value); });
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      model = b.dataset.model;
      root.style.setProperty('--pr-c', 'var(--m-' + model + ')');
      buttons.forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      swap(cleanVid, 'static/videos/latents/' + model + '_z0.mp4');
      update();
    });
  });
  setLevel(+range.value);
})();
