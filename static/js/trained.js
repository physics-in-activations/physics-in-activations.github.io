/* Trained-directions explorer: one test seed at a time, its unsteered generation and the
   same seed steered by the ridge probe, the steering-only and the joint direction (Wan 2.1,
   block 21, steps 0-4). All four clips of a seed play stacked and in step; a button only
   changes which one is visible. Outcomes are the scorer's (tracked class, floor drift <= 8). */
(() => {
  const root = document.getElementById('trained-demo');
  if (!root) return;
  const DIR = 'static/videos/trained/';
  // per seed: unsteered class, then [class, floor drift] for probe / steer / joint
  const SEEDS = {
    7:  { base: 'left',  probe: ['ambiguous', 1.8], steer: ['right', 6.0], joint: ['right', 2.9] },
    13: { base: 'left',  probe: ['left', 7.3], steer: ['right', 7.5], joint: ['right', 6.3] },
    8:  { base: 'right', probe: ['right', 1.9], steer: ['left', 2.4], joint: ['right', 1.7] },
    10: { base: 'right', probe: ['right', 5.9], steer: ['centered', 6.6], joint: ['right', 1.6] },
    12: { base: 'right', probe: ['right', 1.8], steer: ['diagonal-left', 2.1], joint: ['diagonal-left', 3.2] },
  };
  const ORDER = [7, 13, 8, 10, 12];
  const KINDS = ['base', 'probe', 'steer', 'joint'];
  let seed = ORDER[0], kind = 'joint';

  const stage = root.querySelector('.tr-stage'), seedBox = root.querySelector('.tr-seeds'),
        dirBtns = root.querySelectorAll('.tr-dirs button'), chips = root.querySelector('.tr-chips'),
        note = root.querySelector('.tr-target');
  let vids = {};

  ORDER.forEach(s => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.seed = s;
    b.textContent = `seed ${s} · ${SEEDS[s].base === 'left' ? '←' : '→'}`;
    b.addEventListener('click', () => { if (s !== seed) { seed = s; load(); } });
    seedBox.appendChild(b);
  });
  dirBtns.forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; show(); }));

  function load() {
    stage.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); });
    vids = {};
    KINDS.forEach(k => {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = `${DIR}seed${seed}_${k}.mp4`;
      stage.appendChild(v); vids[k] = v;
    });
    // keep the four clips in step: restart all together whenever the visible one loops
    let last = 0;
    vids.base.addEventListener('timeupdate', () => {
      const t = vids.base.currentTime;
      if (t < last) KINDS.forEach(k => { if (k !== 'base') vids[k].currentTime = t; });
      last = t;
    });
    seedBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.seed === seed));
    show();
    if (inView) play();
  }
  function play() { KINDS.forEach(k => vids[k] && vids[k].play().catch(() => {})); }

  function show() {
    const t = vids.base && vids.base.currentTime;
    KINDS.forEach(k => {
      const v = vids[k]; v.classList.toggle('is-shown', k === kind);
      if (t && Math.abs(v.currentTime - t) > 0.15) v.currentTime = t;
    });
    dirBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.kind === kind));
    const S = SEEDS[seed], target = S.base === 'left' ? 'right' : 'left';
    note.innerHTML = `Unsteered, the ball rolls <b>${S.base}</b>; every direction pushes it <b>${target}</b>.`;
    if (kind === 'base') { chips.innerHTML = '<span class="tr-chip neutral">reference</span>'; return; }
    const [cls, drift] = S[kind];
    const turned = cls === target || cls === 'diagonal-' + target;
    const out = turned ? ['ok', `turned ${target}`] : cls === S.base ? ['bad', `still rolls ${S.base}`]
              : ['warn', cls === 'centered' ? 'stopped' : cls];
    const intact = drift <= 8 ? ['ok', `scene intact (drift ${drift.toFixed(1)})`] : ['bad', `scene changed (drift ${drift.toFixed(1)})`];
    chips.innerHTML = [out, intact].map(([c, s]) => `<span class="tr-chip ${c}">${s}</span>`).join('');
  }

  let inView = false;
  new IntersectionObserver(es => es.forEach(e => {
    inView = e.isIntersecting;
    if (inView) play(); else KINDS.forEach(k => vids[k] && vids[k].pause());
  }), { threshold: 0.2 }).observe(stage);
  load();
})();
