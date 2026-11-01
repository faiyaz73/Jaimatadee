// Shared pilgrimage-card rendering helpers, used by the homepage teaser grid
// and the full pilgrimages.html listing.
(function () {
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  // The backend now sends a parallel _hindi field per trip (destination_hindi,
  // description_hindi) - use it when Hindi is selected and the backend
  // actually supplied it, otherwise fall back to the English field rather
  // than show nothing.
  function localized(trip, baseKey) {
    var lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
    if (lang === 'hi') {
      var hiVal = trip[baseKey + '_hindi'];
      if (hiVal) return hiVal;
    }
    return trip[baseKey] || '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return t('pilgrimage.datesOnRequest');
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // seats_left: null means the operator set no cap - show it as open,
  // never as zero places left.
  function seatsLeftLabel(trip) {
    if (trip.seats_left == null) return t('pilgrimage.openSeats');
    return trip.seats_left + ' ' + t('pilgrimage.seatsLeft');
  }

  function pilgrimageCardHtml(trip) {
    const img = trip.image_url ? escapeHtml(trip.image_url) : '/assets/images/tour.png';
    const destination = localized(trip, 'destination');
    const description = localized(trip, 'description');
    return (
      '<div class="pilgrimage-card" data-trip-id="' + escapeHtml(trip.trip_id) + '">' +
        '<div class="pilgrimage-card-img"><img src="' + img + '" alt="' + escapeHtml(destination) + '" loading="lazy"></div>' +
        '<div class="pilgrimage-card-body">' +
          '<h4>' + escapeHtml(destination) + '</h4>' +
          '<p>' + escapeHtml(description) + '</p>' +
          '<div class="pilgrimage-card-meta">' +
            '<span><i class="fa-regular fa-calendar"></i> ' + formatDate(trip.departure_date) + '</span>' +
            '<span><i class="fa-regular fa-clock"></i> ' + trip.trip_days + ' ' + (trip.trip_days > 1 ? t('pilgrimage.days') : t('pilgrimage.day')) + '</span>' +
          '</div>' +
          '<div class="pilgrimage-card-foot">' +
            '<div><span class="pilgrimage-price">₹' + escapeHtml(trip.amount_per_person) + '</span><span class="pilgrimage-price-sub">' + t('pilgrimage.perPerson') + '</span></div>' +
            '<button type="button" class="btn btn-primary btn-sm pilgrimage-book-btn">' + t('pilgrimage.bookNow') + '</button>' +
          '</div>' +
          '<div class="pilgrimage-seats-left">' + seatsLeftLabel(trip) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  window.PilgrimageCardRender = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    seatsLeftLabel: seatsLeftLabel,
    pilgrimageCardHtml: pilgrimageCardHtml,
    localized: localized
  };
})();
