(function () {
  var cardsGrid = document.getElementById('routesCardsGrid');
  var countEl = document.getElementById('routesShowingCount');

  var allRoutes = [];
  var townDisplayNames = {}; // town id -> display_name ("ਬਠਿੰਡਾ (Bathinda)"), from /towns
  var townNamesBothLangs = { en: {}, hi: {} }; // town id -> name, both languages (for results.html links)

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  function displayName(town) {
    return (town && townDisplayNames[town.id]) || (town && town.name) || '';
  }

  function todayStr() {
    // Today's date in IST (YYYY-MM-DD), whatever the visitor's own timezone is.
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  // Prefer the tenant's own uploaded route photos (Azure URLs, set via the
  // admin canvas) over the generic local r-N.png placeholder - falls back to
  // the placeholder for a tenant that hasn't uploaded any yet.
  function routeCardImage(imgNum) {
    var photos = (window.__TENANT_CONFIG__ && window.__TENANT_CONFIG__.routePhotos) || [];
    return photos[imgNum - 1] || window.tenantImagePath('r-' + imgNum + '.png');
  }

  // "17:15" -> "5:15 PM"
  function formatRouteTime(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    if (!m) return '';
    var h = Number(m[1]);
    return ((h % 12) || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  // Departure time only - the "from ₹fare" figure is intentionally not shown
  // on the routes page.
  function routeMetaHtml(r) {
    var time = formatRouteTime(r.departure_time);
    if (!time) return '';
    return '<div class="route-page-card-meta">' +
      '<span><i class="fa-regular fa-clock"></i> ' + time + '</span>' +
    '</div>';
  }

  function renderRoutes(routes) {
    if (!routes.length) {
      countEl.textContent = t('routes.noRoutesFound');
      cardsGrid.innerHTML = '<p class="state-msg empty">' + t('routes.noRoutesMatch') + '</p>';
      return;
    }
    countEl.textContent = t('routes.showing') + ' ' + routes.length + ' ' + (routes.length === 1 ? t('routes.route') : t('routes.routes'));
    cardsGrid.innerHTML = routes.map(function (r, idx) {
      var imgNum = (idx % 6) + 1;
      var fromLabel = displayName(r.from_town);
      var toLabel = displayName(r.to_town);
      var fromNameEn = townNamesBothLangs.en[r.from_town.id] || fromLabel;
      var toNameEn = townNamesBothLangs.en[r.to_town.id] || toLabel;
      var fromNameHi = townNamesBothLangs.hi[r.from_town.id] || fromLabel;
      var toNameHi = townNamesBothLangs.hi[r.to_town.id] || toLabel;
      var searchUrl = 'results57eb.html?from=' + encodeURIComponent(r.from_town.id) +
        '&to=' + encodeURIComponent(r.to_town.id) +
        '&depart=' + todayStr() +
        '&fromName=' + encodeURIComponent(fromNameEn) +
        '&toName=' + encodeURIComponent(toNameEn) +
        '&fromNameHi=' + encodeURIComponent(fromNameHi) +
        '&toNameHi=' + encodeURIComponent(toNameHi);
      return (
        '<a class="route-page-card" href="' + searchUrl + '">' +
          '<div class="route-page-card-img"><img src="' + routeCardImage(imgNum) + '" alt="' + escapeHtml(fromLabel) + ' to ' + escapeHtml(toLabel) + '" loading="lazy"></div>' +
          '<div class="route-page-card-body">' +
            '<div class="route-page-card-top">' +
              '<span>' + escapeHtml(fromLabel) + '</span>' +
              '<i class="fa-solid fa-arrow-right"></i>' +
              '<span>' + escapeHtml(toLabel) + '</span>' +
            '</div>' +
            routeMetaHtml(r) +
            '<button type="button" class="btn btn-primary route-page-card-btn">' + t('routes.searchBuses') + '</button>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  var townDisplayNamesLang = null;
  function ensureTownDisplayNames() {
    var lang = window.i18n ? window.i18n.getLang() : 'en';
    if (townDisplayNamesLang === lang) return Promise.resolve();
    return window.apiV1.searchTowns('').then(function (res) {
      (res.towns || []).forEach(function (t) {
        townDisplayNames[t.id] = t.display_name || t.name;
      });
      townDisplayNamesLang = lang;
    }).catch(function () {
      // Fall back to whatever's already cached (or plain Gurmukhi names on
      // the very first load) if this lookup fails - not fatal.
    });
  }

  function skeletonCard() {
    return (
      '<div class="route-page-card">' +
        '<div class="route-skel-img"></div>' +
        '<div class="route-skel-body">' +
          '<div class="route-skel-line route-skel-title"></div>' +
          '<div class="route-skel-line route-skel-sched"></div>' +
          '<div class="route-skel-line route-skel-btn"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSkeleton(count) {
    var html = '';
    for (var i = 0; i < count; i++) html += skeletonCard();
    cardsGrid.innerHTML = html;
  }

  function load() {
    countEl.textContent = t('routes.loadingRoutes');
    renderSkeleton(9);
    Promise.all([ensureTownDisplayNames(), window.apiV1.getRoutes(), window.apiV1.getTownNamesBothLangs()]).then(function (results) {
      var res = results[1];
      townNamesBothLangs = results[2];
      // Earliest departure first; routes with no known time go last (the
      // sort is stable, so ties keep the API's own order).
      allRoutes = (res.routes || []).map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
        var ta = /^(\d{1,2}):(\d{2})/.exec(a.r.departure_time || '');
        var tb = /^(\d{1,2}):(\d{2})/.exec(b.r.departure_time || '');
        var ma = ta ? Number(ta[1]) * 60 + Number(ta[2]) : Infinity;
        var mb = tb ? Number(tb[1]) * 60 + Number(tb[2]) : Infinity;
        return ma === mb ? a.i - b.i : ma - mb;
      }).map(function (x) { return x.r; });
      renderRoutes(allRoutes);
    }).catch(function () {
      countEl.textContent = '';
      cardsGrid.innerHTML = '<p class="state-msg error">' + t('routes.loadError') + '</p>';
    });
  }

  // Re-fetch on language switch - town names and route data are both
  // language-dependent (via the API's lang param), not just the static
  // labels/button text that applyTranslations() alone already handles.
  document.addEventListener('i18n:changed', function () {
    load();
  });

  load();
})();
