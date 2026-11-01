document.addEventListener('DOMContentLoaded', function () {
  var wrap = document.querySelector('.v3-route-pills');
  if (!wrap || !window.apiV1) return;
  var rowEl = wrap.closest('.v3-route-pills-row');
  var MAX_PILLS = 6;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function todayStr() {
    // Today's date in IST (YYYY-MM-DD), whatever the visitor's own timezone is.
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  // Pills come from the live /routes API (not the baked config, which can be
  // empty), so every pill already carries real town ids - no town lookup on click.
  Promise.all([
    window.apiV1.getRoutes(),
    window.apiV1.getTownNamesBothLangs().catch(function () { return { en: {}, hi: {} }; })
  ]).then(function (results) {
    var routes = (results[0].routes || []).filter(function (r) {
      return r.from_town && r.to_town;
    }).slice(0, MAX_PILLS);
    var names = results[1] || { en: {}, hi: {} };

    if (!routes.length) {
      if (rowEl) rowEl.style.display = 'none';
      return;
    }

    function townName(town) {
      var lang = window.i18n && window.i18n.getLang ? window.i18n.getLang() : 'en';
      return lang === 'hi' ? (town.name_hindi || town.name) : (town.name_english || town.name);
    }
    function render() {
      wrap.innerHTML = routes.map(function (r, i) {
        return '<button type="button" class="v3-route-pill" data-idx="' + i + '">' +
          escapeHtml(townName(r.from_town)) + ' &rarr; ' + escapeHtml(townName(r.to_town)) + '</button>';
      }).join('');
    }
    render();
    document.addEventListener('i18n:changed', render);
    if (rowEl) rowEl.style.display = '';

    wrap.addEventListener('click', function (e) {
      var pill = e.target.closest('.v3-route-pill');
      if (!pill) return;
      var r = routes[Number(pill.getAttribute('data-idx'))];
      if (!r) return;
      var f = r.from_town, t = r.to_town;
      var params = new URLSearchParams({
        from: f.id,
        to: t.id,
        depart: todayStr(),
        fromName: f.name_english || names.en[f.id] || f.name,
        toName: t.name_english || names.en[t.id] || t.name,
        fromNameHi: f.name_hindi || names.hi[f.id] || f.name,
        toNameHi: t.name_hindi || names.hi[t.id] || t.name
      });
      window.location.href = 'results.html?' + params.toString();
    });
  }).catch(function () {
    if (rowEl) rowEl.style.display = 'none';
  });
});
