const API_V1_BASE = 'https://apnibus-booking.apnibus.com/api/v1';

// ---- token storage ----
const TOKEN_KEYS = {
  access: 'np_access_token',
  refresh: 'np_refresh_token',
  expiresAt: 'np_token_expires_at'
};

function getAccessToken() { return localStorage.getItem(TOKEN_KEYS.access); }
function getRefreshToken() { return localStorage.getItem(TOKEN_KEYS.refresh); }

function setTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(TOKEN_KEYS.access, access_token);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh_token);
  localStorage.setItem(TOKEN_KEYS.expiresAt, String(Date.now() + expires_in * 1000));
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.expiresAt);
}

function isLoggedIn() { return !!getAccessToken(); }

// ---- auth-change pub/sub ----
const authChangeListeners = [];
function onAuthChange(cb) { authChangeListeners.push(cb); }
function emitAuthChange() { authChangeListeners.forEach(cb => { try { cb(isLoggedIn()); } catch (e) { console.error(e); } }); }

// ---- error type ----
class ApiError extends Error {
  constructor({ code, detail, status, extra }) {
    super(detail || code || `Request failed (${status})`);
    this.code = code;
    this.detail = detail;
    this.status = status;
    this.extra = extra || {};
  }
}

// ---- operator id (never falls back to a different operator's data) ----
function getOperatorId() {
  const id = window.__TENANT_ID__;
  if (!id) throw new Error('Tenant not resolved yet: window.__TENANT_ID__ is unset. api-v1.js must load after the tenant-resolution script.');
  return id;
}

// ---- central fetch wrapper with 401 refresh-retry ----
let refreshInFlight = null;

async function doRefresh() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const rt = getRefreshToken();
    if (!rt) throw new ApiError({ code: 'no_refresh_token', status: 401 });
    const operator = getOperatorId();
    const res = await fetch(`${API_V1_BASE}${withOperator('/auth/refresh')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt, operator })
    });
    if (!res.ok) {
      clearTokens();
      emitAuthChange();
      throw new ApiError({ code: 'refresh_failed', status: res.status });
    }
    const data = await res.json();
    setTokens(data);
    return data;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function withOperator(path) {
  const operator = getOperatorId();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}operator=${encodeURIComponent(operator)}`;
}

// ---- current site language (sent as a request param, never a header, so
// it never triggers a CORS preflight the way a custom header would) ----
function getLang() {
  if (window.i18n && window.i18n.getLang) return window.i18n.getLang();
  try {
    const v = localStorage.getItem('np_lang');
    return (v === 'hi' || v === 'en') ? v : 'en';
  } catch (e) { return 'en'; }
}

function withOperatorAndLang(path, langOverride) {
  return `${withOperator(path)}&lang=${encodeURIComponent(langOverride || getLang())}`;
}

async function apiV1Fetch(path, { method = 'GET', body, auth = false, retry = true, idempotencyKey, langOverride } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const operator = getOperatorId();
  const lang = langOverride || getLang();
  const requestBody = body !== undefined
    ? { ...body, operator, lang }
    : (method === 'GET' ? undefined : { operator, lang });

  const res = await fetch(`${API_V1_BASE}${withOperatorAndLang(path, langOverride)}`, {
    method,
    headers,
    body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined
  });

  if (res.status === 401 && auth && retry) {
    try {
      await doRefresh();
    } catch (e) {
      throw e;
    }
    return apiV1Fetch(path, { method, body, auth, retry: false, idempotencyKey, langOverride });
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    throw new ApiError({
      code: data && data.error,
      detail: data && data.detail,
      status: res.status,
      extra: data || {}
    });
  }

  return data;
}

// ---- /api/v1/pilgrimages endpoints: same base as apiV1Fetch, but wrapped
// in the {success,message,data} envelope (unlike apiV1Fetch's plain-data
// responses) - needs its own unwrap, mirroring passFetch below.
async function pilgrimageFetch(path, { method = 'GET', body, auth = false, retry = true } = {}) {
  const operator = getOperatorId();
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const lang = getLang();
  const requestBody = body !== undefined
    ? { ...body, operator, lang }
    : (method === 'GET' ? undefined : { operator, lang });

  const res = await fetch(`${API_V1_BASE}${withOperatorAndLang(path)}`, {
    method,
    headers,
    body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined
  });

  if (res.status === 401 && auth && retry) {
    await doRefresh();
    return pilgrimageFetch(path, { method, body, auth, retry: false });
  }

  let envelope = null;
  try { envelope = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok || !envelope || envelope.success === false) {
    throw new ApiError({
      code: 'pilgrimage_request_failed',
      detail: (envelope && envelope.message) || 'Request failed',
      status: res.status,
      extra: (envelope && envelope.data) || {}
    });
  }

  return envelope.data;
}

// ---- /pass/ endpoints: separate base path, {success,message,data} envelope ----
const PASS_BASE = 'https://apnibus-booking.apnibus.com/pass';

async function passFetch(path, { method = 'GET', body, auth = false, retry = true, extraHeaders } = {}) {
  const operator = getOperatorId();
  const lang = getLang();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${PASS_BASE}${path}${sep}operator=${encodeURIComponent(operator)}&lang=${encodeURIComponent(lang)}`;

  const requestBody = body !== undefined ? { ...body, operator, lang } : undefined;

  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined
  });

  if (res.status === 401 && auth && retry) {
    await doRefresh();
    return passFetch(path, { method, body, auth, retry: false });
  }

  let envelope = null;
  try { envelope = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok || !envelope || envelope.success === false) {
    throw new ApiError({
      code: (envelope && envelope.data && envelope.data.error) || 'pass_request_failed',
      detail: (envelope && envelope.message) || 'Request failed',
      status: res.status,
      extra: (envelope && envelope.data) || {}
    });
  }

  return envelope.data;
}

// Pass-application submission (js/pass-application.js) is the first
// multipart/form-data request anywhere in this codebase (govt ID document
// upload) - every other endpoint is JSON via apiV1Fetch/passFetch. Mirrors
// passFetch's {success,message,data} envelope handling and X-Operator/
// ?operator= dual convention (see withOperator's own comment), but takes a
// pre-built FormData body instead of a plain object, and must NOT set
// Content-Type itself - the browser sets it (including the multipart
// boundary) only when left unset on a fetch() call with a FormData body.
async function passMultipartFetch(path, formData) {
  const operator = getOperatorId();
  const lang = getLang();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${PASS_BASE}${path}${sep}operator=${encodeURIComponent(operator)}&lang=${encodeURIComponent(lang)}`;
  formData.append('operator', operator);
  formData.append('lang', lang);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Operator': operator },
    body: formData
  });

  let envelope = null;
  try { envelope = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok || !envelope || envelope.success === false) {
    throw new ApiError({
      code: (envelope && envelope.data && envelope.data.error) || 'pass_application_failed',
      detail: (envelope && envelope.message) || 'Request failed',
      status: res.status,
      extra: (envelope && envelope.data) || {}
    });
  }

  return envelope.data;
}

// ---- /api/v1/services endpoints: same base/path as apiV1Fetch, but a
// {success,data} envelope on success and a DIFFERENT, flatter error shape
// on failure - {"error":"validation_error","detail":"..."} with no
// success/message fields at all (unlike passFetch's {success,message,data}
// error shape) - confirmed from the two 422 examples in the spec. Uses only
// the ?operator= query param, not a real X-Operator header: the server's
// CORS Access-Control-Allow-Headers doesn't list x-operator, so sending it
// as a header gets the whole request blocked client-side by the browser's
// preflight check (confirmed live - net::ERR_FAILED /
// HeaderDisallowedByPreflightResponse). The query param alone works fine
// against this same server, confirmed with a direct request.
async function servicesFetch(path, { method = 'GET', body } = {}) {
  const operator = getOperatorId();
  const lang = getLang();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API_V1_BASE}${path}${sep}operator=${encodeURIComponent(operator)}&lang=${encodeURIComponent(lang)}`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(Object.assign({}, body, { lang })) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok || !data || data.success === false) {
    throw new ApiError({
      code: data && data.error,
      detail: (data && data.detail) || (data && data.message),
      status: res.status,
      extra: (data && data.data) || {}
    });
  }

  return data.data;
}

const routesCache = new Map();

// id -> { en, hi } town display names, filled lazily by getTownNamesBothLangs
// from the (cached, per-lang) /routes list. Used to stamp both-language
// names onto results.html redirect links so the page has the Hindi name
// on hand immediately, without waiting on a /towns refetch after a
// language switch.
let townNamesBothLangsPromise = null;
// native_name is not reliably Hindi (the API can send the English name
// there); name_hindi is the explicit field, native_name only counts when
// it actually contains Devanagari.
function hindiTownName(town) {
  if (town.name_hindi) return town.name_hindi;
  return /[ऀ-ॿ]/.test(town.native_name || '') ? town.native_name : '';
}

function buildTownNameMap(routesRes, lang) {
  const map = {};

  console.log('========== buildTownNameMap ==========');
  console.log('lang:', lang);
  console.log('routes:', routesRes.routes?.length || 0);

  (routesRes.routes || []).forEach((r, index) => {
    if (r.from_town) {
      console.log('[FROM]', index, {
        id: r.from_town.id,
        name: r.from_town.name,
        name_english: r.from_town.name_english,
        name_hindi: r.from_town.native_name,
        display_name: r.from_town.display_name
      });

      map[String(r.from_town.id)] =
        lang === 'hi'
          ? (hindiTownName(r.from_town) || r.from_town.name)
          : (r.from_town.name_english || r.from_town.name);
    }

    if (r.to_town) {
      console.log('[TO]', index, {
        id: r.to_town.id,
        name: r.to_town.name,
        name_english: r.to_town.name_english,
        name_hindi: r.to_town.native_name,
        display_name: r.to_town.display_name
      });

      map[String(r.to_town.id)] =
        lang === 'hi'
          ? (hindiTownName(r.to_town) || r.to_town.name)
          : (r.to_town.name_english || r.to_town.name);
    }
  });

  console.log('Sample town 2881:', map['2881']);
  console.log('======================================');

  return map;
}

const apiV1 = {
  // ---- search/discovery ----
  searchTowns(q, { from, langOverride } = {}) {
    const parts = [];
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (from) parts.push(`from=${encodeURIComponent(from)}`);
    const query = parts.length ? `?${parts.join('&')}` : '';
    return apiV1Fetch(`/towns${query}`, { langOverride });
  },
  // Resolves every route's from/to town names in both languages (id -> name
  // maps), for stamping fromName/fromNameHi + toName/toNameHi onto a
  // results.html link. Cached for the life of the page since town names
  // don't change at runtime.
  getTownNamesBothLangs() {
    if (townNamesBothLangsPromise) return townNamesBothLangsPromise;
    townNamesBothLangsPromise = Promise.all([
      this.getRoutes(undefined, { langOverride: 'en' }).catch(() => ({ routes: [] })),
      this.getRoutes(undefined, { langOverride: 'hi' }).catch(() => ({ routes: [] }))
    ]).then(([enRes, hiRes]) => ({
      en: buildTownNameMap(enRes, 'en'),
      hi: buildTownNameMap(hiRes, 'hi')
    }));
    return townNamesBothLangsPromise;
  },
  search({ from, to, date, fare_class, include_sold_out }) {
    return apiV1Fetch('/search', {
      method: 'POST',
      body: { from, to, date, fare_class, include_sold_out }
    });
  },
  getTripSeats(serviceTripId, { date, fromTownId, toTownId }) {
    const params = new URLSearchParams({ date, from_town_id: fromTownId, to_town_id: toTownId });
    return apiV1Fetch(`/trips/${serviceTripId}/seats?${params}`);
  },
  getTripStops(serviceTripId) {
    return apiV1Fetch(`/trips/${serviceTripId}/stops`);
  },
  getRoutes(q, { langOverride } = {}) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const path = `/routes${query}`;
    const lang = langOverride || getLang();
    const cacheKey = `${path}#${lang}`;
    const cached = routesCache.get(cacheKey);

    const fresh = apiV1Fetch(path, { langOverride }).then(data => {
      routesCache.set(cacheKey, data);
      return data;
    });

    if (cached) {
      fresh.catch(() => {}); // refresh in background, keep cache on failure
      return Promise.resolve(cached);
    }
    return fresh;
  },
  getOperatorInfo() {
    return apiV1Fetch('/operator');
  },

  // ---- seat lock ----
  lockSeats({ serviceTripId, date, fromTownId, toTownId, seats, sessionId }) {
    return apiV1Fetch('/seats/lock', {
      method: 'POST',
      body: {
        service_trip_id: serviceTripId,
        date,
        from_town_id: fromTownId,
        to_town_id: toTownId,
        seats,
        session_id: sessionId
      }
    });
  },
  extendLock(lockToken) {
    return apiV1Fetch(`/seats/lock/${lockToken}/extend`, { method: 'POST' });
  },
  releaseLock(lockToken) {
    return apiV1Fetch(`/seats/lock/${lockToken}/release`, { method: 'POST' });
  },

  // ---- coupons ----
  checkCoupon({ code, amount }) {
    return apiV1Fetch('/coupons/check', { method: 'POST', body: { code, amount: String(amount) } });
  },

  // ---- luggage / parcel booking ----
  bookLuggage({ from, to, journeyDate, parcelType, quantity, weightPerParcelKg, fareAmount, sender, receiver, lengthCm, widthCm, heightCm }) {
    var body = {
      from,
      to,
      journey_date: journeyDate,
      parcel_type: parcelType,
      quantity,
      weight_per_parcel_kg: weightPerParcelKg,
      fare_amount: fareAmount,
      sender: {
        name: sender.name,
        mobile: sender.mobile,
        pickup_address: sender.pickupAddress
      },
      receiver: {
        name: receiver.name,
        mobile: receiver.mobile,
        delivery_address: receiver.deliveryAddress
      }
    };
    // Dimensions are all optional and per-parcel (cm, one decimal) - only
    // send the ones the sender actually filled in, so an omitted field
    // stays omitted server-side rather than being sent as 0/null and
    // rejected by the ">0, <=500" validation.
    if (lengthCm != null) body.length_cm = lengthCm;
    if (widthCm != null) body.width_cm = widthCm;
    if (heightCm != null) body.height_cm = heightCm;
    return apiV1Fetch('/luggage', { method: 'POST', body });
  },

  // ---- booking ----
  createDraft({ lockToken, passengers, contactPhone, contactEmail, passConfigId, couponCode }) {
    const body = {
      lock_token: lockToken,
      passengers,
      contact_phone: contactPhone,
      contact_email: contactEmail
    };
    if (passConfigId) body.pass_config_id = passConfigId;
    if (couponCode) body.coupon_code = couponCode;
    return apiV1Fetch('/bookings/draft', { method: 'POST', auth: true, body });
  },
  startPaytmPayment(ticketId, { method, vpa, idempotencyKey } = {}) {
    const body = { method };
    if (method === 'upi_collect') body.vpa = vpa;
    return apiV1Fetch(`/bookings/${ticketId}/paytm`, {
      method: 'POST',
      auth: true,
      idempotencyKey,
      body
    });
  },
  getBookingStatus(ticketId) {
    return apiV1Fetch(`/bookings/${ticketId}/status`, { auth: true });
  },
  confirmBookingUnpaid(ticketId) {
    return apiV1Fetch(`/bookings/${ticketId}/confirm`, { method: 'POST', auth: true, body: {} });
  },
  getBooking(ticketId) {
    return apiV1Fetch(`/bookings/${ticketId}`, { auth: true });
  },
  cancelBooking(ticketId, reason) {
    return apiV1Fetch(`/bookings/${ticketId}/cancel`, {
      method: 'POST',
      auth: true,
      body: { reason }
    });
  },

  // ---- pnr ----
  lookupPnr({ pnr, phone }) {
    return apiV1Fetch('/pnr/lookup', { method: 'POST', body: { pnr, phone } });
  },

  // ---- auth ----
  sendOtp(phone) {
    return apiV1Fetch('/auth/otp/send', { method: 'POST', body: { phone } });
  },
  verifyOtp({ otpId, otp }) {
    return apiV1Fetch('/auth/otp/verify', { method: 'POST', body: { otp_id: otpId, otp } });
  },
  loginWithTicketCode({ code, phone }) {
    return apiV1Fetch('/auth/login/ticket', { method: 'POST', body: { code, phone } });
  },
  refreshToken(refreshToken) {
    return apiV1Fetch('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken } });
  },
  logout() {
    return apiV1Fetch('/auth/logout', { method: 'POST', auth: true });
  },

  // ---- account ----
  getMe() {
    return apiV1Fetch('/users/me', { auth: true });
  },
  updateMe(patch) {
    return apiV1Fetch('/users/me', { method: 'PATCH', auth: true, body: patch });
  },
  getMyBookings() {
    return apiV1Fetch('/users/me/bookings', { auth: true });
  },
  getSavedPassengers() {
    return apiV1Fetch('/users/me/saved-passengers', { auth: true });
  },
  getMyPasses() {
    return apiV1Fetch('/users/me/passes', { auth: true });
  },
  addSavedPassenger(passenger) {
    return apiV1Fetch('/users/me/saved-passengers', { method: 'POST', auth: true, body: passenger });
  },
  deleteSavedPassenger(id) {
    return apiV1Fetch(`/users/me/saved-passengers/${id}`, { method: 'DELETE', auth: true });
  },

  // ---- passes ----
  getPasses() {
    return passFetch('passes/index.html');
  },
  // Requires login - the phone comes from the access token server-side now,
  // never from the request body (that's the whole security model: the pass
  // always lands on the number the buyer is logged in with).
  purchasePass({ passConfigId }) {
    return passFetch('purchase/index.html', { method: 'POST', auth: true, body: { pass_config_id: passConfigId } });
  },
  getPassPurchaseStatus(purchaseId) {
    return passFetch(`/purchase/${purchaseId}/status`, { auth: true });
  },

  // ---- pass applications (Jaimangla pilot: apply with a govt ID instead
  // of paying immediately; operator approves/rejects, pass issues itself
  // once approved) ----
  submitPassApplication(fields, documentFiles) {
    var fd = new FormData();
    Object.keys(fields).forEach(function (key) {
      var value = fields[key];
      if (value !== undefined && value !== null && value !== '') fd.append(key, value);
    });
    (documentFiles || []).forEach(function (file) {
      fd.append('documents', file); // repeat the part per file, per spec
    });
    return passMultipartFetch('applications/index.html', fd);
  },
  // No auth, no X-Operator dependency on the read side either - the uuid
  // itself is the credential (same shape as PNR tracking), so this can be
  // called from a fresh tab/device the applicant never logged into.
  getPassApplicationStatus(applicationId) {
    return passFetch(`/applications/${encodeURIComponent(applicationId)}/`, {
      extraHeaders: { 'X-Operator': getOperatorId() }
    });
  },

  // ---- other services (MRL pilot: crane hire etc.) - enquiry only, no
  // payment. The form itself is entirely operator-defined via form_fields
  // on each service, never hard-coded per service type. ----
  getServices() {
    return servicesFetch('/services');
  },
  // slug in the URL, never the uuid - the spec is explicit this is how the
  // detail endpoint is addressed, and that scoping (a slug from a
  // different operator 404s) is enforced server-side, not something this
  // client needs to re-check.
  getService(slug) {
    return servicesFetch(`/services/${encodeURIComponent(slug)}`);
  },
  submitServiceEnquiry(slug, payload) {
    return servicesFetch(`/services/${encodeURIComponent(slug)}/enquiry`, { method: 'POST', body: payload });
  },

  // ---- pilgrimages ----
  getPilgrimages() {
    // Sold-out trips (seats_left 0) are not shown. null = no cap set, still open.
    return pilgrimageFetch('/pilgrimages').then(list =>
      Array.isArray(list) ? list.filter(t => t.seats_left == null || t.seats_left > 0) : list);
  },
  getPilgrimage(tripId) {
    return pilgrimageFetch(`/pilgrimages/${tripId}`);
  },
  bookPilgrimage(tripId, { contactName, contactPhone, travellers, contactEmail, notes }) {
    return pilgrimageFetch(`/pilgrimages/${tripId}/book`, {
      method: 'POST',
      body: {
        contact_name: contactName,
        contact_phone: contactPhone,
        travellers,
        contact_email: contactEmail || '',
        notes: notes || ''
      }
    });
  },
  // Step 2 of the pilgrimage payment flow: opens (or reuses) the Paytm order
  // for a held booking - safe to call again on retry. Hand the result to
  // invokePaytmCheckout() exactly as ticket checkout does.
  startPilgrimagePayment(bookingId, { method } = {}) {
    return pilgrimageFetch(`/pilgrimages/bookings/${encodeURIComponent(bookingId)}/paytm`, {
      method: 'POST',
      body: { method: method || 'checkout' }
    });
  },
  // Step 3: the only authority on whether money moved - poll this after the
  // Paytm sheet closes, never treat the sheet closing as success.
  getPilgrimageBookingStatus(bookingId) {
    return pilgrimageFetch(`/pilgrimages/bookings/${encodeURIComponent(bookingId)}/status`);
  }
};

window.apiV1 = apiV1;
window.ApiError = ApiError;
window.getAccessToken = getAccessToken;
window.getRefreshToken = getRefreshToken;
window.setTokens = setTokens;
window.clearTokens = clearTokens;
window.isLoggedIn = isLoggedIn;
window.onAuthChange = onAuthChange;
window.emitAuthChange = emitAuthChange;
