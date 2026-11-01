(function(){
  var STORAGE_KEY = 'np_lang';
  var DICTS = { en: window.I18N_EN || {}, hi: window.I18N_HI || {} };

  function getLang(){
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === 'hi' || v === 'en') ? v : 'en';
    } catch(e){ return 'en'; }
  }

  function t(key){
    var lang = getLang();
    var dict = DICTS[lang] || DICTS.en;
    if (dict[key] !== undefined) return dict[key];
    if (DICTS.en[key] !== undefined) return DICTS.en[key];
    return key;
  }

  function applyTranslations(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(function(el){
      var pairs = el.getAttribute('data-i18n-attr').split(',');
      pairs.forEach(function(pair){
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        el.setAttribute(attr, t(key));
      });
    });

    // Tenant-authored content (baked per-tenant from config, not covered by
    // the dictionary above) that has an optional Hindi counterpart baked
    // into a data-hi-text / data-hi-html-b64 attribute by bake-tenants.js.
    // Falls back to the original (English) baked content when no Hindi
    // value was authored for this tenant/field.
    var lang = getLang();
    root.querySelectorAll('[data-i18n-swap="text"]').forEach(function(el){
      if (!el.dataset.i18nEnText) el.dataset.i18nEnText = el.textContent;
      var hi = el.getAttribute('data-hi-text');
      el.textContent = (lang === 'hi' && hi) ? hi : el.dataset.i18nEnText;
    });
    root.querySelectorAll('[data-i18n-swap="html"]').forEach(function(el){
      if (el.dataset.i18nEnHtml === undefined) el.dataset.i18nEnHtml = el.innerHTML;
      var hiB64 = el.getAttribute('data-hi-html-b64');
      var hi = hiB64 ? decodeURIComponent(escape(atob(hiB64))) : '';
      el.innerHTML = (lang === 'hi' && hi) ? hi : el.dataset.i18nEnHtml;
    });

    document.documentElement.setAttribute('lang', getLang() === 'hi' ? 'hi' : 'en');
  }

  function syncToggles(){
    var lang = getLang();
    document.querySelectorAll('.js-lang-select').forEach(function(sel){
      sel.value = lang;
      if (sel._ddSync) sel._ddSync();
    });
  }

  function setLang(lang){
    if (lang !== 'hi' && lang !== 'en') return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
    applyTranslations(document);
    syncToggles();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: lang } }));
  }

  var LABELS = { en: 'English', hi: 'हिंदी' };

  function buildCustomDropdown(sel){
    if (sel.dataset.ddEnhanced) return;
    sel.dataset.ddEnhanced = '1';

    var wrap = document.createElement('div');
    wrap.className = 'lang-dd' + (sel.classList.contains('lang-pill-drawer') ? ' lang-dd-drawer' : '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var label = document.createElement('span');
    label.className = 'lang-dd-label';
    btn.appendChild(label);
    var caret = document.createElement('i');
    caret.className = 'fa-solid fa-chevron-down lang-dd-caret';
    btn.appendChild(caret);

    var menu = document.createElement('ul');
    menu.className = 'lang-dd-menu';
    menu.setAttribute('role', 'listbox');
    Array.prototype.forEach.call(sel.options, function(opt){
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.dataset.value = opt.value;
      li.textContent = LABELS[opt.value] || opt.textContent;
      menu.appendChild(li);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    sel.insertAdjacentElement('afterend', wrap);
    sel.hidden = true;
    sel.setAttribute('aria-hidden', 'true');
    sel.tabIndex = -1;

    function sync(){
      label.textContent = LABELS[sel.value] || sel.value;
      Array.prototype.forEach.call(menu.children, function(li){
        li.classList.toggle('active', li.dataset.value === sel.value);
      });
    }
    sync();

    function close(){
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function open(){
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      wrap.classList.contains('open') ? close() : open();
    });
    menu.addEventListener('click', function(e){
      var li = e.target.closest('li');
      if (!li) return;
      if (li.dataset.value !== sel.value) {
        sel.value = li.dataset.value;
        sel.dispatchEvent(new Event('change'));
      }
      close();
    });
    document.addEventListener('click', function(e){
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') close();
    });

    sel._ddSync = sync;
  }

  function initToggles(){
    document.querySelectorAll('.js-lang-select').forEach(function(sel){
      sel.addEventListener('change', function(){
        setLang(sel.value);
      });
      buildCustomDropdown(sel);
    });
    syncToggles();
  }

  window.i18n = { t: t, apply: applyTranslations, setLang: setLang, getLang: getLang };

  function init(){
    applyTranslations(document);
    initToggles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
