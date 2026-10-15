/* ===== admin.html page script: Owner dashboard =====
   Login, cars (add/edit/remove), receipts, inquiries, settings, backup.
   All saving goes through assets/js/db.js (Supabase online, or this browser in local mode). */
Site.ready.then(async () => {
  const {D, db, TYPES, BRANDS, DEFAULT_SETTINGS, esc, money, carName, today, fmtDate, placeholder, imgOf, toast} = Site;
  const $ = s => document.querySelector(s);
  const modal = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
  const fail = (err, what) => { console.error(err); toast((what || 'Something went wrong') + (err && err.message ? ': ' + err.message : '.')); };
  const busy = (btn, on) => { if (btn) { btn.disabled = on; btn.dataset.t = btn.dataset.t || btn.innerHTML; btn.innerHTML = on ? 'Saving...' : btn.dataset.t; } };

  document.title = 'Owner dashboard | ' + D.S.name;
  $('#logo').innerHTML = Site.logoHTML();
  $('#fType').innerHTML = TYPES.map(t => `<option>${t}</option>`).join('');
  $('#brandList').innerHTML = BRANDS.map(b => `<option value="${b}">`).join('');
  if (db.mode === 'local') $('#emailRow').classList.add('d-none');   // local mode: password only
  if (Site.error) toast('Could not reach the database. Check your Supabase settings in config.js.');

  let logged = false, inbox = null;

  /* ---------- views ---------- */
  async function showView() {
    $('#loginView').classList.toggle('d-none', logged);
    $('#dashView').classList.toggle('d-none', !logged);
    $('#logoutBtn').classList.toggle('d-none', !logged);
    if (logged) {
      try { const o = await db.loadOwner(); D.sales = o.sales; D.inquiries = o.inquiries; D.applications = o.applications || []; } catch (err) { fail(err, 'Could not load receipts, inquiries and applications'); }
      render();
      if (!inbox) inbox = Site.mountInbox($('#inboxHost'), {wide: true, onUnread: n => { const b = $('#chatBadge'); b.textContent = n; b.classList.toggle('d-none', !n); }});
    } else { if (inbox) { inbox.destroy(); inbox = null; } setTimeout(() => $('#loginPw').focus(), 100); }
  }

  function render() {
    const {cars, sales, inquiries, S} = D;
    const av = cars.filter(c => c.status !== 'sold').length;
    const rev = sales.reduce((s, x) => s + Number(x.amount || 0), 0);
    $('#stats').innerHTML = [['Cars listed', cars.length], ['Available', av], ['Sold', cars.length - av], ['Total sales', money(rev)]]
      .map(([l, v]) => `<div class="col-6 col-lg-3"><div class="stat"><b>${v}</b><span class="small text-secondary">${l}</span></div></div>`).join('');

    const q = $('#adminSearch').value.trim().toLowerCase();
    const l = [...cars].sort((a, b) => b.created - a.created).filter(c => !q || (carName(c) + ' ' + c.type).toLowerCase().includes(q));
    $('#adminCars').innerHTML = l.length ? l.map(c => `<tr>
      <td><img class="thumb" src="${imgOf(c)}" alt=""></td>
      <td><div class="fw-semibold">${esc(carName(c))}</div><div class="small text-secondary">${Site.condLabel(c)}${c.featured ? ' · <i class="bi bi-star-fill text-warning"></i> Featured' : ''}</div></td>
      <td>${esc(c.type)}</td><td>${money(c.price)}</td>
      <td><span class="badge ${c.status === 'sold' ? 'text-bg-secondary' : 'text-bg-success'}">${c.status === 'sold' ? 'Sold' : 'Available'}</span></td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-dark" data-act="edit" data-id="${esc(c.id)}" title="Edit" aria-label="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-dark" data-act="receipt" data-id="${esc(c.id)}" title="Create receipt" aria-label="Create receipt"><i class="bi bi-receipt"></i></button>
        <button class="btn btn-sm btn-outline-dark" data-act="toggle" data-id="${esc(c.id)}" title="${c.status === 'sold' ? 'Mark available' : 'Mark sold'}" aria-label="Toggle sold"><i class="bi ${c.status === 'sold' ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'}"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${esc(c.id)}" title="Remove" aria-label="Remove"><i class="bi bi-trash"></i></button>
      </td></tr>`).join('') : `<tr><td colspan="6" class="text-center text-secondary py-5">No cars yet. Press “Add car” to list your first one.</td></tr>`;

    $('#adminSales').innerHTML = sales.length ? [...sales].reverse().map(s => `<tr>
      <td class="fw-semibold">${esc(s.no)}</td><td>${fmtDate(s.date)}</td><td>${esc(s.carName)}</td><td>${esc(s.buyer)}</td><td>${money(s.amount)}</td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-dark" data-act="reprint" data-id="${esc(s.no)}"><i class="bi bi-printer me-1"></i>Print</button>
      <button class="btn btn-sm btn-outline-danger" data-act="delsale" data-id="${esc(s.no)}" title="Delete record" aria-label="Delete record"><i class="bi bi-trash"></i></button></td></tr>`).join('')
      : `<tr><td colspan="6" class="text-center text-secondary py-5">No receipts yet.</td></tr>`;

    $('#inqBadge').textContent = inquiries.length;
    $('#adminInq').innerHTML = inquiries.length ? [...inquiries].reverse().map(i => `<tr>
      <td class="text-nowrap"><div>${Site.fmtLong(i.created || i.date)}</div><div class="small text-secondary">${Site.fmtTime(i.created)}</div></td><td><div class="fw-semibold">${esc(i.name)}</div><div class="small text-secondary">${esc(i.contact)}</div></td>
      <td>${esc(i.topic)}</td><td style="min-width:220px">${esc(i.msg)}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-act="delinq" data-id="${esc(i.id)}" title="Delete" aria-label="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')
      : `<tr><td colspan="5" class="text-center text-secondary py-5">No inquiries yet.</td></tr>`;

    const apps = D.applications || [];
    $('#appBadge').textContent = apps.filter(a => a.status === 'new').length;
    $('#adminApps').innerHTML = apps.length ? [...apps].reverse().map(a => `<tr>
      <td class="text-nowrap"><div>${Site.fmtLong(a.created)}</div><div class="small text-secondary">${Site.fmtTime(a.created)}</div></td>
      <td><div class="fw-semibold">${esc(a.name)}</div><div class="small text-secondary">${esc([a.mobile, a.email].filter(Boolean).join(' · '))}</div></td>
      <td>${esc(a.car || '—')}</td>
      <td><span class="badge ${a.status === 'new' ? 'text-bg-primary' : 'text-bg-secondary'}">${a.status === 'new' ? 'New' : 'Reviewed'}</span></td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-dark" data-act="viewapp" data-id="${esc(a.id)}"><i class="bi bi-eye me-1"></i>View</button>
        <button class="btn btn-sm btn-outline-danger" data-act="delapp" data-id="${esc(a.id)}" title="Delete" aria-label="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')
      : `<tr><td colspan="5" class="text-center text-secondary py-5">No applications yet.</td></tr>`;

    $('#sName').value = S.name; $('#sCur').value = S.currency; $('#sPhone').value = S.phone; $('#sEmail').value = S.email;
    $('#sAddr').value = S.address; $('#sHours').value = S.hours; $('#sPT').value = S.promoTitle; $('#sPB').value = S.promoBadge; $('#sPX').value = S.promoText;
  }

  /* ---------- login ---------- */
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await db.auth.signIn($('#loginEmail').value.trim(), $('#loginPw').value);
      logged = true; $('#loginPw').value = ''; $('#loginErr').classList.add('d-none'); await showView();
    } catch (err) { $('#loginErr').textContent = err.message || 'Could not log in.'; $('#loginErr').classList.remove('d-none'); }
    btn.disabled = false;
  });
  $('#logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); logged = false; D.sales = []; D.inquiries = []; D.applications = []; showView(); });

  /* ---------- car form ---------- */
  let pendingImg = '';
  function openForm(id) {
    const c = id ? D.cars.find(x => x.id === id) : null;
    $('#formTitle').textContent = c ? 'Edit car' : 'Add car';
    $('#carForm').reset(); pendingImg = c ? (c.img || '') : '';
    $('#fId').value = c ? c.id : '';
    if (c) {
      $('#fBrand').value = c.brand; $('#fModel').value = c.model; $('#fYear').value = c.year; $('#fType').value = c.type;
      $('#fPrice').value = c.price; $('#fMile').value = c.mileage; $('#fTrans').value = c.transmission; $('#fFuel').value = c.fuel;
      $('#fColor').value = c.color; $('#fStatus').value = c.status; $('#fCond').value = Site.condOf(c); $('#fDesc').value = c.description; $('#fFeat').checked = !!c.featured;
      $('#fImgUrl').value = c.img && !c.img.startsWith('data:') ? c.img : '';
    } else { $('#fYear').value = new Date().getFullYear(); $('#fCond').value = 'second_hand'; }
    $('#fPreview').src = pendingImg || placeholder({brand: c ? c.brand : 'Your', model: c ? c.model : 'Car'});
    modal('formModal').show();
  }

  function resizeImage(file, max = 900) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = rej;
      r.onload = () => {
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          res(cv.toDataURL('image/jpeg', .8));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  $('#fFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { pendingImg = await resizeImage(f); $('#fPreview').src = pendingImg; $('#fImgUrl').value = ''; }
    catch (err) { toast('That photo could not be read. Try another file.'); }
  });
  $('#fImgUrl').addEventListener('input', e => { if (e.target.value.trim()) { pendingImg = e.target.value.trim(); $('#fPreview').src = pendingImg; } });

  $('#carForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); busy(btn, true);
    try {
      const id = $('#fId').value;
      const img = await db.preparePhoto(pendingImg);       // uploads the photo in Supabase mode
      const data = {
        brand: $('#fBrand').value.trim(), model: $('#fModel').value.trim(), year: Number($('#fYear').value), type: $('#fType').value,
        price: Number($('#fPrice').value), mileage: Number($('#fMile').value) || 0, transmission: $('#fTrans').value, fuel: $('#fFuel').value,
        color: $('#fColor').value.trim(), status: $('#fStatus').value, condition: $('#fCond').value, description: $('#fDesc').value.trim(), featured: $('#fFeat').checked, img
      };
      if (id) {
        const old = D.cars.find(x => x.id === id);
        const saved = await db.saveCar({...old, ...data, id});
        Object.assign(old, saved); toast('Car updated.');
      } else { D.cars.push(await db.saveCar(data)); toast('Car added.'); }
      modal('formModal').hide(); render();
    } catch (err) { fail(err, 'Could not save the car'); }
    busy(btn, false);
  });
  $('#addCarBtn').addEventListener('click', () => openForm());
  $('#adminSearch').addEventListener('input', render);

  /* ---------- receipts ---------- */
  function openReceipt(id) {
    const c = D.cars.find(x => x.id === id); if (!c) return;
    $('#rcptForm').reset();
    $('#rCar').value = id; $('#rAmt').value = c.price; $('#rDate').value = today();
    $('#rSold').checked = c.status !== 'sold';
    $('#rCarInfo').innerHTML = `<b>${esc(carName(c))}</b> · ${esc(c.color || '')} · ${money(c.price)}`;
    modal('rcptModal').show();
  }
  function receiptHTML(s) {
    const S = D.S;
    return `<div class="receipt">
      <div class="text-center border-bottom pb-3 mb-3">
        <h2 style="margin:0;font-weight:800">${esc(S.name)}</h2>
        <div style="font-size:13px">${esc(S.address)}<br>${esc(S.phone)} · ${esc(S.email)}</div>
        <h4 style="margin:14px 0 0;letter-spacing:.08em">OFFICIAL RECEIPT</h4>
      </div>
      <div class="d-flex justify-content-between mb-3" style="font-size:14px"><span>Receipt no.: <b>${esc(s.no)}</b></span><span>Date: <b>${fmtDate(s.date)}</b></span></div>
      <table class="table table-sm table-borderless mb-3" style="font-size:14px">
        <tr><td style="width:36%">Received from</td><td><b>${esc(s.buyer)}</b></td></tr>
        <tr><td>Phone</td><td>${esc(s.phone || '-')}</td></tr>
        <tr><td>Address</td><td>${esc(s.address || '-')}</td></tr>
      </table>
      <table class="table table-bordered mb-3" style="font-size:14px">
        <thead><tr><th>Description</th><th class="text-end" style="width:30%">Amount</th></tr></thead>
        <tbody><tr><td><b>${esc(s.carName)}</b><br><span style="font-size:12px">${esc(s.details || '')}</span></td><td class="text-end">${money(s.amount)}</td></tr>
        <tr><th class="text-end">Total paid</th><th class="text-end">${money(s.amount)}</th></tr></tbody>
      </table>
      <div style="font-size:14px">Payment method: <b>${esc(s.pay)}</b></div>
      ${s.note ? `<div style="font-size:14px;margin-top:6px">Notes: ${esc(s.note)}</div>` : ''}
      <div class="d-flex justify-content-between" style="margin-top:56px;font-size:13px">
        <div style="width:44%;border-top:1px solid #000;padding-top:4px;text-align:center">Buyer's signature</div>
        <div style="width:44%;border-top:1px solid #000;padding-top:4px;text-align:center">Authorized signature</div>
      </div>
      <p class="text-center" style="font-size:12px;margin:28px 0 0">Thank you for your purchase.</p>
    </div>`;
  }
  function printReceipt(s) { $('#printArea').innerHTML = receiptHTML(s); setTimeout(() => window.print(), 250); }

  $('#rcptForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); busy(btn, true);
    try {
      const c = D.cars.find(x => x.id === $('#rCar').value);
      const d = $('#rDate').value;
      const s = {
        no: 'OR-' + d.replace(/-/g, '') + '-' + String(D.sales.length + 1).padStart(3, '0'), date: d, carId: c.id, carName: carName(c),
        details: [Site.condLabel(c), c.color, c.type, c.transmission, c.fuel].filter(Boolean).join(' · '),
        buyer: $('#rName').value.trim(), phone: $('#rPhone').value.trim(), address: $('#rAddr').value.trim(),
        amount: Number($('#rAmt').value), pay: $('#rPay').value, note: $('#rNote').value.trim()
      };
      while (D.sales.some(x => x.no === s.no)) s.no += 'x';
      await db.addSale(s); D.sales.push(s);
      if ($('#rSold').checked && c.status !== 'sold') { await db.saveCar({...c, status: 'sold'}); c.status = 'sold'; }
      modal('rcptModal').hide(); render(); printReceipt(s);
    } catch (err) { fail(err, 'Could not save the receipt'); }
    busy(btn, false);
  });

  /* ---------- applications ---------- */
  let openApp = null;
  const appSections = a => (a.data || []).map(sec => `<h3 class="h6 text-uppercase text-secondary mt-3 mb-2">${esc(sec.title)}</h3>
    <table class="table table-sm mb-0"><tbody>${sec.rows.map(([k, v]) => `<tr><th class="fw-normal text-secondary" style="width:38%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`).join('');
  function showApp(a) {
    openApp = a.id;
    $('#appTitle').textContent = 'Application: ' + a.name;
    $('#appBody').innerHTML = `<p class="small text-secondary mb-0">Sent ${Site.fmtLong(a.created)} ${Site.fmtTime(a.created)}${a.car ? ' · Car: ' + esc(a.car) : ''}</p>` + appSections(a);
    $('#appStatusBtn').textContent = a.status === 'new' ? 'Mark as reviewed' : 'Mark as new';
    modal('appModal').show();
  }
  function printApp(a) {
    $('#printArea').innerHTML = `<div style="font-family:Arial,sans-serif;font-size:12px;padding:16px">
      <h2 style="margin:0">${esc(D.S.name)}</h2><h3 style="margin:4px 0 2px">Application form</h3>
      <div style="color:#555;margin-bottom:8px">Sent ${Site.fmtLong(a.created)} ${Site.fmtTime(a.created)}${a.car ? ' · Car: ' + esc(a.car) : ''}</div>
      ${(a.data || []).map(sec => `<h4 style="margin:12px 0 4px;border-bottom:1px solid #999">${esc(sec.title)}</h4>
        <table style="width:100%;border-collapse:collapse">${sec.rows.map(([k, v]) => `<tr><td style="width:38%;padding:2px 0;color:#555">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join('')}</table>`).join('')}</div>`;
    setTimeout(() => window.print(), 250);
  }
  $('#appPrintBtn').addEventListener('click', () => { const a = D.applications.find(x => x.id === openApp); if (a) printApp(a); });
  $('#appStatusBtn').addEventListener('click', async () => {
    const a = D.applications.find(x => x.id === openApp); if (!a) return;
    const status = a.status === 'new' ? 'reviewed' : 'new';
    try { await db.setApplicationStatus(a.id, status); a.status = status; render(); modal('appModal').hide(); } catch (err) { fail(err, 'Could not update the application'); }
  });

  /* ---------- table actions ---------- */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    try {
      if (a === 'edit') openForm(id);
      else if (a === 'receipt') openReceipt(id);
      else if (a === 'toggle') {
        const c = D.cars.find(x => x.id === id), status = c.status === 'sold' ? 'available' : 'sold';
        await db.saveCar({...c, status}); c.status = status; render(); toast('Status updated.');
      } else if (a === 'del') {
        const c = D.cars.find(x => x.id === id);
        if (confirm('Remove ' + carName(c) + ' from your listings? This cannot be undone.')) { await db.deleteCar(id); D.cars = D.cars.filter(x => x.id !== id); render(); toast('Car removed.'); }
      } else if (a === 'reprint') { const s = D.sales.find(x => x.no === id); if (s) printReceipt(s); }
      else if (a === 'delsale') { if (confirm('Delete receipt record ' + id + '?')) { await db.deleteSale(id); D.sales = D.sales.filter(x => x.no !== id); render(); } }
      else if (a === 'viewapp') { const x = D.applications.find(y => y.id === id); if (x) showApp(x); }
      else if (a === 'delapp') { if (confirm('Delete this application? This cannot be undone.')) { await db.deleteApplication(id); D.applications = D.applications.filter(x => x.id !== id); render(); } }
      else if (a === 'delinq') { await db.deleteInquiry(id); D.inquiries = D.inquiries.filter(x => x.id !== id); render(); }
    } catch (err) { fail(err, 'That did not work'); }
  });

  /* ---------- settings, password, backup ---------- */
  $('#setForm').addEventListener('submit', async e => {
    e.preventDefault();
    const S = {...D.S, name: $('#sName').value.trim(), currency: $('#sCur').value.trim(), phone: $('#sPhone').value.trim(), email: $('#sEmail').value.trim(),
      address: $('#sAddr').value.trim(), hours: $('#sHours').value.trim(), promoTitle: $('#sPT').value.trim(), promoBadge: $('#sPB').value.trim(), promoText: $('#sPX').value.trim()};
    try { await db.saveSettings(S); D.S = S; render(); toast('Settings saved.'); } catch (err) { fail(err, 'Could not save settings'); }
  });
  $('#pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await db.auth.changePassword($('#newPw').value); e.target.reset(); toast('Password updated.'); } catch (err) { fail(err, 'Could not change the password'); }
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({cars: D.cars, sales: D.sales, inquiries: D.inquiries, applications: D.applications, settings: D.S}, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'car-site-backup-' + today() + '.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      let d;
      try { d = JSON.parse(r.result); if (!Array.isArray(d.cars)) throw 0; } catch (err) { return toast('That file is not a valid backup.'); }
      if (!confirm(db.mode === 'supabase' ? 'Add the cars, receipts and inquiries from this backup to your site?' : 'Replace your current data with this backup?')) return;
      try {
        await db.restore(d);
        const pub = await db.loadPublic(); D.cars = pub.cars; D.S = {...D.S, ...pub.settings};
        const o = await db.loadOwner(); D.sales = o.sales; D.inquiries = o.inquiries; D.applications = o.applications || [];
        render(); toast('Backup restored.');
      } catch (err) { fail(err, 'Could not restore the backup'); }
    };
    r.readAsText(f); e.target.value = '';
  });

  logged = await db.auth.isSignedIn().catch(() => false);
  showView();
});
