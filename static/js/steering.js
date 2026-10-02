// Steering explorer: a strength slider over a stack of pre-rendered clips.
// The #steer-demo element declares the clip set via data-pattern ("{level}"
// is substituted), data-levels and data-ar. A level
// written "label=file.mp4" shows label on the slider and uses file.mp4 as is,
// for a clip that doesn't follow the pattern (e.g. an unsteered baseline).
//
// Every level is stacked in one cell and kept playing in
// lockstep with the visible one, so moving the slider only swaps which clip is
// shown and never seeks or restarts. Lockstep is held by nudging playbackRate
// rather than seeking, since seeking needs HTTP Range support from the server
// (without it the browser jumps back to 0); a hard seek is used only for large
// drift, and only when the target time is actually seekable.
//
// Clips are aligned by playback fraction, not seconds, and each plays at
// (its duration / the set's shortest duration) so they all run at one pace:
// a clip with the same frames at a lower fps tag (hence longer) is sped up.
(function () {
  var root = document.getElementById('steer-demo');
  if (!root) return;

  var stage = root.querySelector('.steer-stage');
  var range = root.querySelector('.steer-range');
  var out = root.querySelector('#steer-value');
  var ticks = root.querySelector('.steer-ticks');
  var levels = [];
  var level = 0;
  var slots = [];
  var inView = true;

  function levelsOf(el) {
    return el.dataset.levels.split(',').map(function (s) {
      var parts = s.trim().split('=');
      return { label: parts[0], file: parts.length > 1 ? parts[1] : null };
    });
  }
  function fileFor(lv) { return lv.file || root.dataset.pattern.replace('{level}', lv.label); }
  function videoOf(slot) { return slot.querySelector('video'); }
  function master() { return videoOf(slots[level]); }

  // Shortest known clip duration in the current set: the common loop period.
  function period() {
    var p = Infinity;
    slots.forEach(function (s) { var d = videoOf(s).duration; if (d > 0 && d < p) p = d; });
    return isFinite(p) ? p : 0;
  }

  function canSeek(v, t) {
    for (var i = 0; i < v.seekable.length; i++) {
      if (t >= v.seekable.start(i) && t <= v.seekable.end(i)) return true;
    }
    return false;
  }

  // Pull every hidden clip toward the visible one's playback position.
  function sync() {
    if (!slots.length) return;
    var m = master(), P = period();
    if (m.readyState < 1 || !P) return;
    var phase = m.currentTime / m.duration;
    m.playbackRate = m.duration / P;
    slots.forEach(function (s) {
      var v = videoOf(s);
      if (v === m || v.readyState < 1 || v.seeking) return;
      if (inView && v.paused) v.play().catch(function () {});
      var base = v.duration / P;
      var dp = phase - v.currentTime / v.duration;
      dp -= Math.round(dp);  // shortest way round the loop
      var d = dp * P;        // drift in seconds of on-screen time
      var target = phase * v.duration;
      if (Math.abs(d) > 0.5 && canSeek(v, target)) {
        v.currentTime = target;
        v.playbackRate = base;
      } else {
        v.playbackRate = Math.abs(d) < 0.02 ? base : base * (1 + Math.max(-0.25, Math.min(0.25, d * 2)));
      }
    });
  }
  setInterval(sync, 100);

  function playAll() {
    slots.forEach(function (s) { videoOf(s).play().catch(function () {}); });
  }
  function pauseAll() {
    slots.forEach(function (s) { videoOf(s).pause(); });
  }

  function buildTicks() {
    ticks.innerHTML = '';
    levels.forEach(function (lv, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.textContent = lv.label;
      b.addEventListener('click', function () { setLevel(i); });
      ticks.appendChild(b);
    });
  }

  function buildStage() {
    levels = levelsOf(root);
    range.max = levels.length - 1;
    buildTicks();

    stage.innerHTML = '';
    slots = levels.map(function (lv, i) {
      var fig = document.createElement('figure');
      fig.className = 'video-slot';
      fig.style.setProperty('--ar', root.dataset.ar || '16 / 9');
      fig.dataset.file = fileFor(lv);
      fig.hidden = i !== level;
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.preload = 'auto';
      v.src = 'static/videos/' + fig.dataset.file;
      fig.appendChild(v);
      stage.appendChild(fig);
      return fig;
    });
    if (inView) playAll();
    showLevel(level);
  }

  function showLevel(i) {
    range.value = i;
    out.textContent = levels[i].label;
    range.setAttribute('aria-valuetext', 'strength ' + levels[i].label);
    Array.prototype.forEach.call(ticks.children, function (b, j) { b.classList.toggle('is-active', j === i); });
  }

  function setLevel(i) {
    i = Math.max(0, Math.min(levels.length - 1, i));
    showLevel(i);
    if (i === level) return;
    slots[level].hidden = true;
    slots[i].hidden = false;
    level = i;
    master().playbackRate = 1;
    if (inView && master().paused) master().play().catch(function () {});
  }

  range.addEventListener('input', function () { setLevel(parseInt(range.value, 10)); });

  // Ten clips decoding at once is fine on screen, wasteful off it.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) playAll(); else pauseAll();
    }).observe(stage);
  }

  buildStage();
})();
