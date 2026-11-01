(function(){
  var form = document.getElementById('trackForm');
  var pnrInput = document.getElementById('trackPnr');
  var mobileInput = document.getElementById('trackMobile');
  var errorEl = document.getElementById('trackFormError');
  var submitBtn = document.getElementById('trackSubmitBtn');
  var resultCard = document.getElementById('trackResultCard');

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  pnrInput.addEventListener('input', function(){
    pnrInput.value = pnrInput.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
  });
  mobileInput.addEventListener('input', function(){
    mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
  });

  function showError(msg){
    errorEl.textContent = msg;
    errorEl.classList.add('show');
  }

  function clearError(){
    errorEl.classList.remove('show');
  }

  function renderResult(ticket){
    resultCard.style.display = 'block';
    var seats = (ticket.seats || []).join(', ');
    resultCard.innerHTML = '' +
      '<div class="track-form-card" style="margin-top:0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
          '<div><strong style="color:var(--primary-dark);font-size:18px">PNR ' + ticket.pnr + '</strong>' +
          '<span style="display:block;font-size:13px;color:var(--text-light);margin-top:2px">' + ticket.status + '</span></div>' +
          '<span style="background:#EFF6FF;color:var(--primary);font-weight:700;font-size:12px;padding:6px 14px;border-radius:20px">' + ticket.status + '</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:14px;color:var(--text)">' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.journeyDate') + '</span>' + (ticket.journey_date || '—') + '</div>' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.operator') + '</span>' + (ticket.operator || '—') + '</div>' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.from') + '</span>' + (ticket.from_town || '—') + (ticket.boarding_stop ? ' · ' + ticket.boarding_stop : '') + '</div>' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.to') + '</span>' + (ticket.to_town || '—') + (ticket.dropping_stop ? ' · ' + ticket.dropping_stop : '') + '</div>' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.seats') + '</span>' + (seats || '—') + '</div>' +
          '<div><span style="display:block;font-size:12px;color:var(--text-light)">' + t('trackBooking.totalAmount') + '</span>&#8377;' + (ticket.total_amount || '—') + '</div>' +
        '</div>' +
      '</div>';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    clearError();
    resultCard.style.display = 'none';

    var pnr = pnrInput.value.trim();
    var mobile = mobileInput.value.trim();

    if(!pnr){
      showError(t('trackBooking.errEnterPnr'));
      pnrInput.focus();
      return;
    }
    if(mobile.length !== 10){
      showError(t('trackBooking.errValidMobile'));
      mobileInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('trackBooking.tracking');

    window.apiV1.lookupPnr({ pnr: pnr, phone: '+91' + mobile }).then(function(ticket){
      submitBtn.disabled = false;
      submitBtn.textContent = t('trackBooking.submit');
      renderResult(ticket);
    }).catch(function(err){
      submitBtn.disabled = false;
      submitBtn.textContent = t('trackBooking.submit');
      resultCard.style.display = 'none';
      if(err && err.status === 404){
        showError(t('trackBooking.errNotFound'));
      } else {
        showError((err && err.detail) || t('trackBooking.errGeneric'));
      }
    });
  });
})();
