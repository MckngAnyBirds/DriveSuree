/* =====================================================================
   DATABASE LAYER  (the only file that talks to the backend)
   ---------------------------------------------------------------------
   Two modes, chosen automatically from assets/js/config.js:

   - "supabase" : when config.supabase.url and anonKey are filled in.
                  Cars, photos, inquiries, receipts and settings live online.
                  The owner logs in with a Supabase account (email + password).
   - "local"    : when they are empty. Everything is saved in this browser only.
                  Good for trying the site before the backend is set up.

   Every page uses the same functions (window.DB.*), so the rest of the
   site does not care which mode is running.
   ===================================================================== */
(function () {
  const CFG = window.SITE_CONFIG;
  const SB = CFG.supabase || {};
  const mode = (SB.url && SB.anonKey && window.supabase) ? 'supabase' : 'local';
  const client = mode === 'supabase' ? window.supabase.createClient(SB.url, SB.anonKey) : null;
  const BUCKET = SB.photoBucket || 'car-photos';

  /* ---------- row <-> app object mapping (database uses snake_case) ---------- */
  const carFromRow = r => ({
    id: r.id, brand: r.brand, model: r.model, year: r.year, type: r.type, price: Number(r.price),
    mileage: r.mileage || 0, transmission: r.transmission || '', fuel: r.fuel || '', color: r.color || '',
    description: r.description || '', img: r.img || '', featured: !!r.featured, status: r.status || 'available',
    condition: r.car_condition === 'new' ? 'new' : 'second_hand',
    created: new Date(r.created).getTime()
  });
  const carToRow = c => ({
    brand: c.brand, model: c.model, year: c.year, type: c.type, price: c.price, mileage: c.mileage || 0,
    transmission: c.transmission, fuel: c.fuel, color: c.color, description: c.description,
    img: c.img || null, featured: !!c.featured, status: c.status || 'available',
    car_condition: c.condition === 'new' ? 'new' : 'second_hand'
  });
  const settingsFromRow = r => {
    if (!r) return {};
    const m = {name: r.name, currency: r.currency, phone: r.phone, email: r.email, address: r.address, hours: r.hours,
      promoTitle: r.promo_title, promoBadge: r.promo_badge, promoText: r.promo_text};
    Object.keys(m).forEach(k => (m[k] === null || m[k] === undefined) && delete m[k]);
    return m;
  };
  const settingsToRow = s => ({
    id: 1, name: s.name, currency: s.currency, phone: s.phone, email: s.email, address: s.address, hours: s.hours,
    promo_title: s.promoTitle, promo_badge: s.promoBadge, promo_text: s.promoText
  });
  const applicationFromRow = r => ({id: r.id, created: r.created, name: r.full_name, mobile: r.mobile, email: r.email, car: r.car, status: r.status, data: r.data});
  const inquiryFromRow = r => ({id: r.id, date: String(r.created).slice(0, 10), created: r.created, name: r.name, contact: r.contact, topic: r.topic, msg: r.msg});
  const saleFromRow = r => ({no: r.no, date: r.date, carId: r.car_id, carName: r.car_name, details: r.details || '', buyer: r.buyer,
    phone: r.phone || '', address: r.address || '', amount: Number(r.amount), pay: r.pay, note: r.note || ''});
  const saleToRow = s => ({no: s.no, date: s.date, car_id: s.carId && /^[0-9a-f-]{36}$/i.test(s.carId) ? s.carId : null, car_name: s.carName,
    details: s.details, buyer: s.buyer, phone: s.phone, address: s.address, amount: s.amount, pay: s.pay, note: s.note});

  const ok = res => { if (res.error) throw res.error; return res.data; };

  function dataUrlToBlob(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type: mime});
  }

  /* =====================================================================
     SUPABASE MODE
     ===================================================================== */
  const remote = {
    async loadPublic() {
      const [cars, settings] = await Promise.all([
        client.from('cars').select('*').order('created', {ascending: false}),
        client.from('settings').select('*').eq('id', 1).maybeSingle()
      ]);
      return {cars: (ok(cars) || []).map(carFromRow), settings: settingsFromRow(ok(settings))};
    },
    async loadOwner() {
      const [sales, inq, apps] = await Promise.all([
        client.from('sales').select('*').order('created', {ascending: true}),
        client.from('inquiries').select('*').order('created', {ascending: true}),
        client.from('applications').select('*').order('created', {ascending: true})
      ]);
      return {sales: (ok(sales) || []).map(saleFromRow), inquiries: (ok(inq) || []).map(inquiryFromRow), applications: apps.error ? [] : (ok(apps) || []).map(applicationFromRow)};
    },
    async saveCar(car) {
      const row = carToRow(car);
      if (car.id) { ok(await client.from('cars').update(row).eq('id', car.id)); return {...car}; }
      return carFromRow(ok(await client.from('cars').insert(row).select().single()));
    },
    async deleteCar(id) { ok(await client.from('cars').delete().eq('id', id)); },
    async addInquiry(i) {          // visitors can add (not read) inquiries
      ok(await client.from('inquiries').insert({name: i.name, contact: i.contact, topic: i.topic, msg: i.msg}));
    },
    async deleteInquiry(id) { ok(await client.from('inquiries').delete().eq('id', id)); },
    async addApplication(a) {      // visitors can send (not read) applications
      ok(await client.from('applications').insert({full_name: a.name, mobile: a.mobile, email: a.email, car: a.car, data: a.data}));
    },
    async setApplicationStatus(id, status) { ok(await client.from('applications').update({status}).eq('id', id)); },
    async deleteApplication(id) { ok(await client.from('applications').delete().eq('id', id)); },
    async addSale(s) { ok(await client.from('sales').insert(saleToRow(s))); return s; },
    async deleteSale(no) { ok(await client.from('sales').delete().eq('no', no)); },
    async saveSettings(S) { ok(await client.from('settings').upsert(settingsToRow(S))); },
    /** Data-URL photo -> uploaded file in Supabase Storage -> public link. Links are returned unchanged. */
    async preparePhoto(img) {
      if (!img || !img.startsWith('data:')) return img || '';
      const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      ok(await client.storage.from(BUCKET).upload(path, dataUrlToBlob(img), {contentType: 'image/jpeg', cacheControl: '31536000'}));
      return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async restore(d) {              // adds the backup's data (does not delete existing data)
      for (const c of d.cars || []) { const img = await remote.preparePhoto(c.img); await remote.saveCar({...c, id: undefined, img}); }
      for (const s of d.sales || []) await client.from('sales').upsert(saleToRow({...s, carId: null}));
      for (const i of d.inquiries || []) await remote.addInquiry(i);
      for (const a of d.applications || []) await remote.addApplication(a);
      if (d.settings) { const {pw, ...S} = d.settings; await remote.saveSettings({...settingsFromRow({}), ...S}); }
    },
    auth: {
      async signIn(email, password) {
        const {error} = await client.auth.signInWithPassword({email, password});
        if (error) throw new Error('Wrong email or password.');
        const {data} = await client.rpc('is_owner');
        if (data !== true) { await client.auth.signOut(); throw new Error('This account is not set up as the owner.'); }
      },
      async signOut() { await client.auth.signOut(); },
      async isSignedIn() {
        const {data} = await client.auth.getSession();
        if (!data || !data.session) return false;
        const r = await client.rpc('is_owner');
        return r.data === true;
      },
      async changePassword(pw) { ok(await client.auth.updateUser({password: pw})); }
    }
  };

  /* =====================================================================
     LOCAL MODE (this browser only)
     ===================================================================== */
  const LS = {cars: 'rrw_cars', sales: 'rrw_sales', inq: 'rrw_inq', apps: 'rrw_apps', settings: 'rrw_settings'};
  const lget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { throw new Error('Browser storage is full. Use smaller photos or remove old listings.'); } };
  const today = () => new Date().toISOString().slice(0, 10);

  const local = {
    async loadPublic() {
      let cars = lget(LS.cars, null);
      if (!cars) {
        cars = CFG.showSampleCars ? CFG.sampleCars.map((c, i) => ({...c, id: 'c' + (Date.now() + i), status: 'available', img: '', created: Date.now() - i * 1000})) : [];
        lset(LS.cars, cars);
      }
      const s = lget(LS.settings, {});
      if (s.name === 'rRw Motors') { s.name = CFG.business.name; lset(LS.settings, s); }   // old brand name
      const {pw, ...publicSettings} = s;
      return {cars, settings: publicSettings};
    },
    async loadOwner() { return {sales: lget(LS.sales, []), inquiries: lget(LS.inq, []), applications: lget(LS.apps, [])}; },
    async saveCar(car) {
      const cars = lget(LS.cars, []);
      if (car.id) {
        const i = cars.findIndex(x => x.id === car.id);
        if (i >= 0) cars[i] = {...cars[i], ...car}; else cars.push(car);
      } else { car = {...car, id: 'c' + Date.now(), created: Date.now()}; cars.push(car); }
      lset(LS.cars, cars); return car;
    },
    async deleteCar(id) { lset(LS.cars, lget(LS.cars, []).filter(c => c.id !== id)); },
    async addInquiry(i) { const l = lget(LS.inq, []); l.push({id: 'i' + Date.now(), date: today(), created: new Date().toISOString(), name: i.name, contact: i.contact, topic: i.topic, msg: i.msg}); lset(LS.inq, l); },
    async deleteInquiry(id) { lset(LS.inq, lget(LS.inq, []).filter(i => i.id !== id)); },
    async addApplication(a) { const l = lget(LS.apps, []); l.push({id: 'a' + Date.now(), created: new Date().toISOString(), name: a.name, mobile: a.mobile, email: a.email, car: a.car, status: 'new', data: a.data}); lset(LS.apps, l); },
    async setApplicationStatus(id, status) { lset(LS.apps, lget(LS.apps, []).map(a => a.id === id ? {...a, status} : a)); },
    async deleteApplication(id) { lset(LS.apps, lget(LS.apps, []).filter(a => a.id !== id)); },
    async addSale(s) { const l = lget(LS.sales, []); l.push(s); lset(LS.sales, l); return s; },
    async deleteSale(no) { lset(LS.sales, lget(LS.sales, []).filter(s => s.no !== no)); },
    async saveSettings(S) { lset(LS.settings, {...lget(LS.settings, {}), ...S}); },
    async preparePhoto(img) { return img || ''; },
    async restore(d) {
      lset(LS.cars, d.cars || []); lset(LS.sales, d.sales || []); lset(LS.inq, d.inquiries || []); lset(LS.apps, d.applications || []);
      const old = lget(LS.settings, {}); lset(LS.settings, {...(d.settings || {}), pw: old.pw || (d.settings || {}).pw});
    },
    auth: {
      async signIn(email, password) {
        const pass = lget(LS.settings, {}).pw || CFG.defaultPassword;
        if (String(password).trim() !== String(pass).trim()) throw new Error('Wrong password.');
        try { sessionStorage.setItem('rrw_admin', '1'); } catch (e) {}
      },
      async signOut() { try { sessionStorage.removeItem('rrw_admin'); } catch (e) {} },
      async isSignedIn() { try { return sessionStorage.getItem('rrw_admin') === '1'; } catch (e) { return false; } },
      async changePassword(pw) { lset(LS.settings, {...lget(LS.settings, {}), pw}); }
    }
  };

  /* =====================================================================
     CUSTOMER ACCOUNTS (Supabase mode only): sign up, log in, saved cars, my inquiries
     ===================================================================== */
  remote.customer = {
    async user() { const {data} = await client.auth.getSession(); return data && data.session ? data.session.user : null; },
    async signUp(email, password, name, phone) {
      const options = {data: {full_name: name, phone: phone || ''}};
      if (/^https?:/.test(location.protocol)) options.emailRedirectTo = location.origin + location.pathname.replace(/[^/]*$/, '') + 'account.html';
      const {data, error} = await client.auth.signUp({email, password, options});
      if (error) throw new Error(/password/i.test(error.message) ? error.message : 'Could not create the account. ' + error.message);
      return {signedIn: !!data.session};
    },
    async signIn(email, password) {
      const {error} = await client.auth.signInWithPassword({email, password});
      if (error) throw new Error(/confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox.' : 'Wrong email or password.');
    },
    async signOut() { await client.auth.signOut(); },
    async resetPassword(email) { ok(await client.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname})); },
    onRecovery(cb) { client.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') cb(); }); },
    async updatePassword(pw) { ok(await client.auth.updateUser({password: pw})); },
    async updateProfile(name, phone) { ok(await client.auth.updateUser({data: {full_name: name, phone}})); },
    async favorites() { return (ok(await client.from('favorites').select('car_id')) || []).map(r => r.car_id); },
    async addFavorite(carId) { const r = await client.from('favorites').insert({car_id: carId}); if (r.error && r.error.code !== '23505') throw r.error; },
    async removeFavorite(carId) { ok(await client.from('favorites').delete().eq('car_id', carId)); },
    async myInquiries(uid) { return (ok(await client.from('inquiries').select('*').eq('user_id', uid).order('created', {ascending: false})) || []).map(inquiryFromRow); }
  };


  /* ---------- live chat (visitors use send/fetch with their secret token; owners use owner.*) ---------- */
  remote.chat = {
    async send(token, info, body) { ok(await client.rpc('chat_send', {p_token: token, p_name: info.name || '', p_contact: info.contact || '', p_car: info.car || '', p_body: body})); },
    async fetch(token) { return (ok(await client.rpc('chat_fetch', {p_token: token})) || []).map(m => ({id: m.id, from: m.sender, body: m.body, at: m.created})); },
    owner: {
      async list() {
        const [c, u] = await Promise.all([
          client.from('chats').select('*').order('last_at', {ascending: false}),
          client.from('chat_messages').select('chat_id').eq('sender', 'visitor').eq('read_by_owner', false)
        ]);
        const count = {}; (ok(u) || []).forEach(r => { count[r.chat_id] = (count[r.chat_id] || 0) + 1; });
        return (ok(c) || []).map(r => ({id: r.id, name: r.name, contact: r.contact, car: r.car, lastAt: r.last_at, lastBody: r.last_body, lastFrom: r.last_sender, unread: count[r.id] || 0}));
      },
      async messages(chatId) { return (ok(await client.from('chat_messages').select('*').eq('chat_id', chatId).order('id', {ascending: true})) || []).map(m => ({id: m.id, from: m.sender, body: m.body, at: m.created})); },
      async reply(chatId, body) { ok(await client.from('chat_messages').insert({chat_id: chatId, sender: 'owner', body, read_by_owner: true})); },
      async markRead(chatId) { ok(await client.from('chat_messages').update({read_by_owner: true}).eq('chat_id', chatId).eq('sender', 'visitor').eq('read_by_owner', false)); },
      async remove(chatId) { ok(await client.from('chats').delete().eq('id', chatId)); }
    }
  };

  /* ---------- live chat in local mode: stored in this browser only (good for trying it out) ---------- */
  const chatL = () => lget('rrw_chat', []);
  local.chat = {
    async send(token, info, body) {
      const l = chatL(); let c = l.find(x => x.token === token);
      if (!c) { c = {id: 'c' + Date.now(), token, messages: []}; l.push(c); }
      c.name = info.name || c.name; c.contact = info.contact || c.contact; c.car = info.car || c.car;
      const id = Date.now() * 1000 + c.messages.length;
      c.messages.push({id, from: 'visitor', body, at: new Date().toISOString(), read: false});
      c.lastAt = new Date().toISOString(); lset('rrw_chat', l);
    },
    async fetch(token) { const c = chatL().find(x => x.token === token); return c ? c.messages.map(({read, ...m}) => m) : []; },
    owner: {
      async list() { return chatL().map(c => { const m = c.messages[c.messages.length - 1] || {}; return {id: c.id, name: c.name, contact: c.contact, car: c.car, lastAt: c.lastAt, lastBody: m.body, lastFrom: m.from, unread: c.messages.filter(x => x.from === 'visitor' && !x.read).length}; }).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt))); },
      async messages(chatId) { const c = chatL().find(x => x.id === chatId); return c ? c.messages.map(({read, ...m}) => m) : []; },
      async reply(chatId, body) { const l = chatL(), c = l.find(x => x.id === chatId); if (!c) return; c.messages.push({id: Date.now() * 1000 + c.messages.length, from: 'owner', body, at: new Date().toISOString(), read: true}); c.lastAt = new Date().toISOString(); lset('rrw_chat', l); },
      async markRead(chatId) { const l = chatL(), c = l.find(x => x.id === chatId); if (c) { c.messages.forEach(m => { m.read = true; }); lset('rrw_chat', l); } },
      async remove(chatId) { lset('rrw_chat', chatL().filter(x => x.id !== chatId)); }
    }
  };

  window.DB = Object.assign({mode}, mode === 'supabase' ? remote : local);
})();
