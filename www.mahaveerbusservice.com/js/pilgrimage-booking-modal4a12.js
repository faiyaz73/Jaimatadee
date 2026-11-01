// Shared pilgrimage booking modal - injected once per page, opened with a
// trip object from either the homepage teaser or the full pilgrimages.html
// list.
//
// Flow (same two-step Paytm flow as ticket checkout):
//   1. POST /pilgrimages/<trip>/book           -> held booking, unpaid, expires
//      at payment_expires_at. NO success message here.
//   2. POST /pilgrimages/bookings/<id>/paytm   -> Paytm order, handed to
//      invokePaytmCheckout() (redirect:false).
//   3. GET  /pilgrimages/bookings/<id>/status  -> polled after the sheet
//      closes. The success view is shown only when this says Confirmed.
(function () {
  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function money(v) {
    const n = Number(v);
    if (!isFinite(n)) return '₹' + escapeHtml(v);
    return '₹' + n.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  // Paytm CheckoutJS helper is shared with checkout/passes; load it on demand
  // so every page that hosts this modal doesn't need its own <script> tag.
  let paytmHelperPromise = null;
  function ensurePaytmHelper() {
    if (typeof window.invokePaytmCheckout === 'function') return Promise.resolve();
    if (paytmHelperPromise) return paytmHelperPromise;
    paytmHelperPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/paytm-checkout.js';
      s.onload = resolve;
      s.onerror = () => { paytmHelperPromise = null; reject(new Error('Could not load the payment gateway. Please try again.')); };
      document.head.appendChild(s);
    });
    return paytmHelperPromise;
  }

  function ensureModal() {
    if (document.getElementById('pilgrimModalBackdrop')) return;
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="pilgrim-modal-backdrop" id="pilgrimModalBackdrop">
        <div class="pilgrim-modal" role="dialog" aria-modal="true" aria-labelledby="pilgrimModalTitle">
          <button class="pilgrim-modal-close" id="pilgrimModalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          <div id="pilgrimModalFormView">
            <h3 id="pilgrimModalTitle">—</h3>
            <p class="pilgrim-modal-sub" id="pilgrimModalSub"></p>
            <form id="pilgrimBookForm">
              <label>${t('pilgrimage.contactName')}</label>
              <input type="text" id="pilgrimContactName" required>
              <label>${t('pilgrimage.contactPhone')}</label>
              <input type="tel" id="pilgrimContactPhone" required pattern="[0-9]{10}" maxlength="10">
              <label>${t('pilgrimage.travellers')}</label>
              <input type="number" id="pilgrimTravellers" min="1" value="1" required>
              <label>${t('pilgrimage.contactEmailOptional')}</label>
              <input type="email" id="pilgrimContactEmail">
              <label>${t('pilgrimage.notesOptional')}</label>
              <textarea id="pilgrimNotes" rows="2"></textarea>
              <p class="pilgrim-modal-error" id="pilgrimModalError" hidden></p>
              <button type="submit" class="btn btn-primary" id="pilgrimModalSubmit">${t('pilgrimage.continueToPay')}</button>
            </form>
          </div>
          <div id="pilgrimModalPayView" hidden>
            <h3 id="pilgrimPayTitle">—</h3>
            <p class="pilgrim-modal-sub" id="pilgrimPaySub"></p>
            <div class="pilgrim-success-summary" id="pilgrimPaySummary"></div>
            <div class="pilgrim-pay-status" id="pilgrimPayStatus" hidden role="status" aria-live="polite">
              <span class="pilgrim-spinner" aria-hidden="true"></span>
              <span id="pilgrimPayStatusText"></span>
            </div>
            <p class="pilgrim-hold-timer" id="pilgrimHoldTimer"></p>
            <p class="pilgrim-modal-error" id="pilgrimPayError" hidden></p>
            <button type="button" class="btn btn-primary" id="pilgrimPayBtn">—</button>
          </div>
          <div id="pilgrimModalSuccessView" hidden>
            <div class="pilgrim-success-icon" id="pilgrimResultIcon"><i class="fa-solid fa-circle-check"></i></div>
            <h3 id="pilgrimSuccessTitle">—</h3>
            <p id="pilgrimSuccessMsg"></p>
            <div class="pilgrim-success-summary" id="pilgrimSuccessSummary"></div>
            <button type="button" class="btn btn-primary" id="pilgrimModalDone">${t('pilgrimage.done')}</button>
          </div>
          <div class="pilgrim-confirm" id="pilgrimConfirm" hidden>
            <div class="pilgrim-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="pilgrimConfirmTitle">
              <div class="pilgrim-confirm-icon"><i class="fa-solid fa-circle-question"></i></div>
              <h4 id="pilgrimConfirmTitle">—</h4>
              <p id="pilgrimConfirmMsg"></p>
              <div class="pilgrim-confirm-actions">
                <button type="button" class="btn btn-outline" id="pilgrimConfirmStay">—</button>
                <button type="button" class="btn btn-primary" id="pilgrimConfirmLeave">—</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);

    const backdrop = document.getElementById('pilgrimModalBackdrop');
    const confirmEl = document.getElementById('pilgrimConfirm');
    const closeModal = () => {
      // Stops the countdown + status polling of whatever payment was open.
      if (window.__pilgrimSession) window.__pilgrimSession.cancelled = true;
      confirmEl.hidden = true;
      backdrop.classList.remove('open');
    };

    // X / outside click / Esc: instead of silently losing what was typed (or
    // abandoning a held booking), ask first with an in-page dialog. Result
    // screens (nothing left to lose) close straight away.
    function requestClose() {
      if (!confirmEl.hidden) return;
      const onForm = !document.getElementById('pilgrimModalFormView').hidden;
      const onPay = !document.getElementById('pilgrimModalPayView').hidden;
      // Always ask on the form and payment screens - even an empty form, so a
      // stray click outside never dismisses it without a warning.
      if (!(onPay || onForm)) { closeModal(); return; }
      document.getElementById('pilgrimConfirmTitle').textContent = t(onPay ? 'pilgrimage.leavePayTitle' : 'pilgrimage.closeTitle');
      document.getElementById('pilgrimConfirmMsg').textContent = t(onPay ? 'pilgrimage.leavePayMsg' : 'pilgrimage.closeMsg');
      document.getElementById('pilgrimConfirmStay').textContent = t(onPay ? 'pilgrimage.stayAndPay' : 'pilgrimage.keepEditing');
      document.getElementById('pilgrimConfirmLeave').textContent = t(onPay ? 'pilgrimage.leave' : 'pilgrimage.yesClose');
      confirmEl.hidden = false;
      document.getElementById('pilgrimConfirmStay').focus();
    }
    document.getElementById('pilgrimModalClose').addEventListener('click', requestClose);
    document.getElementById('pilgrimModalDone').addEventListener('click', closeModal);
    document.getElementById('pilgrimConfirmStay').addEventListener('click', () => { confirmEl.hidden = true; });
    document.getElementById('pilgrimConfirmLeave').addEventListener('click', closeModal);
    confirmEl.addEventListener('click', (e) => { if (e.target === confirmEl) confirmEl.hidden = true; });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) requestClose(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) {
        if (!confirmEl.hidden) confirmEl.hidden = true; else requestClose();
      }
    });
  }

  function showView(name) {
    document.getElementById('pilgrimModalFormView').hidden = name !== 'form';
    document.getElementById('pilgrimModalPayView').hidden = name !== 'pay';
    document.getElementById('pilgrimModalSuccessView').hidden = name !== 'result';
  }

  // Result view: success / refund-hold / failure / expired all use it.
  function showResult({ icon, color, title, msg, summaryHtml }) {
    showView('result');
    const iconEl = document.getElementById('pilgrimResultIcon');
    iconEl.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    iconEl.style.color = color;
    document.getElementById('pilgrimSuccessTitle').textContent = title;
    document.getElementById('pilgrimSuccessMsg').textContent = msg;
    const summary = document.getElementById('pilgrimSuccessSummary');
    summary.innerHTML = summaryHtml || '';
    summary.hidden = !summaryHtml;
  }

  const OK = { icon: 'fa-circle-check', color: '#16A34A' };
  const WARN = { icon: 'fa-triangle-exclamation', color: '#D97706' };
  const BAD = { icon: 'fa-circle-xmark', color: '#DC2626' };

  // The status endpoint is the only authority on money. Tolerant of the
  // exact field names: looks at both status and payment_status, any case.
  function classifyStatus(st) {
    const text = [st && st.status, st && st.booking_status, st && st.payment_status]
      .filter(Boolean).join(' ').toLowerCase();
    if (/refund/.test(text)) return 'refund';
    if (/confirm/.test(text) && !/unconfirm|not confirm/.test(text)) return 'confirmed';
    if (/fail|expire|cancel|releas|declin/.test(text)) return 'failed';
    return 'pending';
  }

  function openPilgrimageBookingModal(trip) {
    ensureModal();
    if (window.__pilgrimSession) window.__pilgrimSession.cancelled = true;
    const session = window.__pilgrimSession = { cancelled: false, busy: false };

    const backdrop = document.getElementById('pilgrimModalBackdrop');
    document.getElementById('pilgrimConfirm').hidden = true;
    showView('form');

    const R = window.PilgrimageCardRender;
    const destination = R ? R.localized(trip, 'destination') : trip.destination;
    document.getElementById('pilgrimModalTitle').textContent = destination;
    document.getElementById('pilgrimModalSub').textContent =
      `₹${trip.amount_per_person} ${t('pilgrimage.perPerson')} · ${trip.trip_days} ${trip.trip_days > 1 ? t('pilgrimage.days') : t('pilgrimage.day')}`;
    document.getElementById('pilgrimContactName').value = '';
    document.getElementById('pilgrimContactPhone').value = '';
    document.getElementById('pilgrimTravellers').value = '1';
    document.getElementById('pilgrimContactEmail').value = '';
    document.getElementById('pilgrimNotes').value = '';
    document.getElementById('pilgrimModalError').hidden = true;

    const form = document.getElementById('pilgrimBookForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // ---- step 1: create the held booking ----
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('pilgrimModalSubmit');
      const errorEl = document.getElementById('pilgrimModalError');
      errorEl.hidden = true;
      // Disabled for the whole handler so a fast double-click can never
      // create two held bookings.
      submitBtn.disabled = true;
      session.busy = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="pilgrim-spinner pilgrim-spinner-btn" aria-hidden="true"></span>' + escapeHtml(t('pilgrimage.booking'));
      let booking;
      try {
        booking = await window.apiV1.bookPilgrimage(trip.trip_id, {
          contactName: document.getElementById('pilgrimContactName').value.trim(),
          contactPhone: document.getElementById('pilgrimContactPhone').value.trim(),
          travellers: Number(document.getElementById('pilgrimTravellers').value),
          contactEmail: document.getElementById('pilgrimContactEmail').value.trim(),
          notes: document.getElementById('pilgrimNotes').value.trim()
        });
      } catch (err) {
        errorEl.textContent = (err && err.detail) || t('pilgrimage.bookingFailed');
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        session.busy = false;
        return;
      }
      session.busy = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
      if (session.cancelled) return;
      startPayment(booking, destination, session);
    });

    backdrop.classList.add('open');
  }

  // ---- payment screen: breakdown + countdown + Pay button ----
  function startPayment(booking, destination, session) {
    const bookingId = booking.booking_id;
    const expiresAt = booking.payment_expires_at ? new Date(booking.payment_expires_at).getTime() : null;

    document.getElementById('pilgrimPayTitle').textContent = t('pilgrimage.payTitle');
    document.getElementById('pilgrimPaySub').textContent = destination;
    // Package price, booking fee and total shown separately so the total
    // doesn't disagree with the advertised per-person price.
    const summaryHtml = `
      <div class="pilgrim-summary-row"><span>${t('pilgrimage.destination')}</span><strong>${escapeHtml(booking.destination || destination)}</strong></div>
      <div class="pilgrim-summary-row"><span>${t('pilgrimage.travellers')}</span><strong>${escapeHtml(booking.travellers)}</strong></div>
      <div class="pilgrim-summary-row"><span>${t('pilgrimage.packagePrice')}</span><strong>${money(booking.amount)}</strong></div>
      <div class="pilgrim-summary-row"><span>${t('pilgrimage.bookingFee')}</span><strong>${money(booking.platform_fee)}</strong></div>
      <div class="pilgrim-summary-row pilgrim-summary-total"><span>${t('pilgrimage.total')}</span><strong>${money(booking.total_amount)}</strong></div>`;
    document.getElementById('pilgrimPaySummary').innerHTML = summaryHtml;

    const payBtn0 = document.getElementById('pilgrimPayBtn');
    const payBtn = payBtn0.cloneNode(true);
    payBtn0.parentNode.replaceChild(payBtn, payBtn0);
    const errorEl = document.getElementById('pilgrimPayError');
    const timerEl = document.getElementById('pilgrimHoldTimer');
    errorEl.hidden = true;
    showView('pay');

    const payLabel = () => `${t('pilgrimage.payNow')} ${money(booking.total_amount)}`;
    const statusEl = document.getElementById('pilgrimPayStatus');
    const statusText = document.getElementById('pilgrimPayStatusText');
    // Button label + (optional) spinner; the status strip above tells the
    // traveller what is happening so the wait never looks frozen.
    const setBtn = (label, disabled, loading) => {
      payBtn.innerHTML = (loading ? '<span class="pilgrim-spinner pilgrim-spinner-btn" aria-hidden="true"></span>' : '') + escapeHtml(label);
      payBtn.disabled = disabled;
    };
    const setStatus = (msg) => {
      statusEl.hidden = !msg;
      statusText.textContent = msg || '';
    };
    setBtn(payLabel(), false);

    let paying = false;       // a Paytm sheet / status poll is in flight
    let appClosedEarly = false;
    let fastPoll = false;
    let ended = false;

    function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }

    function finishExpired() {
      if (ended) return;
      ended = true;
      showResult({ ...BAD, title: t('pilgrimage.holdExpiredTitle'), msg: t('pilgrimage.holdExpiredMsg') });
    }

    // Countdown to payment_expires_at - fail cleanly instead of letting the
    // traveller pay into a dead booking. If a payment is already in flight,
    // let /status decide rather than cutting it off.
    function tick() {
      if (ended || session.cancelled) return;
      if (expiresAt == null) return;
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const mm = String(Math.floor(left / 60)).padStart(2, '0');
      const ss = String(left % 60).padStart(2, '0');
      timerEl.textContent = t('pilgrimage.holdTimer').replace('{time}', `${mm}:${ss}`);
      if (left === 0 && !paying) { finishExpired(); return; }
      setTimeout(tick, 1000);
    }
    tick();

    function onTxnStatus(ps) {
      if (ps && (ps.STATUS === 'TXN_SUCCESS' || ps.STATUS === 'TXN_FAILURE')) fastPoll = true;
    }

    // Returns true when the booking reached a final state.
    async function pollStatus() {
      const start = Date.now();
      const maxMs = 5 * 60 * 1000;
      while (Date.now() - start < maxMs) {
        if (session.cancelled || ended) return true;
        if (appClosedEarly) {
          appClosedEarly = false;
          showError(t('pilgrimage.paymentClosed'));
          return false;
        }
        let st = null;
        try {
          st = await window.apiV1.getPilgrimageBookingStatus(bookingId);
        } catch (err) {
          if (err && err.status === 404) { showError(t('pilgrimage.bookingNotFound')); return false; }
          // transient failure - keep polling
        }
        const kind = st ? classifyStatus(st) : 'pending';
        if (kind === 'confirmed') {
          ended = true;
          if (typeof window.closePaytmCheckout === 'function') window.closePaytmCheckout();
          showResult({
            ...OK,
            title: t('pilgrimage.bookedTitle'),
            msg: t('pilgrimage.confirmedMsg'),
            summaryHtml
          });
          return true;
        }
        if (kind === 'refund') {
          ended = true;
          if (typeof window.closePaytmCheckout === 'function') window.closePaytmCheckout();
          showResult({ ...WARN, title: t('pilgrimage.refundTitle'), msg: t('pilgrimage.refundMsg'), summaryHtml });
          return true;
        }
        if (kind === 'failed') {
          ended = true;
          if (typeof window.closePaytmCheckout === 'function') window.closePaytmCheckout();
          showResult({ ...BAD, title: t('pilgrimage.paymentFailedTitle'), msg: t('pilgrimage.paymentFailedMsg') });
          return true;
        }
        if (fastPoll) { fastPoll = false; continue; }
        await new Promise(r => setTimeout(r, Date.now() - start < 60000 ? 3000 : 10000));
      }
      showError(t('pilgrimage.stillProcessing'));
      return false;
    }

    // ---- steps 2 + 3: open Paytm, then confirm via /status ----
    async function pay() {
      // Disabled for the whole handler (covers the order call, the SDK
      // opening and the status poll) so a double-click can't open two sheets.
      if (paying || ended) return;
      paying = true;
      session.busy = true;
      errorEl.hidden = true;
      setStatus(t('pilgrimage.payStatusOpening'));
      setBtn(t('pilgrimage.openingPayment'), true, true);
      try {
        await ensurePaytmHelper();
        const order = await window.apiV1.startPilgrimagePayment(bookingId, { method: 'checkout' });
        await window.invokePaytmCheckout(order, () => { appClosedEarly = true; }, onTxnStatus);
        setStatus(t('pilgrimage.payStatusConfirming'));
        setBtn(t('pilgrimage.confirmingPayment'), true, true);
        await pollStatus();
      } catch (err) {
        if (!ended) showError((err && (err.detail || err.message)) || t('pilgrimage.couldNotStartPayment'));
      } finally {
        paying = false;
        session.busy = false;
        setStatus('');
        if (!ended && !session.cancelled) {
          // Sheet closed / error / still processing: the hold may still be
          // alive, so a retry is allowed (the backend reuses the open order).
          if (expiresAt != null && Date.now() >= expiresAt) finishExpired();
          else setBtn(t('pilgrimage.retryPayment'), false);
        }
      }
    }

    payBtn.addEventListener('click', pay);
    pay();
  }

  window.openPilgrimageBookingModal = openPilgrimageBookingModal;
})();
