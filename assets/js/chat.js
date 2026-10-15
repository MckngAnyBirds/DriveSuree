/* ===== chat.js: live chat =====
   - Visitors see a chat bubble in the lower-left corner of every page.
   - When the OWNER is logged in, that same bubble opens the owner's inbox instead.
   - The owner dashboard (admin.html) shows the inbox in its "Chats" tab (Site.mountInbox).
   Messages are stored through assets/js/db.js (DB.chat). Edit the look in assets/css/style.css (".chat-..." and ".inbox..."). */
(function () {
  const S = window.Site;
  if (!S || !S.db || !S.db.chat) return;
  const {db, esc} = S;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const stamp = iso => {
    const d = new Date(iso); if (isNaN(d)) return '';
    const t = d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ', ' + t;
  };
  const bubble = (m, mine) => `<div class="chat-m ${m.from === mine ? 'me' : 'them'}"><div class="b">${esc(m.body)}</div><div class="t">${stamp(m.at)}</div></div>`;
  const nearBottom = el => el.scrollHeight - el.scrollTop - el.clientHeight < 70;
  const loop = (fn, ms) => { let stop = false, t; const run = async () => { if (stop) return; if (!document.hidden) { try { await fn(); } catch (e) { console.warn(e); } } if (!stop) t = setTimeout(run, typeof ms === 'function' ? ms() : ms); }; t = setTimeout(run, 0); return {stop() { stop = true; clearTimeout(t); }, now: () => { clearTimeout(t); run(); }}; };

  /* ================= OWNER INBOX ================= */
  function mountInbox(el, opts = {}) {
    el.innerHTML = `<div class="inbox ${opts.wide ? 'wide' : ''}">
      <div class="inbox-list"><div class="inbox-head">Messages</div><div class="inbox-items"><div class="inbox-none">Loading...</div></div></div>
      <div class="inbox-thread">
        <div class="inbox-empty">Select a conversation to read and reply.</div>
        <div class="inbox-conv d-none">
          <div class="inbox-top">
            <button type="button" class="btn btn-sm btn-light inbox-back" aria-label="Back to messages"><i class="bi bi-arrow-left"></i></button>
            <div class="flex-grow-1 min-w-0"><div class="fw-semibold text-truncate inbox-who"></div><div class="small text-secondary text-truncate inbox-sub"></div></div>
            <button type="button" class="btn btn-sm btn-outline-danger inbox-del" title="Delete this chat" aria-label="Delete this chat"><i class="bi bi-trash"></i></button>
          </div>
          <div class="chat-msgs"></div>
          <form class="chat-form"><textarea rows="1" placeholder="Type your reply" aria-label="Reply"></textarea><button type="submit" aria-label="Send reply"><i class="bi bi-send-fill"></i></button></form>
        </div>
      </div></div>`;
    const $ = s => el.querySelector(s), root = $('.inbox');
    let chats = [], cur = null, msgs = [], destroyed = false;

    const notify = () => opts.onUnread && opts.onUnread(chats.reduce((n, c) => n + (c.unread || 0), 0));
    function renderList() {
      $('.inbox-items').innerHTML = chats.length ? chats.map(c => `<button type="button" class="inbox-item ${cur && cur.id === c.id ? 'active' : ''}" data-id="${esc(c.id)}">
        <div class="top"><b class="text-truncate">${esc(c.name || 'Visitor')}</b><span class="when">${stamp(c.lastAt)}</span></div>
        <div class="sub text-truncate">${esc([c.contact, c.car].filter(Boolean).join(' · ') || '')}</div>
        <div class="prev"><span class="text-truncate">${c.lastFrom === 'owner' ? 'You: ' : ''}${esc(c.lastBody || '')}</span>${c.unread ? `<span class="badge rounded-pill text-bg-danger">${c.unread}</span>` : ''}</div></button>`).join('')
        : '<div class="inbox-none">No chats yet. When a visitor sends a message it shows up here.</div>';
    }
    function renderMsgs(force) {
      const box = $('.chat-msgs'), stick = force || nearBottom(box);
      box.innerHTML = msgs.map(m => bubble(m, 'owner')).join('');
      if (stick) box.scrollTop = box.scrollHeight;
    }
    async function loadList() {
      chats = await db.chat.owner.list();
      if (cur) { const f = chats.find(c => c.id === cur.id); if (f) { cur = f; } }
      renderList(); notify();
    }
    async function loadMsgs(force) {
      if (!cur) return;
      const id = cur.id, list = await db.chat.owner.messages(id);
      if (!cur || cur.id !== id) return;
      const changed = list.length !== msgs.length || (list.length && list[list.length - 1].id !== msgs[msgs.length - 1].id);
      msgs = list; if (changed || force) renderMsgs(force);
      if (cur.unread || list.some(m => m.from === 'visitor' && changed)) { await db.chat.owner.markRead(id); cur.unread = 0; const f = chats.find(c => c.id === id); if (f) f.unread = 0; renderList(); notify(); }
    }
    async function openConv(id) {
      cur = chats.find(c => c.id === id) || null; if (!cur) return;
      msgs = []; root.classList.add('has-thread');
      $('.inbox-empty').classList.add('d-none'); $('.inbox-conv').classList.remove('d-none');
      $('.inbox-who').textContent = cur.name || 'Visitor';
      $('.inbox-sub').textContent = [cur.contact, cur.car && 'About: ' + cur.car].filter(Boolean).join(' · ');
      renderList(); renderMsgs(true);
      try { await loadMsgs(true); } catch (e) { S.toast('Could not load this chat.'); }
    }
    $('.inbox-items').addEventListener('click', e => { const b = e.target.closest('.inbox-item'); if (b) openConv(b.dataset.id); });
    $('.inbox-back').addEventListener('click', () => { root.classList.remove('has-thread'); cur = null; $('.inbox-conv').classList.add('d-none'); $('.inbox-empty').classList.remove('d-none'); renderList(); });
    $('.inbox-del').addEventListener('click', async () => {
      if (!cur || !confirm('Delete this whole conversation? This cannot be undone.')) return;
      try { await db.chat.owner.remove(cur.id); cur = null; $('.inbox-back').click(); await loadList(); } catch (e) { S.toast('Could not delete the chat.'); }
    });
    const ta = $('textarea');
    $('.chat-form').addEventListener('submit', async e => {
      e.preventDefault(); const body = ta.value.trim(); if (!body || !cur) return;
      ta.value = '';
      try { await db.chat.owner.reply(cur.id, body); await loadMsgs(true); await loadList(); }
      catch (err) { console.error(err); ta.value = body; S.toast('Your reply could not be sent. Please try again.'); }
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('.chat-form').requestSubmit(); } });

    const poll = loop(async () => { await loadList(); await loadMsgs(); }, 4000);
    return {destroy() { destroyed = true; poll.stop(); el.innerHTML = ''; }, refresh: () => poll.now()};
  }

  /* ================= VISITOR WIDGET ================= */
  let api = null, pendingOpen = null;

  function startVisitor() {
    const host = document.createElement('div'); host.className = 'chat-widget';
    host.innerHTML = `<button type="button" class="chat-fab" aria-label="Chat with us" aria-expanded="false"><i class="bi bi-chat-dots-fill"></i><span class="chat-dot d-none">0</span></button>
      <section class="chat-panel d-none" role="dialog" aria-label="Chat with us">
        <header><div class="flex-grow-1"><div class="fw-semibold">Chat with ${esc(S.D.S.name)}</div><div class="small opacity-75">Ask us anything about our cars</div></div>
          <button type="button" class="chat-x" aria-label="Close chat"><i class="bi bi-x-lg"></i></button></header>
        <div class="chat-msgs" aria-live="polite"></div>
        <div class="chat-info d-none"><input class="form-control form-control-sm" id="chatName" placeholder="Your name *" aria-label="Your name" maxlength="120"><input class="form-control form-control-sm" id="chatContact" placeholder="Phone or email (optional)" aria-label="Phone or email" maxlength="160"></div>
        <form class="chat-form"><textarea rows="1" placeholder="Type your message" aria-label="Message" maxlength="2000"></textarea><button type="submit" aria-label="Send"><i class="bi bi-send-fill"></i></button></form>
      </section>`;
    document.body.appendChild(host);
    const $ = s => host.querySelector(s), ta = $('textarea');
    let token = store.get('ds_chat_token') || '', msgs = [], pending = [], isOpen = false, ctxCar = '';
    let info = {}; try { info = JSON.parse(store.get('ds_chat_info') || '{}') || {}; } catch (e) {}
    if (!info.name) { const pf = S.prefill(); if (pf) info = {name: pf.name, contact: pf.contact}; }
    const needInfo = () => !store.get('ds_chat_info');
    if (needInfo()) { $('.chat-info').classList.remove('d-none'); $('#chatName').value = info.name || ''; $('#chatContact').value = info.contact || ''; }

    function render(force) {
      const box = $('.chat-msgs'), stick = force || nearBottom(box), hours = S.D.S.hours;
      box.innerHTML = `<div class="chat-m them"><div class="b">Hi! Ask us anything about our cars. We will reply here as soon as we can${hours ? ' (open ' + esc(hours) + ')' : ''}. Leave your phone number if you would like a call.</div></div>` +
        [...msgs, ...pending].map(m => bubble(m, 'visitor')).join('');
      if (stick) box.scrollTop = box.scrollHeight;
      const seen = Number(store.get('ds_chat_seen') || 0), owners = msgs.filter(m => m.from === 'owner');
      if (isOpen && owners.length) store.set('ds_chat_seen', String(Math.max(seen, ...owners.map(m => m.id))));
      const unread = isOpen ? 0 : owners.filter(m => m.id > seen).length, dot = $('.chat-dot');
      dot.textContent = unread; dot.classList.toggle('d-none', !unread);
    }
    async function pull(force) {
      if (!token) return;
      const list = await db.chat.fetch(token);
      const changed = list.length !== msgs.length || (list.length && list[list.length - 1].id !== msgs[msgs.length - 1].id);
      msgs = list; if (changed || force) render(force && true);
    }
    function setOpen(on) {
      isOpen = on; $('.chat-panel').classList.toggle('d-none', !on); $('.chat-fab').setAttribute('aria-expanded', on);
      $('.chat-fab i').className = 'bi ' + (on ? 'bi-chevron-down' : 'bi-chat-dots-fill');
      if (on) { render(true); setTimeout(() => (needInfo() && !$('#chatName').value ? $('#chatName') : ta).focus(), 50); pull(true).catch(() => {}); }
      else render();
      poll.now();
    }
    $('.chat-fab').addEventListener('click', () => setOpen(!isOpen));
    $('.chat-x').addEventListener('click', () => setOpen(false));
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('.chat-form').requestSubmit(); } });
    $('.chat-form').addEventListener('submit', async e => {
      e.preventDefault(); const text = ta.value.trim(); if (!text) return;
      if (needInfo()) {
        const name = $('#chatName').value.trim();
        if (!name) { $('#chatName').focus(); return S.toast('Please type your name so we know who we are talking to.'); }
        info = {name, contact: $('#chatContact').value.trim()}; store.set('ds_chat_info', JSON.stringify(info)); $('.chat-info').classList.add('d-none');
      }
      if (!token) { token = uuid(); store.set('ds_chat_token', token); }
      pending = [{id: -1, from: 'visitor', body: text, at: new Date().toISOString()}]; ta.value = ''; render(true);
      try { await db.chat.send(token, {name: info.name, contact: info.contact, car: ctxCar}, text); pending = []; await pull(true); }
      catch (err) { console.error(err); pending = []; ta.value = text; render(); S.toast('Sorry, your message could not be sent. Please try again.'); }
    });
    const poll = loop(() => pull(), () => isOpen ? 4000 : 20000);

    api = {open(o = {}) { if (o.car) ctxCar = o.car; if (o.message && !ta.value.trim()) ta.value = o.message; if (!isOpen) setOpen(true); else ta.focus(); }};
    if (pendingOpen) { api.open(pendingOpen); pendingOpen = null; }
    else if (location.hash === '#chat') api.open();
    render();
  }

  /* ================= OWNER BUBBLE (public pages, owner logged in) ================= */
  function startOwnerBubble() {
    const host = document.createElement('div'); host.className = 'chat-widget owner';
    host.innerHTML = `<button type="button" class="chat-fab" aria-label="Open customer chats" aria-expanded="false"><i class="bi bi-chat-dots-fill"></i><span class="chat-dot d-none">0</span></button>
      <section class="chat-panel d-none" role="dialog" aria-label="Customer chats"><div class="inbox-host"></div></section>`;
    document.body.appendChild(host);
    const dot = host.querySelector('.chat-dot'), panel = host.querySelector('.chat-panel'), fab = host.querySelector('.chat-fab');
    let isOpen = false;
    mountInbox(host.querySelector('.inbox-host'), {onUnread: n => { dot.textContent = n; dot.classList.toggle('d-none', !n); }});
    const setOpen = on => { isOpen = on; panel.classList.toggle('d-none', !on); fab.setAttribute('aria-expanded', on); fab.querySelector('i').className = 'bi ' + (on ? 'bi-chevron-down' : 'bi-chat-dots-fill'); };
    fab.addEventListener('click', () => setOpen(!isOpen));
    api = {open() { setOpen(true); }};
    if (location.hash === '#chat') setOpen(true);
  }

  S.mountInbox = mountInbox;
  S.openChat = o => { if (api) api.open(o); else pendingOpen = o || {}; };

  S.ready.then(async () => {
    if (/admin\.html$/.test(location.pathname)) return;      // the dashboard has its own Chats tab
    let owner = false; try { owner = await db.auth.isSignedIn(); } catch (e) {}
    owner ? startOwnerBubble() : startVisitor();
  });
})();
