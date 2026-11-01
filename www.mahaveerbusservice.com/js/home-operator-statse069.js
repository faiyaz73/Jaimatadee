document.addEventListener('DOMContentLoaded', function () {
  if (!window.apiV1) return;

  var busesEls = [document.getElementById('heroBusesCount'), document.getElementById('aboutBusesCount'), document.getElementById('statBusesCount')].filter(Boolean);
  var routesEls = [document.getElementById('heroRoutesCount'), document.getElementById('aboutRoutesCount'), document.getElementById('statRoutesCount')].filter(Boolean);
  if (!busesEls.length && !routesEls.length) return;

  window.apiV1.getOperatorInfo().then(function (info) {
    if (typeof info.fleet_size === 'number') {
      busesEls.forEach(function (el) { el.textContent = info.fleet_size; });
    }
    if (typeof info.routes === 'number') {
      routesEls.forEach(function (el) { el.textContent = info.routes; });
    }
    // Deliberately NOT overwriting the operator name or logo from this
    // endpoint: `name` is the backend operator record's name (e.g. the
    // owner's personal name, "Dipesh Jain"), which isn't always the
    // customer-facing brand ("Mahaveer Bus Service") - and `logo_url` is a
    // path relative to apnibus-booking.apnibus.com, not this site's own
    // domain, so assigning it directly 404s here. The baked config's name
    // and logo are the curated, correct ones to show for every tenant.
  }).catch(function () {
    // Leave the baked placeholder value in place on failure.
  });
});
