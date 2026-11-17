// Sign in / sign up, navigation, opportunities and profile.
(() => {
  const { $, $$, esc, api } = JP;
  const landing = $('#landingPage'), gate = $('#authGate'), app = $('#appShell'), loginForm = $('#loginForm'), registerForm = $('#registerForm'), message = $('#authMessage');
  let opps = { eligible: [], unavailable: [] }, activeField = 'all', currentPage = 'opps', query = '', limit = 24;
  let privacyReturnTo = 'auth', metadataError = '';

  const showMessage = (text, isError = false) => { message.textContent = text; message.classList.toggle('error', isError); };
  const setLandingVisible = visible => { if (landing) landing.hidden = !visible; };
  function showAuth(mode = 'login') {
    setLandingVisible(false); app.hidden = true; gate.hidden = false; setMode(mode);
    if (mode === 'register' && metadataError) showMessage(metadataError, true);
    window.scrollTo(0, 0);
  }
  const levelOf = name => { const r = $(`input[name="${name}"]:checked`); return r ? r.value : ''; };
  const checkedFields = box => $$('input:checked', box).map(i => i.value);

  function fillLists() {
    const countries = JP.meta.countries.map(c => ({ code: c, name: JP.countryName(c) })).sort((a, b) => a.name.localeCompare(b.name));
    const options = countries.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join('');
    $('#registerCountry').innerHTML = '<option value="">Choose your country</option>' + options;
    $('#profileCountry').innerHTML = options;
    const checks = JP.meta.fields.map(f => `<label class="check"><input type="checkbox" value="${esc(f.key)}"> <span>${esc(f.label)}</span></label>`).join('');
    for (const id of ['#registerFields', '#profileFields', '#oppFields']) $(id).innerHTML = checks;
    if (JP.meta.support_email) $('#privacyContact').innerHTML = `email <b>${esc(JP.meta.support_email)}</b>`;
  }

  /* ---------------- auth ---------------- */
  function setMode(mode) {
    const reg = mode === 'register';
    loginForm.hidden = reg; registerForm.hidden = !reg;
    $('#showLogin').classList.toggle('selected', !reg); $('#showRegister').classList.toggle('selected', reg);
    $('#authTitle').textContent = reg ? 'Create your account' : 'Welcome back';
    $('#authSubtitle').textContent = reg ? 'Tell us a little so we can show you the right opportunities.' : 'Sign in to see opportunities that fit you.';
    showMessage('');
  }
  async function enterApp(user) {
    JP.user = user;
    $('#welcomeName').textContent = user.full_name.split(' ')[0];
    $('#avatar').textContent = user.full_name.trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || 'JP';
    $('#adminNav').hidden = user.role !== 'admin'; $('#privacyBack').hidden = true;
    setLandingVisible(false); gate.hidden = true; app.hidden = false;
    showPage('opps');
  }
  function leave(text, isError = false) {
    JP.setToken(null); JP.user = null; opps = { eligible: [], unavailable: [] };
    app.hidden = true; setLandingVisible(false); gate.hidden = false; setMode('login'); $('#loginPassword').value = ''; showMessage(text || '', isError);
  }
  JP.onUnauthorized = () => { if (!app.hidden) leave('Your session has expired. Please sign in again.', true); };

  $('#showLogin').addEventListener('click', () => setMode('login'));
  $('#showRegister').addEventListener('click', () => setMode('register'));
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-auth-mode]');
    if (button) showAuth(button.dataset.authMode);
  });
  $('#backToHome').addEventListener('click', () => {
    gate.hidden = true; setLandingVisible(true); window.scrollTo(0, 0);
  });
  $('#logoutButton').addEventListener('click', () => leave('You have signed out.'));
  $('#privacyFromAuth').addEventListener('click', () => {
    if (JP.getToken()) return;
    privacyReturnTo = 'auth'; setLandingVisible(false); gate.hidden = true; app.hidden = false; $('#nav').hidden = true;
    $('#privacyBack').hidden = false; $('#privacyBack').textContent = '← Back to sign up'; showPage('privacy', true);
  });
  $('#privacyFromHome').addEventListener('click', () => {
    privacyReturnTo = 'landing'; setLandingVisible(false); gate.hidden = true; app.hidden = false; $('#nav').hidden = true;
    $('#privacyBack').hidden = false; $('#privacyBack').textContent = '← Back to JobGossipPlug'; showPage('privacy', true);
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Signing in…'; showMessage('');
    try {
      const r = await api('/login', { method: 'POST', body: { email: $('#loginEmail').value.trim(), password: $('#loginPassword').value } });
      JP.setToken(r.token); $('#loginPassword').value = '';
      await enterApp(r.user);
    } catch (err) { showMessage(err.message, true); }
    finally { btn.disabled = false; btn.textContent = 'Sign in'; }
  });

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const level = levelOf('registerLevel');
    if (!level) { showMessage('Please tell us whether you are starting out or have professional skills.', true); return; }
    const btn = registerForm.querySelector('button[type=submit]');
    const email = $('#registerEmail').value.trim(), password = $('#registerPassword').value;
    btn.disabled = true; btn.textContent = 'Creating account…'; showMessage('');
    try {
      await api('/register', { method: 'POST', body: {
        full_name: $('#registerName').value.trim(), email, password, country: $('#registerCountry').value, level,
        fields: checkedFields($('#registerFields')), consent: $('#registerConsent').checked } });
      const r = await api('/login', { method: 'POST', body: { email, password } });
      JP.setToken(r.token); registerForm.reset();
      await enterApp(r.user);
    } catch (err) { showMessage(err.message, true); }
    finally { btn.disabled = false; btn.textContent = 'Create account'; }
  });

  /* ---------------- navigation ---------------- */
  function showPage(page, fromGate = false) {
    currentPage = page;
    for (const p of $$('.page')) p.hidden = p.id !== 'page-' + page;
    for (const b of $$('#nav button')) b.classList.toggle('selected', b.dataset.page === page);
    if (fromGate) { $('.who').hidden = true; } else { $('.who').hidden = false; $('#nav').hidden = false; }
    window.scrollTo(0, 0);
    if (JP.loaders[page] && !fromGate) JP.loaders[page]();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-page]');
    if (!t) return;
    e.preventDefault();
    if (JP.getToken() || JP.user) showPage(t.dataset.page);
    else if (t.id === 'privacyBack' && privacyReturnTo === 'landing') {
      app.hidden = true; gate.hidden = true; setLandingVisible(true); window.scrollTo(0, 0);
    } else { app.hidden = true; setLandingVisible(false); gate.hidden = false; setMode('register'); }
  });
  /* ---------------- opportunities ---------------- */
  function card(o, locked) {
    const tags = [
      o.work_type ? `<span class="tag">${esc(o.work_type)}</span>` : '',
      o.beginner_friendly ? '<span class="tag good">Beginner friendly</span>' : '<span class="tag">Skilled people</span>',
      o.is_referral ? '<span class="tag ref">Referral link</span>' : '',
    ].join('');
    const fields = (o.fields || []).map(f => `<span class="tag soft">${esc(JP.fieldLabel(f))}</span>`).join('');
    const checked = o.verified_at ? `<small class="muted">Rules last checked ${esc(JP.date(o.verified_at))}</small>` : '';
    const note = o.is_referral ? '<p class="fine">If you are accepted through this link, we may receive a reward from the company. It does not change your pay or cost you anything.</p>' : '';
    const why = o.reason === 'country' ? 'Not open to people in your country, according to the rules we have.' : 'Needs professional skills. Update your profile when you have some.';
    const action = locked
      ? `<p class="fine lock">${esc(why)}</p>`
      : `<button class="btn btn-gold apply" data-id="${o.id}" type="button">Apply on ${esc(o.company)}</button>`;
    return `<article class="card${locked ? ' locked' : ''}">
      <div class="tags">${tags}</div>
      <h3>${esc(o.title)}</h3><p class="company">${esc(o.company)}</p>
      <p class="summary">${esc(o.summary)}</p>
      ${o.pay_note ? `<p class="pay"><span class="muted">Pay:</span> ${esc(o.pay_note)}</p>` : ''}
      <div class="tags">${fields}</div>
      ${note}${checked}
      ${action}
    </article>`;
  }

  function renderOpps() {
    const u = JP.user;
    $('#oppsIntro').textContent = `Showing what fits ${u.level === 'student' ? 'someone starting out' : 'your skills'} in ${JP.countryName(u.country)}.`;
    $('#refNotice').hidden = !opps.eligible.some(o => o.is_referral);
    const keys = [...new Set(opps.eligible.flatMap(o => o.fields))];
    $('#fieldChips').innerHTML = keys.length > 1
      ? ['all', ...keys].map(k => `<button type="button" class="chip${k === activeField ? ' selected' : ''}" data-field="${esc(k)}">${k === 'all' ? 'All' : esc(JP.fieldLabel(k))}</button>`).join('') : '';
    const words = query.split(/\s+/).filter(Boolean);
    const haystack = o => `${o.title} ${o.company} ${o.work_type} ${o.fields.map(JP.fieldLabel).join(' ')}`.toLowerCase();
    const matching = opps.eligible.filter(o => (activeField === 'all' || o.fields.includes(activeField)) && words.every(w => haystack(o).includes(w)));
    const shown = matching.slice(0, limit);
    $('#oppList').innerHTML = shown.length ? shown.map(o => card(o, false)).join('')
      : '<div class="panel"><p>No matching opportunities right now. Try a different search, check back soon, or update your profile.</p></div>';
    $('#oppCount').textContent = matching.length ? `Showing ${shown.length} of ${matching.length}` : '';
    $('#showMore').hidden = matching.length <= shown.length;
    const box = $('#unavailableBox');
    box.hidden = !opps.unavailable.length;
    $('#unavailableTitle').textContent = `Not available for your profile (${opps.unavailable.length})`;
    $('#unavailableList').innerHTML = opps.unavailable.map(o => card(o, true)).join('');
  }

  JP.loaders.opps = async () => {
    try { opps = await api('/opportunities'); limit = 24; renderOpps(); }
    catch (e) { $('#oppList').innerHTML = `<div class="panel"><p class="negative">${esc(e.message)}</p></div>`; }
  };

  $('#fieldChips').addEventListener('click', e => {
    const b = e.target.closest('[data-field]'); if (!b) return;
    activeField = b.dataset.field; limit = 24; renderOpps();
  });
  $('#oppSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); limit = 24; renderOpps(); });
  $('#showMore').addEventListener('click', () => { limit += 24; renderOpps(); });

  // Apply: open a tab right away (so pop-up blockers allow it), then point it at the address the server returns.
  app.addEventListener('click', async e => {
    const btn = e.target.closest('button.apply'); if (!btn) return;
    btn.disabled = true;
    const w = window.open('', '_blank');
    try {
      const r = await api(`/opportunities/${btn.dataset.id}/click`, { method: 'POST' });
      if (w) { w.opener = null; w.location.href = r.url; } else window.location.href = r.url;
    } catch (err) { if (w) w.close(); JP.toast(err.message, true); }
    finally { btn.disabled = false; }
  });

  /* ---------------- profile ---------------- */
  JP.loaders.profile = () => {
    const u = JP.user;
    $('#profileName').value = u.full_name; $('#profileEmail').value = u.email; $('#profileCountry').value = u.country;
    for (const r of $$('input[name="profileLevel"]')) r.checked = r.value === u.level;
    for (const c of $$('#profileFields input')) c.checked = u.fields.includes(c.value);
  };
  $('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const r = await api('/me', { method: 'PATCH', body: { full_name: $('#profileName').value.trim(), country: $('#profileCountry').value, level: levelOf('profileLevel'), fields: checkedFields($('#profileFields')) } });
      JP.user = r.user; $('#welcomeName').textContent = r.user.full_name.split(' ')[0];
      JP.toast('Profile saved. Your opportunities have been updated.'); showPage('opps');
    } catch (err) { JP.toast(err.message, true); }
    finally { btn.disabled = false; }
  });

  /* ---------------- boot ---------------- */
  (async () => {
    try { JP.meta = (await api('/meta')); fillLists(); }
    catch (e) { metadataError = e.message; return; }
    if (!JP.getToken()) return;
    try { const me = await api('/me'); await enterApp(me.user); }
    catch { JP.setToken(null); }
  })();
})();
