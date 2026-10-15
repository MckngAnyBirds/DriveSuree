/* =====================================================================
   SHARED CODE  (loaded by every page, after config.js)
   ---------------------------------------------------------------------
   1. Data        : cars, sales, inquiries and settings (kept in the browser)
   2. Helpers     : formatting, images, toast messages
   3. Components  : car card, sticky header, footer
   Each page then exposes what it needs through the global  Site  object.
   ===================================================================== */
(function () {
  const CFG = window.SITE_CONFIG;

  /* ---------------------------------------------------------------
     1. DATA
     Loaded through assets/js/db.js (Supabase online, or this browser in local mode).
     D is an in-memory copy the pages read from. Page scripts must wait for  Site.ready
     before using it:   Site.ready.then(() => { ... });
     --------------------------------------------------------------- */
  const db = window.DB;

  const DEFAULT_SETTINGS = {
    name: CFG.business.name, currency: CFG.business.currency, phone: CFG.business.phone,
    email: CFG.business.email, address: CFG.business.address, hours: CFG.business.hours,
    promoTitle: CFG.promo.title, promoBadge: CFG.promo.badge, promoText: CFG.promo.text
  };

  const D = {S: {...DEFAULT_SETTINGS}, cars: [], sales: [], inquiries: [], applications: [], user: null, favs: new Set()};

  /** Add a visitor inquiry (buy / sell / question). It shows in the Owner dashboard. Returns a promise. */
  function saveInquiry(name, contact, topic, msg) { return db.addInquiry({name, contact, topic, msg}); }

  function showLoadError() {
    const d = document.createElement('div');
    d.className = 'alert alert-danger rounded-0 mb-0 text-center';
    d.style.cssText = 'position:relative;z-index:1040';
    d.textContent = 'We could not load the latest data. Please check your internet connection and refresh the page.';
    document.body.prepend(d);
  }

  /* ---------------------------------------------------------------
     2. HELPERS
     --------------------------------------------------------------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = n => D.S.currency + Number(n || 0).toLocaleString();
  const carName = c => `${c.year} ${c.brand} ${c.model}`;
  const today = () => new Date().toISOString().slice(0, 10);
  // Long date and time for the owner page: "October 15, 2026" / "1:30 PM"
  const fmtLong = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}); };
  const fmtTime = d => { const x = new Date(d); return isNaN(x) || String(d).length <= 10 ? '' : x.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}); };
  const fmtDate = d => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}); };
  const available = () => D.cars.filter(c => c.status !== 'sold');
  /** 'new' or 'second_hand' (cars without the field count as second hand) */
  const condOf = c => c.condition === 'new' ? 'new' : 'second_hand';
  const condLabel = c => condOf(c) === 'new' ? 'Brand new' : 'Second hand';

  function brandsInStock() {
    const m = {}; available().forEach(c => m[c.brand] = (m[c.brand] || 0) + 1);
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  /** Picture used when a car has no photo yet. */
  function placeholder(c) {
    const label = String((c.brand || '') + ' ' + (c.model || '')).trim().replace(/&/g, 'and').replace(/[<>]/g, '');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#3b4558'/><stop offset='1' stop-color='#0b1020'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><g fill='none' stroke='#7fa4e8' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'><path d='M70 190h-10v-30l25-8 38-45h120l50 45 40 8v30h-10'/><path d='M120 190h160'/><circle cx='110' cy='192' r='24'/><circle cx='290' cy='192' r='24'/></g><text x='200' y='262' font-family='Arial' font-size='20' fill='#c9cbd2' text-anchor='middle'>${label}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const imgOf = c => c.img || placeholder(c);

  /** Small message in the bottom-right corner. */
  function toast(msg) {
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      box.style.zIndex = 2000;
      box.innerHTML = '<div id="toast" class="toast align-items-center text-bg-dark border-0" role="status" aria-live="polite"><div class="d-flex"><div class="toast-body" id="toastMsg"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>';
      document.body.appendChild(box);
    }
    document.getElementById('toastMsg').textContent = msg;
    if (window.bootstrap) bootstrap.Toast.getOrCreateInstance(document.getElementById('toast'), {delay: 2800}).show();
    else alert(msg);
  }

  /* ---------------------------------------------------------------
     3. COMPONENTS
     --------------------------------------------------------------- */

  /** Logo: the image from config (or the business name as text if no image). */
  function logoHTML() {
    return CFG.logo
      ? `<img class="logo-img" src="${esc(CFG.logo)}" alt="${esc(D.S.name)}">`
      : esc(D.S.name);
  }

  /** One car card (links to car.html). `cols` = Bootstrap column classes.
      Shows the condition tag, and a save (heart) button when customer accounts are available. */
  function cardHTML(c, cols) {
    const fav = db.customer
      ? `<button type="button" class="fav ${D.favs.has(c.id) ? 'on' : ''}" data-fav="${esc(c.id)}" aria-label="Save ${esc(carName(c))}" aria-pressed="${D.favs.has(c.id)}"><i class="bi ${D.favs.has(c.id) ? 'bi-heart-fill' : 'bi-heart'}"></i></button>` : '';
    return `<div class="${cols || 'col-12 col-sm-6 col-lg-4 col-xl-3'}"><div class="car-wrap"><a class="car ${c.featured ? 'feat' : ''}" href="car.html?id=${encodeURIComponent(c.id)}">
      <div class="pic"><img class="photo" src="${imgOf(c)}" alt="${esc(carName(c))}" loading="lazy"><span class="tag ${condOf(c) === 'new' ? 'new' : ''}">${condLabel(c)}</span></div>
      <div class="body">
        <h3>${esc(c.brand)} ${esc(c.model)}</h3>
        <div class="spec mb-2">${c.year} · ${esc(c.type)} · ${esc(c.transmission)} · ${Number(c.mileage || 0).toLocaleString()} km</div>
        <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
          <span class="price">${money(c.price)}</span><span class="btn-outline-ink">View details</span>
        </div>
      </div></a>${fav}</div></div>`;
  }

  /** Sticky navbar. Put <div id="siteHeader"></div> on a page to show it.
      To add or rename menu links, edit the <ul> below. */
  function header() {
    const el = document.getElementById('siteHeader');
    if (!el) return;
    const page = location.pathname.split('/').pop() || 'index.html';
    const p = new URLSearchParams(location.search);
    const curType = page === 'cars.html' ? (p.get('type') || '') : null;
    const act = cond => cond ? 'active' : '';
    el.className = 'site-header';
    el.innerHTML = `<div class="container"><nav class="navbar navbar-expand-xl" aria-label="Main">
      <a class="logo me-xl-3" href="index.html">${logoHTML()}</a>
      <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation"><i class="bi bi-list fs-2"></i></button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav mx-xl-auto mb-2 mb-xl-0 gap-xl-1">
          <li class="nav-item"><a class="nav-link ${act(curType === '' && !p.get('brand'))}" href="cars.html">All cars</a></li>
          ${CFG.carTypes.map(t => `<li class="nav-item"><a class="nav-link ${act(curType === t)}" href="cars.html?type=${encodeURIComponent(t)}">${t}</a></li>`).join('')}
          <li class="nav-item"><a class="nav-link ${act(page === 'sell.html')}" href="sell.html">Sell your car</a></li>
          <li class="nav-item"><a class="nav-link ${act(page === 'apply.html')}" href="apply.html">Apply here</a></li>
          <li class="nav-item"><a class="nav-link ${act(page === 'contact.html')}" href="contact.html">Inquire here</a></li>
        </ul>
        <form class="d-flex align-items-center gap-2 pb-2 pb-xl-0" action="cars.html" method="get" role="search">
          <div class="nav-search flex-grow-1"><i class="bi bi-search"></i><input name="q" value="${esc(p.get('q') || '')}" class="form-control form-control-sm" type="search" placeholder="Search cars" aria-label="Search cars"></div>
          <a class="admin-btn" href="account.html" title="My account" aria-label="My account"><i class="bi bi-person-fill"></i></a>
        </form>
      </div></nav></div>`;
  }

  /** Footer. Put <div id="siteFooter"></div> on a page to show it. */
  function footer() {
    const el = document.getElementById('siteFooter');
    if (!el) return;
    const S = D.S, brands = brandsInStock().slice(0, 6);
    el.innerHTML = `<footer class="site-footer"><div class="container py-5"><div class="row g-4">
      <div class="col-md-4"><a class="logo" href="index.html">${logoHTML()}</a><p class="small text-secondary mt-3 mb-0" style="max-width:34ch">${esc(CFG.business.tagline)}</p></div>
      <div class="col-6 col-md-2"><div class="fw-semibold mb-2">Car types</div><div class="d-grid gap-1">${CFG.carTypes.map(t => `<a href="cars.html?type=${encodeURIComponent(t)}">${t}</a>`).join('')}</div></div>
      <div class="col-6 col-md-3"><div class="fw-semibold mb-2">Top brands</div><div class="d-grid gap-1">${brands.map(([n]) => `<a href="cars.html?brand=${encodeURIComponent(n)}">${esc(n)}</a>`).join('') || '<span class="small text-secondary">No cars yet</span>'}</div></div>
      <div class="col-md-3"><div class="fw-semibold mb-2">Reach us</div><div class="d-grid gap-1 small text-secondary"><span>${esc(S.phone)}</span><span>${esc(S.email)}</span><span>${esc(S.address)}</span></div></div>
    </div></div>
    <div class="border-top py-3"><div class="container small text-secondary d-flex flex-wrap justify-content-between gap-2">
      <span>© ${new Date().getFullYear()} ${esc(S.name)}. All rights reserved.</span>
      <span><a href="sell.html" class="me-3">Sell your car</a><a href="apply.html" class="me-3">Apply here</a><a href="contact.html" class="me-3">Inquire here</a><a href="account.html" class="me-3">My account</a><a href="admin.html">Owner login</a></span>
    </div></div></footer>`;
  }

  /* Load data, then draw the navbar and footer. Pages wait for this with Site.ready */
  /* ---------- show/hide password eye on every password box (also boxes the pages create later) ---------- */
  function addPasswordEyes(root) {
    root.querySelectorAll('input[type="password"]:not([data-eye])').forEach(inp => {
      inp.dataset.eye = '1';
      const wrap = document.createElement('div'); wrap.className = 'pw-wrap';
      [...inp.classList].filter(c => /^m[tbxyse]?-/.test(c)).forEach(c => { wrap.classList.add(c); inp.classList.remove(c); });   // keep spacing outside the box
      inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'pw-toggle'; btn.setAttribute('aria-label', 'Show password'); btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<i class="bi bi-eye"></i>';
      btn.addEventListener('click', () => {
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); btn.setAttribute('aria-pressed', String(show));
        btn.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>';
        inp.focus();
      });
      wrap.appendChild(btn);
    });
  }
  const domReady = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r) : r());
  domReady.then(() => { addPasswordEyes(document); new MutationObserver(() => addPasswordEyes(document)).observe(document.body, {childList: true, subtree: true}); });
  const ready = db.loadPublic()
    .then(r => { D.cars = r.cars; D.S = {...D.S, ...r.settings}; })
    .catch(err => { console.error(err); Site.error = err; domReady.then(showLoadError); })
    .then(async () => {            // is a customer logged in? load their saved cars
      if (!db.customer) return;
      try { D.user = await db.customer.user(); if (D.user) (await db.customer.favorites()).forEach(id => D.favs.add(id)); }
      catch (err) { console.error(err); }
    })
    .then(() => domReady)
    .then(() => { header(); footer(); });

  /* ---------- saved cars (heart buttons: [data-fav="car id"]) ---------- */
  function paintFav(id) {
    const on = D.favs.has(id);
    document.querySelectorAll('[data-fav="' + id + '"]').forEach(b => {
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      const i = b.querySelector('i'); if (i) i.className = 'bi ' + (on ? 'bi-heart-fill' : 'bi-heart');
      const t = b.querySelector('.fav-text'); if (t) t.textContent = on ? 'Saved' : 'Save';
    });
    if (window.Site && Site.onFav) Site.onFav(id);
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const id = b.dataset.fav;
    if (!D.user) {
      toast('Log in to save cars.');
      setTimeout(() => { location.href = 'account.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search); }, 700);
      return;
    }
    try {
      if (D.favs.has(id)) { await db.customer.removeFavorite(id); D.favs.delete(id); }
      else { await db.customer.addFavorite(id); D.favs.add(id); }
      paintFav(id);
    } catch (err) { console.error(err); toast('Could not update your saved cars. Please try again.'); }
  });

  /** Name and email of the logged-in customer, to pre-fill inquiry forms (or null). */
  const prefill = () => D.user ? {name: (D.user.user_metadata || {}).full_name || '', contact: D.user.email || ''} : null;

  /* What the page scripts can use */
  window.Site = {
    CFG, db, ready, TYPES: CFG.carTypes, BRANDS: CFG.brands, DEFAULT_SETTINGS, D,
    saveInquiry,
    $, esc, money, carName, today, fmtDate, fmtLong, fmtTime, available, brandsInStock, placeholder, imgOf, toast,
    logoHTML, cardHTML, condOf, condLabel, prefill, paintFav
  };
})();
