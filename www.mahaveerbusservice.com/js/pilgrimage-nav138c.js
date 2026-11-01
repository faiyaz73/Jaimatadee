document.addEventListener('DOMContentLoaded', function () {
  var navLinks = document.querySelectorAll('.js-pilgrimage-nav-link');
  if (!navLinks.length || !window.apiV1) return;

  window.apiV1.getPilgrimages().then(function (trips) {
    var hasTrips = !!(trips && trips.length);
    navLinks.forEach(function (el) { el.hidden = !hasTrips; });
  }).catch(function () {
    navLinks.forEach(function (el) { el.hidden = true; });
  });
});
