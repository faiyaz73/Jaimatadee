(function(){
  var RESEND_SECONDS = 30;
  var currentOtpId = null;
  var currentResendSeconds = RESEND_SECONDS;

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  var modalHtml = '' +
    '<div class="auth-modal-backdrop" id="authModalBackdrop">' +
      '<div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authStepPhoneTitle">' +
        '<button type="button" class="auth-modal-close" id="authModalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
        '<div class="auth-modal-body">' +
          '<div class="auth-modal-left">' +
            '<div class="auth-modal-left-logo"><img data-tenant-src="assets.logo" data-tenant-alt="assets.logoAlt" src="/assets/icons/Brand.png" alt="New Prem Bus Service"></div>' +
            '<h2 data-i18n="auth.welcome">Welcome!</h2>' +
            '<p data-i18n="auth.welcomeSub">Login or sign up to continue your journey with us</p>' +
            '<div class="auth-modal-left-img"><img data-tenant-src="assets.heroImage" data-tenant-alt="assets.heroAlt" src="/assets/images/hero-graphic.png" alt="New Prem Bus on mountain highway"></div>' +
          '</div>' +
          '<div class="auth-modal-right">' +

            '<div class="auth-step active" id="authStepPhone">' +
              '<div class="auth-step-icon"><i class="fa-solid fa-mobile-screen-button"></i></div>' +
              '<h3 id="authStepPhoneTitle" data-i18n="auth.enterMobileNumber">Enter Your Mobile Number</h3>' +
              '<p class="auth-step-sub" data-i18n="auth.otpSub">We\'ll send you a one-time password to verify it\'s you.</p>' +
              '<div class="auth-phone-field">' +
                '<span class="auth-phone-prefix">+91</span>' +
                '<input type="tel" id="authPhoneInput" placeholder="Enter 10-digit mobile number" data-i18n-attr="placeholder:auth.mobilePlaceholder" maxlength="10" inputmode="numeric" autocomplete="tel">' +
              '</div>' +
              '<p class="auth-step-error" id="authPhoneError" data-i18n="auth.invalidMobile">Enter a valid 10-digit mobile number.</p>' +
              '<div class="auth-secure-note">' +
                '<i class="fa-solid fa-shield-halved"></i>' +
                '<div><strong data-i18n="auth.secureNoteTitle">Your login is secure and protected.</strong><span data-i18n="auth.secureNoteBodyPhone">We never share your number with third parties.</span></div>' +
              '</div>' +
              '<button type="button" class="btn btn-primary auth-step-btn" id="authSendOtpBtn" data-i18n="auth.sendOtp">Send OTP</button>' +
            '</div>' +

            '<div class="auth-step" id="authStepOtp">' +
              '<div class="auth-step-icon"><i class="fa-solid fa-shield-halved"></i></div>' +
              '<h3 data-i18n="auth.verifyYourNumber">Verify Your Number</h3>' +
              '<p class="auth-step-sub"><span data-i18n="auth.verifySub">Enter the 6-digit OTP sent to</span><br><b id="authOtpPhoneDisplay"></b> <button type="button" class="auth-edit-number" id="authEditNumberBtn"><i class="fa-solid fa-pen"></i></button></p>' +
              '<div class="auth-otp-row" id="authOtpRow">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="0">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="1">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="2">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="3">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="4">' +
                '<input type="text" maxlength="1" inputmode="numeric" data-otp-idx="5">' +
              '</div>' +
              '<p class="auth-step-error" id="authOtpError" data-i18n="auth.incorrectOtp">Incorrect OTP. Please try again.</p>' +
              '<div class="auth-resend-row">' +
                '<span data-i18n="auth.notReceivedOtp">Didn\'t receive the OTP?</span><br>' +
                '<span id="authResendWrap"><span data-i18n="auth.resendOtpIn">Resend OTP in</span> <span class="auth-timer" id="authResendTimer">00:30</span></span>' +
                '<button type="button" id="authResendBtn" style="display:none" data-i18n="auth.resendOtp">Resend OTP</button>' +
              '</div>' +
              '<div class="auth-secure-note">' +
                '<i class="fa-solid fa-shield-halved"></i>' +
                '<div><strong data-i18n="auth.secureNoteTitle">Your login is secure and protected.</strong><span data-i18n="auth.secureNoteBodyOtp">Never share your OTP with anyone.</span></div>' +
              '</div>' +
              '<button type="button" class="btn btn-primary auth-step-btn" id="authVerifyBtn" data-i18n="auth.verifyAndLogin">Verify &amp; Login</button>' +
            '</div>' +

            '<div class="auth-step" id="authStepSuccess">' +
              '<div class="auth-step-icon"><i class="fa-solid fa-circle-check"></i></div>' +
              '<h3 data-i18n="auth.allSet">You\'re All Set!</h3>' +
              '<p class="auth-step-sub"><span data-i18n="auth.loggedInSuccess">Logged in successfully. Happy travels with</span> <span data-tenant-text="name">New Prem Bus Service</span>.</p>' +
              '<button type="button" class="btn btn-primary auth-step-btn" id="authDoneBtn" data-i18n="auth.continue">Continue</button>' +
            '</div>' +

          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.addEventListener('DOMContentLoaded', function(){
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.applyTenantMarkers) window.applyTenantMarkers(document.getElementById('authModalBackdrop'));
    if (window.i18n && window.i18n.apply) window.i18n.apply(document.getElementById('authModalBackdrop'));

    var backdrop = document.getElementById('authModalBackdrop');
    var closeBtn = document.getElementById('authModalClose');
    var stepPhone = document.getElementById('authStepPhone');
    var stepOtp = document.getElementById('authStepOtp');
    var stepSuccess = document.getElementById('authStepSuccess');
    var phoneInput = document.getElementById('authPhoneInput');
    var phoneError = document.getElementById('authPhoneError');
    var sendOtpBtn = document.getElementById('authSendOtpBtn');
    var otpInputs = Array.prototype.slice.call(document.querySelectorAll('#authOtpRow input'));
    var otpError = document.getElementById('authOtpError');
    var verifyBtn = document.getElementById('authVerifyBtn');
    var otpPhoneDisplay = document.getElementById('authOtpPhoneDisplay');
    var editNumberBtn = document.getElementById('authEditNumberBtn');
    var resendWrap = document.getElementById('authResendWrap');
    var resendTimerEl = document.getElementById('authResendTimer');
    var resendBtn = document.getElementById('authResendBtn');
    var doneBtn = document.getElementById('authDoneBtn');

    var resendInterval = null;

    function showStep(step){
      [stepPhone, stepOtp, stepSuccess].forEach(function(s){ s.classList.remove('active'); });
      step.classList.add('active');
    }

    function openModal(){
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      showStep(stepPhone);
      phoneInput.value = '';
      phoneError.classList.remove('show');
      setTimeout(function(){ phoneInput.focus(); }, 50);
    }

    function closeModal(){
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
      clearInterval(resendInterval);
      window.dispatchEvent(new CustomEvent('np:auth-modal-closed'));
    }

    document.querySelectorAll('.js-open-auth').forEach(function(trigger){
      trigger.addEventListener('click', function(e){
        e.preventDefault();
        openModal();
      });
    });

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function(e){ if(e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && backdrop.classList.contains('open')) closeModal(); });

    phoneInput.addEventListener('input', function(){
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
      phoneError.classList.remove('show');
    });

    function startResendTimer(seconds){
      var remaining = seconds || RESEND_SECONDS;
      resendWrap.style.display = '';
      resendBtn.style.display = 'none';
      clearInterval(resendInterval);
      function tick(){
        var mm = String(Math.floor(remaining / 60)).padStart(2, '0');
        var ss = String(remaining % 60).padStart(2, '0');
        resendTimerEl.textContent = mm + ':' + ss;
        if(remaining <= 0){
          clearInterval(resendInterval);
          resendWrap.style.display = 'none';
          resendBtn.style.display = '';
          return;
        }
        remaining--;
      }
      tick();
      resendInterval = setInterval(tick, 1000);
    }

    function goToOtpStep(resendSeconds){
      otpPhoneDisplay.textContent = '+91 ' + phoneInput.value;
      otpInputs.forEach(function(inp){ inp.value = ''; });
      otpError.classList.remove('show');
      showStep(stepOtp);
      startResendTimer(resendSeconds);
      setTimeout(function(){ otpInputs[0].focus(); }, 50);
    }

    function setBtnLoading(btn, loading, labelKey){
      btn.disabled = loading;
      btn.textContent = loading ? t('auth.pleaseWait') : t(labelKey);
    }

    sendOtpBtn.addEventListener('click', function(){
      if(phoneInput.value.length !== 10){
        phoneError.classList.add('show');
        phoneInput.focus();
        return;
      }
      phoneError.classList.remove('show');
      setBtnLoading(sendOtpBtn, true, 'auth.sendOtp');
      window.apiV1.sendOtp('+91' + phoneInput.value).then(function(res){
        setBtnLoading(sendOtpBtn, false, 'auth.sendOtp');
        currentOtpId = res.otp_id;
        currentResendSeconds = res.resend_after || RESEND_SECONDS;
        goToOtpStep(currentResendSeconds);
      }).catch(function(err){
        setBtnLoading(sendOtpBtn, false, 'auth.sendOtp');
        phoneError.textContent = (err && err.detail) || t('auth.sendOtpError');
        phoneError.classList.add('show');
      });
    });

    phoneInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter') sendOtpBtn.click();
    });

    editNumberBtn.addEventListener('click', function(e){
      // Defends against iOS/Android auto-linking the adjacent phone number
      // text into a tel: link (see the format-detection meta tag added to
      // every page's <head>) - without this, a tap near the boundary of
      // that auto-link could open the native dialer instead of this button.
      e.preventDefault();
      e.stopPropagation();
      showStep(stepPhone);
      clearInterval(resendInterval);
      setTimeout(function(){ phoneInput.focus(); }, 50);
    });

    otpInputs.forEach(function(inp, idx){
      inp.addEventListener('input', function(){
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        otpError.classList.remove('show');
        if(inp.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
      });
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Backspace' && !inp.value && idx > 0) otpInputs[idx - 1].focus();
        if(e.key === 'Enter') verifyBtn.click();
      });
      inp.addEventListener('paste', function(e){
        var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        if(!text) return;
        e.preventDefault();
        text.split('').forEach(function(ch, i){ if(otpInputs[i]) otpInputs[i].value = ch; });
        otpInputs[Math.min(text.length, otpInputs.length) - 1].focus();
      });
    });

    resendBtn.addEventListener('click', function(){
      resendBtn.disabled = true;
      window.apiV1.sendOtp('+91' + phoneInput.value).then(function(res){
        resendBtn.disabled = false;
        currentOtpId = res.otp_id;
        currentResendSeconds = res.resend_after || RESEND_SECONDS;
        otpInputs.forEach(function(inp){ inp.value = ''; });
        otpError.classList.remove('show');
        otpInputs[0].focus();
        startResendTimer(currentResendSeconds);
      }).catch(function(err){
        resendBtn.disabled = false;
        otpError.textContent = (err && err.detail) || t('auth.resendOtpError');
        otpError.classList.add('show');
      });
    });

    verifyBtn.addEventListener('click', function(){
      var otp = otpInputs.map(function(inp){ return inp.value; }).join('');
      if(otp.length !== 6){
        otpError.textContent = t('auth.enterCompleteOtp');
        otpError.classList.add('show');
        return;
      }
      otpError.classList.remove('show');
      setBtnLoading(verifyBtn, true, 'auth.verifyAndLogin');
      window.apiV1.verifyOtp({ otpId: currentOtpId, otp: otp }).then(function(res){
        setBtnLoading(verifyBtn, false, 'auth.verifyAndLogin');
        window.setTokens(res);
        window.emitAuthChange();
        showStep(stepSuccess);
      }).catch(function(err){
        setBtnLoading(verifyBtn, false, 'auth.verifyAndLogin');
        otpError.textContent = (err && err.detail) || t('auth.incorrectOtp');
        otpError.classList.add('show');
        if(err && err.code === 'otp_attempts_exhausted'){
          showStep(stepPhone);
          setTimeout(function(){ phoneInput.focus(); }, 50);
        }
      });
    });

    doneBtn.addEventListener('click', closeModal);

    window.openAuthModal = openModal;
  });
})();
