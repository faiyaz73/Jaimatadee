function mainT(key) {
  return window.i18n ? window.i18n.t(key) : key;
}

// Play Store links: tag each with a Play Install Referrer string so app-side
// install attribution can tell which on-site surface (dashboard card, bottom
// sheet, footer badge, ...) drove the install. The tenant config only holds
// one bare playStoreUrl, shared by every link to it - the surface-specific
// bit lives in each anchor's data-app-medium attribute instead, so one URL
// can carry different referrer values depending on where it was clicked.
(function () {
  try {
    var links = document.querySelectorAll('a[data-app-medium][href*="play.google.com"]');
    links.forEach(function (a) {
      var medium = a.getAttribute('data-app-medium');
      if (!medium) return;
      var referrer = 'utm_source=website&utm_medium=' + encodeURIComponent(medium) + '&utm_campaign=app_download_prompt';
      var url = new URL(a.href, window.location.origin);
      url.searchParams.set('referrer', referrer);
      a.href = url.toString();
    });
  } catch (e) { /* never let referrer tagging break the Play Store link itself */ }
})();

// Navigating to "page.html#section" from a DIFFERENT page loads a fresh
// document whose above-the-fold sections (routes carousel, passes grid,
// gallery, ...) render asynchronously from API calls and grow the page
// height well after the browser's one-time hash scroll already ran - so
// the initial scroll lands short of the target. A same-page hash click or
// a hard refresh doesn't hit this (content is already settled by the time
// the browser scrolls). Watch the page for the layout shifts those async
// sections cause and re-scroll to the target while they're still landing,
// instead of guessing fixed delays; stop once the page stops growing.
(function () {
  try {
    if (!location.hash || typeof ResizeObserver === 'undefined') return;
    var id = location.hash.slice(1);
    var settleTimer = null;

    var observer = new ResizeObserver(function () {
      try {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: 'start' });
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () { observer.disconnect(); }, 800);
      } catch (e) { /* never let a scroll-restore glitch break the page */ }
    });
    observer.observe(document.body);

    // Nothing ever resized (page was already static/cached) - stop watching.
    settleTimer = setTimeout(function () { observer.disconnect(); }, 800);
  } catch (e) { /* never let a scroll-restore glitch break the page */ }
})();

// Homepage scroll-spy: highlight whichever header nav item matches the
// section currently in view, instead of leaving "Home" underlined no
// matter how far down the page you've scrolled.
//
// The three homepage variants (index.html, index_v2.html, index_v3.html)
// are NOT structurally interchangeable - verified against
// templates/index.html, templates/index_v2.html and templates/index_v3.html
// directly rather than assumed:
//   - index.html:    header nav is <nav class="nav">,       links use data-i18n="nav.*"
//   - index_v2.html:  header nav is <nav class="nav">,       links use data-i18n="nav.*"
//   - index_v3.html:  header nav is <nav class="main-nav">,  links use data-i18n="indexV3.nav.*"
//     and index_v3 has NO "Fleet" nav item / no #fleet section at all - its
//     nav has extra items (Pilgrimage, Help Center, Track Booking) that
//     don't correspond to any on-page section and must be left alone, not
//     guessed at.
// Each variant is handled by its own explicit, hand-verified id map -
// nothing here is inferred from a shared prefix or a shared class name.
// document.body's data-page attribute (baked identically on every page,
// e.g. data-page="index_v2") says unambiguously which variant is live.
(function () {
  try {
    var page = document.body.getAttribute('data-page');

    var CONFIGS = {
      index: {
        navSelector: '.nav a[data-i18n]',
        sections: {
          'nav.fleet': 'fleet',
          'nav.about': 'about',
          'nav.routes': 'routes',
          'nav.passes': 'passes',
          'nav.contact': 'contact'
        },
        homeKey: 'nav.home'
      },
      index_v2: {
        navSelector: '.nav a[data-i18n]',
        sections: {
          'nav.fleet': 'fleet-v2',
          'nav.about': 'about-v2',
          'nav.routes': 'routes-v2',
          'nav.passes': 'passes-v2',
          'nav.contact': 'contact'
        },
        homeKey: 'nav.home'
      },
      index_v3: {
        navSelector: 'nav.main-nav a[data-i18n]',
        sections: {
          'indexV3.nav.about': 'about-v3',
          'indexV3.nav.passes': 'passes-v3',
          'indexV3.nav.contact': 'contact'
        },
        homeKey: 'indexV3.nav.home'
      }
    };

    var config = CONFIGS[page];
    if (!config) return; // not a homepage variant - nothing to spy on

    var navLinks = Array.prototype.slice.call(document.querySelectorAll(config.navSelector));
    if (!navLinks.length) return;

    var entries = navLinks.map(function (link) {
      var key = link.getAttribute('data-i18n');
      if (key === config.homeKey) return { link: link, section: null, isHome: true };
      var sectionId = config.sections[key];
      if (!sectionId) return null; // nav item with no on-page section (Pilgrimage, Help Center, ...) - leave untouched
      var section = document.getElementById(sectionId);
      if (!section) return null; // section not rendered for this tenant (e.g. passes disabled)
      return { link: link, section: section, isHome: false };
    }).filter(Boolean);

    var sectioned = entries.filter(function (e) { return e.section; });
    if (!sectioned.length) return;

    function setActive(entry) {
      entries.forEach(function (e) { e.link.classList.toggle('active', e === entry); });
    }

    function currentEntry() {
      // Nav order (Fleet, then Passes) doesn't match page order (passes-v2
      // sits above fleet-v2 in the DOM on index_v2) - picking "last section
      // that qualifies in array order" previously let a later-in-nav
      // section whose offsetTop still qualified stomp over the correct,
      // physically-closer one. Track the closest (largest) offsetTop
      // instead, so whichever section the scroll position is actually
      // inside of wins regardless of nav order.
      var y = window.scrollY + window.innerHeight * 0.3;
      var current = entries.find(function (e) { return e.isHome; }) || null;
      var bestTop = -Infinity;
      sectioned.forEach(function (e) {
        var top = e.section.getBoundingClientRect().top + window.scrollY; // document position (offsetTop is relative to the offsetParent)
        if (top <= y && top > bestTop) {
          bestTop = top;
          current = e;
        }
      });
      return current;
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        try {
          var entry = currentEntry();
          if (entry) setActive(entry);
        } catch (e) { /* never let a scroll-spy glitch break the page */ }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } catch (e) { /* never let a scroll-spy glitch break the page */ }
})();

// Shared live town-search autocomplete (GET /towns via window.apiV1.searchTowns)
// used by the homepage search widget and reused as-is anywhere else a
// from/to town picker is needed (e.g. luggage-booking.js), so every page
// searches the same live town data instead of a static/local list.
//
// originIdInput: when set, this field only searches towns reachable FROM
// that origin (the To field) - it's disabled until an origin is chosen,
// and its selection is cleared whenever the origin changes, since the old
// destination may not be reachable from the new one.
function setupTownAutocomplete(input, hidden, dropdown, excludeIdInput, originIdInput, onSelect) {
    let highlighted = -1;
    let matches = [];
    let debounceTimer = null;
    let requestSeq = 0;

    function excludeId() {
      return excludeIdInput?.value;
    }

    function fetchTowns(q) {
      const seq = ++requestSeq;
      const fromFilter = originIdInput ? originIdInput.value : undefined;
      window.apiV1.searchTowns(q, { from: fromFilter }).then(res => {
        console.log("ssssssssssss",res.towns.find(t => t.id === 2881));
        if (seq !== requestSeq) return; // stale response, newer request superseded it
        const ex = excludeId();
        matches = (res.towns || [])
          .filter(t => !ex || String(t.id) !== String(ex))
          .map(t => ({ id: t.id, name: t.display_name || t.name, name_hindi: t.name_hindi || (/[ऀ-ॿ]/.test(t.native_name || '') ? t.native_name : '') }));
        highlighted = -1;
        render();
      }).catch(() => {
        matches = [];
        render();
      });
    }

    function render() {
      dropdown.innerHTML = '';
      if (!matches.length) {
        dropdown.innerHTML = '<div class="autocomplete-empty">' + mainT('search.noMatchingCity') + '</div>';
      } else {
        matches.forEach((city, i) => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item' + (i === highlighted ? ' highlighted' : '');
          item.textContent = city.name;
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            select(city);
          });
          dropdown.appendChild(item);
        });
      }
      dropdown.classList.add('open');
    }

    function select(city) {
      input.value = city.name;
      hidden.value = city.id;
      dropdown.classList.remove('open');
      if (onSelect) onSelect(city);
    }

    function clear() {
      input.value = '';
      hidden.value = '';
    }

    function close() {
      dropdown.classList.remove('open');
      highlighted = -1;
      clearTimeout(debounceTimer);
    }

    function originReady() {
      return !originIdInput || originIdInput.value;
    }

    input.addEventListener('input', () => {
      hidden.value = '';
      const q = input.value.trim();
      highlighted = -1;
      clearTimeout(debounceTimer);
      if (!q || !originReady()) { close(); return; }
      debounceTimer = setTimeout(() => fetchTowns(q), 200);
    });

    input.addEventListener('focus', () => {
      if (!originReady()) return;
      const q = input.value.trim();
      highlighted = -1;
      clearTimeout(debounceTimer);
      fetchTowns(q);
    });

    input.addEventListener('keydown', (e) => {
      if (!dropdown.classList.contains('open') || !matches.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlighted = Math.min(highlighted + 1, matches.length - 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlighted = Math.max(highlighted - 1, 0);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted >= 0) select(matches[highlighted]);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    input.addEventListener('blur', () => setTimeout(close, 100));

    return { clear };
}
window.setupTownAutocomplete = setupTownAutocomplete;

document.addEventListener('DOMContentLoaded', () => {
  const swapBtn = document.querySelector('.swap-btn');
  const fromCity = document.getElementById('fromCity');
  const toCity = document.getElementById('toCity');
  const fromCityId = document.getElementById('fromCityId');
  const toCityId = document.getElementById('toCityId');
  const fromCityDropdown = document.getElementById('fromCityDropdown');
  const toCityDropdown = document.getElementById('toCityDropdown');
  const journeyDate = document.getElementById('journeyDate');
  const searchBtn = document.getElementById('searchSubmit');
  const searchError = document.getElementById('searchError');

  function setToCityEnabled(enabled) {
    if (!toCity) return;
    toCity.disabled = !enabled;
    var t = window.i18n ? window.i18n.t : function (k) { return k; };
    toCity.placeholder = enabled ? t('index.hero.toPlaceholderEnabled') : t('index.hero.toPlaceholder');
  }

  let toAutocomplete = null;
  if (toCity && toCityId && toCityDropdown) {
    setToCityEnabled(!!fromCityId.value);
    toAutocomplete = setupTownAutocomplete(toCity, toCityId, toCityDropdown, fromCityId, fromCityId);
    document.addEventListener('i18n:changed', function () { setToCityEnabled(!!fromCityId.value); });
  }

  // Origin changed (typed or picked from the dropdown) - the previously
  // chosen destination may not be reachable from it any more, so drop it
  // rather than silently searching a route that was never actually
  // selected against the new origin.
  function onOriginChanged() {
    setToCityEnabled(!!fromCityId.value);
    toAutocomplete?.clear();
  }
  if (fromCity && fromCityId && fromCityDropdown) {
    setupTownAutocomplete(fromCity, fromCityId, fromCityDropdown, toCityId, null, onOriginChanged);
    fromCity.addEventListener('input', onOriginChanged);
  }

  swapBtn?.addEventListener('click', () => {
    if (!fromCity || !toCity || !fromCityId || !toCityId) return;
    [fromCity.value, toCity.value] = [toCity.value, fromCity.value];
    [fromCityId.value, toCityId.value] = [toCityId.value, fromCityId.value];
    setToCityEnabled(!!fromCityId.value);
  });

  // toISOString() converts to UTC first, which rolls back to the previous
  // day's date for any IST user before 5:30am local time - use local
  // year/month/day instead so the default date always matches "today" in
  // the visitor's own timezone.
  // Default date is "today" in IST, whatever timezone the visitor is in.
  function localDateStr(d) {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  if (journeyDate && !journeyDate.value) {
    journeyDate.value = localDateStr(new Date());
    journeyDate.min = journeyDate.value;
  }

  searchBtn?.addEventListener('click', () => {
    searchError.style.display = 'none';

    if (!fromCityId.value || !toCityId.value) {
      searchError.textContent = mainT('search.errInvalidCities');
      searchError.style.display = 'block';
      return;
    }
    if (fromCityId.value === toCityId.value) {
      searchError.textContent = mainT('search.errSameCities');
      searchError.style.display = 'block';
      return;
    }
    if (!journeyDate.value) {
      searchError.textContent = mainT('search.errNoDate');
      searchError.style.display = 'block';
      return;
    }

    const buildParams = (townNamesBothLangs) => new URLSearchParams({
      from: fromCityId.value,
      to: toCityId.value,
      depart: journeyDate.value,
      fromName: (townNamesBothLangs && townNamesBothLangs.en[fromCityId.value]) || fromCity.value,
      toName: (townNamesBothLangs && townNamesBothLangs.en[toCityId.value]) || toCity.value,
      fromNameHi: (townNamesBothLangs && townNamesBothLangs.hi[fromCityId.value]) || fromCity.value,
      toNameHi: (townNamesBothLangs && townNamesBothLangs.hi[toCityId.value]) || toCity.value
    });
    if (window.apiV1 && window.apiV1.getTownNamesBothLangs) {
      window.apiV1.getTownNamesBothLangs().then((m) => {
        window.location.href = `results.html?${buildParams(m).toString()}`;
      }).catch(() => {
        window.location.href = `results.html?${buildParams().toString()}`;
      });
    } else {
      window.location.href = `results.html?${buildParams().toString()}`;
    }
  });

  const navToggle = document.getElementById('navToggle');
  const drawerClose = document.getElementById('drawerClose');
  const sideDrawer = document.getElementById('sideDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  function openDrawer() {
    sideDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    sideDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  navToggle?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-nav a, .drawer-login').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  function updateCarouselNav(trackEl, nextBtn, prevBtn) {
    if (!trackEl || !nextBtn) return;
    const hasOverflow = trackEl.scrollWidth - trackEl.clientWidth > 4;
    nextBtn.style.display = hasOverflow ? '' : 'none';
    if (prevBtn) prevBtn.style.display = hasOverflow ? '' : 'none';
  }

  const routesTrack = document.getElementById('routesTrack');
  const routesPrev = document.getElementById('routesPrev');
  const routesNext = document.getElementById('routesNext');
  routesPrev?.addEventListener('click', () => {
    routesTrack.scrollBy({ left: -324, behavior: 'smooth' });
  });
  routesNext?.addEventListener('click', () => {
    routesTrack.scrollBy({ left: 324, behavior: 'smooth' });
  });

  const galleryTrack = document.getElementById('galleryTrack');
  const galleryNext = document.getElementById('galleryNext');
  galleryNext?.addEventListener('click', () => {
    galleryTrack.scrollBy({ left: 324, behavior: 'smooth' });
  });

  const routesRow = document.getElementById('routesRow');
  const routesRowNext = document.getElementById('routesRowNext');
  const routesRowPrev = document.getElementById('routesRowPrev');
  const galleryPrev = document.getElementById('galleryPrev');

  const carouselPairs = [
    [routesTrack, routesNext, routesPrev],
    [galleryTrack, galleryNext, galleryPrev],
    [routesRow, routesRowNext, routesRowPrev]
  ];
  carouselPairs.forEach(([trackEl, nextBtn, prevBtn]) => {
    if (!trackEl || !nextBtn) return;
    updateCarouselNav(trackEl, nextBtn, prevBtn);
    new MutationObserver(() => updateCarouselNav(trackEl, nextBtn, prevBtn)).observe(trackEl, { childList: true });
    new ResizeObserver(() => updateCarouselNav(trackEl, nextBtn, prevBtn)).observe(trackEl);
  });
  window.addEventListener('resize', () => {
    carouselPairs.forEach(([trackEl, nextBtn, prevBtn]) => updateCarouselNav(trackEl, nextBtn, prevBtn));
  });

  if (galleryTrack) {
    let galleryAutoTimer = null;
    let galleryPaused = false;
    function galleryAutoStep() {
      if (galleryPaused || document.getElementById('galleryLightbox')?.classList.contains('open')) return;
      const atEnd = galleryTrack.scrollLeft + galleryTrack.clientWidth >= galleryTrack.scrollWidth - 4;
      if (atEnd) {
        galleryTrack.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        galleryTrack.scrollBy({ left: 324, behavior: 'smooth' });
      }
    }
    galleryAutoTimer = setInterval(galleryAutoStep, 3000);
    galleryTrack.addEventListener('mouseenter', () => { galleryPaused = true; });
    galleryTrack.addEventListener('mouseleave', () => { galleryPaused = false; });
    galleryTrack.addEventListener('touchstart', () => { galleryPaused = true; }, { passive: true });
  }

  const galleryImgs = galleryTrack ? Array.from(galleryTrack.querySelectorAll('img')) : [];
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('galleryLightboxImg');
  const lightboxCaption = document.getElementById('galleryLightboxCaption');
  const lightboxClose = document.getElementById('galleryLightboxClose');
  const lightboxPrev = document.getElementById('galleryLightboxPrev');
  const lightboxNext = document.getElementById('galleryLightboxNext');
  let lightboxIndex = 0;

  function showLightbox(index) {
    lightboxIndex = (index + galleryImgs.length) % galleryImgs.length;
    const img = galleryImgs[lightboxIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    if (lightboxCaption) lightboxCaption.textContent = img.alt;
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
  }

  galleryImgs.forEach((img, i) => {
    img.addEventListener('click', () => showLightbox(i));
  });
  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', () => showLightbox(lightboxIndex - 1));
  lightboxNext?.addEventListener('click', () => showLightbox(lightboxIndex + 1));
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
  });

  const trustItems = document.querySelectorAll('.search-trust-row span');
  if (trustItems.length) {
    let trustIndex = 0;
    trustItems[0].classList.add('ticker-active');
    setInterval(() => {
      trustItems[trustIndex].classList.remove('ticker-active');
      trustIndex = (trustIndex + 1) % trustItems.length;
      trustItems[trustIndex].classList.add('ticker-active');
    }, 2200);
  }
});
