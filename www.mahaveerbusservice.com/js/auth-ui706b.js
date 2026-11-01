(function () {
  let cachedUser = null;
  let activePass = null;

  function applyState(loggedIn) {
    document.querySelectorAll('.js-open-auth').forEach(el => {
      el.hidden = loggedIn;
    });
    document.querySelectorAll('.js-profile-btn, .js-bookings-btn').forEach(el => {
      el.hidden = !loggedIn;
    });
    document.querySelectorAll('.nav a.nav-highlight:not(.js-keep-highlight)').forEach(el => {
      el.classList.toggle('nav-highlight-plain', loggedIn);
    });
    if (!loggedIn) {
      activePass = null;
      applyBoardingPill(null);
    }
  }

  function applyBoardingPill(pass) {
    document.querySelectorAll('.js-boarding-pill').forEach(el => {
      el.hidden = !pass;
      if (pass) {
        const codeEl = el.querySelector('.jbp-code');
        if (codeEl) codeEl.textContent = pass.boarding_code;
      }
    });
  }

  function loadActivePass() {
    if (!window.apiV1) return;
    window.apiV1.getMyPasses().then(res => {
      const passes = (res.passes || []).filter(p => p.is_usable && !p.expired);
      activePass = passes[0] || null;
      applyBoardingPill(activePass);
    }).catch(() => {});
  }

  function refresh() {
    const loggedIn = window.isLoggedIn && window.isLoggedIn();
    applyState(loggedIn);
    if (loggedIn && !cachedUser && window.apiV1) {
      window.apiV1.getMe().then(user => { cachedUser = user; }).catch(() => {});
    }
    if (loggedIn) loadActivePass();
    if (!loggedIn) cachedUser = null;
  }

  window.getCachedUser = function () { return cachedUser; };

  // ---- boarding-code detail modal ----
  // Ticket-stub design matches the mobile app's _BoardingCodeTicket
  // (pass_purchase_screen.dart): green header bar, dashed divider,
  // big letter-spaced code, "read this to your conductor" helper line.
  let modalBackdrop = null;
  function buildBoardingModal() {
    if (modalBackdrop) return modalBackdrop;
    const html =
      '<div class="jbp-modal-backdrop" id="jbpModalBackdrop">' +
        '<div class="jbp-modal">' +
          '<button type="button" class="jbp-modal-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
          '<h3 data-i18n="boardingModal.title">Next Boarding Code</h3>' +
          '<p data-i18n="boardingModal.intro">Show this code to the conductor to get your pass discount.</p>' +
          '<div class="jbp-ticket">' +
            '<div class="jbp-ticket-notch left"></div>' +
            '<div class="jbp-ticket-notch right"></div>' +
            '<div class="jbp-ticket-head"><i class="fa-solid fa-star"></i> <span data-i18n="boardingModal.codeHead">BOARDING CODE</span> <i class="fa-solid fa-star"></i></div>' +
            '<div class="jbp-ticket-body">' +
              '<div class="jbp-ticket-code" id="jbpModalCode"></div>' +
              '<p class="jbp-ticket-helper" data-i18n="boardingModal.helper">Read this to your conductor</p>' +
            '</div>' +
          '</div>' +
          '<p class="jbp-modal-note" data-i18n="boardingModal.note">The code changes after each ride — always show the latest one shown here.</p>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    modalBackdrop = document.getElementById('jbpModalBackdrop');
    if (window.i18n && window.i18n.apply) window.i18n.apply(modalBackdrop);
    modalBackdrop.querySelector('.jbp-modal-close').addEventListener('click', closeBoardingModal);
    modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeBoardingModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBoardingModal(); });
    return modalBackdrop;
  }

  function openBoardingModal() {
    if (!activePass) return;
    const backdrop = buildBoardingModal();
    document.getElementById('jbpModalCode').textContent = activePass.boarding_code;
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeBoardingModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.js-boarding-pill')) openBoardingModal();
  });

  if (window.onAuthChange) window.onAuthChange(refresh);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
