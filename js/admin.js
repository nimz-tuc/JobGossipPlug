// Admin page: add / edit opportunities, see clicks and newest members.
(() => {
  const { $, $$, esc, api } = JP;
  let rows = [];

  const rule = o => o.country_mode === 'all' ? (o.min_level === 'skilled' ? 'Skilled only' : 'Everyone')
    : `${o.min_level === 'skilled' ? 'Skilled · ' : ''}${o.country_mode === 'allow' ? 'Only' : 'Not'}: ${o.countries.join(', ')}`;

  function visibleRows() {
    const q = $('#adminSearch').value.trim().toLowerCase(), f = $('#adminFilter').value;
    return rows.filter(o => (!q || `${o.company} ${o.title}`.toLowerCase().includes(q))
      && (f === 'all' || (f === 'nolink' && !o.referral_url) || (f === 'link' && !!o.referral_url) || (f === 'hidden' && !o.active)));
  }
  function renderTable() {
    const list = visibleRows();
    $('#adminCount').textContent = `Showing ${list.length} of ${rows.length}. ${rows.filter(o => !o.referral_url).length} have no referral link yet.`;
    $('#adminTable tbody').innerHTML = list.map(o => `<tr>
      <td><b>${esc(o.company)}</b><br><small class="muted">${esc(o.title)}</small></td>
      <td class="reflink"><form data-ref="${o.id}"><input type="url" value="${esc(o.referral_url || '')}" placeholder="Paste your referral link (https://)" aria-label="Referral link for ${esc(o.title)}" autocomplete="off"><button class="btn btn-sm" type="submit">Save</button></form><small class="muted refmsg">${o.referral_url ? 'Apply uses your link' : 'No link yet: Apply opens the normal page'}</small></td>
      <td>${esc(rule(o))}</td><td>${o.clicks_7d} / ${o.clicks}</td>
      <td>${o.active ? '<span class="tag good">Live</span>' : '<span class="tag">Hidden</span>'}</td>
      <td><button class="link" data-edit="${o.id}" type="button">Edit</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nothing yet.</td></tr>';
  }

  $('#adminSearch').addEventListener('input', renderTable);
  $('#adminFilter').addEventListener('change', renderTable);

  function fillCompanies() {
    const names = [...new Set(rows.map(o => o.company))].sort();
    const cur = $('#bulkCompany').value;
    $('#bulkCompany').innerHTML = names.map(n => `<option>${esc(n)}</option>`).join('');
    if (names.includes(cur)) $('#bulkCompany').value = cur;
  }

  $('#bulkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const r = await api('/admin/referrals/bulk', { method: 'POST', body: {
        company: $('#bulkCompany').value, default_url: $('#bulkDefault').value, overwrite: $('#bulkOverwrite').checked, lines: $('#bulkLines').value } });
      const list = (title, arr) => arr.length ? `<p><b>${esc(title)} (${arr.length})</b></p><ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
      $('#bulkResult').hidden = false;
      $('#bulkResult').innerHTML = `<p><b>Done.</b> ${r.updated} listing(s) set from your lines, ${r.default_applied} filled with the one link.</p>`
        + list('Not found: check the title spelling', r.not_found) + list('Matched more than one listing: use more of the title', r.ambiguous) + list('Lines that were not understood', r.invalid);
      if (r.updated || r.default_applied) { JP.toast('Referral links saved.'); load(); }
    } catch (err) { JP.toast(err.message, true); }
    finally { btn.disabled = false; }
  });

  function syncCountries() { $('#oppCountriesWrap').hidden = $('#oppMode').value === 'all'; }
  $('#oppMode').addEventListener('change', syncCountries);

  function openForm(o) {
    $('#oppForm').hidden = false;
    $('#oppFormTitle').textContent = o ? `Edit ${o.company}` : 'Add opportunity';
    $('#oppId').value = o ? o.id : '';
    $('#oppCompany').value = o ? o.company : ''; $('#oppTitle').value = o ? o.title : '';
    $('#oppSummary').value = o ? o.summary : ''; $('#oppWorkType').value = o ? o.work_type : ''; $('#oppPay').value = o ? o.pay_note : '';
    $('#oppApply').value = o ? o.apply_url : ''; $('#oppReferral').value = o && o.referral_url ? o.referral_url : '';
    for (const c of $$('#oppFields input')) c.checked = !!o && o.fields.includes(c.value);
    $('#oppLevel').value = o ? o.min_level : 'entry'; $('#oppMode').value = o ? o.country_mode : 'all';
    $('#oppCountries').value = o ? o.countries.join(', ') : ''; $('#oppVerified').value = o && o.verified_at ? o.verified_at : '';
    $('#oppSort').value = o ? o.sort_order : 100; $('#oppNotes').value = o ? o.notes : ''; $('#oppActive').checked = o ? o.active : true;
    $('#oppDelete').hidden = !o; syncCountries();
    $('#oppForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function load() {
    try {
      const [list, stats] = await Promise.all([api('/admin/opportunities'), api('/admin/stats')]);
      rows = list.opportunities; renderTable(); fillCompanies();
      const s = stats;
      $('#adminStats').innerHTML = [
        ['Members', s.users.total, `${s.users.week} this week`],
        ['Apply clicks', s.clicks.total, `${s.clicks.referral} through a referral link`],
        ['Top countries', s.top_countries.map(c => `${JP.countryName(c.country)} (${c.n})`).join(', ') || '—', ''],
      ].map(([l, v, sub]) => `<div class="stat"><small>${esc(l)}</small><strong>${esc(v)}</strong><span class="muted">${esc(sub)}</span></div>`).join('');
      $('#usersTable tbody').innerHTML = s.recent_users.map(u => `<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(JP.countryName(u.country))}</td><td>${u.level === 'student' ? 'Starting out' : 'Skilled'}</td><td>${esc(JP.date(u.created_at))}</td></tr>`).join('');
    } catch (e) { JP.toast(e.message, true); }
  }
  JP.loaders.admin = load;

  $('#newOpp').addEventListener('click', () => openForm(null));
  $('#oppCancel').addEventListener('click', () => { $('#oppForm').hidden = true; });
  $('#adminTable').addEventListener('submit', async e => {
    const f = e.target.closest('[data-ref]'); if (!f) return; e.preventDefault();
    const o = rows.find(r => String(r.id) === f.dataset.ref), msg = f.parentElement.querySelector('.refmsg'), btn = f.querySelector('button');
    btn.disabled = true; msg.textContent = 'Saving...';
    try {
      const r = await api('/admin/opportunities/' + o.id + '/referral', { method: 'PATCH', body: { referral_url: f.querySelector('input').value } });
      o.referral_url = r.referral_url; f.querySelector('input').value = r.referral_url || '';
      msg.textContent = r.referral_url ? 'Saved. Apply now uses your link.' : 'Link removed.';
      $('#adminCount').textContent = `Showing ${visibleRows().length} of ${rows.length}. ${rows.filter(x => !x.referral_url).length} have no referral link yet.`;
    } catch (err) { msg.textContent = err.message || 'Could not save.'; } finally { btn.disabled = false; }
  });
  $('#adminTable').addEventListener('click', e => {
    const b = e.target.closest('[data-edit]'); if (!b) return;
    openForm(rows.find(r => String(r.id) === b.dataset.edit));
  });

  $('#oppForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('#oppId').value;
    const body = {
      company: $('#oppCompany').value, title: $('#oppTitle').value, summary: $('#oppSummary').value, work_type: $('#oppWorkType').value, pay_note: $('#oppPay').value,
      apply_url: $('#oppApply').value, referral_url: $('#oppReferral').value, fields: $$('#oppFields input:checked').map(i => i.value),
      min_level: $('#oppLevel').value, country_mode: $('#oppMode').value, countries: $('#oppCountries').value, verified_at: $('#oppVerified').value,
      sort_order: $('#oppSort').value, notes: $('#oppNotes').value, active: $('#oppActive').checked,
    };
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await api(id ? `/admin/opportunities/${id}` : '/admin/opportunities', { method: id ? 'PUT' : 'POST', body });
      JP.toast('Saved.'); $('#oppForm').hidden = true; load();
    } catch (err) { JP.toast(err.message, true); }
    finally { btn.disabled = false; }
  });

  $('#oppDelete').addEventListener('click', async () => {
    const id = $('#oppId').value; if (!id || !confirm('Delete this opportunity and its click history? To just hide it, untick "Visible to visitors" instead.')) return;
    try { await api(`/admin/opportunities/${id}`, { method: 'DELETE' }); JP.toast('Deleted.'); $('#oppForm').hidden = true; load(); }
    catch (err) { JP.toast(err.message, true); }
  });
})();
