document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('pilgrimageGrid');
  var emptyMsg = document.getElementById('pilgrimageEmpty');
  var loadingMsg = document.getElementById('pilgrimageLoading');
  if (!grid || !window.apiV1) return;

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
    grid.innerHTML = trips.map(R.pilgrimageCardHtml).join('');
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
    loadingMsg.hidden = true;
    if (!trips.length) {
      emptyMsg.hidden = false;
      return;
    }
    renderGrid(trips);
    // Card destination/description come from the API in the selected
    // language (destination_hindi/description_hindi), not the dictionary
    // i18n.apply() already re-renders on language change - re-render these
    // cards too from the same already-fetched trips instead of refetching.
    document.addEventListener('i18n:changed', function () {
      renderGrid(trips);
    });
  }).catch(function () {
    loadingMsg.hidden = true;
    emptyMsg.hidden = false;
    emptyMsg.textContent = window.i18n ? window.i18n.t('pilgrimage.loadError') : 'Could not load pilgrimages.';
  });
});
