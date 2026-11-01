// Shared pass-card rendering helpers, used by the homepage's compact pass
// grid and the full passes.html listing - keeps the pass_type -> icon/label
// mapping in one place so both pages describe a pass the same way.
(function () {
  var CARD_COLORS = ['', 'p3-student', 'p3-senior', 'p3-corporate', 'p3-family'];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  function tn(key, n) {
    return t(key).replace('{n}', n);
  }

  // Mirrors passes.js's resolvePassAction() - kept as a small duplicate
  // here rather than a shared import since this file has no dependency on
  // passes.js (it's also used standalone on the homepage's compact pass
  // grid). Never infer "apply required" from price - only the backend's
  // own flags decide this.
  function isApplyRequired(p) {
    return !!(p && p.payment_mode === 'manual');
  }

  // The four real pass_type values from the API - each gets its own icon +
  // short label so a card reads correctly at a glance instead of a generic
  // "PASS" tag that doesn't say what kind of pass it is.
  function passTypeMeta(passType) {
    switch (passType) {
      case 'ROUTE_BASED': return { icon: 'fa-route', labelKey: 'passes.typeRoute' };
      case 'RIDES_BASED': return { icon: 'fa-ticket', labelKey: 'passes.typeRides' };
      case 'PRICE_BASED': return { icon: 'fa-tag', labelKey: 'passes.typePrice' };
      case 'OVERALL': return { icon: 'fa-star', labelKey: 'passes.typeOverall' };
      default: return { icon: 'fa-id-card', labelKey: 'passes.typeGeneric' };
    }
  }

  function travelTypeLabel(p) {
    if (p.pass_type === 'RIDES_BASED') {
      return p.rides_allowed === -1 ? t('passes.unlimitedRides') : tn('passes.ridesN', p.rides_allowed);
    }
    var parts = [];
    if (p.discount_percentage) parts.push(tn('passes.percentOff', p.discount_percentage));
    if (p.max_off) parts.push(tn('passes.upToPerTicket', p.max_off));
    return parts.length ? parts.join(', ') : t('passes.discountPass');
  }

  function routeLabel(p) {
    if (p.from_town && p.to_town) return p.from_town + ' → ' + p.to_town;
    return t('passes.anyRoute');
  }

  function passCardHtml(p, i) {
    var colorClass = CARD_COLORS[i % CARD_COLORS.length];
    var meta = passTypeMeta(p.pass_type);
    meta.label = t(meta.labelKey);
    return (
      '<div class="pass-card" data-pass-id="' + p.pass_config_id + '">' +
        '<div class="pass3d" aria-hidden="true">' +
          '<div class="p3-back"></div>' +
          '<div class="p3-front ' + colorClass + '">' +
            '<div class="p3-top"><span>' + escapeHtml(meta.label.toUpperCase()) + '</span><i class="fa-solid ' + meta.icon + '"></i></div>' +
            '<div class="p3-chip"></div>' +
            '<small>' + escapeHtml(meta.label) + '</small>' +
            '<strong>' + escapeHtml(p.title) + '</strong>' +
            '<div class="p3-bottom"><span>' + escapeHtml(routeLabel(p)) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="pass-card-body">' +
          '<h4>' + escapeHtml(p.title) + '</h4>' +
          '<p>' + escapeHtml(p.description) + '</p>' +
          '<div class="pass-card-foot"><span class="pass-price">' + (p.free_with_otp ? t('passes.free') : (isApplyRequired(p) ? t('passes.feeSetByOperator') : '₹' + escapeHtml(p.price))) + '</span><button type="button" class="btn btn-outline btn-sm pass-view-details">' + t('passes.viewDetails') + '</button></div>' +
        '</div>' +
      '</div>'
    );
  }

  window.PassCardRender = {
    CARD_COLORS: CARD_COLORS,
    passTypeMeta: function (pt) { var m = passTypeMeta(pt); m.label = t(m.labelKey); return m; },
    travelTypeLabel: travelTypeLabel,
    routeLabel: routeLabel,
    passCardHtml: passCardHtml,
    escapeHtml: escapeHtml
  };
})();
