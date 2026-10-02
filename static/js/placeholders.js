// Mark video slots whose mp4 is not there yet, so the dashed placeholder
// (with the expected filename) shows over the poster frame. Listeners sit on
// the document in the capture phase so they also cover <source> children and
// the slides bulma-carousel clones after load.
(function () {
  function slotOf(el) {
    return (el.tagName === 'VIDEO' || el.tagName === 'SOURCE') ? el.closest('.video-slot') : null;
  }
  document.addEventListener('error', function (e) {
    var slot = slotOf(e.target);
    if (slot) slot.classList.add('missing');
  }, true);
  document.addEventListener('loadeddata', function (e) {
    var slot = slotOf(e.target);
    if (slot) slot.classList.remove('missing');
  }, true);
  // Errors that fired before this script ran.
  document.querySelectorAll('.video-slot video').forEach(function (v) {
    if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      v.closest('.video-slot').classList.add('missing');
    }
  });
})();
