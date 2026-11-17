// Shared helpers: API client, escaping, toasts. Everything hangs off window.JP.
(() => {
  const TOKEN_KEY = 'jobplug_token';
  const API_BASE = location.port === '5500' ? `http://${location.hostname}:5000/api` : '/api'; // 5500 = VS Code Live Server
  const JP = window.JP = {
    meta: null, user: null, loaders: {},
    getToken: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
    setToken: t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {} },
    onUnauthorized: () => {},
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  JP.$ = $; JP.$$ = $$;

  JP.esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  JP.api = async (path, { method = 'GET', body } = {}) => {
    const token = JP.getToken();
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try { res = await fetch(API_BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch { throw new Error('Cannot reach JobGossipPlug. Check your connection and try again.'); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && path !== '/login') JP.onUnauthorized();
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status}).`);
    return data;
  };

  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch {}
  JP.countryName = code => { try { return (regionNames && regionNames.of(String(code).trim())) || String(code).trim(); } catch { return String(code).trim(); } };
  JP.fieldLabel = key => ((JP.meta && JP.meta.fields.find(f => f.key === key)) || {}).label || key;
  JP.date = v => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  JP.toast = (message, isError = false) => {
    const el = $('#toast'); el.textContent = message; el.classList.toggle('error', isError); el.classList.add('show');
    clearTimeout(JP.toastTimer); JP.toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 4500 : 3000);
  };
})();
