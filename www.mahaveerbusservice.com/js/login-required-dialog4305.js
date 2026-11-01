(function () {
  var backdropEl = null;

  function build() {
    if (backdropEl) return backdropEl;
    var html =
      '<div class="lr-dialog-backdrop" id="lrDialogBackdrop">' +
        '<div class="lr-dialog" role="dialog" aria-modal="true" aria-labelledby="lrDialogTitle">' +
          '<div class="lr-dialog-icon"><i class="fa-solid fa-lock"></i></div>' +
          '<h3 id="lrDialogTitle" data-i18n="loginRequired.title">Login required</h3>' +
          '<p data-i18n="loginRequired.body">Please log in to add and save passenger details for this booking.</p>' +
          '<div class="lr-dialog-actions">' +
            '<button type="button" class="btn btn-outline" id="lrDialogCancel" data-i18n="loginRequired.cancel">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="lrDialogLogin" data-i18n="loginRequired.login">Login</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    backdropEl = document.getElementById('lrDialogBackdrop');
    if (window.i18n && window.i18n.apply) window.i18n.apply(backdropEl);
    return backdropEl;
  }

  // Shows the login-required dialog and resolves true only if the visitor
  // ends up signed in afterwards (mirrors the Flutter app's _ensureSignedIn()
  // awaiting the OTP screen's result before letting the caller proceed).
  window.ensureSignedIn = function () {
    if (window.isLoggedIn && window.isLoggedIn()) return Promise.resolve(true);

    return new Promise(function (resolve) {
      var backdrop = build();
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';

      function cleanup() {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
        window.removeEventListener('np:auth-modal-closed', onAuthClosed);
        cancelBtn.removeEventListener('click', onCancel);
        loginBtn.removeEventListener('click', onLogin);
      }

      function onAuthClosed() {
        cleanup();
        resolve(!!(window.isLoggedIn && window.isLoggedIn()));
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

      function onLogin() {
        backdrop.classList.remove('open');
        window.addEventListener('np:auth-modal-closed', onAuthClosed);
        window.openAuthModal();
      }

      var cancelBtn = document.getElementById('lrDialogCancel');
      var loginBtn = document.getElementById('lrDialogLogin');
      cancelBtn.addEventListener('click', onCancel);
      loginBtn.addEventListener('click', onLogin);
    });
  };
})();
