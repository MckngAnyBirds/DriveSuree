/* ===== cars.html page script =====
   Runs after assets/js/app.js (shared code) has loaded. */
Site.ready.then(() => {
  const {D, TYPES, esc, money, available, brandsInStock, cardHTML} = Site;
  document.title = 'Cars | ' + D.S.name;
  const $ = s => document.querySelector(s);

  const p = new URLSearchParams(location.search);
  let F = {q: p.get('q') || '', type: p.get('type') || '', brand: p.get('brand') || '', max: Number(p.get('max')) || 0, sort: p.get('sort') || 'new',
    cond: ['new', 'second_hand'].includes(p.get('condition')) ? p.get('condition') : ''};
  $('#fQ').value = F.q; $('#fMax').value = F.max || ''; $('#fSort').value = F.sort;

  function syncUrl() {
    const u = new URLSearchParams();
    if (F.q) u.set('q', F.q); if (F.type) u.set('type', F.type); if (F.brand) u.set('brand', F.brand); if (F.max) u.set('max', F.max); if (F.cond) u.set('condition', F.cond);
    try { history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : '')); } catch (e) { /* not allowed on some local files */ }
  }

  function filtered() {
    const q = F.q.trim().toLowerCase();
    const l = available().filter(c =>
      (!F.type || c.type === F.type) && (!F.cond || Site.condOf(c) === F.cond) && (!F.brand || c.brand === F.brand) && (!F.max || c.price <= F.max) &&
      (!q || [c.brand, c.model, c.year, c.type, c.color, c.fuel, c.transmission, c.description].join(' ').toLowerCase().includes(q)));
    const s = {new: (a, b) => b.created - a.created, lo: (a, b) => a.price - b.price, hi: (a, b) => b.price - a.price, year: (a, b) => b.year - a.year}[F.sort];
    return l.sort(s);
  }

  function render() {
    const typeCount = {}; available().forEach(c => typeCount[c.type] = (typeCount[c.type] || 0) + 1);
    const condCount = {}; available().forEach(c => condCount[Site.condOf(c)] = (condCount[Site.condOf(c)] || 0) + 1);
    $('#condChips').innerHTML = [['new', 'Brand new'], ['second_hand', 'Second hand']].map(([v, l]) => `<button type="button" class="chip ${F.cond === v ? 'on' : ''}" data-cond="${v}" aria-pressed="${F.cond === v}">${l} <small>${condCount[v] || 0}</small></button>`).join('');
    $('#typeChips').innerHTML = TYPES.map(t => `<button type="button" class="chip ${F.type === t ? 'on' : ''}" data-type="${t}" aria-pressed="${F.type === t}">${t} <small>${typeCount[t] || 0}</small></button>`).join('');
    $('#brandChips').innerHTML = brandsInStock().map(([n, k]) => `<button type="button" class="chip ${F.brand === n ? 'on' : ''}" data-brand="${esc(n)}" aria-pressed="${F.brand === n}">${esc(n)} <small>${k}</small></button>`).join('') || '<span class="small text-secondary">No brands yet</span>';

    const l = filtered();
    const tags = [F.cond === 'new' ? 'brand new' : F.cond === 'second_hand' ? 'second hand' : '', F.type, F.brand, F.max ? 'up to ' + money(F.max) : '', F.q ? '“' + F.q + '”' : ''].filter(Boolean);
    $('#count').textContent = l.length + (l.length === 1 ? ' car' : ' cars') + (tags.length ? ' for ' + tags.join(', ') : '');
    $('#grid').innerHTML = l.length ? l.map(c => cardHTML(c)).join('')
      : '<div class="col-12"><div class="empty bg-white border"><i class="bi bi-car-front fs-1 d-block mb-2"></i>No cars match your filters.<br><button class="btn btn-accent mt-3" data-clear>Clear filters</button></div></div>';
    syncUrl();
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-type]'), b = e.target.closest('[data-brand]'), k = e.target.closest('[data-cond]');
    if (t) { F.type = F.type === t.dataset.type ? '' : t.dataset.type; render(); }          /* click again to deselect */
    else if (b) { F.brand = F.brand === b.dataset.brand ? '' : b.dataset.brand; render(); }
    else if (k) { F.cond = F.cond === k.dataset.cond ? '' : k.dataset.cond; render(); }
    else if (e.target.closest('[data-clear]')) clearAll();
  });
  function clearAll() { F = {q: '', type: '', brand: '', max: 0, sort: F.sort, cond: ''}; $('#fQ').value = ''; $('#fMax').value = ''; render(); }
  $('#clear').addEventListener('click', clearAll);
  $('#fQ').addEventListener('input', e => { F.q = e.target.value; render(); });
  $('#fMax').addEventListener('input', e => { F.max = Number(e.target.value) || 0; render(); });
  $('#fSort').addEventListener('change', e => { F.sort = e.target.value; render(); });
  render();
});
