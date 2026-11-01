document.addEventListener('DOMContentLoaded', function () {
  var row = document.getElementById('routesRow');
  if (!row || !window.apiV1) return;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function todayStr() {
    // Today's date in IST (YYYY-MM-DD), whatever the visitor's own timezone is.
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  function formatClockTime(isoStr) {
    if (!isoStr) return '--';
    var d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  }

  // Prefer the tenant's own uploaded route photos (Azure URLs, set via the
  // admin canvas) over the generic local r-N.png placeholder - falls back to
  // the placeholder for a tenant that hasn't uploaded any yet.
  function routeCardImage(imgNum) {
    var photos = (window.__TENANT_CONFIG__ && window.__TENANT_CONFIG__.routePhotos) || [];
    return photos[imgNum - 1] || window.tenantImagePath('r-' + imgNum + '.png');
  }

  var date = todayStr();
  var townNamesBothLangs = { en: {}, hi: {} }; // town id -> name, both languages (for results.html links)

  window.apiV1.getRoutes().then(function (res) {
    var routes = (res.routes || []).slice(0, 6);
    if (!routes.length) {
      row.innerHTML = '<p class="state-msg empty">No routes available right now. Check back soon.</p>';
      return;
    }

    row.innerHTML = routes.map(function () {
      return '<div class="route-card route-card-loading"><div class="route-body"><p class="state-msg loading">Loading...</p></div></div>';
    }).join('');
    var cards = row.querySelectorAll('.route-card');

    window.apiV1.getTownNamesBothLangs().then(function (m) { townNamesBothLangs = m; }).catch(function () {});

    // Card content depends on the active language, so keep each route's
    // search result and redraw on i18n:changed instead of baking text once.
    var searchResults = [];

    function townName(town) {
      var lang = (window.i18n && window.i18n.getLang && window.i18n.getLang()) ||
        (function () { try { return localStorage.getItem('np_lang'); } catch (e) { return 'en'; } })();
      return lang === 'hi' ? (town.name_hindi || town.name) : (town.name_english || town.name);
    }

    function drawCard(idx) {
      var r = routes[idx];
      var results = searchResults[idx];
      var card = cards[idx];
      if (!card || !results) return;
      var imgNum = (idx % 6) + 1;
      var departure = results.length ? formatClockTime(results[0].departure_at) : '--';
      var fromNameEn = r.from_town.name_english || townNamesBothLangs.en[r.from_town.id] || r.from_town.name;
      var toNameEn = r.to_town.name_english || townNamesBothLangs.en[r.to_town.id] || r.to_town.name;
      var fromNameHi = r.from_town.name_hindi || townNamesBothLangs.hi[r.from_town.id] || r.from_town.name;
      var toNameHi = r.to_town.name_hindi || townNamesBothLangs.hi[r.to_town.id] || r.to_town.name;
      var fromLabel = townName(r.from_town);
      var toLabel = townName(r.to_town);
      var searchUrl = 'results57eb.html?from=' + encodeURIComponent(r.from_town.id) +
        '&to=' + encodeURIComponent(r.to_town.id) +
        '&depart=' + date +
        '&fromName=' + encodeURIComponent(fromNameEn) +
        '&toName=' + encodeURIComponent(toNameEn) +
        '&fromNameHi=' + encodeURIComponent(fromNameHi) +
        '&toNameHi=' + encodeURIComponent(toNameHi);

      var t = (window.i18n && window.i18n.t) || function (k, fallback) { return fallback; };
      var hasSeats = results.length > 0;
      card.className = 'route-card';
      card.innerHTML =
        '<div class="route-img-wrap">' +
          '<img src="' + routeCardImage(imgNum) + '" alt="' + escapeHtml(fromLabel) + ' - ' + escapeHtml(toLabel) + '" loading="lazy">' +
          (hasSeats ? '<span class="route-seats-badge"><i class="fa-solid fa-circle-check"></i>' + t('indexV3.routes.seatsAvailable', 'Seats Available') + '</span>' : '') +
        '</div>' +
        '<div class="route-body">' +
          '<h4><i class="fa-solid fa-route"></i>' + escapeHtml(fromLabel) + ' <i class="fa-solid fa-arrow-right-long" style="font-size:11px;color:var(--text-light)"></i> ' + escapeHtml(toLabel) + '</h4>' +
          '<div class="route-times">' +
            '<div><span><i class="fa-solid fa-clock"></i>' + t('indexV3.routes.departure', 'Departure') + '</span><b>' + departure + '</b></div>' +
          '</div>' +
          '<div class="route-price-row">' +
            
            '<a href="' + searchUrl + '" class="btn-outline" style="width:100%;text-align:center;justify-content:center">' + t('indexV3.routes.viewBuses', 'VIEW BUSES') + '</a>' +
          '</div>' +
        '</div>';
    }

    routes.forEach(function (r, idx) {
      window.apiV1.search({ from: r.from_town.id, to: r.to_town.id, date: date })
        .catch(function () { return { results: [] }; })
        .then(function (searchRes) {
          searchResults[idx] = (searchRes.results || []).slice().sort(function (a, b) {
            return new Date(a.departure_at) - new Date(b.departure_at);
          });
          drawCard(idx);
        });
    });

    document.addEventListener('i18n:changed', function () {
      routes.forEach(function (r, idx) { drawCard(idx); });
    });
    }).catch(function () {
    row.innerHTML = '<p class="state-msg empty">Could not load routes.</p>';
  });
});
