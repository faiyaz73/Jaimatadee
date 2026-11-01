const SEAT_ICON = (fillTop, fillBottom) => `<svg viewBox="0 0 50 50" class="seat-icon-svg">
<path d="M42.32,18.39h-1.53v-7.97c0-2.79-2.27-5.06-5.06-5.06H12.29c-2.79,0-5.06,2.27-5.06,5.06v7.97h-1.24c-1.23,0-2.22,1-2.22,2.22v20.08c0,2.89,2.36,5.25,5.25,5.25h29.91c3.09,0,5.61-2.52,5.61-5.61V20.62c0-1.23-1-2.22-2.22-2.22ZM8.34,10.42c0-2.18,1.77-3.95,3.95-3.95h23.45c2.18,0,3.95,1.77,3.95,3.95v7.97h-1.15c-1.23,0-2.22,1-2.22,2.22v12.45c0,2.61-2.13,4.74-4.74,4.74h-14.68c-2.75,0-4.99-2.24-4.99-4.99v-12.2c0-1.23-1-2.22-2.22-2.22h-1.35v-7.97Z"/>
<path fill="${fillTop}" d="M8.34,10.42c0-2.18,1.77-3.95,3.95-3.95h23.45c2.18,0,3.95,1.77,3.95,3.95v7.97h-1.15c-1.23,0-2.22,1-2.22,2.22v12.45c0,2.61-2.13,4.74-4.74,4.74h-14.68c-2.75,0-4.99-2.24-4.99-4.99v-12.2c0-1.23-1-2.22-2.22-2.22h-1.35v-7.97Z"/>
<path fill="${fillBottom}" d="M43.44,40.33c0,2.48-2.02,4.51-4.51,4.51H9.03c-2.29,0-4.14-1.86-4.14-4.14V20.62c0-.62,.5-1.12,1.12-1.12h3.69c.62,0,1.12,.5,1.12,1.12v12.2c0,3.36,2.73,6.09,6.09,6.09h14.68c3.22,0,5.84-2.62,5.84-5.84v-12.45c0-.62,.5-1.12,1.12-1.12h1.15v.02l.04-.02h2.59c.62,0,1.12,.5,1.12,1.12v19.72Z"/>
</svg>`;

const SEAT_ICONS = {
  available: SEAT_ICON('#fff', '#fff'),
  booked: SEAT_ICON('#E5E7EB', '#E5E7EB'),
  selected: SEAT_ICON('#2563EB', '#2563EB')
};

// Sleeper berth: body (recoloured per state by results.css like the seater
// icon) plus a pillow bar. Vertical = 50x95, used where the bus runs top to
// bottom (mobile); horizontal = the same drawing turned 90deg, used on the
// desktop grid which is rotated CCW.
const SLEEPER_PATHS = (fill) => `<path fill="${fill}" d="M13.234,6.404H36.766A8.44,8.44,0,0,1,45.206,14.844V81.06A8.44,8.44,0,0,1,36.766,89.501H13.234A8.44,8.44,0,0,1,4.794,81.06V14.844A8.44,8.44,0,0,1,13.234,6.404Z"/>
<path d="M36.765,90.654H13.235c-5.29,0-9.594-4.304-9.594-9.594V14.845c0-5.29,4.304-9.594,9.594-9.594h23.531c5.29,0,9.594,4.304,9.594,9.594V81.06c0,5.29-4.304,9.594-9.594,9.594ZM13.235,6.404c-4.654,0-8.44,3.787-8.44,8.44V81.06c0,4.654,3.787,8.44,8.44,8.44h23.531c4.654,0,8.44-3.787,8.44-8.44V14.845c0-4.654-3.787-8.44-8.44-8.44H13.235Z"/>
<path d="M15.544,75.45H34.221A3.421,3.421,0,0,1,37.642,78.871V79.611A3.421,3.421,0,0,1,34.221,83.032H15.544A3.421,3.421,0,0,1,12.123,79.611V78.871A3.421,3.421,0,0,1,15.544,75.45Z"/>`;
const SLEEPER_ICON = (fill) => `<svg viewBox="0 0 50 95" class="seat-icon-svg">${SLEEPER_PATHS(fill)}</svg>`;
const SLEEPER_ICON_H = (fill) => `<svg viewBox="0 0 95 50" class="seat-icon-svg"><g transform="translate(95 0) rotate(90)">${SLEEPER_PATHS(fill)}</g></svg>`;
const SLEEPER_ICONS = {
  vertical: { available: SLEEPER_ICON('#fff'), booked: SLEEPER_ICON('#E5E7EB'), selected: SLEEPER_ICON('#2563EB') },
  horizontal: { available: SLEEPER_ICON_H('#fff'), booked: SLEEPER_ICON_H('#E5E7EB'), selected: SLEEPER_ICON_H('#2563EB') }
};

function isBookingEnabled() {
  return window.__TENANT_CONFIG__ ? window.__TENANT_CONFIG__.bookingEnabled !== false : true;
}

// Pink-seat colouring (female-occupied seats) is a Jaimangla-only pilot -
// the backend field (is_female_occupied) is safe to read for every tenant,
// but only this tenant should actually render the pink state until the
// feature is confirmed ready for the rest of the platform.
const PINK_SEATS_TENANT = 'jfcs';
function isPinkSeatsEnabled() {
  return window.__TENANT_ID__ === PINK_SEATS_TENANT;
}

function t(key) {
  return window.i18n ? window.i18n.t(key) : key;
}

let seatToastTimer = null;
function showSeatToast(message) {
  let el = document.getElementById('seatLimitToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'seatLimitToast';
    el.className = 'seat-limit-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(seatToastTimer);
  seatToastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatSectionDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// Both-language town names carried on the redirect link (fromName/toName =
// English, fromNameHi/toNameHi = Hindi) - read once at load, referenced
// again by the i18n:changed handler below to swap instantly.
let fromNameEn = '';
let toNameEn = '';
let fromNameHi = '';
let toNameHi = '';

document.addEventListener('DOMContentLoaded', async () => {
  const modifySearchLink = document.getElementById('modifySearchLink');
  if (modifySearchLink) {
    const PAGE_RE = /\/([a-zA-Z0-9_-]+?)(?:\.html)?(?:$|[?#])/;
    const RESULTS_RE = /\/results(?:\.html)?(?:$|[?#])/;
    let referrerPage = null;
    if (document.referrer && !RESULTS_RE.test(document.referrer)) {
      const match = document.referrer.match(PAGE_RE);
      referrerPage = match && match[1] ? match[1] + '.html' : 'index.html';
    }
    if (referrerPage) {
      sessionStorage.setItem('modifySearchOrigin', referrerPage);
    }
    const origin = sessionStorage.getItem('modifySearchOrigin');
    if (origin) modifySearchLink.href = origin;
  }

  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');
  const to = params.get('to');
  const depart = params.get('depart');
  fromNameEn = params.get('fromName') || '';
  toNameEn = params.get('toName') || '';
  fromNameHi = params.get('fromNameHi') || fromNameEn;
  toNameHi = params.get('toNameHi') || toNameEn;
  const isHi = (window.i18n && window.i18n.getLang && window.i18n.getLang() === 'hi');
  let fromName = (isHi ? fromNameHi : fromNameEn) || t('results.origin');
  let toName = (isHi ? toNameHi : toNameEn) || t('results.destination');

  const routeHeading = document.getElementById('routeHeading');
  const resultsState = document.getElementById('resultsState');
  const resultsList = document.getElementById('resultsList');

  routeHeading.innerHTML = `${fromName} <i class="fa-solid fa-arrow-right" style="font-size:20px;color:var(--primary)"></i> ${toName}`;
  const routeBannerDate = document.getElementById('routeBannerDate');
  if (routeBannerDate && depart) routeBannerDate.textContent = formatSectionDate(depart);

  if (!from || !to || !depart) {
    resultsState.innerHTML = `<div class="state-msg error">${t('results.missingSearch')} <a href="/">${t('results.goBackSearch')}</a>.</div>`;
    return;
  }

  const tomorrow = addDays(depart, 1);
  const todayLabel = new Date(depart + 'T00:00:00').toDateString() === new Date().toDateString() ? t('results.today') : formatSectionDate(depart);

  resultsState.innerHTML = `<div class="state-msg loading"><i class="fa-solid fa-spinner fa-spin"></i> ${t('results.searchingBuses')}</div>`;

  let dataToday, dataTomorrow;
  try {
    [dataToday, dataTomorrow] = await Promise.all([
      apiV1.search({ from, to, date: depart }).catch(() => ({ results: [] })),
      apiV1.search({ from, to, date: tomorrow }).catch(() => ({ results: [] }))
    ]);
  } catch (e) {
    resultsState.innerHTML = `<div class="state-msg error">${t('results.loadError')}</div>`;
    return;
  }

  resultsState.innerHTML = '';

  lastResultsRenderCtx = {
    todayLabel, depart, dataToday, tomorrow, dataTomorrow, from, to, fromName, toName
  };
  renderResultsSections(lastResultsRenderCtx);
});

// Rebuilds the date-section cards from already-fetched search data (no
// refetch) - shared by the initial render and the i18n:changed re-render,
// since the cards are built from t() once at render time and won't pick up
// a language switch on their own otherwise.
let lastResultsRenderCtx = null;
function renderResultsSections(ctx) {
  const { todayLabel, depart, dataToday, tomorrow, dataTomorrow, from, to, fromName, toName } = ctx;
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';

  const sections = [
    { label: todayLabel, dateStr: depart, data: dataToday, reverseThumbs: false },
    { label: t('results.tomorrow'), dateStr: tomorrow, data: dataTomorrow, reverseThumbs: true }
  ];

  let anyResults = false;

  sections.forEach(section => {
    const reservations = section.data.results || [];
    if (reservations.length === 0) return;

    anyResults = true;
    const sectionEl = document.createElement('div');
    sectionEl.className = 'date-section';
    sectionEl.innerHTML = `
      <div class="date-section-header">
        <h2>${section.label}</h2>
        <span>${formatSectionDate(section.dateStr)} — ${reservations.length} ${reservations.length === 1 ? t('results.busSingular') : t('results.busPlural')} </span>
      </div>
      <div class="date-section-list"></div>
    `;
    const listEl = sectionEl.querySelector('.date-section-list');

    cardIndex = 0;
    reservations.forEach(res => listEl.appendChild(buildResultCard(res, { from, to, depart: section.dateStr, reverseThumbs: section.reverseThumbs, fromName, toName })));

    resultsList.appendChild(sectionEl);
  });

  if (!anyResults) {
    resultsList.insertAdjacentHTML('afterbegin', `<div class="state-msg empty"><i class="fa-solid fa-bus"></i><p>${t('results.noResults')}</p><a href="/" class="btn btn-outline">${t('results.tryDifferentSearch')}</a></div>`);
  }
}

// On language switch, town names and route/search data are both
// language-dependent (via the API's lang param) - refetch town display
// names for from/to and re-call the search (routes) API, not just
// re-render with the stale URL-param names.
document.addEventListener('i18n:changed', async () => {
  if (!lastResultsRenderCtx) return;
  const { from, to, depart, tomorrow } = lastResultsRenderCtx;

  // Swap instantly using the Hindi/English names the redirect link already
  // carried (fromNameHi/toNameHi), so the heading updates with no API wait.
  const isHi = window.i18n && window.i18n.getLang && window.i18n.getLang() === 'hi';
  const urlFromName = isHi ? fromNameHi : fromNameEn;
  const urlToName = isHi ? toNameHi : toNameEn;
  if (urlFromName) lastResultsRenderCtx.fromName = urlFromName;
  if (urlToName) lastResultsRenderCtx.toName = urlToName;

  const routeHeadingNow = document.getElementById('routeHeading');
  if (routeHeadingNow) {
    routeHeadingNow.innerHTML = `${lastResultsRenderCtx.fromName} <i class="fa-solid fa-arrow-right" style="font-size:20px;color:var(--primary)"></i> ${lastResultsRenderCtx.toName}`;
  }

  // Still refetch from the API - authoritative, and covers links that
  // didn't carry a Hindi name (older links, or a town added since).
  try {
    const townsRes = await window.apiV1.searchTowns('');
    const towns = (townsRes && townsRes.towns) || [];
    const fromTown = towns.find(t2 => String(t2.id) === String(from));
    const toTown = towns.find(t2 => String(t2.id) === String(to));
    if (fromTown) lastResultsRenderCtx.fromName = fromTown.display_name || fromTown.name;
    if (toTown) lastResultsRenderCtx.toName = toTown.display_name || toTown.name;
  } catch (e) {
    // Keep whatever names we already have if this lookup fails - not fatal.
  }

  const routeHeading = document.getElementById('routeHeading');
  if (routeHeading) {
    routeHeading.innerHTML = `${lastResultsRenderCtx.fromName} <i class="fa-solid fa-arrow-right" style="font-size:20px;color:var(--primary)"></i> ${lastResultsRenderCtx.toName}`;
  }

  try {
    const [dataToday, dataTomorrow] = await Promise.all([
      apiV1.search({ from, to, date: depart }).catch(() => ({ results: [] })),
      apiV1.search({ from, to, date: tomorrow }).catch(() => ({ results: [] }))
    ]);
    lastResultsRenderCtx.dataToday = dataToday;
    lastResultsRenderCtx.dataTomorrow = dataTomorrow;
  } catch (e) {
    // Keep previously-fetched results if refetch fails.
  }

  renderResultsSections(lastResultsRenderCtx);
});

const BUS_THUMBS = (function() {
  const assets = (window.__TENANT_CONFIG__ && window.__TENANT_CONFIG__.assets) || {};
  return ['busPhoto1', 'busPhoto2', 'busPhoto3'].map(function(key, i) {
    return assets[key] || window.tenantImagePath('b-' + (i + 1) + '.png');
  });
})();
const BUS_THUMBS_REVERSED = [...BUS_THUMBS].reverse();
let cardIndex = 0;

function formatClockTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

function formatDurationMinutes(mins) {
  if (!mins && mins !== 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m ? m + 'm' : ''}`.trim();
}

function buildResultCard(res, { from, to, depart, reverseThumbs, fromName, toName }) {
  const wrap = document.createElement('div');
  wrap.className = 'result-card-wrap';

  const isBestChoice = cardIndex === 0;
  const thumbSet = reverseThumbs ? BUS_THUMBS_REVERSED : BUS_THUMBS;
  const thumb = thumbSet[cardIndex % thumbSet.length];
  cardIndex++;

  const isAC = /non-ac/i.test(res.bus_type || '') ? false : /ac/i.test(res.bus_type || '');
  // Every card in this search shares the same origin/destination town, so
  // reuse the already display_name-enriched names from the search bar
  // instead of the plain (Gurmukhi-only) res.boarding_point/dropping_point.town.
  const fromTown = fromName || (res.boarding_point && res.boarding_point.town) || '';
  const toTown = toName || (res.dropping_point && res.dropping_point.town) || '';
  const operatorName = (res.operator && res.operator.name) || '';
  const deptTime = formatClockTime(res.departure_at);
  const arrTime = formatClockTime(res.arrival_at);
  const dayOff = Number(res.arrival_day_offset) || 0;
  const arrLabel = dayOff
    ? `<sup class="arr-next-day">(${dayOff === 1 ? t('results.nextDay') : t('results.plusDays').replace('{n}', dayOff)})</sup>`
    : '';
  const duration = formatDurationMinutes(res.duration_minutes);

  wrap.innerHTML = `
    <div class="result-card">
      <div class="result-thumb">
        <img src="${thumb}" alt="${operatorName || 'Bus'}">
        ${isBestChoice ? `<div class="result-ribbon"><i class="fa-solid fa-star"></i> ${t('results.bestChoice')}</div>` : ''}
      </div>
      <div class="result-main">
        <div class="result-route">
          <span class="route-number">${operatorName}</span>
          <span class="coach-name">${res.bus_type || ''}</span>
          ${res.bus_number ? `<span class="bus-number">${res.bus_number}</span>` : ''}
        </div>
        <div class="result-timing">
          <div class="time-block">
            <strong>${deptTime}</strong>
            <span>${fromTown}</span>
          </div>
          <div class="duration-block">
            <span>${duration}</span>
            <div class="duration-line"></div>
          </div>
          <div class="time-block">
            <strong>${arrTime} ${arrLabel}</strong>
            <span>${toTown}</span>
          </div>
        </div>
      </div>
      <div class="result-side">
        <div class="fare">₹${res.fare ?? '-'}</div>
        <div class="seats-left">${res.seats_available ?? '-'} ${t('results.seatsLeft')}</div>
        <button class="btn btn-primary view-seats-btn">${t('results.viewSeats')}</button>
      </div>
    </div>

    <div class="result-card-compact">
      <div class="rcc-top">
        <div class="rcc-time">
          <span>${deptTime}</span>
          <span class="rcc-dash">&mdash;</span>
          <span>${arrTime} ${arrLabel}</span>
          ${isAC ? '<span class="rcc-ac-badge">AC</span>' : ''}
        </div>
        <div class="rcc-price">₹${res.fare ?? '-'}</div>
      </div>
      <div class="rcc-sub">
        <span><i class="fa-regular fa-clock"></i> ${duration}</span>
        <span class="rcc-seats-available">&bull; ${res.seats_available > 0 ? t('results.seatsAvailable') : t('results.soldOut')}</span>
      </div>
      <div class="rcc-route"><i class="fa-solid fa-location-dot"></i> ${fromTown} ${t('results.to')} ${toTown}${res.bus_number ? ` <span class="bus-number">${res.bus_number}</span>` : ''}</div>
      <button class="btn btn-primary view-seats-btn rcc-view-seats">${t('results.viewSeats')}</button>
    </div>

    <div class="seat-expand" style="display:none"></div>
  `;

  const desktopBtn = wrap.querySelector('.result-card .view-seats-btn');
  const mobileBtn = wrap.querySelector('.rcc-view-seats');
  const expandPanel = wrap.querySelector('.seat-expand');
  let desktopLoaded = false;

  desktopBtn.addEventListener('click', async () => {
    const isOpen = expandPanel.style.display !== 'none';
    if (isOpen) {
      expandPanel.style.display = 'none';
      desktopBtn.innerHTML = t('results.viewSeats');
      return;
    }
    expandPanel.style.display = 'block';
    desktopBtn.innerHTML = t('results.hideSeats');
    if (!desktopLoaded) {
      desktopLoaded = true;
      await loadSeatExpand(expandPanel, res, { from, to, depart, fromName, toName });
    }
  });

  mobileBtn.addEventListener('click', () => openSeatView(res, { from, to, depart, fromName, toName }));

  return wrap;
}

function buildTimelineHtml(stops) {
  if (!stops || !stops.length) return `<div class="points-empty">${t('results.noStopDetails')}</div>`;

  const MAX_VISIBLE = 5;
  let display = stops.map((s, i) => ({ s, i }));

  if (stops.length > MAX_VISIBLE) {
    const first = display.slice(0, 2);
    const last = display.slice(-2);
    display = [...first, { ellipsis: true }, ...last];
  }

  return `<div class="timeline-list-h">${display.map(item => {
    if (item.ellipsis) {
      return `
    <div class="timeline-item-h">
      <div class="timeline-dot ellipsis"></div>
      <div class="timeline-town">&hellip;</div>
    </div>`;
    }
    const { s, i } = item;
    return `
    <div class="timeline-item-h">
      <div class="timeline-dot ${i === 0 ? 'start' : i === stops.length - 1 ? 'end' : ''}"></div>
      <div class="timeline-town">${s[0]}</div>
    </div>
  `;
  }).join('')}</div>`;
}

function getBoardingTownName(res) {
  return (res.boarding_point && res.boarding_point.town) || '';
}
function getDropoffTownName(res) {
  return (res.dropping_point && res.dropping_point.town) || '';
}

// GET /trips/{id}/seats returns a FLAT array of seats, each with explicit
// row/column coordinates (not a pre-built rows matrix like the legacy API).
// Reconstruct a rows[][] grid from it here so renderSeatExpand()/buildSeatGridHtml()
// (built around a rows matrix) can stay mostly as-is. Confirmed against a live
// response for service_trip_id=1 (Jaipur->Kaman) on 2026-08-22.
function buildSeatRowsFromFlatList(seats, aisleColumns, fallbackFare) {
  const maxRow = seats.reduce((m, s) => Math.max(m, s.row), -1);
  const maxCol = seats.reduce((m, s) => Math.max(m, s.column), -1);
  const aisleSet = new Set(aisleColumns || []);
  const rows = [];
  for (let r = 0; r <= maxRow; r++) {
    const row = [];
    for (let c = 0; c <= maxCol; c++) row.push(aisleSet.has(c) ? { is_aisle: true } : null);
    rows.push(row);
  }
  seats.forEach(s => {
    rows[s.row][s.column] = {
      seat_number: s.seat_no,
      is_renderable: true,
      is_seat_reservable: s.status === 'available',
      is_window_seat: !!s.is_window,
      is_ladies_seat: !!s.is_ladies_reservable,
      // Pink-seat feature (Jaimangla only, see PINK_SEATS_TENANT below):
      // true only when the API is confident a woman is seated there right
      // now. false covers both "empty" and "occupied but gender unknown
      // yet" (a seat mid-checkout by someone else, before passenger
      // details exist) - never treat false as "male". Distinct from
      // is_ladies_seat/is_ladies_reservable above, which is a seat-layout
      // designation, not who's currently sitting there.
      is_female_occupied: s.status === 'booked' && s.is_female_occupied === true,
      // true only on an available seat sitting next to a woman-occupied
      // seat - stays selectable (a woman or a child under 12 may book it),
      // just flagged so the seat map and passenger form can enforce/hint at
      // the adjacency rule before the backend's own 422 does. Per spec this
      // is only ever true when status is "available", but re-assert that
      // here too rather than trust the API never sends a contradictory pair.
      blocked_for_male: s.status === 'available' && s.blocked_for_male === true,
      // Per-seat fare (priced from the seat's own fare_class); trip-level
      // fare only if the API sent none.
      fare: Number(s.fare) || Number(fallbackFare) || 0,
      seat_type: s.seat_type || '',
      is_sleeper: /sleeper/i.test(s.seat_type || s.fare_class || '')
    };
  });
  return rows;
}

function adaptTripSeatsResponse(seatsRes, stopsRes, fallbackFare) {
  const ladiesSeats = (seatsRes.seats || []).filter(s => s.is_ladies_reservable).map(s => s.seat_no);
  const aisleColumns = (seatsRes.layout && seatsRes.layout.aisle_columns) || [];
  // Each deck has its own row/column coordinates, so build one grid per deck
  // (a single-deck coach yields one entry and renders exactly as before).
  const byDeck = {};
  (seatsRes.seats || []).forEach(s => {
    const d = s.deck || 1;
    (byDeck[d] = byDeck[d] || []).push(s);
  });
  const decks = Object.keys(byDeck).map(Number).sort((a, b) => a - b).map(d => ({
    deck: d,
    rows: buildSeatRowsFromFlatList(byDeck[d], aisleColumns, fallbackFare)
  }));
  return {
    rows: decks.length ? decks[0].rows : [],
    decks,
    total_seats: (seatsRes.layout && seatsRes.layout.total_seats) || seatsRes.available_count || '',
    service_tax: 0, // not present in this API's seat response — fare is shown tax-inclusive
    ladies_quota_seats: ladiesSeats.join(','),
    cancellation_policies: [],
    boarding_stages: (seatsRes.boarding_points || []).map(p => [p.name, p.stop_id, p.landmark, p.map_url]),
    dropoff_stages: (seatsRes.dropping_points || []).map(p => [p.name, p.stop_id, p.landmark, p.map_url]),
    boarding_hash: {},
    dropoff_hash: {},
    stops: (stopsRes && stopsRes.stops) || []
  };
}

async function loadSeatExpand(panel, res, { from, to, depart, fromName, toName }) {
  panel.innerHTML = `<div class="state-msg loading"><i class="fa-solid fa-spinner fa-spin"></i> ${t('results.loadingSeatLayout')}</div>`;

  let layout;
  try {
    const [seatsRes, stopsRes] = await Promise.all([
      apiV1.getTripSeats(res.service_trip_id, { date: depart, fromTownId: from, toTownId: to }),
      apiV1.getTripStops(res.service_trip_id).catch(() => null)
    ]);
    layout = adaptTripSeatsResponse(seatsRes, stopsRes, res.fare);
  } catch (e) {
    panel.innerHTML = `<div class="state-msg error">${t('results.seatLayoutError')}</div>`;
    return;
  }

  renderSeatExpand(panel, layout, res, { from, to, depart, fromName, toName });
}

const seatViewOverlay = document.getElementById('seatViewOverlay');
const seatViewBody = document.getElementById('seatViewBody');
const seatViewOperator = document.getElementById('seatViewOperator');
const seatViewRoute = document.getElementById('seatViewRoute');
const seatViewMeta = document.getElementById('seatViewMeta');
const seatViewBack = document.getElementById('seatViewBack');

let seatViewOpenViaHistory = false;

function openSeatView(res, { from, to, depart, fromName, toName }) {
  seatViewOperator.textContent = (res.operator && res.operator.name) || 'Bus';
  if (seatViewRoute) {
    const routeFrom = fromName || (res.boarding_point && res.boarding_point.town) || '';
    const routeTo = toName || (res.dropping_point && res.dropping_point.town) || '';
    seatViewRoute.textContent = (routeFrom && routeTo) ? `${routeFrom} → ${routeTo}` : '';
  }
  seatViewMeta.textContent = `${formatClockTime(res.departure_at)} — ${res.bus_type || ''}${res.bus_number ? ' — ' + res.bus_number : ''}`;
  seatViewOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  history.pushState({ seatView: true }, '', window.location.href);
  seatViewOpenViaHistory = true;

  loadSeatExpand(seatViewBody, res, { from, to, depart, fromName, toName });
}

function closeSeatView({ fromPopstate = false } = {}) {
  seatViewOverlay.classList.remove('open');
  document.body.style.overflow = '';
  seatViewBody.innerHTML = '';
  if (seatViewOpenViaHistory && !fromPopstate) {
    seatViewOpenViaHistory = false;
    history.back();
  } else {
    seatViewOpenViaHistory = false;
  }
}

seatViewBack?.addEventListener('click', () => closeSeatView());

window.addEventListener('popstate', () => {
  if (seatViewOverlay.classList.contains('open')) {
    closeSeatView({ fromPopstate: true });
  }
});

// Back/forward nav can restore this page from bfcache instead of reloading it —
// any continue/next button left mid-"locking" from before navigating to checkout
// would otherwise stay stuck disabled forever. Reset button state so seats can
// be reselected or continue clicked again without a full reload.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.querySelectorAll('#continueBtn, .mflow-next-btn').forEach(btn => {
    if (btn.dataset.originalLabel) {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalLabel;
    }
  });
  document.querySelectorAll('.seat-lock-error').forEach(el => el.remove());
});

// Rows are row-major (top-to-bottom); rotate 90deg CCW into columns so the
// long 12-row layout becomes a wide, short block that fits without vertical scroll.
function rotateRowsCCW(rows) {
  const numRows = rows.length;
  const numCols = rows[0] ? rows[0].length : 0;
  const rotated = [];
  for (let c = numCols - 1; c >= 0; c--) {
    const newRow = [];
    for (let r = 0; r < numRows; r++) {
      newRow.push(rows[r][c]);
    }
    rotated.push(newRow);
  }
  return rotated;
}

function isCellEmpty(cell) {
  if (cell && cell.is_aisle) return false;
  return !cell || !cell.is_renderable || cell.seat_number === 'EE_SEAT' || !cell.seat_number;
}

// Some column indices are empty (gap/aisle) across every row — strip those
// entirely instead of rendering dead space for them.
function stripEmptyColumns(rows) {
  if (!rows.length) return rows;
  const numCols = rows[0].length;
  const keepCols = [];
  for (let c = 0; c < numCols; c++) {
    if (rows.some(row => !isCellEmpty(row[c]))) keepCols.push(c);
  }
  return rows.map(row => keepCols.map(c => row[c]));
}

function isGapCell(cell) {
  return !cell || !cell.is_renderable || cell.seat_number === 'EE_SEAT' || !cell.seat_number;
}

function buildSeatGridHtml(nonEmptyRowsInput, ladiesSeats, hasLadiesData, isMobile) {
  const nonEmptyRows = stripEmptyColumns(nonEmptyRowsInput);

  function seatCellHtml(cell, wide, style) {
    const state = cell.is_seat_reservable ? 'available' : 'booked';
    const isLadies = hasLadiesData && ladiesSeats.has(String(cell.seat_number));
    const isWindow = !!cell.is_window_seat;
    const isFemaleOccupied = isPinkSeatsEnabled() && !!cell.is_female_occupied;
    // blocked_for_male is only ever true on an available seat, so this
    // and isFemaleOccupied (only ever true on a booked seat) never
    // collide on the same cell.
    const isBlockedForMale = isPinkSeatsEnabled() && !!cell.blocked_for_male;
    const fare = cell.fare != null ? cell.fare : '';
    const classes = ['seat-cell', state];
    if (wide) classes.push('col-wide');
    if (isLadies) classes.push('ladies');
    if (isWindow) classes.push('window');
    if (cell.is_sleeper) classes.push('sleeper');
    if (isFemaleOccupied) classes.push('female-occupied');
    if (isBlockedForMale) classes.push('blocked-for-male');
    const title = isBlockedForMale
      ? t('results.blockedForMaleTooltip')
      : `Seat ${cell.seat_number} — ₹${fare}`;
    return `
          <div class="${classes.join(' ')}"${style ? ` style="${style}"` : ''} title="${title}" data-seat="${cell.seat_number}" data-fare="${fare}" data-blocked-for-male="${isBlockedForMale ? '1' : '0'}">
            ${(cell.is_sleeper ? SLEEPER_ICONS[isMobile ? 'vertical' : 'horizontal'] : SEAT_ICONS)[state]}
            ${isLadies ? `<i class="fa-solid fa-person-dress seat-ladies-badge"></i>` : ''}
            ${isBlockedForMale ? `<i class="fa-solid fa-user-shield seat-blocked-badge"></i>` : ''}
            <span class="seat-num${/^\d+$/.test(String(cell.seat_number)) ? '' : ' seat-num-text'}">${cell.seat_number}</span>
          </div>`;
  }

  let seatGridHtml = `<div class="bus-outline">
    <div class="bus-driver"><i class="fa-solid fa-user-tie"></i><span>Driver</span></div>`;

  const hasSleeper = nonEmptyRows.some(row => row.some(c => c && c.is_sleeper));

  if (isMobile && hasSleeper) {
    // Mobile with sleepers: each column stacks on its own, a seat one unit
    // tall and a sleeper two, so the seats beside a sleeper sit one below
    // the other at normal pitch instead of being spread to the sleeper's
    // row height. A missing cell after a column's first seat still takes one unit to keep its
    // hole; leading empties are dropped so every column starts at the top.
    const numCols = nonEmptyRows[0] ? nonEmptyRows[0].length : 0;
    const next = new Array(numCols).fill(1);
    const started = new Array(numCols).fill(false);
    let cellsHtml = '';
    nonEmptyRows.forEach(row => {
      row.forEach((cell, ci) => {
        if (isGapCell(cell)) { if (started[ci]) next[ci] += 1; return; }
        started[ci] = true;
        const span = cell.is_sleeper ? 2 : 1;
        cellsHtml += seatCellHtml(cell, '', `grid-column:${ci + 1};grid-row:${next[ci]} / span ${span}`);
        next[ci] += span;
      });
    });
    seatGridHtml += `<div class="seat-grid seat-grid-stack" style="grid-template-columns:repeat(${numCols},38px)">${cellsHtml}</div></div>`;
    return seatGridHtml;
  }

  seatGridHtml += `<div class="seat-grid">`;
  // Desktop grid is rotated, so a sleeper is wider than a seat. Any column
  // holding a sleeper gets a wide slot on every row (gaps and seats too),
  // otherwise seats and sleepers in the same column drift out of line.
  const wideCols = new Set();
  if (!isMobile) {
    nonEmptyRows.forEach(row => row.forEach((c, ci) => { if (c && c.is_sleeper) wideCols.add(ci); }));
  }
  nonEmptyRows.forEach(row => {
    seatGridHtml += `<div class="seat-row">`;
    row.forEach((cell, ci) => {
      const wide = wideCols.has(ci) ? ' col-wide' : '';
      seatGridHtml += isGapCell(cell) ? `<div class="seat-cell gap${wide}"></div>` : seatCellHtml(cell, wide, '');
    });
    seatGridHtml += `</div>`;
  });
  seatGridHtml += `</div></div>`;
  return seatGridHtml;
}

// Remembers the rider's last boarding/dropping point choice per trip so
// going back to reselect seats (which reloads this panel from scratch)
// doesn't silently reset the pickup point back to the first item in the
// list - only the seat map should need reselecting, not this too.
function getRememberedPoint(serviceTripId, isBoarding) {
  try {
    return sessionStorage.getItem('np_point_' + serviceTripId + '_' + (isBoarding ? 'board' : 'drop'));
  } catch (e) { return null; }
}
function rememberPoint(serviceTripId, isBoarding, stopId) {
  try {
    sessionStorage.setItem('np_point_' + serviceTripId + '_' + (isBoarding ? 'board' : 'drop'), stopId);
  } catch (e) { /* ignore */ }
}

function pointsHtml(stages, hash, res, isBoarding) {
  if (!stages.length) return `<div class="points-empty">${t('results.noPointsAvailable')}</div>`;
  // Matched by stop_id, not by display text - the point's name changes
  // with the site language, so comparing text would silently lose the
  // rider's earlier choice the moment they switch language.
  const remembered = getRememberedPoint(res.service_trip_id, isBoarding);
  const rememberedIdx = remembered
    ? stages.findIndex(s => String(s[1]) === String(remembered))
    : -1;
  const checkedIdx = rememberedIdx !== -1 ? rememberedIdx : 0;
  return stages.map((s, i) => {
    const name = s[0];
    const stageId = s[1];
    const landmark = s[2];
    const mapUrl = s[3];
    const contact = hash[stageId] || [];
    return `
    <label class="point-item">
      <div>
        <div class="point-name" data-town="${name}">${name}</div>
        ${landmark || contact[0] ? `<div class="point-meta"><i class="fa-solid fa-location-dot"></i> ${landmark || contact[0]}</div>` : ''}
        ${contact[1] ? `<div class="point-meta"><i class="fa-solid fa-phone"></i> ${contact[1]}</div>` : ''}
        ${mapUrl ? `<a class="point-map-link" href="${mapUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-solid fa-map-location-dot"></i> ${t('results.viewOnMap')}</a>` : ''}
      </div>
      <input type="radio" name="point-${res.service_trip_id}-${isBoarding ? 'board' : 'drop'}" data-stop-id="${stageId != null ? stageId : ''}" ${i === checkedIdx ? 'checked' : ''}>
    </label>
  `;
  }).join('');
}

function getOrCreateSessionId() {
  let sid = sessionStorage.getItem('np_session_id');
  if (!sid) {
    sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    sessionStorage.setItem('np_session_id', sid);
  }
  return sid;
}

// Tracks the most recent lock_token per service_trip_id issued from this page,
// so that returning here (e.g. via back button) and re-locking a different seat
// set releases the old lock first — otherwise a seat locked by our own earlier
// still-live lock gets reported back as "unavailable".
const lastLockTokenByTrip = {};

// Locks the selected seats via the API before navigating to checkout — replaces
// the old pattern of building checkout query params straight from DOM selection.
// On success, stores the lock response in sessionStorage (keyed by lock_token)
// for checkout.js to read, and passes only the lock_token + service_trip_id
// (plus cosmetic display params) in the URL.
async function proceedToCheckout(panel, res, { from, to, depart, fromName, toName }, opts) {
  const { seatNumbers, blockedForMaleSeats, boardTown, dropTown, boardStopId, dropStopId, continueBtn } = opts;
  if (!seatNumbers.length) return;

  if (boardStopId) rememberPoint(res.service_trip_id, true, boardStopId);
  if (dropStopId) rememberPoint(res.service_trip_id, false, dropStopId);

  const originalLabel = continueBtn.innerHTML;
  continueBtn.dataset.originalLabel = originalLabel;
  continueBtn.disabled = true;
  continueBtn.innerHTML = `${t('results.lockingSeats')} <i class="fa-solid fa-spinner fa-spin"></i>`;

  let lockErrorEl = panel.querySelector('.seat-lock-error');
  if (lockErrorEl) lockErrorEl.remove();

  const staleToken = lastLockTokenByTrip[res.service_trip_id];
  if (staleToken) {
    try { await apiV1.releaseLock(staleToken); } catch (e) {}
    delete lastLockTokenByTrip[res.service_trip_id];
  }

  try {
    const sessionId = getOrCreateSessionId();
    const lockRes = await apiV1.lockSeats({
      serviceTripId: res.service_trip_id,
      date: depart,
      fromTownId: from,
      toTownId: to,
      seats: seatNumbers,
      sessionId
    });

    lastLockTokenByTrip[res.service_trip_id] = lockRes.lock_token;

    sessionStorage.setItem('np_lock_' + lockRes.lock_token, JSON.stringify({
      lock: lockRes,
      trip: res,
      boardTown,
      dropTown,
      boardStopId,
      dropStopId,
      from, to, depart,
      // Which of the locked seats were flagged blocked_for_male at
      // selection time (Mahila-adjacency rule) - the lock API response
      // itself only carries bare seat-number strings, so this has to ride
      // along separately for checkout.js's passenger-form validation.
      blockedForMaleSeats: blockedForMaleSeats || []
    }));

    const ckParams = new URLSearchParams({
      lock_token: lockRes.lock_token,
      service_trip_id: res.service_trip_id,
      fromName: fromName || getBoardingTownName(res) || '',
      toName: toName || getDropoffTownName(res) || '',
      busType: (res.bus_type || '').trim(),
      total: lockRes.total_amount || ''
    });
    window.location.href = `checkout.html?${ckParams.toString()}`;
  } catch (err) {
    continueBtn.disabled = false;
    continueBtn.innerHTML = originalLabel;

    const msg = document.createElement('div');
    msg.className = 'state-msg error seat-lock-error';
    if (err && err.code === 'seats_unavailable') {
      const unavailable = (err.extra && err.extra.unavailable_seats) || [];
      msg.innerHTML = `${t('results.seatsUnavailable')} ${unavailable.join(', ')}. ${t('results.reselectRetry')}`;
      unavailable.forEach(seatNo => {
        const cell = panel.querySelector(`.seat-cell[data-seat="${seatNo}"]`);
        if (cell) { cell.classList.remove('selected', 'available'); cell.classList.add('booked'); }
      });
    } else {
      msg.textContent = (err && err.detail) || t('results.lockError');
    }
    panel.insertBefore(msg, panel.firstChild);
  }
}

// "Starts from ₹X" where X is the cheapest seat across all decks - true
// whether every seat costs the same or the coach mixes seater / sleeper prices.
function seatPriceBadgesHtml(layout, res) {
  const fares = [];
  (layout.decks || [{ rows: layout.rows || [] }]).forEach(d => d.rows.forEach(row => row.forEach(cell => {
    if (cell && cell.seat_number && cell.fare > 0) fares.push(cell.fare);
  })));
  const min = fares.length ? Math.min(...fares) : res.fare;
  return `<span class="seat-price-badge">${t('results.startsFrom')}</span>
          <span class="seat-price-badge outline">₹${min ?? '-'}</span>`;
}

// Deck tabs + one grid per deck, all in the DOM (only the active one shown)
// so seats picked on one deck stay selected while browsing the other.
// Defaults to the lower deck; the upper deck opens first only when the lower
// has no available seat left.
function buildSeatMapHtml(layout, isMobile, ladiesSeats, hasLadiesData) {
  const decks = (layout.decks && layout.decks.length) ? layout.decks : [{ deck: 1, rows: layout.rows || [] }];
  let activeIdx = decks.findIndex(d => d.rows.some(row => row.some(c => c && c.seat_number && c.is_seat_reservable)));
  if (activeIdx === -1) activeIdx = 0;

  // Desktop has room for both decks, so stack them with a heading each
  // instead of tabs; the tabbed switcher is only for the narrow mobile flow.
  const stacked = !isMobile && decks.length > 1;
  const tabsHtml = (decks.length > 1 && !stacked)
    ? `<div class="deck-tabs">${decks.map((d, i) => `<button type="button" class="deck-tab${i === activeIdx ? ' active' : ''}" data-deck="${i}">${d.deck === 1 ? t('results.lowerDeck') : t('results.upperDeck')}</button>`).join('')}</div>`
    : '';

  const gridsHtml = decks.map((d, i) => {
    const rows = isMobile ? d.rows : rotateRowsCCW(d.rows);
    const nonEmptyRows = rows.filter(row => row.some(cell => cell && (cell.is_aisle || (cell.is_renderable && cell.seat_number !== 'EE_SEAT'))));
    const label = stacked ? `<div class="deck-label">${d.deck === 1 ? t('results.lowerDeck') : t('results.upperDeck')}</div>` : '';
    const hidden = (!stacked && i !== activeIdx) ? ' style="display:none"' : '';
    return `<div class="deck-grid${i > 0 ? ' deck-grid-upper' : ''}" data-deck="${i}"${hidden}>${label}${buildSeatGridHtml(nonEmptyRows, ladiesSeats, hasLadiesData, isMobile)}</div>`;
  }).join('');

  return tabsHtml + gridsHtml;
}

function bindDeckTabs(panel) {
  const deckTabs = panel.querySelectorAll('.deck-tab');
  deckTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      deckTabs.forEach(x => x.classList.toggle('active', x === tab));
      panel.querySelectorAll('.deck-grid').forEach(g => {
        g.style.display = g.dataset.deck === tab.dataset.deck ? '' : 'none';
      });
    });
  });
}

function renderSeatExpand(panel, layout, res, tripParams) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const ladiesSeats = new Set(String(layout.ladies_quota_seats || '').split(',').map(s => s.trim()).filter(Boolean));
  const hasLadiesData = ladiesSeats.size > 0;

  if (isMobile) {
    renderMobileSeatFlow(panel, layout, res, ladiesSeats, hasLadiesData, tripParams);
    return;
  }

  const seatGridHtml = buildSeatMapHtml(layout, false, ladiesSeats, hasLadiesData);

  const boardingStages = layout.boarding_stages || [];
  const dropoffStages = layout.dropoff_stages || [];
  const boardingHash = layout.boarding_hash || {};
  const dropoffHash = layout.dropoff_hash || {};

  const serviceTaxPct = layout.service_tax || 0;
  const cancellationPolicies = layout.cancellation_policies || [];

  panel.innerHTML = `
    <div class="seat-expand-inner">
      <div class="seat-expand-left">
        <div class="seat-toolbar">
          ${seatPriceBadgesHtml(layout, res)}
        </div>

        <div class="seats-icons-row">
          <div class="seat-legend-item">
            <div class="seat-legend-icon">${SEAT_ICONS.available}</div>
            <span>${t('results.available')}</span>
          </div>
          <div class="seat-legend-item">
            <div class="seat-legend-icon">${SEAT_ICONS.selected}</div>
            <span>${t('results.selected')}</span>
          </div>
          <div class="seat-legend-item">
            <div class="seat-legend-icon">${SEAT_ICONS.booked}</div>
            <span>${t('results.booked')}</span>
          </div>
          ${hasLadiesData ? `
          <div class="seat-legend-item">
            <div class="seat-legend-icon"><i class="fa-solid fa-person-dress"></i></div>
            <span>${t('results.ladies')}</span>
          </div>` : ''}
          ${isPinkSeatsEnabled() ? `
          <div class="seat-legend-item">
            <div class="seat-legend-icon seat-legend-icon-pink"></div>
            <span>${t('results.femaleOccupied')}</span>
          </div>` : ''}
          ${isPinkSeatsEnabled() ? `
          <div class="seat-legend-item">
            <div class="seat-legend-icon seat-legend-icon-blocked"></div>
            <span>${t('results.blockedForMale')}</span>
          </div>` : ''}
          <div class="seat-legend-item">
            <div class="seat-legend-icon window-icon"></div>
            <span>${t('results.windowSeat')}</span>
          </div>
        </div>

        ${seatGridHtml}

        <div class="seat-select-hint"><i class="fa-solid fa-circle-info"></i> ${t('results.selectUpTo6')}</div>

        ${cancellationPolicies.length ? `
        <div class="cancellation-toggle-wrap">
          <button class="cancellation-toggle" type="button">${t('results.cancellationPolicy')} <i class="fa-solid fa-chevron-down"></i></button>
          <ul class="cancellation-list" style="display:none">
            ${cancellationPolicies.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>

      <div class="seat-expand-right">
        <div class="points-panel">
          <div class="points-panel-title">${t('results.boardingDroppingPoints')}</div>
          <div class="points-tabs">
            <button class="points-tab active" data-tab="board">${t('results.boardingPoint')}</button>
            <button class="points-tab" data-tab="drop">${t('results.droppingPoint')}</button>
          </div>
          <div class="points-list" data-panel="board">${pointsHtml(boardingStages, boardingHash, res, true)}</div>
          <div class="points-list" data-panel="drop" style="display:none">${pointsHtml(dropoffStages, dropoffHash, res, false)}</div>
        </div>

        <div class="fare-panel" id="farePanel" style="display:none">
          <div class="fare-panel-header">${t('results.fareDetails')} <i class="fa-solid fa-chevron-up"></i></div>
          <div class="fare-panel-body">
            <div class="fare-row"><span>${t('results.seatFare')} (<span id="fareSeatCount">0</span> ${t('results.seat')})</span><span id="fareSeatTotal">₹0.00</span></div>
            ${serviceTaxPct > 0 ? `<div class="fare-row"><span>${t('results.gst')} (${serviceTaxPct}%)</span><span id="fareGstTotal">₹0.00</span></div>` : ''}
            <div class="fare-row total"><span>${t('results.totalAmount')}</span><strong id="fareGrandTotal">₹0.00</strong></div>
          </div>
        </div>

        <div class="seat-cta-row">
          <button class="btn btn-primary continue-btn" id="continueBtn" style="display:none">${t('results.continue')} <i class="fa-solid fa-arrow-right"></i></button>
          <button class="btn btn-outline cancel-btn" id="cancelBtn" style="display:none">${t('results.cancelSelection')}</button>
        </div>
      </div>
    </div>
  `;

  bindDeckTabs(panel);

  const tabs = panel.querySelectorAll('.points-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panel.querySelectorAll('.points-list').forEach(list => {
        list.style.display = list.dataset.panel === tab.dataset.tab ? 'block' : 'none';
      });
    });
  });

  const cancelToggle = panel.querySelector('.cancellation-toggle');
  const cancelList = panel.querySelector('.cancellation-list');
  cancelToggle?.addEventListener('click', () => {
    const open = cancelList.style.display !== 'none';
    cancelList.style.display = open ? 'none' : 'block';
    cancelToggle.classList.toggle('open', !open);
  });

  const farePanel = panel.querySelector('#farePanel');
  const fareSeatCount = panel.querySelector('#fareSeatCount');
  const fareSeatTotal = panel.querySelector('#fareSeatTotal');
  const fareGstTotal = panel.querySelector('#fareGstTotal');
  const fareGrandTotal = panel.querySelector('#fareGrandTotal');
  const continueBtn = panel.querySelector('#continueBtn');
  const cancelBtn = panel.querySelector('#cancelBtn');
  const MAX_SEATS = 6;

  function updateFareSummary() {
    const selected = panel.querySelectorAll('.seat-cell.selected');
    if (!selected.length) {
      farePanel.style.display = 'none';
      continueBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      return;
    }
    let seatFareSum = 0;
    selected.forEach(c => { seatFareSum += Number(c.dataset.fare) || 0; });
    const gstSum = Math.round(seatFareSum * serviceTaxPct) / 100;
    const grandSum = Math.round((seatFareSum + gstSum) * 100) / 100;

    fareSeatCount.textContent = selected.length;
    fareSeatTotal.textContent = `₹${Math.round(seatFareSum)}`;
    if (fareGstTotal) fareGstTotal.textContent = `₹${Math.round(gstSum)}`;
    fareGrandTotal.textContent = `₹${Math.round(grandSum)}`;
    farePanel.style.display = 'block';
    continueBtn.style.display = isBookingEnabled() ? 'flex' : 'none';
    cancelBtn.style.display = 'block';
  }

  continueBtn.addEventListener('click', () => {
    const selected = panel.querySelectorAll('.seat-cell.selected');
    const boardRadio = panel.querySelector('input[name="point-' + res.service_trip_id + '-board"]:checked');
    const dropRadio = panel.querySelector('input[name="point-' + res.service_trip_id + '-drop"]:checked');
    const boardTown = boardRadio ? boardRadio.closest('.point-item').querySelector('.point-name').textContent : '';
    const dropTown = dropRadio ? dropRadio.closest('.point-item').querySelector('.point-name').textContent : '';
    const boardStopId = boardRadio ? boardRadio.dataset.stopId : '';
    const dropStopId = dropRadio ? dropRadio.dataset.stopId : '';

    proceedToCheckout(panel, res, tripParams, {
      seatNumbers: Array.from(selected).map(c => c.dataset.seat),
      blockedForMaleSeats: Array.from(selected).filter(c => c.dataset.blockedForMale === '1').map(c => c.dataset.seat),
      boardTown,
      dropTown,
      boardStopId,
      dropStopId,
      continueBtn
    });
  });

  panel.querySelectorAll('.seat-cell.available').forEach(cell => {
    cell.addEventListener('click', () => {
      const currentlySelected = panel.querySelectorAll('.seat-cell.selected').length;
      if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
      } else {
        if (currentlySelected >= MAX_SEATS) { showSeatToast('You can select up to ' + MAX_SEATS + ' seats only.'); return; }
        cell.classList.add('selected');
      }
      updateFareSummary();
    });
  });

  cancelBtn.addEventListener('click', () => {
    panel.querySelectorAll('.seat-cell.selected').forEach(c => c.classList.remove('selected'));
    updateFareSummary();
  });
}

function renderMobileSeatFlow(panel, layout, res, ladiesSeats, hasLadiesData, tripParams) {
  const seatGridHtml = buildSeatMapHtml(layout, true, ladiesSeats, hasLadiesData);

  const boardingStages = layout.boarding_stages || [];
  const dropoffStages = layout.dropoff_stages || [];
  const boardingHash = layout.boarding_hash || {};
  const dropoffHash = layout.dropoff_hash || {};

  const serviceTaxPct = layout.service_tax || 0;

  panel.innerHTML = `
    <div class="mflow">
      <div class="mflow-tabs">
        <button class="mflow-tab active" data-step="seats">${t('results.seatTab')}</button>
        <button class="mflow-tab" data-step="board">${t('results.pickupTab')}</button>
        <button class="mflow-tab" data-step="drop">${t('results.dropTab')}</button>
      </div>

      <div class="mflow-panel" data-step="seats">
        ${(tripParams.fromName && tripParams.toName) ? `<div class="mflow-route"><i class="fa-solid fa-route"></i> ${tripParams.fromName} <i class="fa-solid fa-arrow-right"></i> ${tripParams.toName}</div>` : ''}
        <div class="seat-toolbar">
          ${seatPriceBadgesHtml(layout, res)}
        </div>
        <div class="seats-icons-row">
          <div class="seat-legend-item"><div class="seat-legend-icon">${SEAT_ICONS.available}</div><span>${t('results.available')}</span></div>
          <div class="seat-legend-item"><div class="seat-legend-icon">${SEAT_ICONS.selected}</div><span>${t('results.selected')}</span></div>
          <div class="seat-legend-item"><div class="seat-legend-icon">${SEAT_ICONS.booked}</div><span>${t('results.booked')}</span></div>
          ${hasLadiesData ? `<div class="seat-legend-item"><div class="seat-legend-icon"><i class="fa-solid fa-person-dress"></i></div><span>${t('results.ladies')}</span></div>` : ''}
          ${isPinkSeatsEnabled() ? `<div class="seat-legend-item"><div class="seat-legend-icon seat-legend-icon-pink"></div><span>${t('results.femaleOccupied')}</span></div>` : ''}
          ${isPinkSeatsEnabled() ? `<div class="seat-legend-item"><div class="seat-legend-icon seat-legend-icon-blocked"></div><span>${t('results.blockedForMale')}</span></div>` : ''}
          <div class="seat-legend-item"><div class="seat-legend-icon window-icon"></div><span>${t('results.windowSeat')}</span></div>
        </div>
        ${seatGridHtml}
        <div class="seat-select-hint"><i class="fa-solid fa-circle-info"></i> ${t('results.selectUpTo6')}</div>
      </div>

      <div class="mflow-panel" data-step="board" style="display:none">
        <div class="mflow-panel-title">${t('results.choosePickup')}</div>
        <div class="mflow-points-list">${pointsHtml(boardingStages, boardingHash, res, true)}</div>
      </div>

      <div class="mflow-panel" data-step="drop" style="display:none">
        <div class="mflow-panel-title">${t('results.chooseDrop')}</div>
        <div class="mflow-points-list">${pointsHtml(dropoffStages, dropoffHash, res, false)}</div>
      </div>

    </div>

    <div class="mflow-bottom-bar" id="mflowBottomBar" style="display:none">
      <div class="mflow-bottom-fare">
        <strong id="mflowBarTotal">₹0.00</strong>
        <span id="mflowBarSeatCount">${t('results.forSeats')} 0 ${t('results.seatsWord')}</span>
      </div>
      <button class="btn btn-primary mflow-next-btn" id="mflowNextBtn">${t('results.next')} <i class="fa-solid fa-arrow-right"></i></button>
    </div>
  `;

  bindDeckTabs(panel);

  const tabs = panel.querySelectorAll('.mflow-tab');
  const tabsWrap = panel.querySelector('.mflow-tabs');
  const steps = panel.querySelectorAll('.mflow-panel');
  const bottomBar = panel.querySelector('#mflowBottomBar');
  const nextBtn = panel.querySelector('#mflowNextBtn');
  const stepOrder = ['seats', 'board', 'drop'];

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (!tabsWrap.classList.contains('unlocked')) return;
      goToStep(tab.dataset.step);
    });
  });

  function goToStep(stepName) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.step === stepName));
    steps.forEach(s => { s.style.display = s.dataset.step === stepName ? 'block' : 'none'; });
    nextBtn.innerHTML = stepName === 'drop'
      ? `${t('results.continueToCheckout')} <i class="fa-solid fa-arrow-right"></i>`
      : `${t('results.next')} <i class="fa-solid fa-arrow-right"></i>`;
  }

  nextBtn.addEventListener('click', () => {
    const current = panel.querySelector('.mflow-tab.active').dataset.step;
    const idx = stepOrder.indexOf(current);
    if (current === 'drop') { goToCheckout(); return; }
    if (idx < stepOrder.length - 1) goToStep(stepOrder[idx + 1]);
  });

  function goToCheckout() {
    const selected = panel.querySelectorAll('.seat-cell.selected');
    const boardRadio = panel.querySelector('input[name="point-' + res.service_trip_id + '-board"]:checked');
    const dropRadio = panel.querySelector('input[name="point-' + res.service_trip_id + '-drop"]:checked');
    const boardTown = boardRadio ? boardRadio.closest('.point-item').querySelector('.point-name').textContent : '';
    const dropTown = dropRadio ? dropRadio.closest('.point-item').querySelector('.point-name').textContent : '';
    const boardStopId = boardRadio ? boardRadio.dataset.stopId : '';
    const dropStopId = dropRadio ? dropRadio.dataset.stopId : '';

    proceedToCheckout(panel, res, tripParams, {
      seatNumbers: Array.from(selected).map(c => c.dataset.seat),
      blockedForMaleSeats: Array.from(selected).filter(c => c.dataset.blockedForMale === '1').map(c => c.dataset.seat),
      boardTown,
      dropTown,
      boardStopId,
      dropStopId,
      continueBtn: nextBtn
    });
  }

  function updateBottomBar() {
    const selected = panel.querySelectorAll('.seat-cell.selected');
    tabsWrap.classList.toggle('unlocked', selected.length > 0);
    if (!selected.length) {
      bottomBar.style.display = 'none';
      return;
    }
    let seatFareSum = 0;
    selected.forEach(c => { seatFareSum += Number(c.dataset.fare) || 0; });
    const gstSum = Math.round(seatFareSum * serviceTaxPct) / 100;
    const grandSum = Math.round((seatFareSum + gstSum) * 100) / 100;

    panel.querySelector('#mflowBarTotal').textContent = `₹${Math.round(grandSum)}`;
    panel.querySelector('#mflowBarSeatCount').textContent = `${t('results.forSeats')} ${selected.length} ${selected.length > 1 ? t('results.seatsWord') : t('results.seatWord')}`;
    bottomBar.style.display = 'flex';
    nextBtn.style.display = isBookingEnabled() ? '' : 'none';
  }

  const MAX_SEATS = 6;
  panel.querySelectorAll('.seat-cell.available').forEach(cell => {
    cell.addEventListener('click', () => {
      const currentlySelected = panel.querySelectorAll('.seat-cell.selected').length;
      if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
      } else {
        if (currentlySelected >= MAX_SEATS) { showSeatToast('You can select up to ' + MAX_SEATS + ' seats only.'); return; }
        cell.classList.add('selected');
      }
      updateBottomBar();
    });
  });
}
