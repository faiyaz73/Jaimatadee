function homePassesT(key) {
  return window.i18n ? window.i18n.t(key) : key;
}

document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('pass_purchased') === 'true') {
    if (window.fireConfetti) window.fireConfetti();
    params.delete('pass_purchased');
    var qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  var grid = document.getElementById('homePassGrid');
  if (!grid || !window.apiV1) return;

  var R = window.PassCardRender;
  var lastResult = null;

  function render() {
    if (!lastResult) return;
    var res = lastResult;
    var passes = (res.passes || []).slice(0, 5);
    if (!passes.length) {
      // An empty catalogue doesn't mean passes are unavailable - an
      // operator can accept applications before pricing a product. Show
      // the apply teaser whenever accepts_applications is true, regardless
      // of count (per spec), same rule as the full passes.html listing.
      if (res.accepts_applications === true) {
        grid.innerHTML =
          '<div class="pass-card home-pass-apply-card">' +
            '<div class="pass-card-body">' +
              '<h4>' + homePassesT('passes.applyForMonthlyPass') + '</h4>' +
              '<p>' + homePassesT('passes.applyBeforeCatalogue') + '</p>' +
              '<div class="pass-card-foot"><a href="pass-application.html" class="btn btn-primary btn-sm">' + homePassesT('passes.applyForMonthlyPass') + '</a></div>' +
            '</div>' +
          '</div>';
      } else {
        grid.innerHTML = '<p class="sp-empty">' + homePassesT('passes.noPassesRightNow') + '</p>';
      }
      return;
    }
    grid.innerHTML = passes.map(function (p, i) {
      // Homepage card links straight to the full passes page to purchase -
      // no in-page buy flow here, matching the old "Get Pass" button's link.
      // Match the button by its class, not its label - the label is
      // translated, so a text match silently fails in Hindi.
      return R.passCardHtml(p, i).replace(
        /<button type="button" class="btn btn-outline btn-sm pass-view-details">[^<]*<\/button>/,
        '<a href="passes.html" class="btn btn-outline btn-sm">' + homePassesT('passes.getPass') + '</a>'
      );
    }).join('');
  }

  window.apiV1.getPasses().then(function (res) {
    lastResult = res;
    render();
    document.addEventListener('i18n:changed', render);
  }).catch(function () {
    grid.innerHTML = '<p class="sp-empty">' + homePassesT('passes.loadError') + '</p>';
  });
});
