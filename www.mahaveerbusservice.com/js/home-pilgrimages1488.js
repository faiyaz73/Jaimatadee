document.addEventListener('DOMContentLoaded', function () {
  var section = document.getElementById('pilgrimages');
  var grid = document.getElementById('homePilgrimageGrid');
  if (!section || !grid || !window.apiV1) return;

  var R = window.PilgrimageCardRender;

  var lightbox = document.getElementById('pilgrimageLightbox');
  var lightboxImg = document.getElementById('pilgrimageLightboxImg');
  var lightboxClose = document.getElementById('pilgrimageLightboxClose');
  function openLightbox(src, alt) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  function renderGrid(trips) {
    grid.innerHTML = trips.slice(0, 4).map(R.pilgrimageCardHtml).join('');
    grid.querySelectorAll('.pilgrimage-card').forEach(function (card, i) {
      var trip = trips[i];
      card.querySelector('.pilgrimage-book-btn').addEventListener('click', function () {
        window.openPilgrimageBookingModal(trip);
      });
      var imgWrap = card.querySelector('.pilgrimage-card-img');
      if (imgWrap) imgWrap.addEventListener('click', function () {
        var img = imgWrap.querySelector('img');
        if (img) openLightbox(img.src, img.alt);
      });
    });
  }

  window.apiV1.getPilgrimages().then(function (trips) {
    trips = trips || [];
    if (!trips.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    renderGrid(trips);
    // Card destination/description come from the API in the selected
    // language, not the dictionary i18n.apply() already re-renders on
    // language change - re-render these cards too from the same
    // already-fetched trips instead of refetching.
    document.addEventListener('i18n:changed', function () {
      renderGrid(trips);
    });
  }).catch(function () {
    section.hidden = true;
  });
});
