/* ===== account.html page script: customer accounts =====
   Log in / create account / forgot password, then: saved cars, my inquiries, profile, password.
   Needs Supabase (customer accounts are not available in browser-only "local" mode). */
Site.ready.then(async () => {
  const {D, db, esc, money, fmtDate, toast, cardHTML} = Site;
  const $ = s => document.querySelector(s);
  const view = $('#view');
  document.title = 'My account | ' + D.S.name;

  // Page to return to after logging in (only simple local pages are allowed)
  const next = (() => { const n = new URLSearchParams(location.search).get('next') || ''; return /^[\w-]+\.html(\?[^#]*)?$/.test(n) ? n : ''; })();
  const hero = (t, p) => { $('#heroTitle').textContent = t; $('#heroText').textContent = p; };
  const msg = (id, text, ok) => { const el = $(id); el.textContent = text; el.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); };

  if (!db.customer) {
    view.innerHTML = '<div class="auth-card text-center"><i class="bi bi-cloud-slash fs-1"></i><h2 class="h5 mt-2">Accounts are not available yet</h2><p class="small text-secondary mb-0">Customer accounts need the online database. Connect Supabase in assets/js/config.js (see SUPABASE-SETUP.md).</p></div>';
    return;
  }

  /* ---------------- logged out: log in / sign up / forgot password ---------------- */
  function renderAuth(tab) {
    hero(tab === 'signup' ? 'Create your account' : 'Log in', 'Save cars you like and follow your inquiries.');
    view.innerHTML = `<div class="auth-card">
      <ul class="nav nav-pills nav-fill gap-2 mb-3">
        <li class="nav-item"><button class="nav-link ${tab !== 'signup' ? 'active' : ''}" data-tab="login" type="button">Log in</button></li>
        <li class="nav-item"><button class="nav-link ${tab === 'signup' ? 'active' : ''}" data-tab="signup" type="button">Create account</button></li>
      </ul>
      ${tab === 'signup' ? `
      <form id="signupForm" class="d-grid gap-3">
        <div><label class="form-label" for="suName">Full name</label><input id="suName" class="form-control" required autocomplete="name"></div>
        <div><label class="form-label" for="suEmail">Email</label><input id="suEmail" type="email" class="form-control" required autocomplete="email" autocapitalize="off"></div>
        <div><label class="form-label" for="suPhone">Phone (optional)</label><input id="suPhone" class="form-control" autocomplete="tel"></div>
        <div><label class="form-label" for="suPw">Password</label><input id="suPw" type="password" minlength="8" class="form-control" required autocomplete="new-password"><div class="form-text">At least 8 characters.</div></div>
        <button class="btn btn-accent py-2" type="submit">Create account</button>
        <div id="suMsg" class="small"></div>
        <p class="small text-secondary mb-0">We use your details only to reply to your inquiries.</p>
      </form>` : tab === 'forgot' ? `
      <form id="forgotForm" class="d-grid gap-3">
        <p class="small text-secondary mb-0">Enter your email and we will send you a link to set a new password.</p>
        <div><label class="form-label" for="fpEmail">Email</label><input id="fpEmail" type="email" class="form-control" required autocapitalize="off"></div>
        <button class="btn btn-accent py-2" type="submit">Send reset link</button>
        <div id="fpMsg" class="small"></div>
        <button class="btn btn-link p-0 text-start" data-tab="login" type="button">Back to log in</button>
      </form>` : `
      <form id="loginForm" class="d-grid gap-3">
        <div><label class="form-label" for="liEmail">Email</label><input id="liEmail" type="email" class="form-control" required autocomplete="username" autocapitalize="off"></div>
        <div><label class="form-label" for="liPw">Password</label><input id="liPw" type="password" class="form-control" required autocomplete="current-password"></div>
        <button class="btn btn-accent py-2" type="submit">Log in</button>
        <div id="liMsg" class="small"></div>
        <button class="btn btn-link p-0 text-start" data-tab="forgot" type="button">Forgot your password?</button>
      </form>`}
    </div>`;
  }

  async function afterLogin() {
    D.user = await db.customer.user();
    D.favs = new Set(D.user ? await db.customer.favorites() : []);
    if (next) location.href = next; else renderAccount();
  }

  /* ---------------- logged in ---------------- */
  async function renderAccount() {
    const meta = D.user.user_metadata || {};
    const isOwner = await db.auth.isSignedIn().catch(() => false);
    hero('Hi, ' + ((meta.full_name || '').split(' ')[0] || 'there'), D.user.email);
    view.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <ul class="nav nav-pills gap-2" role="tablist">
          <li class="nav-item"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tSaved" type="button">Saved cars <span class="badge text-bg-primary" id="favCount">0</span></button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tInq" type="button">My inquiries</button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tProfile" type="button">Profile</button></li>
        </ul>
        <div class="d-flex gap-2">${isOwner ? '<a class="btn btn-sm btn-outline-dark btn-pill" href="admin.html">Owner dashboard</a>' : ''}<button class="btn btn-sm btn-dark btn-pill" id="logout" type="button"><i class="bi bi-box-arrow-right me-1"></i>Log out</button></div>
      </div>
      <div class="tab-content">
        <div class="tab-pane fade show active" id="tSaved"><div class="row g-3" id="savedGrid"></div></div>
        <div class="tab-pane fade" id="tInq"><div id="inqList"><p class="text-secondary">Loading...</p></div></div>
        <div class="tab-pane fade" id="tProfile"><div class="row g-4">
          <div class="col-lg-6"><form id="profForm" class="bg-white border rounded-3 p-4 d-grid gap-3">
            <h2 class="h5 mb-0">Your details</h2>
            <div><label class="form-label" for="pName">Full name</label><input id="pName" class="form-control" value="${esc(meta.full_name || '')}" required></div>
            <div><label class="form-label" for="pPhone">Phone</label><input id="pPhone" class="form-control" value="${esc(meta.phone || '')}"></div>
            <div><label class="form-label">Email</label><input class="form-control" value="${esc(D.user.email)}" disabled></div>
            <button class="btn btn-accent" type="submit">Save details</button><div id="profMsg" class="small"></div>
          </form></div>
          <div class="col-lg-6"><form id="pwForm" class="bg-white border rounded-3 p-4 d-grid gap-3">
            <h2 class="h5 mb-0">Change password</h2>
            <div><label class="form-label" for="npw">New password</label><input id="npw" type="password" minlength="8" class="form-control" required autocomplete="new-password"></div>
            <button class="btn btn-dark" type="submit">Update password</button><div id="pwMsg" class="small"></div>
          </form></div>
        </div></div>
      </div>`;
    renderSaved();
    db.customer.myInquiries(D.user.id).then(list => {
      $('#inqList').innerHTML = list.length ? `<div class="bg-white border rounded-3 table-responsive"><table class="table align-middle mb-0"><thead class="table-light"><tr><th>Date</th><th>Topic</th><th>Message</th></tr></thead><tbody>${
        list.map(i => `<tr><td class="text-nowrap">${fmtDate(i.date)}</td><td>${esc(i.topic)}</td><td>${esc(i.msg)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="bg-white border rounded-3 text-center text-secondary py-5">You have not sent any inquiries yet.<br><a class="btn btn-accent mt-3" href="cars.html">Browse cars</a></div>';
    }).catch(err => { console.error(err); $('#inqList').innerHTML = '<p class="text-danger">Could not load your inquiries.</p>'; });
  }

  function renderSaved() {
    const grid = $('#savedGrid'); if (!grid) return;
    const list = D.cars.filter(c => D.favs.has(c.id));
    $('#favCount').textContent = list.length;
    grid.innerHTML = list.length ? list.map(c => cardHTML(c)).join('')
      : '<div class="col-12"><div class="bg-white border rounded-3 text-center text-secondary py-5"><i class="bi bi-heart fs-1 d-block mb-2"></i>No saved cars yet. Tap the heart on any car to save it here.<br><a class="btn btn-accent mt-3" href="cars.html">Browse cars</a></div></div>';
  }
  Site.onFav = () => renderSaved();   // refresh the list when a heart is toggled here

  /* ---------------- events ---------------- */
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-tab]'); if (t) return renderAuth(t.dataset.tab);
    if (e.target.closest('#logout')) { await db.customer.signOut(); D.user = null; D.favs = new Set(); renderAuth('login'); }
  });

  document.addEventListener('submit', async e => {
    if (!['loginForm', 'signupForm', 'forgotForm', 'profForm', 'pwForm', 'newPwForm'].includes(e.target.id)) return;   // leave the navbar search alone
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    try {
      if (e.target.id === 'loginForm') {
        try { await db.customer.signIn($('#liEmail').value.trim(), $('#liPw').value); await afterLogin(); }
        catch (err) { msg('#liMsg', err.message, false); }
      } else if (e.target.id === 'signupForm') {
        try {
          const r = await db.customer.signUp($('#suEmail').value.trim(), $('#suPw').value, $('#suName').value.trim(), $('#suPhone').value.trim());
          if (r.signedIn) await afterLogin();
          else view.innerHTML = '<div class="auth-card text-center"><i class="bi bi-envelope-check fs-1 text-success"></i><h2 class="h5 mt-2">Check your email</h2><p class="small text-secondary">We sent a confirmation link to <b>' + esc($('#suEmail').value) + '</b>. Click it, then log in. If you do not see it, check your spam folder.</p><button class="btn btn-accent" data-tab="login" type="button">Go to log in</button></div>';
        } catch (err) { msg('#suMsg', err.message, false); }
      } else if (e.target.id === 'forgotForm') {
        try { await db.customer.resetPassword($('#fpEmail').value.trim()); msg('#fpMsg', 'If that email has an account, a reset link is on its way.', true); }
        catch (err) { msg('#fpMsg', 'Could not send the link. Please try again later.', false); }
      } else if (e.target.id === 'profForm') {
        try { await db.customer.updateProfile($('#pName').value.trim(), $('#pPhone').value.trim()); D.user = await db.customer.user(); msg('#profMsg', 'Saved.', true); }
        catch (err) { msg('#profMsg', 'Could not save your details.', false); }
      } else if (e.target.id === 'pwForm' || e.target.id === 'newPwForm') {
        const pw = (e.target.id === 'pwForm' ? $('#npw') : $('#rpw')).value;
        try {
          await db.customer.updatePassword(pw);
          if (e.target.id === 'pwForm') { e.target.reset(); msg('#pwMsg', 'Password updated.', true); }
          else { history.replaceState(null, '', location.pathname); await afterLogin(); toast('Password updated.'); }
        } catch (err) { msg(e.target.id === 'pwForm' ? '#pwMsg' : '#rpMsg', err.message || 'Could not update the password.', false); }
      }
    } finally { if (btn) btn.disabled = false; }
  });

  /* ---------------- password reset link lands here ---------------- */
  function renderNewPassword() {
    hero('Set a new password', 'Choose a new password for your account.');
    view.innerHTML = '<form id="newPwForm" class="auth-card d-grid gap-3"><div><label class="form-label" for="rpw">New password</label><input id="rpw" type="password" minlength="8" class="form-control" required autocomplete="new-password"></div><button class="btn btn-accent py-2" type="submit">Save new password</button><div id="rpMsg" class="small"></div></form>';
  }

  /* ---------------- start ---------------- */
  if (location.hash.includes('type=recovery')) { D.user = await db.customer.user(); if (D.user) return renderNewPassword(); }
  db.customer.onRecovery(renderNewPassword);
  D.user = await db.customer.user();
  if (D.user) { if (!D.favs.size) D.favs = new Set(await db.customer.favorites().catch(() => [])); renderAccount(); }
  else renderAuth(new URLSearchParams(location.search).get('tab') === 'signup' ? 'signup' : 'login');
});
